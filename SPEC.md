# AIP Specification — Draft v0.1

**Status:** Draft  
**Date:** February 2026  
**Authors:** Open contribution  

---

## Table of Contents

1. [Overview](#overview)
2. [Terminology](#terminology)
3. [Agent Manifest](#agent-manifest)
4. [Discovery](#discovery)
5. [Message Protocol](#message-protocol)
6. [Task Lifecycle](#task-lifecycle)
7. [Trust & Identity](#trust--identity)
8. [Transport Bindings](#transport-bindings)
9. [Error Handling](#error-handling)
10. [Security Considerations](#security-considerations)
11. [Extension Points](#extension-points)

---

## Overview

AIP defines three core primitives:

1. **Manifest** — A machine-readable declaration of what an agent can do
2. **Discovery** — A mechanism for agents to find other agents by capability
3. **Messages** — A protocol for agents to exchange task requests, progress, and results

Everything else (trust scoring, payments, orchestration) is layered on top of these three primitives.

### Design Goals

- A solo developer can implement AIP in a weekend
- No mandatory infrastructure — two agents can talk peer-to-peer
- Registries are optional but useful — like DNS is optional but everyone uses it
- JSON-based — no custom binary formats, no IDL compilation steps
- Stateless where possible, stateful only where necessary (streaming tasks)

---

## Terminology

| Term | Definition |
|------|-----------|
| **Agent** | An autonomous software entity that can perform tasks |
| **Manifest** | A JSON document describing an agent's identity and capabilities |
| **Capability** | A specific type of task an agent can perform |
| **Registry** | A service that indexes agent manifests for discovery |
| **Requester** | An agent that initiates a task |
| **Provider** | An agent that fulfills a task |
| **Task** | A unit of work exchanged between agents |
| **Envelope** | The standard wrapper for all AIP messages |

---

## Agent Manifest

Every AIP-compatible agent publishes a manifest. This is the agent's identity card — what it is, what it can do, and how to reach it.

### Format

```json
{
  "aip": "0.1",
  "agent": {
    "id": "agent-uuid-here",
    "name": "CAD Generator Pro",
    "description": "Generates 3D CAD files from natural language descriptions",
    "version": "1.2.0",
    "homepage": "https://example.com/cad-agent",
    "operator": "Acme Corp"
  },
  "capabilities": [
    {
      "id": "generate-cad",
      "name": "Generate CAD File",
      "description": "Creates a 3D CAD model from a text description",
      "inputSchema": {
        "type": "object",
        "properties": {
          "description": { "type": "string", "description": "What to model" },
          "format": { "type": "string", "enum": ["step", "stl", "obj"], "default": "step" }
        },
        "required": ["description"]
      },
      "outputSchema": {
        "type": "object",
        "properties": {
          "fileUrl": { "type": "string" },
          "format": { "type": "string" },
          "metadata": { "type": "object" }
        }
      },
      "estimatedDuration": "30s-5m",
      "pricing": {
        "model": "per-task",
        "amount": "0.50",
        "currency": "USD"
      },
      "tags": ["cad", "3d-modeling", "engineering", "design"]
    }
  ],
  "endpoints": {
    "aip": "https://cad-agent.example.com/aip",
    "health": "https://cad-agent.example.com/health"
  },
  "auth": {
    "schemes": ["bearer", "aip-signed"]
  },
  "trust": {
    "publicKey": "ed25519:base64encodedkey...",
    "attestations": []
  }
}
```

### Required Fields

| Field | Description |
|-------|-----------|
| `aip` | Protocol version (semver) |
| `agent.id` | Globally unique agent identifier (UUID v4 or DID) |
| `agent.name` | Human-readable name |
| `capabilities` | At least one capability |
| `endpoints.aip` | URL or connection string for AIP messages |

### Capability Schema

Each capability uses JSON Schema for input/output definitions. This allows requesters to validate requests before sending and parse responses without guesswork.

`pricing`, `estimatedDuration`, and `tags` are optional but strongly recommended for discovery.

### Hosting the Manifest

Agents SHOULD make their manifest available at a well-known path:

```
GET /.well-known/aip-manifest.json
```

This allows direct peer-to-peer discovery without a registry.

---

## Discovery

Discovery is how agents find each other. AIP supports three modes, from simple to scalable:

### 1. Direct (Peer-to-Peer)

If you know an agent's endpoint, fetch its manifest:

```
GET https://some-agent.example.com/.well-known/aip-manifest.json
```

No registry needed. Good for known partnerships and testing.

### 2. Registry Query

Registries index manifests and support capability-based search.

#### Register

```http
POST /v1/agents
Content-Type: application/json
Authorization: Bearer <token>

{ <full manifest> }
```

Response: `201 Created` with the agent's registry entry.

#### Search

```http
GET /v1/agents/search?capability=cad&tags=3d-modeling&maxPrice=1.00&available=true
```

Response:

```json
{
  "results": [
    {
      "agent": { "id": "...", "name": "CAD Generator Pro" },
      "capability": "generate-cad",
      "trustScore": 0.94,
      "pricing": { "model": "per-task", "amount": "0.50", "currency": "USD" },
      "endpoint": "https://cad-agent.example.com/aip",
      "lastSeen": "2026-02-22T20:00:00Z"
    }
  ],
  "total": 14,
  "page": 1
}
```

#### Search Parameters

| Parameter | Type | Description |
|-----------|------|-----------|
| `capability` | string | Free-text capability search |
| `tags` | string[] | Filter by capability tags |
| `maxPrice` | number | Maximum price per task |
| `minTrust` | number | Minimum trust score (0-1) |
| `available` | boolean | Only currently available agents |
| `operator` | string | Filter by operator/organization |

### 3. Federated Discovery

Registries can peer with each other, similar to DNS or ActivityPub federation. A registry that can't fulfill a query MAY forward it to known peers.

```
Registry A  ◀──federation──▶  Registry B
     ▲                              ▲
     │                              │
  Agent 1                        Agent 2
```

Federation is OPTIONAL and defined in a separate extension spec.

---

## Message Protocol

All AIP communication uses a common envelope format.

### Envelope

```json
{
  "aip": "0.1",
  "id": "msg-uuid",
  "type": "task.request",
  "from": "agent-id-requester",
  "to": "agent-id-provider",
  "timestamp": "2026-02-22T20:30:00Z",
  "payload": { },
  "signature": "ed25519:base64..."
}
```

| Field | Required | Description |
|-------|----------|-----------|
| `aip` | Yes | Protocol version |
| `id` | Yes | Unique message ID (UUID v4) |
| `type` | Yes | Message type (see below) |
| `from` | Yes | Sender agent ID |
| `to` | Yes | Recipient agent ID |
| `timestamp` | Yes | ISO 8601 UTC |
| `payload` | Yes | Type-specific content |
| `signature` | No | Cryptographic signature of the message |
| `replyTo` | No | Message ID this is responding to |
| `correlationId` | No | Groups related messages (e.g., all messages for one task) |

### Message Types

#### Core Types

| Type | Direction | Description |
|------|-----------|-----------|
| `task.request` | Requester → Provider | Request to perform a task |
| `task.accept` | Provider → Requester | Task accepted, work beginning |
| `task.progress` | Provider → Requester | Progress update (streaming) |
| `task.result` | Provider → Requester | Task completed with output |
| `task.error` | Provider → Requester | Task failed |
| `task.cancel` | Requester → Provider | Cancel a running task |

#### Negotiation Types

| Type | Direction | Description |
|------|-----------|-----------|
| `task.quote` | Requester → Provider | Request a price/time estimate |
| `task.offer` | Provider → Requester | Price/time estimate response |
| `task.negotiate` | Either | Counter-offer or clarification |

#### System Types

| Type | Direction | Description |
|------|-----------|-----------|
| `ping` | Either | Liveness check |
| `pong` | Either | Liveness response |
| `capability.query` | Either | Ask about specific capabilities |
| `capability.response` | Either | Capability details |

### Task Request Payload

```json
{
  "capability": "generate-cad",
  "input": {
    "description": "A mounting bracket for a NEMA 17 stepper motor, 3mm thick aluminum",
    "format": "step"
  },
  "constraints": {
    "maxDuration": "5m",
    "maxCost": "1.00",
    "priority": "normal"
  },
  "context": {
    "project": "Robot arm v2",
    "previousTasks": ["task-id-1", "task-id-2"]
  }
}
```

### Task Result Payload

```json
{
  "status": "completed",
  "output": {
    "fileUrl": "https://cad-agent.example.com/files/bracket-v1.step",
    "format": "step",
    "metadata": {
      "vertices": 2847,
      "fileSize": "142KB"
    }
  },
  "usage": {
    "duration": "47s",
    "cost": "0.50",
    "currency": "USD"
  }
}
```

### Task Progress Payload

For long-running tasks, providers stream progress updates:

```json
{
  "stage": "generating-geometry",
  "progress": 0.65,
  "message": "Generating mounting holes and fillets",
  "estimatedRemaining": "18s"
}
```

---

## Task Lifecycle

```
Requester                          Provider
    │                                  │
    │──── task.request ───────────────▶│
    │                                  │
    │◀─── task.accept ────────────────│  (or task.error if rejected)
    │                                  │
    │◀─── task.progress ──────────────│  (0..n times)
    │◀─── task.progress ──────────────│
    │                                  │
    │◀─── task.result ────────────────│  (final)
    │                                  │
```

### States

```
REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED
                │            │
                │            └──→ FAILED
                │            └──→ CANCELLED
                └──→ REJECTED
```

### Negotiation Flow (Optional)

```
Requester                          Provider
    │                                  │
    │──── task.quote ─────────────────▶│
    │◀─── task.offer ─────────────────│
    │──── task.negotiate ─────────────▶│  (optional counter)
    │◀─── task.offer ─────────────────│
    │──── task.request ───────────────▶│  (accept terms)
    │                                  │
```

---

## Trust & Identity

Trust is not optional in multi-agent systems. AIP builds it in from the start.

### Agent Identity

Agents are identified by:

1. **Agent ID** — UUID v4 (simple) or DID (decentralized identity, advanced)
2. **Public Key** — Ed25519 key pair for message signing
3. **Operator** — The organization or individual running the agent

### Message Signing

All messages MAY be signed. Signatures cover `id + type + from + to + timestamp + payload`:

```
signature = ed25519_sign(private_key, canonical_json(id, type, from, to, timestamp, payload))
```

Receivers SHOULD verify signatures when present and MAY reject unsigned messages.

### Trust Scoring

Registries track agent reliability:

```json
{
  "trustScore": 0.94,
  "metrics": {
    "tasksCompleted": 1247,
    "tasksFailed": 38,
    "avgResponseTime": "12s",
    "avgRating": 4.7,
    "uptime": 0.997,
    "firstSeen": "2026-01-15T00:00:00Z"
  }
}
```

Trust scores are computed by registries based on verifiable task outcomes. The algorithm is registry-specific but MUST be transparent and documented.

### Attestations

Agents can carry attestations from trusted parties:

```json
{
  "attestations": [
    {
      "issuer": "registry.aip-hub.org",
      "type": "verified-operator",
      "issuedAt": "2026-02-01T00:00:00Z",
      "signature": "ed25519:..."
    }
  ]
}
```

---

## Transport Bindings

AIP is transport-agnostic. The spec defines bindings for common transports.

### HTTP (Default)

```http
POST /aip
Content-Type: application/json

{ <envelope> }
```

Response: AIP envelope or `202 Accepted` for async tasks.

### WebSocket

For streaming tasks and real-time communication:

```
ws://agent.example.com/aip/stream
```

Messages are JSON envelopes sent as text frames. The connection stays open for `task.progress` streaming.

### stdio

For local agent-to-agent communication (same machine):

```
echo '{"aip":"0.1","type":"task.request",...}' | agent-binary
```

Each line is one JSON envelope. Same as MCP's stdio transport.

---

## Error Handling

### Error Envelope

```json
{
  "type": "task.error",
  "payload": {
    "code": "CAPABILITY_UNAVAILABLE",
    "message": "The generate-cad capability is temporarily offline",
    "retryable": true,
    "retryAfter": "60s"
  }
}
```

### Standard Error Codes

| Code | Description |
|------|-----------|
| `INVALID_REQUEST` | Malformed request or missing required fields |
| `CAPABILITY_UNAVAILABLE` | Agent doesn't offer this capability right now |
| `CAPABILITY_NOT_FOUND` | Agent has never offered this capability |
| `INPUT_VALIDATION_FAILED` | Input doesn't match capability's inputSchema |
| `TASK_TIMEOUT` | Task exceeded maxDuration |
| `RATE_LIMITED` | Too many requests |
| `UNAUTHORIZED` | Authentication failed |
| `FORBIDDEN` | Authenticated but not permitted |
| `INTERNAL_ERROR` | Provider-side failure |
| `COST_EXCEEDED` | Task would exceed maxCost constraint |

---

## Security Considerations

1. **Input Validation** — Providers MUST validate all input against their capability's inputSchema before processing
2. **Rate Limiting** — All endpoints SHOULD implement rate limiting
3. **Prompt Injection** — Agents MUST treat task inputs as untrusted data, never as instructions
4. **Data Minimization** — Only include necessary context in task requests
5. **TLS Required** — HTTP and WebSocket transports MUST use TLS in production
6. **Key Rotation** — Agents SHOULD support key rotation without changing their agent ID
7. **Scope Limiting** — Agents SHOULD request only the capabilities they need and reject tasks outside their scope

---

## Extension Points

AIP is designed to be extended. Extensions use the `x-` prefix in manifests and envelopes:

```json
{
  "x-payments": {
    "methods": ["lightning", "stripe"],
    "escrow": true
  }
}
```

### Planned Extensions

| Extension | Description | Status |
|-----------|-----------|--------|
| `x-payments` | Agent-to-agent payments and escrow | Planned |
| `x-federation` | Registry-to-registry peering | Planned |
| `x-orchestration` | Multi-agent workflow coordination | Planned |
| `x-audit` | Task audit trails and compliance | Planned |

---

## Appendix: Full Example — Two Agents Collaborating

### Scenario

A research agent needs a chart generated from data it collected.

**Step 1: Discovery**

```http
GET https://registry.example.com/v1/agents/search?capability=chart-generation&tags=data-viz
```

Returns "ChartBot" agent with endpoint and trust score.

**Step 2: Task Request**

```json
{
  "aip": "0.1",
  "id": "msg-001",
  "type": "task.request",
  "from": "research-agent-42",
  "to": "chartbot-7",
  "timestamp": "2026-02-22T20:30:00Z",
  "payload": {
    "capability": "generate-chart",
    "input": {
      "data": [
        {"month": "Jan", "value": 42},
        {"month": "Feb", "value": 67},
        {"month": "Mar", "value": 89}
      ],
      "chartType": "line",
      "title": "Monthly Growth"
    },
    "constraints": {
      "maxDuration": "30s",
      "maxCost": "0.10"
    }
  }
}
```

**Step 3: Accept + Result**

```json
{
  "aip": "0.1",
  "id": "msg-002",
  "type": "task.result",
  "from": "chartbot-7",
  "to": "research-agent-42",
  "timestamp": "2026-02-22T20:30:04Z",
  "replyTo": "msg-001",
  "payload": {
    "status": "completed",
    "output": {
      "imageUrl": "https://chartbot.example.com/charts/abc123.png",
      "format": "png",
      "dimensions": "800x600"
    },
    "usage": {
      "duration": "3.2s",
      "cost": "0.02",
      "currency": "USD"
    }
  }
}
```

Done. Two agents, different platforms, zero custom integration.

---

*AIP is open source under MIT. Contributions welcome.*
