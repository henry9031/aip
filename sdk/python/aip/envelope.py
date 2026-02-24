"""Message envelope helpers"""
import json
from datetime import datetime, timezone
from uuid import uuid4
from typing import Any
from .types import Envelope, MessageType


def create_envelope(
    type: MessageType, from_agent: str, to_agent: str,
    payload: dict[str, Any], *, reply_to: str = "", correlation_id: str = "",
) -> Envelope:
    return Envelope(
        aip="0.1", id=str(uuid4()), type=type,
        from_agent=from_agent, to_agent=to_agent,
        timestamp=datetime.now(timezone.utc).isoformat(),
        payload=payload, reply_to=reply_to, correlation_id=correlation_id,
    )


def canonical_payload(env: Envelope) -> str:
    """Deterministic JSON for signing"""
    return json.dumps({
        "id": env.id, "type": env.type, "from": env.from_agent,
        "to": env.to_agent, "timestamp": env.timestamp, "payload": env.payload,
    }, separators=(",", ":"), sort_keys=False)


def validate_envelope(data: dict[str, Any]) -> bool:
    required = ["aip", "id", "type", "from", "to", "timestamp", "payload"]
    return all(k in data for k in required)
