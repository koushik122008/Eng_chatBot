"""SQLite persistence for sessions and chat messages.

Uses the stdlib sqlite3 module. Each call opens a short-lived connection,
which is safe under uvicorn's default single-process model and keeps the
code free of connection-lifetime bookkeeping.
"""
import json
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "engibuddy.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    scene_spec TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);
"""


@contextmanager
def _connect():
    """Open a connection, commit on success, and always close it.

    Note: sqlite3's own context manager commits but does NOT close — on
    Windows that leaks file locks, so we manage the lifetime explicitly.
    """
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        yield conn
        conn.commit()
    finally:
        conn.close()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(_SCHEMA)


def create_session(title: str) -> str:
    session_id = uuid.uuid4().hex
    with _connect() as conn:
        conn.execute(
            "INSERT INTO sessions (id, title, created_at) VALUES (?, ?, ?)",
            (session_id, title[:80], _now()),
        )
    return session_id


def session_exists(session_id: str) -> bool:
    with _connect() as conn:
        row = conn.execute("SELECT 1 FROM sessions WHERE id = ?", (session_id,)).fetchone()
    return row is not None


def list_sessions() -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, title, created_at FROM sessions ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def delete_session(session_id: str) -> None:
    with _connect() as conn:
        conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))


def add_message(session_id: str, role: str, content: str, scene_spec: dict | None = None) -> str:
    message_id = uuid.uuid4().hex
    with _connect() as conn:
        conn.execute(
            "INSERT INTO messages (id, session_id, role, content, scene_spec, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?)",
            (
                message_id,
                session_id,
                role,
                content,
                json.dumps(scene_spec) if scene_spec else None,
                _now(),
            ),
        )
    return message_id


def get_messages(session_id: str) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT id, role, content, scene_spec, created_at FROM messages"
            " WHERE session_id = ? ORDER BY created_at, rowid",
            (session_id,),
        ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["scene_spec"] = json.loads(d["scene_spec"]) if d["scene_spec"] else None
        out.append(d)
    return out


def get_history_for_api(session_id: str) -> list[dict]:
    """Conversation history in Anthropic messages format (text only)."""
    return [
        {"role": m["role"], "content": m["content"]}
        for m in get_messages(session_id)
        if m["content"].strip()
    ]
