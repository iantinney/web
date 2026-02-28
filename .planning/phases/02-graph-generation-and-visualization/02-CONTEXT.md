# Phase 02: Graph Generation & Visualization - Context

**Gathered:** 2026-02-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the hero feature: users provide learning materials via Chat, system generates a concept prerequisite DAG using MiniMax, detect and resolve cycles, and visualize in React Flow with proficiency coloring. Users can edit concept details, practice targeted concepts, and see graph update live with proficiency changes.

</domain>

<decisions>
## Implementation Decisions

### Study Plan Creation (Chat-Driven)

- **Input methods:** Both text paste and file upload (accepts multiple materials per plan)
- **File types:** Whatever's easiest and reasonable (Claude's discretion on implementation)
- **UI location:** Chat tab (primary resource-gathering interface)
- **Clarifying context:** Chat asks about prior knowledge, depth of study, intent for studying, and general background
- **Reclarification:** Users can modify answers during context gathering (iterative, not linear)
- **Generation trigger:** User approves concept preview showing all intended concepts
- **Concept preview format:** Shows difficulty levels and estimated learning time
- **Loading feedback:** Progress updates in Chat ("Generating concepts... Building DAG... Done!")
- **Later modifications:** Users can regenerate/modify the graph after initial creation

### DAG Generation & Structure

- **Concept node data:** Name, description, key terms, difficulty tier (1-3 scale)
- **Prerequisite edges:** Hard prerequisites + helpful context (not just strict requirements)
- **Cycle handling:** Auto-break cycles using Kahn's algorithm; log/show user which edges were removed
- **Initial proficiency:** Inferred from stated prior knowledge (user's description of background)
- **JSON reliability:** MiniMax output parsed leniently (strip markdown, handle trailing commas); lenient validation to catch reasonable variations
- **Proficiency threshold for mastery:** >0.8 (tunable later based on education research)

### Graph Visualization (React Flow)

- **Node styling:** Claude's discretion (design practical, clean appearance)
- **Proficiency coloring:** Gradient scale from red (0% proficiency) to green (100%)
- **Layout algorithm:** dagre auto-layout positioned once; canvas is fixed size (user scrolls/pans to navigate)
- **Edge rendering:** Claude's discretion (keep clear without visual overwhelm; distinguish hard vs helpful if practical)

### Node Interactions & Detail Panel

- **Detail panel content:**
  - Concept name, description, key terms
  - Current proficiency score, attempt count, last practiced date
  - List of prerequisite concepts and dependent concepts
  - *Note: Research references/links deferred to later iterations*
- **Practice CTA behavior:** Claude's discretion (pick smoothest UX based on Learn tab architecture)
- **Node editing:** Edit mode available; users can rename/refine concept details after generation
- **Graph updates:** Live updates as proficiency changes (from Learn tab practice sessions)

### Claude's Discretion

- Node styling design (practical, modern appearance)
- Edge rendering clarity (distinguish prerequisites vs helpful context if needed)
- Practice CTA flow (navigate to Learn tab vs in-place session vs other)
- Exact proficiency gradient color scheme
- How to handle edge removal UX (toast, log in chat, etc.)

</decisions>

<specifics>
## Specific Ideas

- Graph should feel responsive and exploratory — clicking nodes reveals context, not overwhelming on first view
- Lesson plan preview (concept list before approval) should be clear and scannable
- Users appreciate seeing why edges exist (helps them understand prerequisites)
- The gradient proficiency coloring gives immediate visual feedback on progress across the DAG

</specifics>

<deferred>
## Deferred Ideas

- Research references/documentation links in node detail panels — Phase 2+ feature
- Scheduled spaced repetition reviews — Phase 4+
- Advanced DAG refinement UI (reorder prerequisites, add/remove concepts) — Post-MVP
- Bookmarking or favorite concepts — Backlog
- Exporting DAG as image/PDF — Backlog

</deferred>

---

*Phase: 02-graph-generation-and-visualization*
*Context gathered: 2026-02-24*
