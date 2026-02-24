# AIP — Agent Interchange Protocol

**An open protocol for AI agents to discover each other and work together.**

[![Tests](https://github.com/henry9031/aip/actions/workflows/test.yml/badge.svg)](https://github.com/henry9031/aip/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/SDK-TypeScript-blue)](sdk/typescript/)
[![Python](https://img.shields.io/badge/SDK-Python-green)](sdk/python/)

MCP solved human-to-agent tool use. **AIP solves agent-to-agent coordination.**

Every AI agent today is an island. There's no standard way for agents to find each other, negotiate tasks, or exchange results — regardless of which framework or model they use. AIP is the missing layer.

```
┌──────────┐                                    ┌──────────┐
│ Your Agent│─── discover ──▶ AIP Registry ◀────│Any Agent │
│ (LangChain│                                    │ (OpenAI)  │
│  CrewAI…) │◀── task.request / task.result ───▶│          │
└──────────┘           via AIP protocol          └──────────┘
```

## 5-Minute Quickstart

### 1. Clone & install

```bash
git clone https://github.com/henry9031/aip.git
cd aip
```

### 2. Start an agent that provides a capability

```typescript
// provider.ts
import { AIPServer, ManifestBuilder } from './sdk/typescript/src';

const manifest = new ManifestBuilder()
  .agent({ name: 'Summarizer', description: 'Summarizes text' })
  .capability({
    id: 'summarize',
    name: 'Summarize Text',
    description: 'Condenses long text into key points',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string' } },
      required: ['text'],
    },
    tags: ['nlp', 'text'],
    pricing: { model: 'per-task', amount: '0.01', currency: 'USD' },
  })
  .endpoints({ aip: 'http://localhost:4001/aip' })
  .build();

const server = new AIPServer(manifest);

server.handle('summarize', async (_cap, input) => ({
  status: 'completed',
  output: {
    summary: `Summary of ${(input.text as string).length} chars: ${(input.text as string).slice(0, 100)}...`,
  },
  usage: { duration: '0.5s', cost: '0.01', currency: 'USD' },
}));

server.listen(4001).then(() => console.log('✅ Summarizer agent running on :4001'));
```

### 3. Another agent discovers and uses it

```typescript
// requester.ts
import { AIPClient } from './sdk/typescript/src';

const client = new AIPClient('my-research-agent', 'http://localhost:4100');

// Discover agents that can summarize
const { results } = await client.discover({ capability: 'summarize' });
const agent = results[0];

// Send a task
const response = await client.sendTask(agent.agent.id, agent.endpoint, {
  capability: 'summarize',
  input: { text: 'Very long article about quantum computing...' },
});

console.log(response.payload); // { status: 'completed', output: { summary: '...' } }
```

### 4. Run the interactive demo

```bash
cd examples/demo
npm install
node demo.js
```

This starts a registry, spins up a chart-generating agent, and shows a research agent discovering and delegating work — all via AIP messages.

## How It Works

AIP has three primitives:

| Primitive | What it does | Analogy |
|-----------|-------------|---------|
| **Manifest** | Declares what an agent can do | Like a DNS record |
| **Discovery** | Finds agents by capability | Like a DNS lookup |
| **Messages** | Exchanges tasks and results | Like HTTP requests |

### The message flow

```
Requester                          Provider
    │                                  │
    │──── task.request ───────────────▶│  "Summarize this text"
    │                                  │
    │◀─── task.accept ────────────────│  "On it"
    │◀─── task.progress ──────────────│  "65% done..."
    │◀─── task.result ────────────────│  "Here's your summary"
    │                                  │
```

All messages use a standard JSON envelope:

```json
{
  "aip": "0.1",
  "id": "msg-uuid",
  "type": "task.request",
  "from": "research-agent",
  "to": "summarizer-agent",
  "timestamp": "2026-02-24T15:00:00Z",
  "payload": {
    "capability": "summarize",
    "input": { "text": "..." },
    "constraints": { "maxDuration": "30s", "maxCost": "0.10" }
  }
}
```

### Discovery modes

1. **Direct** — Fetch `/.well-known/aip-manifest.json` from any agent
2. **Registry** — Query a registry: `GET /v1/agents/search?capability=summarize&tags=nlp`
3. **Federated** — Registries can peer with each other (like DNS)

### Built-in trust

- Ed25519 message signing
- Trust scores computed from task outcomes
- Attestations from trusted registries

## SDKs

### TypeScript

```bash
cd sdk/typescript && npm install && npm run build
```

```typescript
import { AIPServer, AIPClient, ManifestBuilder } from '@aip/sdk';
```

**40 tests passing** — envelope, manifest, trust, client/server, registry.

### Python

```bash
cd sdk/python && pip install -e .
```

```python
from aip import AIPServer, AIPClient, ManifestBuilder
```

## Examples

| Example | What it shows | Language |
|---------|--------------|---------|
| [`demo`](examples/demo/) | Two agents collaborating via registry | Node.js |
| [`langchain`](examples/langchain/) | LangChain agent as AIP provider | Python |
| [`openai-agents`](examples/openai-agents/) | OpenAI Agents SDK + AIP | Python |
| [`multi-agent`](examples/multi-agent/) | 3-agent pipeline: research → summarize → chart | Node.js |

## Reference Registry

```bash
cd registry && npm install && node server.js
```

Runs on `http://localhost:4100`. In-memory store with rate limiting.

| Endpoint | Method | Description |
|----------|--------|-----------|
| `/v1/agents` | POST | Register an agent |
| `/v1/agents/search` | GET | Search by capability, tags, price |
| `/v1/agents/:id` | GET | Get agent manifest |
| `/v1/agents/:id` | DELETE | Deregister |
| `/health` | GET | Health check |

## Design Principles

1. **Simple** — Implement in a weekend. No IDL, no code gen, just JSON over HTTP.
2. **Transport agnostic** — HTTP, WebSocket, stdio. Same envelope everywhere.
3. **Progressive complexity** — Hello world in 10 lines. Advanced features opt-in.
4. **Trust built-in** — Identity and verification from day one.
5. **Framework agnostic** — Works with LangChain, CrewAI, OpenAI, Anthropic, or raw code.

## AIP vs Other Protocols

| | AIP | MCP | Google A2A |
|---|---|---|---|
| **Purpose** | Agent-to-agent | Human-to-agent tools | Agent-to-agent |
| **Discovery** | Built-in registry + P2P | Manual configuration | Agent Cards |
| **Trust** | Ed25519 signing + scores | None built-in | Enterprise auth |
| **Complexity** | Minimal | Minimal | Enterprise-grade |
| **Status** | Open spec + SDKs | Shipping in Claude | Google-internal |

AIP is what you reach for when your agent needs to talk to another agent and you want it to work in 5 minutes, not 5 weeks.

## Spec

The full [specification](SPEC.md) covers:
- Agent manifests and capability schemas
- Discovery (direct, registry, federated)
- Message protocol and envelope format
- Task lifecycle and state machine
- Trust, identity, and message signing
- Transport bindings (HTTP, WebSocket, stdio)
- Error handling and standard error codes
- Security considerations
- Extension points (payments, orchestration, audit)

## Contributing

This is early. We're building in public and looking for:

- **Feedback** on the spec and API design
- **Integrations** with agent frameworks
- **Real-world usage** — try it, break it, tell us what's missing

Open an issue or submit a PR.

## License

MIT
