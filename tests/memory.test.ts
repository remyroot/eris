import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeGraph } from '../src/memory/graph';
import { VectorStore } from '../src/memory/vectors';

describe('KnowledgeGraph', () => {
  let graph: KnowledgeGraph;

  beforeEach(() => {
    graph = new KnowledgeGraph();
  });

  it('adds nodes', () => {
    const node = graph.addNode('test', 'concept');
    expect(node.id).toBeTruthy();
    expect(node.label).toBe('test');
    expect(node.type).toBe('concept');
    expect(graph.nodeCount()).toBe(1);
  });

  it('deduplicates nodes by label+type', () => {
    const n1 = graph.addNode('test', 'concept');
    const n2 = graph.addNode('test', 'concept', { extra: true });
    expect(n1.id).toBe(n2.id);
    expect(graph.nodeCount()).toBe(1);
    expect(n2.data.extra).toBe(true);
  });

  it('allows same label with different types', () => {
    graph.addNode('test', 'concept');
    graph.addNode('test', 'entity');
    expect(graph.nodeCount()).toBe(2);
  });

  it('adds edges between nodes', () => {
    const n1 = graph.addNode('a', 'concept');
    const n2 = graph.addNode('b', 'concept');
    const edge = graph.addEdge(n1.id, n2.id, 'related');
    expect(edge).toBeTruthy();
    expect(graph.edgeCount()).toBe(1);
  });

  it('returns null for edges with missing nodes', () => {
    const n1 = graph.addNode('a', 'concept');
    const edge = graph.addEdge(n1.id, 'nonexistent', 'related');
    expect(edge).toBeNull();
  });

  it('deduplicates edges', () => {
    const n1 = graph.addNode('a', 'concept');
    const n2 = graph.addNode('b', 'concept');
    graph.addEdge(n1.id, n2.id, 'related', 0.5);
    graph.addEdge(n1.id, n2.id, 'related', 0.8);
    expect(graph.edgeCount()).toBe(1);
  });

  it('finds neighbors', () => {
    const n1 = graph.addNode('center', 'concept');
    const n2 = graph.addNode('neighbor1', 'concept');
    const n3 = graph.addNode('neighbor2', 'concept');
    graph.addEdge(n1.id, n2.id, 'related');
    graph.addEdge(n1.id, n3.id, 'related');
    const neighbors = graph.getNeighbors(n1.id);
    expect(neighbors.length).toBe(2);
  });

  it('filters neighbors by relation', () => {
    const n1 = graph.addNode('center', 'concept');
    const n2 = graph.addNode('child', 'concept');
    const n3 = graph.addNode('sibling', 'concept');
    graph.addEdge(n1.id, n2.id, 'parent_of');
    graph.addEdge(n1.id, n3.id, 'sibling_of');
    const children = graph.getNeighbors(n1.id, 'parent_of');
    expect(children.length).toBe(1);
    expect(children[0].label).toBe('child');
  });

  it('serializes and loads', () => {
    const n1 = graph.addNode('a', 'concept');
    const n2 = graph.addNode('b', 'concept');
    graph.addEdge(n1.id, n2.id, 'related');

    const data = graph.serialize();
    const graph2 = new KnowledgeGraph();
    graph2.load(data);
    expect(graph2.nodeCount()).toBe(2);
    expect(graph2.edgeCount()).toBe(1);
  });

  it('removes nodes and connected edges', () => {
    const n1 = graph.addNode('a', 'concept');
    const n2 = graph.addNode('b', 'concept');
    graph.addEdge(n1.id, n2.id, 'related');
    graph.removeNode(n1.id);
    expect(graph.nodeCount()).toBe(1);
    expect(graph.edgeCount()).toBe(0);
  });
});

describe('VectorStore', () => {
  it('adds and searches vectors', () => {
    const store = new VectorStore(3);
    store.add('a', [1, 0, 0], { label: 'x-axis' });
    store.add('b', [0, 1, 0], { label: 'y-axis' });
    store.add('c', [0.9, 0.1, 0], { label: 'near-x' });

    const results = store.search([1, 0, 0], 2);
    expect(results.length).toBe(2);
    expect(results[0].entry.id).toBe('a');
    expect(results[0].score).toBeCloseTo(1.0);
  });

  it('handles dimension mismatch', () => {
    const store = new VectorStore(3);
    expect(() => store.add('a', [1, 0], {})).toThrow();
  });

  it('removes entries', () => {
    const store = new VectorStore(3);
    store.add('a', [1, 0, 0]);
    expect(store.count()).toBe(1);
    store.remove('a');
    expect(store.count()).toBe(0);
  });
});
