"""Manifest builder for AIP agents"""
from uuid import uuid4
from .types import Manifest, AgentInfo, Capability, Endpoints, TrustConfig


class ManifestBuilder:
    def __init__(self) -> None:
        self._agent = AgentInfo(id=str(uuid4()), name="")
        self._capabilities: list[Capability] = []
        self._endpoints = Endpoints(aip="")
        self._auth: list[str] = []
        self._trust: TrustConfig | None = None

    def agent(self, name: str, **kwargs: str) -> "ManifestBuilder":
        self._agent.name = name
        for k, v in kwargs.items():
            setattr(self._agent, k, v)
        return self

    def agent_id(self, id: str) -> "ManifestBuilder":
        self._agent.id = id
        return self

    def capability(self, cap: Capability) -> "ManifestBuilder":
        self._capabilities.append(cap)
        return self

    def endpoints(self, aip: str, health: str = "") -> "ManifestBuilder":
        self._endpoints = Endpoints(aip=aip, health=health)
        return self

    def trust(self, trust: TrustConfig) -> "ManifestBuilder":
        self._trust = trust
        return self

    def build(self) -> Manifest:
        assert self._agent.name, "Agent name required"
        assert self._endpoints.aip, "AIP endpoint required"
        assert self._capabilities, "At least one capability required"
        return Manifest(
            aip="0.1", agent=self._agent, capabilities=self._capabilities,
            endpoints=self._endpoints, auth_schemes=self._auth, trust=self._trust,
        )
