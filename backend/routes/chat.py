"""Chat + session API routes.

POST /api/chat streams Server-Sent Events:
  session {session_id}   session created/echoed (always first)
  text    {delta}        visible explanation text
  scene   {spec}         validated 3D scene spec
  anim    {id}           animation sync trigger
  done    {message_id}   stream finished, assistant message persisted
  error   {message}      scene-validation or API failure
"""
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend import db, groq_client
from backend.scene_schema import SceneValidationError, validate_scene

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    session_id: str | None = None


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/chat")
def chat(req: ChatRequest):
    if req.session_id:
        if not db.session_exists(req.session_id):
            raise HTTPException(404, "session not found")
        session_id = req.session_id
    else:
        session_id = db.create_session(title=req.message)

    db.add_message(session_id, "user", req.message)
    history = db.get_history_for_api(session_id)

    def event_stream():
        yield _sse("session", {"session_id": session_id})

        text_parts: list[str] = []
        scene_spec: dict | None = None
        failed = False

        for kind, value in groq_client.stream_reply(history):
            if kind == "text":
                text_parts.append(value)
                yield _sse("text", {"delta": value})
            elif kind == "scene_json":
                try:
                    scene_spec = validate_scene(groq_client.parse_scene_json(value))
                    yield _sse("scene", {"spec": scene_spec})
                except (ValueError, SceneValidationError) as e:
                    yield _sse("error", {"message": f"scene rejected: {e}"})
            elif kind == "anim":
                yield _sse("anim", {"id": value})
            elif kind == "error":
                yield _sse("error", {"message": value})
            elif kind == "api_error":
                failed = True
                yield _sse("error", {"message": value})

        full_text = "".join(text_parts)
        if full_text.strip() or scene_spec:
            message_id = db.add_message(session_id, "assistant", full_text, scene_spec)
            yield _sse("done", {"message_id": message_id})
        elif not failed:
            yield _sse("error", {"message": "empty reply from model"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/sessions")
def sessions():
    return db.list_sessions()


@router.get("/sessions/{session_id}/messages")
def session_messages(session_id: str):
    if not db.session_exists(session_id):
        raise HTTPException(404, "session not found")
    return db.get_messages(session_id)


@router.delete("/sessions/{session_id}")
def remove_session(session_id: str):
    db.delete_session(session_id)
    return {"ok": True}


@router.get("/config")
def public_config():
    """Non-secret config the frontend can use (quick actions, header)."""
    from backend.config import config

    return {
        "subject_focus": config.subject_focus,
        "branch": config.branch,
        "semester": config.semester,
        "difficulty": config.difficulty,
        "model": config.model,
    }
