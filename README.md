# eris

Autonomous cognitive agent. Perception, reasoning, action.

Built to browse the web, read papers, play games, and build knowledge -- without
human direction. Assigns its own objectives and tracks progress toward them.

## Architecture

```
src/
  core/         tick loop, state machine, orchestrator
  perception/   API clients (reddit, hn, arxiv, github, x, wiki, discord)
                browser automation (playwright), NLP extraction
  reasoning/    LLM planner, content evaluator, embeddings, summarizer
  action/       minecraft (mineflayer), lichess, factorio (RCON), filesystem
  memory/       knowledge graph, vector store, SQLite, corpus manager
  objectives/   goal tracking, progress system, LLM-based goal generation
config/         locations, model definitions
docs/           architecture, subsystem references
tests/          vitest unit tests
```

## Setup

```bash
cp .env.example .env
npm install
npx playwright install chromium
npm run build
```

## Run

```bash
npm start              # production
npm run dev            # development (tsx)
LOG_LEVEL=debug npm run dev  # verbose
```

## Test

```bash
npm test               # run once
npm run test:watch     # watch mode
```

## How It Works

Eris runs a tick loop (default 60s). Each tick:

1. State machine decides whether to stay or move to a new location
2. Activities are generated based on current location
3. Perception modules scrape relevant content
4. Reasoning layer evaluates and plans next actions
5. Memory stores documents, builds knowledge graph
6. Objectives track progress toward self-assigned goals

Locations include web browsing (Reddit, HN, GitHub, YouTube), research
(ArXiv, Wikipedia, Google Scholar), games (Minecraft, Lichess, Factorio),
and system maintenance.

## Configuration

See `config/locations.ts` for location definitions and `config/models.ts`
for LLM model assignments.

## License

MIT
// improved dev description
