"""Integration test for the SSE chat route with a mocked Claude stream.

Replays a canned Claude-style reply (scene spec + anim markers, chopped into
awkward chunks) through the real route -> parser -> validator -> db -> SSE
pipeline. Run: python -m backend.test_chat_route
"""
from dotenv import load_dotenv
from pathlib import Path

import json

from fastapi.testclient import TestClient

from backend import groq_client, db
from backend.main import app
from backend.stream_parser import StreamParser

CANNED_REPLY = (
    'Let\'s look at an NPN transistor.\n'
    '<scene>{"v": 1, "template": "npn_transistor", "title": "NPN Transistor — Active Mode",'
    ' "style": "schematic", "params": {"bias": "active", "showDepletionRegion": true},'
    ' "labels": [{"id": "base", "text": "Base (P)"}],'
    ' "animations": [{"id": "electron-flow", "target": "electrons", "type": "flow", "loop": true}],'
    ' "camera": {"orbit": [30, 18], "zoom": 1}}</scene>\n'
    'When the base-emitter junction is forward biased, electrons flow from the emitter '
    'into the base [[anim:electron-flow]] and are swept into the collector.'
)

BAD_SCENE_REPLY = 'Here: <scene>{"template": "nonexistent", "title": "x"}</scene> done.'


def _mock_stream(reply: str, chunk: int = 7):
    def stream_reply(history):
        parser = StreamParser()
        for i in range(0, len(reply), chunk):
            yield from parser.feed(reply[i:i + chunk])
        yield from parser.flush()
    return stream_reply


def _events(response_text: str) -> list[tuple[str, dict]]:
    events = []
    for block in response_text.strip().split("\n\n"):
        lines = block.split("\n")
        ev = lines[0].removeprefix("event: ")
        data = json.loads(lines[1].removeprefix("data: "))
        events.append((ev, data))
    return events


def main() -> int:
    db.reset_db()
    original = groq_client.stream_reply
    failures = []
    try:
        client = TestClient(app)

        # --- happy path ---
        groq_client.stream_reply = _mock_stream(CANNED_REPLY)
        r = client.post("/api/chat", json={"message": "explain an NPN transistor in 3D"})
        assert r.status_code == 200, r.status_code
        events = _events(r.text)
        kinds = [k for k, _ in events]

        def check(name, cond):
            (print(f"PASS {name}") if cond else (failures.append(name), print(f"FAIL {name}")))

        check("first event is session", kinds[0] == "session")
        check("has text events", "text" in kinds)
        check("has exactly one scene event", kinds.count("scene") == 1)
        check("has anim event", ("anim", {"id": "electron-flow"}) in events)
        check("ends with done", kinds[-1] == "done")
        check("no error events", "error" not in kinds)

        scene = next(d for k, d in events if k == "scene")["spec"]
        check("scene validated + defaults filled", scene["template"] == "npn_transistor"
              and scene["autoplay"] == [] and scene["v"] == 1)

        text = "".join(d["delta"] for k, d in events if k == "text")
        check("scene JSON stripped from text", "<scene>" not in text and "npn_transistor" not in text)
        check("anim marker stripped from text", "[[anim:" not in text)

        session_id = next(d for k, d in events if k == "session")["session_id"]
        msgs = db.get_messages(session_id)
        check("both messages persisted", [m["role"] for m in msgs] == ["user", "assistant"])
        check("scene spec persisted on assistant msg",
              msgs[1]["scene_spec"] and msgs[1]["scene_spec"]["template"] == "npn_transistor")

        # --- follow-up in same session ---
        groq_client.stream_reply = _mock_stream("Sure — a quick follow-up answer.")
        r2 = client.post("/api/chat", json={"message": "thanks", "session_id": session_id})
        check("follow-up ok", r2.status_code == 200 and len(db.get_messages(session_id)) == 4)

        # --- invalid scene is rejected but chat continues ---
        groq_client.stream_reply = _mock_stream(BAD_SCENE_REPLY)
        r3 = client.post("/api/chat", json={"message": "bad scene test"})
        ev3 = _events(r3.text)
        k3 = [k for k, _ in ev3]
        check("invalid scene -> error event", "error" in k3 and "scene" not in k3)
        check("invalid scene still completes", k3[-1] == "done")

        # --- sessions api ---
        r4 = client.get("/api/sessions")
        check("sessions listed", r4.status_code == 200 and len(r4.json()) == 2)
        check("unknown session 404",
              client.post("/api/chat", json={"message": "x", "session_id": "nope"}).status_code == 404)
    finally:
        groq_client.stream_reply = original

    print(f"\n{'ALL PASS' if not failures else f'{len(failures)} FAILURES: {failures}'}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
