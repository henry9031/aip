# LangChain + AIP Integration Example

A LangChain agent registers as an AIP provider with "summarize" capability. A consumer agent discovers it via the registry and sends a task.

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
# Terminal 1: Start the registry (from repo root)
node registry/server.js

# Terminal 2: Run the example
python main.py
```

Or just run `python main.py` — it starts the registry automatically if you have Node.js installed.

## What Happens

1. **SummarizerAgent** (LangChain-based) starts as an AIP server on port 4201
2. It registers with the AIP registry (port 4100)
3. **ConsumerAgent** discovers SummarizerAgent via registry search
4. ConsumerAgent sends a `task.request` with text to summarize
5. SummarizerAgent uses a LangChain chain to process the text
6. Result flows back as a `task.result` envelope

## Architecture

```
┌──────────────┐     discover     ┌──────────┐
│ ConsumerAgent │ ──────────────→ │ Registry │
└──────┬───────┘                  └──────────┘
       │ task.request                    ↑ register
       ▼                                 │
┌──────────────────┐                     │
│ SummarizerAgent   │ ───────────────────┘
│ (LangChain chain) │
└──────────────────┘
```
