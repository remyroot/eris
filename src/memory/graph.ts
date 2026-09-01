import { createLogger } from '../core/logger';
import { uid } from '../core/utils';

const log = createLogger('memory:graph');

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  weight: number;
  createdAt: number;
}

export class KnowledgeGraph {
  private nodes = new Map<string, GraphNode>();
  private edges = new Map<string, GraphEdge>();
  private adjacency = new Map<string, Set<string>>();
  private labelIndex = new Map<string, string>(); // "type:label" -> nodeId

  addNode(label: string, type: string, data: Record<string, unknown> = {}): GraphNode {
    const key = `${type}:${label}`;
    const existing = this.labelIndex.get(key);
    if (existing) {
      const node = this.nodes.get(existing)!;
      Object.assign(node.data, data);
      node.updatedAt = Date.now();
      return node;
    }

    const node: GraphNode = {
      id: uid(),
      label,
      type,
      data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.nodes.set(node.id, node);
    this.adjacency.set(node.id, new Set());
    this.labelIndex.set(key, node.id);
    return node;
  }

  removeNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove all connected edges
    const edgeIds = this.adjacency.get(id);
    if (edgeIds) {
      for (const eid of edgeIds) {
        const edge = this.edges.get(eid);
        if (edge) {
          const otherId = edge.source === id ? edge.target : edge.source;
          this.adjacency.get(otherId)?.delete(eid);
          this.edges.delete(eid);
        }
      }
    }

    this.adjacency.delete(id);
    this.nodes.delete(id);
    this.labelIndex.delete(`${node.type}:${node.label}`);
    return true;
  }

  addEdge(sourceId: string, targetId: string, relation: string, weight: number = 1.0): GraphEdge | null {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return null;
    }

    // Dedup: check for existing edge with same source, target, relation
    const sourceEdges = this.adjacency.get(sourceId);
    if (sourceEdges) {
      for (const eid of sourceEdges) {
        const existing = this.edges.get(eid);
        if (existing && existing.target === targetId && existing.relation === relation) {
          existing.weight = Math.max(existing.weight, weight);
          return existing;
        }
      }
    }

    const edge: GraphEdge = {
      id: uid(),
      source: sourceId,
      target: targetId,
      relation,
      weight,
      createdAt: Date.now(),
    };
    this.edges.set(edge.id, edge);
    this.adjacency.get(sourceId)?.add(edge.id);
    this.adjacency.get(targetId)?.add(edge.id);
    return edge;
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  findByLabel(label: string, type?: string): GraphNode | undefined {
    const key = type ? `${type}:${label}` : undefined;
    if (key) {
      const id = this.labelIndex.get(key);
      return id ? this.nodes.get(id) : undefined;
    }
    // Search all types
    for (const node of this.nodes.values()) {
      if (node.label === label) return node;
    }
    return undefined;
  }

  findNodes(type?: string, labelContains?: string): GraphNode[] {
    let results = Array.from(this.nodes.values());
    if (type) results = results.filter(n => n.type === type);
    if (labelContains) {
      const lc = labelContains.toLowerCase();
      results = results.filter(n => n.label.toLowerCase().includes(lc));
    }
    return results;
  }

  getNeighbors(nodeId: string, relation?: string): GraphNode[] {
    const edgeIds = this.adjacency.get(nodeId);
    if (!edgeIds) return [];
    const neighbors: GraphNode[] = [];
    for (const eid of edgeIds) {
      const edge = this.edges.get(eid);
      if (!edge) continue;
      if (relation && edge.relation !== relation) continue;
      const neighborId = edge.source === nodeId ? edge.target : edge.source;
      const neighbor = this.nodes.get(neighborId);
      if (neighbor) neighbors.push(neighbor);
    }
    return neighbors;
  }

  getEdges(nodeId: string): GraphEdge[] {
    const edgeIds = this.adjacency.get(nodeId);
    if (!edgeIds) return [];
    return Array.from(edgeIds).map(eid => this.edges.get(eid)!).filter(Boolean);
  }

  nodeCount(): number { return this.nodes.size; }
  edgeCount(): number { return this.edges.size; }

  serialize(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  load(data: { nodes: GraphNode[]; edges: GraphEdge[] }): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacency.clear();
    this.labelIndex.clear();

    for (const node of data.nodes) {
      this.nodes.set(node.id, node);
      this.adjacency.set(node.id, new Set());
      this.labelIndex.set(`${node.type}:${node.label}`, node.id);
    }

    for (const edge of data.edges) {
      this.edges.set(edge.id, edge);
      this.adjacency.get(edge.source)?.add(edge.id);
      this.adjacency.get(edge.target)?.add(edge.id);
    }

    log.info(`loaded graph: ${this.nodes.size} nodes, ${this.edges.size} edges`);
  }
}
