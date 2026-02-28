# Phase 3: Adaptive Practice Engine - Research

**Researched:** 2026-02-25
**Domain:** Spaced repetition, adaptive practice UX, Next.js API routes, Zustand state management, Prisma/SQLite
**Confidence:** HIGH — Extensive team-provided technical specs plus verified codebase analysis

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Card interaction style:**
- Flashcards: tap-to-flip animation (question on front, answer on back)
- After flip: swipe left/right to mark correct/incorrect (Tinder-style)
- MCQ: tap option → auto-submit immediately (no confirm step)
- Fill-blank: text input with explicit Submit button
- Free-response: textarea with character counter; evaluation deferred to Phase 4 (record answer only for now)

**AI access during practice:**
- Floating chat button in bottom corner — persistent throughout practice session
- Opens a slide-up panel; does not interrupt card flow
- Button is always visible regardless of question type
- Full chat backend wired in Phase 4; Phase 3 builds the UI affordance (placeholder/stub)

**Session start & concept scope:**
- "Start Practice" button on the Learn tab — single click, no preamble
- Algorithm auto-selects which concepts to practice (SM-2 priority: high-uncertainty, overdue concepts first)
- User does not manually pick concepts; graph is a read-only visualization, not a session launcher
- Default session length: fixed count (e.g., 20 cards), configurable in settings
- Session preamble / preview screen: Claude's discretion (likely skip it for speed)

**Question generation strategy:**
- Generate on first Learn tab visit (if no questions exist for study plan)
- Cache in database forever — do not regenerate on subsequent visits
- 3-5 questions per concept, all 4 types mixed
- Idempotent: calling generate twice doesn't create duplicates

**Proficiency algorithm:**
- SM-2 spaced repetition: `easeFactor`, `interval`, `repetitionCount` per concept
- Proficiency update rules:
  - Correct answer: +0.05–0.15 boost (scaled by confidence)
  - Incorrect: small penalty, proficiency floors at 0.0
  - High confidence + correct = bigger boost
  - Tier 3 concepts penalized more on incorrect
- nextDue date computed from SM-2 interval after each attempt

**Feedback presentation:**
- Inline within card — stays on same screen, no full-screen modal
- Shows: Correct / Incorrect, the correct answer highlighted, explanation text
- Proficiency delta shown ("Variables updated to 35% up")
- Auto-advance after ~2-3 seconds OR user taps "Next Question" immediately
- Incorrect answers always show explanation (user sees what they missed)

**Session summary screen:**
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

### Deferred Ideas (OUT OF SCOPE)

- Free response LLM evaluation with misconception detection — Phase 4
- Chat tutor backend wired to floating button — Phase 4 (Phase 3 builds UI only)
- Proficiency snapshot in chat context — Phase 4
- Graph updates proficiency colors after Learn session — Phase 4 wires the trigger
- Session length configurable via chat dialogue — Phase 4
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LEARN-01 | Learn tab presents adaptive practice as streaming question cards | UI spec (7 screens), Zustand store wiring, existing learn/page.tsx placeholder |
| LEARN-02 | System supports 3+ question types (flashcard, fill-blank, MCQ, free response) | LLMQuestionSchema already validates all 4 types; types.ts defines QuestionType |
| LEARN-03 | Question difficulty and type selected based on current proficiency | questionSelector.ts stub exists; SM-2 nextDue + proficiency drive ordering |
| LEARN-04 | Question generation is procedural and streams during session | POST /api/study-plans/[id]/generate-questions pattern; MiniMax per-concept calls |
| LEARN-05 | User submits answers and receives immediate feedback | POST /api/study-plans/[id]/attempt; rule-based MCQ/fill/flashcard evaluation |
| LEARN-07 | Attempt results persist and update concept proficiency | Prisma AttemptRecord + ConceptNode SM-2 field updates in $transaction |
</phase_requirements>

---

## Summary

Phase 3 builds the core interactive practice loop on top of a fully complete Phase 2 foundation. The database schema for all three Phase 3 models (Question, AttemptRecord, SessionRecord) already exists in Prisma and is pushed to the SQLite dev.db. The ConceptNode model already carries all SM-2 fields (easeFactor, interval, repetitionCount, nextDue, lastPracticed, attemptCount). The types.ts file already defines all required TypeScript interfaces. The learn/page.tsx exists as a placeholder stub awaiting full implementation. The Zustand store already has currentSession, currentQuestions, and currentQuestionIndex slots.

The team has produced a complete technical specification covering the DB schema, SM-2 algorithm implementation, proficiency update rules, 5 API endpoint contracts, 7 UI screen layouts, an 11-task breakdown, and testing guide. All of these should be treated as authoritative implementation instructions, not suggestions. The research task is primarily to verify the codebase state and confirm exactly what needs to be built vs. what already exists.

The primary implementation challenge is the Learn tab page.tsx, which needs full state machine logic to handle: question generation gating, session creation, question sequencing across all 4 types, inline feedback, auto-advance timing, and session completion. The floating chat button stub also needs to be wired as a UI-only affordance.

**Primary recommendation:** Follow the team-specified task sequence exactly (sm2.ts → proficiency.ts update → questions.ts prompt → generate-questions route → learn/page.tsx display → attempt route → session route → integration). The spec documents are authoritative and comprehensive; deviation increases risk.

---

## Standard Stack

### Core (All Already Installed — No New Dependencies Needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router API routes + React pages | Already in use; all API routes follow this pattern |
| Prisma | 7.4.1 + @prisma/adapter-libsql | ORM for SQLite | Already in use; schema has all Phase 3 models |
| Zustand | 5.0.11 | Client-side state for session/question state | Already in use with established patterns |
| Tailwind CSS | 4.x | Styling — CSS custom properties via var() | Existing design system uses CSS variables, not Tailwind color classes |
| framer-motion | 12.34.3 | Card flip, swipe, and transition animations | Already installed; use for flashcard flip and feedback pop-in |
| Zod | 4.3.6 | LLM response validation | LLMQuestionSchema and LLMQuestionsArraySchema already defined in schemas.ts |
| lucide-react | 0.575.0 | Icons (CheckCircle, XCircle, ChevronRight, etc.) | Already in use across all components |
| uuid | 13.0.0 | ID generation | Already installed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| minimax-native.ts | (internal) | MiniMax API calls via generateText() | Question generation — same pattern as generate-graph |
| parseLLMJson() | (internal) | Strip markdown fences, parse JSON | Must use for all LLM responses; handles MiniMax output quirks |
| db.ts helpers | (internal) | Generic Prisma CRUD (findMany, create, update) | For simple single-table operations; use prisma directly for joins/transactions |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| framer-motion (already installed) | CSS transitions only | framer-motion already present; use AnimatePresence + motion.div for flashcard flip and question transitions |
| Rule-based MCQ/fill evaluation | LLM evaluation | LLM evaluation is Phase 4; rule-based is correct for Phase 3 MCQ and fill-blank |
| Custom SM-2 implementation | ts-fsrs library | STATE.md notes ts-fsrs is for P1+; team spec provides full SM-2 code to implement in sm2.ts |

**Installation:** No new packages needed. All dependencies already in adaptive-tutor/package.json.

---

## Architecture Patterns

### Existing File Structure (Relevant to Phase 3)

```
adaptive-tutor/src/
├── app/
│   ├── (tabs)/
│   │   └── learn/
│   │       └── page.tsx          # PLACEHOLDER — full replacement needed
│   └── api/
│       └── study-plans/
│           └── [id]/
│               ├── route.ts          # GET/PATCH/DELETE (existing)
│               ├── generate-graph/   # POST (existing — model for new routes)
│               ├── concepts/         # PATCH (existing)
│               ├── generate-questions/  # NEW: POST
│               ├── attempt/             # NEW: POST
│               ├── session/             # NEW: GET + POST + PATCH
│               │   └── end/             # NEW: POST
│               └── proficiency/         # NEW: GET
├── lib/
│   ├── algorithms/
│   │   ├── sm2.ts              # NEW: Create this file
│   │   ├── proficiency.ts      # MODIFY: Add updateProficiencyFromAttempt()
│   │   ├── questionSelector.ts # EXISTING stub — MAY extend
│   │   └── graphValidator.ts   # Existing (no changes)
│   ├── prompts/
│   │   ├── index.ts            # MODIFY: Add generateQuestionsPrompt()
│   │   └── (questions.ts)      # ALTERNATIVE: New file for question prompts
│   ├── schemas.ts              # Existing: LLMQuestionSchema + LLMQuestionsArraySchema already defined
│   ├── config.ts               # Existing: QUESTIONS_PER_CONCEPT=5, DEFAULT_SESSION_LENGTH=20
│   ├── store.ts                # MODIFY: Add session score, getCurrentQuestion, advanceQuestion helpers
│   ├── types.ts                # Existing: All Phase 3 types already defined
│   ├── db.ts                   # Existing: Generic Prisma CRUD helpers
│   └── minimax-native.ts       # Existing: generateText() — use same pattern
└── components/
    └── (FloatingChatButton)    # NEW: Stub component, bottom-right, slide-up panel placeholder
```

### Pattern 1: Next.js API Route (Established Pattern)

**What:** All API routes follow the same structure as generate-graph/route.ts.
**When to use:** For all 4-5 new API routes in Phase 3.

```typescript
// Source: adaptive-tutor/src/app/api/study-plans/[id]/generate-graph/route.ts (existing)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";  // Direct Prisma for joins/transactions
import { findUnique } from "@/lib/db";  // Generic helper for simple lookups

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // ... implementation
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "..." }, { status: 500 });
  }
}
```

**Critical:** `params` is `Promise<{ id: string }>` in Next.js 16 App Router — must `await params`.

### Pattern 2: MiniMax LLM Call (Established Pattern)

**What:** All LLM calls go through `generateText()` from `@/lib/minimax-native`.
**When to use:** Question generation endpoint (generate-questions route).

```typescript
// Source: adaptive-tutor/src/lib/minimax-native.ts (existing)
import { generateText } from "@/lib/minimax-native";

const rawText = await generateText(
  [{ role: "user", content: "Generate questions for this concept." }],
  systemPrompt,
  { temperature: 0.3, maxTokens: 4096, model: "MiniMax-M2" }
);

// Then parse + validate:
import { parseLLMJson } from "@/lib/schemas";
import { LLMQuestionsArraySchema } from "@/lib/schemas";

const parsed = parseLLMJson(rawText);
const validated = LLMQuestionsArraySchema.safeParse(parsed);
if (!validated.success) {
  // retry at temperature 0.1 (same pattern as generate-graph)
}
```

### Pattern 3: Prisma Transaction for Atomic Writes

**What:** Use `prisma.$transaction()` when recording attempt + updating concept proficiency + updating session stats atomically.
**When to use:** The attempt route — all 3 writes must succeed or all fail.

```typescript
// Source: STATE.md — "Use Prisma $transaction for attempt recording atomicity"
import { prisma } from "@/lib/prisma";

await prisma.$transaction(async (tx) => {
  // 1. Create AttemptRecord
  await tx.attemptRecord.create({ data: { ... } });
  // 2. Update ConceptNode proficiency + SM-2 state
  await tx.conceptNode.update({ where: { id: conceptId }, data: { ... } });
  // 3. Update SessionRecord stats
  await tx.sessionRecord.update({ where: { id: sessionId }, data: { ... } });
});
```

### Pattern 4: Zustand Store Updates (Established Pattern)

**What:** All client-side state lives in the Zustand store. Components read via `useAppStore()`, actions via destructured functions.
**When to use:** Learn tab page needs to read and update session state.

```typescript
// Source: adaptive-tutor/src/lib/store.ts (existing)
// In store.ts, add new fields using the existing pattern:
const { currentSession, setCurrentSession, currentQuestions } = useAppStore();

// For derived state getters (new additions needed):
// getCurrentQuestion: () => state.currentQuestions[state.currentQuestionIndex] ?? null
// advanceQuestion: () => set(s => ({ currentQuestionIndex: s.currentQuestionIndex + 1 }))
```

**Critical:** Use `store.getState()` in event handlers to avoid stale closures (established decision in STATE.md).

### Pattern 5: SM-2 Algorithm (Fully Specified)

**What:** The SM-2 spaced repetition algorithm for scheduling reviews.
**When to use:** After every attempt — called in the attempt route.

```typescript
// Source: adaptive-tutor/phase3tech/PHASE3-TECHNICAL-SPEC.md
// Create: src/lib/algorithms/sm2.ts

export interface SM2State {
  easeFactor: number;      // Initial: 2.5 (from config.ts: DEFAULT_EASE_FACTOR)
  interval: number;        // Days until next review (from config.ts: DEFAULT_INTERVAL = 1)
  repetitionCount: number;
}

export function updateSM2(state: SM2State, quality: number): SM2State {
  let { easeFactor, interval, repetitionCount } = state;
  if (quality < 3) {
    repetitionCount = 0;
    interval = 1;
  } else {
    repetitionCount++;
    if (repetitionCount === 1) interval = 1;
    else if (repetitionCount === 2) interval = 3;
    else interval = Math.round(interval * easeFactor);
  }
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  return { easeFactor, interval, repetitionCount };
}

// Quality mapping (from CONTEXT.md specifics):
// fast+correct (<10s) → 5, slow+correct → 4, incorrect → 1
```

### Pattern 6: MCQ Auto-Submit (Locked Decision)

**What:** MCQ tap → auto-submit. No Submit button for MCQ.
**When to use:** MCQ question type rendering only.

```typescript
// Locked per CONTEXT.md: "MCQ: tap option → auto-submit immediately (no confirm step)"
// Implementation: onClick on radio/button calls submitAnswer() directly
<button onClick={() => submitAnswer(option)}>
  {option}
</button>
// No Submit button rendered for MCQ type
```

### Pattern 7: CSS Custom Properties for Styling

**What:** The design system uses CSS custom variables, not Tailwind color utilities.
**When to use:** All Phase 3 UI components.

```typescript
// Source: adaptive-tutor/src/app/(tabs)/learn/page.tsx (existing), PHASE3-UI-SPEC.md
// Use var(--accent), var(--bg-card), var(--text-primary), var(--border), etc.
// DO NOT use Tailwind classes like bg-green-500 — use var(--success) instead
style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
```

### Anti-Patterns to Avoid

- **Regenerating questions on every visit:** CONTEXT.md locked "cache forever — do not regenerate on subsequent visits." Always check `COUNT(*) WHERE conceptNodeId = ?` first.
- **LLM calls during practice (non-generation path):** Free response evaluation is Phase 4. Phase 3 records the answer and shows it back only.
- **Full-screen modals for feedback:** CONTEXT.md locked "inline within card — stays on same screen."
- **Graph as session launcher:** CONTEXT.md locked "graph is a read-only visualization, not a session launcher."
- **setActiveTab for navigation:** STATE.md decision — tab navigation is URL-based (router.push not setActiveTab).
- **Defining nodeTypes/componentTypes inside render functions:** STATE.md decision — module-scope definitions prevent re-renders.
- **JSON fields as arrays directly:** All JSON fields (distractorsJson, conceptsCoveredJson, etc.) are stored as strings; must use `JSON.parse()` / `JSON.stringify()`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LLM JSON parsing | Custom regex/strip logic | `parseLLMJson()` from schemas.ts | Already handles markdown fences, trailing commas, common LLM quirks |
| LLM response validation | Manual type checking | `LLMQuestionsArraySchema.safeParse()` (Zod) | Already defined in schemas.ts for question arrays |
| MiniMax API call | Raw fetch | `generateText()` from minimax-native.ts | Handles auth, base URL, content block format, error logging |
| Card flip animation | CSS only | framer-motion AnimatePresence + motion.div | Already installed; handles 3D flip cleanly in React |
| Prisma connection | New PrismaClient() | `import { prisma } from "@/lib/prisma"` | Singleton pattern — creating new clients causes connection pool issues |
| Answer correctness (MCQ) | LLM call | String comparison after normalization | MCQ correctAnswer is exact string; normalize (trim, uppercase) and compare |
| SM-2 algorithm | Custom decay formula | Implement the spec exactly in sm2.ts | SM-2 formula is fully specified in PHASE3-TECHNICAL-SPEC.md — no research needed |
| Proficiency update | Custom rules | Implement `updateProficiencyFromAttempt()` per spec | Rules fully specified with exact delta values |

**Key insight:** The team has fully specified every algorithm. The implementation work is translating the spec into TypeScript, not designing algorithms.

---

## Common Pitfalls

### Pitfall 1: MCQ Distractor Shuffling Not Done

**What goes wrong:** Options always appear in the same order (correct answer always first or last), making the answer guessable by position.
**Why it happens:** The spec stores `correctAnswer` and `distractorsJson` separately. Naive rendering shows them in fixed order.
**How to avoid:** On question load (not on re-render), shuffle `[correctAnswer, ...distractors]` and store in local state. Use a stable seed per question ID to prevent re-shuffle on re-render.
**Warning signs:** Correct answer always appears at position A.

### Pitfall 2: Stale Closure in Submit Handler

**What goes wrong:** `submitAnswer()` reads stale `currentQuestion` or `sessionId` from component closure captured at mount.
**Why it happens:** React closures in event handlers capture state at time of render.
**How to avoid:** Use `useAppStore.getState()` inside async handlers, per the established STATE.md decision. Do not read store values from component scope inside async callbacks.
**Warning signs:** Answer submitted for wrong question; sessionId undefined after first navigation.

### Pitfall 3: Question Generation Race Condition

**What goes wrong:** Multiple calls to generate-questions create duplicate questions when the Learn tab mounts twice quickly (strict mode, fast nav).
**Why it happens:** Both calls check "0 questions exist" before either completes.
**How to avoid:** The idempotency check (`COUNT(*) > 0` per concept) handles this after the first batch completes. Additionally, track generation state in Zustand (`isGenerating: boolean`) to prevent concurrent calls. Return `alreadyGenerated: true` on second call.
**Warning signs:** Duplicate questions appearing per concept in the DB.

### Pitfall 4: SM-2 nextDue Comparison with SQLite DateTime

**What goes wrong:** `nextDue <= NOW()` queries fail because SQLite stores DateTime as ISO string but Prisma may compare as strings.
**Why it happens:** Prisma 7 with libsql adapter converts DateTime fields, but queries comparing `DateTime?` to `new Date()` need Prisma's native Date object.
**How to avoid:** Pass JavaScript `Date` objects to Prisma where clauses, not ISO strings. `where: { nextDue: { lte: new Date() } }`.
**Warning signs:** All or no concepts show as "due" regardless of actual dates.

### Pitfall 5: Free Response Always Marked Incorrect

**What goes wrong:** Free response answers compared as strings against correctAnswer, always returning false.
**Why it happens:** String comparison cannot handle paraphrased correct answers.
**How to avoid:** Per CONTEXT.md — Phase 3 records the answer only, no evaluation. Free response feedback should show the model answer and let user self-assess (like flashcard). Mark as `isCorrect: false, score: 0.5` (neutral) until Phase 4 evaluation.
**Warning signs:** Free response answers being auto-graded wrong or triggering LLM calls.

### Pitfall 6: Session Not Created Before First Attempt

**What goes wrong:** attempt route receives no sessionId, AttemptRecord.sessionId is null, session stats never update.
**Why it happens:** Learn tab didn't create a SessionRecord before starting question flow.
**How to avoid:** On Learn tab mount, if no active session exists, create one via POST /api/study-plans/[id]/session and store sessionId in Zustand. Pass sessionId with every attempt request.
**Warning signs:** SessionRecord.questionsAttempted stays at 0 in DB.

### Pitfall 7: Proficiency Not Updating in Graph After Practice

**What goes wrong:** User practices, proficiency changes in DB, but graph still shows old colors.
**Why it happens:** Zustand `conceptNodes` array is hydrated at mount but not refreshed after attempts.
**How to avoid:** After each successful attempt response, call `updateConceptProficiency(conceptId, newProf, newConf)` from the store (already implemented). This updates in-memory state so graph tab shows current values without a page refresh.
**Warning signs:** Proficiency bar in feedback shows correct value but Graph tab still shows old color.

---

## Code Examples

### SM-2 Quality Mapping

```typescript
// Source: PHASE3-TECHNICAL-SPEC.md + CONTEXT.md (SM-2 quality score mapped from: fast+correct → 5, slow+correct → 4, incorrect → 1)
function userAnswerToQuality(isCorrect: boolean, timeTaken: number): number {
  if (!isCorrect) return 1;
  const secondsTaken = timeTaken / 1000;
  if (secondsTaken < 10) return 5;
  if (secondsTaken < 30) return 4;
  return 3;
}
```

### Proficiency Update Function

```typescript
// Source: PHASE3-TECHNICAL-SPEC.md — proficiency.ts addition
export function updateProficiencyFromAttempt(
  currentProficiency: number,
  confidence: number,
  isCorrect: boolean,
  difficultyTier: 1 | 2 | 3
): { proficiency: number; confidence: number } {
  const baseGain = 0.05;
  const tierPenalty = { 1: 0, 2: 0.02, 3: 0.04 }[difficultyTier];
  const confBoost = 0.1;

  if (isCorrect) {
    const boost = baseGain + (confidence * confBoost);
    return {
      proficiency: Math.min(1.0, currentProficiency + boost),
      confidence: Math.min(1.0, confidence + 0.05),
    };
  } else {
    return {
      proficiency: Math.max(0.0, currentProficiency + 0.01 - tierPenalty),
      confidence: Math.max(0.0, confidence - 0.1),
    };
  }
}
```

### Question Generation Prompt

```typescript
// Source: PHASE3-TECHNICAL-SPEC.md — src/lib/prompts/questions.ts (new file)
export function generateQuestionsPrompt(concept: ConceptNode): string {
  return `Generate 5 practice questions for this concept:

Concept: ${concept.name}
Description: ${concept.description}
Difficulty Tier: ${concept.difficultyTier}

Return a JSON array of question objects with NO markdown fences:
[
  {
    "questionType": "mcq",
    "questionText": "...",
    "correctAnswer": "...",
    "distractors": ["...", "...", "..."],
    "explanation": "...",
    "difficulty": 0.6
  }
]

Question types: "mcq", "fill_blank", "flashcard", "free_response"
Difficulty: tier1=0.3, tier2=0.6, tier3=0.8
Include all 4 types across the 5 questions.
Return ONLY the JSON array.`;
}
```

### MCQ Correct Answer Check

```typescript
// Source: PHASE3-API-SPEC.md — rule-based evaluation for MCQ
function evaluateMCQ(userAnswer: string, correctAnswer: string): boolean {
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}
```

### Fill-Blank Correct Answer Check

```typescript
// Source: PHASE3-API-SPEC.md — rule-based for fill_blank
function evaluateFillBlank(userAnswer: string, correctAnswer: string): boolean {
  return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}
```

### Flashcard Self-Assessment

```typescript
// Source: CONTEXT.md — "swipe left/right to mark correct/incorrect"
// Flashcard evaluation is purely user self-assessment:
// "I got it!" → isCorrect: true
// "I missed it" → isCorrect: false
// No string comparison needed
```

### Get Next Due Question (Prisma Query)

```typescript
// Source: PHASE3-API-SPEC.md — query for next due question after attempt
import { prisma } from "@/lib/prisma";

const nextQuestion = await prisma.question.findFirst({
  where: {
    conceptNode: {
      studyPlanId: planId,
      proficiency: { lt: 0.8 },  // PROFICIENCY_MASTERED from config.ts
      OR: [
        { nextDue: null },
        { nextDue: { lte: new Date() } },
      ],
    },
    id: { not: currentQuestionId },  // don't repeat same question
  },
  include: { conceptNode: true },
});
```

### Floating Chat Button Stub

```typescript
// Source: CONTEXT.md — "Phase 3 builds the UI affordance (placeholder/stub)"
// Bottom-right floating button, slide-up panel (no backend wired)
export function FloatingChatButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50
                   flex items-center justify-center"
        style={{ backgroundColor: "var(--accent)" }}
        aria-label="Open chat tutor"
      >
        <MessageCircle size={24} color="white" />
      </button>
      {open && (
        <div className="fixed bottom-0 right-0 w-full max-w-sm h-64 rounded-t-2xl
                        shadow-2xl z-50 p-4 flex flex-col"
             style={{ backgroundColor: "var(--bg-card)", borderTop: "1px solid var(--border)" }}>
          <p style={{ color: "var(--text-secondary)" }}>
            Chat tutor coming in Phase 4.
          </p>
          <button onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ts-fsrs library for spaced repetition | Custom SM-2 in sm2.ts | STATE.md: ts-fsrs is P1+ | Implement the lean spec directly; avoids new dependency |
| generateDemoGraph stub | Live MiniMax calls | Phase 02-01 | Question generation follows same live-call pattern |
| JSON file I/O | Prisma + SQLite | Phase 01 | All persistence via Prisma; db.ts provides generic helpers |
| Vercel AI SDK generateText | minimax-native.ts direct fetch | Phase 02-01 | Use `generateText` from `@/lib/minimax-native` not ai SDK |
| setActiveTab for navigation | router.push('/route') | Phase 02-05 | Tab navigation is URL-based; don't use setActiveTab |

**Key version notes:**
- Next.js 16 App Router: `params` is `Promise<{ id: string }>` — must `await params`
- Prisma 7.4.1: Uses `prisma.config.ts` for datasource URL (not schema.prisma url field)
- Zod 4.3.6: `z.array().min()` syntax; `safeParse()` returns `{ success, data, error }`
- framer-motion 12.x: `AnimatePresence` + `motion.div` for enter/exit animations

---

## Open Questions

1. **Session resume behavior when Learn tab re-mounts**
   - What we know: CONTEXT.md says session state persists across tab switches. Zustand preserves in-memory state.
   - What's unclear: If user closes browser and returns, should the session resume from DB or start fresh?
   - Recommendation: On Learn tab mount, check if a SessionRecord with no endTime exists in DB for the active study plan. If yes, resume it and reload its associated questions into Zustand. If no, start fresh.

2. **Question ordering within a concept's due questions**
   - What we know: SM-2 selects which concepts are due; questionSelector.ts has `conceptPriorityScore()` for concepts.
   - What's unclear: Once a concept is selected, which of its 3-5 questions to show first?
   - Recommendation: Rotate by questionType (MCQ first to ease users in per UI spec), then by difficulty ascending. Do not show same question twice in one session.

3. **User ID for AttemptRecord**
   - What we know: config.ts defines `USER_ID = "demo-user"` as the single user. AttemptRecord requires userId.
   - What's unclear: Should this be read from DB or hardcoded?
   - Recommendation: Use `USER_ID` constant from config.ts for all AttemptRecord.userId values (hackathon single-user demo).

4. **Proficiency update visible in Graph tab immediately**
   - What we know: `updateConceptProficiency()` in Zustand updates in-memory conceptNodes. Graph tab reads from that array.
   - What's unclear: Whether the graph page re-fetches on tab switch or relies purely on Zustand.
   - Recommendation: Call `updateConceptProficiency(conceptId, newProf, newConf)` after each attempt response in the Learn tab. This ensures graph shows live values without a network round-trip. Note: graph tab's proficiency display (Task 3.1 in PHASE3-TASK-BREAKDOWN.md) is part of Phase 3 scope.

---

## Sources

### Primary (HIGH confidence)

- `adaptive-tutor/phase3tech/PHASE3-TECHNICAL-SPEC.md` — DB schema, SM-2 algorithm, proficiency rules, Zustand additions
- `adaptive-tutor/phase3tech/PHASE3-API-SPEC.md` — 5 endpoint contracts with exact request/response shapes
- `adaptive-tutor/phase3tech/PHASE3-UI-SPEC.md` — 7 screen layouts with interaction specs
- `adaptive-tutor/phase3tech/PHASE3-TASK-BREAKDOWN.md` — 11 tasks with dependency graph and critical path
- `adaptive-tutor/src/lib/types.ts` — All TypeScript interfaces (already complete for Phase 3)
- `adaptive-tutor/src/lib/schemas.ts` — Zod schemas (LLMQuestionSchema, LLMQuestionsArraySchema already defined)
- `adaptive-tutor/src/lib/config.ts` — Constants (DEFAULT_EASE_FACTOR, DEFAULT_SESSION_LENGTH, PROFICIENCY_MASTERED)
- `adaptive-tutor/prisma/schema.prisma` — Verified SM-2 fields (easeFactor, interval, repetitionCount, nextDue, lastPracticed) on ConceptNode
- `adaptive-tutor/src/lib/store.ts` — Verified existing session/question slots and updateConceptProficiency()
- `adaptive-tutor/src/app/(tabs)/learn/page.tsx` — Confirmed placeholder; full implementation needed
- `.planning/phases/03-adaptive-practice-engine/03-CONTEXT.md` — Locked user decisions

### Secondary (MEDIUM confidence)

- `.planning/STATE.md` — Established architectural decisions (Prisma $transaction, params await, URL navigation, store.getState() in handlers)
- `adaptive-tutor/src/app/api/study-plans/[id]/generate-graph/route.ts` — Verified MiniMax call pattern with retry

### Tertiary (LOW confidence — N/A)

No LOW confidence findings. All research was verified against codebase files and team specs.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All packages verified in package.json; no new dependencies needed
- Architecture: HIGH — All patterns verified against existing codebase files
- Pitfalls: HIGH — Derived from existing STATE.md decisions and established codebase patterns
- Algorithm specs: HIGH — Fully specified in PHASE3-TECHNICAL-SPEC.md; only transcription needed

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable stack, no fast-moving dependencies)
