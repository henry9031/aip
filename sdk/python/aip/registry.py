"""Registry client"""
import aiohttp
from typing import Any
from .types import Manifest, SearchResult


class RegistryClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def register(self, manifest: Manifest) -> dict[str, Any]:
        async with aiohttp.ClientSession() as s:
            async with s.post(f"{self.base_url}/v1/agents", json=manifest.to_dict()) as r:
                r.raise_for_status()
                return await r.json()

    async def search(self, capability: str = "", tags: list[str] | None = None) -> list[SearchResult]:
        params: dict[str, str] = {}
        if capability: params["capability"] = capability
        if tags: params["tags"] = ",".join(tags)
        async with aiohttp.ClientSession() as s:
            async with s.get(f"{self.base_url}/v1/agents/search", params=params) as r:
                r.raise_for_status()
                data = await r.json()
                return [
                    SearchResult(
                        agent_id=x["agent"]["id"], agent_name=x["agent"]["name"],
                        capability=x.get("capability", ""), endpoint=x.get("endpoint", ""),
                        trust_score=x.get("trustScore", 0),
                    )
                    for x in data.get("results", [])
                ]

    async def get(self, agent_id: str) -> dict[str, Any]:
        async with aiohttp.ClientSession() as s:
            async with s.get(f"{self.base_url}/v1/agents/{agent_id}") as r:
                r.raise_for_status()
                return await r.json()

    async def deregister(self, agent_id: str) -> None:
        async with aiohttp.ClientSession() as s:
            async with s.delete(f"{self.base_url}/v1/agents/{agent_id}") as r:
                r.raise_for_status()
