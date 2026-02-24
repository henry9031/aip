"""Integration tests for AIP Python server and client"""
import pytest
import pytest_asyncio
import aiohttp
from aip.server import AIPServer
from aip.client import AIPClient
from aip.manifest import ManifestBuilder
from aip.types import Capability, Envelope

PORT = 14580
AGENT_ID = "test-provider-py"
CLIENT_ID = "test-requester-py"


def _make_manifest():
    return (
        ManifestBuilder()
        .agent("Test Provider")
        .agent_id(AGENT_ID)
        .capability(Capability(id="echo", name="Echo", tags=["test"]))
        .endpoints(f"http://localhost:{PORT}/aip")
        .build()
    )


async def echo_handler(cap: str, input_data: dict, env: Envelope) -> dict:
    return {
        "status": "completed",
        "output": {"echo": input_data},
        "usage": {"duration": "0.1s"},
    }


@pytest_asyncio.fixture
async def server():
    manifest = _make_manifest()
    srv = AIPServer(manifest)
    srv.handle("echo", echo_handler)
    await srv.start(PORT)
    yield srv
    await srv.stop()


@pytest.mark.asyncio
async def test_health(server):
    async with aiohttp.ClientSession() as s:
        async with s.get(f"http://localhost:{PORT}/health") as r:
            assert r.status == 200
            data = await r.json()
            assert data["status"] == "ok"


@pytest.mark.asyncio
async def test_manifest_endpoint(server):
    async with aiohttp.ClientSession() as s:
        async with s.get(f"http://localhost:{PORT}/.well-known/aip-manifest.json") as r:
            assert r.status == 200
            data = await r.json()
            assert data["agent"]["id"] == AGENT_ID


@pytest.mark.asyncio
async def test_ping_pong(server):
    client = AIPClient(CLIENT_ID)
    pong = await client.ping(AGENT_ID, f"http://localhost:{PORT}/aip")
    assert pong.type == "pong"
    assert pong.from_agent == AGENT_ID


@pytest.mark.asyncio
async def test_send_task(server):
    client = AIPClient(CLIENT_ID)
    response = await client.send_task(
        AGENT_ID, f"http://localhost:{PORT}/aip",
        "echo", {"message": "hello AIP"}
    )
    assert response.type == "task.result"
    assert response.payload["status"] == "completed"
    assert response.payload["output"]["echo"] == {"message": "hello AIP"}


@pytest.mark.asyncio
async def test_unknown_capability(server):
    client = AIPClient(CLIENT_ID)
    response = await client.send_task(
        AGENT_ID, f"http://localhost:{PORT}/aip",
        "nonexistent", {}
    )
    assert response.type == "task.error"
    assert response.payload["code"] == "CAPABILITY_NOT_FOUND"
