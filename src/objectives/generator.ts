import OpenAI from 'openai';
import { Objective } from './types';
import { ObjectiveTracker } from './tracker';
import { createLogger } from '../core/logger';
import { getModel } from '../../config/models';

const log = createLogger('objectives:generator');

// Generates new objectives based on recent activity and completed goals
// Uses LLM to suggest relevant, achievable goals

export class ObjectiveGenerator {
  private client: OpenAI;
  private tracker: ObjectiveTracker;

  constructor(tracker: ObjectiveTracker) {
    this.client = new OpenAI();
    this.tracker = tracker;
  }

  async generate(context: {
    recentTopics: string[];
    completedObjectives: string[];
    currentObjectives: string[];
  }): Promise<Omit<Objective, 'id' | 'createdAt' | 'completedAt'>[]> {
    const config = getModel('planning');

    const prompt = `You are the goal-setting module of an autonomous research agent.

The agent browses the web, reads papers, plays games, and builds knowledge.

Recently explored topics: ${context.recentTopics.join(', ')}
Completed goals: ${context.completedObjectives.join(', ')}
Current goals: ${context.currentObjectives.join(', ')}

Suggest 1-2 new objectives the agent could pursue. Each objective should be:
- Specific and measurable
- Achievable through browsing, reading, or playing games
- Different from current/completed goals

Respond in JSON: array of objects with fields:
- name: short objective name
- description: 1-2 sentence description
- category: Research | Games | Infrastructure
- target: numeric target (papers to read, rating to reach, etc)
- triggers: array of location names that advance this (e.g. ["ArXiv", "Google Scholar"])`;

    try {
      const response = await this.client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.8,
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0]?.message?.content || '{}';
      const result = JSON.parse(text);
      const suggestions = result.objectives || result.goals || [];

      return suggestions.map((s: any) => ({
        name: s.name,
        description: s.description,
        category: s.category || 'Research',
        status: 'queued' as const,
        progress: 0,
        target: s.target || 10,
        triggers: s.triggers || [],
      }));
    } catch (err) {
      log.error('objective generation failed', err);
      return [];
    }
  }

  // Generate objectives without LLM (fallback)
  generateDefaults(): Omit<Objective, 'id' | 'createdAt' | 'completedAt'>[] {
    return [
      {
        name: 'Read and summarize 50 CS papers',
        description: 'Scan ArXiv and Google Scholar for relevant submissions.',
        category: 'Research',
        status: 'active',
        progress: 0,
        target: 50,
        triggers: ['ArXiv', 'Google Scholar'],
      },
      {
        name: 'Reach Lichess rapid rating 2200',
        description: 'Focusing on opening repertoire and endgame technique.',
        category: 'Games',
        status: 'active',
        progress: 1980,
        target: 2200,
        triggers: ['Lichess'],
      },
      {
        name: 'Index top 500 HN discussions',
        description: 'Extracting key arguments and technical claims.',
        category: 'Research',
        status: 'active',
        progress: 0,
        target: 500,
        triggers: ['Hacker News'],
      },
      {
        name: 'Build Minecraft automated farm',
        description: 'Planning phase. Need to find a good flat area near water.',
        category: 'Games',
        status: 'active',
        progress: 0,
        target: 100,
        triggers: ['Minecraft'],
      },
      {
        name: 'Deploy personal knowledge graph',
        description: 'Architecture planned. Need to build indexer and search layer.',
        category: 'Infrastructure',
        status: 'queued',
        progress: 0,
        target: 100,
        triggers: ['Desktop', 'Terminal'],
      },
    ];
  }
}
