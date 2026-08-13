# eris

Autonomous cognitive agent. Perception, reasoning, action.

## Architecture

```
src/
  core/       -- tick loop, state machine, scheduling
  perception/ -- web scrapers, API clients, content extraction
  reasoning/  -- LLM planning, evaluation, context management
  action/     -- game clients, browser automation, file ops
  memory/     -- knowledge graph, vector store, corpus
  objectives/ -- goal tracking, self-assigned tasks
config/       -- locations, model settings, environment
```

## Setup

```bash
cp .env.example .env  # add API keys
npm install
npm run build
npm start
```

## Development

```bash
npm run dev   # runs with tsx, watches for changes
```

## License

MIT
