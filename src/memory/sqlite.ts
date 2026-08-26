import Database from 'better-sqlite3';
import path from 'path';
import { createLogger } from '../core/logger';

const log = createLogger('memory:sqlite');

export class SQLiteStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const p = dbPath || path.join(process.env.DATA_DIR || './data', 'eris.db');
    this.db = new Database(p);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.init();
    log.info(`opened database at ${p}`);
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        url TEXT,
        title TEXT,
        content TEXT,
        summary TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_documents_source ON documents(source);
      CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at);

      CREATE TABLE IF NOT EXISTS claims (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        claim TEXT NOT NULL,
        confidence REAL DEFAULT 0.5,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id)
      );
      CREATE INDEX IF NOT EXISTS idx_claims_doc ON claims(document_id);

      CREATE TABLE IF NOT EXISTS tags (
        document_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (document_id, tag),
        FOREIGN KEY (document_id) REFERENCES documents(id)
      );
      CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag);

      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  insertDocument(doc: {
    id: string;
    source: string;
    url?: string;
    title: string;
    content: string;
    summary?: string;
  }): void {
    const now = Date.now();
    this.db.prepare(`
      INSERT OR REPLACE INTO documents (id, source, url, title, content, summary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(doc.id, doc.source, doc.url || null, doc.title, doc.content, doc.summary || null, now, now);
  }

  getDocument(id: string): any {
    return this.db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
  }

  searchDocuments(query: string, limit: number = 20): any[] {
    return this.db.prepare(
      `SELECT * FROM documents WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC LIMIT ?`
    ).all(`%${query}%`, `%${query}%`, limit);
  }

  countDocuments(): number {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM documents').get() as any;
    return row.count;
  }

  insertClaim(claim: { id: string; documentId: string; claim: string; confidence: number }): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO claims (id, document_id, claim, confidence, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(claim.id, claim.documentId, claim.claim, claim.confidence, Date.now());
  }

  addTag(documentId: string, tag: string): void {
    this.db.prepare(
      'INSERT OR IGNORE INTO tags (document_id, tag) VALUES (?, ?)'
    ).run(documentId, tag);
  }

  getByTag(tag: string, limit: number = 50): any[] {
    return this.db.prepare(`
      SELECT d.* FROM documents d
      JOIN tags t ON d.id = t.document_id
      WHERE t.tag = ?
      ORDER BY d.created_at DESC
      LIMIT ?
    `).all(tag, limit);
  }

  setMeta(key: string, value: string): void {
    this.db.prepare(
      'INSERT OR REPLACE INTO metadata (key, value, updated_at) VALUES (?, ?, ?)'
    ).run(key, value, Date.now());
  }

  getMeta(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM metadata WHERE key = ?').get(key) as any;
    return row ? row.value : null;
  }

  close(): void {
    this.db.close();
    log.info('database closed');
  }
}
