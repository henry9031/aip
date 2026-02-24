#!/usr/bin/env python3
"""
AIP + LangChain Integration Example

A LangChain-based summarizer agent registers as an AIP provider.
A consumer agent discovers it via the registry and sends a task.

No API keys required — uses a mock LLM for demonstration.
"""
import asyncio
import subprocess
import sys
import os
import time
import signal

# Add SDK to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'sdk', 'python'))

from aip import AIPServer, AIPClient, Manifest, AgentInfo, Capability, Endpoints
from aip.registry import RegistryClient

# LangChain imports
from langchain_core.language_models import BaseLLM
from langchain_core.outputs import Generation, LLMResult
from langchain_core.prompts import PromptTemplate
from typing import Any, Optional

# ─── Colors ─────────────────────────────────────────────────────────
RESET = '\033[0m'
BOLD = '\033[1m'
DIM = '\033[2m'
CYAN = '\033[36m'
GREEN = '\033[32m'
YELLOW = '\033[33m'
MAGENTA = '\033[35m'
BLUE = '\033[34m'

def banner(t): print(f"\n{BOLD}{CYAN}{'═'*60}{RESET}\n{BOLD}{CYAN}  {t}{RESET}\n{BOLD}{CYAN}{'═'*60}{RESET}\n")
def step(n, t): print(f"{BOLD}{YELLOW}  Step {n}:{RESET} {t}")
def info(l, t): print(f"{DIM}    {l}:{RESET} {t}")
def arrow(d, t): c = GREEN if d == '→' else MAGENTA; print(f"{c}    {d} {BOLD}{t}{RESET}")
def success(t): print(f"\n{BOLD}{GREEN}  ✓ {t}{RESET}\n")


# ─── Mock LLM (no API key needed) ──────────────────────────────────

class MockSummarizerLLM(BaseLLM):
    """A mock LLM that produces deterministic summaries for demonstration."""

    @property
    def _llm_type(self) -> str:
        return "mock-summarizer"

    def _generate(self, prompts: list[str], stop: Optional[list[str]] = None, **kwargs: Any) -> LLMResult:
        results = []
        for prompt in prompts:
            # Extract the text between markers if present
            text = prompt
            if "TEXT:" in text and "SUMMARY:" in text:
                text = text.split("TEXT:")[1].split("SUMMARY:")[0].strip()

            # Simple extractive summary: take first and last sentences
            sentences = [s.strip() for s in text.replace('\n', ' ').split('.') if s.strip()]
            if len(sentences) <= 2:
                summary = '. '.join(sentences) + '.'
            else:
                summary = f"{sentences[0]}. {sentences[-1]}."

            word_count = len(text.split())
            summary_count = len(summary.split())
            results.append([Generation(text=f"{summary} [Compressed {word_count} words → {summary_count} words]")])

        return LLMResult(generations=results)

    @property
    def _identifying_params(self) -> dict:
        return {"model": "mock-summarizer-v1"}


# ─── Config ─────────────────────────────────────────────────────────

REGISTRY_PORT = 4100
SUMMARIZER_PORT = 4201
REGISTRY_URL = f"http://localhost:{REGISTRY_PORT}"
SUMMARIZER_AGENT_ID = "langchain-summarizer-001"
CONSUMER_AGENT_ID = "consumer-agent-042"

summarizer_manifest = Manifest(
    aip="0.1",
    agent=AgentInfo(
        id=SUMMARIZER_AGENT_ID,
        name="LangChain Summarizer",
        description="Summarizes text using a LangChain chain",
        version="1.0.0",
    ),
    capabilities=[
        Capability(
            id="summarize",
            name="Summarize Text",
            description="Takes text and returns a concise summary",
            input_schema={"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]},
            output_schema={"type": "object", "properties": {"summary": {"type": "string"}}},
            tags=["summarize", "text", "nlp"],
        )
    ],
    endpoints=Endpoints(aip=f"http://localhost:{SUMMARIZER_PORT}/aip"),
)

# ─── LangChain Chain Setup ──────────────────────────────────────────

llm = MockSummarizerLLM()
prompt = PromptTemplate.from_template(
    "Summarize the following text concisely.\n\nTEXT: {text}\n\nSUMMARY:"
)
chain = prompt | llm


# ─── AIP Handler using LangChain ────────────────────────────────────

async def handle_summarize(capability: str, input_data: dict, envelope) -> dict:
    text = input_data.get("text", "")
    print(f"\n{BLUE}    ┌─── LangChain Summarizer processing ───┐{RESET}")
    print(f"{BLUE}    │ Input: {text[:80]}...{RESET}" if len(text) > 80 else f"{BLUE}    │ Input: {text}{RESET}")

    # Run the LangChain chain
    result = chain.invoke({"text": text})
    # result is a Generation object from the pipeline
    summary = result.text if hasattr(result, 'text') else str(result)

    print(f"{BLUE}    │ Output: {summary}{RESET}")
    print(f"{BLUE}    └{'─'*45}┘{RESET}\n")

    return {
        "status": "completed",
        "output": {"summary": summary, "model": "mock-summarizer-v1", "framework": "langchain"},
        "usage": {"duration": "0.5s", "cost": "0.00", "currency": "USD"},
    }


# ─── Main ────────────────────────────────────────────────────────────

async def main():
    registry_proc = None

    try:
        banner("AIP + LangChain Integration")
        print(f"{DIM}  A LangChain summarizer agent, discoverable via AIP{RESET}\n")

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

        # Step 2: Start summarizer AIP server
        step(2, "Starting LangChain Summarizer as AIP provider...")
        server = AIPServer(summarizer_manifest)
        server.handle("summarize", handle_summarize)
        await server.start(SUMMARIZER_PORT)
        info("Summarizer", f"http://localhost:{SUMMARIZER_PORT}")

        # Step 3: Register with registry
        step(3, "Registering summarizer with the registry...")
        registry_client = RegistryClient(REGISTRY_URL)
        arrow("→", "POST /v1/agents (register LangChain Summarizer)")
        reg_result = await registry_client.register(summarizer_manifest)
        info("Result", str(reg_result))

        # Step 4: Consumer discovers summarizer
        step(4, "Consumer agent discovers summarizer via registry...")
        client = AIPClient(CONSUMER_AGENT_ID, REGISTRY_URL)
        arrow("→", "GET /v1/agents/search?capability=summarize")
        results = await client.discover(capability="summarize")
        info("Found", f"{len(results)} agent(s)")
        if results:
            r = results[0]
            info("Agent", f"{r.agent_name} ({r.agent_id})")
            info("Capability", r.capability)
            info("Endpoint", r.endpoint)

        # Step 5: Send task
        step(5, "Consumer sends summarization task...")
        sample_text = (
            "The Agent Interchange Protocol (AIP) is an open protocol designed to enable "
            "AI agents to discover each other and collaborate on tasks. It provides a "
            "standardized way for agents to register their capabilities, find other agents "
            "through a registry, and exchange structured task requests and results. AIP "
            "includes support for capability-based discovery, trust scoring, cost negotiation, "
            "and secure message envelopes. The protocol aims to create an interoperable "
            "ecosystem where specialized AI agents can work together seamlessly, much like "
            "how HTTP and DNS enabled the modern web."
        )

        arrow("→", "task.request (summarize)")
        response = await client.send_task(
            SUMMARIZER_AGENT_ID,
            f"http://localhost:{SUMMARIZER_PORT}/aip",
            "summarize",
            {"text": sample_text},
        )

        # Step 6: Show result
        step(6, "Result received!")
        arrow("←", f"task.result")
        info("Status", response.payload.get("status", ""))
        info("Summary", response.payload.get("output", {}).get("summary", ""))
        info("Framework", response.payload.get("output", {}).get("framework", ""))
        info("Cost", f"{response.payload.get('usage', {}).get('cost', '')} {response.payload.get('usage', {}).get('currency', '')}")

        success("LangChain agent collaborated via AIP successfully!")

        # Cleanup
        await server.stop()

    finally:
        if registry_proc:
            registry_proc.terminate()
            registry_proc.wait()


if __name__ == "__main__":
    asyncio.run(main())
