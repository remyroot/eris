import OpenAI from 'openai';
import { createLogger } from '../core/logger';
import { getModel } from '../../config/models';

const log = createLogger('reasoning:summarizer');

export class Summarizer {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI();
  }

  async summarize(text: string, maxLength: number = 200): Promise<string> {
    if (text.length < maxLength) return text;

    const config = getModel('summarization');

    try {
      const response = await this.client.chat.completions.create({
        model: config.model,
        messages: [{
          role: 'user',
          content: `Summarize the following text in ${maxLength} words or fewer. Be concise and factual.\n\n${text.slice(0, 8000)}`,
        }],
        max_tokens: config.maxTokens,
        temperature: config.temperature,
      });

      return response.choices[0]?.message?.content || text.slice(0, maxLength);
    } catch (err) {
      log.warn('summarization failed, truncating', err);
      return text.slice(0, maxLength) + '...';
    }
  }

  async extractKeyPoints(text: string): Promise<string[]> {
    const config = getModel('summarization');

    try {
      const response = await this.client.chat.completions.create({
        model: config.model,
        messages: [{
          role: 'user',
          content: `Extract 3-5 key factual points from this text. Return as JSON array of strings.\n\n${text.slice(0, 8000)}`,
        }],
        max_tokens: 512,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      return result.points || result.key_points || [];
    } catch (err) {
      log.warn('key point extraction failed', err);
      return [];
    }
  }
}
