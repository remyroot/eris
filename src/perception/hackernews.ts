import { BasePerception, ScrapeResult } from './base';

const HN_API = 'https://hacker-news.firebaseio.com/v0';
const HN_ALGOLIA = 'https://hn.algolia.com/api/v1';

interface HNItem {
  id: number;
  type: string;
  title?: string;
  text?: string;
  url?: string;
  score?: number;
  by?: string;
  time?: number;
  descendants?: number;
  kids?: number[];
}

interface AlgoliaResult {
  hits: Array<{
    objectID: string;
    title: string;
    url: string | null;
    points: number;
    num_comments: number;
    author: string;
    created_at_i: number;
  }>;
  nbHits: number;
}

export class HackerNewsPerception extends BasePerception {
  name = 'hackernews';

  constructor() {
    super('perception:hn');
  }

  async scrape(): Promise<ScrapeResult[]> {
    this.log.info('fetching top stories');
    const ids = await this.fetchJson<number[]>(`${HN_API}/topstories.json`);
    const top = ids.slice(0, 30);

    const items = await Promise.all(
      top.map(id => this.fetchItem(id))
    );

    return items
      .filter((item): item is HNItem => item !== null && item.type === 'story')
      .map(item => ({
        source: 'hackernews',
        url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
        title: item.title || '',
        content: item.text || '',
        timestamp: (item.time || 0) * 1000,
        metadata: {
          id: item.id,
          score: item.score || 0,
          comments: item.descendants || 0,
          author: item.by || '',
        },
      }));
  }

  async search(query: string, limit: number = 20): Promise<ScrapeResult[]> {
    this.log.info(`searching: ${query}`);
    const data = await this.fetchJson<AlgoliaResult>(
      `${HN_ALGOLIA}/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${limit}`
    );

    return data.hits.map(hit => ({
      source: 'hackernews',
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      title: hit.title,
      content: '',
      timestamp: hit.created_at_i * 1000,
      metadata: {
        id: hit.objectID,
        score: hit.points,
        comments: hit.num_comments,
        author: hit.author,
        totalHits: data.nbHits,
      },
    }));
  }

  async fetchItem(id: number): Promise<HNItem | null> {
    try {
      return await this.fetchJson<HNItem>(`${HN_API}/item/${id}.json`);
    } catch {
      this.log.warn(`failed to fetch item ${id}`);
      return null;
    }
  }

  async getCommentTree(itemId: number, maxDepth: number = 3): Promise<string[]> {
    const comments: string[] = [];
    await this.walkComments(itemId, comments, 0, maxDepth);
    return comments;
  }

  private async walkComments(
    itemId: number,
    out: string[],
    depth: number,
    maxDepth: number,
  ): Promise<void> {
    if (depth >= maxDepth) return;
    const item = await this.fetchItem(itemId);
    if (!item) return;

    if (item.text) {
      out.push(item.text);
    }

    if (item.kids) {
      for (const kid of item.kids.slice(0, 10)) {
        await this.walkComments(kid, out, depth + 1, maxDepth);
      }
    }
  }
}
