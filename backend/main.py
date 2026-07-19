"""EngiBuddy FastAPI app: API routes + static frontend."""
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

from backend import db  # noqa: E402
from backend.routes.chat import router as chat_router  # noqa: E402

app = FastAPI(title="EngiBuddy")

db.init_db()
app.include_router(chat_router, prefix="/api")

# Static frontend last, so /api takes precedence.
app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
