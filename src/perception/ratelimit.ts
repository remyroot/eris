import { createLogger } from '../core/logger';

const log = createLogger('ratelimit');

interface BucketConfig {
  maxTokens: number;
  refillRate: number;
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
    log.debug(`registered rate limit for ${name}: ${config.maxTokens} tokens, ${config.refillRate}/s`);
  }

  async acquire(name: string): Promise<boolean> {
    const bucket = this.buckets.get(name);
    if (!bucket) return true;

    this.refill(bucket);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    const waitMs = Math.ceil((1 / bucket.config.refillRate) * 1000);
    log.debug(`rate limited: ${name}, waiting ${waitMs}ms`);
    await new Promise(resolve => setTimeout(resolve, waitMs));

    this.refill(bucket);
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    log.warn(`rate limit exceeded: ${name}`);
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

export const rateLimiter = new RateLimiter();

// Default limits per source
rateLimiter.register('reddit', { maxTokens: 60, refillRate: 1 });
rateLimiter.register('hackernews', { maxTokens: 30, refillRate: 0.5 });
rateLimiter.register('github', { maxTokens: 30, refillRate: 0.5 });
rateLimiter.register('twitter', { maxTokens: 15, refillRate: 0.25 });
rateLimiter.register('arxiv', { maxTokens: 10, refillRate: 0.2 });
rateLimiter.register('wikipedia', { maxTokens: 50, refillRate: 1 });
rateLimiter.register('scholar', { maxTokens: 5, refillRate: 0.1 });
