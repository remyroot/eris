import { KnowledgeGraph } from '../src/memory/graph';
import { VectorStore } from '../src/memory/vectors';
import { uid } from '../src/core/utils';

function benchGraph() {
  const graph = new KnowledgeGraph();
  const start = Date.now();
  const ids: string[] = [];
  for (let i = 0; i < 10000; i++) {
    ids.push(graph.addNode(`n${i}`, 'test', { i }).id);
  }
  console.log(`graph: 10k nodes in ${Date.now() - start}ms`);
  const es = Date.now();
  for (let i = 0; i < 50000; i++) {
    const a = ids[Math.floor(Math.random() * ids.length)];
    const b = ids[Math.floor(Math.random() * ids.length)];
    if (a !== b) graph.addEdge(a, b, 'rel');
  }
  console.log(`graph: 50k edges in ${Date.now() - es}ms (${graph.edgeCount()} unique)`);
}

function benchVectors() {
  const store = new VectorStore(1536);
  const rv = () => Array.from({ length: 1536 }, () => Math.random() - 0.5);
  const s = Date.now();
  for (let i = 0; i < 5000; i++) store.add(uid(), rv(), { i });
  console.log(`vectors: 5k inserts in ${Date.now() - s}ms`);
  const s2 = Date.now();
  for (let i = 0; i < 100; i++) store.search(rv(), 10);
  console.log(`vectors: 100 searches in ${Date.now() - s2}ms`);
}

console.log('=== Memory Benchmark ===\n');
benchGraph();
benchVectors();
