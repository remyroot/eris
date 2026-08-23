import { BasePerception, ScrapeResult } from './base';

const X_API = 'https://api.x.com/2';

interface TweetData {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
}

interface SearchResponse {
  data: TweetData[];
  meta: { result_count: number; next_token?: string };
}

export class TwitterPerception extends BasePerception {
  name = 'twitter';

  private bearerToken: string;

  constructor() {
    super('perception:twitter');
    this.bearerToken = process.env.TWITTER_BEARER_TOKEN || '';
  }

  private headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.bearerToken}`,
      'Content-Type': 'application/json',
    };
  }

  async scrape(query?: string): Promise<ScrapeResult[]> {
    const q = query || 'AI research';
    this.log.info(`searching tweets: ${q}`);

    if (!this.bearerToken) {
      this.log.warn('twitter bearer token not configured');
      return [];
    }

    const data = await this.fetchJson<SearchResponse>(
      `${X_API}/tweets/search/recent?query=${encodeURIComponent(q)}&max_results=25&tweet.fields=created_at,public_metrics,author_id`,
      this.headers()
    );

    if (!data.data) return [];

    return data.data.map(tweet => ({
      source: 'twitter',
      url: `https://x.com/i/status/${tweet.id}`,
      title: '',
      content: tweet.text,
      timestamp: new Date(tweet.created_at).getTime(),
      metadata: {
        id: tweet.id,
        authorId: tweet.author_id,
        retweets: tweet.public_metrics.retweet_count,
        likes: tweet.public_metrics.like_count,
        replies: tweet.public_metrics.reply_count,
        quotes: tweet.public_metrics.quote_count,
      },
    }));
  }
}
