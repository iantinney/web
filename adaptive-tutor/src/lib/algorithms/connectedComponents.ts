/**
 * Graph connectivity analysis for concept networks.
 * Used to detect disconnected subgraphs and split them if needed.
 */

interface Node {
  id: string;
  name?: string;
}

interface Edge {
  from: string;
  to: string;
}

/**
 * Find connected components in an undirected graph using DFS.
 *
 * Returns array of node ID groups, where each group is a connected component.
 * Nodes in the same group are transitively connected through edges.
 */
export function findConnectedComponents(
  nodes: Node[],
  edges: Edge[]
): string[][] {
  if (nodes.length === 0) return [];

  // Build adjacency list (treat edges as bidirectional)
  const adj = new Map<string, Set<string>>();
  for (const node of nodes) {
    adj.set(node.id, new Set());
  }

  for (const edge of edges) {
    adj.get(edge.from)?.add(edge.to);
    adj.get(edge.to)?.add(edge.from);
  }

  // DFS to find components
  const visited = new Set<string>();
  const components: string[][] = [];

  function dfs(nodeId: string, component: string[]): void {
    visited.add(nodeId);
    component.push(nodeId);

    const neighbors = adj.get(nodeId) ?? new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, component);
      }
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const component: string[] = [];
      dfs(node.id, component);
      components.push(component);
    }
  }

  return components;
}

/**
 * Check if a graph is fully connected (single component).
 */
export function isFullyConnected(nodes: Node[], edges: Edge[]): boolean {
  const components = findConnectedComponents(nodes, edges);
  return components.length === 1;
}
