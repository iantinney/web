---
phase: 02-graph-generation-and-visualization
plan: "02-02"
subsystem: ui
tags: [zustand, minimax, state-machine, chat, file-upload, react, next.js]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: study-plans API, concept nodes/edges CRUD, Prisma models
  - phase: 02-graph-generation-and-visualization
    provides: generate-graph API endpoint, MiniMax integration, concept graph prompts
provides:
  - Chat state machine: idle -> gathering -> generating -> preview -> done
  - studyPlanGatheringPrompt for conversational context extraction
  - Real MiniMax chat API (replaces stub generateStubResponse)
  - File upload (.txt/.md) client-side with FileReader
  - Concept preview card with tier-grouped badges and approve/adjust flow
  - Zustand store: chatPhase, collectedContext, conceptPreview + actions
affects:
  - 02-03 (React Flow graph rendering needs activeStudyPlanId + conceptNodes/edges in store)
  - 03-question-practice (needs activeStudyPlanId set after plan creation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Chat state machine (idle|gathering|generating|preview|done) driven by Zustand
    - LLM returns JSON with message + extractedContext for client-side state merging
    - Graceful degradation: parseLLMJson failure returns raw text (never crashes)
    - FileReader for client-side file extraction (no server upload needed)
    - Incremental context merging: collectedContext updated across conversation turns

key-files:
  created: []
  modified:
    - adaptive-tutor/src/lib/prompts/index.ts
    - adaptive-tutor/src/app/api/chat/route.ts
    - adaptive-tutor/src/lib/store.ts
    - adaptive-tutor/src/app/(tabs)/chat/page.tsx

key-decisions:
  - "LLM returns JSON {message, extractedContext} so API cleanly separates chat content from structured data"
  - "chatPhase tracked in Zustand (not local state) so other tabs/components can observe it"
  - "File content appended to collectedContext.sourceText client-side (no server upload needed for demo)"
  - "Concept preview created from GET /api/study-plans/[id] response after generation"
  - "Progress animation runs in parallel with actual API call (800ms per step)"

patterns-established:
  - "Chat API accepts chatPhase in request body to switch system prompt behavior"
  - "State machine transitions: each phase has explicit entry/exit conditions"
  - "Context merging: API extractedContext merged with existing collectedContext (never overwrites non-empty fields)"

# Metrics
duration: 5min
completed: 2026-02-24
---

# Phase 02 Plan 02: Chat State Machine & Study Plan Creation Flow Summary

**Conversational state machine (idle->gathering->generating->preview->done) with MiniMax gathering prompt, file upload, and concept preview card driving study plan creation from chat**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-02-24T18:24:05Z
- **Completed:** 2026-02-24T18:29:16Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Chat API now calls MiniMax with context-aware system prompts (gathering vs tutor modes) - stub removed entirely
- Zustand store extended with chatPhase, collectedContext, conceptPreview, and 4 new actions
- Chat page rewritten as full state machine with file upload, progress animation, and concept preview card
- When LLM signals hasEnoughContext=true, study plan is created, graph generated, and data loaded into store automatically

## Task Commits

Each task was committed atomically:

1. **Task 1: Chat API route with MiniMax + context-aware system prompt** - `fac5c48` (feat)
2. **Task 2: Chat page state machine with file upload and concept preview** - `b19175a` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `adaptive-tutor/src/lib/prompts/index.ts` - Added `studyPlanGatheringPrompt()` returning JSON schema system prompt for learning coach persona
- `adaptive-tutor/src/app/api/chat/route.ts` - Replaced stub with real MiniMax calls; chatPhase="gathering" uses gathering prompt + parseLLMJson; default uses chatSystemPrompt
- `adaptive-tutor/src/lib/store.ts` - Added ChatPhase type, CollectedContext interface, ConceptPreviewItem interface; added chatPhase/collectedContext/conceptPreview state and 4 actions (setChatPhase, updateCollectedContext, setConceptPreview, resetChatState)
- `adaptive-tutor/src/app/(tabs)/chat/page.tsx` - Full rewrite: state machine, file upload via Paperclip button and FileReader, 5-step progress animation, ConceptPreviewCard with tier badges, approve/adjust buttons, done state with tab navigation

## Decisions Made

- LLM returns `{ message, extractedContext }` JSON so the API cleanly separates display content from structured state data; parseLLMJson failure falls back to raw text (graceful degradation)
- chatPhase lives in Zustand (not component local state) so Graph/Learn tabs can observe when a plan becomes active
- File content appended to `collectedContext.sourceText` entirely client-side via FileReader - no server-side file storage needed for hackathon demo
- Concept preview populated from `GET /api/study-plans/[id]` response after graph generation completes
- Progress animation (5 steps, 800ms each) runs via Promise race with actual API call for perceived responsiveness

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - build compiled cleanly on first pass. TypeScript strict mode passed with zero errors.

## User Setup Required

None - no external service configuration required (MINIMAX_API_KEY already present in .env.local).

## Next Phase Readiness

- Chat-driven study plan creation is fully operational end-to-end
- activeStudyPlanId is set in Zustand after user approves concept preview
- conceptNodes and conceptEdges are loaded into store for Graph tab to consume
- Phase 02-03 (React Flow graph rendering) can now use the populated store state directly

---
*Phase: 02-graph-generation-and-visualization*
*Completed: 2026-02-24*
