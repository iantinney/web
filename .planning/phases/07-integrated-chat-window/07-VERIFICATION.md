---
phase: 07-integrated-chat-window
verified: 2026-02-26T22:00:00Z
status: passed
score: 18/18 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "Navigate Learn tab, answer a question incorrectly, click 'Explain this'"
    expected: "Loading spinner appears, then a 2-4 sentence Socratic explanation renders below the feedback card"
    why_human: "Requires live LLM call to /api/explain via MiniMax — cannot verify response content programmatically"
  - test: "In Chat tab, click 'What should I learn next?' (requires activeStudyPlanId to be set)"
    expected: "User message appears, then 2-3 AdvisorCard tiles render with type label, title, pitch, and optional 'Practice this' button"
    why_human: "Requires live DB query + LLM call to /api/advisor — card content and count depend on real data"
  - test: "Click 'Practice this' on an AdvisorCard"
    expected: "App navigates to /learn with targetConceptId set to the card's conceptId"
    why_human: "Navigation behavior with router.push requires a running browser session"
  - test: "Click a concept node in the Graph tab, then open Chat and send a message"
    expected: "The POST body to /api/chat contains chatContext.activeConceptId matching the clicked concept"
    why_human: "Requires checking network tab in devtools during a live session"
---

# Phase 7: Integrated Chat Window Verification Report

**Phase Goal:** Add context-aware chat tutor accessible from Learn/Graph tabs — chatContext state tracking, inline "Explain this" tutor in Learn tab, "What should I learn next?" advisor in Chat tab.
**Verified:** 2026-02-26T22:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | chatContext field exists in Zustand store with mode/activeConceptId/activeUnitGraphId/recentAttempts | VERIFIED | `store.ts` lines 20-29: `ChatContext` interface with exact fields; line 180: initialized as `{ mode: "idle" }` |
| 2 | Switching tabs updates chatContext.mode (learn→practicing, graph→exploring, chat→planning) | VERIFIED | `layout.tsx` lines 26-32: modeMap with correct mappings in `useEffect` watching `pathname` |
| 3 | buildChatContextSnippet() produces a context string from a ChatContext object | VERIFIED | `prompts/index.ts` lines 385-403: function returns joined lines with mode, concept ID, graph ID, and struggle note |
| 4 | explainAnswerPrompt() produces a Socratic tutor prompt given question/answer/concept data | VERIFIED | `prompts/index.ts` lines 405-432: returns multi-paragraph prompt with CONCEPT/QUESTION/STUDENT'S ANSWER/CORRECT ANSWER/FEEDBACK sections |
| 5 | advisorPrompt() produces a JSON-only structured prompt for ranked recommendations | VERIFIED | `prompts/index.ts` lines 434-490: returns prompt with "OUTPUT ONLY VALID JSON" instruction and schema |
| 6 | AdvisorCard and ChatMessage types exported from store.ts with messageType discriminated union | VERIFIED | `store.ts` lines 31-46: `AdvisorCard` interface exported; `ChatMessage` extended with `messageType?: "text" \| "advisor_cards"` and `advisorCards?: AdvisorCard[]` |
| 7 | After a wrong answer in Learn tab, user sees an "Explain this" button | VERIFIED | `learn/page.tsx` line 1455: `{!lastResult.isCorrect && (` gates the button; line 1472: "Explain this" label |
| 8 | "Explain this" button is NOT shown after correct answers | VERIFIED | `learn/page.tsx` line 1455: entire block gated on `!lastResult.isCorrect` |
| 9 | Clicking "Explain this" calls /api/explain and renders the explanation | VERIFIED | `learn/page.tsx` line 608: `fetch("/api/explain", ...)` in `handleExplainThis`; line 1475-1486: `{explainText && <div>...</div>}` |
| 10 | Explanation block clears when user advances to the next question | VERIFIED | `learn/page.tsx` lines 445-446: `setExplainText(null); setExplainLoading(false)` in advance handler |
| 11 | Chat API system prompt includes a chatContext snippet when chatContext is provided | VERIFIED | `chat/route.ts` lines 128-134: `chatContextSnippet: body.chatContext ? buildChatContextSnippet(body.chatContext) : undefined` passed to `chatSystemPrompt()`; `prompts/index.ts` lines 350-354: appended to base prompt |
| 12 | Submitting an attempt updates chatContext.recentAttempts and activeConceptId in the store | VERIFIED | `learn/page.tsx` lines 340-350: `store.recordAttemptInContext(...)` and `store.setChatContext(...)` called via direct store access after each attempt |
| 13 | Chat tab shows "What should I learn next?" button only when a study plan is active | VERIFIED | `chat/page.tsx` line 692: `{activeStudyPlanId && (` gates the button |
| 14 | Clicking the advisor button adds a user message then an assistant message with AdvisorCards | VERIFIED | `chat/page.tsx` lines 340-367: `handleAdvisor` adds user message, calls `/api/advisor`, adds assistant message with `messageType: "advisor_cards"` and `advisorCards` |
| 15 | Each recommendation card shows a title, pitch, and "Practice this" button | VERIFIED | `AdvisorCards.tsx` lines 62-89: renders type label, title, pitch; `{card.conceptId && <button>Practice this</button>}` |
| 16 | Clicking "Practice this" sets targetConceptId and navigates to /learn | VERIFIED | `AdvisorCards.tsx` lines 35-40: `setTargetConceptId(card.conceptId)` then `router.push("/learn")` |
| 17 | Clicking a concept node in Graph tab updates chatContext.activeConceptId | VERIFIED | `graph/page.tsx` lines 132-135: `useAppStore.getState().setChatContext({ ...chatContext, activeConceptId: concept.id })` in `onNodeClick` callback |
| 18 | chatContext is sent in the POST body of chat handleSubmit, read fresh from the store | VERIFIED | `chat/page.tsx` line 153: `chatContext: useAppStore.getState().chatContext` in handleSubmit POST body |

**Score:** 18/18 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `adaptive-tutor/src/lib/store.ts` | ChatContext interface, AdvisorCard interface, chatContext field, setChatContext/updateChatContextMode/recordAttemptInContext actions, ChatMessage extended | VERIFIED | All interfaces exported (lines 20-46); all three actions implemented (lines 240-252); chatContext initialized at line 180 |
| `adaptive-tutor/src/lib/prompts/index.ts` | buildChatContextSnippet, explainAnswerPrompt, advisorPrompt utility functions | VERIFIED | All three functions present and exported (lines 385, 405, 434); `ChatContext` imported at line 5 |
| `adaptive-tutor/src/app/(tabs)/layout.tsx` | Tab-switch mode update via useEffect watching usePathname() | VERIFIED | useAppStore imported line 8; `updateChatContextMode` selector at line 23; useEffect with modeMap at lines 25-32 |
| `adaptive-tutor/src/app/api/explain/route.ts` | POST endpoint returning { explanation: string } | VERIFIED | Full POST handler; calls `explainAnswerPrompt()` then `generateText()`; returns 200 with fallback on LLM failure |
| `adaptive-tutor/src/app/api/chat/route.ts` | Modified to include chatContextSnippet from request body | VERIFIED | `buildChatContextSnippet` imported at line 3; `chatContext` extracted from body; passed to `chatSystemPrompt()` at line 133 |
| `adaptive-tutor/src/app/(tabs)/learn/page.tsx` | explainLoading/explainText state, handleExplainThis handler, context updates in submitAttempt, button in feedback UI | VERIFIED | All state vars at lines 92-94; handleExplainThis at line 604; context updates at lines 340-350; UI at lines 1454-1488 |
| `adaptive-tutor/src/app/api/advisor/route.ts` | POST endpoint querying DB, calling advisorPrompt(), returning { recommendations: AdvisorCard[] } | VERIFIED | Queries studyPlans (with unitGraphs, memberships, concepts), recentAttempts, gapDetections; calls advisorPrompt(); returns up to 3 recommendations with safe fallback |
| `adaptive-tutor/src/components/AdvisorCards.tsx` | React component rendering AdvisorCard objects with Practice this navigation | VERIFIED | Exported AdvisorCards function; renders type label, title, pitch, Practice this button; calls setTargetConceptId + router.push |
| `adaptive-tutor/src/app/(tabs)/chat/page.tsx` | Advisor button, AdvisorCards renderer, chatContext in POST body, handleAdvisor | VERIFIED | All four requirements present (lines 8, 70, 153, 336, 611, 692) |
| `adaptive-tutor/src/app/(tabs)/graph/page.tsx` | setChatContext call on concept node click | VERIFIED | `onNodeClick` callback at lines 126-139 calls setChatContext with activeConceptId |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `layout.tsx` | `store.ts` | `updateChatContextMode` called in useEffect on pathname change | VERIFIED | Line 31: `updateChatContextMode(modeMap[pathname] ?? "idle")` inside useEffect |
| `prompts/index.ts` | `store.ts` | `ChatContext` type import used in all three new prompt functions | VERIFIED | Line 5: `import type { ChatContext } from "@/lib/store"` |
| `learn/page.tsx` | `/api/explain` | `fetch POST /api/explain` with question/answer/concept data | VERIFIED | Line 608: `fetch("/api/explain", { method: "POST", body: JSON.stringify({...}) })` |
| `/api/explain` route | `prompts/index.ts` | `explainAnswerPrompt()` called to build system prompt | VERIFIED | `explain/route.ts` line 3: import; line 23: `explainAnswerPrompt({...})` |
| `/api/chat` route | `prompts/index.ts` | `buildChatContextSnippet()` called when chatContext in request body | VERIFIED | `chat/route.ts` line 3: import; line 133: `buildChatContextSnippet(body.chatContext)` |
| `chat/page.tsx` | `/api/advisor` | `fetch POST /api/advisor` with chatContext body | VERIFIED | Line 346: `fetch("/api/advisor", { method: "POST", body: JSON.stringify({ chatContext: ... }) })` |
| `/api/advisor` route | `prompts/index.ts` | `advisorPrompt()` called to build structured recommendation prompt | VERIFIED | `advisor/route.ts` line 3: import; line 89: `advisorPrompt({...})` |
| `AdvisorCards.tsx` | `store.ts` | `setTargetConceptId` + `router.push("/learn")` for Practice this navigation | VERIFIED | Lines 33-40: `setTargetConceptId` from store; `router.push("/learn")` in `handlePractice` |
| `chat/page.tsx` | `AdvisorCards.tsx` | Rendered when `message.messageType === "advisor_cards"` | VERIFIED | Line 8: import; lines 611-614: `{msg.messageType === "advisor_cards" && ... <AdvisorCards cards={msg.advisorCards} />}` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CHAT-CONTEXT-01 | 07-01 | ChatContext Zustand field tracks mode/activeConceptId/activeUnitGraphId/recentAttempts | SATISFIED | `store.ts` ChatContext interface (lines 20-29), chatContext field (line 129), three actions (lines 240-252) |
| CHAT-CONTEXT-02 | 07-01 | Tab navigation updates chatContext mode via layout.tsx | SATISFIED | `layout.tsx` useEffect with modeMap (lines 25-32) |
| CHAT-CONTEXT-03 | 07-02 | /api/explain route with "Explain this" button in Learn tab after wrong answers | SATISFIED | `/api/explain/route.ts` exists; `learn/page.tsx` button at line 1455 gated on `!lastResult.isCorrect` |
| CHAT-CONTEXT-04 | 07-02 | chatContext injected into /api/chat system prompt as context snippet | SATISFIED | `chat/route.ts` line 133: buildChatContextSnippet called; `prompts/index.ts` lines 350-354: appended to basePrompt |
| CHAT-CONTEXT-05 | 07-03 | /api/advisor route returning 2-3 ranked AdvisorCard recommendations | SATISFIED | `/api/advisor/route.ts` queries DB, calls advisorPrompt(), parses JSON, returns up to 3 recommendations |
| CHAT-CONTEXT-06 | 07-03 | Chat tab advisor quick-action button + AdvisorCards component + graph tab activeConceptId updates | SATISFIED | `chat/page.tsx` advisor button (line 692), AdvisorCards import+render (lines 8, 611); `graph/page.tsx` onNodeClick update (lines 132-135) |

All 6 requirements are SATISFIED. No orphaned requirements found.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `adaptive-tutor/src/app/api/advisor/route.ts` | 65 | `isLocked: false` with comment "simplified — lock state requires edge query" | Info | isLocked is always false in advisor data. This is a known simplification (not a blocker): the advisor prompt can still rank weak concepts; it just cannot distinguish locked vs unlocked. No impact on the phase goal. |

No blocker or warning anti-patterns found. The single info-level item is a documented, intentional simplification in the advisor route.

---

## Human Verification Required

### 1. Explain This — End-to-End Flow

**Test:** Navigate to /learn, answer any question incorrectly, click the "Explain this" button that appears below the feedback card.
**Expected:** A loading spinner appears labeled "Thinking...", then a 2-4 sentence Socratic explanation replaces the button and renders in a rounded card below the feedback.
**Why human:** Requires a live MiniMax LLM call — cannot verify response content or latency programmatically.

### 2. Advisor Cards — End-to-End Flow

**Test:** Set an active study plan, navigate to /chat, click "What should I learn next?".
**Expected:** A user message "What should I learn next?" appears, then 2-3 AdvisorCard tiles render (each with a colored type badge, title, pitch, and optionally a "Practice this" button).
**Why human:** Requires live DB query + LLM call to /api/advisor. Card count and content depend on real study plan data.

### 3. "Practice this" Navigation

**Test:** On an AdvisorCard that shows a "Practice this" button, click it.
**Expected:** App navigates to /learn and begins practice for the recommended concept.
**Why human:** Router navigation with `router.push("/learn")` requires a live browser session to verify.

### 4. Graph Click Feeds Chat Context

**Test:** Click a concept node in the Graph tab. Open the Network tab in devtools. Switch to Chat and send any message.
**Expected:** The POST body to /api/chat contains `chatContext.activeConceptId` matching the ID of the clicked concept node.
**Why human:** Verifying live network request bodies requires browser devtools during an active session.

---

## Commit Verification

| Commit | Description | Verified |
|--------|-------------|---------|
| afe87fe | feat(07-01): extend Zustand store with chatContext field, AdvisorCard type, ChatMessage extension | FOUND |
| 946d6b2 | feat(07-01): add buildChatContextSnippet, explainAnswerPrompt, advisorPrompt to prompts/index.ts | FOUND |
| 8dbdaeb | feat(07-01): wire tab-switch mode updates in layout.tsx via updateChatContextMode | FOUND |
| 7980b60 | feat(07-02): create /api/explain route for Socratic post-attempt explanations | FOUND |
| 5be1b95 | feat(07-02): extend Chat API and chatSystemPrompt to inject chatContext snippet | FOUND |
| e9ec402 | feat(07-02): add Explain this button and chatContext updates to Learn page | FOUND |
| 450a9cb | feat(07-03): create /api/advisor route | FOUND |
| 17c0401 | feat(07-03): create AdvisorCards component | FOUND |
| 35ba18b | feat(07-03): wire advisor button in chat page and graph concept click context | FOUND |

Note: The 07-03-SUMMARY.md incorrectly listed `e9ec402` as the Task 3 commit (that commit is for 07-02 Task 3). The actual 07-03 Task 3 commit is `35ba18b`. The code is correct in the codebase — this is a documentation-only error in the summary file.

---

## TypeScript Compilation

`npx tsc --noEmit` — zero errors across the full project.

---

## Gaps Summary

No gaps. All 18 must-have truths verified, all 10 required artifacts present and substantive, all 9 key links wired, all 6 requirement IDs satisfied. Four items flagged for human verification (require live LLM calls or browser session); all automated checks passed.

---

_Verified: 2026-02-26T22:00:00Z_
_Verifier: Claude (gsd-verifier)_
