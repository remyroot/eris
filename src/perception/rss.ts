import RssParser from 'rss-parser';
import { BasePerception, ScrapeResult } from './base';

export class RssPerception extends BasePerception {
  name = 'rss';
  private parser: RssParser;

  constructor() {
    super('perception:rss');
    this.parser = new RssParser();
  }

  async scrape(feedUrl?: string): Promise<ScrapeResult[]> {
    if (!feedUrl) { this.log.warn('no feed URL'); return []; }
    this.log.info(`parsing feed: ${feedUrl}`);
    try {
      const feed = await this.parser.parseURL(feedUrl);
      return (feed.items || []).map(item => ({
        source: 'rss',
        url: item.link || '',
        title: item.title || '',
        content: item.contentSnippet || item.content || '',
        timestamp: item.isoDate ? new Date(item.isoDate).getTime() : Date.now(),
        metadata: { feedTitle: feed.title || '', author: item.creator || '', categories: item.categories || [] },
      }));
    } catch (err) { this.log.error('feed parse failed', err); return []; }
  }
}
