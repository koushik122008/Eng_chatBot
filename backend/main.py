"""EngiBuddy FastAPI app: API routes + static frontend."""
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response
from starlette.types import Scope

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

from backend import db  # noqa: E402
from backend.routes.chat import router as chat_router  # noqa: E402

app = FastAPI(title="EngiBuddy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db.init_db()
app.include_router(chat_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}


is_prod = os.environ.get("RENDER") is not None


class DevStaticFiles(StaticFiles):
    """StaticFiles that disables caching for development."""
    async def get_response(self, path: str, scope: Scope) -> Response:
        resp = await super().get_response(path, scope)
        if not is_prod:
            resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            resp.headers["Pragma"] = "no-cache"
            resp.headers["Expires"] = "0"
        return resp


# Static frontend last, so /api takes precedence.
app.mount("/", DevStaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
