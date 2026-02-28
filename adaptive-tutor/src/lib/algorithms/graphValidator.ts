// ---------------------------------------------------------------------------
// Graph validation utilities
// Cycle detection via Kahn's algorithm (topological sort)
// ---------------------------------------------------------------------------

interface GraphNode {
  id: string;
  name: string;
}

interface GraphEdge {
  from: string; // node id or name
  to: string;   // node id or name
}

/**
 * Detect if a directed graph contains cycles using Kahn's algorithm.
 * Returns { isDAG: true, order: [...] } if acyclic, or
 *         { isDAG: false, cyclicNodes: [...] } if cycles exist.
 */
export function validateDAG(
  nodes: GraphNode[],
  edges: GraphEdge[]
): {
  isDAG: boolean;
  topologicalOrder?: string[];
  cyclicNodes?: string[];
} {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }

  // Build adjacency list and in-degree counts
  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
    adjacency.get(edge.from)!.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  // Kahn's: start with nodes that have in-degree 0
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const order: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) {
        queue.push(neighbor);
      }
    }
  }

  if (order.length === nodeIds.size) {
    return { isDAG: true, topologicalOrder: order };
  }

  // Find nodes involved in cycles (those not in the topological order)
  const orderedSet = new Set(order);
  const cyclicNodes = [...nodeIds].filter((id) => !orderedSet.has(id));

  return { isDAG: false, cyclicNodes };
}

/**
 * Break cycles by removing the edge that creates the cycle.
 * Heuristic: prefer removing edges where the "from" node has a higher
 * difficulty tier than the "to" node (reversed prerequisite — likely erroneous).
 * Falls back to removing the first cyclic edge if no tier-based edge found.
 */
export function breakCycles(
  nodes: GraphNode[],
  edges: GraphEdge[],
  getNodeTier: (id: string) => number
): GraphEdge[] {
  let currentEdges = [...edges];
  let result = validateDAG(nodes, currentEdges);
  let maxIterations = edges.length; // safety valve

  while (!result.isDAG && maxIterations > 0) {
    // Find edges between cyclic nodes
    const cyclicSet = new Set(result.cyclicNodes);
    const cyclicEdges = currentEdges
      .map((e, idx) => ({ edge: e, idx }))
      .filter(({ edge }) => cyclicSet.has(edge.from) && cyclicSet.has(edge.to));

    if (cyclicEdges.length === 0) break;

    // Prefer removing edges where from-tier > to-tier (reversed difficulty = erroneous)
    const tierBasedCandidate = cyclicEdges.find(
      ({ edge }) => getNodeTier(edge.from) > getNodeTier(edge.to)
    );

    const toRemoveIdx = tierBasedCandidate
      ? tierBasedCandidate.idx
      : cyclicEdges[0].idx;

    const removed = currentEdges[toRemoveIdx];
    const fromTier = getNodeTier(removed.from);
    const toTier = getNodeTier(removed.to);
    console.log(
      `[breakCycles] Removing cyclic edge: ${removed.from} → ${removed.to}` +
        ` (tier ${fromTier} → tier ${toTier}, reason: ${
          tierBasedCandidate ? "reversed-difficulty" : "first-cyclic-fallback"
        })`
    );

    currentEdges.splice(toRemoveIdx, 1);
    result = validateDAG(nodes, currentEdges);
    maxIterations--;
  }

  return currentEdges;
}

/**
 * Compute layout positions for a DAG using a simple layered approach.
 * Uses topological order to assign layers, then spreads nodes within layers.
 */
export function computeDAGLayout(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const result = validateDAG(nodes, edges);

  if (!result.isDAG || !result.topologicalOrder) {
    // Fallback: simple grid layout
    nodes.forEach((node, i) => {
      positions.set(node.id, {
        x: (i % 5) * 250,
        y: Math.floor(i / 5) * 150,
      });
    });
    return positions;
  }

  // Compute layer (longest path from any root)
  const layers = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    layers.set(node.id, 0);
  }
  for (const edge of edges) {
    adjacency.get(edge.from)?.push(edge.to);
  }

  // Process in topological order to compute layer depths
  for (const nodeId of result.topologicalOrder) {
    const currentLayer = layers.get(nodeId) ?? 0;
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      const neighborLayer = layers.get(neighbor) ?? 0;
      if (currentLayer + 1 > neighborLayer) {
        layers.set(neighbor, currentLayer + 1);
      }
    }
  }

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  for (const [nodeId, layer] of layers) {
    if (!layerGroups.has(layer)) layerGroups.set(layer, []);
    layerGroups.get(layer)!.push(nodeId);
  }

  // Assign positions: layers go top-to-bottom, nodes spread horizontally
  const LAYER_GAP = 180;
  const NODE_GAP = 280;

  for (const [layer, nodeIds] of layerGroups) {
    const totalWidth = (nodeIds.length - 1) * NODE_GAP;
    const startX = -totalWidth / 2;

    nodeIds.forEach((nodeId, i) => {
      positions.set(nodeId, {
        x: startX + i * NODE_GAP,
        y: layer * LAYER_GAP,
      });
    });
  }

  return positions;
}
