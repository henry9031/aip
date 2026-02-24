"""AIP Client — discover agents and send task requests"""
import aiohttp
from typing import Any
from .types import Envelope
from .envelope import create_envelope, validate_envelope
from .registry import RegistryClient


class AIPClient:
    def __init__(self, agent_id: str, registry_url: str = "") -> None:
        self.agent_id = agent_id
        self.registry = RegistryClient(registry_url) if registry_url else None

    async def discover(self, capability: str = "", tags: list[str] | None = None):
        if not self.registry:
            raise RuntimeError("No registry configured")
        return await self.registry.search(capability=capability, tags=tags)

    async def send_task(
        self, to_agent_id: str, endpoint: str,
        capability: str, input_data: dict[str, Any],
        constraints: dict[str, Any] | None = None,
    ) -> Envelope:
        payload = {"capability": capability, "input": input_data}
        if constraints: payload["constraints"] = constraints
        env = create_envelope("task.request", self.agent_id, to_agent_id, payload)

        async with aiohttp.ClientSession() as s:
            async with s.post(endpoint, json=env.to_dict()) as r:
                r.raise_for_status()
                data = await r.json()
                if not validate_envelope(data):
                    raise ValueError("Invalid response envelope")
                return Envelope.from_dict(data)

    async def ping(self, to_agent_id: str, endpoint: str) -> Envelope:
        env = create_envelope("ping", self.agent_id, to_agent_id, {})
        async with aiohttp.ClientSession() as s:
            async with s.post(endpoint, json=env.to_dict()) as r:
                r.raise_for_status()
                return Envelope.from_dict(await r.json())
