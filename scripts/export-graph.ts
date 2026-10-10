import { KnowledgeGraph } from '../src/memory/graph';
import fs from 'fs';
import path from 'path';

// Export knowledge graph to JSON for external analysis

const DATA_DIR = process.env.DATA_DIR || './data';
const GRAPH_FILE = path.join(DATA_DIR, 'graph.json');
const EXPORT_FILE = path.join(DATA_DIR, 'exports', 'graph-export.json');

async function main() {
  const graph = new KnowledgeGraph();

  if (fs.existsSync(GRAPH_FILE)) {
    const data = JSON.parse(fs.readFileSync(GRAPH_FILE, 'utf8'));
    graph.load(data);
  }

  const exported = graph.serialize();
  fs.mkdirSync(path.dirname(EXPORT_FILE), { recursive: true });
  fs.writeFileSync(EXPORT_FILE, JSON.stringify(exported, null, 2));

  console.log(`exported ${exported.nodes.length} nodes, ${exported.edges.length} edges`);
  console.log(`written to ${EXPORT_FILE}`);
}

main().catch(console.error);
