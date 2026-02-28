---
phase: 09-web-style-force-directed-graph-layout-via-backend-positioning
plan: 01
subsystem: api
tags: [d3-force, force-directed-layout, graph-layout, prisma, next.js]

# Dependency graph
requires:
  - phase: 06-gap-detection-single-concept-insertion
    provides: computeDAGLayout pattern and GraphMembership position fields
provides:
  - computeForceLayout() function with radial tier-based positioning
  - POST /api/unit-graphs/[id]/layout endpoint for on-demand recompute
  - All graph mutation paths use force-directed layout
affects: [09-02 (ParticleEdge + ConceptNode handles), 09-03 (AddConceptFAB + add-custom endpoint)]

# Tech tracking
tech-stack:
  added: [d3-force, @types/d3-force]
  patterns: [server-side d3-force simulation, forceRadial tier-based positioning, adaptive spacing via scaleFactor, prisma.$transaction for batched updates]

key-files:
  created:
    - adaptive-tutor/src/lib/algorithms/forceLayout.ts
    - adaptive-tutor/src/app/api/unit-graphs/[id]/layout/route.ts
  modified:
    - adaptive-tutor/src/app/api/study-plans/[id]/structure-plan/route.ts
    - adaptive-tutor/src/app/api/study-plans/[id]/concepts/insert/route.ts
    - adaptive-tutor/package.json

key-decisions:
  - "Radial strength 0.6 (up from plan's 0.3) to ensure tier ordering dominates link forces"
  - "Link strength 0.4 (down from plan's 0.7) to let radial force establish tier rings"
  - "dagre removed from package.json since no code imports it"

patterns-established:
  - "computeForceLayout: create fresh plain objects for d3-force simulation, never pass Prisma objects"
  - "Synchronous simulation: stop + tick loop (~300 iterations) for server-side layout"
  - "prisma.$transaction for batched position persistence to avoid SQLite lock bottleneck"

requirements-completed: [LAYOUT-01, LAYOUT-05]

# Metrics
duration: 4min
completed: 2026-02-27
---

# Phase 9 Plan 01: Backend Force-Directed Layout Summary

**d3-force replaces dagre with radial tier-based positioning (foundation-center, advanced-outer) and on-demand layout API endpoint**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-27T07:41:06Z
- **Completed:** 2026-02-27T07:45:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created computeForceLayout() with forceRadial that correctly orders tiers (tier 1 nearest center, tier 3 outermost)
- Adaptive spacing scales with graph size via sqrt(nodeCount/10) scaleFactor
- All three layout callers (structure-plan, concepts/insert, layout endpoint) use computeForceLayout
- Removed unused dagre and @types/dagre from dependencies
- Created POST /api/unit-graphs/[id]/layout for on-demand recompute by future callers

## Task Commits

Each task was committed atomically:

1. **Task 1: Install d3-force and create computeForceLayout module** - `8d998db` (feat)
2. **Task 2: Create layout API endpoint and migrate all computeDAGLayout callers** - `9c4c75d` (feat)

## Files Created/Modified
- `adaptive-tutor/src/lib/algorithms/forceLayout.ts` - computeForceLayout() with d3-force simulation, forceRadial tier positioning, adaptive spacing
- `adaptive-tutor/src/app/api/unit-graphs/[id]/layout/route.ts` - POST endpoint for on-demand layout recompute with batched persistence
- `adaptive-tutor/src/app/api/study-plans/[id]/structure-plan/route.ts` - Migrated from computeDAGLayout to computeForceLayout
- `adaptive-tutor/src/app/api/study-plans/[id]/concepts/insert/route.ts` - Migrated from computeDAGLayout to computeForceLayout, switched to $transaction
- `adaptive-tutor/package.json` - Added d3-force, removed dagre

## Decisions Made

1. **Radial strength tuned to 0.6** (plan specified 0.3): With the plan's 0.3 strength, link and charge forces dominated, causing tier ordering to break (tier 2 further than tier 3). Increased to 0.6 ensures consistent tier ring separation across all graph sizes.

2. **Link strength reduced to 0.4** (plan specified 0.7): Reduced to prevent link forces from overriding radial positioning. Connected nodes still cluster together, but tiers maintain clear separation.

3. **dagre removed entirely**: Confirmed no source imports dagre anywhere. The computeDAGLayout function definition remains in graphValidator.ts as reference documentation per plan instructions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Tuned radial/link force balance for correct tier ordering**
- **Found during:** Task 1 (computeForceLayout implementation)
- **Issue:** Plan's parameters (radial 0.3, link 0.7) caused tier ordering to break on multi-node graphs (tier 2 further from center than tier 3)
- **Fix:** Increased radial strength to 0.6, decreased link strength to 0.4
- **Files modified:** adaptive-tutor/src/lib/algorithms/forceLayout.ts
- **Verification:** 9-node test: tier 1 avg 86.6, tier 2 avg 173.1, tier 3 avg 229.0 (correct ordering)
- **Committed in:** 8d998db (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Force parameter tuning was necessary for correct behavior. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- computeForceLayout is ready for Plan 02 (ParticleEdge custom edge + multi-directional handles)
- Layout API endpoint is ready for Plan 03 (AddConceptFAB + custom node addition)
- Old computeDAGLayout kept in graphValidator.ts as reference

---
*Phase: 09-web-style-force-directed-graph-layout-via-backend-positioning*
*Completed: 2026-02-27*
