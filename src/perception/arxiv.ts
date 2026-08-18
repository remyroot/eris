import { BasePerception, ScrapeResult } from './base';

const ARXIV_API = 'https://export.arxiv.org/api/query';

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  updated: string;
  categories: string[];
  pdfUrl: string;
}

export class ArxivPerception extends BasePerception {
  name = 'arxiv';

  constructor() {
    super('perception:arxiv');
  }

  async scrape(category?: string): Promise<ScrapeResult[]> {
    const cat = category || 'cs.AI';
    this.log.info(`fetching recent papers from ${cat}`);

    const xml = await this.fetchText(
      `${ARXIV_API}?search_query=cat:${cat}&sortBy=submittedDate&sortOrder=descending&max_results=20`
    );

    const entries = this.parseAtom(xml);

    return entries.map(entry => ({
      source: 'arxiv',
      url: entry.pdfUrl,
      title: entry.title,
      content: entry.summary,
      timestamp: new Date(entry.published).getTime(),
      metadata: {
        id: entry.id,
        authors: entry.authors,
        categories: entry.categories,
        updated: entry.updated,
      },
    }));
  }

  async searchByKeyword(keyword: string, maxResults: number = 10): Promise<ScrapeResult[]> {
    this.log.info(`searching: ${keyword}`);

    const xml = await this.fetchText(
      `${ARXIV_API}?search_query=all:${encodeURIComponent(keyword)}&sortBy=relevance&max_results=${maxResults}`
    );

    const entries = this.parseAtom(xml);

    return entries.map(entry => ({
      source: 'arxiv',
      url: entry.pdfUrl,
      title: entry.title,
      content: entry.summary,
      timestamp: new Date(entry.published).getTime(),
      metadata: {
        id: entry.id,
        authors: entry.authors,
        categories: entry.categories,
      },
    }));
  }

  private parseAtom(xml: string): ArxivEntry[] {
    const entries: ArxivEntry[] = [];
    const entryBlocks = xml.split('<entry>').slice(1);

    for (const block of entryBlocks) {
      const id = this.extractTag(block, 'id') || '';
      const title = this.extractTag(block, 'title')?.replace(/\s+/g, ' ').trim() || '';
      const summary = this.extractTag(block, 'summary')?.replace(/\s+/g, ' ').trim() || '';
      const published = this.extractTag(block, 'published') || '';
      const updated = this.extractTag(block, 'updated') || '';

      // Extract authors
      const authors: string[] = [];
      const authorMatches = block.matchAll(/<author>\s*<name>([^<]+)<\/name>/g);
      for (const m of authorMatches) {
        authors.push(m[1].trim());
      }

      // Extract categories
      const categories: string[] = [];
      const catMatches = block.matchAll(/category[^>]*term="([^"]+)"/g);
      for (const m of catMatches) {
        categories.push(m[1]);
      }

      // PDF link
      const pdfMatch = block.match(/href="([^"]*)"[^>]*title="pdf"/);
      const pdfUrl = pdfMatch ? pdfMatch[1] : id.replace('abs', 'pdf');

      entries.push({ id, title, summary, authors, published, updated, categories, pdfUrl });
    }

    return entries;
  }

  private extractTag(xml: string, tag: string): string | null {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
    return match ? match[1] : null;
  }
}
