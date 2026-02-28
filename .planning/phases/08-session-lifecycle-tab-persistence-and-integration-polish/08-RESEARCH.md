# Phase 8: Session Lifecycle, Tab Persistence & Integration Polish — Research

**Researched:** 2026-02-27
**Domain:** React state management (Zustand), Next.js App Router navigation, session lifecycle bugs, cross-tab UI integration
**Confidence:** HIGH — all findings come from direct inspection of the actual source files

---

## Summary

Phase 8 is a polish and bug-fix phase with no new external dependencies. Every issue listed in the phase description is rooted in the existing codebase — the tech stack (Next.js 16, React 19, Zustand, Tailwind CSS v4, Prisma/SQLite) is already locked and present. This research was conducted by reading all key source files directly; findings reflect the actual current state of the code.

The core problem class is **premature session PATCH**: the learn page's cleanup `useEffect` fires unconditionally on unmount (i.e., tab switch), immediately ending the session in the database. The Zustand `learnPhase` state machine partially addresses tab-switch restore but does not prevent the unmount-triggered PATCH. The chat "structuring" phase can lock the UI if the tab is switched mid-async-operation. The `chatLessonPlan` is never cleared when a new conversation is initiated. Several cross-tab wiring gaps (Graph → Learn bridge, `explainText` persistence, advisor card no-op, session summary concept breakdown) are straightforward UI additions.

**Primary recommendation:** Treat this as three distinct work streams: (1) fix the session PATCH trigger to only fire on explicit completion, (2) fix chat stuck-state and chatLessonPlan reset, (3) add the cross-tab integration UI improvements. Each stream is independent and can be planned in its own task.

---

## Standard Stack

No new libraries needed. All fixes are within the existing stack:

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zustand | (current) | In-memory UI state across tabs | Already used; store.ts is the source of truth for session state |
| Next.js App Router | 16 | File-based routing, layout.tsx tab navigation | Already used; navigation between tabs is `router.push()` + `Link` |
| Prisma | 7.4.1 | SQLite session PATCH endpoint | Session lifecycle persisted here |
| React 19 `useEffect` | 19 | Unmount/mount lifecycle hooks | The source of the premature PATCH bug |
| Tailwind CSS v4 | (current) | UI styling for new UI elements | Already used; follow CSS variable patterns, not shadcn/ui |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended Project Structure (unchanged)
```
adaptive-tutor/src/
├── app/(tabs)/
│   ├── layout.tsx          # Tab navigation + chatContextMode updates
│   ├── learn/page.tsx       # Session state machine (primary focus)
│   ├── chat/page.tsx        # Chat phase state + chatLessonPlan
│   └── graph/page.tsx       # NodeDetailPanel "Practice this" CTA
├── components/
│   ├── AdvisorCards.tsx     # "Practice this" button gating fix
│   └── graph/NodeDetailPanel.tsx  # Already has handlePractice()
└── lib/store.ts             # Zustand: chatLessonPlan, learnPhase, chatPhase
```

### Pattern 1: Conditional Session PATCH (Only on Explicit Completion)

**What:** The `useEffect` cleanup in `learn/page.tsx` currently fires PATCH unconditionally on unmount. It must be made conditional on the session being genuinely "complete" (not just a tab switch mid-practice).

**When to use:** Replaces the current unconditional cleanup logic.

**Root cause (from source, lines 327-342 of learn/page.tsx):**
```typescript
// CURRENT BUG: fires on tab switch too
useEffect(() => {
  return () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    // This fires ALWAYS on unmount — including tab switches
    if (activeStudyPlanId && sessionId) {
      fetch(`/api/study-plans/${activeStudyPlanId}/session`, {
        method: "PATCH", // prematurely ends session
        ...
      }).catch(() => {});
    }
    setCurrentSession(null);
    setTargetConceptId(null);
  };
}, [activeStudyPlanId, sessionId]);
```

**Correct pattern (use a ref to track intent):**
```typescript
// Add a ref to track whether the user explicitly completed the session
const sessionCompletedRef = useRef(false);

// In handleAdvance, when exhausting all questions:
// sessionCompletedRef.current = true;
// then call PATCH

// In cleanup effect:
useEffect(() => {
  return () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    // Only PATCH if the session was NOT explicitly completed already
    // (handleAdvance already sent the PATCH when completing)
    // Tab switches should NOT end the session
    setCurrentSession(null);
    // Do NOT call PATCH here
  };
}, [activeStudyPlanId, sessionId]);
```

The PATCH should only be called in `handleAdvance` when `nextIndex >= questions.length` (explicit completion), not in cleanup.

### Pattern 2: Chat Stuck-State Prevention

**What:** `chatPhase === "structuring"` disables the textarea and send button (line 749, 762 of chat/page.tsx). If the user switches tabs during `handleApprove()`, `setIsLoading(false)` never runs, leaving the UI frozen on return.

**Root cause:** `isLoading` and `chatPhase` are React `useState` — they're local to the component. On tab switch (unmount), they're discarded. On remount, they re-initialize to their defaults... but `chatPhase` is Zustand (`chatPhase: ChatPhase` in store.ts), so it persists. If a crash/nav happens during `structuring`, the persisted `chatPhase === "structuring"` will lock the chat UI forever.

**Fix pattern:** Add a recovery check on chat page mount:
```typescript
// In chat/page.tsx useEffect on mount:
useEffect(() => {
  // If chatPhase is stuck in "structuring" on mount, recover to "proposing"
  if (chatPhase === "structuring") {
    setChatPhase("proposing");
  }
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```

### Pattern 3: chatLessonPlan Reset on New Conversation

**What:** `resetChatState()` already clears `chatLessonPlan` (store.ts line 239-246). The bug is that starting a new conversation from `"done"` state (when user types again) calls `setChatPhase("gathering")` but does NOT call `resetChatState()`. So `chatLessonPlan` from the previous conversation persists.

**Root cause (chat/page.tsx lines 122-130):**
```typescript
if (chatPhase === "idle" || chatPhase === "done" || chatPhase === "proposing") {
  currentPhase = "gathering";
  setChatPhase("gathering");
  // When starting fresh from done state, clear old proposal
  if (chatPhase === "done") {
    setProposedLessonPlan(null);
    // BUG: chatLessonPlan is NOT cleared here
  }
}
```

**Fix:** Add `setChatLessonPlan(null)` alongside `setProposedLessonPlan(null)` when transitioning from `"done"` back to `"gathering"`.

### Pattern 4: explainText Persistence via Zustand

**What:** `explainText` is `useState<string | null>(null)` in learn/page.tsx. It's cleared on every tab switch and not persisted. Should be added to Zustand store (or treated as transient-but-retained like `learnPhase`).

**Options:**
- **Option A (simpler):** Add `explainText: string | null` to the Zustand store alongside `learnPhase`. Clear it when phase advances to next question (already done by `setExplainText(null)` in `handleAdvance`).
- **Option B (minimal):** Accept `explainText` as volatile — it's an inline tutor explanation that's specific to a single feedback moment. Tab switching intentionally moves the user away from feedback context. This is LOW priority.

Recommendation: Use Option A if the planner includes it; skip if time-constrained.

### Pattern 5: Graph → Learn Tab Bridge via NodeDetailPanel

**What:** `NodeDetailPanel.handlePractice()` already works correctly — it calls `setTargetConceptId(concept.id)`, `setActiveTab("learn")`, and `router.push("/learn")`. This CTA is already wired. The additional concern is that it does NOT update `chatContext.activeConceptId`, so the chat tab won't know which concept was targeted. The `onNodeClick` handler in graph/page.tsx already updates chatContext, but handlePractice in NodeDetailPanel doesn't.

**Fix:** Add `useAppStore.getState().setChatContext({ ...useAppStore.getState().chatContext, activeConceptId: concept.id })` inside `handlePractice()`.

### Pattern 6: Chat Banner Showing Current Learn Session Context

**What:** When user is on Chat tab and a Learn session is active (learnPhase === "practicing"), show a context banner at top of chat. The `learnPhase` field in Zustand (already exists) can drive this.

**Pattern:**
```typescript
// In chat/page.tsx
const learnPhase = useAppStore((s) => s.learnPhase);
const activeSession = learnPhase === "practicing" || learnPhase === "feedback";

// Render at top:
{activeSession && (
  <div className="px-4 py-2 text-xs border-b" style={{...}}>
    Active practice session in progress — ask me anything about what you're learning
  </div>
)}
```

### Pattern 7: Advisor Card "Practice this" Button Gating

**What:** In `AdvisorCards.tsx` (lines 77-89), the "Practice this" button is only rendered when `card.conceptId` is truthy. The issue per the phase description is that cards with no `conceptId` still show "Practice this" — but looking at the actual code, the button IS already gated with `{card.conceptId && (...)}`. This may be a non-issue or may refer to a different rendering path.

**Actual status:** The AdvisorCards component already gates the button correctly. The "does nothing" problem may be that `handlePractice` calls `router.push("/learn")` without a conceptId, which navigates to the generic Learn tab (which shows "Start Practice" screen). This is acceptable behavior — not broken, just unpolished.

**Fix options:**
- Option A: No change needed — navigate to Learn tab without concept targeting is correct for non-concept advisor cards.
- Option B: If cards without conceptId should navigate to a different action (e.g., open Graph tab for "bridge" type), add type-specific routing in `handlePractice`.

### Pattern 8: Session Summary Concept-by-Concept Breakdown

**What:** The "complete" phase render (learn/page.tsx lines 840-1003) shows a flat list of concept names (`coveredConceptMap`) but no per-concept proficiency delta, accuracy per concept, or comparison to session start.

**Missing data:** The session summary has access to `questions[]` (which has `conceptId` + `conceptName`), `sessionStats` (total), and each `AttemptResult` is not retained beyond `lastResult`. To show per-concept breakdown, we need to accumulate all attempt results during the session.

**Fix pattern:** Add `sessionAttempts: AttemptResult[]` to component state, accumulate in `submitAttempt` via `setSessionAttempts(prev => [...prev, result])`, then derive per-concept stats in the complete phase render.

### Pattern 9: Free Response Grading Explanation Display

**What:** The feedback section in learn/page.tsx (line 1460-1463) has a hardcoded fallback:
```typescript
{currentQuestion.questionType === "free_response"
  ? "Answer recorded. Evaluation coming in Phase 4."
  : lastResult.explanation}
```
This is stale copy from Phase 3. Phase 6 now provides real LLM grading. The `lastResult.feedback` contains the actual feedback from the LLM. The fix is to display `lastResult.feedback` (which is the LLM-generated feedback) for free_response, not this stale placeholder.

**Fix:** Replace the stale placeholder with actual feedback display:
```typescript
{currentQuestion.questionType === "free_response"
  ? lastResult.feedback  // Real LLM feedback from Phase 6
  : lastResult.explanation}
```
Additionally, the `/api/study-plans/[id]/attempt` endpoint returns `errorType` and `gapAnalysis` in its response (lines 253-255), but `AttemptResult` interface in learn/page.tsx (lines 19-37) does NOT include `errorType` or `gapAnalysis` fields. These should be added to show misconception-level feedback.

### Anti-Patterns to Avoid
- **Calling PATCH on tab switch:** Never end a session because a component unmounts. Only end on explicit user action (finishing all questions or clicking "End Session").
- **Resetting learnPhase on nav:** The existing smart restore logic (`learnActiveStudyPlanId === activeStudyPlanId && learnPhase === "practicing"`) must not be broken — any new cleanup logic must check this guard first.
- **Using local useState for cross-tab persistence:** `explainText`, `sessionAttempts`, etc. must use Zustand if they need to survive tab switches.
- **Clearing chatLessonPlan at wrong boundary:** Only clear `chatLessonPlan` when starting a new conversation from `done` state — not on tab switch or page refresh (it's intentionally Zustand-persisted to show the lesson plan summary).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting tab switch vs unmount | Custom document.visibilityState tracking | Ref flag (`sessionCompletedRef`) | Simpler — track intent, not mechanism |
| Accumulating per-question results | Complex result store | Simple `useState<AttemptResult[]>` array | Session is in-memory, doesn't need persistence |
| Chat phase recovery | Full state machine with persistence | Mount-effect guard checking `chatPhase === "structuring"` | One-line fix is sufficient |

**Key insight:** Every fix in Phase 8 uses patterns already established in the codebase (ref flags, Zustand fields, mount effects). No architectural changes are needed.

---

## Common Pitfalls

### Pitfall 1: Breaking the Existing Tab-Switch Restore Logic
**What goes wrong:** Adding new cleanup logic in the unmount effect that resets `learnPhase` or `learnActiveStudyPlanId` in Zustand — this breaks the restore guard.
**Why it happens:** The restore guard (lines 148-173) reads from Zustand on mount. If cleanup writes back to Zustand, the restore condition fails.
**How to avoid:** Only update Zustand `learnPhase` via `setLearnPhase(phase)` in the sync effect (line 176-178). Never reset it in cleanup.
**Warning signs:** Returning to the Learn tab shows "Start Practice" instead of resuming mid-session.

### Pitfall 2: Double-PATCH (Session Ended Twice)
**What goes wrong:** After the fix, both `handleAdvance` (explicit completion) AND a cleanup effect both send PATCH, resulting in a second PATCH to an already-ended session. The API returns 404 ("No active session found") which is benign but noisy.
**How to avoid:** Use `sessionCompletedRef.current = true` before the PATCH in `handleAdvance`. Check this ref in cleanup before firing any PATCH. This ref pattern is already used in the file (`skipFeedbackRef`).

### Pitfall 3: chatPhase "structuring" State Lost on Mid-Op Nav
**What goes wrong:** If `handleApprove()` (chat/page.tsx line 202) is in progress and the user navigates away, the async operation continues in the background. When it completes, `setChatPhase("done")` etc. are called on a now-unmounted component. React ignores these (harmless), but `chatPhase` in Zustand ends up stale.
**How to avoid:** Add an isMounted ref check in `handleApprove` before calling Zustand setters after each `await`. Or: add the mount-check recovery effect so stale `"structuring"` is always reset.

### Pitfall 4: Stale Closure in submitAttempt Capturing Old sessionId
**What goes wrong:** `submitAttempt` is memoized with `[activeStudyPlanId, sessionId, isSubmitting]` deps. If `sessionId` updates after the callback was created, the stale sessionId gets sent to the API.
**Why it happens:** This is an existing issue, not introduced by Phase 8. Session ID doesn't change mid-session, so this is low risk.
**Warning signs:** Attempt submissions fail with "Session not found" errors.

### Pitfall 5: AttemptResult Interface Mismatch
**What goes wrong:** The `AttemptResult` interface in learn/page.tsx doesn't include `errorType` or `gapAnalysis` fields, even though `/api/study-plans/[id]/attempt` now returns them (Phase 6). Accessing `result.errorType` in the UI will be a TypeScript compile error.
**How to avoid:** Update the `AttemptResult` interface to include `errorType?: string | null` and `gapAnalysis?: {...} | null` before adding any UI that reads these fields.

---

## Code Examples

Verified patterns from direct code inspection:

### Session PATCH Endpoint (confirmed behavior)
```typescript
// /api/study-plans/[id]/session PATCH
// Sets endTime = now on the session record
// Returns 404 if no active session (endTime already set)
// Source: adaptive-tutor/src/app/api/study-plans/[id]/session/route.ts
```

### Zustand Store: resetChatState (already resets chatLessonPlan)
```typescript
// Source: adaptive-tutor/src/lib/store.ts lines 238-246
resetChatState: () =>
  set({
    chatPhase: "idle",
    proposedLessonPlan: null,
    chatLessonPlan: null,  // already here — just needs to be called
    sourceText: "",
    priorKnowledge: "",
    chatMessages: [],
  }),
```

### Tab-Switch Restore Guard (working correctly, must not be broken)
```typescript
// Source: adaptive-tutor/src/app/(tabs)/learn/page.tsx lines 148-173
useEffect(() => {
  const store = useAppStore.getState();
  if (
    store.learnActiveStudyPlanId === activeStudyPlanId &&
    (store.learnPhase === "practicing" || store.learnPhase === "feedback")
  ) {
    setPhase("practicing"); // Restore mid-session
    if (store.currentQuestions.length > 0) {
      setQuestions([...store.currentQuestions]);
      setQuestionIndex(store.currentQuestionIndex);
      setSessionId(store.currentSession?.id ?? null);
    }
    return; // Skip the reset below
  }
  // ... reset to idle
}, [activeStudyPlanId]);
```

### Advisor Card "Practice this" Already Gated
```typescript
// Source: adaptive-tutor/src/components/AdvisorCards.tsx lines 77-89
{card.conceptId && (
  <button onClick={() => handlePractice(card)}>
    Practice this
  </button>
)}
// Button only renders when conceptId exists — already correct
```

### Free Response Feedback — Stale Copy to Fix
```typescript
// Source: adaptive-tutor/src/app/(tabs)/learn/page.tsx lines 1460-1463
// STALE: "Answer recorded. Evaluation coming in Phase 4."
// Phase 6 provides real LLM feedback in lastResult.feedback
```

### NodeDetailPanel handlePractice (already working, missing chatContext update)
```typescript
// Source: adaptive-tutor/src/components/graph/NodeDetailPanel.tsx lines 88-93
function handlePractice() {
  useAppStore.getState().setTargetConceptId(concept.id);
  useAppStore.getState().setActiveTab("learn");
  router.push("/learn");
  // MISSING: setChatContext({ ...chatContext, activeConceptId: concept.id })
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| PATCH on any unmount | PATCH only on explicit completion | Stops premature session termination |
| chatLessonPlan persists across conversations | Reset chatLessonPlan when starting new chat | Prevents stale lesson plan display |
| "structuring" phase survives crashes | Recovery guard on mount | Prevents permanently stuck Chat UI |
| Free response: "Phase 4" placeholder | Display actual LLM feedback | Meaningful free response feedback |
| No per-concept summary | Accumulate attempts, derive per-concept stats | Richer session summary |

---

## Open Questions

1. **Should explainText be persisted across tab switches?**
   - What we know: It's local `useState`, cleared on tab switch. `learnPhase` and questions ARE preserved.
   - What's unclear: Is it valuable to restore the explanation when user returns? The explanation is specific to a single question's feedback moment.
   - Recommendation: Treat as low priority. If implemented, add `explainText: string | null` to Zustand store (same as `learnPhase`). Clear in `handleAdvance` (already done).

2. **Session summary: where to get per-concept proficiency deltas?**
   - What we know: Each `submitAttempt` returns `proficiencyUpdate: { previousProficiency, newProficiency }`. Only the last result (`lastResult`) is stored in state; previous ones are discarded.
   - What's unclear: Do we need server-round-trip to get the deltas, or accumulate locally?
   - Recommendation: Accumulate `AttemptResult[]` in a local `sessionAttempts` state during the session. This is purely in-memory, no API change needed.

3. **Chat banner for active Learn session — what triggers it?**
   - What we know: `learnPhase` in Zustand is set to `"practicing"` when the session starts. Chat tab can read this directly.
   - What's unclear: Should the banner be dismissable? Should it navigate to Learn on click?
   - Recommendation: Show non-dismissable info banner reading "Practice session active — your questions are being personalized." No click behavior needed (keeps it simple).

4. **Advisor card "Practice this" for bridge/new_domain types with no conceptId**
   - What we know: The code already gates the button on `card.conceptId`. Cards without conceptId show no button.
   - What's unclear: The phase description says these cards "show 'Practice this' button that does nothing." This may be referring to a different render path, or may have been fixed already.
   - Recommendation: Verify by running the advisor and checking bridge/new_domain card output. If the button is already hidden, this item can be closed as a non-issue.

---

## Detailed Bug Inventory

### Bug 1: Session PATCH on Tab Switch
**File:** `adaptive-tutor/src/app/(tabs)/learn/page.tsx`
**Lines:** 327-342 (cleanup effect)
**Root cause:** `useEffect` cleanup fires on every unmount, including tab navigation.
**Fix:** Remove PATCH from cleanup. Move it exclusively to `handleAdvance` when `nextIndex >= questions.length`. Add `sessionCompletedRef.current = true` before the PATCH call.
**Verification:** Switch to Graph tab mid-session and return. Session should resume, not restart.

### Bug 2: Chat "structuring" Phase Stuck
**File:** `adaptive-tutor/src/app/(tabs)/chat/page.tsx`
**Lines:** 80 (useEffect), 204 (`setChatPhase("structuring")`)
**Root cause:** `chatPhase` is Zustand-persisted. If navigation occurs during `handleApprove()`, the phase is stuck on `"structuring"` permanently.
**Fix:** Add mount-time recovery in a `useEffect(() => { if (chatPhase === "structuring") setChatPhase("proposing"); }, [])`.
**Verification:** Start plan approval, switch tabs before completion, return. Chat should not be locked.

### Bug 3: chatLessonPlan Not Cleared on New Conversation
**File:** `adaptive-tutor/src/app/(tabs)/chat/page.tsx`
**Lines:** 126-129 (`handleSubmit` transition from `done` → `gathering`)
**Root cause:** `setProposedLessonPlan(null)` is called but `setChatLessonPlan(null)` is not.
**Fix:** Add `setChatLessonPlan(null)` on the `chatPhase === "done"` branch.
**Verification:** Complete a study plan. Send a new message. Previous lesson plan card should not appear.

### Bug 4: Free Response Feedback Shows Stale Placeholder
**File:** `adaptive-tutor/src/app/(tabs)/learn/page.tsx`
**Lines:** 1460-1463 (feedback section)
**Root cause:** Hardcoded "Answer recorded. Evaluation coming in Phase 4." — not updated when Phase 6 LLM grading was implemented.
**Fix:** Replace with `lastResult.feedback` for free_response questions. Also update `AttemptResult` interface to include `errorType` and `gapAnalysis` fields.
**Verification:** Submit a free response answer, verify LLM feedback is displayed.

### Non-Bug 5: NodeDetailPanel "Practice this concept" — Already Works
**File:** `adaptive-tutor/src/components/graph/NodeDetailPanel.tsx`
**Lines:** 88-93 (`handlePractice`)
**Status:** The CTA sets `targetConceptId` and navigates to `/learn`. It DOES work. The gap is that it doesn't update `chatContext.activeConceptId`. This is a nice-to-have enhancement, not a broken feature.
**Enhancement:** Add `setChatContext` call in `handlePractice`.

### Enhancement 6: Session Summary Per-Concept Breakdown
**File:** `adaptive-tutor/src/app/(tabs)/learn/page.tsx`
**Lines:** 840-1003 (complete phase render)
**Status:** Shows flat concept list + aggregate stats. No per-concept proficiency delta.
**Enhancement:** Add `sessionAttempts: AttemptResult[]` state. Accumulate in `submitAttempt`. Derive per-concept accuracy and proficiency change in complete render.

### Enhancement 7: Chat Tab Learn Session Banner
**File:** `adaptive-tutor/src/app/(tabs)/chat/page.tsx`
**Status:** No banner showing active Learn session context.
**Enhancement:** Read `learnPhase` from Zustand. Render a passive info banner when `learnPhase === "practicing"`.

---

## Sources

### Primary (HIGH confidence — direct source code inspection)
- `adaptive-tutor/src/app/(tabs)/learn/page.tsx` — Full read, session lifecycle, cleanup effect, feedback render
- `adaptive-tutor/src/app/(tabs)/chat/page.tsx` — Full read, chat phase machine, handleApprove, chatLessonPlan
- `adaptive-tutor/src/lib/store.ts` — Full read, Zustand state shape, resetChatState, learnPhase
- `adaptive-tutor/src/app/api/study-plans/[id]/session/route.ts` — Full read, GET/PATCH behavior
- `adaptive-tutor/src/app/api/study-plans/[id]/attempt/route.ts` — Full read, response shape including errorType/gapAnalysis
- `adaptive-tutor/src/components/AdvisorCards.tsx` — Full read, button gating behavior
- `adaptive-tutor/src/components/graph/NodeDetailPanel.tsx` — Full read, handlePractice CTA
- `adaptive-tutor/src/app/(tabs)/graph/page.tsx` — Full read, onNodeClick, NodeDetailPanel integration
- `adaptive-tutor/src/app/(tabs)/layout.tsx` — Full read, tab navigation, chatContextMode updates
- `.planning/STATE.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md` — Project context

### Secondary (MEDIUM confidence)
None — all findings are from direct code inspection, not external sources.

### Tertiary (LOW confidence)
None.

---

## Metadata

**Confidence breakdown:**
- Bug identification: HIGH — sourced from direct code inspection
- Fix patterns: HIGH — patterns established in existing codebase (ref flags, Zustand, mount effects)
- Enhancement scope: HIGH — scope is bounded, no new APIs or libraries needed
- Pitfall identification: HIGH — patterns observed in actual code

**Research date:** 2026-02-27
**Valid until:** Indefinitely stable (fixes internal code state, no external dependencies to change)
