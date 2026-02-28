---
phase: 02-graph-generation-and-visualization
plan: "02-04"
subsystem: api+store+ui
tags: [proficiency, inference, zustand, react-flow, graph, typescript, live-updates]

# Dependency graph
requires:
  - phase: 02-01
    provides: generate-graph POST endpoint, ConceptNode creation loop
  - phase: 02-02
    provides: collectedContext in Zustand store (including priorKnowledge)
  - phase: 02-03
    provides: graph/page.tsx with React Flow, ConceptNode component, NodeDetailPanel

provides:
  - inferInitialProficiency() function in generate-graph route (novice/intermediate/expert tier-adjusted)
  - priorKnowledge parsed from POST body in generate-graph endpoint
  - Initial proficiency/confidence set on ConceptNode records at creation time
  - lessonPlan object in generate-graph API response (totalConcepts, tier1/2/3 concept names)
  - loadStudyPlanData(planId) Zustand action: hydrates conceptNodes/conceptEdges from API
  - loadStudyPlans() Zustand action: fetches all study plans, sets activeStudyPlanId
  - Graph page useEffect: calls loadStudyPlanData on mount when nodes are empty (page refresh recovery)
  - Verified live update chain: updateConceptProficiency -> conceptNodes -> flowNodes -> React Flow re-render

affects:
  - 02-05+ (downstream graph features can rely on non-zero initial proficiency)
  - 03-question-generation (proficiency data meaningful from graph creation)
  - 05-polish (loadStudyPlans useful for app initialization)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "inferInitialProficiency: keyword detection on priorKnowledge string -> base proficiency, tier penalty reduces by 0.15 per tier"
    - "Zustand async actions: regular function assigned in create() that performs async work internally and calls set()"
    - "loadStudyPlanData double-set pattern: first set updates nodes/edges, second set upserts studyPlans array"
    - "graph/page.tsx useEffect with [activeStudyPlanId] dep: lazy hydration only when nodes missing"

key-files:
  created: []
  modified:
    - adaptive-tutor/src/app/api/study-plans/[id]/generate-graph/route.ts
    - adaptive-tutor/src/app/(tabs)/chat/page.tsx
    - adaptive-tutor/src/lib/store.ts
    - adaptive-tutor/src/app/(tabs)/graph/page.tsx

key-decisions:
  - "inferInitialProficiency inlined in route.ts (not extracted to util) for hackathon simplicity"
  - "lessonPlan built from graphData.concepts (pre-DB) so tier distribution uses LLM-assigned tiers"
  - "loadStudyPlans does NOT auto-load graph data; lets graph page do it on mount to avoid eager fetches"
  - "loadStudyPlanData called only when conceptNodes.length === 0 to avoid clobbering in-memory state"

patterns-established:
  - "Proficiency inference: novice=0.15, intermediate=0.4, expert=0.7 base; tier penalty of 0.15 per tier above 1"
  - "Async Zustand actions: defined as arrow functions inside create() that call set() after awaiting fetch"

# Metrics
duration: ~4min
completed: 2026-02-24
---

# Phase 02 Plan 04: Initial Proficiency Inference & Live Graph Updates Summary

**Initial proficiency inferred from stated prior knowledge (keyword detection + tier penalty), Zustand loadStudyPlanData/loadStudyPlans actions for API hydration, graph page lazy-loads on mount, lessonPlan included in generate-graph response**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-24T18:36:53Z
- **Completed:** 2026-02-24T18:41:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `inferInitialProficiency(priorKnowledge, conceptName, difficultyTier)` to generate-graph route: detects expert/intermediate/novice from keywords, applies 0.15 tier penalty per tier above 1
- POST endpoint now reads `priorKnowledge` from request body and uses inferred proficiency/confidence when creating ConceptNode records (previously always 0/0)
- Added `lessonPlan` to API response: `{ totalConcepts, tier1: string[], tier2: string[], tier3: string[] }`
- Updated chat page to pass `priorKnowledge` from `collectedContext` to generate-graph POST body
- Added `loadStudyPlanData(planId)` Zustand action: fetches `/api/study-plans/[id]`, populates `conceptNodes`, `conceptEdges`, `activeStudyPlanId`, upserts `studyPlans`
- Added `loadStudyPlans()` Zustand action: fetches `/api/study-plans`, sets `studyPlans`, sets `activeStudyPlanId` to first active plan
- Added mount effect in `graph/page.tsx`: calls `loadStudyPlanData` when `activeStudyPlanId` is set but `conceptNodes` is empty — handles page refresh on Graph tab
- Verified live update chain: `updateConceptProficiency` -> `conceptNodes` -> `flowNodes` useMemo -> `useEffect` setNodes -> React Flow re-render with updated `proficiencyColor()`

## Task Commits

1. **Task 1: Initial proficiency inference in graph generation endpoint** - `897d9e7` (feat)
2. **Task 2: Zustand data loading action + verify live graph updates** - `5745b92` (feat)

## Files Created/Modified

- `adaptive-tutor/src/app/api/study-plans/[id]/generate-graph/route.ts` - Added `inferInitialProficiency`, read priorKnowledge from body, use inferred values, add lessonPlan to response
- `adaptive-tutor/src/app/(tabs)/chat/page.tsx` - Pass `priorKnowledge` in generate-graph POST body
- `adaptive-tutor/src/lib/store.ts` - Added `loadStudyPlanData` and `loadStudyPlans` async actions + interface declarations
- `adaptive-tutor/src/app/(tabs)/graph/page.tsx` - Added `loadStudyPlanData` selector + mount effect for lazy hydration

## Decisions Made

- **inferInitialProficiency inlined in route.ts:** No separate utility file — keeps the hackathon codebase lean and the logic is single-use.
- **lessonPlan built from graphData.concepts:** Uses LLM-assigned tiers before DB write, ensuring consistency with what was generated.
- **loadStudyPlans does not auto-load graph data:** Graph page handles its own hydration on mount, avoiding eagerly pulling large concept/edge datasets during app init.
- **Lazy hydration guard (`conceptNodes.length === 0`):** Prevents clobbering in-memory state when store is already populated via chat flow.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written. TypeScript compiled cleanly on first pass after all changes.

Note: The plan was written as if `graph/page.tsx` and `store.ts` were in the state from 02-02, but they had already been updated in 02-03 (NodeDetailPanel import, targetConceptId, ConceptNode component extracted to `src/components/graph/ConceptNode.tsx`). The 02-04 changes applied cleanly on top of the 02-03 state.

## Issues Encountered

None. TypeScript passed immediately after all changes.

## Next Phase Readiness

- Graph nodes now start with meaningful colors when `priorKnowledge` is provided in the gathering phase
- `loadStudyPlanData` enables the graph page to survive page refresh without losing data
- `loadStudyPlans` available for app initialization (root layout or first-tab effect)
- `lessonPlan` in API response available for UI notifications about what was generated
- Ready for Phase 02-05 (if any remaining graph plans) or Phase 03 (question pre-generation)

---
*Phase: 02-graph-generation-and-visualization*
*Completed: 2026-02-24*
