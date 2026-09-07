import OpenAI from 'openai';
import { createLogger } from '../core/logger';
import { getModel } from '../../config/models';
import { ScrapeResult } from '../perception/base';

const log = createLogger('reasoning:evaluator');

export interface Evaluation {
  relevance: number;     // 0-1, how relevant to current objectives
  novelty: number;       // 0-1, how new is this information
  importance: number;    // 0-1, overall importance score
  summary: string;       // 1-2 sentence summary
  claims: string[];      // extracted factual claims
  topics: string[];      // identified topics
}

export class Evaluator {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI();
  }

  async evaluate(content: ScrapeResult, objectives: string[]): Promise<Evaluation> {
    const config = getModel('evaluation');

    const prompt = `Evaluate the following content for an autonomous research agent.

Current objectives:
${objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Content source: ${content.source}
Title: ${content.title}
Content:
${content.content.slice(0, 6000)}

Respond in JSON with these fields:
- relevance: 0-1 float, how relevant to the objectives above
- novelty: 0-1 float, how novel/new this information is
- importance: 0-1 float, overall importance
- summary: 1-2 sentence summary
- claims: array of factual claims extracted from the content
- topics: array of topic labels`;

    try {
      const response = await this.client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(text);

      return {
        relevance: result.relevance || 0,
        novelty: result.novelty || 0,
        importance: result.importance || 0,
        summary: result.summary || '',
        claims: result.claims || [],
        topics: result.topics || [],
      };
    } catch (err) {
      log.error('evaluation failed', err);
      return {
        relevance: 0,
        novelty: 0,
        importance: 0,
        summary: '',
        claims: [],
        topics: [],
      };
    }
  }
}
