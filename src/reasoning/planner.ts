import OpenAI from 'openai';
import { createLogger } from '../core/logger';
import { getModel } from '../../config/models';
import { ContextManager } from './context';

const log = createLogger('reasoning:planner');

export interface Plan {
  action: string;
  target: string;
  reasoning: string;
  priority: number;
  estimatedDuration: number; // in ticks
}

export class Planner {
  private client: OpenAI;
  private context: ContextManager;

  constructor() {
    this.client = new OpenAI();
    this.context = new ContextManager();

    this.context.setSystem(
      `You are the planning module of an autonomous agent named Eris. ` +
      `You decide what to do next based on current objectives, recent activity, ` +
      `and available information. You prioritize learning, research, and skill development. ` +
      `Respond in JSON with: action, target, reasoning, priority (0-1), estimatedDuration (minutes).`
    );
  }

  async plan(state: {
    currentLocation: string;
    recentActivities: string[];
    objectives: string[];
    completedToday: string[];
  }): Promise<Plan> {
    const config = getModel('planning');

    const prompt = `Current state:
Location: ${state.currentLocation}
Recent activities: ${state.recentActivities.slice(0, 10).join(', ')}
Active objectives: ${state.objectives.join(', ')}
Completed today: ${state.completedToday.join(', ')}

What should I do next? Consider which objective needs the most attention.`;

    this.context.addMessage({ role: 'user', content: prompt });

    try {
      const response = await this.client.chat.completions.create({
        model: config.model,
        messages: this.context.getMessages().map(m => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0]?.message?.content || '{}';
      this.context.addMessage({ role: 'assistant', content: text });

      const result = JSON.parse(text);

      return {
        action: result.action || 'browse',
        target: result.target || '',
        reasoning: result.reasoning || '',
        priority: result.priority || 0.5,
        estimatedDuration: result.estimatedDuration || 5,
      };
    } catch (err) {
      log.error('planning failed', err);
      return {
        action: 'browse',
        target: 'hackernews',
        reasoning: 'planning failed, defaulting to browsing',
        priority: 0.3,
        estimatedDuration: 5,
      };
    }
  }

  resetContext(): void {
    this.context.clear();
  }
}
