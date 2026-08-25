import { createLogger } from '../core/logger';

const log = createLogger('ratelimit');

interface BucketConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
}

interface Bucket {
  tokens: number;
  lastRefill: number;
  config: BucketConfig;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  register(name: string, config: BucketConfig): void {
    this.buckets.set(name, {
      tokens: config.maxTokens,
      lastRefill: Date.now(),
      config,
    });
  }

  async acquire(name: string): Promise<boolean> {
    const bucket = this.buckets.get(name);
    if (!bucket) return true; // no limit registered

    this.refill(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    // Calculate wait time for next token
    const waitMs = (1 / bucket.config.refillRate) * 1000;
    log.debug(`rate limited on ${name}, waiting ${waitMs}ms`);
    await new Promise(resolve => setTimeout(resolve, waitMs));

    this.refill(bucket);
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  remaining(name: string): number {
    const bucket = this.buckets.get(name);
    if (!bucket) return Infinity;
    this.refill(bucket);
    return Math.floor(bucket.tokens);
  }

  private refill(bucket: Bucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      bucket.config.maxTokens,
      bucket.tokens + elapsed * bucket.config.refillRate
    );
    bucket.lastRefill = now;
  }
}

// Shared instance
export const rateLimiter = new RateLimiter();

// Register default limits
rateLimiter.register('reddit', { maxTokens: 60, refillRate: 1 });
rateLimiter.register('hackernews', { maxTokens: 30, refillRate: 0.5 });
rateLimiter.register('github', { maxTokens: 30, refillRate: 0.5 });
rateLimiter.register('twitter', { maxTokens: 15, refillRate: 0.25 });
rateLimiter.register('arxiv', { maxTokens: 10, refillRate: 0.2 });
rateLimiter.register('wikipedia', { maxTokens: 50, refillRate: 1 });
