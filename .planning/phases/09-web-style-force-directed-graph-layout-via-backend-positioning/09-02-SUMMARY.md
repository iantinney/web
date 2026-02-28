---
phase: 09-web-style-force-directed-graph-layout-via-backend-positioning
plan: 02
subsystem: ui
tags: [react-flow, svg, animation, animateMotion, bezier, custom-edge, particle]

# Dependency graph
requires:
  - phase: 09-web-style-force-directed-graph-layout-via-backend-positioning
    provides: "Force-directed layout positioning from backend (plan 01)"
provides:
  - "ParticleEdge custom React Flow edge with organic bezier splines and animated particle streams"
  - "Multi-directional ConceptNode handles (4 sides) for force-directed layout"
  - "Proficiency-driven edge data pipeline from graph page to custom edge"
  - "Smooth node position CSS transition for layout recomputes"
affects: [graph-visualization, force-directed-layout]

# Tech tracking
tech-stack:
  added: []
  patterns: [SVG animateMotion for GPU-accelerated particle animation, custom React Flow edge types, hidden multi-directional handles]

key-files:
  created:
    - adaptive-tutor/src/components/graph/ParticleEdge.tsx
  modified:
    - adaptive-tutor/src/components/graph/ConceptNode.tsx
    - adaptive-tutor/src/app/(tabs)/graph/page.tsx

key-decisions:
  - "Used type alias with index signature instead of interface for ParticleEdgeData to satisfy Record<string, unknown> constraint"
  - "Removed proficiencyColor import and edgeStrokeMap constant from graph page — all edge styling now internal to ParticleEdge"

patterns-established:
  - "Custom edge pattern: export edgeTypes object alongside component for clean registration"
  - "Hidden handle pattern: transparent handles on 4 sides for multi-directional edge connections"

requirements-completed: [LAYOUT-02, LAYOUT-03]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 9 Plan 02: ParticleEdge and Multi-Directional Handles Summary

**ParticleEdge custom edge with organic bezier splines, SVG animateMotion particle streams, and 4-directional ConceptNode handles for force-directed layout**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T07:41:08Z
- **Completed:** 2026-02-27T07:44:41Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created ParticleEdge component with organic bezier paths (curvature 0.4) and proficiency-driven particle streams (1-5 particles, 4s-1.5s speed)
- Updated ConceptNode to 4-directional hidden handles (top/left targets, bottom/right sources) enabling edges from any direction
- Wired ParticleEdge into graph page as custom edge type with proficiency data pipeline, replacing old smoothstep/edgeStrokeMap system
- Added smooth node position CSS transition (0.8s cubic-bezier) for layout recomputes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ParticleEdge custom edge component** - `5d6ae93` (feat)
2. **Task 2: Update ConceptNode handles and wire ParticleEdge into graph page** - `389a9cc` (feat)

## Files Created/Modified
- `adaptive-tutor/src/components/graph/ParticleEdge.tsx` - Custom React Flow edge with organic bezier spline, proficiency-driven particle streams via SVG animateMotion, locked edge dim/dashed treatment
- `adaptive-tutor/src/components/graph/ConceptNode.tsx` - 4-directional hidden handles replacing top/bottom only handles
- `adaptive-tutor/src/app/(tabs)/graph/page.tsx` - ParticleEdge registration, proficiency-driven edge data, node position transition, updated hover focus for custom edges

## Decisions Made
- Used type alias with `[key: string]: unknown` index signature instead of interface for ParticleEdgeData to satisfy React Flow's `Record<string, unknown>` constraint on edge data types
- Removed proficiencyColor import and edgeStrokeMap constant from graph page since all edge styling is now handled internally by ParticleEdge

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed ParticleEdgeData type constraint**
- **Found during:** Task 1 (ParticleEdge component creation)
- **Issue:** TypeScript error TS2344 — interface ParticleEdgeData does not satisfy `Record<string, unknown>` constraint required by React Flow's Edge generic
- **Fix:** Changed from `interface` to `type` alias with explicit `[key: string]: unknown` index signature
- **Files modified:** adaptive-tutor/src/components/graph/ParticleEdge.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors in modified files
- **Committed in:** 5d6ae93 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minimal — standard TypeScript type compatibility fix. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ParticleEdge and multi-directional handles ready for force-directed layout from plan 01
- Edges now approach nodes from any direction, compatible with non-hierarchical positioning
- Node position transitions will smoothly animate when backend layout recomputes positions

## Self-Check: PASSED

All files verified present. All commit hashes verified in git log.

---
*Phase: 09-web-style-force-directed-graph-layout-via-backend-positioning*
*Completed: 2026-02-27*
