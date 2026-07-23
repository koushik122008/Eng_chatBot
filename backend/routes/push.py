"""Push notification API routes.

POST /api/push/subscribe           — Save a push subscription
DELETE /api/push/subscribe         — Remove a push subscription
GET  /api/push/vapid-public-key    — Get the VAPID public key for the frontend
"""
import json
import logging
import uuid

from fastapi import APIRouter
from pydantic import BaseModel, Field

from backend import db
from backend.push import get_public_key_b64

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/push")


class PushKeys(BaseModel):
    p256dh: str = Field(..., description="Client's P-256 Diffie-Hellman public key (base64url)")
    auth: str = Field(..., description="Client's auth secret (base64url)")


class SubscribeRequest(BaseModel):
    endpoint: str = Field(..., min_length=1, max_length=2048)
    keys: PushKeys


# ── Database helpers (inline here to keep routes self-contained) ─────────

def _save_subscription(endpoint: str, p256dh: str, auth: str) -> str:
    sub_id = uuid.uuid4().hex
    db._execute(
        "INSERT INTO push_subscriptions (id, endpoint, p256dh_key, auth_key, created_at)"
        " VALUES (%s, %s, %s, %s, %s)",
        (sub_id, endpoint, p256dh, auth, db._now()),
    )
    return sub_id


def _remove_subscription(endpoint: str) -> None:
    db._execute("DELETE FROM push_subscriptions WHERE endpoint = %s", (endpoint,))


def _list_subscriptions() -> list[dict]:
    return db._query(
        "SELECT endpoint, p256dh_key, auth_key FROM push_subscriptions ORDER BY created_at",
    )


# ── Routes ──────────────────────────────────────────────────────────────


@router.post("/subscribe")
def subscribe(req: SubscribeRequest):
    """Save a new push subscription or update an existing one."""
    # Remove old subscription for the same endpoint first (idempotent)
    _remove_subscription(req.endpoint)
    sub_id = _save_subscription(req.endpoint, req.keys.p256dh, req.keys.auth)
    logger.info("Push subscription saved: %s", sub_id)
    return {"status": "ok", "id": sub_id}


@router.delete("/subscribe")
def unsubscribe(endpoint: str = ""):
    """Remove a push subscription by endpoint URL."""
    if endpoint:
        _remove_subscription(endpoint)
    return {"status": "ok"}


@router.get("/vapid-public-key")
def vapid_public_key():
    """Return the VAPID public key so the frontend can subscribe."""
    key = get_public_key_b64()
    if not key:
        return {"publicKey": None, "error": "VAPID not configured"}
    return {"publicKey": key}


@router.get("/subscriptions")
def list_subscriptions():
    """List all active push subscriptions (admin use)."""
    return _list_subscriptions()
