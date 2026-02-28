---
phase: 07-integrated-chat-window
plan: 02
subsystem: learn-tab, chat-api, explain-api
tags: [explain, chat-context, lLM, feedback, learn-tab]
dependency_graph:
  requires: ["07-01"]
  provides: ["CHAT-CONTEXT-03", "CHAT-CONTEXT-04"]
  affects: ["adaptive-tutor/src/app/(tabs)/learn/page.tsx", "adaptive-tutor/src/app/api/chat/route.ts", "adaptive-tutor/src/lib/prompts/index.ts"]
tech_stack:
  added: []
  patterns: ["Direct Zustand store access (useAppStore.getState()) for avoid stale closure in callbacks", "Fire-and-forget chatContext updates in submitAttempt", "200-with-fallback pattern for LLM endpoints"]
key_files:
  created:
    - adaptive-tutor/src/app/api/explain/route.ts
  modified:
    - adaptive-tutor/src/app/api/chat/route.ts
    - adaptive-tutor/src/lib/prompts/index.ts
    - adaptive-tutor/src/app/(tabs)/learn/page.tsx
decisions:
  - "Used Loader2 icon already imported in learn/page.tsx for explain button spinner — no new icon import needed"
  - "Explanation block positioned between proficiency delta and Next Question button for clean UX hierarchy"
  - "chatSystemPrompt refactored from direct return to basePrompt variable to enable conditional snippet append"
metrics:
  duration_minutes: 3
  completed_date: "2026-02-26"
  tasks_completed: 3
  files_modified: 4
---

# Phase 7 Plan 02: Explain-Answer Button and Chat Context Injection Summary

**One-liner:** Socratic inline explainer for wrong answers using /api/explain, plus chatContext injection into chat system prompt via buildChatContextSnippet.

## What Was Built

### Task 1: /api/explain Route
New POST endpoint at `adaptive-tutor/src/app/api/explain/route.ts`. Accepts `question`, `userAnswer`, `correctAnswer`, `feedback`, `conceptName`, and optional `chatContext`. Calls `explainAnswerPrompt()` to build a context-aware Socratic system prompt, then `generateText()` to produce a 2-4 sentence explanation. Returns `{ explanation: string }` on success; returns a safe fallback message with HTTP 200 on LLM failure so the UI never shows an error state.

### Task 2: Chat API chatContext Injection
Extended `/api/chat/route.ts` to:
- Import `buildChatContextSnippet` from `@/lib/prompts`
- Import `ChatContext` type from `@/lib/store`
- Accept optional `chatContext` in the request body (typed `ChatContext`)
- Call `buildChatContextSnippet(chatContext)` when present and pass the result as `chatContextSnippet` to `chatSystemPrompt()`

Extended `chatSystemPrompt()` in `prompts/index.ts`:
- Added `chatContextSnippet?: string` to the context parameter
- Refactored from direct return to `basePrompt` variable
- Appends `\n\n---\n${chatContextSnippet}` to the base prompt when provided

### Task 3: Learn Page — Explain This Button + Context Updates
Modified `learn/page.tsx` with four changes:

**A. chatContext updates in submitAttempt:** After `setLastResult(result)`, calls `useAppStore.getState()` directly (avoids stale closure) to call `recordAttemptInContext()` and `setChatContext()` with the current concept and graph IDs.

**B. State variables:** Added `explainLoading` and `explainText` state variables.

**C. handleExplainThis:** Async function that POSTs to `/api/explain` with current question data and current chatContext (via `useAppStore.getState().chatContext`). Handles loading/error states cleanly.

**D. handleAdvance reset:** Clears `explainText` and `explainLoading` before advancing.

**E. Feedback UI:** Added "Explain this" button and explanation block inside the feedback section, gated on `!lastResult.isCorrect`. Uses the existing `Loader2` icon for the loading spinner.

## Verification Results

- Zero TypeScript errors (all three tasks verified)
- `/api/explain` route file exists at expected path
- `buildChatContextSnippet` imported and used in chat/route.ts
- `handleExplainThis`, `explainText`, `explainLoading` all present in learn/page.tsx

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] chatSystemPrompt used direct return, not basePrompt variable**
- **Found during:** Task 2
- **Issue:** The plan instructed adding `if (context.chatContextSnippet) { return \`${basePrompt}...\` }` but the function originally used a single `return` template literal with no `basePrompt` variable. Naively adding the if-block would have created dead code after the return statement.
- **Fix:** Refactored `chatSystemPrompt` to assign the template literal to `const basePrompt`, then conditionally return with or without the snippet appended.
- **Files modified:** `adaptive-tutor/src/lib/prompts/index.ts`
- **Commit:** 5be1b95

## Self-Check: PASSED

Files verified to exist:
- FOUND: adaptive-tutor/src/app/api/explain/route.ts
- FOUND: adaptive-tutor/src/lib/prompts/index.ts (chatContextSnippet param added)
- FOUND: adaptive-tutor/src/app/api/chat/route.ts (buildChatContextSnippet used)
- FOUND: adaptive-tutor/src/app/(tabs)/learn/page.tsx (handleExplainThis, explainText, explainLoading)

Commits verified:
- 7980b60: feat(07-02): create /api/explain route
- 5be1b95: feat(07-02): extend Chat API and chatSystemPrompt
- e9ec402: feat(07-02): add Explain this button and chatContext updates
