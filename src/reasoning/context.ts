import { createLogger } from '../core/logger';

const log = createLogger('reasoning:context');

export interface ContextMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokenCount?: number;
}

export class ContextManager {
  private messages: ContextMessage[] = [];
  private maxTokens: number;
  private currentTokens = 0;

  constructor(maxTokens: number = 120000) {
    this.maxTokens = maxTokens;
  }

  // Rough token estimation: ~4 chars per token for English
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  addMessage(msg: ContextMessage): void {
    const tokens = msg.tokenCount || this.estimateTokens(msg.content);
    msg.tokenCount = tokens;
    this.messages.push(msg);
    this.currentTokens += tokens;
    this.trim();
  }

  setSystem(content: string): void {
    // Replace or add system message at position 0
    const tokens = this.estimateTokens(content);
    if (this.messages.length > 0 && this.messages[0].role === 'system') {
      this.currentTokens -= this.messages[0].tokenCount || 0;
      this.messages[0] = { role: 'system', content, tokenCount: tokens };
    } else {
      this.messages.unshift({ role: 'system', content, tokenCount: tokens });
    }
    this.currentTokens += tokens;
    this.trim();
  }

  getMessages(): ContextMessage[] {
    return [...this.messages];
  }

  getTokenCount(): number {
    return this.currentTokens;
  }

  getRemainingTokens(): number {
    return this.maxTokens - this.currentTokens;
  }

  clear(): void {
    const system = this.messages.find(m => m.role === 'system');
    this.messages = system ? [system] : [];
    this.currentTokens = system?.tokenCount || 0;
  }

  private trim(): void {
    // Keep system message, trim oldest non-system messages
    while (this.currentTokens > this.maxTokens && this.messages.length > 1) {
      const idx = this.messages[0].role === 'system' ? 1 : 0;
      const removed = this.messages.splice(idx, 1)[0];
      this.currentTokens -= removed.tokenCount || 0;
      log.debug(`trimmed message, tokens now ${this.currentTokens}`);
    }
  }
}
