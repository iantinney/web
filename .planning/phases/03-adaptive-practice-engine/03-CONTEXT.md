# Phase 3: Adaptive Practice Engine - Context

**Gathered:** 2026-02-25 (updated 2026-02-25)
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Learn tab's core interactive practice loop: question generation, card presentation for all 4 question types (MCQ, fill-blank, flashcard, free-response), SM-2-based difficulty adaptation, and proficiency updates. This is the main daily-use feature users return to.

Free response LLM evaluation, chat tutor, and graph updates after sessions are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Card interaction style
- Flashcards: tap-to-flip animation (question on front, answer on back)
- After flip: **swipe left/right to mark correct/incorrect (Tinder-style)** — use framer-motion `motion.div` with drag + `onDragEnd` to detect swipe direction. Swipe right = "Got it!" (correct), swipe left = "Missed it" (incorrect). This is a hard requirement, not discretionary.
- MCQ: tap option → auto-submit immediately (no confirm step)
- Fill-blank: text input with explicit Submit button
- Free-response: textarea with character counter; evaluation deferred to Phase 4 (record answer only for now)

### AI access during practice
- Floating chat button in bottom corner — persistent throughout practice session
- Opens a slide-up panel; does not interrupt card flow
- Button is always visible regardless of question type
- Full chat backend wired in Phase 4; Phase 3 builds the UI affordance (placeholder/stub)

### Session start & concept scope
- "Start Practice" button on the Learn tab — single click, no preamble
- Algorithm auto-selects which concepts to practice (SM-2 priority: high-uncertainty, overdue concepts first)
- User does not manually pick concepts; graph is a read-only visualization, not a session launcher
- Default session length: fixed count (e.g., 20 cards), configurable in settings
- Session preamble / preview screen: Claude's discretion (likely skip it for speed)

### Session composition & question ordering
- **Concept selection:** SM-2 due concepts first; prereq concepts weighted higher when overdue (overdue prereqs block downstream understanding — show them first)
- **Type ordering within session:** Ease-in order — MCQ first, then fill-blank/flashcard, then free-response. Lower-effort questions early build momentum; harder open-ended ones come when user is warmed up.
- **Per-concept cap:** 2–3 questions per concept per session maximum (prevents any one concept from dominating; spreads review across more concepts)
- **Incorrect answers:** Do NOT re-queue in the same session. SM-2 will schedule them sooner next time. Keeps session length predictable.

### Difficulty selection within a concept
- When proficiency on a concept is low (< 0.4), prefer MCQ and flashcard question types over fill-blank and free-response
- As proficiency grows, surface harder question types (fill-blank, then free-response) for that concept
- Target: ~70% success rate by matching question difficulty to current proficiency level
- The `difficulty` field on each Question (0.0–1.0, set at generation time from concept tier) drives the filter: low-proficiency users get lower-difficulty questions first

### Question generation strategy
- Generate on first Learn tab visit (if no questions exist for study plan)
- Cache in database forever — do not regenerate on subsequent visits
- 3-5 questions per concept, all 4 types mixed
- Idempotent: calling generate twice doesn't create duplicates

### Proficiency algorithm
- SM-2 spaced repetition: `easeFactor`, `interval`, `repetitionCount` per concept
- Proficiency update rules:
  - Correct answer: +0.05–0.15 boost (scaled by confidence)
  - Incorrect: small penalty, proficiency floors at 0.0
  - High confidence + correct = bigger boost
  - Tier 3 concepts penalized more on incorrect
- nextDue date computed from SM-2 interval after each attempt

### Feedback presentation
- Inline within card — stays on same screen, no full-screen modal
- Shows: ✅ Correct / ❌ Incorrect, the correct answer highlighted, explanation text
- Proficiency delta shown ("Variables updated to 35% ↑")
- Auto-advance after ~2-3 seconds OR user taps "Next Question →" immediately
- Incorrect answers always show explanation (user sees what they missed)

### Session summary screen
- Shown when all due questions answered
- Stats: questions attempted, correct, accuracy %, time, concepts covered
- Next review schedule per concept (e.g., "Variables: review tomorrow")
- Navigation: [View Graph] [New Session] [Switch to Chat]
- Celebratory tone (emoji ok on this screen only)

### Claude's Discretion
- Exact session preamble / preview screen approach
- Loading skeleton design during question generation (30-60 sec)
- Skip button behavior (no proficiency penalty, counts as attempted)
- Exact animation timings (feedback pop-in, progress bar update, question fade)
- Session timeout handling for idle sessions

</decisions>

<specifics>
## Specific Ideas

- The graph is a visualization of concept knowledge state — not an interactive trigger for sessions
- Session length configurable in settings (and later via chat in Phase 4); default is fixed
- SM-2 quality score mapped from: fast+correct → 5, slow+correct → 4, incorrect → 1
- All 4 question types in scope for Phase 3 (not MCQ-only)
- Free response: Phase 3 records the answer and shows it back to user; Phase 4 adds LLM evaluation

**Team-provided technical spec is in:** `adaptive-tutor/phase3tech/`
- `PHASE3-TECHNICAL-SPEC.md` — DB schema, SM-2 algorithm, proficiency update rules, Zustand additions
- `PHASE3-API-SPEC.md` — 5 new endpoints with exact request/response contracts
- `PHASE3-UI-SPEC.md` — 7 screen layouts with ASCII mockups
- `PHASE3-TASK-BREAKDOWN.md` — 11 tasks with dependencies and critical path
- `PHASE3-OVERVIEW.md` — Success criteria (14 items)
- `PHASE3-TESTING-GUIDE.md` — Testing strategy
- `PHASE3-START-HERE.md` — Quick reference for onboarding

</specifics>

<deferred>
## Deferred Ideas

- Free response LLM evaluation with misconception detection — Phase 4
- Chat tutor backend wired to floating button — Phase 4 (Phase 3 builds UI only)
- Proficiency snapshot in chat context — Phase 4
- Graph updates proficiency colors after Learn session — Phase 4 wires the trigger
- Session length configurable via chat dialogue — Phase 4

</deferred>

---

*Phase: 03-adaptive-practice-engine*
*Context gathered: 2026-02-25*
