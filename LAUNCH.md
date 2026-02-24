# Launch Content — AIP

## Hacker News Post

**Title:** AIP – An open protocol for AI agents to discover each other and work together

**URL:** https://github.com/henry9031/aip

**Text (for Show HN — paste in the text field):**

Show HN: AIP – An open protocol for agent-to-agent discovery and collaboration

MCP solved the problem of humans connecting to AI agents via tools. But there's no standard for agents talking to each other.

AIP (Agent Interchange Protocol) is three things:

1. **Manifest** — A JSON document that declares what an agent can do (capabilities, pricing, endpoints)
2. **Discovery** — Find agents by capability via a registry or directly via /.well-known/aip-manifest.json
3. **Messages** — A simple JSON envelope for task requests, progress, and results

Any agent, on any framework, using any model, can register its capabilities and be discovered by other agents. No shared codebase needed.

We built TypeScript and Python SDKs, a reference registry, and examples showing LangChain, OpenAI Agents SDK, and multi-agent pipelines all working together through AIP.

60 tests passing, 5-minute quickstart, MIT licensed.

Why does this matter? Right now if you want Agent A (LangChain) to delegate work to Agent B (OpenAI), you write custom glue code. AIP is the standard layer so you don't have to.

Real use cases we see: AI dev teams (planner → coder → reviewer → deployer), content pipelines, data processing chains, agent marketplaces where agents discover and hire other agents, and multi-model orchestration (GPT-4 for reasoning, Claude for writing, Gemini for vision — all coordinating via one protocol).

Feedback welcome — this is v0.1 and we want to get it right.

---

## Twitter/X Thread

**Tweet 1 (hook):**
MCP solved human-to-agent. But how do agents talk to each other?

Introducing AIP — Agent Interchange Protocol.

An open protocol for AI agents to discover each other and work together. Regardless of framework, model, or platform.

🔗 github.com/henry9031/aip

🧵👇

**Tweet 2 (the problem):**
Right now every agent is an island.

Want your LangChain agent to delegate to an OpenAI agent? Custom glue code.

Want agents to find specialists they need? Manual configuration.

Want trust between unknown agents? Nothing exists.

AIP fixes all three.

**Tweet 3 (how it works):**
AIP has 3 primitives:

📋 Manifest — "Here's what I can do" (JSON)
🔍 Discovery — "Who can do X?" (registry or P2P)
✉️ Messages — "Do this, here's the result" (JSON envelope)

That's it. Two agents can talk in 10 lines of code.

**Tweet 4 (the demo):**
We tested it with 5 agents on different ports:
- Translator
- Code Generator
- Code Reviewer
- Formatter
- Data Analyzer

All discover each other via registry. Cross-agent pipeline. 25 concurrent requests in 10ms.

It just works.

**Tweet 5 (real use cases):**
What people will build with this:

→ AI dev teams (plan → code → review → test → deploy)
→ Content pipelines (research → write → edit → publish)
→ Agent marketplaces (agents hiring other agents)
→ Multi-model orchestration (GPT + Claude + Gemini coordinating)

**Tweet 6 (vs MCP vs A2A):**
How AIP compares:

MCP = human connects to agent tools
Google A2A = enterprise agent coordination
AIP = lightweight agent-to-agent, works in 5 minutes

We wanted something a solo dev can implement in a weekend. No enterprise complexity.

**Tweet 7 (CTA):**
What's in the repo:

✅ Full spec
✅ TypeScript + Python SDKs
✅ 60 tests passing
✅ Reference registry
✅ 4 working examples (LangChain, OpenAI, multi-agent pipeline)
✅ MIT licensed

Star it, try it, tell us what's missing.

github.com/henry9031/aip

---

## Reddit (r/artificial, r/MachineLearning, r/LocalLLaMA)

**Title:** AIP: An open protocol for AI agents to discover and collaborate with each other (like DNS + HTTP but for agents)

**Body:**
I've been building multi-agent systems and kept running into the same problem: there's no standard way for agents to find each other and work together.

MCP is great for connecting humans to agent tools, but what about agent-to-agent?

So I built AIP (Agent Interchange Protocol). It's intentionally simple:

- **Manifest**: A JSON doc that says what an agent can do
- **Discovery**: Registry search or direct P2P via `/.well-known/aip-manifest.json`
- **Messages**: JSON envelopes for task requests and results over HTTP/WS/stdio

I tested it with 5 independent agents discovering each other through a registry and exchanging tasks, including a cross-agent pipeline where a code generator's output feeds into a reviewer which feeds into a translator.

SDKs for TypeScript and Python, 60 tests, examples with LangChain and OpenAI Agents SDK, MIT licensed.

Would love feedback on the spec and API design. What's missing? What would you use it for?

https://github.com/henry9031/aip
