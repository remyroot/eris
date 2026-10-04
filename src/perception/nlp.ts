import { createLogger } from '../core/logger';

const log = createLogger('perception:nlp');

// Lightweight NLP utilities for content processing
// Used by perception modules to extract structured data from text

export interface ExtractedEntity {
  text: string;
  type: 'person' | 'org' | 'topic' | 'url' | 'number';
  confidence: number;
}

export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  return Array.from(text.matchAll(urlRegex)).map(m => m[0]);
}

export function extractNumbers(text: string): number[] {
  const numRegex = /\b\d+(?:\.\d+)?\b/g;
  return Array.from(text.matchAll(numRegex)).map(m => parseFloat(m[0]));
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
}

// Simple keyword extraction using TF scoring
export function extractKeywords(text: string, topN: number = 10): string[] {
  const stopwords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these',
    'those', 'it', 'its', 'not', 'no', 'as', 'if', 'than', 'so', 'very',
    'just', 'about', 'also', 'more', 'other', 'some', 'such', 'only',
  ]);

  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const freq = new Map<string, number>();

  for (const word of words) {
    if (word.length < 3 || stopwords.has(word)) continue;
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

// Estimate reading time in minutes
export function readingTime(text: string, wpm: number = 200): number {
  return Math.ceil(wordCount(text) / wpm);
}

// Strip HTML tags
export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Truncate text at sentence boundary
export function truncateAtSentence(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastPeriod = truncated.lastIndexOf('.');
  if (lastPeriod > maxLen * 0.5) {
    return truncated.slice(0, lastPeriod + 1);
  }
  return truncated + '...';
}
