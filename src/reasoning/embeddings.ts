import OpenAI from 'openai';
import { createLogger } from '../core/logger';
import { getModel } from '../../config/models';

const log = createLogger('reasoning:embeddings');

export class EmbeddingService {
  private client: OpenAI;
  private cache = new Map<string, number[]>();
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    this.client = new OpenAI();
  }

  async embed(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = text.slice(0, 200); // Use prefix as cache key
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.cacheHits++;
      return cached;
    }

    this.cacheMisses++;
    const config = getModel('embedding');

    try {
      const response = await this.client.embeddings.create({
        model: config.model,
        input: text.slice(0, 8000),
      });

      const vector = response.data[0].embedding;

      // Cache it
      this.cache.set(cacheKey, vector);

      // Evict old entries if cache gets too large
      if (this.cache.size > 10000) {
        const keys = Array.from(this.cache.keys());
        for (let i = 0; i < 1000; i++) {
          this.cache.delete(keys[i]);
        }
      }

      return vector;
    } catch (err) {
      log.error('embedding failed', err);
      throw err;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const config = getModel('embedding');

    const response = await this.client.embeddings.create({
      model: config.model,
      input: texts.map(t => t.slice(0, 8000)),
    });

    return response.data.map(d => d.embedding);
  }

  cacheStats(): { hits: number; misses: number; size: number } {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      size: this.cache.size,
    };
  }
}
// v2: batch embedding support
