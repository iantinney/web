---
phase: 03-adaptive-practice-engine
plan: "03"
subsystem: api
tags: [minimax, prisma, question-generation, spaced-repetition, session-selector, nextjs]

# Dependency graph
requires:
  - phase: 03-02
    provides: generateQuestionsPrompt + LLMQuestionSchema from prompts/questions.ts; proficiency field on ConceptNode
  - phase: 02-01
    provides: ConceptNode, ConceptEdge Prisma models; StudyPlan.concepts + StudyPlan.edges relations
provides:
  - POST /api/study-plans/[id]/generate-questions — idempotent per-concept question bank creation via MiniMax
  - GET /api/study-plans/[id]/questions — session question selector with SM-2 due filter, prereq priority, type ease-in order
affects:
  - 03-04 (attempt route reads questions by conceptId)
  - 03-05 (Learn tab UI fetches from GET /questions?due=1&limit=20 and POST generate-questions on mount)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Idempotency via count-then-skip: count existing records, return early with alreadyGenerated:true if > 0"
    - "Per-concept MiniMax loop: iterate ConceptNode[], call LLM per concept, continue on failure"
    - "Session selector scoring: prereqBoost * (1 + overdueDays) for priority ranking"
    - "Type ease-in order via TYPE_ORDER record: mcq=0, flashcard=1, fill_blank=2, free_response=3"

key-files:
  created:
    - adaptive-tutor/src/app/api/study-plans/[id]/generate-questions/route.ts
    - adaptive-tutor/src/app/api/study-plans/[id]/questions/route.ts
  modified: []

key-decisions:
  - "Use conceptId field (actual Prisma schema) instead of conceptNodeId (plan spec) to store ConceptNode.id values — SQLite/libsql does not enforce FKs by default, consistent with existing ConceptEdge pattern"
  - "Default session limit = 20 (DEFAULT_SESSION_LENGTH), never hardcoded 50"
  - "Per-concept cap = 3 (covers the 2-3 range from spec)"
  - "Difficulty fallback: if proficiency < 0.4 filter yields empty set, use all questions for that concept"
  - "MiniMax failures on individual concepts are logged and skipped — partial generation is acceptable"

patterns-established:
  - "Per-concept LLM generation loop: skip isDeprecated, try/catch per concept, add to failedConcepts on error"
  - "await params at top of every route (Next.js 16 requirement)"

requirements-completed:
  - LEARN-04

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 3 Plan 03: Question Bank API Summary

**Idempotent per-concept MiniMax question generation endpoint and SM-2-aware session question selector with prereq priority and type ease-in ordering**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T04:00:24Z
- **Completed:** 2026-02-26T04:03:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- POST /generate-questions: calls MiniMax once per ConceptNode, validates with LLMQuestionSchema, stores questions batch with createMany, returns early with alreadyGenerated:true on repeat calls
- GET /questions: SM-2 due filter (nextDue <= now OR null), prereq priority scoring (2x multiplier * overdueness), difficulty-to-proficiency matching (proficiency < 0.4 prefers MCQ/flashcard), type ease-in sort, per-concept cap of 3
- Zero TypeScript errors across both new route files and all existing code

## Task Commits

Each task was committed atomically:

1. **Task 1: POST /generate-questions** - `e038fd3` (feat)
2. **Task 2: GET /questions** - `51d55d4` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `adaptive-tutor/src/app/api/study-plans/[id]/generate-questions/route.ts` - Idempotent per-concept question generation POST endpoint
- `adaptive-tutor/src/app/api/study-plans/[id]/questions/route.ts` - Session question selector GET endpoint with full SM-2 priority logic

## Decisions Made

- **conceptId vs conceptNodeId:** The actual Prisma `Question` model has `conceptId` (FK to `Concept`), not `conceptNodeId` (FK to `ConceptNode`). The plan spec used `conceptNodeId`. Since SQLite/libsql does not enforce FK constraints by default, we store `ConceptNode.id` values in the `conceptId` field — consistent with how `ConceptEdge.fromNodeId` and `toNodeId` already store ConceptNode IDs in Concept FK fields throughout the codebase.
- **Default limit = 20:** Uses DEFAULT_LIMIT = 20 constant (not hardcoded 50), matching DEFAULT_SESSION_LENGTH from spec.
- **Empty proficiency filter fallback:** If proficiency < 0.4 filter yields no questions for a concept, falls back to all questions rather than skipping the concept entirely.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used actual Prisma field `conceptId` instead of plan's `conceptNodeId`**
- **Found during:** Task 1 (generate-questions implementation)
- **Issue:** The plan code referenced `prisma.question.count({ where: { conceptNode: { studyPlanId: id } } })` and `conceptNodeId` field on `Question`, but the actual Prisma schema has `conceptId` (FK to `Concept`). `conceptNodeId` does not exist on the `Question` model.
- **Fix:** Used `conceptId: { in: conceptNodeIds }` for filtering, stored `ConceptNode.id` values in `conceptId` field. Applied same fix in GET /questions (`conceptId: concept.id`). Pre-existing pattern in codebase (ConceptEdge stores ConceptNode IDs in Concept FK fields).
- **Files modified:** generate-questions/route.ts, questions/route.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** e038fd3, 51d55d4 (part of task commits)

---

**Total deviations:** 1 auto-fixed (Rule 1 — schema field name mismatch)
**Impact on plan:** Required for correctness. No scope creep. Both endpoints function as specified.

## Issues Encountered

None beyond the schema field name mismatch documented above.

## User Setup Required

None - no external service configuration required. MINIMAX_API_KEY must already be set (configured in Phase 02-01).

## Next Phase Readiness

- Question bank generation and retrieval APIs are complete and ready for:
  - 03-04: Attempt route that reads questions by `conceptId` and updates SM-2 state
  - 03-05: Learn tab UI that calls POST generate-questions on mount, then GET questions?due=1&limit=20
- No blockers

---
*Phase: 03-adaptive-practice-engine*
*Completed: 2026-02-26*
