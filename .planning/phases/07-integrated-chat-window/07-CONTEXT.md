# Phase 7: Integrated Chat Window - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the chat tutor context-aware and accessible from where the user is learning — without requiring navigation to the Chat tab. This phase delivers: (1) a `chatContext` state object that tracks what the user is currently doing, (2) a context-aware Chat tab that reads that state to offer relevant help, (3) a "What should I learn next?" advisor as a quick-action in the chat interface, and (4) inline "Explain this" tutor explanations in the Learn tab. The underlying LLM calls are architecturally consistent so explanations can migrate to a persistent chat panel in a future phase.

Creating a floating/split-screen persistent chat panel is NOT part of this phase — that's a future capability.

</domain>

<decisions>
## Implementation Decisions

### chatContext shape and update triggers
- `chatContext` is a Zustand store field: `{ mode: "idle" | "practicing" | "exploring" | "planning", activeConceptId?: string, activeUnitGraphId?: string, recentAttempts?: Attempt[] }`
- Updates on **tab switch** (mode changes: practicing = Learn tab, exploring = Graph tab, planning = Chat tab)
- Also updates on **key events**: question attempt submitted, concept node clicked, gap proposal shown
- Chat API receives `chatContext` in system prompt so tutor knows what user was just doing

### "What should I learn next?" advisor
- Appears as a **quick-action button** above the chat input field in the Chat tab (similar to suggested prompts in ChatGPT)
- When triggered, runs bridge detection + frontier expansion analysis and returns results as **interactive cards inline in the chat message**
- Each card: concept name + reason (why this is the recommended next step) + "Practice this" button
- 2-3 recommendations per response, ranked

### Inline tutor in Learn tab
- After a wrong answer, feedback card shows an **"Explain this" button** (not automatic)
- User taps → LLM call generates explanation of why their answer was wrong and how to think about it correctly
- Explanation appears **below the feedback card** as an expandable block
- LLM call uses the same prompt structure as the Chat tutor (consistent architecture) so it can be migrated to a chat panel later

### Context injection into Chat API
- The chat system prompt is extended with a compressed `chatContext` snapshot (~50-100 tokens)
- If `mode === "practicing"` and `activeConceptId` is set, chat knows which concept user is struggling with
- If `recentAttempts` shows repeated wrong answers, chat can proactively offer to explain

### Claude's Discretion
- Exact wording of the "Explain this" button
- Visual styling of inline explanation block
- How `recentAttempts` is compressed for the prompt (last N attempts, or just wrong ones)
- Whether advisor quick-action button shows a label or just an icon

</decisions>

<specifics>
## Specific Ideas

- The chat should feel like it "remembers" what you were just doing — no re-explaining context
- Advisor cards in chat should be actionable (click "Practice this" → switch to Learn tab with that concept targeted), not just informational
- Inline tutor explanations are "same LLM, different surface" — the architecture should make this explicit (shared prompt builder, shared API route or shared utility)

</specifics>

<deferred>
## Deferred Ideas

- Persistent floating/split-screen chat panel that stays open while practicing — future phase
- Migrating inline tutor explanations INTO the chat panel (stream them there instead of inline) — after persistent panel exists
- Real-time chat while answering a question (before submitting) — future phase

</deferred>

---

*Phase: 07-integrated-chat-window*
*Context gathered: 2026-02-26*
