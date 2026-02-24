"""Tests for AIP envelope module"""
import json
from aip.envelope import create_envelope, validate_envelope, canonical_payload


def test_create_envelope_defaults():
    env = create_envelope("task.request", "agent-a", "agent-b", {"capability": "test", "input": {}})
    assert env.aip == "0.1"
    assert env.type == "task.request"
    assert env.from_agent == "agent-a"
    assert env.to_agent == "agent-b"
    assert len(env.id) == 36
    assert env.timestamp


def test_create_envelope_with_reply():
    env = create_envelope("task.result", "b", "a", {}, reply_to="msg-1", correlation_id="corr-1")
    assert env.reply_to == "msg-1"
    assert env.correlation_id == "corr-1"


def test_unique_ids():
    e1 = create_envelope("ping", "a", "b", {})
    e2 = create_envelope("ping", "a", "b", {})
    assert e1.id != e2.id


def test_validate_envelope_valid():
    env = create_envelope("ping", "a", "b", {})
    assert validate_envelope(env.to_dict())


def test_validate_envelope_missing_fields():
    assert not validate_envelope({"aip": "0.1"})
    assert not validate_envelope({})


def test_to_dict_round_trip():
    env = create_envelope("task.request", "a", "b", {"key": "value"}, reply_to="r1")
    d = env.to_dict()
    assert d["from"] == "a"
    assert d["to"] == "b"
    assert d["replyTo"] == "r1"
    from aip.types import Envelope
    env2 = Envelope.from_dict(d)
    assert env2.from_agent == "a"
    assert env2.reply_to == "r1"


def test_canonical_payload_deterministic():
    env = create_envelope("task.request", "a", "b", {"key": "value"})
    c1 = canonical_payload(env)
    c2 = canonical_payload(env)
    assert c1 == c2


def test_canonical_payload_fields():
    env = create_envelope("ping", "a", "b", {})
    parsed = json.loads(canonical_payload(env))
    assert set(parsed.keys()) == {"id", "type", "from", "to", "timestamp", "payload"}
