---
phase: 07-integrated-chat-window
plan: 01
subsystem: ui
tags: [zustand, react, typescript, chat, context, prompts, tabs]

# Dependency graph
requires:
  - phase: 06-gap-detection-insertion
    provides: store.ts foundation with Zustand state and actions pattern
provides:
  - ChatContext interface (mode/activeConceptId/activeUnitGraphId/recentAttempts) exported from store.ts
  - AdvisorCard interface exported from store.ts
  - ChatMessage extended with messageType and advisorCards fields
  - chatContext Zustand field with setChatContext/updateChatContextMode/recordAttemptInContext actions
  - buildChatContextSnippet utility function in prompts/index.ts
  - explainAnswerPrompt utility function in prompts/index.ts
  - advisorPrompt utility function in prompts/index.ts
  - Tab-switch mode tracking in layout.tsx (pathname -> mode mapping)
affects:
  - 07-02
  - 07-03

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ChatContext as shared Zustand field for cross-feature context awareness
    - Tab pathname-to-mode mapping via useEffect watching usePathname()
    - Advisor prompt with JSON-only output instruction for structured LLM response
    - Socratic tutor prompt pattern with struggle detection via recentAttempts count

key-files:
  created: []
  modified:
    - adaptive-tutor/src/lib/store.ts
    - adaptive-tutor/src/lib/prompts/index.ts
    - adaptive-tutor/src/app/(tabs)/layout.tsx

key-decisions:
  - "updateChatContextMode only updates mode field, preserving activeConceptId/activeUnitGraphId/recentAttempts across tab switches"
  - "recordAttemptInContext keeps last 5 attempts (slice to 5) for recency-weighted context"
  - "buildChatContextSnippet adds struggle warning when wrongCount >= 2 of recent attempts"
  - "advisorPrompt outputs JSON-only (no markdown fences) for direct parse by Plans 02/03"

patterns-established:
  - "Pattern: Store-level context field: chatContext drives context-aware behavior across all chat features"
  - "Pattern: Tab mode mapping: layout.tsx is the single authority for pathname -> mode translation"

requirements-completed: [CHAT-CONTEXT-01, CHAT-CONTEXT-02]

# Metrics
duration: 3min
completed: 2026-02-26
---

# Phase 7 Plan 01: Integrated Chat Window Foundation Summary

**Shared chat context foundation: ChatContext Zustand field, AdvisorCard/ChatMessage type extensions, three prompt utilities, and tab-switch mode tracking via pathname useEffect in layout.tsx**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-26T21:06:06Z
- **Completed:** 2026-02-26T21:08:24Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Extended store.ts with ChatContext and AdvisorCard interfaces plus chatContext Zustand field with three actions
- Extended ChatMessage type with optional messageType and advisorCards for advisor card rendering
- Added buildChatContextSnippet, explainAnswerPrompt, and advisorPrompt to prompts/index.ts
- Wired tab-switch mode updates in layout.tsx so chatContext.mode reflects current tab at all times

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Zustand store with chatContext field, AdvisorCard type, ChatMessage extension** - `afe87fe` (feat)
2. **Task 2: Add prompt utility functions to lib/prompts/index.ts** - `946d6b2` (feat)
3. **Task 3: Wire tab-switch mode updates in layout.tsx** - `8dbdaeb` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `adaptive-tutor/src/lib/store.ts` - Added ChatContext interface, AdvisorCard interface, ChatMessage extension (messageType/advisorCards), chatContext initial state, and setChatContext/updateChatContextMode/recordAttemptInContext actions
- `adaptive-tutor/src/lib/prompts/index.ts` - Added ChatContext import plus buildChatContextSnippet, explainAnswerPrompt, advisorPrompt exported functions
- `adaptive-tutor/src/app/(tabs)/layout.tsx` - Added useEffect import, useAppStore import, updateChatContextMode selector, and pathname-to-mode useEffect

## Decisions Made
- updateChatContextMode only changes mode field, preserving all other chatContext fields - this is intentional so concept/graph context from Learn tab survives tab switch to Chat
- recordAttemptInContext slices to 5 most recent attempts (prepend + slice pattern) for lightweight rolling window
- struggle threshold set at wrongCount >= 2 in buildChatContextSnippet (matches plan spec exactly)
- advisorPrompt uses "OUTPUT ONLY VALID JSON" instruction to prevent markdown fence wrapping by LLM

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All shared interfaces and prompt utilities are in place
- Plans 02 and 03 can now consume ChatContext from store and use the three prompt functions
- chatContext.mode will reflect current tab from first render onward (layout.tsx useEffect fires on mount)
- Zero TypeScript errors across full project verified

---
*Phase: 07-integrated-chat-window*
*Completed: 2026-02-26*

## Self-Check: PASSED

- FOUND: adaptive-tutor/src/lib/store.ts
- FOUND: adaptive-tutor/src/lib/prompts/index.ts
- FOUND: adaptive-tutor/src/app/(tabs)/layout.tsx
- FOUND: .planning/phases/07-integrated-chat-window/07-01-SUMMARY.md
- FOUND commit afe87fe: feat(07-01): extend Zustand store...
- FOUND commit 946d6b2: feat(07-01): add buildChatContextSnippet...
- FOUND commit 8dbdaeb: feat(07-01): wire tab-switch mode updates...
- FOUND commit d104616: docs(07-01): complete integrated chat window foundation plan
- TypeScript: zero errors across full project
