export interface ModelConfig {
  provider: string;
  model: string;
  maxTokens: number;
  temperature: number;
  contextWindow: number;
}

export const MODELS: Record<string, ModelConfig> = {
  planning: {
    provider: 'openai',
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.7,
    contextWindow: 128000,
  },
  evaluation: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 2048,
    temperature: 0.3,
    contextWindow: 128000,
  },
  embedding: {
    provider: 'openai',
    model: 'text-embedding-3-small',
    maxTokens: 0,
    temperature: 0,
    contextWindow: 8191,
  },
  summarization: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 1024,
    temperature: 0.2,
    contextWindow: 128000,
  },
};

export function getModel(task: string): ModelConfig {
  const config = MODELS[task];
  if (!config) throw new Error(`unknown model task: ${task}`);
  return config;
}
