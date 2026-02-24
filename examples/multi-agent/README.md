# Multi-Agent Pipeline Example

Three agents forming a composable pipeline, all discovering each other via AIP:

**Researcher → Summarizer → Chart Generator**

## Run

```bash
node pipeline.js
```

No dependencies beyond Node.js (v18+). The registry starts automatically.

## What Happens

1. Three agents start on separate ports and register with the AIP registry
2. A pipeline orchestrator discovers all agents via capability search
3. **Researcher** collects data about programming language trends
4. **Summarizer** receives the raw data and produces a summary + key metrics
5. **Chart Generator** takes the metrics and produces a visualization
6. Each step uses full AIP envelope exchange (task.request → task.result)

## Architecture

```
┌────────────┐   task.request   ┌─────────────┐   task.request   ┌────────────────┐
│ Researcher  │ ───────────────→ │ Summarizer   │ ───────────────→ │ Chart Generator │
│ (port 4301) │ ←─────────────── │ (port 4302)  │ ←─────────────── │ (port 4303)     │
└────────────┘   task.result    └─────────────┘   task.result    └────────────────┘
       ↕                              ↕                                  ↕
                         ┌─────────────────────┐
                         │   AIP Registry       │
                         │   (port 4100)        │
                         └─────────────────────┘
```

## Key Takeaway

AIP enables composable agent pipelines where each agent is independently discoverable and replaceable. Swap out any agent for a different implementation without changing the pipeline logic.
