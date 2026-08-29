import { createLogger } from '../core/logger';
import { SQLiteStore } from './sqlite';
import { VectorStore } from './vectors';
import { KnowledgeGraph } from './graph';
import { uid } from '../core/utils';
import { ScrapeResult } from '../perception/base';

const log = createLogger('memory:corpus');

export class CorpusManager {
  private db: SQLiteStore;
  private vectors: VectorStore;
  private graph: KnowledgeGraph;
  private embedFn: ((text: string) => Promise<number[]>) | null = null;

  constructor(db: SQLiteStore, vectors: VectorStore, graph: KnowledgeGraph) {
    this.db = db;
    this.vectors = vectors;
    this.graph = graph;
  }

  setEmbedFunction(fn: (text: string) => Promise<number[]>): void {
    this.embedFn = fn;
  }

  async ingest(result: ScrapeResult): Promise<string> {
    const id = uid();

    // Store in SQLite
    this.db.insertDocument({
      id,
      source: result.source,
      url: result.url,
      title: result.title,
      content: result.content,
    });

    // Add to knowledge graph
    const sourceNode = this.graph.addNode(result.source, 'source');
    const docNode = this.graph.addNode(result.title || id, 'document', {
      url: result.url,
      source: result.source,
    });
    this.graph.addEdge(sourceNode.id, docNode.id, 'published');

    // Generate embedding if function is available
    if (this.embedFn && result.content) {
      try {
        const text = `${result.title}\n${result.content}`.slice(0, 8000);
        const embedding = await this.embedFn(text);
        this.vectors.add(id, embedding, {
          title: result.title,
          source: result.source,
          url: result.url,
        });
      } catch (err) {
        log.warn(`embedding failed for ${id}`, err);
      }
    }

    log.debug(`ingested: ${result.title || id} from ${result.source}`);
    return id;
  }

  async search(query: string, topK: number = 10): Promise<any[]> {
    // Try vector search first
    if (this.embedFn && this.vectors.count() > 0) {
      try {
        const queryVec = await this.embedFn(query);
        const results = this.vectors.search(queryVec, topK);
        return results.map(r => ({
          ...r.entry.metadata,
          score: r.score,
          id: r.entry.id,
        }));
      } catch (err) {
        log.warn('vector search failed, falling back to text', err);
      }
    }

    // Fallback to text search
    return this.db.searchDocuments(query, topK);
  }

  stats(): { documents: number; vectors: number; graphNodes: number; graphEdges: number } {
    return {
      documents: this.db.countDocuments(),
      vectors: this.vectors.count(),
      graphNodes: this.graph.nodeCount(),
      graphEdges: this.graph.edgeCount(),
    };
  }
}
