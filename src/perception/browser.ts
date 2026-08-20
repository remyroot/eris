import { BasePerception, ScrapeResult } from './base';
import { createLogger } from '../core/logger';

const log = createLogger('perception:browser');

// Browser-based content extraction using Playwright
// Falls back to fetch-based extraction if Playwright is not available

export interface BrowserOptions {
  headless?: boolean;
  timeout?: number;
  waitFor?: string;
}

export class BrowserPerception extends BasePerception {
  name = 'browser';

  private browser: unknown = null;
  private options: BrowserOptions;

  constructor(options: BrowserOptions = {}) {
    super('perception:browser');
    this.options = {
      headless: true,
      timeout: 30_000,
      ...options,
    };
  }

  async init(): Promise<void> {
    try {
      const pw = await import('playwright');
      this.browser = await pw.chromium.launch({
        headless: this.options.headless,
      });
      log.info('browser initialized');
    } catch {
      log.warn('playwright not available, using fetch fallback');
    }
  }

  async scrape(url?: string): Promise<ScrapeResult[]> {
    if (!url) return [];

    // Use Playwright if available, otherwise fall back to fetch
    if (this.browser) {
      return this.scrapeWithBrowser(url);
    }
    return this.scrapeWithFetch(url);
  }

  private async scrapeWithBrowser(url: string): Promise<ScrapeResult[]> {
    const browser = this.browser as any;
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(url, { timeout: this.options.timeout, waitUntil: 'domcontentloaded' });

      if (this.options.waitFor) {
        await page.waitForSelector(this.options.waitFor, { timeout: 5000 }).catch(() => {});
      }

      const title = await page.title();
      const content = await page.evaluate(() => {
        // Extract main content text
        const article = document.querySelector('article') || document.querySelector('main') || document.body;
        return article?.textContent?.trim() || '';
      });

      return [{
        source: 'browser',
        url,
        title,
        content: content.slice(0, 10000),
        timestamp: Date.now(),
        metadata: { method: 'playwright' },
      }];
    } finally {
      await context.close();
    }
  }

  private async scrapeWithFetch(url: string): Promise<ScrapeResult[]> {
    log.debug(`fetch fallback: ${url}`);
    const html = await this.fetchText(url);

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    // Strip tags for content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const rawBody = bodyMatch ? bodyMatch[1] : html;
    const content = rawBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    return [{
      source: 'browser',
      url,
      title,
      content: content.slice(0, 10000),
      timestamp: Date.now(),
      metadata: { method: 'fetch' },
    }];
  }

  async close(): Promise<void> {
    if (this.browser) {
      await (this.browser as any).close();
      this.browser = null;
    }
  }
}
