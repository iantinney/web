// ---------------------------------------------------------------------------
// Force-directed graph layout using d3-force
// Replaces hierarchical DAG layout with organic web-style layout where
// prerequisites gravitate toward the center and advanced concepts radiate outward.
// ---------------------------------------------------------------------------

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";

export interface LayoutNode extends SimulationNodeDatum {
  id: string;
  depthTier: number; // 1=foundation, 2=intermediate, 3=advanced
}

export interface LayoutLink extends SimulationLinkDatum<LayoutNode> {
  source: string;
  target: string;
}

/**
 * Compute force-directed layout positions for a concept graph.
 *
 * Uses d3-force with forceRadial to create a semi-structured layout:
 * - Tier 1 (foundation) nodes gravitate toward the center
 * - Tier 2 (intermediate) nodes sit in the middle ring
 * - Tier 3+ (advanced) nodes radiate outward
 *
 * Adaptive spacing scales with graph size so small graphs are spacious
 * and large graphs compress to keep everything visible.
 *
 * IMPORTANT: Creates fresh plain objects for the simulation — d3-force
 * mutates nodes in-place adding x, y, vx, vy, index. Never pass Prisma
 * objects or external references directly.
 */
export function computeForceLayout(
  nodes: LayoutNode[],
  links: LayoutLink[],
  options?: { width?: number; height?: number }
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  if (nodes.length === 0) {
    return positions;
  }

  const nodeCount = nodes.length;

  // Adaptive spacing: scale parameters with graph size
  const scaleFactor = Math.max(1, Math.sqrt(nodeCount / 10));
  const baseRadius = 200 * scaleFactor;

  // Create fresh plain objects for the simulation to avoid mutating input
  const simNodes: LayoutNode[] = nodes.map((n) => ({
    id: n.id,
    depthTier: n.depthTier,
  }));

  const simLinks: LayoutLink[] = links.map((l) => ({
    source: typeof l.source === "string" ? l.source : (l.source as LayoutNode).id,
    target: typeof l.target === "string" ? l.target : (l.target as LayoutNode).id,
  }));

  const simulation = forceSimulation<LayoutNode>(simNodes)
    .force(
      "charge",
      forceManyBody<LayoutNode>()
        .strength(-800 * scaleFactor)
        .distanceMax(1000 * scaleFactor)
    )
    .force(
      "link",
      forceLink<LayoutNode, LayoutLink>(simLinks)
        .id((d) => d.id)
        .distance(260 * scaleFactor)
        .strength(0.25)
    )
    .force("center", forceCenter(0, 0))
    .force("collide", forceCollide<LayoutNode>(160))
    .force(
      "radial",
      forceRadial<LayoutNode>(
        (d) => {
          if (d.depthTier === 1) return baseRadius * 0.3;
          if (d.depthTier === 2) return baseRadius * 0.7;
          return baseRadius * 1.0; // tier 3+
        },
        0,
        0
      ).strength(0.6)
    )
    .stop();

  // Run simulation synchronously to completion (~300 ticks)
  const tickCount = Math.ceil(
    Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())
  );
  for (let i = 0; i < tickCount; i++) {
    simulation.tick();
  }

  // Extract final positions from mutated simulation node objects
  for (const node of simNodes) {
    positions.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
  }

  return positions;
}
