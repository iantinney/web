# Project State

## Current Position
- **Phase:** 11 of 11 (prerequisite-insertion-demo)
- **Plan:** 02 of 02 in phase
- **Status:** Phase complete
- **Last activity:** 2026-02-28 - Completed 11-02-PLAN.md

Progress: [██] 2/2 plans in phase 11

## Accumulated Decisions

| Decision | Phase | Rationale |
|----------|-------|-----------|
| Seeded bypass via body.seeded truthy check | 11-01 | Clean API pattern: pre-computed data in request body skips LLM |
| LLM failure returns 200 not 500 | 11-01 | Matches existing graceful degradation pattern from explain route |
| Extension edge: target -> new | 11-01 | Integrates with prerequisite locking without changes |
| 6 gap + 6 extension demo seeds | 11-01 | Broad coverage across calculus, data structures, ML, recursion |
| Shared handleInsertConcept for both flows | 11-02 | Single handler with type parameter avoids code duplication |
| Trigger buttons inside feedback guard | 11-02 | Prevents null-reference on lastResult.isCorrect during practicing phase |
| Proposal cards outside feedback guard | 11-02 | Persistent UI at scroll area level, survives state transitions |
| Client-side seed detection | 11-02 | findDemoSeed runs in browser, passes seeded data to API for LLM bypass |

## Blockers & Concerns
- None

## Session Continuity
- **Last session:** 2026-02-28T00:30:44Z
- **Stopped at:** Completed 11-02-PLAN.md (phase 11 complete)
- **Resume file:** None
