import { BasePerception, ScrapeResult } from './base';

export class YouTubePerception extends BasePerception {
  name = 'youtube';

  constructor() {
    super('perception:youtube');
  }

  // YouTube data extraction from page content
  // Used when watching/analyzing video content
  async scrape(videoUrl?: string): Promise<ScrapeResult[]> {
    if (!videoUrl) {
      this.log.warn('no video URL provided');
      return [];
    }

    this.log.info(`extracting data from ${videoUrl}`);
    const html = await this.fetchText(videoUrl);

    const title = this.extractMeta(html, 'og:title') || 'Unknown';
    const description = this.extractMeta(html, 'og:description') || '';
    const duration = this.extractMeta(html, 'duration') || '';

    return [{
      source: 'youtube',
      url: videoUrl,
      title,
      content: description,
      timestamp: Date.now(),
      metadata: {
        duration,
        platform: 'youtube',
      },
    }];
  }

  private extractMeta(html: string, property: string): string | null {
    const match = html.match(
      new RegExp(`<meta[^>]*property="${property}"[^>]*content="([^"]*)"`, 'i')
    ) || html.match(
      new RegExp(`<meta[^>]*name="${property}"[^>]*content="([^"]*)"`, 'i')
    );
    return match ? match[1] : null;
  }
}
