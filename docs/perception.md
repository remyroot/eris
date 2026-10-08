# Perception Layer

## Sources

| Source | API | Auth | Rate Limit |
|--------|-----|------|-----------|
| Reddit | OAuth REST | client_credentials | 60 req/min |
| Hacker News | Firebase REST | none | 30 req/min |
| ArXiv | Atom XML | none | 10 req/min |
| GitHub | REST v3 | optional PAT | 30 req/min |
| YouTube | page scrape | none | - |
| Twitter/X | API v2 | bearer token | 15 req/min |
| Wikipedia | MediaWiki API | none | 50 req/min |
| Discord | Bot API v10 | bot token | - |

## Usage

All perception modules implement the `PerceptionModule` interface:

```typescript
interface PerceptionModule {
  name: string;
  scrape(query?: string): Promise<ScrapeResult[]>;
}
```

Results are uniform `ScrapeResult` objects with source, URL, title, content,
timestamp, and freeform metadata.

## Rate Limiting

The shared `RateLimiter` uses token bucket algorithm. Each source has a
registered bucket with max tokens and refill rate. Call `rateLimiter.acquire(source)`
before making requests.

## NLP Utilities

`src/perception/nlp.ts` provides:
- URL extraction
- Keyword extraction (TF scoring)
- Word/sentence counting
- HTML stripping
- Sentence-boundary truncation
- Reading time estimation
