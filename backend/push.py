"""Web Push notification service for EngiBuddy.

Uses the Web Push API (RFC 8030) with VAPID (RFC 8292) to send
push notifications to subscribed PWA users.

VAPID keys are read from environment variables:
  VAPID_PUBLIC_KEY   — base64url-encoded public key (uncompressed 65-byte P-256 point)
  VAPID_PRIVATE_KEY  — base64url-encoded private key (32-byte scalar)
  VAPID_CLAIMS_EMAIL — mailto: email for VAPID claims (e.g. mailto:push@example.com)

Generate keys:
  python -c "import base64; from cryptography.hazmat.primitives.asymmetric import ec; from cryptography.hazmat.primitives import serialization; k=ec.generate_private_key(ec.SECP256R1()); p=k.public_key(); b=lambda d:base64.urlsafe_b64encode(d).decode().rstrip('='); print('VAPID_PUBLIC_KEY='+b(p.public_bytes(encoding=serialization.Encoding.X962, format=serialization.PublicFormat.UncompressedPoint))); print('VAPID_PRIVATE_KEY='+b(k.private_numbers().private_value.to_bytes(32,'big')))"
"""
import json
import logging
import os
import base64

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from py_vapid import Vapid
from pywebpush import webpush, WebPushException

logger = logging.getLogger(__name__)

# ── VAPID configuration ──────────────────────────────────────────────────

VAPID_PUBLIC_KEY: str | None = os.environ.get("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY: str | None = os.environ.get("VAPID_PRIVATE_KEY")
VAPID_CLAIMS_EMAIL: str | None = os.environ.get("VAPID_CLAIMS_EMAIL", "mailto:push@engibuddy.app")

# Cache the decoded private key for re-use
_PRIVATE_KEY_OBJ: ec.EllipticCurvePrivateKey | None = None


def decode_private_key(b64url: str) -> ec.EllipticCurvePrivateKey:
    """Decode a base64url-encoded VAPID private key (32-byte scalar) to a
    cryptography private key object."""
    padded = b64url + "=" * (4 - len(b64url) % 4) if len(b64url) % 4 else b64url
    raw = base64.urlsafe_b64decode(padded)
    private_value = int.from_bytes(raw, byteorder="big")
    return ec.derive_private_key(private_value, ec.SECP256R1())


def get_signer() -> ec.EllipticCurvePrivateKey | None:
    """Return the private-key object for signing VAPID headers, or None if
    VAPID is not configured."""
    global _PRIVATE_KEY_OBJ
    if _PRIVATE_KEY_OBJ is not None:
        return _PRIVATE_KEY_OBJ
    if not VAPID_PRIVATE_KEY:
        logger.warning("VAPID_PRIVATE_KEY not set — push notifications disabled")
        return None
    try:
        _PRIVATE_KEY_OBJ = decode_private_key(VAPID_PRIVATE_KEY)
        return _PRIVATE_KEY_OBJ
    except Exception as exc:
        logger.error("Failed to decode VAPID private key: %s", exc)
        return None


def get_public_key_b64() -> str | None:
    """Return the base64url-encoded public key, or None if not configured."""
    if not VAPID_PUBLIC_KEY:
        logger.warning("VAPID_PUBLIC_KEY not set")
        return None
    return VAPID_PUBLIC_KEY


def send_push(subscription: dict, payload: dict | str) -> bool:
    """Send a push notification to a subscribed client.

    Args:
        subscription: dict with keys 'endpoint', 'keys.p256dh', 'keys.auth'
        payload: dict or string to send as JSON body

    Returns True on success, False on failure.
    """
    signer = get_signer()
    if not signer:
        return False

    # Build the VAPID JWT header + signature
    try:
        vapid = Vapid.from_raw(
            private_key=VAPID_PRIVATE_KEY,
            public_key=VAPID_PUBLIC_KEY,
        )
    except Exception as exc:
        logger.error("Failed to init VAPID from raw keys: %s", exc)
        return False

    try:
        response = webpush(
            subscription_info=subscription,
            data=json.dumps(payload) if isinstance(payload, dict) else payload,
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_CLAIMS_EMAIL},
            content_encoding="aes128gcm",
        )
        logger.info("Push sent — status %s", response.status_code)
        return True
    except WebPushException as exc:
        if exc.response and exc.response.status_code == 410:
            # 410 Gone: subscription expired or unsubscribed
            logger.info("Push subscription expired (410 Gone)")
        elif exc.response and exc.response.status_code == 429:
            logger.warning("Push rate limited (429)")
        else:
            logger.error("Push failed: %s", exc)
        return False
    except Exception as exc:
        logger.error("Push error: %s", exc)
        return False
