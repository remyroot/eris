import { BasePerception, ScrapeResult } from './base';

const SCHOLAR_URL = 'https://scholar.google.com';

export class ScholarPerception extends BasePerception {
  name = 'scholar';

  constructor() {
    super('perception:scholar');
  }

  async scrape(query?: string): Promise<ScrapeResult[]> {
    if (!query) {
      this.log.warn('no search query provided');
      return [];
    }

    this.log.info(`searching scholar: ${query}`);

    // Google Scholar blocks automated access aggressively
    // Use Playwright browser if available, otherwise fall back to SerpAPI
    const serpApiKey = process.env.SERP_API_KEY;
    if (serpApiKey) {
      return this.searchViaSerpApi(query, serpApiKey);
    }

    this.log.warn('SERP_API_KEY not set, scholar search unavailable');
    return [];
  }

  private async searchViaSerpApi(query: string, apiKey: string): Promise<ScrapeResult[]> {
    const data = await this.fetchJson<any>(
      `https://serpapi.com/search.json?engine=google_scholar&q=${encodeURIComponent(query)}&api_key=${apiKey}`
    );

    const results = data.organic_results || [];
    return results.map((r: any) => ({
      source: 'scholar',
      url: r.link || '',
      title: r.title || '',
      content: r.snippet || '',
      timestamp: Date.now(),
      metadata: {
        citations: r.inline_links?.cited_by?.total || 0,
        authors: r.publication_info?.summary || '',
        year: r.publication_info?.summary?.match(/\d{4}/)?.[0] || null,
      },
    }));
  }
}
