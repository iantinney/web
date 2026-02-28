---
phase: 03-adaptive-practice-engine
plan: "02"
subsystem: api
tags: [zustand, zod, proficiency, questions, llm, minimax]

# Dependency graph
requires:
  - phase: 02-graph-generation-and-visualization
    provides: "inferInitialProficiency, Zustand store with conceptNodes/conceptEdges/sessions"
provides:
  - "updateProficiencyFromAttempt function with tier-scaled penalty formula"
  - "Zustand store: currentSessionScore, getCurrentQuestion(), advanceQuestion() helpers"
  - "generateQuestionsPrompt(concept) returning 5-question LLM prompt string"
  - "LLMQuestionItemSchema and LLMQuestionSchema Zod validators for MiniMax JSON"
affects:
  - "03-03 (generate-questions API endpoint imports generateQuestionsPrompt + LLMQuestionSchema)"
  - "03-04 (attempt route imports updateProficiencyFromAttempt)"
  - "03-05 (Learn UI uses getCurrentQuestion + advanceQuestion + setCurrentSessionScore)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "store.getState() in store methods to avoid stale closure reads"
    - "UseBoundStore<StoreApi<T>> explicit type for self-referencing store"
    - "Tier difficulty mapping: tier1=0.3, tier2=0.6, tier3=0.8 for question prompts"

key-files:
  created:
    - adaptive-tutor/src/lib/prompts/questions.ts
  modified:
    - adaptive-tutor/src/lib/algorithms/proficiency.ts
    - adaptive-tutor/src/lib/store.ts

key-decisions:
  - "store.getState() in getCurrentQuestion/advanceQuestion (not closure) — avoids stale state on sequential calls"
  - "LLMQuestionSchema in prompts/questions.ts is an array schema (z.array(item).min(1)) distinct from schemas.ts LLMQuestionSchema (single item)"
  - "generateQuestionsPrompt instructs no markdown fences — compatible with existing parseLLMJson utility"
  - "UseBoundStore<StoreApi<AppState>> explicit type required to break circular inference when store references itself"

patterns-established:
  - "Store self-reference pattern: const store: UseBoundStore<StoreApi<T>> = create<T>(...); export const useAppStore = store;"
  - "Prompt function uses try/catch for keyTermsJson parse with empty string fallback"

requirements-completed: [LEARN-03, LEARN-04]

# Metrics
duration: 4min
completed: 2026-02-26
---

# Phase 3 Plan 02: Shared Library Layer Summary

**Proficiency update function + Zustand session helpers + question-generation LLM prompt/Zod schema — the Wave 1 shared library enabling 03-03 and 03-04 to run in parallel**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-26T03:52:26Z
- **Completed:** 2026-02-26T03:56:20Z
- **Tasks:** 3
- **Files modified:** 3 (2 modified, 1 created)

## Accomplishments
- Added `updateProficiencyFromAttempt` to proficiency.ts — tier-scaled penalty formula matching PHASE3-TECHNICAL-SPEC.md verbatim (tier1=+0.01, tier2=-0.01, tier3=-0.03 on incorrect; confidence-boosted gain on correct)
- Extended Zustand store with `currentSessionScore`, `setCurrentSessionScore`, `getCurrentQuestion()`, `advanceQuestion()` — all using `store.getState()` to prevent stale closure bugs
- Created `prompts/questions.ts` with `generateQuestionsPrompt(concept)` and `LLMQuestionSchema` (Zod array) for validated MiniMax question JSON output

## Task Commits

Each task was committed atomically:

1. **Task 1: Add updateProficiencyFromAttempt to proficiency.ts** - `5f9c3b0` (feat)
2. **Task 2: Extend Zustand store with session score and question navigation** - `427f3af` (feat)
3. **Task 3: Create question generation prompt and Zod schema** - `06c0064` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `adaptive-tutor/src/lib/algorithms/proficiency.ts` - Added `updateProficiencyFromAttempt` export alongside existing `inferInitialProficiency`
- `adaptive-tutor/src/lib/store.ts` - Added `currentSessionScore`, `setCurrentSessionScore`, `getCurrentQuestion`, `advanceQuestion`; refactored to `const store: UseBoundStore<StoreApi<AppState>>` for self-reference
- `adaptive-tutor/src/lib/prompts/questions.ts` - NEW: `generateQuestionsPrompt`, `LLMQuestionItemSchema`, `LLMQuestionSchema`, `LLMQuestionItem` type

## Decisions Made
- Used `store.getState()` inside `getCurrentQuestion`/`advanceQuestion` rather than closure captures — consistent with existing pattern in STATE.md decisions
- Typed `store` as `UseBoundStore<StoreApi<AppState>>` explicitly — required because TypeScript cannot infer when a `const` references itself in its own initializer
- Separated `LLMQuestionItemSchema` (single item) from `LLMQuestionSchema` (array) in prompts/questions.ts for cleaner downstream usage; existing `schemas.ts` item schema left unchanged (both coexist)

## Deviations from Plan

None - plan executed exactly as written. TypeScript circular inference issue on the store self-reference required choosing the explicit type annotation approach, which is aligned with the plan's documented pattern.

## Issues Encountered
- TypeScript rejected `const store = create<AppState>(...)` when methods inside referenced `store.getState()` due to circular inference. Fixed by adding `UseBoundStore<StoreApi<AppState>>` explicit type annotation. Attempted two intermediate approaches (let + reassignment, intersection type) before landing on the correct type import.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Wave 2 plans (03-03 generate-questions endpoint, 03-04 attempt route) can now run in parallel
- 03-03 imports: `generateQuestionsPrompt` from `@/lib/prompts/questions`, `LLMQuestionSchema` from `@/lib/prompts/questions`
- 03-04 imports: `updateProficiencyFromAttempt` from `@/lib/algorithms/proficiency`
- 03-05 (Learn UI) imports: `getCurrentQuestion`, `advanceQuestion`, `setCurrentSessionScore` from `@/lib/store`

## Self-Check: PASSED

- FOUND: adaptive-tutor/src/lib/algorithms/proficiency.ts (exports `inferInitialProficiency` and `updateProficiencyFromAttempt`)
- FOUND: adaptive-tutor/src/lib/store.ts (exports `useAppStore` with `currentSessionScore`, `getCurrentQuestion`, `advanceQuestion`)
- FOUND: adaptive-tutor/src/lib/prompts/questions.ts (exports `generateQuestionsPrompt`, `LLMQuestionItemSchema`, `LLMQuestionSchema`, `LLMQuestionItem`)
- FOUND: commits `5f9c3b0`, `427f3af`, `06c0064`
- TypeScript: 0 errors in plan files (6 pre-existing errors in unrelated files unchanged)

---
*Phase: 03-adaptive-practice-engine*
*Completed: 2026-02-26*
