# Phase 9: Web-style Force-Directed Graph Layout via Backend Positioning - Research

**Researched:** 2026-02-27
**Domain:** Force-directed graph layout, SVG edge animation, custom node addition with LLM inference
**Confidence:** HIGH

## Summary

This phase replaces the current Dagre-based hierarchical DAG layout with a force-directed web-style layout computed on the backend using d3-force in Node.js. The project currently uses a custom `computeDAGLayout()` in `graphValidator.ts` that assigns positions based on topological layer ordering (top-to-bottom, left-to-right within layers). The new system will use d3-force's simulation with `forceRadial` to create a semi-structured layout where prerequisites gravitate toward the center and advanced concepts radiate outward, evoking a neural network metaphor.

The phase has three major workstreams: (1) backend force-directed layout computation with d3-force, storing positions in the existing `GraphMembership.positionX/positionY` fields; (2) custom edge rendering with organic bezier splines and particle stream animations using SVG `<animateMotion>` in React Flow custom edge components; and (3) user-initiated custom node addition with a floating FAB, LLM-based edge inference, and on-demand question generation.

**Primary recommendation:** Use `d3-force` v3.0.0 as a standalone npm package on the backend with `forceRadial` for the prerequisite-center/advanced-outer layout. Implement custom React Flow edge components with SVG `<animateMotion>` for particle streams. Build a new `/api/graphs/[id]/layout` endpoint that computes and caches positions. Change ConceptNode handles from `Position.Top`/`Position.Bottom` to all four directions (or a single centered handle) for multi-directional edge rendering.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Semi-structured force-directed layout**: Pure force-directed with gravity pulling prerequisites toward center and advanced concepts outward. Organic but with implicit directionality -- not a hierarchy, not fully random.
- **Neural network metaphor**: Nodes as synapses, edges as axons with traveling pulses. The graph should feel alive and biological -- a "growing brain."
- **Adaptive spacing**: Spacing scales with graph size -- small graphs are spacious, large graphs compress to keep everything visible. Avoids fixed spacing.
- **Fresh layout on migration**: Compute entirely new positions from scratch. No seeding from old Dagre positions. Clean break from flowchart look.
- **Organic splines**: Custom curved edge paths that avoid crossing other nodes where possible. Most organic visual.
- **Particle stream for direction**: Multiple tiny particles flowing along edges from prerequisite to dependent. Denser flow for stronger connections (higher source proficiency). This replaces traditional arrowheads -- direction is communicated through particle flow.
- **Proficiency-driven appearance**: Edge opacity/brightness reflects source node proficiency. Mastered prerequisites glow brighter. Particle flow speed matches mastery level.
- **Locked edge treatment**: Edges to locked nodes are dim + dashed. No particle flow. Visually communicates "not yet accessible" while showing the path exists.
- **Use frontend-design skill** for all visual/animation implementation to ensure distinctive, production-grade aesthetics.
- **On graph mutation only**: Recompute when nodes are added/removed (concept insertion, gap proposal, custom node addition). Positions are cached in DB and served as-is for normal loads.
- **Full recompute on insertion**: Run the full force-directed algorithm on all nodes after any insertion. Ensures globally optimal layout. Existing nodes may shift slightly to accommodate new ones.
- **d3-force algorithm**: Use d3-force library running in Node.js on the backend. Supports charge repulsion, link attraction, centering, and custom forces for the prerequisite-gravity constraint.
- **Floating + button**: A '+' FAB in the graph view. Tap opens a small form overlay where user types the concept name.
- **Auto-connect via LLM**: After user enters concept name, LLM infers which existing nodes to connect to. Node appears in the web immediately with edges -- no confirmation dialog. User can edit connections later via NodeDetailPanel.
- **On-demand question generation**: Questions generated only when user first tries to practice the concept. Saves LLM calls for concepts user may never practice.

### Claude's Discretion
- d3-force simulation parameters (charge strength, link distance, gravity force)
- Particle stream animation implementation (CSS vs canvas vs SVG)
- Organic spline path computation approach
- Form overlay design for custom node addition
- LLM prompt design for edge inference
- Transition animation when nodes settle into new positions after recompute

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| d3-force | 3.0.0 | Force-directed layout simulation | Industry standard for force-directed graph layout. Velocity Verlet integration, composable forces, O(n log n) Barnes-Hut many-body. Can run headless in Node.js. |
| @xyflow/react | 12.10.1 (existing) | Graph rendering with custom nodes/edges | Already in project. Supports custom edge components with full SVG control for particle animations. |
| framer-motion | 12.34.3 (existing) | Node position transition animations | Already in project. Can animate node position changes smoothly when layout recomputes. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/d3-force | latest | TypeScript types for d3-force | Always -- project uses strict TypeScript mode |
| d3-force (standalone) | 3.0.0 | Just the force module, not all of d3 | Import only `d3-force` to avoid bloating the bundle with unused d3 modules |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| d3-force | ngraph.forcelayout | Smaller, but d3-force has much broader ecosystem, documentation, and community. d3-force is the user's locked decision. |
| SVG animateMotion | Canvas-based particles | Canvas would perform better at 100+ particles, but SVG animateMotion integrates natively with React Flow's SVG edge layer. For typical graph sizes (8-30 nodes), SVG is sufficient. |
| react-flow-smart-edge | Custom bezier path computation | smart-edge repo was archived Dec 2025; better to compute organic bezier paths directly using `getBezierPath` with custom curvature. |

### Installation
```bash
cd adaptive-tutor
npm install d3-force @types/d3-force
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── algorithms/
│   │   ├── graphValidator.ts          # MODIFY: keep DAG validation, replace computeDAGLayout
│   │   └── forceLayout.ts            # NEW: d3-force simulation wrapper (shared backend logic)
│   └── prompts/
│       └── index.ts                   # MODIFY: add edgeInferencePrompt
├── app/
│   └── api/
│       ├── unit-graphs/
│       │   └── [id]/
│       │       └── layout/
│       │           └── route.ts       # NEW: POST recompute layout, returns positions
│       └── study-plans/
│           └── [id]/
│               └── concepts/
│                   ├── insert/route.ts    # MODIFY: use forceLayout instead of computeDAGLayout
│                   └── add-custom/route.ts # NEW: custom node addition + LLM edge inference
└── components/
    └── graph/
        ├── ConceptNode.tsx            # MODIFY: change Handle positions for multi-directional layout
        ├── ParticleEdge.tsx           # NEW: custom edge with organic spline + particle animation
        ├── AddConceptFAB.tsx          # NEW: floating action button + form overlay
        └── NodeDetailPanel.tsx        # MODIFY: add edge editing capability (from user decision)
```

### Pattern 1: Server-Side d3-force Simulation (Synchronous)
**What:** Run d3-force to completion on the backend without DOM, extracting final positions.
**When to use:** Every layout recompute (graph creation, node insertion, custom node addition).
**Example:**
```typescript
// Source: https://d3js.org/d3-force/simulation
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial,
  forceX,
  forceY,
  SimulationNodeDatum,
  SimulationLinkDatum,
} from "d3-force";

interface LayoutNode extends SimulationNodeDatum {
  id: string;
  depthTier: number; // 1=foundation, 2=intermediate, 3=advanced
}

interface LayoutLink extends SimulationLinkDatum<LayoutNode> {
  source: string;
  target: string;
}

export function computeForceLayout(
  nodes: LayoutNode[],
  links: LayoutLink[],
  options?: { width?: number; height?: number }
): Map<string, { x: number; y: number }> {
  const nodeCount = nodes.length;

  // Adaptive spacing: scale parameters with graph size
  const scaleFactor = Math.max(1, Math.sqrt(nodeCount / 10));
  const baseRadius = 150 * scaleFactor;

  const simulation = forceSimulation<LayoutNode>(nodes)
    .force("charge", forceManyBody<LayoutNode>()
      .strength(-300 * scaleFactor)
      .distanceMax(500 * scaleFactor)
    )
    .force("link", forceLink<LayoutNode, LayoutLink>(links)
      .id((d) => d.id)
      .distance(80 * scaleFactor)
      .strength(0.7)
    )
    .force("center", forceCenter(0, 0))
    .force("collide", forceCollide<LayoutNode>(60))
    // Key: forceRadial pulls prerequisites (tier 1) toward center,
    // advanced (tier 3) toward outer ring
    .force("radial", forceRadial<LayoutNode>(
      (d) => {
        if (d.depthTier === 1) return baseRadius * 0.3;
        if (d.depthTier === 2) return baseRadius * 0.7;
        return baseRadius * 1.0;
      },
      0, 0 // center at origin
    ).strength(0.3))
    .stop();

  // Run simulation synchronously to completion (~300 ticks)
  const tickCount = Math.ceil(
    Math.log(simulation.alphaMin()) / Math.log(1 - simulation.alphaDecay())
  );
  for (let i = 0; i < tickCount; i++) {
    simulation.tick();
  }

  // Extract final positions
  const positions = new Map<string, { x: number; y: number }>();
  for (const node of nodes) {
    positions.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
  }
  return positions;
}
```

### Pattern 2: Custom Particle Edge Component
**What:** React Flow custom edge with organic bezier path and SVG animateMotion particles.
**When to use:** All edges in the graph view.
**Example:**
```typescript
// Source: https://reactflow.dev/examples/edges/animating-edges
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

interface ParticleEdgeData {
  sourceProficiency: number; // 0.0-1.0
  isLocked: boolean;
}

export function ParticleEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<ParticleEdgeData>) {
  const proficiency = data?.sourceProficiency ?? 0;
  const isLocked = data?.isLocked ?? false;

  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    curvature: 0.4, // Higher curvature = more organic
  });

  // Locked: dim + dashed, no particles
  if (isLocked) {
    return (
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke="rgba(74, 74, 100, 0.15)"
        strokeWidth={1}
        strokeDasharray="4 6"
      />
    );
  }

  // Particle count scales with proficiency (1-5 particles)
  const particleCount = Math.max(1, Math.round(proficiency * 5));
  // Speed scales with proficiency (faster = more mastered)
  const duration = 4 - proficiency * 2.5; // 4s at 0%, 1.5s at 100%
  const opacity = 0.2 + proficiency * 0.6; // 0.2 at 0%, 0.8 at 100%

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: `rgba(0, 210, 160, ${opacity * 0.5})`,
          strokeWidth: 1.5,
        }}
      />
      {Array.from({ length: particleCount }).map((_, i) => (
        <circle
          key={`${id}-particle-${i}`}
          r={2}
          fill={`rgba(0, 210, 160, ${opacity})`}
        >
          <animateMotion
            dur={`${duration}s`}
            repeatCount="indefinite"
            path={edgePath}
            begin={`${(i / particleCount) * duration}s`}
          />
        </circle>
      ))}
    </>
  );
}
```

### Pattern 3: Backend Layout API Endpoint
**What:** POST endpoint that triggers full force-directed recompute and persists positions.
**When to use:** After node insertion, custom node addition, or graph creation.
**Example:**
```typescript
// POST /api/unit-graphs/[id]/layout
export async function POST(req: NextRequest, { params }: ...) {
  const { id } = await params;

  // Fetch all memberships + edges for this graph
  const memberships = await prisma.graphMembership.findMany({
    where: { unitGraphId: id },
    include: { concept: true },
  });
  const edges = await prisma.conceptEdge.findMany({
    where: { unitGraphId: id },
  });

  // Convert to layout format
  const nodes = memberships.map((m) => ({
    id: m.conceptId,
    depthTier: m.depthTier,
  }));
  const links = edges.map((e) => ({
    source: e.fromNodeId,
    target: e.toNodeId,
  }));

  // Compute force-directed layout
  const positions = computeForceLayout(nodes, links);

  // Persist positions to GraphMembership
  await Promise.all(
    memberships.map((m) => {
      const pos = positions.get(m.conceptId) ?? { x: 0, y: 0 };
      return prisma.graphMembership.update({
        where: { conceptId_unitGraphId: { conceptId: m.conceptId, unitGraphId: id } },
        data: { positionX: pos.x, positionY: pos.y },
      });
    })
  );

  // Return layout for immediate frontend update
  const layout: Record<string, { x: number; y: number }> = {};
  positions.forEach((pos, nodeId) => { layout[nodeId] = pos; });
  return NextResponse.json({ layout });
}
```

### Pattern 4: Multi-Directional Handle Setup for Force-Directed Layout
**What:** Replace fixed Top/Bottom handles with handles on all four sides (or a single centered handle).
**When to use:** ConceptNode must support edges arriving from any direction, not just top-to-bottom.
**Example:**
```typescript
// Current: Position.Top (target) and Position.Bottom (source)
// Change to: all four positions with hidden handles for visual cleanliness
// React Flow automatically selects the closest handle pair
<Handle type="target" position={Position.Top} id="target-top" style={hiddenHandleStyle} />
<Handle type="target" position={Position.Left} id="target-left" style={hiddenHandleStyle} />
<Handle type="source" position={Position.Bottom} id="source-bottom" style={hiddenHandleStyle} />
<Handle type="source" position={Position.Right} id="source-right" style={hiddenHandleStyle} />
```

### Anti-Patterns to Avoid
- **Running d3-force on the frontend:** The user explicitly requires backend computation. Running on the frontend would cause layout jank during interaction and inconsistent positions across page loads.
- **Seeding from Dagre positions:** User decision is "fresh layout, no seeding from old Dagre positions." Do not attempt to preserve existing positions.
- **Using react-flow-smart-edge for node avoidance:** The repo was archived Dec 2025. Instead, use `getBezierPath` with custom curvature and accept that some edge crossing may occur (organic look is more important than zero crossings).
- **stroke-dasharray animation for edge flow:** React Flow's default `animated` prop uses stroke-dasharray which causes poor CPU performance with many edges. Use SVG `<animateMotion>` instead.
- **Fixed simulation parameters:** Graph size varies widely (8-30+ nodes). Parameters must scale adaptively. Hard-coding `-300` charge strength works for 15 nodes but crushes 8-node graphs and under-repels 30-node graphs.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Force-directed layout | Custom spring-based physics | `d3-force` with `forceSimulation` | Years of optimization, Barnes-Hut O(n log n), well-tested edge cases |
| SVG path animation | requestAnimationFrame particle system | SVG `<animateMotion>` element | Browser-native, GPU-accelerated, zero JS overhead per frame |
| Bezier edge paths | Manual cubic bezier control point math | `getBezierPath()` from `@xyflow/react` | Handles edge cases (source/target same position, extreme angles) |
| Radial tier sorting | Custom gravity function | `d3.forceRadial(radiusFn, cx, cy)` | Built-in to d3-force, handles per-node radius accessor |
| Node collision avoidance | Manual overlap detection | `d3.forceCollide(radius)` | Quadtree-optimized, handles variable node sizes |
| Topological order for tier assignment | New BFS algorithm | Existing `validateDAG()` from `graphValidator.ts` | Already verified, battle-tested in this codebase |

**Key insight:** d3-force provides composable forces that map directly to every layout constraint in this phase. forceRadial = tier gravity, forceManyBody = repulsion, forceLink = edge attraction, forceCollide = node spacing, forceCenter = viewport centering. Composing these is dramatically simpler and more robust than building custom physics.

## Common Pitfalls

### Pitfall 1: d3-force Mutates Input Nodes
**What goes wrong:** d3-force mutates the `nodes` array in place, adding `x`, `y`, `vx`, `vy`, `index` properties. If you pass Prisma objects directly, you get unexpected mutations.
**Why it happens:** d3-force was designed for interactive browser use where mutation is the norm.
**How to avoid:** Always create fresh plain objects for the simulation, copying only `id` and `depthTier`. Extract positions after simulation completes.
**Warning signs:** TypeScript errors about missing `x`/`y` on input types; unexpected `vx`/`vy` properties on your data objects.

### Pitfall 2: Simulation Not Running to Completion
**What goes wrong:** Calling `simulation.tick()` only once gives nearly random positions. Must tick ~300 times.
**Why it happens:** d3-force uses iterative relaxation with alpha decay. One tick does almost nothing.
**How to avoid:** Calculate exact tick count: `Math.ceil(Math.log(alphaMin) / Math.log(1 - alphaDecay))`. With defaults (alphaMin=0.001, alphaDecay~0.0228) this is ~300 ticks.
**Warning signs:** Nodes clustered in center or at origin; positions change drastically on page reload.

### Pitfall 3: Handle Position Incompatibility with Force Layout
**What goes wrong:** Current ConceptNode has `Handle type="target" position={Position.Top}` and `Handle type="source" position={Position.Bottom}`. With force-directed layout, edges can approach from any direction, causing ugly straight-line snapping to top/bottom.
**Why it happens:** Dagre layout guarantees parent-above-child, so Top/Bottom handles work. Force-directed has no such guarantee.
**How to avoid:** Add handles on all four sides, or use a single centered handle with `connectionMode="loose"`. React Flow automatically picks the closest handle pair.
**Warning signs:** Edges making sharp 90-degree turns instead of smooth curves; edges crossing through nodes.

### Pitfall 4: SVG animateMotion Performance at Scale
**What goes wrong:** With 30 edges and 5 particles each = 150 animated SVG elements. Can cause frame drops on low-end devices.
**Why it happens:** Each `<animateMotion>` is a separate browser animation, though they are GPU-accelerated.
**How to avoid:** Cap particle count based on viewport visibility. Reduce particles for off-screen or zoomed-out edges. Use `will-change: transform` on particle containers. Consider reducing particle count for edges far from viewport center.
**Warning signs:** Frame rate drops below 30fps on graph tab; high GPU memory usage in DevTools.

### Pitfall 5: Layout API Response Time
**What goes wrong:** d3-force simulation with 30 nodes takes ~5-15ms for 300 ticks. But Prisma `Promise.all` updating 30 rows takes ~50-100ms. Total can exceed 200ms perceived latency.
**Why it happens:** SQLite single-writer lock means each update is sequential under the hood.
**How to avoid:** Use `prisma.$transaction` for batched updates. Consider updating positions in a single raw SQL statement. Show optimistic UI with positions from the API response before the persist confirms.
**Warning signs:** Graph tab shows stale positions for a moment after insertion; multiple rapid insertions queue up.

### Pitfall 6: LLM Edge Inference Hallucinating Connections
**What goes wrong:** LLM infers edges to concepts that don't exist in the graph, or creates cycles.
**Why it happens:** LLM has no hard constraint on output validity.
**How to avoid:** Validate all inferred edges against actual concept IDs in the graph. Run `validateDAG()` after adding inferred edges. Silently drop invalid edges rather than failing the operation.
**Warning signs:** "Concept not found" errors; graph showing cycles; edges to non-existent nodes.

## Code Examples

### Existing Code to Modify

#### graphValidator.ts - Current computeDAGLayout (to be replaced)
```typescript
// File: adaptive-tutor/src/lib/algorithms/graphValidator.ts
// Lines 132-198: computeDAGLayout function
// This function will be replaced by the new forceLayout.ts module.
// Keep validateDAG() and breakCycles() -- they're still needed for DAG validation.
```

#### ConceptNode.tsx - Current Handle positions (to be changed)
```typescript
// File: adaptive-tutor/src/components/graph/ConceptNode.tsx
// Line 108: <Handle type="target" position={Position.Top} style={handleStyle} />
// Line 260: <Handle type="source" position={Position.Bottom} style={handleStyle} />
// Change to multi-directional handles for force-directed layout.
```

#### graph/page.tsx - Current edge configuration (to be replaced)
```typescript
// File: adaptive-tutor/src/app/(tabs)/graph/page.tsx
// Lines 101-137: flowEdges useMemo
// Current: type "smoothstep" with animated dash for mastered edges
// Replace with: type "particle" custom edge with proficiency-driven particles
```

#### concepts/insert/route.ts - Current layout call (to update)
```typescript
// File: adaptive-tutor/src/app/api/study-plans/[id]/concepts/insert/route.ts
// Line 137: computeDAGLayout() call
// Replace with: computeForceLayout() from new forceLayout.ts
```

### LLM Edge Inference Prompt (New)
```typescript
export function edgeInferencePrompt(
  newConceptName: string,
  existingConcepts: { id: string; name: string; description: string }[]
): string {
  const conceptList = existingConcepts
    .map((c) => `- "${c.name}" (ID: ${c.id}): ${c.description}`)
    .join("\n");

  return `You are connecting a new concept to an existing knowledge graph.

NEW CONCEPT: "${newConceptName}"

EXISTING CONCEPTS IN THE GRAPH:
${conceptList}

Determine which existing concepts should connect to the new concept.
- "prerequisite_of" means the existing concept must be learned BEFORE the new concept
- "dependent_on" means the new concept must be learned BEFORE the existing concept

OUTPUT ONLY VALID JSON. No markdown fences, no preamble.
{
  "edges": [
    {
      "existingConceptId": "concept-id",
      "direction": "prerequisite_of" | "dependent_on",
      "confidence": 0.0-1.0
    }
  ],
  "suggestedDescription": "1-2 sentence description of the new concept",
  "suggestedDifficultyTier": 1 | 2 | 3,
  "suggestedKeyTerms": ["term1", "term2", "term3"]
}

RULES:
- Only connect to concepts that have a clear learning relationship
- Prefer 1-3 connections (not every concept)
- Higher confidence means stronger pedagogical relationship
- If the new concept is foundational, it should be prerequisite_of advanced concepts
- If the new concept is advanced, existing foundations should be prerequisite_of it
- The resulting graph must remain a DAG (no cycles)`;
}
```

### Node Position Transition Animation
```typescript
// When positions change after recompute, animate nodes to new positions
// using framer-motion (already in project)
import { motion } from "framer-motion";

// In the React Flow node rendering, wrap position updates with:
const animatedNodes = flowNodes.map((node) => ({
  ...node,
  // React Flow uses absolute positioning; use CSS transition on the
  // .react-flow__node wrapper for smooth movement
  style: {
    ...node.style,
    transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
  },
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| dagre hierarchical layout | d3-force + forceRadial | This phase | Organic web layout instead of flowchart |
| Fixed Top/Bottom handles | Multi-directional handles | This phase | Edges can approach from any direction |
| stroke-dasharray edge animation | SVG animateMotion particles | This phase | Better performance, richer visual |
| Arrowhead edge markers | Particle flow direction | This phase | Direction communicated by motion, not markers |
| System-only node addition | User-initiated custom nodes | This phase | Users can extend their knowledge graph |

**Deprecated/outdated:**
- `computeDAGLayout()` in graphValidator.ts: Will be superseded by `computeForceLayout()` in forceLayout.ts. The old function should be removed or kept only as a fallback.
- `dagre` npm package: Can be removed from dependencies after migration if no other code uses it. Currently listed in package.json but the project's graphValidator.ts uses a custom implementation, not dagre directly.
- `@types/dagre` devDependency: Can be removed along with dagre.

## Open Questions

1. **Node size awareness in forceCollide**
   - What we know: `forceCollide` needs a radius. ConceptNode has `minWidth: 130, maxWidth: 200` and padding.
   - What's unclear: Exact pixel dimensions vary by text length. Need to decide on a fixed collision radius or compute per-node.
   - Recommendation: Use a fixed collision radius of ~75 (half the average node width + padding). Good enough for aesthetic purposes.

2. **Edge path routing around nodes**
   - What we know: User wants "organic splines that avoid crossing other nodes where possible." The smart-edge library (A* pathfinding) was archived. getBezierPath gives smooth curves but doesn't route around nodes.
   - What's unclear: Whether simple higher-curvature bezier paths will look sufficiently organic without explicit node avoidance.
   - Recommendation: Start with `getBezierPath` with `curvature: 0.4-0.5` for organic feel. The force-directed layout naturally spaces nodes, reducing crossing. If crossings are still problematic, implement a lightweight control-point offset that pushes bezier control points away from nearby nodes (simpler than full A* pathfinding).

3. **depthTier for custom nodes**
   - What we know: LLM will suggest a `suggestedDifficultyTier` for custom nodes. This maps to forceRadial radius.
   - What's unclear: Whether to trust LLM tier assignment or compute from graph topology (max depth of prerequisites + 1).
   - Recommendation: Use LLM suggestion, but clamp to [1, max_existing_tier + 1]. Validate that it doesn't contradict inferred edge directions.

4. **Dagre package removal timing**
   - What we know: `dagre` is in package.json dependencies but the actual layout in graphValidator.ts is a custom implementation, not using dagre API.
   - What's unclear: Whether any other code imports dagre.
   - Recommendation: Search codebase for dagre imports. If only unused, remove in this phase to clean up.

## Sources

### Primary (HIGH confidence)
- [d3-force simulation API](https://d3js.org/d3-force/simulation) - Simulation lifecycle, tick, alpha, synchronous execution pattern
- [d3-force many-body API](https://d3js.org/d3-force/many-body) - forceManyBody strength, theta, distanceMin/Max parameters
- [d3-force position API](https://d3js.org/d3-force/position) - forceRadial, forceX, forceY with per-node accessor functions
- [d3-force link API](https://d3js.org/d3-force/link) - forceLink id, distance, strength, iterations parameters
- [React Flow Custom Edges](https://reactflow.dev/learn/customization/custom-edges) - Custom edge component structure, BaseEdge, path utilities
- [React Flow Animating Edges](https://reactflow.dev/examples/edges/animating-edges) - SVG animateMotion pattern for particle animation
- [React Flow getBezierPath](https://reactflow.dev/api-reference/utils/get-bezier-path) - Bezier path computation with curvature parameter

### Secondary (MEDIUM confidence)
- [d3-force npm package](https://www.npmjs.com/package/d3-force) - Version 3.0.0, standalone ES module package
- [react-flow-smart-edge](https://github.com/tisoap/react-flow-smart-edge) - A* pathfinding for node avoidance (archived Dec 2025, not recommended)
- [React Flow Handles](https://reactflow.dev/learn/customization/handles) - connectionMode="loose", multi-directional handle setup

### Tertiary (LOW confidence)
- [React Flow edge animation performance](https://dev.to/route06/tuning-edge-animations-in-reactflow-for-optimal-performance-3g32) - stroke-dasharray performance issues and animateMotion alternative

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - d3-force is the definitive solution for force-directed layout in JS. API is stable (v3.0.0, unchanged for years). React Flow custom edges are well-documented.
- Architecture: HIGH - Backend computation pattern is straightforward (synchronous d3-force + DB persist). Existing GraphMembership.positionX/Y schema is ready. All code touchpoints identified.
- Pitfalls: HIGH - d3-force mutation behavior, tick count, handle direction issues are well-known. Performance characteristics verified from official docs.
- Edge rendering: MEDIUM - Particle animation with animateMotion is proven, but organic spline routing around nodes is an open question. Starting with simple curvature is recommended over complex pathfinding.
- Custom node addition: MEDIUM - LLM edge inference is novel (no existing pattern in codebase). Prompt design and validation logic need careful implementation.

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable libraries, no expected breaking changes)
