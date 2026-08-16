import { createLogger } from '../core/logger';

export interface ScrapeResult {
  source: string;
  url: string;
  title: string;
  content: string;
  timestamp: number;
  metadata: Record<string, unknown>;
}

export interface PerceptionModule {
  name: string;
  scrape(query?: string): Promise<ScrapeResult[]>;
}

export abstract class BasePerception implements PerceptionModule {
  abstract name: string;
  protected log;

  constructor(logModule: string) {
    this.log = createLogger(logModule);
  }

  abstract scrape(query?: string): Promise<ScrapeResult[]>;

  protected async fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        ...headers,
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} -- ${url}`);
    }

    return res.json() as Promise<T>;
  }

  protected async fetchText(url: string, headers?: Record<string, string>): Promise<string> {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} -- ${url}`);
    }
    return res.text();
  }
}
