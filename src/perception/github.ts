import { BasePerception, ScrapeResult } from './base';

const GH_API = 'https://api.github.com';

interface GHRepo {
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  topics: string[];
}

interface GHCommit {
  sha: string;
  commit: {
    message: string;
    author: { name: string; date: string };
  };
  html_url: string;
  stats?: { additions: number; deletions: number };
}

export class GitHubPerception extends BasePerception {
  name = 'github';

  private token: string;

  constructor() {
    super('perception:github');
    this.token = process.env.GITHUB_TOKEN || '';
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'eris-agent/1.0',
    };
    if (this.token) h['Authorization'] = `Bearer ${this.token}`;
    return h;
  }

  async scrape(): Promise<ScrapeResult[]> {
    this.log.info('fetching trending repos');
    // GitHub doesn't have an official trending API, use search sorted by stars
    const data = await this.fetchJson<{ items: GHRepo[] }>(
      `${GH_API}/search/repositories?q=stars:>100+pushed:>2026-01-01&sort=stars&order=desc&per_page=20`,
      this.headers()
    );

    return data.items.map(repo => ({
      source: 'github',
      url: repo.html_url,
      title: repo.full_name,
      content: repo.description || '',
      timestamp: new Date(repo.updated_at).getTime(),
      metadata: {
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        topics: repo.topics,
      },
    }));
  }

  async getRepoCommits(owner: string, repo: string, limit: number = 10): Promise<GHCommit[]> {
    return this.fetchJson<GHCommit[]>(
      `${GH_API}/repos/${owner}/${repo}/commits?per_page=${limit}`,
      this.headers()
    );
  }

  async getRepoIssues(owner: string, repo: string): Promise<ScrapeResult[]> {
    const issues = await this.fetchJson<Array<{
      number: number;
      title: string;
      body: string | null;
      html_url: string;
      state: string;
      labels: Array<{ name: string }>;
      created_at: string;
    }>>(
      `${GH_API}/repos/${owner}/${repo}/issues?state=open&per_page=20`,
      this.headers()
    );

    return issues.map(issue => ({
      source: 'github',
      url: issue.html_url,
      title: issue.title,
      content: issue.body || '',
      timestamp: new Date(issue.created_at).getTime(),
      metadata: {
        number: issue.number,
        state: issue.state,
        labels: issue.labels.map(l => l.name),
      },
    }));
  }
}
