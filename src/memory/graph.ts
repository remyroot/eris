import { createLogger } from '../core/logger';
import { uid } from '../core/utils';

const log = createLogger('memory:graph');

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: number;
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
  private adjacency = new Map<string, Set<string>>(); // nodeId -> set of edgeIds

  addNode(label: string, type: string, data: Record<string, unknown> = {}): GraphNode {
    // Check for existing node with same label and type
    for (const node of this.nodes.values()) {
      if (node.label === label && node.type === type) {
        // Update data
        Object.assign(node.data, data);
        return node;
      }
    }

    const node: GraphNode = {
      id: uid(),
      label,
      type,
      data,
      createdAt: Date.now(),
    };
    this.nodes.set(node.id, node);
    this.adjacency.set(node.id, new Set());
    log.debug(`added node: ${label} (${type})`);
    return node;
  }

  addEdge(sourceId: string, targetId: string, relation: string, weight: number = 1.0): GraphEdge | null {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      log.warn(`cannot add edge: missing node(s) ${sourceId} -> ${targetId}`);
      return null;
    }

    // Check for duplicate edge
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

  nodeCount(): number { return this.nodes.size; }
  edgeCount(): number { return this.edges.size; }

  // Serialize for persistence
  serialize(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  // Load from serialized data
  load(data: { nodes: GraphNode[]; edges: GraphEdge[] }): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacency.clear();

    for (const node of data.nodes) {
      this.nodes.set(node.id, node);
      this.adjacency.set(node.id, new Set());
    }

    for (const edge of data.edges) {
      this.edges.set(edge.id, edge);
      this.adjacency.get(edge.source)?.add(edge.id);
      this.adjacency.get(edge.target)?.add(edge.id);
    }

    log.info(`loaded graph: ${this.nodes.size} nodes, ${this.edges.size} edges`);
  }
}
