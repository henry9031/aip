"""Tests for AIP manifest module"""
import pytest
from aip.manifest import ManifestBuilder
from aip.types import Capability, CapabilityPricing


def _cap():
    return Capability(id="summarize", name="Summarize", tags=["nlp"])


def test_builds_valid_manifest():
    m = ManifestBuilder().agent("Test Agent").capability(_cap()).endpoints("http://localhost:4000/aip").build()
    assert m.aip == "0.1"
    assert m.agent.name == "Test Agent"
    assert len(m.agent.id) == 36
    assert len(m.capabilities) == 1
    assert m.endpoints.aip == "http://localhost:4000/aip"


def test_throws_without_name():
    with pytest.raises(AssertionError):
        ManifestBuilder().capability(_cap()).endpoints("http://localhost:4000/aip").build()


def test_throws_without_endpoint():
    with pytest.raises(AssertionError):
        ManifestBuilder().agent("Test").capability(_cap()).build()


def test_throws_without_capabilities():
    with pytest.raises(AssertionError):
        ManifestBuilder().agent("Test").endpoints("http://localhost:4000/aip").build()


def test_to_dict():
    m = ManifestBuilder().agent("Test").capability(_cap()).endpoints("http://localhost:4000/aip").build()
    d = m.to_dict()
    assert d["aip"] == "0.1"
    assert d["agent"]["name"] == "Test"
    assert d["capabilities"][0]["id"] == "summarize"
    assert d["endpoints"]["aip"] == "http://localhost:4000/aip"


def test_to_dict_with_pricing():
    cap = Capability(id="x", name="X", pricing=CapabilityPricing(model="per-task", amount="0.50", currency="USD"))
    m = ManifestBuilder().agent("Test").capability(cap).endpoints("http://localhost:4000/aip").build()
    d = m.to_dict()
    assert d["capabilities"][0]["pricing"]["amount"] == "0.50"


def test_agent_id_override():
    m = ManifestBuilder().agent("Test").agent_id("custom-id").capability(_cap()).endpoints("http://localhost:4000/aip").build()
    assert m.agent.id == "custom-id"
