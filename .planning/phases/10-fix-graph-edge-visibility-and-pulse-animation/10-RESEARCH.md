# Phase 10: Fix Graph Edge Visibility and Pulse Animation - Research

**Researched:** 2026-02-27
**Domain:** React Flow v12 edge rendering, SVG z-ordering, CSS stacking contexts
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Edge color: always green (#00d2a0) matching intro animation
- Base line: ~2px stroke width, rgba(0,210,160,0.3) base opacity, neon glow via drop-shadow
- Locked edges: dim dashed gray, clearly different from active edges
- Pulse animation: flowing dash dots (multiple small dots streaming via stroke-dasharray)
- Pulse speed scales with proficiency: slow at low, faster at high
- Bright dots with neon glow, visible drop-shadow like intro animation
- No pulse on locked edges (static dashed gray)
- Edges render behind node rectangles where they overlap
- Edges MUST be visible in open space between nodes

### Claude's Discretion
- Technical approach to solve the visibility problem (z-index, clip-path, hybrid rendering, etc.)
- Exact stroke-dasharray values for the pulse dot pattern
- Whether to use BaseEdge from React Flow or raw SVG paths
- Any CSS overrides needed on React Flow's internal structure

### Deferred Ideas (OUT OF SCOPE)
None
</user_constraints>

## Summary

The core bug is that React Flow renders edges in an SVG layer that paints BELOW the HTML node layer, causing all edges to be hidden behind ConceptNode's opaque backgrounds (`#141922` base color). Previous fix attempts (increasing opacity/stroke-width, CSS z-index on `.react-flow__edges`, raw SVG `<path>` elements, BaseEdge) failed or produced incorrect results because they didn't address the fundamental z-ordering problem.

The fix is straightforward and officially documented: **set `zIndex` on each edge object** (or via `defaultEdgeOptions`). React Flow v12 renders each edge as an individual `<svg style={{ zIndex }}>` element and each node as a `<div style={{ zIndex }}>` element within the same stacking context. By default both have `zIndex: 0`, and since nodes render later in DOM order, they paint over edges. Setting edge `zIndex` to any value > 0 (e.g., `1`) makes edges render above nodes. This is confirmed by React Flow maintainer Moritz Klack in GitHub issue #4729.

After fixing visibility, the ParticleEdge component needs visual refinement to match the IntroAnimation reference: neon green color (#00d2a0), drop-shadow glow filter, flowing dash-dot animation via `stroke-dasharray` + `stroke-dashoffset` CSS animation, and proficiency-scaled speed.

**Primary recommendation:** Add `zIndex: 1` to every edge in `flowEdges` mapping in `graph/page.tsx`, then refine ParticleEdge styling to match the IntroAnimation's neon aesthetic.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | ^12.10.1 | Graph visualization framework | Already installed, provides ReactFlow, BaseEdge, getStraightPath |
| React | 19 | UI framework | Already installed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| framer-motion | (installed) | Animation library | Already used in IntroAnimation; NOT needed for edge pulse — pure CSS animation is sufficient and more performant for always-on effects |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS stroke-dasharray animation | SVG `<animateMotion>` | animateMotion was used in Phase 9's ParticleEdge but is harder to style with glow/filters; CSS keyframes are simpler and match the current globals.css approach |
| BaseEdge component | Raw SVG `<path>` | BaseEdge adds React Flow's interaction path (click hitbox), but raw paths are fine since edges are non-interactive in this app |
| `defaultEdgeOptions={{ zIndex: 1 }}` | Per-edge `zIndex` property | defaultEdgeOptions is simpler but provides less control; per-edge is slightly more explicit |

**Installation:**
No new packages needed.

## Architecture Patterns

### React Flow v12 Internal Rendering Architecture (CRITICAL)

The Viewport renders children in this exact DOM order:
```
div.react-flow__viewport (z-index: 2, creates stacking context)
  |-- div.react-flow__edges (position: absolute, NO z-index)
  |     |-- svg (style={{ zIndex }})         <-- Edge 1
  |     |-- svg (style={{ zIndex }})         <-- Edge 2
  |     |-- ...
  |-- svg.react-flow__connectionline
  |-- div.react-flow__edgelabel-renderer
  |-- div.react-flow__nodes (position: absolute via inline style, NO z-index)
        |-- div (style={{ zIndex: internals.z }})  <-- Node 1
        |-- div (style={{ zIndex: internals.z }})  <-- Node 2
        |-- ...
```

**Key insight:** `.react-flow__edges` and `.react-flow__nodes` do NOT have z-index set, so they do NOT create their own stacking contexts. Individual edge SVGs and node divs compete for z-ordering within the viewport stacking context. Since `.react-flow__nodes` is later in DOM order, nodes with `zIndex: 0` paint over edges with `zIndex: 0`.

**Source:** Verified by reading `node_modules/@xyflow/react/dist/esm/index.mjs` lines 2903 (EdgeWrapper SVG), 2228-2229 (NodeWrapper div), 3122 (GraphView children order), and `node_modules/@xyflow/react/dist/style.css`.

### Pattern 1: Edge z-index elevation
**What:** Set `zIndex` property on edge objects to render them above nodes
**When to use:** When nodes have opaque backgrounds that hide edges
**Example:**
```typescript
// In graph/page.tsx flowEdges mapping
return {
  id: edge.id,
  source: edge.fromNodeId,
  target: edge.toNodeId,
  type: "particle",
  zIndex: 1,  // <-- This single property fixes visibility
  sourceHandle,
  targetHandle,
  data: { sourceProficiency, isLocked: targetLocked },
};
```
**Source:** GitHub issue xyflow/xyflow#4729 — maintainer Moritz Klack confirms: "By default all edges are rendered below nodes. You can move them to the foreground by adjusting their zIndex"

### Pattern 2: Default node z-index calculation
**What:** React Flow calculates node z-index via `calculateZ()`: `zIndex = (node.zIndex ?? 0) + (node.selected ? selectedNodeZ : 0)`
**When to use:** Understanding why `zIndex: 1` on edges works — unselected nodes have z-index `0`, so edge `zIndex: 1` renders above them
**Caveat:** Selected nodes get elevated z-index (default +1000), so edges will correctly render below selected/dragged nodes, which is desirable behavior
**Source:** `@xyflow/system/dist/esm/index.mjs` line 1701-1707

### Pattern 3: ParticleEdge with BaseEdge + overlay path
**What:** Use BaseEdge for the base line (gets React Flow interaction handling) and a separate raw `<path>` for animated pulse dots
**When to use:** When you need both a static base line and an animated overlay
**Example:**
```typescript
// Current ParticleEdge already uses this pattern correctly:
<>
  <BaseEdge path={edgePath} style={{ stroke, strokeWidth }} {...rest} />
  <path d={edgePath} fill="none" stroke="..." strokeDasharray="4 22"
    style={{ animation: `particle-flow ${duration}s linear infinite`,
             filter: "drop-shadow(0 0 4px rgba(0, 210, 160, 0.6))" }} />
</>
```

### Pattern 4: IntroAnimation visual reference (canonical style)
**What:** The IntroAnimation in `src/components/IntroAnimation.tsx` defines the target aesthetic
**Visual spec from IntroAnimation (lines 128-183):**
- Edge path: `stroke="rgba(0, 210, 160, 0.3)"`, `strokeWidth={2}`, `strokeLinecap="round"`
- SVG filter glow: `feGaussianBlur stdDeviation="6"` composited over source
- Pulse dot: `fill="#00d2a0"`, `r={5}`, separate stronger glow filter (`stdDeviation="8"`)
- Color: `#00d2a0` (neon green)

**For ParticleEdge adaptation:**
- Base line: match `rgba(0, 210, 160, 0.3)` stroke with `strokeWidth: 2`
- Pulse dots: use `stroke-dasharray` with `rgba(0, 210, 160, 0.9)` and `drop-shadow` filter
- Glow: `filter: drop-shadow(0 0 4px rgba(0, 210, 160, 0.6))` on pulse path

### Anti-Patterns to Avoid
- **CSS z-index on `.react-flow__edges` container:** Does not work because the container itself is not what needs z-index — individual edge SVGs inside it already have z-index, the issue is the DEFAULT value is 0
- **Wrapping edges in HTML divs via EdgeLabelRenderer:** Overcomplicates the solution and breaks React Flow's edge interaction model
- **Removing opaque backgrounds from ConceptNode:** Would fix visibility but destroy the node visual design
- **Using `pointer-events: none` on nodes:** Doesn't affect paint order, only interaction
- **Setting very high z-index (e.g., 9999) on edges:** Unnecessary and breaks selection elevation behavior (selected nodes should appear above edges)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Edge z-ordering | CSS hacks on React Flow internals | `zIndex` property on Edge objects | Official API, maintainer-recommended, single property |
| SVG path calculation | Manual coordinate math | `getStraightPath` from @xyflow/react | Handles edge cases, coordinate transforms |
| Edge interaction hitbox | Manual event handling | `BaseEdge` component | Provides invisible wide interaction path automatically |
| Glow effect | Canvas-based rendering | CSS `drop-shadow` filter on SVG | GPU-accelerated, no JS overhead, already works in current code |

**Key insight:** The visibility bug is a one-line fix (`zIndex: 1` on edges). The rest of the work is visual polish to match the IntroAnimation reference.

## Common Pitfalls

### Pitfall 1: Edges still invisible after setting zIndex
**What goes wrong:** Setting zIndex on the `style` object instead of the Edge object itself
**Why it happens:** Edge `style.zIndex` applies to elements INSIDE the edge SVG wrapper, not the wrapper itself. Only `edge.zIndex` (top-level property) controls the SVG wrapper's z-index
**How to avoid:** Set `zIndex: 1` as a top-level property in the edge object, NOT inside `style` or `data`
**Warning signs:** Edge component renders but is still invisible behind nodes

### Pitfall 2: Pulse animation stops when edge path changes
**What goes wrong:** CSS animation resets when React re-renders the edge
**Why it happens:** If the `key` or `d` attribute changes, the browser restarts the animation
**How to avoid:** Use `React.memo` on ParticleEdge (already done), ensure stable path calculation
**Warning signs:** Dots "jump" to start position when viewport changes

### Pitfall 3: Hover focus effect overrides edge zIndex
**What goes wrong:** The existing hover effect in `graph/page.tsx` (lines 166-207) sets `edge.style.opacity` but could inadvertently affect z-index
**Why it happens:** When `setEdges` remaps flowEdges with style overrides, if the `zIndex` is only in the original flowEdges array, the override might not preserve it
**How to avoid:** Ensure `zIndex: 1` is set in the base `flowEdges` mapping (the useMemo), not as a one-time override that gets lost during hover updates
**Warning signs:** Edges visible initially, then disappear after first hover interaction

### Pitfall 4: drop-shadow filter performance with many edges
**What goes wrong:** CSS `drop-shadow` on animated elements can cause jank with 20+ edges
**Why it happens:** SVG filters trigger GPU composition for each animated frame
**How to avoid:** Use `will-change: filter` or limit filter complexity. For this app (typically <30 edges), this is unlikely to be a problem
**Warning signs:** Frame drops during graph interaction with large concept graphs

### Pitfall 5: stroke-dashoffset animation value mismatch
**What goes wrong:** Dots appear to move backwards or at wrong speed
**Why it happens:** The `stroke-dashoffset` target value must match the `stroke-dasharray` pattern length. Current code: `dasharray="4 22"` with `dashoffset: -26` — correct because 4+22=26
**How to avoid:** Always set `stroke-dashoffset` target to `-(dash + gap)` or a multiple of it
**Warning signs:** Dots don't flow smoothly or appear to "pop"

## Code Examples

### Fix 1: Add zIndex to edge objects (THE CORE FIX)

```typescript
// Source: graph/page.tsx, flowEdges useMemo
// Add zIndex: 1 to each edge object
return {
  id: edge.id,
  source: edge.fromNodeId,
  target: edge.toNodeId,
  type: "particle",
  zIndex: 1,  // Render edges above nodes (nodes default to zIndex: 0)
  sourceHandle,
  targetHandle,
  data: {
    sourceProficiency,
    isLocked: targetLocked,
  },
};
```

### Fix 2: Preserve zIndex during hover effect

```typescript
// Source: graph/page.tsx, hover focus useEffect (line ~195)
// When remapping edges for hover dimming, preserve zIndex
setEdges(
  flowEdges.map((edge) => ({
    ...edge,  // This already spreads zIndex from flowEdges
    style: {
      opacity:
        connectedIds.has(edge.source) && connectedIds.has(edge.target)
          ? 1
          : 0.06,
      transition: "opacity 0.3s ease",
    },
  }))
);
```
Note: The `...edge` spread already preserves `zIndex` since it's a top-level edge property, not inside `style`. This should work as-is.

### Fix 3: Refined ParticleEdge matching IntroAnimation style

```typescript
// Source: ParticleEdge.tsx
// Locked edge — dim dashed gray
if (isLocked) {
  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: "rgba(100, 100, 140, 0.15)",
        strokeWidth: 1,
        strokeDasharray: "4 6",
      }}
      {...rest}
    />
  );
}

// Active edge — neon green base + animated pulse dots
const duration = 3 - proficiency * 1.8; // 3s at 0% → 1.2s at 100%

return (
  <>
    {/* Base line — subtle neon green, matching IntroAnimation */}
    <BaseEdge
      path={edgePath}
      style={{
        stroke: "rgba(0, 210, 160, 0.3)",  // Match IntroAnimation exactly
        strokeWidth: 2,                      // Match IntroAnimation exactly
        strokeLinecap: "round",
      }}
      {...rest}
    />
    {/* Pulse dots — animated green dots traveling along the edge */}
    <path
      d={edgePath}
      fill="none"
      stroke="rgba(0, 210, 160, 0.9)"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeDasharray="4 22"
      style={{
        animation: `particle-flow ${duration}s linear infinite`,
        filter: "drop-shadow(0 0 4px rgba(0, 210, 160, 0.6))",
      }}
    />
  </>
);
```

### CSS keyframe (already exists in globals.css)

```css
/* globals.css — already present */
@keyframes particle-flow {
  to { stroke-dashoffset: -26; }
}
```
This animates `stroke-dashoffset` from 0 to -26, causing the dash pattern (4px dot + 22px gap = 26px total) to continuously scroll along the path.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS z-index on `.react-flow__edges` container | `zIndex` property on individual Edge objects | React Flow v12 (2024) | Per-edge z-ordering, no CSS hacks needed |
| `elevateEdgesOnSelect` prop only | `zIndex` + `zIndexMode` + `defaultEdgeOptions` | React Flow 12.x | Full control over edge rendering order |
| Single SVG container for all edges | Individual SVG wrapper per edge | React Flow v10+ | Enables z-index per edge since each SVG is independently positioned |

**Deprecated/outdated:**
- CSS hacks on `.react-flow__edges` z-index: Never worked reliably because the issue is per-element z-index, not container z-index
- `react-flow-smart-edge` package: Solves a different problem (edge routing around nodes), not applicable here

## Open Questions

1. **Selected node z-index interaction**
   - What we know: Selected nodes get z-index +1000, so edges with zIndex:1 will correctly render below selected nodes
   - What's unclear: Whether `elevateEdgesOnSelect` should also be set for polish
   - Recommendation: Skip `elevateEdgesOnSelect` — it would make edges jump above other nodes on click, which is visually distracting. The current behavior (edges always above unselected nodes, below selected nodes) is ideal.

2. **stroke-dasharray tuning**
   - What we know: Current values `4 22` produce small dots with wide spacing. The CONTEXT.md says "flowing dash dots (multiple small dots continuously streaming)"
   - What's unclear: Whether the current spacing is too wide or too narrow for the desired visual effect
   - Recommendation: Start with current values, tune visually. Could try `3 18` for more frequent dots or `5 25` for larger dots.

## Sources

### Primary (HIGH confidence)
- **React Flow source code** (`node_modules/@xyflow/react/dist/esm/index.mjs`) — Verified rendering order, z-index computation, EdgeWrapper SVG structure, NodeWrapper div structure
- **React Flow system** (`node_modules/@xyflow/system/dist/esm/index.mjs`) — Verified `getElevatedEdgeZIndex()` and `calculateZ()` functions
- **React Flow stylesheet** (`node_modules/@xyflow/react/dist/style.css`) — Verified CSS stacking context rules for `.react-flow__edges`, `.react-flow__nodes`, `.react-flow__viewport`
- **GitHub issue xyflow/xyflow#4729** — Maintainer Moritz Klack confirms zIndex fix for opaque backgrounds: https://github.com/xyflow/xyflow/issues/4729
- **GitHub discussion xyflow/xyflow#4285** — Maintainer confirms edge.zIndex attribute controls rendering wrapper: https://github.com/xyflow/xyflow/discussions/4285

### Secondary (MEDIUM confidence)
- **React Flow docs** (reactflow.dev/api-reference/react-flow) — Documents `elevateEdgesOnSelect`, `defaultEdgeOptions`, `zIndexMode` props
- **React Flow docs** (reactflow.dev/api-reference/types/edge) — Documents `zIndex` property on Edge type
- **GitHub issue xyflow/xyflow#1977** — Historical context on z-index stacking behavior evolution

### Tertiary (LOW confidence)
- None — all critical claims verified against source code

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against installed source code
- Architecture: HIGH — verified exact DOM rendering order and CSS stacking context behavior by reading React Flow internals
- Pitfalls: HIGH — pitfalls derived from source code analysis, not just community reports

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable — React Flow internal architecture unlikely to change in minor versions)
