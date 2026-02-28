---
phase: 03-adaptive-practice-engine
plan: "04"
subsystem: api
tags: [prisma, nextjs, sm2, spaced-repetition, sqlite, transactions]

# Dependency graph
requires:
  - phase: 03-01
    provides: updateSM2, getNextDueDate, userAnswerToQuality from sm2.ts
  - phase: 03-02
    provides: updateProficiencyFromAttempt from proficiency.ts
provides:
  - POST /api/study-plans/[id]/attempt — atomic attempt recording with SM-2 + proficiency update
  - GET /api/study-plans/[id]/session — get or create active session
  - PATCH /api/study-plans/[id]/session — end session (set endTime)
affects:
  - 03-05-learn-tab-ui (consumes attempt and session endpoints)
  - 03-06-learn-tab-session (also depends on session route)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Prisma $transaction for atomic multi-model writes (AttemptRecord + ConceptNode + SessionRecord)
    - await params pattern for Next.js 16 dynamic routes
    - Rule-based evaluation: MCQ/fill_blank case-insensitive trim, flashcard self-report, free_response neutral
    - SM-2 integration: quality from userAnswerToQuality, updateSM2, getNextDueDate in attempt hot path
    - Session auto-creation on first attempt or GET session (idempotent)

key-files:
  created:
    - adaptive-tutor/src/app/api/study-plans/[id]/attempt/route.ts
    - adaptive-tutor/src/app/api/study-plans/[id]/session/route.ts
  modified:
    - adaptive-tutor/prisma/schema.prisma
    - adaptive-tutor/src/app/api/attempts/route.ts
    - adaptive-tutor/src/app/api/study-plans/[id]/questions/route.ts

key-decisions:
  - "Questions linked to ConceptNode via conceptId field (FK unenforced in libsql/SQLite); conceptNodeId? added as optional explicit relation field for future use"
  - "free_response gets neutral score 0.5 and no proficiency change in Phase 3 (LLM eval deferred to Phase 4)"
  - "flashcard: userAnswer 'correct' or 'got_it' = isCorrect true; anything else = false"
  - "sessionComplete always false in response — UI manages session flow by exhausting question list"
  - "Session auto-created if none active (idempotent GET and attempt submission)"
  - "PATCH /session ends session (no separate POST /session/end needed)"

patterns-established:
  - "attempt route: load question → load ConceptNode → evaluate → SM-2 → proficiency → get/create session → $transaction"
  - "session route: GET auto-creates, PATCH ends; dates always ISO strings in JSON response"

requirements-completed: [LEARN-05, LEARN-07]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 3 Plan 04: Attempt Recording + Session Management Summary

**Atomic attempt endpoint using Prisma $transaction to write AttemptRecord + ConceptNode SM-2 update + SessionRecord stats, plus idempotent GET/PATCH session management**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-26T04:06:23Z
- **Completed:** 2026-02-26T04:08:38Z
- **Tasks:** 2
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments
- POST /attempt evaluates answers rule-based (MCQ/fill_blank/flashcard) with neutral treatment for free_response in Phase 3
- Atomic Prisma $transaction writes AttemptRecord + updates ConceptNode SM-2 fields (easeFactor, interval, repetitionCount, nextDue, lastPracticed) + increments SessionRecord stats
- SM-2 integration: imports updateSM2, getNextDueDate, userAnswerToQuality from sm2.ts; imports updateProficiencyFromAttempt from proficiency.ts
- GET /session auto-creates session if none active; PATCH /session sets endTime; both serialize dates to ISO strings

## Task Commits

Each task was committed atomically:

1. **Task 1: POST /attempt — rule-based evaluation + SM-2 + proficiency update in $transaction** - `0365f58` (feat)
2. **Task 2: GET + PATCH /session — get/create session and end session** - `f7a74b1` (feat)

## Files Created/Modified
- `adaptive-tutor/src/app/api/study-plans/[id]/attempt/route.ts` - POST endpoint: rule-based eval, SM-2 update, Prisma $transaction
- `adaptive-tutor/src/app/api/study-plans/[id]/session/route.ts` - GET (auto-create) and PATCH (end) session endpoints
- `adaptive-tutor/prisma/schema.prisma` - Added conceptNodeId? field and questions relation to ConceptNode; made conceptId optional on Question
- `adaptive-tutor/src/app/api/attempts/route.ts` - Fixed nullable conceptId (string | null) lookup
- `adaptive-tutor/src/app/api/study-plans/[id]/questions/route.ts` - Fixed nullable conceptId in response mapping

## Decisions Made
- Questions created by 03-03 (generate-questions) store ConceptNode.id in the `conceptId` field (FK unenforced by libsql). The attempt route resolves ConceptNode via `conceptNodeId ?? conceptId`.
- Added `conceptNodeId?` to Question schema as optional explicit foreign key for ConceptNode — allows either field to work. Also added `questions` relation to ConceptNode model.
- Made `conceptId` optional on Question (previously required) to support Phase 3 questions that only reference ConceptNode.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added conceptNodeId field to Question model and updated schema**
- **Found during:** Task 1 (POST /attempt implementation)
- **Issue:** Plan code used `question.conceptNode` (include with ConceptNode relation) but schema had Question linking to Concept (old model), not ConceptNode. 03-03 stored ConceptNode.id in conceptId field as a soft reference.
- **Fix:** Added `conceptNodeId?` field and `conceptNode ConceptNode?` relation to Question; added `questions Question[]` to ConceptNode; made `conceptId` optional. Ran `prisma db push` + `prisma generate`. Attempt route looks up via `conceptNodeId ?? conceptId`.
- **Files modified:** adaptive-tutor/prisma/schema.prisma
- **Verification:** `npx tsc --noEmit` passes with zero errors; `prisma db push` synced cleanly
- **Committed in:** 0365f58 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed nullable conceptId in downstream routes after schema change**
- **Found during:** Task 1 (post-schema TypeScript check)
- **Issue:** Making `conceptId` optional broke type compatibility in `questions/route.ts` (string | null vs string) and `attempts/route.ts` (conditional findUnique needed)
- **Fix:** Updated questions/route.ts to use `q.conceptId ?? ""` in mapping; updated attempts/route.ts to guard with `question.conceptId ?` before calling findUnique
- **Files modified:** adaptive-tutor/src/app/api/study-plans/[id]/questions/route.ts, adaptive-tutor/src/app/api/attempts/route.ts
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 0365f58 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical relation, 1 downstream type bug)
**Impact on plan:** Schema change was required to support the plan's design (ConceptNode-linked questions). Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
- Prisma client was not generated (no `.prisma/client` directory) causing TypeScript errors on project; ran `npx prisma generate` to fix before starting implementation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- attempt/route.ts and session/route.ts are complete and compile cleanly
- Both endpoints ready for consumption by 03-05 (Learn tab UI)
- ConceptNode SM-2 fields will update correctly on each practice attempt
- Session tracking (questionsAttempted, questionsCorrect, conceptsCovered) works atomically

---
*Phase: 03-adaptive-practice-engine*
*Completed: 2026-02-26*
