import { BasePerception, ScrapeResult } from './base';

interface RedditListing {
  data: {
    children: Array<{
      data: {
        id: string;
        title: string;
        selftext: string;
        subreddit: string;
        score: number;
        num_comments: number;
        url: string;
        created_utc: number;
        author: string;
        permalink: string;
      };
    }>;
    after: string | null;
  };
}

interface RedditComment {
  data: {
    children: Array<{
      data: {
        body?: string;
        author?: string;
        score?: number;
        replies?: RedditComment | string;
      };
    }>;
  };
}

export class RedditPerception extends BasePerception {
  name = 'reddit';

  private clientId: string;
  private clientSecret: string;
  private userAgent: string;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor() {
    super('perception:reddit');
    this.clientId = process.env.REDDIT_CLIENT_ID || '';
    this.clientSecret = process.env.REDDIT_CLIENT_SECRET || '';
    this.userAgent = process.env.REDDIT_USER_AGENT || 'eris-agent/1.0';
  }

  private async authenticate(): Promise<void> {
    if (this.accessToken && Date.now() < this.tokenExpiry) return;

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': this.userAgent,
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      throw new Error(`Reddit auth failed: ${res.status}`);
    }

    const data = await res.json() as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    this.log.debug('authenticated with reddit');
  }

  private async redditGet<T>(path: string): Promise<T> {
    await this.authenticate();
    return this.fetchJson<T>(`https://oauth.reddit.com${path}`, {
      'Authorization': `Bearer ${this.accessToken}`,
      'User-Agent': this.userAgent,
    });
  }

  async scrape(subreddit?: string): Promise<ScrapeResult[]> {
    const sub = subreddit || 'artificial';
    this.log.info(`scraping r/${sub}`);

    const listing = await this.redditGet<RedditListing>(
      `/r/${sub}/hot?limit=25&raw_json=1`
    );

    return listing.data.children.map(child => ({
      source: 'reddit',
      url: `https://reddit.com${child.data.permalink}`,
      title: child.data.title,
      content: child.data.selftext || '',
      timestamp: child.data.created_utc * 1000,
      metadata: {
        subreddit: child.data.subreddit,
        score: child.data.score,
        comments: child.data.num_comments,
        author: child.data.author,
        id: child.data.id,
      },
    }));
  }

  async getComments(subreddit: string, postId: string): Promise<string[]> {
    const data = await this.redditGet<RedditComment[]>(
      `/r/${subreddit}/comments/${postId}?sort=top&limit=100`
    );

    const comments: string[] = [];
    if (data[1]) {
      this.extractComments(data[1], comments, 0);
    }
    return comments;
  }

  private extractComments(listing: RedditComment, out: string[], depth: number): void {
    if (depth > 5) return;
    for (const child of listing.data.children) {
      if (child.data.body) {
        out.push(child.data.body);
      }
      if (child.data.replies && typeof child.data.replies !== 'string') {
        this.extractComments(child.data.replies, out, depth + 1);
      }
    }
  }
}
