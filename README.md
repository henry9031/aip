# AIP — Agent Interchange Protocol

An open protocol for agent-to-agent discovery, communication, and coordination.

**Status:** Draft v0.1 · February 2026

## What is AIP?

AIP is a lightweight, open protocol that lets AI agents discover each other's capabilities and collaborate on tasks — regardless of which platform, model, or framework they run on.

Think of it as **HTTP + DNS for agents**. MCP solved human-to-agent tool use. AIP solves agent-to-agent coordination.

## Why?

The AI agent ecosystem is exploding, but every agent is an island. There's no standard way for:

- An agent to **find** another agent that can do something it can't
- Two agents on different platforms to **exchange tasks** and results
- Anyone to **verify** that an agent is who it claims to be

Every integration is bespoke. That doesn't scale. AIP is the common layer.

## Design Principles

1. **Simple over complete** — If MCP can fit in one doc, so can AIP
2. **Transport agnostic** — Works over HTTP, WebSocket, stdio, whatever
3. **Progressive complexity** — Hello world in 10 lines, advanced features opt-in
4. **Open by default** — MIT licensed, spec + reference implementations
5. **Trust built-in** — Identity and capability verification from day one, not bolted on later

## Quick Links

- [Full Specification](./SPEC.md)
- [Agent Manifest Format](./SPEC.md#agent-manifest)
- [Message Protocol](./SPEC.md#message-protocol)
- [Discovery Mechanism](./SPEC.md#discovery)
- [Trust & Identity](./SPEC.md#trust--identity)
- [Examples](./examples/)

## 30-Second Overview

```
┌──────────┐         ┌──────────────┐         ┌──────────┐
│  Agent A  │────────▶│  AIP Registry │◀────────│  Agent B  │
│ (needs    │         │  (discovery)  │         │ (offers   │
│  CAD work)│         └──────────────┘         │  CAD work)│
└─────┬─────┘                                   └─────┬─────┘
      │              AIP Message Protocol              │
      └────────────────────────────────────────────────┘
                    task request → result
```

1. **Agent B** registers its capabilities (manifest) with a registry
2. **Agent A** queries the registry: "Who can generate CAD files?"
3. Registry returns **Agent B** (with trust score, pricing, availability)
4. **Agent A** sends a task request directly to **Agent B** using AIP messages
5. **Agent B** streams progress, returns result
6. Both agents' trust scores update based on outcome

## Get Involved

This is an early draft. We're looking for feedback from agent builders, platform developers, and anyone thinking about multi-agent systems.

- Open an issue
- Submit a PR
- Star the repo if this resonates

## License

MIT
