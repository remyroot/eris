import { createLogger } from '../core/logger';

const log = createLogger('memory:vectors');

export interface VectorEntry {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
}

// Simple in-memory vector store with cosine similarity search
// For production, swap this out for a proper vector DB

export class VectorStore {
  private entries: VectorEntry[] = [];
  private dimensions: number;

  constructor(dimensions: number = 1536) {
    this.dimensions = dimensions;
  }

  add(id: string, vector: number[], metadata: Record<string, unknown> = {}): void {
    if (vector.length !== this.dimensions) {
      throw new Error(`expected ${this.dimensions} dimensions, got ${vector.length}`);
    }

    // Replace if exists
    const idx = this.entries.findIndex(e => e.id === id);
    if (idx !== -1) {
      this.entries[idx] = { id, vector, metadata };
    } else {
      this.entries.push({ id, vector, metadata });
    }
  }

  search(query: number[], topK: number = 10): Array<{ entry: VectorEntry; score: number }> {
    if (query.length !== this.dimensions) {
      throw new Error(`expected ${this.dimensions} dimensions, got ${query.length}`);
    }

    const scored = this.entries.map(entry => ({
      entry,
      score: this.cosineSimilarity(query, entry.vector),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  remove(id: string): boolean {
    const idx = this.entries.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.entries.splice(idx, 1);
    return true;
  }

  count(): number {
    return this.entries.length;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) return 0;
    return dotProduct / denom;
  }

  serialize(): VectorEntry[] {
    return this.entries;
  }

  load(entries: VectorEntry[]): void {
    this.entries = entries;
    if (entries.length > 0) {
      this.dimensions = entries[0].vector.length;
    }
    log.info(`loaded ${entries.length} vectors (${this.dimensions}d)`);
  }
}
