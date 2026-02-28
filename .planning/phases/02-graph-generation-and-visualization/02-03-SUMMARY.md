---
phase: "02"
plan: "02-03"
name: "React Flow Visualization, Node Detail Panel & Edge Types"
subsystem: "graph-visualization"
status: "complete"
completed: "2026-02-24"
duration: "~3 minutes"
tags: ["react-flow", "react-memo", "zustand", "next-api", "graph-ui"]

dependency-graph:
  requires:
    - "02-01: MiniMax graph pipeline (provides conceptNodes/conceptEdges with edgeType)"
    - "02-02: Chat state machine (provides setActiveTab for Practice CTA)"
  provides:
    - "Performant React.memo custom node component (ConceptNode.tsx)"
    - "Visual edge type differentiation (solid prerequisite vs dashed helpful)"
    - "Interactive node click → NodeDetailPanel"
    - "Full concept metadata panel (proficiency, prereqs, dependents, edit mode)"
    - "PATCH /api/study-plans/[id]/concepts/[conceptId] for inline edits"
    - "targetConceptId in Zustand for Phase 03 practice routing"
  affects:
    - "03-xx: Learn tab can read targetConceptId to start practice for specific concept"

tech-stack:
  added: []
  patterns:
    - "React.memo for ReactFlow custom nodes (prevents re-render on graph pan/zoom)"
    - "nodeTypes defined at module scope (not inside component) to prevent identity change"
    - "useCallback for onNodeClick to prevent ReactFlow edge re-render"
    - "store.getState() in event handlers (avoids stale closure from hook destructuring)"
    - "Optimistic store update on PATCH success (setConceptNodes map-replace)"

key-files:
  created:
    - "adaptive-tutor/src/components/graph/ConceptNode.tsx"
    - "adaptive-tutor/src/components/graph/NodeDetailPanel.tsx"
    - "adaptive-tutor/src/app/api/study-plans/[id]/concepts/[conceptId]/route.ts"
  modified:
    - "adaptive-tutor/src/app/(tabs)/graph/page.tsx"
    - "adaptive-tutor/src/lib/store.ts"

decisions:
  - id: "D-02-03-1"
    decision: "nodeTypes defined at module scope in ConceptNode.tsx, not inside GraphPage"
    rationale: "React Flow requires stable nodeTypes reference; defining inside component causes full graph re-mount on every render"
    alternatives: "useMemo in GraphPage (acceptable but adds noise)"
  - id: "D-02-03-2"
    decision: "Panel closes on Escape key only, not background click"
    rationale: "Background clicks interfere with ReactFlow pan/drag; Escape is the standard keyboard shortcut"
    alternatives: "Overlay backdrop (would block graph interaction)"
  - id: "D-02-03-3"
    decision: "stopPropagation on NodeDetailPanel click events"
    rationale: "Without it, clicks on the panel would trigger ReactFlow's onNodeClick and re-select nodes"
    alternatives: "CSS pointer-events:none on canvas behind panel (would break zoom/pan there)"
  - id: "D-02-03-4"
    decision: "store.getState() in handlePractice instead of hook-destructured setter"
    rationale: "Event handlers in React can have stale closures; getState() always gets current state"
    alternatives: "useCallback with setter in dep array"
  - id: "D-02-03-5"
    decision: "ConceptEdge.edgeType kept as required string (not made optional)"
    rationale: "DB has @default('prerequisite') so field is always populated; optional would be misleading. edge.edgeType ?? 'prerequisite' fallback in flowEdges handles runtime edge cases"
    alternatives: "Make optional per plan spec (unnecessary given DB default)"
---

# Phase 02-03: React Flow Visualization, Node Detail Panel & Edge Types Summary

**One-liner:** React.memo ConceptNode extracted + edge type visual differentiation (solid/dashed) + right-side NodeDetailPanel with full metadata, edit mode, and Practice CTA routing to Learn tab.

## What Was Built

### ConceptNode.tsx
Extracted the custom node component from `graph/page.tsx` into a dedicated file:
- `ConceptNodeComponent` function wrapped with `React.memo` → `export const ConceptNode`
- `colorMap` and proficiency display logic preserved
- Added hover glow effect via `onMouseEnter`/`onMouseLeave` inline style (`boxShadow: 0 0 12px 2px ${colors.border}`)
- `nodeTypes = { concept: ConceptNode }` exported at module scope (critical for ReactFlow performance)

### graph/page.tsx
Updated the graph page to integrate the extracted component and add interactivity:
- Imports `nodeTypes` from `ConceptNode.tsx` (no longer defined inline)
- `selectedConcept: ConceptNode | null` state with `setSelectedConcept`
- `onNodeClick = useCallback((_event, node) => setSelectedConcept(conceptNodes.find(c => c.id === node.id)))` passed to `<ReactFlow>`
- `flowEdges` useMemo now reads `edge.edgeType` to render:
  - `"prerequisite"` → solid, `strokeWidth: 2`, `stroke: var(--border)`
  - `"helpful"` → dashed (`strokeDasharray: "5,5"`), `strokeWidth: 1`, `opacity: 0.5`
  - `animated: true` removed from all edges
- Escape key `useEffect` to close panel
- Conditional `<NodeDetailPanel>` render when `selectedConcept !== null`

### NodeDetailPanel.tsx
Full-featured right-side concept detail panel:
- **Layout:** `absolute right-0 top-0 h-full w-80 z-20`, scroll-overflow, border-left
- **Header:** concept name, tier badge (Intro/Intermediate/Advanced with colors), edit button, close button
- **Proficiency section:** colored horizontal bar, percentage, Estimated/Tested label, attempt count, last practiced date
- **Description:** text display + edit-mode textarea
- **Key Terms:** pill badges from parsed `keyTermsJson` + edit-mode comma-separated input
- **Prerequisites:** edges where `toNodeId === concept.id` → clickable list to navigate to that concept
- **Dependents ("Unlocks"):** edges where `fromNodeId === concept.id` → clickable list
- **Practice CTA:** sticky bottom button — calls `store.getState().setTargetConceptId(concept.id)` then `setActiveTab("learn")`
- **Edit mode:** name input, description textarea, key terms CSV input → `PATCH /api/study-plans/${studyPlanId}/concepts/${id}` → optimistic Zustand store update

### PATCH /api/study-plans/[id]/concepts/[conceptId]/route.ts
New REST endpoint for inline concept editing:
- Validates `conceptId` belongs to the study plan via `prisma.conceptNode.findFirst`
- Accepts `name` (string), `description` (string), `keyTermsJson` (string JSON or array)
- Arrays are `JSON.stringify`-d before storage
- Returns `{ concept: updatedConcept }`

### store.ts
Added practice targeting:
- `targetConceptId: string | null` (initial: null)
- `setTargetConceptId: (id: string | null) => void`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `setActiveTab` from hook destructuring in NodeDetailPanel**

- **Found during:** Task 2 implementation
- **Issue:** `setActiveTab` was destructured from `useAppStore()` but then `useAppStore.getState().setActiveTab()` was used in event handler (correct pattern for avoiding stale closures) — redundant destructure would cause TypeScript unused variable warning
- **Fix:** Removed `setActiveTab` from hook destructure; kept only `setConceptNodes` and `conceptNodes`
- **Files modified:** `NodeDetailPanel.tsx`
- **Commit:** 9b3caf9

**2. [Rule 2 - Missing Critical] Added `stopPropagation` on NodeDetailPanel root div**

- **Found during:** Task 2 implementation
- **Issue:** Without stopping propagation, clicking inside the panel would bubble to ReactFlow's click handler and re-trigger `onNodeClick`
- **Fix:** Added `onClick={stopPropagation}` to panel root div
- **Files modified:** `NodeDetailPanel.tsx`
- **Commit:** 9b3caf9

**3. [Design] ConceptEdge.edgeType kept as required (not made optional)**

- **Found during:** Task 1 — types.ts audit
- **Issue:** Plan said to add `edgeType?: string` (optional) but `types.ts` already had `edgeType: string` (required), matching DB schema which has `@default("prerequisite")`
- **Decision:** Kept as required. Added `edge.edgeType ?? "prerequisite"` fallback in `flowEdges` useMemo for belt-and-suspenders safety
- **Files modified:** None (no change needed)

## Verification Results

- `npx tsc --noEmit` passes with zero errors
- `ConceptNode.tsx` exports `React.memo`-wrapped component and `nodeTypes`
- `graph/page.tsx` imports `nodeTypes` from `ConceptNode.tsx`, no inline component
- Edge rendering distinguishes prerequisite (solid sw2) from helpful (dashed sw1 0.5 opacity)
- `NodeDetailPanel.tsx` implements all 8 sections per spec
- PATCH endpoint validates ownership, accepts array/string keyTermsJson
- `targetConceptId` and `setTargetConceptId` in Zustand store

## Next Phase Readiness

**Phase 02-04+ / Phase 03 can proceed because:**
- `targetConceptId` in Zustand is ready for Learn tab to read and start practice for specific concept
- `setActiveTab("learn")` from Practice CTA will route user to the correct tab
- Graph visualization is feature-complete for Phase 2 scope
- PATCH endpoint enables concept library curation during study sessions

**Open items for later phases:**
- No loading/skeleton state on NodeDetailPanel when saving (acceptable for demo)
- `nextDue` and spaced repetition data not surfaced in panel yet (Phase 3 concern)
- MiniMap node colors don't reflect proficiency (cosmetic, not blocking)
