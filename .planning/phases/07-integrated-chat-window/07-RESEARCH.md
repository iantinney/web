# Phase 7: Integrated Chat Window - Research

**Researched:** 2026-02-26
**Domain:** Zustand state augmentation, context-aware LLM prompting, React component patterns (inline UI + quick-action buttons), Next.js App Router API routes
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- `chatContext` is a Zustand store field: `{ mode: "idle" | "practicing" | "exploring" | "planning", activeConceptId?: string, activeUnitGraphId?: string, recentAttempts?: Attempt[] }`
- Updates on **tab switch** (mode changes: practicing = Learn tab, exploring = Graph tab, planning = Chat tab)
- Also updates on **key events**: question attempt submitted, concept node clicked, gap proposal shown
- Chat API receives `chatContext` in system prompt so tutor knows what user was just doing
- "What should I learn next?" advisor appears as a **quick-action button** above the chat input field in the Chat tab (similar to suggested prompts in ChatGPT)
- When triggered, runs bridge detection + frontier expansion analysis and returns results as **interactive cards inline in the chat message**
- Each advisor card: concept name + reason (why this is the recommended next step) + "Practice this" button
- 2-3 recommendations per response, ranked
- After a wrong answer, feedback card shows an **"Explain this" button** (not automatic)
- User taps → LLM call generates explanation of why their answer was wrong and how to think about it correctly
- Explanation appears **below the feedback card** as an expandable block
- LLM call uses the same prompt structure as the Chat tutor (consistent architecture) so it can be migrated to a chat panel later
- The chat system prompt is extended with a compressed `chatContext` snapshot (~50-100 tokens)
- If `mode === "practicing"` and `activeConceptId` is set, chat knows which concept user is struggling with
- If `recentAttempts` shows repeated wrong answers, chat can proactively offer to explain

### Claude's Discretion

- Exact wording of the "Explain this" button
- Visual styling of inline explanation block
- How `recentAttempts` is compressed for the prompt (last N attempts, or just wrong ones)
- Whether advisor quick-action button shows a label or just an icon

### Deferred Ideas (OUT OF SCOPE)

- Persistent floating/split-screen chat panel that stays open while practicing — future phase
- Migrating inline tutor explanations INTO the chat panel (stream them there instead of inline) — after persistent panel exists
- Real-time chat while answering a question (before submitting) — future phase
</user_constraints>

---

## Summary

Phase 7 adds three connected features to the existing adaptive tutor: (1) a `chatContext` Zustand field that tracks what the user is doing across tabs, (2) a "What should I learn next?" advisor button in the Chat tab that returns interactive recommendation cards, and (3) an "Explain this" button in the Learn tab feedback card that calls the LLM inline. These features share a unified architecture: `chatContext` is read by both the Chat API system prompt and the inline explainer prompt builder, making the advisor and the inline tutor two surfaces for the same underlying intelligence.

The existing codebase provides strong foundations for all three features. The Zustand store (`store.ts`) already has `activeTab`, `activeUnitGraphId`, `graphConcepts`, `currentQuestions`, and `currentQuestionIndex` — all the raw data needed to populate `chatContext`. The chat API (`/api/chat/route.ts`) already uses a `chatSystemPrompt()` function that assembles a structured system prompt from context data. The Learn page (`learn/page.tsx`) already has a `lastResult` state variable holding the `AttemptResult` (with `isCorrect`, `feedback`, `explanation`, `score`) that is shown in the feedback phase. The `FloatingChatButton` component is a stub explicitly marked as a placeholder, ready to be repurposed or replaced.

The key architectural decision is to build a **shared prompt builder** (`lib/prompts/tutor.ts` or appended to `lib/prompts/index.ts`) that produces the inline explanation prompt from the same `chatContext` shape the Chat API uses. This ensures the inline tutor and the chat panel are structurally identical, so a future phase can redirect the inline call to the chat panel with minimal refactoring. The advisor cards in chat should be implemented as a structured message type (not raw markdown) so the React renderer can display them as interactive elements with "Practice this" buttons.

**Primary recommendation:** Add `chatContext` to the Zustand store, wire tab-switch and key-event updates, extend the chat API system prompt to include it, build a shared `buildExplainPrompt()` utility, add the inline "Explain this" block to the feedback card in the Learn page, and add the advisor quick-action button with inline card rendering to the Chat page.

---

## Standard Stack

### Core (all already installed — no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | ^5.0.11 | `chatContext` field + update actions | Already the project state layer — no change |
| next.js App Router | 16.1.6 | New API route for advisor + shared explainer route | Existing pattern for all API routes |
| react | 19.2.3 | New UI components (advisor cards, explain block) | Project framework |
| lucide-react | ^0.575.0 | Icons for advisor cards, explain button | Already used throughout |
| framer-motion | ^12.34.3 | Expand/collapse animation for explanation block | Already installed, used in Learn page |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| minimax-native.ts (`generateText`) | internal | LLM calls for advisor + explainer | All server-side LLM calls in this project use this |
| `lib/prompts/index.ts` | internal | Add new prompt builders here | All prompts centralized here already |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New API route for explainer | Reuse `/api/chat` with a flag | New route is cleaner; keeps routing logic simple; explainer needs different response shape |
| Custom streaming for advisor | Non-streaming (current pattern) | Advisor is a single structured response (JSON cards); streaming adds complexity without UX benefit |
| Separate prompt file | Add to `lib/prompts/index.ts` | Index.ts already has all prompts; adding here avoids import sprawl |

**Installation:** No new packages required. All dependencies exist.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
adaptive-tutor/src/
├── lib/
│   ├── store.ts                     # ADD: chatContext field + update actions
│   └── prompts/
│       └── index.ts                 # ADD: buildChatContextSnippet(), explainAnswerPrompt(), advisorPrompt()
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts             # MODIFY: inject chatContext into system prompt
│   │   └── advisor/
│   │       └── route.ts             # NEW: advisor recommendations endpoint
│   └── (tabs)/
│       ├── chat/
│       │   └── page.tsx             # MODIFY: add advisor quick-action button + card renderer
│       └── learn/
│           └── page.tsx             # MODIFY: add "Explain this" button + explanation block in feedback
└── components/
    └── AdvisorCards.tsx             # NEW: renders 2-3 recommendation cards with "Practice this" buttons
```

### Pattern 1: chatContext as Zustand field

**What:** A new field on the existing Zustand store that is a snapshot of what the user is currently doing. Updated by tab navigation hooks and key events.

**When to use:** Whenever any component needs to know the user's activity context. Read by: Chat page (sent to API), Learn page (tracks practicing state).

**How the store is structured now:** The `AppState` interface already has `activeTab: "chat" | "learn" | "graph"`, `activeUnitGraphId`, `graphConcepts`, `currentQuestions`, `currentQuestionIndex`, `targetConceptId`. `chatContext` is a derived snapshot of these.

**Example:**
```typescript
// In store.ts — add to AppState interface:
export interface ChatContext {
  mode: "idle" | "practicing" | "exploring" | "planning";
  activeConceptId?: string;      // concept currently being practiced
  activeUnitGraphId?: string;    // currently active graph
  recentAttempts?: {
    conceptId: string;
    isCorrect: boolean;
    score: number;
  }[];
}

// New field in AppState:
chatContext: ChatContext;

// New actions:
setChatContext: (ctx: ChatContext) => void;
updateChatContextMode: (mode: ChatContext["mode"]) => void;
recordAttemptInContext: (attempt: { conceptId: string; isCorrect: boolean; score: number }) => void;

// Initial state:
chatContext: { mode: "idle" },

// Action implementations:
setChatContext: (ctx) => set({ chatContext: ctx }),
updateChatContextMode: (mode) => set((state) => ({ chatContext: { ...state.chatContext, mode } })),
recordAttemptInContext: (attempt) =>
  set((state) => ({
    chatContext: {
      ...state.chatContext,
      recentAttempts: [
        attempt,
        ...(state.chatContext.recentAttempts ?? []),
      ].slice(0, 5), // keep last 5 attempts
    },
  })),
```

### Pattern 2: Tab-switch Mode Updates

**What:** The layout (`(tabs)/layout.tsx`) detects navigation and updates `chatContext.mode`. Currently the layout uses `usePathname()` but does not call any Zustand actions.

**When to use:** Any time the user navigates between tabs.

**Implementation:** The `(tabs)/layout.tsx` component already imports `usePathname`. Add a `useEffect` that watches pathname changes and calls `updateChatContextMode`.

```typescript
// In (tabs)/layout.tsx — add:
import { useAppStore } from "@/lib/store";

// Inside component:
const updateChatContextMode = useAppStore((s) => s.updateChatContextMode);

useEffect(() => {
  const modeMap: Record<string, "practicing" | "exploring" | "planning" | "idle"> = {
    "/learn": "practicing",
    "/graph": "exploring",
    "/chat": "planning",
  };
  updateChatContextMode(modeMap[pathname] ?? "idle");
}, [pathname, updateChatContextMode]);
```

### Pattern 3: Key-Event Context Updates

**What:** After an attempt is submitted in the Learn page, `recordAttemptInContext` is called with the result. When a concept node is clicked in the graph page, `activeConceptId` is set. When a gap proposal is shown, that is also a key event to record.

**When to use:** After `setLastResult(result)` is called in `submitAttempt` in `learn/page.tsx`.

```typescript
// In learn/page.tsx — inside submitAttempt, after setLastResult:
recordAttemptInContext({
  conceptId: result.proficiencyUpdate.conceptId,
  isCorrect: result.isCorrect,
  score: result.score,
});

// Also set activeConceptId from current question:
setChatContext({
  ...store.getState().chatContext,
  activeConceptId: result.proficiencyUpdate.conceptId,
});
```

**For graph page — concept node click:**
```typescript
// In graph/page.tsx — when selectedConcept changes:
useEffect(() => {
  if (selectedConcept) {
    setChatContext({
      ...useAppStore.getState().chatContext,
      activeConceptId: selectedConcept.id,
    });
  }
}, [selectedConcept]);
```

### Pattern 4: chatContext Injection into Chat API

**What:** A utility function `buildChatContextSnippet(ctx: ChatContext): string` that converts the `chatContext` object into a compressed (~50-100 token) text block for inclusion in the system prompt.

**When to use:** Called in `/api/chat/route.ts` inside the idle/default phase handler, before passing to `chatSystemPrompt()`. Also called by the inline explainer route.

```typescript
// In lib/prompts/index.ts — add:
export function buildChatContextSnippet(ctx: ChatContext): string {
  const lines: string[] = [`USER CURRENT ACTIVITY: ${ctx.mode}`];
  if (ctx.activeConceptId) {
    lines.push(`Active concept ID: ${ctx.activeConceptId}`);
  }
  if (ctx.activeUnitGraphId) {
    lines.push(`Active graph ID: ${ctx.activeUnitGraphId}`);
  }
  if (ctx.recentAttempts && ctx.recentAttempts.length > 0) {
    const wrongCount = ctx.recentAttempts.filter((a) => !a.isCorrect).length;
    lines.push(
      `Recent attempts: ${ctx.recentAttempts.length} total, ${wrongCount} incorrect`
    );
    if (wrongCount >= 2) {
      lines.push("Note: User is struggling — proactively offer to explain.");
    }
  }
  return lines.join("\n");
}
```

The chat system prompt already accepts a freeform context block. The simplest integration is to extend the `chatSystemPrompt()` signature to accept an optional `chatContextSnippet?: string` parameter and append it to the prompt.

### Pattern 5: Inline "Explain this" Explainer

**What:** After a wrong answer, the feedback card in `learn/page.tsx` shows an "Explain this" button. When clicked, it calls a shared utility function that POSTs to either `/api/chat` (with an `explainMode` flag) or a new `/api/explain` route, and renders the response below the feedback card in an expandable block.

**Architecture decision:** Use a new POST `/api/explain` route. Reason: the explainer needs a different response shape (just `{ explanation: string }`, no chat state machine), and separating concerns avoids adding more flags to the already-branching `/api/chat` route.

```typescript
// New: /api/explain/route.ts
export async function POST(req: NextRequest) {
  const { question, userAnswer, correctAnswer, feedback, conceptName, chatContext } = await req.json();
  const systemPrompt = explainAnswerPrompt({ question, userAnswer, correctAnswer, feedback, conceptName, chatContext });
  const text = await generateText([{ role: "user", content: "Please explain this." }], systemPrompt, { temperature: 0.5, maxTokens: 512 });
  return NextResponse.json({ explanation: text });
}
```

**New prompt function in `lib/prompts/index.ts`:**
```typescript
export function explainAnswerPrompt(ctx: {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  feedback: string;
  conceptName: string;
  chatContext?: ChatContext;
}): string {
  const contextNote = ctx.chatContext?.recentAttempts
    ? `The learner has answered ${ctx.chatContext.recentAttempts.length} recent questions, with ${ctx.chatContext.recentAttempts.filter((a) => !a.isCorrect).length} incorrect.`
    : "";

  return `You are a patient, Socratic tutor. A student just answered a question incorrectly.

CONCEPT: ${ctx.conceptName}
QUESTION: ${ctx.question}
STUDENT'S ANSWER: ${ctx.userAnswer}
CORRECT ANSWER: ${ctx.correctAnswer}
FEEDBACK GIVEN: ${ctx.feedback}
${contextNote}

Explain IN 2-4 SENTENCES:
1. Why the student's answer was wrong (without being harsh)
2. The correct way to think about it
3. A memory anchor or intuition to help them remember

Be warm, specific, and concrete. Avoid jargon. Do not repeat the question verbatim.`;
}
```

**In `learn/page.tsx` — add to state and feedback phase:**
```typescript
// New state:
const [explainLoading, setExplainLoading] = useState(false);
const [explainText, setExplainText] = useState<string | null>(null);

// Handler:
async function handleExplainThis() {
  if (!currentQuestion || !lastResult) return;
  setExplainLoading(true);
  try {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: currentQuestion.questionText,
        userAnswer: textInput,           // or selectedMcqOption
        correctAnswer: currentQuestion.correctAnswer,
        feedback: lastResult.feedback,
        conceptName: currentQuestion.conceptName,
        chatContext: useAppStore.getState().chatContext,
      }),
    });
    const { explanation } = await res.json();
    setExplainText(explanation);
  } catch {
    setExplainText("I couldn't generate an explanation right now. Try again.");
  } finally {
    setExplainLoading(false);
  }
}
```

**Explanation block below feedback card:**
```typescript
// In the feedback UI (phase === "feedback"), ONLY shown when !lastResult.isCorrect:
{!lastResult.isCorrect && (
  <div>
    {!explainText && (
      <button onClick={handleExplainThis} disabled={explainLoading}>
        {explainLoading ? <Loader2 size={14} className="animate-spin" /> : null}
        {explainLoading ? "Thinking..." : "Explain this"}
      </button>
    )}
    {explainText && (
      <div className="rounded-xl border p-3 mt-3 text-sm leading-relaxed"
           style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}>
        {explainText}
      </div>
    )}
  </div>
)}
```

Reset `explainText` and `explainLoading` when `handleAdvance` is called (moving to next question).

### Pattern 6: Advisor Quick-Action Button

**What:** A button rendered above the chat input field in `chat/page.tsx` (outside the message list, in the input area). When clicked, calls a new `/api/advisor` route that returns 2-3 ranked recommendations as structured JSON, which the chat page renders as inline cards in the message list.

**Implementation:** The advisor result is appended to `chatMessages` as an assistant message with a special content type. The message renderer in `chat/page.tsx` needs to detect and render `AdvisorCards` differently from plain text messages.

**Approach:** Use a discriminated union on ChatMessage:

```typescript
// Extend ChatMessage in store.ts:
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  messageType?: "text" | "advisor_cards";  // default: "text"
  advisorCards?: AdvisorCard[];
}

export interface AdvisorCard {
  type: "review" | "continue" | "remediate" | "extend" | "bridge" | "new_domain";
  title: string;
  pitch: string;
  conceptId?: string;
  unitGraphId?: string;
  priority: number;
}
```

**New `/api/advisor/route.ts`:**
```typescript
export async function POST(req: NextRequest) {
  const { chatContext } = await req.json();
  const userId = req.headers.get("x-user-id") ?? "demo-user";

  // Fetch learner state from DB (same pattern as /api/chat idle phase):
  // - active study plans + progress
  // - graph concepts with proficiency
  // - recent attempts
  // - gap detection patterns

  const systemPrompt = advisorPrompt({ activePlans, graphConcepts, recentAttempts, gapDetections, chatContext });
  const text = await generateText([{ role: "user", content: "What should I learn next?" }], systemPrompt, { temperature: 0.3, maxTokens: 1024 });

  // Parse JSON from LLM response
  const recommendations = JSON.parse(text) as AdvisorCard[];
  return NextResponse.json({ recommendations: recommendations.slice(0, 3) });
}
```

**In `chat/page.tsx` — quick-action button above input:**
```typescript
async function handleAdvisor() {
  setIsLoading(true);
  // Add "What should I learn next?" as user message
  addChatMessage({ id: crypto.randomUUID(), role: "user", content: "What should I learn next?" });
  try {
    const res = await fetch("/api/advisor", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
      body: JSON.stringify({ chatContext: useAppStore.getState().chatContext }),
    });
    const { recommendations } = await res.json();
    addChatMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Here are my recommendations for what to learn next:",
      messageType: "advisor_cards",
      advisorCards: recommendations,
    });
  } catch {
    addChatMessage({ id: crypto.randomUUID(), role: "assistant", content: "Sorry, I couldn't generate recommendations right now." });
  } finally {
    setIsLoading(false);
  }
}
```

**AdvisorCards component (`components/AdvisorCards.tsx`):**
```typescript
// Each card: concept name, pitch, "Practice this" button
// "Practice this" button: setTargetConceptId(card.conceptId) + router.push("/learn")
```

### Anti-Patterns to Avoid

- **Storing `chatContext` in React state (not Zustand):** It needs to be accessible from any tab without prop drilling. It belongs in Zustand.
- **Using `useEffect` to compute `chatContext` from other store fields:** This introduces stale closures and double-renders. Update `chatContext` directly at the event sites (submitAttempt, tab switch, concept click).
- **Blocking the feedback screen to fetch explanations:** The "Explain this" button must be async; the feedback card must render immediately. Never await the explanation before showing the feedback card.
- **Putting advisor logic in the chat page component:** The advisor API route should do all the DB querying. The chat page just POSTs and renders cards.
- **Rendering advisor cards as raw Markdown:** The cards need a "Practice this" button that is a React `<button>` with a click handler. If cards are just strings, they cannot be interactive. Use the `messageType: "advisor_cards"` discriminated union.
- **Clearing `chatContext` on tab switch:** Mode should update, but `activeConceptId`, `activeUnitGraphId`, and `recentAttempts` should persist until explicitly overwritten. A user switching from Learn to Chat should still have their `activeConceptId` visible to the chat system prompt.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM calls | Custom fetch logic | `generateText()` from `lib/minimax-native.ts` | Already handles Anthropic-compatible API, model selection, error handling, response parsing |
| Prompt management | Inline template strings in API routes | Functions in `lib/prompts/index.ts` | All prompts are centralized here; adding new ones follows existing pattern |
| State updates across tabs | React context or prop drilling | Zustand store | Already the project state layer; all tabs read from it |
| Streaming responses for explainer | SSE / ReadableStream | Non-streaming `generateText` | Explainer is short (2-4 sentences); streaming overhead not worth it; consistent with existing pattern |
| Advisor card navigation | Custom routing logic | `setTargetConceptId(id)` + `router.push("/learn")` | `targetConceptId` already drives concept-targeted practice sessions in the Learn page |

**Key insight:** Everything new in this phase is a thin layer on top of already-built infrastructure. The risk is over-engineering. Each feature should be as small as possible while following existing patterns.

---

## Common Pitfalls

### Pitfall 1: `lastResult` is local state, not store state

**What goes wrong:** `lastResult` (the `AttemptResult` from the last submitted attempt) is local React state inside `learn/page.tsx`. The `/api/explain` call needs question data (`questionText`, `correctAnswer`, `conceptName`) from the current question AND the result (`feedback`, `isCorrect`) from `lastResult`. Both are available locally — but only while the user is on the feedback screen.

**Why it happens:** The explain call is triggered from the feedback UI, which has access to both `currentQuestion` and `lastResult` as local vars.

**How to avoid:** Build the explain call handler inside `learn/page.tsx` where both `currentQuestion` and `lastResult` are in scope. Do not try to put this in a shared hook that reads from the store — the store does not hold `lastResult`.

**Warning signs:** Explanation renders with "undefined" question or answer text.

### Pitfall 2: Stale `chatContext` in Chat API

**What goes wrong:** The Chat tab sends `chatContext` in the POST body, but the user has been on Learn for 5 minutes and the store was updated — the Chat page component may have a stale reference.

**Why it happens:** React closures in event handlers can capture stale state if the component does not re-subscribe.

**How to avoid:** Read `chatContext` from the store at call time using `useAppStore.getState().chatContext` (direct store access, not from a cached hook ref) when building the POST body in `handleSubmit`.

**Warning signs:** Chat responds as if user is "idle" even while they are practicing.

### Pitfall 3: Advisor response is not parseable JSON

**What goes wrong:** The LLM returns markdown-wrapped JSON or adds prose before/after the JSON array.

**Why it happens:** MiniMax models sometimes add explanation text around JSON. The grading prompt already handles this with `JSON.parse()` — the advisor prompt must be equally strict.

**How to avoid:** Use the same JSON-only prompt discipline as other structured prompts: "OUTPUT ONLY VALID JSON. No markdown fences, no preamble." Wrap `JSON.parse()` in a try/catch; on failure, return a safe fallback message.

**Warning signs:** `JSON.parse()` throws in the advisor route; users see an error card instead of recommendations.

### Pitfall 4: "Explain this" button shows on correct answers

**What goes wrong:** The explanation block renders even when the user answered correctly, which is jarring and unnecessary.

**Why it happens:** Forgetting to gate the button on `!lastResult.isCorrect`.

**How to avoid:** The button and explanation block must be wrapped in `{!lastResult.isCorrect && (...)}`.

**Warning signs:** Users see "Explain this" after getting a question right.

### Pitfall 5: `recordAttemptInContext` causes infinite re-renders

**What goes wrong:** Calling Zustand's `recordAttemptInContext` inside `submitAttempt` (which is a `useCallback` with dependencies) causes the callback to be recreated on every render, leading to stale closure issues or re-render loops.

**Why it happens:** The `submitAttempt` callback already has a comment noting its dependency array is manually managed (`// eslint-disable-next-line react-hooks/exhaustive-deps`). Adding a new dependency without updating the eslint-disable comment causes lint errors.

**How to avoid:** Call `useAppStore.getState().recordAttemptInContext(...)` (direct store access, bypassing React hooks) inside `submitAttempt`. This is already the pattern used in the same function for `redirectedFromConceptId` (`const { redirectedFromConceptId: currentRedirectId } = useAppStore.getState()`).

**Warning signs:** Console warnings about component re-renders; `submitAttempt` being called multiple times per attempt.

### Pitfall 6: Chat tab does not read `chatContext` from store on send

**What goes wrong:** `handleSubmit` in `chat/page.tsx` constructs the POST body using values from the React hook's closure — if `chatContext` was updated after the component rendered, the stale value is sent.

**How to avoid:** In `handleSubmit`, use `useAppStore.getState().chatContext` directly rather than destructuring `chatContext` from `useAppStore()` at the top of the component. This pattern is already used in `submitAttempt` in `learn/page.tsx` for the same reason.

---

## Code Examples

Verified patterns from existing codebase:

### Existing pattern: Direct store access in callbacks (learn/page.tsx:348)
```typescript
// Already used in submitAttempt — use same pattern for chatContext:
const { redirectedFromConceptId: currentRedirectId } = useAppStore.getState();
```

### Existing pattern: Fire-and-forget fetch after attempt (learn/page.tsx:368-395)
```typescript
// Gap detection is non-blocking — same pattern for recordAttemptInContext:
if (activeStudyPlanId && result.proficiencyUpdate.conceptId && !showGapProposal) {
  fetch(...).then(...).catch(() => { /* Non-blocking */ });
}
```

### Existing pattern: Chat API DB query for context (api/chat/route.ts:70-118)
```typescript
// Advisor route should follow the same DB query pattern:
const user = await prisma.user.findUnique({ where: { id: userId } });
const studyPlans = await prisma.studyPlan.findMany({ where: { userId } });
const recentGraph = await prisma.unitGraph.findFirst({
  where: { studyPlan: { userId } },
  orderBy: { createdAt: "desc" },
  include: { memberships: { include: { concept: true } } },
});
const recentAttempts = await prisma.attemptRecord.findMany({
  where: { userId }, orderBy: { createdAt: "desc" }, take: 10,
});
```

### Existing pattern: chatSystemPrompt signature (lib/prompts/index.ts:279)
```typescript
// Extend this function to accept chatContextSnippet:
export function chatSystemPrompt(context: {
  activePlans: { title: string; conceptCount: number; progress: number }[];
  weakestConcepts: { name: string; proficiency: number }[];
  recentMistakes: string[];
  learnerProfile?: { background: string[]; goals: string[]; interests: string[] };
  chatContextSnippet?: string; // NEW: add this parameter
}): string {
  // Add at end of prompt: if chatContextSnippet provided, append it
}
```

### Existing pattern: GapProposalCard visual style for inline blocks
```typescript
// GapProposalCard uses CSS variables, not shadcn/ui — follow same pattern:
<div
  className="rounded-2xl border p-4 flex flex-col gap-3"
  style={{
    backgroundColor: "rgba(255, 197, 61, 0.08)",
    borderColor: "rgba(255, 197, 61, 0.4)",
  }}
>
```

### Existing pattern: Tab navigation via `usePathname` (layout.tsx:16)
```typescript
// Already imported — just add the useEffect for chatContext mode update:
const pathname = usePathname();
// ...
useEffect(() => {
  const modeMap = { "/learn": "practicing", "/graph": "exploring", "/chat": "planning" };
  updateChatContextMode(modeMap[pathname] ?? "idle");
}, [pathname]);
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `FloatingChatButton` stub (Phase 3) | Replace/repurpose with real inline explainer | The stub is in `learn/page.tsx` already; it can remain as a floating entry point to the Chat tab, or be replaced by the "Explain this" inline block |
| Chat API only uses DB-derived context | Chat API also uses client-sent `chatContext` | More immediate context (current question, live attempt stream) without extra DB round-trips |
| Advisor analysis is implicit in chat | Advisor runs as explicit quick-action | User can trigger on demand; LLM has enough structured data to give ranked recommendations |

**Deprecated/outdated:**
- `FloatingChatButton` placeholder text ("AI tutoring during practice sessions is coming in Phase 4") — should be updated to reflect actual Phase 7 functionality.

---

## Open Questions

1. **Should `activeConceptId` in `chatContext` be the concept ID or concept name?**
   - What we know: The DB stores IDs; the system prompt receives concept names for readability. The `chatSystemPrompt` receives `weakestConcepts: { name, proficiency }[]` — names are used in prompts.
   - What's unclear: The advisor route needs to look up the concept by ID to get proficiency and other data; the prompt builder needs the name.
   - Recommendation: Store the concept ID in `chatContext`; let each API route look up the name from the DB (already querying concepts). Do NOT store the name — names can change and IDs are the stable reference.

2. **How many `recentAttempts` to keep in `chatContext`?**
   - What we know: CONTEXT.md says ~50-100 tokens for the full snapshot. Each attempt is `{ conceptId, isCorrect, score }` — roughly 3-5 tokens. 5 attempts = ~15-25 tokens, leaving headroom for mode + concept info.
   - Recommendation: Keep last 5 attempts in `recentAttempts`. Compress by keeping only `isCorrect` and `score` (not full concept ID unless needed). Filter to only wrong answers for the "proactively offer to explain" heuristic.

3. **Does the advisor route need to call the gap detection endpoint, or query the DB directly?**
   - What we know: The existing `/api/study-plans/[id]/gap-detections` route queries `GapDetection` records. The advisor would need gap data to recommend "REMEDIATE" actions.
   - What's unclear: Whether to call this existing endpoint internally (HTTP) or share the Prisma query.
   - Recommendation: Query the DB directly in the advisor route (same Prisma client import pattern as other routes). Do not make internal HTTP calls — they add latency and complexity.

4. **Should the Chat tab's quick-action advisor button be disabled until a study plan exists?**
   - What we know: If no study plan exists, the advisor has nothing to analyze. The chat page already gates some actions on `chatPhase`.
   - Recommendation: Show the advisor button only when `activeStudyPlanId` is non-null in the store. Hide (not disable) it when no plan exists — the empty state chat already explains what to do.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `adaptive-tutor/src/lib/store.ts` — confirmed Zustand 5, store shape, no existing `chatContext` field, `activeTab` field exists
- Direct codebase read: `adaptive-tutor/src/app/api/chat/route.ts` — confirmed `chatSystemPrompt()` usage, `generateText()` pattern, DB query pattern for context
- Direct codebase read: `adaptive-tutor/src/app/(tabs)/learn/page.tsx` — confirmed `lastResult` is local state, `submitAttempt` callback pattern, existing `useAppStore.getState()` direct access pattern
- Direct codebase read: `adaptive-tutor/src/app/(tabs)/chat/page.tsx` — confirmed chat message rendering, quick-action button area (input section), `addChatMessage` pattern
- Direct codebase read: `adaptive-tutor/src/lib/prompts/index.ts` — confirmed all prompts are centralized here, `chatSystemPrompt()` signature, JSON-only prompt discipline
- Direct codebase read: `adaptive-tutor/src/lib/minimax-native.ts` — confirmed `generateText()` signature and Anthropic-compatible API pattern
- Direct codebase read: `adaptive-tutor/src/components/GapProposalCard.tsx` — confirmed CSS variable styling pattern (no shadcn/ui)
- Direct codebase read: `adaptive-tutor/src/app/(tabs)/layout.tsx` — confirmed `usePathname` import, tab structure
- Direct codebase read: `adaptive-tutor/adaptive-graph-design.md` — confirmed advisor data model (`AdvisorRecommendation` interface), advisor prompt format

### Secondary (MEDIUM confidence)
- STATE.md and CONTEXT.md: confirmed tech stack is locked (Next.js 16, Zustand 5, Tailwind CSS v4, no shadcn/ui components in `ui/` dir)
- `package.json`: confirmed all dependencies, no new installs needed

### Tertiary (LOW confidence)
- None — all findings come from direct codebase inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — confirmed from `package.json` and direct codebase analysis; no new dependencies needed
- Architecture: HIGH — all patterns are extensions of existing code; no novel frameworks introduced
- Pitfalls: HIGH — derived from existing code patterns (stale closures in `submitAttempt`, eslint-disable comment on deps, direct store access pattern already in use)
- Prompt patterns: HIGH — based on reading all 6 existing prompt functions and the MiniMax API wrapper

**Research date:** 2026-02-26
**Valid until:** 2026-03-28 (stable stack; no fast-moving dependencies introduced)
