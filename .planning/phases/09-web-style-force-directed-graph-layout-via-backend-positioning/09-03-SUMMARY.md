---
phase: 09-web-style-force-directed-graph-layout-via-backend-positioning
plan: 03
subsystem: api
tags: [custom-concept, llm-edge-inference, force-layout, fab, graph-extension]

# Dependency graph
requires:
  - phase: 09-web-style-force-directed-graph-layout-via-backend-positioning
    provides: "computeForceLayout for graph recompute (plan 01), ParticleEdge + multi-directional handles (plan 02)"
provides:
  - "AddConceptFAB component for user-initiated custom concept addition"
  - "POST /api/study-plans/[id]/concepts/add-custom endpoint with LLM edge inference"
  - "edgeInferencePrompt for LLM-based edge connection inference"
  - "DAG validation with cycle-creating edge removal on custom insertion"
affects: [graph-visualization, knowledge-graph-extension]

# Tech tracking
tech-stack:
  added: []
  patterns: [LLM edge inference with graceful degradation, DAG cycle detection with selective edge removal, on-demand question generation deferral]

key-files:
  created:
    - adaptive-tutor/src/components/graph/AddConceptFAB.tsx
    - adaptive-tutor/src/app/api/study-plans/[id]/concepts/add-custom/route.ts
  modified:
    - adaptive-tutor/src/lib/prompts/index.ts
    - adaptive-tutor/src/app/(tabs)/graph/page.tsx

key-decisions:
  - "On-demand question generation: questions deferred to practice time, not generated at concept creation"
  - "Graceful LLM degradation: concept created with no edges if LLM fails, edgeInferenceError flag returned"
  - "Cycle-creating edges silently removed after DAG validation, request never fails"

patterns-established:
  - "LLM edge inference pattern: prompt with existing concepts, validate response, filter invalid edges, validate DAG"
  - "FAB overlay pattern: glass morphism floating button with animated form overlay, click-outside-to-close"

requirements-completed: [LAYOUT-04]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 9 Plan 03: AddConceptFAB and Custom Concept API Summary

**User-initiated custom concept addition via floating action button with LLM-inferred edges, DAG validation, and force layout recompute**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T07:48:24Z
- **Completed:** 2026-02-27T07:51:51Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created edgeInferencePrompt that instructs LLM to infer prerequisite/dependent relationships between new and existing concepts
- Built AddConceptFAB component with glass morphism styling, framer-motion animations, and keyboard shortcuts (Enter to submit, Escape to close)
- Created POST /api/study-plans/[id]/concepts/add-custom endpoint with full pipeline: LLM edge inference, concept creation via findOrCreateConcept, DAG validation with cycle removal, force layout recompute
- Wired FAB into graph page with activeStudyPlanId and refresh callback to reload graph data after insertion

## Task Commits

Each task was committed atomically:

1. **Task 1: Create edgeInferencePrompt and AddConceptFAB component** - `7454db8` (feat)
2. **Task 2: Create add-custom API endpoint and wire FAB into graph page** - `12f486c` (feat)

## Files Created/Modified
- `adaptive-tutor/src/lib/prompts/index.ts` - Added edgeInferencePrompt function for LLM edge connection inference
- `adaptive-tutor/src/components/graph/AddConceptFAB.tsx` - Glass morphism FAB with form overlay, framer-motion animations, submit/cancel/keyboard handlers
- `adaptive-tutor/src/app/api/study-plans/[id]/concepts/add-custom/route.ts` - POST endpoint: LLM edge inference, concept creation, DAG validation, force layout recompute, batched position persistence
- `adaptive-tutor/src/app/(tabs)/graph/page.tsx` - Import AddConceptFAB, add activeStudyPlanId to store, handleConceptAdded callback, render FAB in canvas wrapper

## Decisions Made

1. **On-demand question generation deferred to practice time** (per plan specification): Questions are NOT fire-and-forget generated on custom concept creation. This saves LLM calls for concepts the user may never practice, unlike the concepts/insert endpoint which generates questions immediately.

2. **Graceful LLM degradation with edgeInferenceError flag**: If LLM edge inference fails (502, timeout, parse error), the concept is still created with no edges. The response includes `edgeInferenceError: true` so the UI could optionally inform the user.

3. **Cycle-creating edges silently removed**: After inserting LLM-inferred edges, full DAG validation runs. Any edges participating in cycles are removed from the database. The request never fails due to cycles.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All three plans of Phase 9 complete: force-directed layout engine (01), ParticleEdge + multi-directional handles (02), custom concept addition (03)
- Custom concepts integrate seamlessly with existing force layout and particle edge visualization
- Graph reflows automatically when new concepts are added via FAB

---
*Phase: 09-web-style-force-directed-graph-layout-via-backend-positioning*
*Completed: 2026-02-27*
