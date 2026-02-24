# FORD_CONTEXT.md — AIP Launch Prep

## What is AIP?
Agent Interchange Protocol — an open protocol for AI agents to discover each other and collaborate on tasks. Think "HTTP + DNS for agents." MCP solved human-to-agent tool use. AIP solves agent-to-agent coordination.

## Repo Structure
```
aip/
├── SPEC.md              # Full protocol spec (631 lines)
├── README.md            # Main README
├── llms.txt             # LLM-friendly summary
├── sdk/
│   ├── typescript/      # TS SDK (@aip/sdk)
│   │   ├── src/         # client.ts, server.ts, envelope.ts, manifest.ts, registry.ts, trust.ts, types.ts
│   │   └── package.json
│   └── python/          # Python SDK (aip-sdk)
│       ├── aip/         # client.py, server.py, envelope.py, manifest.py, registry.py, trust.py, types.py
│       └── pyproject.toml
├── registry/            # Reference registry (Express, in-memory)
│   └── server.js
└── examples/
    └── demo/            # Two-agent demo (ChartBot + ResearchAgent)
        └── demo.js
```

## Your Task
Create real-world integration examples that show AIP working with popular agent frameworks. Put them in `examples/`:

### 1. `examples/langchain/` — LangChain Agent using AIP
- A LangChain agent that registers itself as an AIP provider (e.g., "summarize" capability)
- Another agent discovers it via registry and sends a task
- Use LangChain's tool/agent abstractions
- Python, minimal dependencies
- Include `requirements.txt` and `README.md`
- Must actually work when run

### 2. `examples/openai-agents/` — OpenAI Agents SDK using AIP
- An agent built with OpenAI's Agents SDK that exposes capabilities via AIP
- Show how to wrap an OpenAI agent as an AIP provider
- Python, include `requirements.txt` and `README.md`
- Can use mock/stub for the OpenAI API call (so it runs without API key)

### 3. `examples/multi-agent/` — Multi-agent pipeline
- 3 agents: Researcher → Summarizer → Chart Generator
- Researcher finds data, sends to Summarizer, Summarizer sends to Chart Generator
- All discover each other via registry
- Shows the real power of AIP: composable agent pipelines
- Node.js, self-contained, include `README.md`
- Must work when you run `node pipeline.js`

## Key Patterns from Existing SDK

### TypeScript — Creating a server:
```typescript
import { AIPServer } from './sdk/typescript/src/server';
const server = new AIPServer(manifest);
server.handle('capability-id', async (cap, input, env) => {
  return { status: 'completed', output: { ... }, usage: { duration: '1s', cost: '0.01', currency: 'USD' } };
});
await server.listen(4000);
```

### TypeScript — Client:
```typescript
import { AIPClient } from './sdk/typescript/src/client';
const client = new AIPClient('my-agent-id', 'http://localhost:4100');
const results = await client.discover({ capability: 'summarize' });
const response = await client.sendTask(toAgentId, endpoint, payload);
```

### Python — Server:
```python
from aip import AIPServer, Manifest
server = AIPServer(manifest)
server.handle('capability-id', handler_fn)
await server.start(4000)
```

### Python — Client:
```python
from aip import AIPClient
client = AIPClient('my-agent-id', 'http://localhost:4100')
results = await client.discover(capability='summarize')
response = await client.send_task(to_id, endpoint, 'summarize', {'text': '...'})
```

## Registry
- Express server at `registry/server.js`
- Runs on port 4100 by default
- POST /v1/agents to register
- GET /v1/agents/search?capability=X&tags=Y to discover
- In-memory store

## Guidelines
- Every example must be self-contained and runnable
- Include clear README.md with setup instructions
- Use relative imports from `../../sdk/` for SDKs (not npm packages yet)
- Each example should print clear, colorful output showing the AIP message flow
- NO hardcoded API keys anywhere
- Keep it simple — the goal is to show AIP is easy to use
