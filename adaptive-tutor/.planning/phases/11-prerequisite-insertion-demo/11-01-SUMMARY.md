---
phase: 11-prerequisite-insertion-demo
plan: 01
subsystem: api
tags: [demo-seeds, gap-analysis, extension-suggestion, minimax, prisma, next-api]

requires:
  - phase: 10-graph-visual-polish
    provides: "Polished graph visualization and edge rendering"
provides:
  - "demo-seeds.ts with findDemoSeed() for LLM-free demo mode"
  - "POST /api/study-plans/[id]/analyze-gap endpoint (seeded + live LLM)"
  - "POST /api/study-plans/[id]/suggest-extension endpoint (seeded + live LLM)"
  - "concepts/insert route with position field for extension edge direction"
affects: [11-02, 11-03, 11-prerequisite-insertion-demo]

tech-stack:
  added: []
  patterns:
    - "Seeded bypass pattern: body.seeded truthy skips LLM, returns pre-computed response"
    - "Graceful LLM fallback: routes return 200 with hasGap:false/hasSuggestion:false on LLM failure"
    - "Position-aware concept insertion: position field controls edge direction and tier placement"

key-files:
  created:
    - src/lib/demo-seeds.ts
    - src/app/api/study-plans/[id]/analyze-gap/route.ts
    - src/app/api/study-plans/[id]/suggest-extension/route.ts
  modified:
    - src/lib/prompts/index.ts
    - src/app/api/study-plans/[id]/concepts/insert/route.ts

key-decisions:
  - "6 gap + 6 extension seeds covering calculus, data structures, ML, and recursion domains"
  - "Seeded bypass triggered by body.seeded truthy check (not a separate boolean flag)"
  - "LLM failure returns 200 with empty result, never 500 (matches existing explain route pattern)"
  - "Extension edge direction: target -> new (anchor is prereq OF extension concept)"

patterns-established:
  - "Seeded bypass: if (seeded) return pre-computed; else call LLM"
  - "Position-based insertion: position='extension' reverses edge and adjusts tier"

duration: 4min
completed: 2026-02-28
---

# Phase 11 Plan 01: Seeded Demo + API Routes Summary

**Demo seed config with 12 patterns, gap analysis + extension suggestion API routes with seeded bypass, and position-aware concept insertion**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-28T00:21:17Z
- **Completed:** 2026-02-28T00:24:57Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created demo-seeds.ts with 6 gap + 6 extension seed patterns and findDemoSeed() lookup function
- Built two new API routes (analyze-gap and suggest-extension) that support both seeded bypass and live LLM modes
- Added gapAnalysisPrompt and extensionSuggestionPrompt to the centralized prompt library
- Modified concepts/insert route to support position="extension" with correct edge direction (anchor -> new) and tier placement (depthTier + 1)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create demo-seeds.ts and two API routes** - `def53d7` (feat)
2. **Task 2: Modify concepts/insert route for extension edge direction** - `fe3bcc1` (feat)

## Files Created/Modified
- `src/lib/demo-seeds.ts` - Seed configuration with 12 DemoSeed patterns and findDemoSeed() lookup
- `src/lib/prompts/index.ts` - Added gapAnalysisPrompt() and extensionSuggestionPrompt() functions
- `src/app/api/study-plans/[id]/analyze-gap/route.ts` - POST endpoint for on-demand gap analysis (seeded + LLM)
- `src/app/api/study-plans/[id]/suggest-extension/route.ts` - POST endpoint for extension suggestions (seeded + LLM)
- `src/app/api/study-plans/[id]/concepts/insert/route.ts` - Added position field for extension edge direction

## Decisions Made
- Used 6 gap + 6 extension seeds covering calculus, data structures, ML, and recursion domains for broad demo coverage
- Seeded bypass is triggered by a truthy `body.seeded` field containing the pre-computed data, keeping the API clean
- LLM failure returns 200 with `{hasGap: false}` / `{hasSuggestion: false}` instead of 500, matching the existing graceful degradation pattern
- Extension edge direction (target -> new) correctly integrates with existing prerequisite locking logic without changes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Backend API routes ready for Phase 11 Plan 02 (UI components consuming these routes)
- concepts/insert backward-compatible (existing callers work without position field)
- Seeded bypass enables deterministic demos without LLM dependency

---
*Phase: 11-prerequisite-insertion-demo*
*Completed: 2026-02-28*
