---
phase: 07-integrated-chat-window
plan: 03
subsystem: ui
tags: [react, zustand, nextjs, api-route, prisma, advisor, chat]

# Dependency graph
requires:
  - phase: 07-integrated-chat-window
    provides: ChatContext Zustand field, AdvisorCard type, ChatMessage extensions, advisorPrompt() utility in prompts/index.ts
provides:
  - POST /api/advisor route querying DB state and returning ranked AdvisorCard recommendations
  - AdvisorCards React component rendering recommendation cards with Practice this navigation
  - Chat tab advisor quick-action button gated on activeStudyPlanId
  - Chat tab message renderer for advisor_cards messageType
  - chatContext sent in chat handleSubmit POST body using direct store access
  - Graph tab concept node click updates chatContext.activeConceptId in Zustand store
affects: [chat-features, advisor-feature, graph-tab]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useAppStore.getState() for fresh store reads in async callbacks (avoids stale closure)
    - Markdown-fence stripping before JSON.parse on LLM responses
    - Message type discriminator (messageType field) for rich message rendering in chat

key-files:
  created:
    - adaptive-tutor/src/app/api/advisor/route.ts
    - adaptive-tutor/src/components/AdvisorCards.tsx
  modified:
    - adaptive-tutor/src/app/(tabs)/chat/page.tsx
    - adaptive-tutor/src/app/(tabs)/graph/page.tsx

key-decisions:
  - "GapDetection query uses userId directly (schema has no studyPlan relation) — adapted from plan's incorrect prisma filter"
  - "advisor quick-action button placed above the form element within the input area container"
  - "useAppStore.getState() used in both handleAdvisor and handleSubmit to read chatContext fresh at call time"

patterns-established:
  - "Rich message rendering: messageType discriminator in chatMessages allows embedding React components inside chat bubbles"
  - "Direct store access pattern: useAppStore.getState().field for values needed in async handlers to avoid stale closures"

requirements-completed: [CHAT-CONTEXT-05, CHAT-CONTEXT-06]

# Metrics
duration: 15min
completed: 2026-02-26
---

# Phase 7 Plan 03: Advisor Feature Summary

**Advisor "What should I learn next?" button with /api/advisor route, AdvisorCards component, chatContext wiring in Chat + Graph tabs**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-02-26T21:12:13Z
- **Completed:** 2026-02-26T21:27:00Z
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments
- Created `/api/advisor` POST route that queries DB for study plans, concepts, attempts, and gap detections, calls `advisorPrompt()`, and returns 2-3 ranked `AdvisorCard` recommendations with safe fallback on parse failure
- Created `AdvisorCards` React component rendering recommendation cards with type label (Review/Continue/Fix Gap/Extend/Bridge/New Topic), title, pitch, and "Practice this" button that calls `setTargetConceptId` + navigates to `/learn`
- Wired advisor quick-action button in Chat tab (gated on `activeStudyPlanId`), extended message renderer to handle `advisor_cards` messages, added `chatContext` to chat POST body, and updated Graph tab to set `chatContext.activeConceptId` on concept node click

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /api/advisor route** - `450a9cb` (feat)
2. **Task 2: Create AdvisorCards component** - `17c0401` (feat)
3. **Task 3: Wire advisor button in chat page and graph concept click context** - `e9ec402` (feat)

## Files Created/Modified
- `adaptive-tutor/src/app/api/advisor/route.ts` - POST endpoint for advisor recommendations; queries study plans, concepts, attempts, gap detections; calls advisorPrompt(); parses LLM JSON with fallback
- `adaptive-tutor/src/components/AdvisorCards.tsx` - React component rendering 2-3 AdvisorCard items with type label, title, pitch, and optional Practice this navigation button
- `adaptive-tutor/src/app/(tabs)/chat/page.tsx` - Added AdvisorCards import, activeStudyPlanId from store, handleAdvisor function, advisor quick-action button, advisor_cards message renderer, chatContext in handleSubmit POST body
- `adaptive-tutor/src/app/(tabs)/graph/page.tsx` - Updated onNodeClick to call setChatContext with activeConceptId when concept node is clicked

## Decisions Made
- Adapted `GapDetection` query from plan's incorrect `studyPlan: { userId }` filter to `{ userId }` directly — the schema has no `studyPlan` relation on `GapDetection` model (auto-fix Rule 1)
- Used `useAppStore.getState()` for fresh chatContext reads in both `handleAdvisor` and `handleSubmit`, not hook-destructured values, to avoid stale closure pitfalls documented in RESEARCH.md
- Placed advisor button in a `div` above the `<form>` element (not inside the form) to avoid accidental form submission

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adapted GapDetection Prisma query to match actual schema**
- **Found during:** Task 1 (Create /api/advisor route)
- **Issue:** Plan's template query used `where: { studyPlan: { userId } }` for GapDetection, but the schema defines GapDetection with a direct `userId` field and no `studyPlan` relation
- **Fix:** Changed to `where: { userId, status: "detected" }` — direct userId filter matching the schema
- **Files modified:** adaptive-tutor/src/app/api/advisor/route.ts
- **Verification:** TypeScript compiled without errors
- **Committed in:** 450a9cb (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — schema mismatch in plan template)
**Impact on plan:** Required correction for correctness. No scope creep.

## Issues Encountered
- The prompts/index.ts file had an updated `chatSystemPrompt` signature with `chatContextSnippet` parameter (added in plan 07-01) that was not visible in the initial read — confirmed by running TypeScript which passed cleanly

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 7 Plan 03 is the final plan in Phase 7. All three plans complete.
- Full advisor loop operational: user clicks button → POST /api/advisor → LLM recommendations → AdvisorCards rendered in chat → Practice this navigates to /learn with targetConceptId set
- Graph tab now feeds activeConceptId into chatContext on every concept click
- v1.2 feature set is complete

## Self-Check: PASSED

- FOUND: adaptive-tutor/src/app/api/advisor/route.ts
- FOUND: adaptive-tutor/src/components/AdvisorCards.tsx
- FOUND: .planning/phases/07-integrated-chat-window/07-03-SUMMARY.md
- FOUND commit 450a9cb (feat: /api/advisor route)
- FOUND commit 17c0401 (feat: AdvisorCards component)
- FOUND commit e9ec402 (feat: wire advisor button + graph context)
- TypeScript: zero errors

---
*Phase: 07-integrated-chat-window*
*Completed: 2026-02-26*
