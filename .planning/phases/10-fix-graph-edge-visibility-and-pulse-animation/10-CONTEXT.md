# Phase 10: Fix graph edge visibility and pulse animation - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the graph edge rendering so edges are clearly visible with animated pulse dots. Edges are currently invisible or nearly invisible due to React Flow's SVG edge layer rendering below the HTML node layer. The edge visual style must match the intro animation's neon green aesthetic.

</domain>

<decisions>
## Implementation Decisions

### Edge visual style
- Always green (#00d2a0) — same color as the intro animation edges
- Subtle but clear base line — visible but doesn't dominate over nodes
- Match intro animation exactly: ~2px stroke width, rgba(0,210,160,0.3) base opacity, neon glow via drop-shadow
- Locked edges: dim dashed gray, clearly different from active edges

### Pulse animation behavior
- Flowing dash dots (multiple small dots continuously streaming along edge via stroke-dasharray)
- Pulse speed scales with proficiency: slow at low proficiency, faster at high proficiency
- Bright with neon glow — dots clearly stand out from base line, visible drop-shadow like intro animation
- No pulse on locked edges — static dashed gray, clearly dormant

### Edge-node overlap handling
- Edges should render behind node rectangles where they overlap
- But edges MUST be visible in open space between nodes
- The core technical problem: React Flow renders all edges in a single SVG layer below the HTML node layer, making all edges invisible behind opaque nodes
- Claude's discretion on technical approach — just make edges visible AND looking clean

### Claude's Discretion
- Technical approach to solve the visibility problem (z-index, clip-path, hybrid rendering, etc.)
- Exact stroke-dasharray values for the pulse dot pattern
- Whether to use BaseEdge from React Flow or raw SVG paths
- Any CSS overrides needed on React Flow's internal structure

</decisions>

<specifics>
## Specific Ideas

- "Green, exactly like how the edges look in the intro animation" — IntroAnimation.tsx is the visual reference
- Intro animation uses: stroke rgba(0,210,160,0.3), strokeWidth 2, pathLength animation for draw-in, motion.circle for single traveling pulse with drop-shadow glow filter
- The graph version uses flowing dash dots instead of single traveling dot, but the color/glow/thickness should match
- Current intro animation code in `src/components/IntroAnimation.tsx` lines 128-183 is the canonical visual reference

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-fix-graph-edge-visibility-and-pulse-animation*
*Context gathered: 2026-02-27*
