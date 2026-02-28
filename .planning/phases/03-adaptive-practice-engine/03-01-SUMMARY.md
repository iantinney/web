---
phase: 03-adaptive-practice-engine
plan: "01"
subsystem: algorithm
tags: [sm2, spaced-repetition, vitest, typescript, algorithms]

# Dependency graph
requires: []
provides:
  - SM-2 spaced repetition algorithm (pure TypeScript, no side effects)
  - SM2State interface (easeFactor, interval, repetitionCount)
  - updateSM2 function (quality-based state update, immutable)
  - getNextDueDate function (interval → Date)
  - userAnswerToQuality function (isCorrect + timeTaken → quality 0-5)
  - vitest test framework configured for adaptive-tutor
affects:
  - 03-04 (attempt route imports updateSM2 and getNextDueDate)
  - 03-05 (session scheduling depends on SM-2 state)

# Tech tracking
tech-stack:
  added:
    - vitest@4.0.18 (test runner)
    - "@vitest/runner@4.0.18"
  patterns:
    - TDD RED-GREEN-REFACTOR cycle established for algorithm modules
    - Pure functions with immutable state (no input mutation)
    - JSDoc comments on all exported functions

key-files:
  created:
    - adaptive-tutor/src/lib/algorithms/sm2.ts
    - adaptive-tutor/src/lib/algorithms/__tests__/sm2.test.ts
    - adaptive-tutor/vitest.config.ts
  modified:
    - adaptive-tutor/package.json (added vitest, test scripts)

key-decisions:
  - "Interval uses OLD easeFactor before update (spec order: update interval first, then easeFactor)"
  - "vitest chosen as test runner (no test framework was previously configured)"
  - "userAnswerToQuality boundaries: <10s=5, 10-29s=4, >=30s=3 (milliseconds, not seconds)"

patterns-established:
  - "Algorithm modules go in src/lib/algorithms/ as pure TypeScript (no Next.js dependencies)"
  - "Test files go in src/lib/algorithms/__tests__/ with .test.ts suffix"
  - "TDD: write failing tests first, commit RED, write implementation, commit GREEN"

requirements-completed:
  - LEARN-07

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 3 Plan 01: SM-2 Spaced Repetition Algorithm Summary

**Pure TypeScript SM-2 algorithm with 17 unit tests covering interval progression, easeFactor flooring at 1.3, immutability, and quality-to-score mapping — drives all adaptive scheduling in Phase 3**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-26T03:52:36Z
- **Completed:** 2026-02-26T03:55:09Z
- **Tasks:** 3 (RED / GREEN / REFACTOR — TDD cycle)
- **Files modified:** 5

## Accomplishments

- Implemented SM-2 algorithm exactly matching PHASE3-TECHNICAL-SPEC.md with zero variations
- 17 unit tests covering all spec test cases plus edge cases (immutability, easeFactor floor, quality boundaries)
- Configured vitest test framework (none previously existed) with `npm test` script and vitest.config.ts
- TypeScript compiles clean (no errors in sm2.ts)

## Task Commits

TDD cycle committed atomically:

1. **RED: Failing tests + vitest setup** - `992b276` (test)
2. **GREEN: SM-2 implementation** - `964d0d8` (feat)

**Plan metadata:** (docs commit — see final commit)

_Note: REFACTOR phase confirmed no changes needed — implementation already had full JSDoc, immutability, and type exports._

## Files Created/Modified

- `adaptive-tutor/src/lib/algorithms/sm2.ts` - SM-2 algorithm: updateSM2, getNextDueDate, userAnswerToQuality, SM2State interface
- `adaptive-tutor/src/lib/algorithms/__tests__/sm2.test.ts` - 17 unit tests covering all spec cases
- `adaptive-tutor/vitest.config.ts` - vitest config targeting node environment
- `adaptive-tutor/package.json` - Added vitest@4.0.18 devDependency, test/test:watch scripts

## Decisions Made

- **Interval uses OLD easeFactor:** The spec code destructures state before updating, so `Math.round(interval * easeFactor)` uses the pre-update easeFactor value. This matches the test expectation: `{ easeFactor: 2.5, interval: 3, repetitionCount: 2 }` + quality=5 → interval=Math.round(3*2.5)=8, then easeFactor updates to 2.6.
- **vitest over Jest:** No test framework was configured. vitest was chosen because it is ESM-native and integrates cleanly with TypeScript without extra babel/jest transform config.
- **Time thresholds in milliseconds:** userAnswerToQuality takes `timeTaken` in milliseconds (consistent with AttemptRecord.timeTaken in the Prisma schema).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed vitest test framework**
- **Found during:** RED phase (test infrastructure check)
- **Issue:** No test framework was configured in package.json — `npx vitest` not available
- **Fix:** Ran `npm install --save-dev vitest @vitest/runner`, added test scripts to package.json, created vitest.config.ts
- **Files modified:** adaptive-tutor/package.json, adaptive-tutor/vitest.config.ts
- **Verification:** `npx vitest --version` returns v4.0.18; tests run and fail as expected in RED phase
- **Committed in:** 992b276 (RED phase commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing test infrastructure)
**Impact on plan:** Required to complete TDD cycle. No scope creep. Plan explicitly called for "check adaptive-tutor/package.json for test runner; if no test framework configured, use Jest" — vitest was installed instead of Jest for ESM compatibility.

## Issues Encountered

- Pre-existing TypeScript errors in other files (prisma.ts, attempts/route.ts) surfaced during `tsc --noEmit` — all pre-existing and out-of-scope. sm2.ts itself compiles clean with `tsc --noEmit --strict src/lib/algorithms/sm2.ts`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- SM-2 algorithm ready for import in Plan 03-04 (attempt route) via `import { updateSM2, getNextDueDate } from "@/lib/algorithms/sm2"`
- userAnswerToQuality ready for use when grading answers in attempt route
- vitest configured — future algorithm tests follow same pattern in `__tests__/` subdirectory

## Self-Check: PASSED

| Item | Status |
|------|--------|
| adaptive-tutor/src/lib/algorithms/sm2.ts | FOUND |
| adaptive-tutor/src/lib/algorithms/__tests__/sm2.test.ts | FOUND |
| adaptive-tutor/vitest.config.ts | FOUND |
| .planning/phases/03-adaptive-practice-engine/03-01-SUMMARY.md | FOUND |
| commit 992b276 (RED - failing tests) | FOUND |
| commit 964d0d8 (GREEN - implementation) | FOUND |

---
*Phase: 03-adaptive-practice-engine*
*Completed: 2026-02-26*
