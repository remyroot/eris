import { describe, it, expect } from 'vitest';
import { extractUrls, extractKeywords, wordCount, sentenceCount, stripHtml, truncateAtSentence, readingTime } from '../src/perception/nlp';

describe('NLP utils', () => {
  it('extracts URLs', () => {
    const text = 'Check https://example.com and http://test.org/path for details';
    const urls = extractUrls(text);
    expect(urls).toContain('https://example.com');
    expect(urls).toContain('http://test.org/path');
  });

  it('counts words', () => {
    expect(wordCount('hello world')).toBe(2);
    expect(wordCount('  spaced  out  ')).toBe(2);
    expect(wordCount('')).toBe(0);
  });

  it('counts sentences', () => {
    expect(sentenceCount('Hello. World.')).toBe(2);
    expect(sentenceCount('One sentence')).toBe(1);
    expect(sentenceCount('What? Really! Yes.')).toBe(3);
  });

  it('extracts keywords', () => {
    const text = 'machine learning is a subset of artificial intelligence. machine learning models learn from data.';
    const keywords = extractKeywords(text, 3);
    expect(keywords).toContain('machine');
    expect(keywords).toContain('learning');
  });

  it('strips HTML', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });

  it('truncates at sentence boundary', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    const truncated = truncateAtSentence(text, 25);
    expect(truncated).toBe('First sentence.');
  });

  it('estimates reading time', () => {
    const text = Array(400).fill('word').join(' ');
    expect(readingTime(text)).toBe(2);
  });
});
