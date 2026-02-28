# Phase 9: Web-style Force-Directed Graph Layout via Backend Positioning - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the current Dagre hierarchical DAG layout with a force-directed web-style layout computed on the backend (d3-force in Node.js). Positions stored in GraphMembership (positionX, positionY). Includes new edge rendering with particle stream animations, and user-initiated custom node addition with LLM edge inference. The graph should feel like a neural network — alive, organic, and multi-directional — rather than a top-down flowchart.

</domain>

<decisions>
## Implementation Decisions

### Web aesthetic
- **Semi-structured force-directed layout**: Pure force-directed with gravity pulling prerequisites toward center and advanced concepts outward. Organic but with implicit directionality — not a hierarchy, not fully random.
- **Neural network metaphor**: Nodes as synapses, edges as axons with traveling pulses. The graph should feel alive and biological — a "growing brain."
- **Adaptive spacing**: Spacing scales with graph size — small graphs are spacious, large graphs compress to keep everything visible. Avoids fixed spacing.
- **Fresh layout on migration**: Compute entirely new positions from scratch. No seeding from old Dagre positions. Clean break from flowchart look.

### Edge rendering
- **Organic splines**: Custom curved edge paths that avoid crossing other nodes where possible. Most organic visual.
- **Particle stream for direction**: Multiple tiny particles flowing along edges from prerequisite to dependent. Denser flow for stronger connections (higher source proficiency). This replaces traditional arrowheads — direction is communicated through particle flow.
- **Proficiency-driven appearance**: Edge opacity/brightness reflects source node proficiency. Mastered prerequisites glow brighter. Particle flow speed matches mastery level.
- **Locked edge treatment**: Edges to locked nodes are dim + dashed. No particle flow. Visually communicates "not yet accessible" while showing the path exists.
- **Use frontend-design skill** for all visual/animation implementation to ensure distinctive, production-grade aesthetics.

### Layout recomputation
- **On graph mutation only**: Recompute when nodes are added/removed (concept insertion, gap proposal, custom node addition). Positions are cached in DB and served as-is for normal loads.
- **Full recompute on insertion**: Run the full force-directed algorithm on all nodes after any insertion. Ensures globally optimal layout. Existing nodes may shift slightly to accommodate new ones.
- **d3-force algorithm**: Use d3-force library running in Node.js on the backend. Supports charge repulsion, link attraction, centering, and custom forces for the prerequisite-gravity constraint.

### Custom node addition
- **Floating + button**: A '+' FAB in the graph view. Tap opens a small form overlay where user types the concept name.
- **Auto-connect via LLM**: After user enters concept name, LLM infers which existing nodes to connect to. Node appears in the web immediately with edges — no confirmation dialog. User can edit connections later via NodeDetailPanel.
- **On-demand question generation**: Questions generated only when user first tries to practice the concept. Saves LLM calls for concepts user may never practice.

### Claude's Discretion
- d3-force simulation parameters (charge strength, link distance, gravity force)
- Particle stream animation implementation (CSS vs canvas vs SVG)
- Organic spline path computation approach
- Form overlay design for custom node addition
- LLM prompt design for edge inference
- Transition animation when nodes settle into new positions after recompute

</decisions>

<specifics>
## Specific Ideas

- "Presents as a web rather than a flowchart — better for aesthetics but also for the idea of infinite learning across different paths"
- "Do this through the backend, not front end" — layout computation happens server-side in Node.js, positions stored in DB
- Neural network feel: nodes as synapses, particle streams as signals traveling along axons
- Prerequisite direction shown through particle flow direction, not arrows or top-down hierarchy
- The existing ConceptNode glow effects (breathing aura for mastered, shimmer for untested) should complement the neural network aesthetic

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-web-style-force-directed-graph-layout-via-backend-positioning*
*Context gathered: 2026-02-27*
