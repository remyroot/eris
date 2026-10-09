# Memory System

## Components

### SQLite Store

Primary structured storage. Tables:
- `documents` -- scraped content with source, URL, title, timestamps
- `claims` -- extracted factual claims linked to documents
- `tags` -- document tags for categorization
- `metadata` -- key-value store for agent state

Uses WAL mode for concurrent read performance.

### Knowledge Graph

In-memory directed graph for entity relationships.
- Nodes have label, type, and freeform data
- Edges have source, target, relation, and weight
- Label+type deduplication via index
- Serializable to/from JSON for persistence

### Vector Store

Cosine similarity search over embeddings.
- Default 1536 dimensions (OpenAI text-embedding-3-small)
- In-memory storage (swap for pgvector or Pinecone in production)
- Supports add, search, remove operations

### Corpus Manager

Orchestrates ingestion across all three stores:
1. Stores document in SQLite
2. Creates nodes and edges in knowledge graph
3. Generates embedding and adds to vector store

Search falls through from vector similarity to text search.
