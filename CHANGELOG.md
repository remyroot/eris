# Changelog

## 1.0.0 (2026-10-15)

First stable release.

### Core
- Tick-based execution loop with configurable interval
- State machine for location transitions
- Activity generation from sequential action lists
- Task scheduler with priority queue

### Perception
- Reddit (OAuth), Hacker News (Firebase), ArXiv (Atom)
- GitHub (REST v3), YouTube (page scrape), Twitter/X (API v2)
- Wikipedia (MediaWiki), Discord (Bot API), Google Scholar (SerpAPI)
- Playwright browser automation with fetch fallback
- Rate limiting per source (token bucket)
- NLP utilities (keyword extraction, URL extraction, etc.)

### Reasoning
- LLM-based planning (GPT-4o)
- Content evaluation (relevance, novelty, importance scoring)
- Embedding service with caching
- Text summarization and key point extraction
- Context window management

### Action
- Minecraft bot via mineflayer (movement, building, combat)
- Lichess board API (seek, move, analyze)
- Factorio RCON client
- Chess move evaluation (chess.js)
- Filesystem operations (notes, PDF download, export)

### Memory
- SQLite storage (documents, claims, tags, metadata)
- In-memory knowledge graph with deduplication
- Vector store with cosine similarity search
- Corpus manager (unified ingestion pipeline)

### Objectives
- Self-assigned goal tracking with progress
- Location-triggered progress advancement
- Automatic promotion from queued to active
- LLM-based objective generation

### Infrastructure
- Docker support
- Vitest test suite
- Architecture documentation
