import { BasePerception, ScrapeResult } from './base';

const WIKI_API = 'https://en.wikipedia.org/w/api.php';

interface WikiPage {
  pageid: number;
  title: string;
  extract: string;
  fullurl: string;
  categories?: Array<{ title: string }>;
  links?: Array<{ title: string }>;
}

export class WikipediaPerception extends BasePerception {
  name = 'wikipedia';

  constructor() {
    super('perception:wikipedia');
  }

  async scrape(title?: string): Promise<ScrapeResult[]> {
    if (!title) {
      return this.getRandomArticles(5);
    }

    this.log.info(`fetching article: ${title}`);

    const data = await this.fetchJson<{
      query: { pages: Record<string, WikiPage> };
    }>(
      `${WIKI_API}?action=query&titles=${encodeURIComponent(title)}&prop=extracts|info|categories|links&exlimit=1&explaintext=1&inprop=url&cllimit=20&pllimit=50&format=json`
    );

    const pages = Object.values(data.query.pages);
    return pages.map(page => ({
      source: 'wikipedia',
      url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
      title: page.title,
      content: page.extract || '',
      timestamp: Date.now(),
      metadata: {
        pageId: page.pageid,
        categories: (page.categories || []).map(c => c.title),
        links: (page.links || []).map(l => l.title),
        wordCount: (page.extract || '').split(/\s+/).length,
      },
    }));
  }

  async getRandomArticles(count: number): Promise<ScrapeResult[]> {
    const data = await this.fetchJson<{
      query: { random: Array<{ id: number; title: string }> };
    }>(
      `${WIKI_API}?action=query&list=random&rnnamespace=0&rnlimit=${count}&format=json`
    );

    const titles = data.query.random.map(r => r.title);
    const results: ScrapeResult[] = [];
    for (const t of titles) {
      const r = await this.scrape(t);
      results.push(...r);
    }
    return results;
  }

  async search(query: string, limit: number = 10): Promise<ScrapeResult[]> {
    const data = await this.fetchJson<{
      query: { search: Array<{ pageid: number; title: string; snippet: string; wordcount: number }> };
    }>(
      `${WIKI_API}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json`
    );

    return data.query.search.map(r => ({
      source: 'wikipedia',
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title)}`,
      title: r.title,
      content: r.snippet.replace(/<[^>]+>/g, ''),
      timestamp: Date.now(),
      metadata: {
        pageId: r.pageid,
        wordCount: r.wordcount,
      },
    }));
  }
}
