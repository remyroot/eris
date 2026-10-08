# Architecture

Eris is structured as a tick-based autonomous agent with five primary subsystems.

## Subsystems

### Core (src/core/)

The execution engine. Runs a configurable tick loop (default: 60s intervals) that
drives location transitions and activity generation. The state manager tracks
current location, tick count, activity feed, and metrics.

### Perception (src/perception/)

Input layer. API clients for Reddit, Hacker News, ArXiv, GitHub, YouTube,
Twitter/X, Wikipedia, and Discord. Browser automation via Playwright for pages
that need JS rendering. Rate limiting built in per-source.

### Memory (src/memory/)

Persistent storage layer. SQLite for structured documents and claims. In-memory
vector store for semantic search (cosine similarity over embeddings). Knowledge
graph for entity relationships. Corpus manager ties these together.

### Reasoning (src/reasoning/)

Decision layer. LLM-based planner selects next actions. Content evaluator scores
incoming information on relevance, novelty, and importance. Embedding service
generates vectors for semantic search. Context window manager prevents token overflow.

### Action (src/action/)

Output layer. Minecraft bot via mineflayer (pathfinding, building, combat).
Lichess board API for chess games. Factorio RCON for factory automation.
Filesystem operations for notes and data export.

### Objectives (src/objectives/)

Goal system. Tracks progress toward self-assigned objectives. Progress advances
based on which locations the agent visits. Objectives are promoted from queued
to active as slots open. Generator can create new objectives via LLM.

## Data Flow

```
Perception -> Reasoning -> Action
     |             |          |
     v             v          v
   Memory    Objectives    Memory
```

## Configuration

- config/locations.ts -- defines all locations with stay durations and activities
- config/models.ts -- LLM model assignments per task (planning, evaluation, etc.)
- .env -- API keys and runtime settings
