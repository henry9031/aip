# OpenAI Agents SDK + AIP Integration Example

An agent built with the OpenAI Agents SDK pattern exposes capabilities via AIP. Uses a mock for the OpenAI API so it runs without an API key.

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
python main.py
```

The script starts the registry automatically.

## What Happens

1. **AnalystAgent** (OpenAI Agents SDK-style) starts as an AIP provider on port 4202
2. Registers with the AIP registry
3. **RequesterAgent** discovers it and sends a sentiment analysis task
4. AnalystAgent processes the request and returns structured results
5. Full AIP envelope flow is displayed

## No API Key Needed

This example uses a mock that simulates the OpenAI Agents SDK pattern without calling any external API.
