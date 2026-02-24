#!/usr/bin/env python3
"""
AIP + OpenAI Agents SDK Integration Example

Wraps an OpenAI Agents SDK-style agent as an AIP provider.
Uses a mock for the OpenAI API — no API key needed.
"""
import asyncio
import subprocess
import sys
import os
import re
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'sdk', 'python'))

from aip import AIPServer, AIPClient, Manifest, AgentInfo, Capability, Endpoints
from aip.registry import RegistryClient

# ─── Colors ─────────────────────────────────────────────────────────
RESET = '\033[0m'; BOLD = '\033[1m'; DIM = '\033[2m'
CYAN = '\033[36m'; GREEN = '\033[32m'; YELLOW = '\033[33m'
MAGENTA = '\033[35m'; BLUE = '\033[34m'; RED = '\033[31m'

def banner(t): print(f"\n{BOLD}{CYAN}{'═'*60}{RESET}\n{BOLD}{CYAN}  {t}{RESET}\n{BOLD}{CYAN}{'═'*60}{RESET}\n")
def step(n, t): print(f"{BOLD}{YELLOW}  Step {n}:{RESET} {t}")
def info(l, t): print(f"{DIM}    {l}:{RESET} {t}")
def arrow(d, t): c = GREEN if d == '→' else MAGENTA; print(f"{c}    {d} {BOLD}{t}{RESET}")
def success(t): print(f"\n{BOLD}{GREEN}  ✓ {t}{RESET}\n")


# ─── Mock OpenAI Agent SDK ──────────────────────────────────────────
# Simulates the patterns from openai-agents SDK without the actual dependency

class MockAgent:
    """Simulates an OpenAI Agents SDK agent with tools and instructions."""

    def __init__(self, name: str, instructions: str, tools: list = None):
        self.name = name
        self.instructions = instructions
        self.tools = tools or []

    async def run(self, input_text: str) -> dict:
        """Simulate agent execution with tool use."""
        print(f"{BLUE}    ┌─── OpenAI Agent '{self.name}' running ───┐{RESET}")
        print(f"{BLUE}    │ Instructions: {self.instructions[:60]}...{RESET}")
        print(f"{BLUE}    │ Input: {input_text[:60]}{'...' if len(input_text) > 60 else ''}{RESET}")

        # Run all tools
        tool_results = {}
        for tool in self.tools:
            print(f"{BLUE}    │ 🔧 Tool: {tool.name}{RESET}")
            result = tool.execute(input_text)
            tool_results[tool.name] = result

        # Combine tool results into final output
        final = {
            "agent": self.name,
            "tool_results": tool_results,
            "reasoning": f"Analyzed input using {len(self.tools)} tool(s)",
        }
        print(f"{BLUE}    └{'─'*45}┘{RESET}")
        return final


class Tool:
    """Simulates an OpenAI Agents SDK tool."""
    def __init__(self, name: str, description: str, fn):
        self.name = name
        self.description = description
        self.fn = fn

    def execute(self, input_text: str):
        return self.fn(input_text)


# ─── Sentiment Analysis Tools ───────────────────────────────────────

def analyze_sentiment(text: str) -> dict:
    """Simple keyword-based sentiment analysis."""
    positive = ['good', 'great', 'excellent', 'amazing', 'love', 'wonderful', 'fantastic', 'brilliant', 'open', 'enable', 'seamless']
    negative = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'poor', 'fail']
    words = text.lower().split()
    pos = sum(1 for w in words if any(p in w for p in positive))
    neg = sum(1 for w in words if any(n in w for n in negative))
    total = pos + neg or 1
    score = (pos - neg) / total
    label = "positive" if score > 0.2 else "negative" if score < -0.2 else "neutral"
    return {"sentiment": label, "score": round(score, 2), "positive_signals": pos, "negative_signals": neg}


def extract_entities(text: str) -> dict:
    """Simple entity extraction."""
    # Find capitalized words as potential entities
    entities = list(set(re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', text)))
    # Find things in parentheses as acronyms
    acronyms = re.findall(r'\(([A-Z]+)\)', text)
    return {"entities": entities[:10], "acronyms": acronyms}


def count_topics(text: str) -> dict:
    """Simple topic detection."""
    topic_keywords = {
        "technology": ["protocol", "api", "sdk", "agent", "software", "data"],
        "collaboration": ["collaborate", "together", "discover", "exchange", "interoperable"],
        "security": ["trust", "secure", "authentication", "key"],
        "economics": ["cost", "pricing", "negotiation", "market"],
    }
    topics = {}
    lower = text.lower()
    for topic, keywords in topic_keywords.items():
        count = sum(1 for k in keywords if k in lower)
        if count > 0:
            topics[topic] = count
    return {"topics": topics, "primary_topic": max(topics, key=topics.get) if topics else "general"}


# ─── Config ──────────────────────────────────────────────────────────

REGISTRY_PORT = 4100
ANALYST_PORT = 4202
REGISTRY_URL = f"http://localhost:{REGISTRY_PORT}"
ANALYST_ID = "openai-analyst-001"
REQUESTER_ID = "requester-agent-042"

# Build the OpenAI-style agent
analyst_agent = MockAgent(
    name="TextAnalyst",
    instructions="You are a text analysis agent. Analyze input text for sentiment, entities, and topics.",
    tools=[
        Tool("sentiment_analyzer", "Analyze sentiment of text", analyze_sentiment),
        Tool("entity_extractor", "Extract named entities", extract_entities),
        Tool("topic_detector", "Detect topics in text", count_topics),
    ],
)

analyst_manifest = Manifest(
    aip="0.1",
    agent=AgentInfo(id=ANALYST_ID, name="OpenAI Text Analyst", description="Text analysis using OpenAI Agents SDK pattern", version="1.0.0"),
    capabilities=[
        Capability(
            id="analyze-text",
            name="Analyze Text",
            description="Performs sentiment analysis, entity extraction, and topic detection",
            input_schema={"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]},
            output_schema={"type": "object", "properties": {"sentiment": {"type": "object"}, "entities": {"type": "object"}, "topics": {"type": "object"}}},
            tags=["analysis", "nlp", "sentiment"],
        )
    ],
    endpoints=Endpoints(aip=f"http://localhost:{ANALYST_PORT}/aip"),
)


# ─── AIP Handler wrapping OpenAI Agent ──────────────────────────────

async def handle_analyze(capability: str, input_data: dict, envelope) -> dict:
    text = input_data.get("text", "")
    result = await analyst_agent.run(text)
    return {
        "status": "completed",
        "output": result["tool_results"],
        "usage": {"duration": "0.8s", "cost": "0.00", "currency": "USD"},
    }


# ─── Main ────────────────────────────────────────────────────────────

async def main():
    registry_proc = None

    try:
        banner("AIP + OpenAI Agents SDK Integration")
        print(f"{DIM}  An OpenAI-style agent exposed via AIP{RESET}\n")

        # Step 1: Start registry
        step(1, "Starting the AIP Registry...")
        registry_path = os.path.join(os.path.dirname(__file__), '..', '..', 'registry', 'server.js')
        registry_proc = subprocess.Popen(
            ['node', registry_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE,
            env={**os.environ, 'PORT': str(REGISTRY_PORT)},
        )
        await asyncio.sleep(1)
        info("Registry", REGISTRY_URL)

        # Step 2: Start analyst AIP server
        step(2, "Starting OpenAI Text Analyst as AIP provider...")
        server = AIPServer(analyst_manifest)
        server.handle("analyze-text", handle_analyze)
        await server.start(ANALYST_PORT)
        info("Analyst", f"http://localhost:{ANALYST_PORT}")

        # Step 3: Register
        step(3, "Registering analyst with the registry...")
        reg = RegistryClient(REGISTRY_URL)
        arrow("→", "POST /v1/agents (register OpenAI Text Analyst)")
        reg_result = await reg.register(analyst_manifest)
        info("Result", str(reg_result))

        # Step 4: Discover
        step(4, "Requester discovers analyst via registry...")
        client = AIPClient(REQUESTER_ID, REGISTRY_URL)
        arrow("→", "GET /v1/agents/search?capability=analyze")
        results = await client.discover(capability="analyze")
        info("Found", f"{len(results)} agent(s)")
        if results:
            r = results[0]
            info("Agent", f"{r.agent_name} ({r.agent_id})")
            info("Capability", r.capability)

        # Step 5: Send task
        step(5, "Requester sends analysis task...")
        sample = (
            "The Agent Interchange Protocol (AIP) is a brilliant open standard that enables "
            "AI agents to discover each other and collaborate seamlessly. Created by OpenClaw, "
            "it provides excellent tooling for agent-to-agent communication including trust "
            "scoring, cost negotiation, and secure message envelopes. The protocol has great "
            "potential to transform how autonomous systems work together."
        )
        arrow("→", "task.request (analyze-text)")
        response = await client.send_task(
            ANALYST_ID, f"http://localhost:{ANALYST_PORT}/aip",
            "analyze-text", {"text": sample},
        )

        # Step 6: Show result
        step(6, "Result received!")
        arrow("←", "task.result")
        output = response.payload.get("output", {})
        sentiment = output.get("sentiment_analyzer", {})
        entities = output.get("entity_extractor", {})
        topics = output.get("topic_detector", {})

        info("Sentiment", f"{sentiment.get('sentiment', '')} (score: {sentiment.get('score', '')})")
        info("Pos signals", str(sentiment.get('positive_signals', '')))
        info("Neg signals", str(sentiment.get('negative_signals', '')))
        info("Entities", ', '.join(entities.get('entities', [])[:5]))
        info("Acronyms", ', '.join(entities.get('acronyms', [])))
        info("Topics", json.dumps(topics.get('topics', {})))
        info("Primary", topics.get('primary_topic', ''))

        success("OpenAI Agents SDK agent collaborated via AIP successfully!")

        await server.stop()

    finally:
        if registry_proc:
            registry_proc.terminate()
            registry_proc.wait()


if __name__ == "__main__":
    asyncio.run(main())
