"""AIP Core Types"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Literal

MessageType = Literal[
    "task.request", "task.accept", "task.progress",
    "task.result", "task.error", "task.cancel",
    "task.quote", "task.offer", "task.negotiate",
    "ping", "pong", "capability.query", "capability.response",
]

TaskState = Literal[
    "REQUESTED", "ACCEPTED", "IN_PROGRESS",
    "COMPLETED", "FAILED", "CANCELLED", "REJECTED",
]


@dataclass
class AgentInfo:
    id: str
    name: str
    description: str = ""
    version: str = ""
    homepage: str = ""
    operator: str = ""


@dataclass
class CapabilityPricing:
    model: Literal["per-task", "per-minute", "free"] = "free"
    amount: str = ""
    currency: str = ""


@dataclass
class Capability:
    id: str
    name: str
    description: str = ""
    input_schema: dict[str, Any] = field(default_factory=dict)
    output_schema: dict[str, Any] = field(default_factory=dict)
    estimated_duration: str = ""
    pricing: CapabilityPricing | None = None
    tags: list[str] = field(default_factory=list)


@dataclass
class Endpoints:
    aip: str
    health: str = ""


@dataclass
class TrustConfig:
    public_key: str = ""
    attestations: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class Manifest:
    aip: str
    agent: AgentInfo
    capabilities: list[Capability]
    endpoints: Endpoints
    auth_schemes: list[str] = field(default_factory=list)
    trust: TrustConfig | None = None

    def to_dict(self) -> dict[str, Any]:
        caps = []
        for c in self.capabilities:
            cap: dict[str, Any] = {"id": c.id, "name": c.name}
            if c.description: cap["description"] = c.description
            if c.input_schema: cap["inputSchema"] = c.input_schema
            if c.output_schema: cap["outputSchema"] = c.output_schema
            if c.estimated_duration: cap["estimatedDuration"] = c.estimated_duration
            if c.pricing: cap["pricing"] = {"model": c.pricing.model, "amount": c.pricing.amount, "currency": c.pricing.currency}
            if c.tags: cap["tags"] = c.tags
            caps.append(cap)

        d: dict[str, Any] = {
            "aip": self.aip,
            "agent": {"id": self.agent.id, "name": self.agent.name},
            "capabilities": caps,
            "endpoints": {"aip": self.endpoints.aip},
        }
        if self.agent.description: d["agent"]["description"] = self.agent.description
        if self.agent.version: d["agent"]["version"] = self.agent.version
        if self.agent.operator: d["agent"]["operator"] = self.agent.operator
        if self.endpoints.health: d["endpoints"]["health"] = self.endpoints.health
        if self.auth_schemes: d["auth"] = {"schemes": self.auth_schemes}
        if self.trust: d["trust"] = {"publicKey": self.trust.public_key}
        return d


@dataclass
class Envelope:
    aip: str
    id: str
    type: MessageType
    from_agent: str
    to_agent: str
    timestamp: str
    payload: dict[str, Any]
    signature: str = ""
    reply_to: str = ""
    correlation_id: str = ""

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "aip": self.aip, "id": self.id, "type": self.type,
            "from": self.from_agent, "to": self.to_agent,
            "timestamp": self.timestamp, "payload": self.payload,
        }
        if self.signature: d["signature"] = self.signature
        if self.reply_to: d["replyTo"] = self.reply_to
        if self.correlation_id: d["correlationId"] = self.correlation_id
        return d

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> Envelope:
        return cls(
            aip=d["aip"], id=d["id"], type=d["type"],
            from_agent=d["from"], to_agent=d["to"],
            timestamp=d["timestamp"], payload=d["payload"],
            signature=d.get("signature", ""),
            reply_to=d.get("replyTo", ""),
            correlation_id=d.get("correlationId", ""),
        )


@dataclass
class SearchResult:
    agent_id: str
    agent_name: str
    capability: str
    endpoint: str
    trust_score: float = 0.0
    pricing: CapabilityPricing | None = None
    last_seen: str = ""


# Error codes
class ErrorCodes:
    INVALID_REQUEST = "INVALID_REQUEST"
    CAPABILITY_UNAVAILABLE = "CAPABILITY_UNAVAILABLE"
    CAPABILITY_NOT_FOUND = "CAPABILITY_NOT_FOUND"
    INPUT_VALIDATION_FAILED = "INPUT_VALIDATION_FAILED"
    TASK_TIMEOUT = "TASK_TIMEOUT"
    RATE_LIMITED = "RATE_LIMITED"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    COST_EXCEEDED = "COST_EXCEEDED"
