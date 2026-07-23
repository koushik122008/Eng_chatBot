"""Dual-backend persistence for sessions and chat messages.

Supports both SQLite (local development) and PostgreSQL (Render production).
Switches based on the DATABASE_URL environment variable.

SQLite:  uses stdlib sqlite3, creates engibuddy.db in the project root.
PostgreSQL: uses psycopg2 via DATABASE_URL env var (set by Render automatically
            when a PostgreSQL service is linked to the web service).
"""
import json
import os
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras

# ── Detect backend ──────────────────────────────────────────────────────

DATABASE_URL: str | None = os.environ.get("DATABASE_URL")

# SQLite path (used only when DATABASE_URL is not set)
DB_PATH: Path | None = (
    Path(__file__).resolve().parent.parent / "engibuddy.db"
    if not DATABASE_URL
    else None
)

_SCHEMA_SQL = """
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

_SCHEMA_PG = """
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

_DROP_TABLES_PG = """
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS sessions;
"""


# ── Connection helpers ──────────────────────────────────────────────────

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── SQLite backend ──────────────────────────────────────────────────────

@contextmanager
def _connect_sqlite():
    conn = sqlite3.connect(str(DB_PATH))
    try:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        yield conn
        conn.commit()
    finally:
        conn.close()


# PostgreSQL uses %s placeholders; SQLite uses ?. Convert at the SQLite boundary.
_SQLITE_SQL = lambda s: s.replace("%s", "?")


def _query_sqlite(sql: str, params: tuple = ()):
    """Execute a query and return all rows as list of dicts."""
    with _connect_sqlite() as conn:
        rows = conn.execute(_SQLITE_SQL(sql), params).fetchall()
    return [dict(r) for r in rows]


def _execute_sqlite(sql: str, params: tuple = ()):
    """Execute a statement (INSERT/UPDATE/DELETE) and return None."""
    with _connect_sqlite() as conn:
        conn.execute(_SQLITE_SQL(sql), params)


# ── PostgreSQL backend ──────────────────────────────────────────────────

def _pg_conn():
    """Create a new psycopg2 connection from DATABASE_URL."""
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    return conn


@contextmanager
def _connect_pg():
    conn = _pg_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _query_pg(sql: str, params: tuple = ()) -> list[dict]:
    with _connect_pg() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
    return [dict(r) for r in rows]


def _execute_pg(sql: str, params: tuple = ()):
    with _connect_pg() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)


# ── Router ──────────────────────────────────────────────────────────────

_is_pg = DATABASE_URL is not None

_query = _query_pg if _is_pg else _query_sqlite
_execute = _execute_pg if _is_pg else _execute_sqlite
# Placeholders: psycopg2 uses %s natively; _SQLITE_SQL converts to ? for SQLite


# ── Public API ──────────────────────────────────────────────────────────

def init_db() -> None:
    """Create tables if they don't exist."""
    if _is_pg:
        with _connect_pg() as conn:
            with conn.cursor() as cur:
                cur.execute(_SCHEMA_PG)
    else:
        with _connect_sqlite() as conn:
            conn.executescript(_SCHEMA_SQL)


def reset_db() -> None:
    """Drop all data and recreate tables. Used by tests."""
    if _is_pg:
        with _connect_pg() as conn:
            with conn.cursor() as cur:
                cur.execute(_DROP_TABLES_PG)
                cur.execute(_SCHEMA_PG)
    else:
        if DB_PATH and DB_PATH.exists():
            DB_PATH.unlink()
        init_db()


def create_session(title: str) -> str:
    session_id = uuid.uuid4().hex
    _execute(
        "INSERT INTO sessions (id, title, created_at) VALUES (%s, %s, %s)",
        (session_id, title[:80], _now()),
    )
    return session_id


def session_exists(session_id: str) -> bool:
    rows = _query(
        "SELECT 1 FROM sessions WHERE id = %s",
        (session_id,),
    )
    return len(rows) > 0


def list_sessions() -> list[dict]:
    return _query(
        "SELECT id, title, created_at FROM sessions ORDER BY created_at DESC",
    )


def delete_session(session_id: str) -> None:
    _execute("DELETE FROM sessions WHERE id = %s", (session_id,))


def add_message(
    session_id: str,
    role: str,
    content: str,
    scene_spec: dict | None = None,
) -> str:
    message_id = uuid.uuid4().hex
    _execute(
        "INSERT INTO messages (id, session_id, role, content, scene_spec, created_at)"
        " VALUES (%s, %s, %s, %s, %s, %s)",
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
    rows = _query(
        "SELECT id, role, content, scene_spec, created_at FROM messages"
        " WHERE session_id = %s ORDER BY created_at",
        (session_id,),
    )
    out = []
    for r in rows:
        d = dict(r)
        d["scene_spec"] = json.loads(d["scene_spec"]) if d["scene_spec"] else None
        out.append(d)
    return out


def get_history_for_api(session_id: str) -> list[dict]:
    """Conversation history in messages format (text only)."""
    return [
        {"role": m["role"], "content": m["content"]}
        for m in get_messages(session_id)
        if m["content"].strip()
    ]
