# Phase 02: Graph Generation & Visualization - Research

**Researched:** 2026-02-24
**Domain:** MiniMax LLM structured output, DAG cycle detection, React Flow visualization, chat-driven UX
**Confidence:** HIGH (most findings verified via official docs + existing codebase inspection)

---

## Summary

Phase 02 is the hero feature: chat-driven study plan creation that calls MiniMax to generate a
prerequisite DAG, validates and cycle-breaks it with Kahn's algorithm, lays it out with dagre,
and renders it in React Flow with proficiency-colored nodes.

**Significant finding:** The codebase already has a substantial skeleton in place. The graph
generation pipeline (`generate-graph/route.ts`), DAG validator (`graphValidator.ts`), schemas
(`schemas.ts`), prompts (`prompts/index.ts`), and graph visualization (`graph/page.tsx`) are
all stubbed out but not wired to the live MiniMax API. The chat page is a static stub with no
state machine logic. The primary work is: (1) connecting real MiniMax calls, (2) building the
chat state machine for context gathering, (3) adding node detail panel + edit mode, and (4)
wiring proficiency live-updates from Learn tab.

**Critical finding on MiniMax model names:** The code currently uses `"MiniMax-Text-01"` as
both STRONG and FAST models. Per official MiniMax OpenAI-compatible API docs (2026), the correct
model names are `"MiniMax-M2"`, `"MiniMax-M2.1"`, `"MiniMax-M2.5"` (and highspeed variants).
`MiniMax-Text-01` is the older model (456B params). For graph generation use `MiniMax-M2.5`;
for chat use `MiniMax-M2.5-highspeed` or `MiniMax-M2`.

**Primary recommendation:** Wire existing stubs to live MiniMax API first (graph generation +
chat). The skeleton is correct; the gap is live API calls, state machine chat logic, and the
node detail panel.

---

## Standard Stack

The project already has all required dependencies installed. No new packages needed for core
functionality. One optional upgrade is recommended.

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@xyflow/react` | 12.10.1 | Graph visualization | The rename of `reactflow`; v12 is current stable |
| `dagre` | 0.8.5 | DAG auto-layout | Installed and used; works correctly |
| `zod` | 4.3.6 | Schema validation for LLM output | Already in use in `schemas.ts` |
| `ai` | 6.0.97 | Vercel AI SDK for LLM calls | Already imported in `minimax.ts` |
| `@ai-sdk/openai` | 3.0.31 | OpenAI-compatible provider (used for MiniMax) | Powers the `createOpenAI` call |
| `zustand` | 5.0.11 | Client state (nodes, edges, session) | Already in `store.ts` |

### Optional: Dagre Package Note
The project uses `dagre@0.8.5` (with `@types/dagre`). The React Flow docs now recommend
`@dagrejs/dagre` (actively maintained, latest v2.x). **For this phase, stick with the installed
`dagre@0.8.5`** — it works and switching would be a refactor with no feature benefit. The
existing `computeDAGLayout` in `graphValidator.ts` uses a custom layered layout (not dagre
directly). This is fine — it produces correct results and is already tested.

**Installation:** Nothing new needed. All packages are installed.

---

## Architecture Patterns

### Recommended Project Structure (additions to existing)

```
src/
├── app/
│   ├── (tabs)/
│   │   ├── chat/
│   │   │   └── page.tsx           # REPLACE: Add chat state machine + file upload UI
│   │   └── graph/
│   │       └── page.tsx           # EXTEND: Add onNodeClick + detail panel
│   └── api/
│       ├── chat/
│       │   └── route.ts           # REPLACE: Add state machine handler + streaming
│       └── study-plans/
│           └── [id]/
│               └── generate-graph/
│                   └── route.ts   # WIRE: Replace generateDemoGraph with MiniMax call
├── components/
│   ├── graph/
│   │   ├── ConceptNode.tsx        # NEW: Custom node component (extracted from graph/page.tsx)
│   │   ├── NodeDetailPanel.tsx    # NEW: Slide-in panel for concept details + edit
│   │   └── ConceptPreview.tsx     # NEW: Pre-approval concept list shown in Chat
│   └── chat/
│       ├── FileUploadButton.tsx   # NEW: File input with drag-drop
│       └── ChatMessage.tsx        # NEW: Extracted message bubble with special types
└── lib/
    ├── minimax.ts                 # UPDATE: Correct model names
    └── prompts/
        └── index.ts               # EXTEND: Add chat state machine prompts
```

### Pattern 1: Chat State Machine (Phase-Based Context Gathering)

The chat must gather context through structured phases before triggering graph generation.
This is not a general-purpose chatbot — it's a goal-directed wizard with conversational UX.

**States:**
```
IDLE → GATHERING → PREVIEW → GENERATING → DONE
```

**State storage:** In Zustand store or React component local state. For hackathon simplicity,
use React `useState` in the chat component with a `chatPhase` field and a `collectedContext`
object that accumulates user answers across turns.

**Collected context shape:**
```typescript
interface StudyPlanContext {
  topic: string;                    // what to learn
  sourceText: string;               // pasted text or file content
  priorKnowledge: string;           // user's self-described background
  depthOfStudy: "surface" | "working" | "deep";
  intentForStudying: string;        // exam prep, hobby, career, etc.
  background: string;               // general context (age, field, etc.)
}
```

**Heuristic for "enough context":** Require at minimum:
1. `topic` is defined
2. `sourceText` OR enough `priorKnowledge`+`topic` for MiniMax to generate a graph
3. `depthOfStudy` has been inferred or asked

After these are satisfied, show the concept preview. **Do not ask all questions upfront** —
if user pastes a full syllabus, treat that as sufficient `sourceText` and skip to preview.

**Reclarification:** Allow user to say "actually, I know more about X" during GATHERING by
resetting relevant fields without resetting the whole state.

### Pattern 2: MiniMax API Call (Structured Output via Prompt Engineering)

**Do not use AI SDK's `generateObject`** with MiniMax. The OpenAI-compatible endpoint
(`api.minimax.io/v1`) does not guarantee structured output via `response_format: json_schema`.
The JSON reliability plan from CONTEXT.md is: prompt-based JSON enforcement + lenient parsing.

The existing `parseLLMJson` in `schemas.ts` is the correct approach. Wire it as:

```typescript
// Source: existing generate-graph/route.ts (replace generateDemoGraph with this)
import { minimax, generateText, MINIMAX_MODEL_STRONG } from "@/lib/minimax";
import { generateConceptGraphPrompt } from "@/lib/prompts";
import { parseLLMJson, LLMConceptGraphSchema } from "@/lib/schemas";

const { text } = await generateText({
  model: minimax(MINIMAX_MODEL_STRONG),
  prompt: generateConceptGraphPrompt(sourceText),
  temperature: 0.3,           // Lower temperature = more reliable JSON
  maxTokens: 4000,
});

const raw = parseLLMJson(text);
const parsed = LLMConceptGraphSchema.safeParse(raw);
// On failure: retry once with explicit error message in prompt
```

**Temperature recommendation:** Use 0.3 for graph generation (structure tasks), 0.7-0.9 for
chat responses (natural language). Lower temperature dramatically improves JSON reliability.

**Retry strategy:** Single retry with error context appended to prompt:
```typescript
// On parse failure, retry with:
const retryPrompt = `${originalPrompt}\n\nPREVIOUS ATTEMPT FAILED: ${errorDescription}\nPlease output ONLY valid JSON matching the schema exactly.`;
```

### Pattern 3: React Flow Node Click + Detail Panel

Use React Flow's `onNodeClick` callback and conditional rendering of a panel overlay.
Do not use a library for the panel — a positioned div with Tailwind is sufficient.

```typescript
// Source: @xyflow/react docs - onNodeClick pattern
const [selectedConcept, setSelectedConcept] = useState<ConceptNode | null>(null);

const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
  const concept = conceptNodes.find(c => c.id === node.id);
  setSelectedConcept(concept ?? null);
}, [conceptNodes]);

// In JSX:
<ReactFlow onNodeClick={onNodeClick} ... />
{selectedConcept && (
  <NodeDetailPanel
    concept={selectedConcept}
    onClose={() => setSelectedConcept(null)}
    onEdit={handleEditConcept}
    onPractice={handlePractice}
    prerequisites={getPrerequisites(selectedConcept.id)}
    dependents={getDependents(selectedConcept.id)}
  />
)}
```

**Panel position:** Fixed overlay on the right side (`position: absolute; right: 0; top: 0;
height: 100%;`). Panel slides in from right using Framer Motion (already installed).
Close on Escape key or close button. Do not close on background click (accidental closes are
annoying when navigating the graph).

### Pattern 4: Live Proficiency Updates

Zustand's `updateConceptProficiency` action (already exists in `store.ts`) handles this.
After each Learn tab attempt is graded, call this action to update the concept node's proficiency
and confidence values. The Graph tab's `useMemo` for `flowNodes` will automatically recompute
node colors since it reads from `conceptNodes` in the store.

**Key:** The graph page uses `useEffect` to sync `flowNodes` → `setNodes`. This means proficiency
color changes propagate correctly without a page refresh.

### Anti-Patterns to Avoid

- **Calling generateObject with MiniMax:** MiniMax's json_schema response_format is only
  confirmed for their native API endpoint (`/text/chatcompletion_v2`), not the OpenAI-compatible
  endpoint. Stick to prompt engineering + lenient JSON parsing.
- **Using dagre for layout on every render:** Layout should be computed once after graph generation
  and positions stored in DB. The existing `positionX`/`positionY` fields on `ConceptNode` handle
  this correctly.
- **Tracking chat state in the backend:** Chat state machine should live in the frontend for
  hackathon speed. Backend only stores finalized messages and triggers generation.
- **Generating concept preview separately from graph:** Do not make two MiniMax calls (one for
  preview, one for graph). The preview is just a sorted display of `parsed.data.concepts` from
  the same call. Precompute once, show to user for approval, then save to DB.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Proficiency color mapping | Custom gradient math | Existing `proficiencyColor()` in `utils.ts` | Already implemented with gray/red/yellow/green thresholds |
| DAG cycle detection | Custom DFS | Existing `validateDAG()` + `breakCycles()` in `graphValidator.ts` | Already implemented and correct |
| Graph layout | New dagre integration | Existing `computeDAGLayout()` in `graphValidator.ts` | Already implemented; outputs `positionX/Y` stored in DB |
| Node state management | Custom React context | Existing Zustand store with `updateConceptProficiency` | Already wired; just call it |
| JSON parsing for LLM output | Custom parser | Existing `parseLLMJson()` in `schemas.ts` | Handles markdown fences and trailing commas |
| Schema validation | Custom validator | Existing `LLMConceptGraphSchema` in `schemas.ts` | Already uses Zod correctly |
| File upload backend | Custom multipart handler | Existing `/api/upload` route | Already handles file saves to `/public/uploads` |

**Key insight:** Most infrastructure is already built. The planner should focus on wiring calls
and building UI components, not rebuilding utilities.

---

## Common Pitfalls

### Pitfall 1: Wrong MiniMax Model Names
**What goes wrong:** The existing `minimax.ts` uses `"MiniMax-Text-01"` for both STRONG and FAST
models. Per the current MiniMax OpenAI-compatible API docs (2026), available models are
`MiniMax-M2`, `MiniMax-M2.1`, `MiniMax-M2.5` and their highspeed variants. `MiniMax-Text-01`
may still work (it's the older flagship model) but is not listed in current OpenAI-compat docs.
**How to avoid:** Update `MINIMAX_MODEL_STRONG = "MiniMax-M2.5"` and
`MINIMAX_MODEL_FAST = "MiniMax-M2.5-highspeed"` as the first task. Test with a simple call.
**Warning signs:** 404 errors or `model_not_found` from MiniMax API.

### Pitfall 2: React Flow `node.measured` in v12
**What goes wrong:** In `@xyflow/react` v12, node dimensions are in `node.measured.width` and
`node.measured.height`, not `node.width`/`node.height`. Layout libraries like dagre need
actual dimensions before first layout call.
**How to avoid:** For this project, node dimensions are fixed constants (not dynamic). The
existing `computeDAGLayout` in `graphValidator.ts` uses hardcoded `NODE_GAP` and `LAYER_GAP`
constants and does not read `node.measured`. This is correct for this use case because positions
are computed server-side and stored in DB before rendering.
**Warning signs:** Nodes overlapping after dagre layout with dynamic-size nodes.

### Pitfall 3: Chat State Not Persisted Across Refreshes
**What goes wrong:** Chat state machine (`chatPhase`, `collectedContext`) lives in React state.
A page refresh loses the conversation context mid-gathering.
**How to avoid:** For hackathon, accept this limitation (local-first, single session).
Optionally persist `chatPhase` and `collectedContext` to `sessionStorage` for basic refresh
recovery. Full persistence via DB is deferred scope.
**Warning signs:** Users complain about losing context on refresh.

### Pitfall 4: MiniMax Graph Generation for Very Short Source Text
**What goes wrong:** If `sourceText` is a single sentence or very short topic name, MiniMax may
return fewer than the minimum 8 concepts or produce generic/hallucinated content.
**How to avoid:** Validate source text length before calling MiniMax. Minimum threshold:
100 characters or 15 words. If too short, prompt user to provide more detail in chat.
Also: the prompt already specifies "8-30 concepts" — enforce the minimum in schema validation
(`z.array(LLMConceptNodeSchema).min(3)` instead of `.min(1)` for meaningful graphs).
**Warning signs:** Graph generates with 3-4 generic nodes instead of specific concepts.

### Pitfall 5: React.memo Missing on Custom Node Component
**What goes wrong:** Without `React.memo`, the `ConceptNodeComponent` re-renders on every
store update. With 30+ nodes and live proficiency updates from the Learn tab, this causes
janky frame drops.
**How to avoid:** Wrap `ConceptNodeComponent` in `React.memo`. Also define `nodeTypes`
outside the component (already done in `graph/page.tsx` — maintain this pattern).
**Warning signs:** Graph tab becomes sluggish during Learn tab practice sessions.

### Pitfall 6: Cycle Breaking Removes Wrong Edges
**What goes wrong:** The existing `breakCycles()` in `graphValidator.ts` removes the first
edge it finds connecting two cyclic nodes (array index order). This may remove a semantically
important prerequisite while keeping a weaker "helpful context" edge.
**How to avoid:** Improve the heuristic: when breaking a cycle between nodes in the cyclic
set, prefer to remove edges where `fromNode.difficultyTier > toNode.difficultyTier` (reversed
prerequisite = more likely to be the erroneous edge). The existing code passes `getNodeTier`
to `breakCycles` but doesn't use it in the current implementation. Wire the tier-based
heuristic into the edge selection logic.
**Warning signs:** "Functions → Variables" edge removed instead of "Advanced → Basics" edge.

### Pitfall 7: Concept Preview Before Generation is Expensive
**What goes wrong:** Making a separate MiniMax call to generate concept preview (before user
approval), then a second call to build the full graph doubles latency and API costs.
**How to avoid:** The concept preview IS the validated concept list from the graph generation
call. Call MiniMax once, parse the JSON, show the `concepts` array to user for approval.
Only persist to DB after approval. This is the correct architecture.
**Warning signs:** Two MiniMax API calls observed in network tab during graph creation flow.

---

## Code Examples

### 1. Correct MiniMax API Call for Graph Generation

```typescript
// Source: existing generate-graph/route.ts — wire this instead of generateDemoGraph
import { minimax, generateText } from "@/lib/minimax";
import { generateConceptGraphPrompt } from "@/lib/prompts";
import { parseLLMJson, LLMConceptGraphSchema } from "@/lib/schemas";

async function callMiniMaxForGraph(sourceText: string) {
  const GRAPH_MODEL = "MiniMax-M2.5"; // Updated model name

  let text: string;
  try {
    const result = await generateText({
      model: minimax(GRAPH_MODEL),
      prompt: generateConceptGraphPrompt(sourceText),
      temperature: 0.3,
      maxTokens: 4000,
    });
    text = result.text;
  } catch (e) {
    throw new Error(`MiniMax API call failed: ${e}`);
  }

  // Try parsing; retry once on failure
  let raw: unknown;
  try {
    raw = parseLLMJson(text);
  } catch {
    // Retry with error context
    const retry = await generateText({
      model: minimax(GRAPH_MODEL),
      prompt: generateConceptGraphPrompt(sourceText) +
        `\n\nIMPORTANT: Your previous response was not valid JSON. Output ONLY the JSON object, nothing else.`,
      temperature: 0.1,  // even lower for retry
      maxTokens: 4000,
    });
    raw = parseLLMJson(retry.text);
  }

  const parsed = LLMConceptGraphSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid graph schema: ${JSON.stringify(parsed.error.flatten())}`);
  }
  return parsed.data;
}
```

### 2. Chat State Machine (Simplified)

```typescript
// Source: pattern derived from project requirements
type ChatPhase = "idle" | "gathering" | "preview" | "generating" | "done";

interface CollectedContext {
  topic?: string;
  sourceText?: string;
  priorKnowledge?: string;
  depthOfStudy?: "surface" | "working" | "deep";
  intentForStudying?: string;
  background?: string;
}

// Phase transition logic
function hasEnoughContext(ctx: CollectedContext): boolean {
  // Minimum viable: topic + (sourceText OR enough priorKnowledge)
  if (!ctx.topic) return false;
  if (ctx.sourceText && ctx.sourceText.length >= 100) return true;
  if (ctx.priorKnowledge && ctx.topic) return true;
  return false;
}

// In chat route: detect user intent and extract context from message
function extractContextFromMessage(
  message: string,
  currentCtx: CollectedContext
): Partial<CollectedContext> {
  // Use MiniMax to extract structured context from natural language
  // Alternatively: simple regex/keyword extraction for hackathon speed
}
```

### 3. Node Detail Panel Layout

```typescript
// Source: @xyflow/react docs + project pattern
// Position: absolute overlay on right side of graph canvas

function NodeDetailPanel({
  concept,
  prerequisites,
  dependents,
  onClose,
  onPractice,
  onEdit,
}: NodeDetailPanelProps) {
  const keyTerms: string[] = safeJsonParse(concept.keyTermsJson, []);

  return (
    <div
      className="absolute right-0 top-0 h-full w-80 border-l overflow-y-auto z-20"
      style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
    >
      {/* Header with close */}
      {/* Proficiency bar */}
      {/* Description + key terms */}
      {/* Attempt stats */}
      {/* Prerequisites list (names only, clickable to navigate) */}
      {/* Dependents list */}
      {/* Practice CTA: setActiveTab("learn") + setTargetConceptId */}
      {/* Edit button: toggle inline edit mode for name/description/keyTerms */}
    </div>
  );
}
```

### 4. Proficiency Color to Hex (Continuous Gradient)

The existing `proficiencyColor()` returns a color category string. For the actual gradient
coloring, convert proficiency (0-1) to a CSS color. Use the existing category system
(gray/red/yellow/green) as defined in `graph/page.tsx` — it's already correct and
visually clear. No need to switch to a continuous gradient for the hackathon.

```typescript
// Already in graph/page.tsx — keep this pattern
const colorMap = {
  green:  { bg: "rgba(0, 210, 160, 0.12)",   border: "rgba(0, 210, 160, 0.5)",   text: "#00d2a0" },
  yellow: { bg: "rgba(255, 197, 61, 0.12)",  border: "rgba(255, 197, 61, 0.5)",  text: "#ffc53d" },
  red:    { bg: "rgba(255, 107, 107, 0.12)", border: "rgba(255, 107, 107, 0.5)", text: "#ff6b6b" },
  gray:   { bg: "rgba(74, 74, 100, 0.15)",   border: "rgba(74, 74, 100, 0.4)",   text: "#8888a8" },
};
// Source: existing src/app/(tabs)/graph/page.tsx lines 31-53
```

### 5. Progress Update Messages in Chat (Loading Feedback)

```typescript
// Pattern for chat-style progress updates during generation
type ProgressMessage = {
  id: string;
  role: "assistant";
  content: string;
  isProgress: boolean; // renders differently (animated dots, spinner)
};

const PROGRESS_MESSAGES = [
  "Analyzing your materials...",
  "Identifying core concepts...",
  "Building prerequisite graph...",
  "Validating DAG structure...",
  "Computing layout...",
  "Done! Your concept graph is ready.",
];

// Emit one message every ~800ms during generation for UX feedback
```

### 6. Proficiency Inference from Prior Knowledge

Do not use a separate MiniMax call for this. Use a simple heuristic:

```typescript
// Source: reasoned from project spec and educational research patterns
function inferInitialProficiency(
  priorKnowledgeDescription: string,
  conceptName: string,
  conceptDifficultyTier: 1 | 2 | 3
): number {
  const lower = priorKnowledgeDescription.toLowerCase();

  // Keyword-based tier inference
  const isExpert = lower.includes("expert") || lower.includes("phd") ||
                   lower.includes("years of experience");
  const isIntermediate = lower.includes("some") || lower.includes("familiar") ||
                         lower.includes("worked with") || lower.includes("took a course");
  const isNovice = lower.includes("beginner") || lower.includes("new to") ||
                   lower.includes("never") || lower.includes("no experience");

  // Base proficiency by self-described level
  const baseProficiency = isExpert ? 0.7 : isIntermediate ? 0.4 : 0.1;

  // Adjust down for higher difficulty tier concepts
  const tierPenalty = (conceptDifficultyTier - 1) * 0.15;

  return Math.max(0, Math.min(1, baseProficiency - tierPenalty));
}

// Set confidence = 0.3 for inferred (vs 0.0 for untested, 0.8+ for tested)
// This means: shown in graph with color, but marked as "estimated"
```

### 7. Edge Type Handling (Hard vs. Helpful)

Per CONTEXT.md, edges can be "hard prerequisites" or "helpful context." The prompt already
generates `{"from": ..., "to": ...}` edges. The current schema does NOT include edge type.

**Recommendation:** Add an optional `edgeType` field to the prompt and schema for this phase.

Updated edge schema:
```typescript
// Add to LLMConceptEdgeSchema in schemas.ts
export const LLMConceptEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  edgeType: z.enum(["prerequisite", "helpful"]).optional().default("prerequisite"),
});

// And add to ConceptEdge type + DB schema (new column: edgeType String @default("prerequisite"))
```

Edge rendering in React Flow:
- Hard prerequisite: solid arrow, stroke color = `var(--border)`, strokeWidth 2
- Helpful context: dashed arrow, stroke color = `var(--border)`, strokeWidth 1, opacity 0.6

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `reactflow` package | `@xyflow/react` | v12 (2024) | Import paths changed |
| `node.width`, `node.height` | `node.measured.width`, `node.measured.height` | v12 | Layout libs must use `measured` |
| `generateObject` (AI SDK) | `generateText` with `Output.object()` | AI SDK v5+ | `generateObject` deprecated in v6 |
| `MiniMax-Text-01` | `MiniMax-M2`, `MiniMax-M2.1`, `MiniMax-M2.5` | 2025 | Newer, faster, cheaper models |
| json_object response_format | Prompt-based JSON enforcement | MiniMax limitation | Use `parseLLMJson` + retry |

**Deprecated/outdated:**
- `reactflow` package import: replaced by `@xyflow/react` (already correct in codebase)
- `generateObject` from AI SDK: deprecated in v6; use `generateText` + `Output.object()`
  (but for MiniMax: skip `Output.object()` entirely, use prompt engineering + `parseLLMJson`)
- `MiniMax-Text-01` model name: old model, replaced by M2 series in current API docs

---

## Research Answers to Specific Questions

### Q1: MiniMax Graph Generation Prompting

**Prompt structure:** The existing `generateConceptGraphPrompt` in `prompts/index.ts` is
well-designed and should not be substantially changed. Key elements already correct:
- "Respond ONLY with valid JSON" instruction
- Explicit schema with example
- Few-shot example (calculus graph) showing correct format
- Rules for concept count, edge direction, difficulty tiers

**Improvements to make:**
1. Add `edgeType: "prerequisite" | "helpful"` to the edge schema in the prompt
2. Add explicit instruction: "The FROM concept must be logically learned before TO"
3. Add "Do not include markdown code fences" (belt-and-suspenders)
4. Lower temperature to 0.3 for reliability

**Schema to validate against (already in `schemas.ts`, confirm this):**
```typescript
LLMConceptGraphSchema = z.object({
  concepts: z.array(z.object({
    name: z.string().min(1),
    description: z.string(),
    keyTerms: z.array(z.string()).default([]),
    difficultyTier: z.number().int().min(1).max(3).default(1),
  })).min(3),  // raise from min(1)
  edges: z.array(z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    edgeType: z.enum(["prerequisite", "helpful"]).optional().default("prerequisite"),
  })).default([]),
})
```

**Edge cases:**
- Very simple units (1-2 concepts): Source text is too sparse. Guard: if `concepts.length < 3`,
  return error and ask user for more material.
- Complex prerequisites (circular fields of study): Kahn's algorithm handles this; trust the
  existing `breakCycles()` implementation.

### Q2: Cycle Detection & Resolution

**Kahn's algorithm:** Already correctly implemented in `validateDAG()` in `graphValidator.ts`.
Returns cyclic node IDs when `order.length < nodeIds.size`.

**Which edges to remove:** The existing `breakCycles()` picks the first edge between two cyclic
nodes (no heuristic). **Improve this:** When selecting which edge to remove, prefer edges where
`fromNodeTier > toNodeTier` (reversed difficulty flow = likely erroneous) OR where neither
node is a "root" (in-degree 0 in the full graph). This heuristic is already stubbed — the
`getNodeTier` callback is passed but not used. Wire it in.

**Show removed edges to user:** Yes, show in chat as a toast or inline message:
`"Note: Removed 2 edges that created prerequisite cycles: [A→B], [C→D]"`. This builds trust
and lets users understand the graph structure. Log them in the API response so the frontend
can display them.

**Implementation:** Add `removedEdges: string[]` to the `generate-graph` API response.

### Q3: React Flow Integration

**Dagre layout:** The project uses a custom layered layout in `computeDAGLayout()`, not dagre
directly. This is fine — it produces sensible top-down layered results. The positions are
computed once server-side and stored as `positionX`/`positionY` in `ConceptNode`. Do not
re-layout on the client.

**v12 critical note:** `node.measured.width/height` needed only when using client-side dagre
layout with dynamic-size nodes. Since positions come from DB (server-side pre-computed), this
does not apply. The existing graph page correctly uses `concept.positionX/Y` directly.

**For 50+ concept graphs:**
- Wrap `ConceptNodeComponent` in `React.memo` (HIGH priority — currently missing)
- `nodeTypes` already defined outside component (correct)
- Use `useMemo` for `flowNodes` and `flowEdges` (already done)
- Do not use `useCallback` for inline functions inside node components

**Edge rendering:** Current implementation uses `type: "smoothstep"` + `animated: true`.
Recommendation:
- Hard prerequisites: `type: "smoothstep"`, `animated: false`, `strokeWidth: 2`
- Helpful context: `type: "smoothstep"`, `animated: false`, `strokeDasharray: "5,5"`, `strokeWidth: 1`, `opacity: 0.5`
- Remove `animated: true` from all edges (performance; animation is visually noisy for DAGs)

**Node component design:** The existing `ConceptNodeComponent` shows proficiency % and name.
Keep this design — it's clean and functional. The detail panel handles the expanded view.

### Q4: Initial Proficiency & Context Inference

**Recommendation:** Infer from stated prior knowledge using keyword heuristics (see Code
Examples #6 above). Set initial proficiency + a low confidence (0.2-0.3), which causes the
graph to show colored (not gray) nodes but signals these are estimates, not tested values.

**Do NOT use a separate MiniMax call** for initial proficiency inference. Latency cost is not
worth it for a rough estimate that will be immediately overridden by the first practice session.

**Starting proficiency rules:**
- No prior knowledge stated → proficiency = 0.0, confidence = 0.0 (gray = untested)
- Novice: proficiency = 0.1-0.2, confidence = 0.2
- Intermediate: proficiency = 0.3-0.5, confidence = 0.25, adjusted by tier
- Expert: proficiency = 0.6-0.75, confidence = 0.3, adjusted by tier

**Why confidence matters:** The `proficiencyColor()` function already uses `confidence < 0.1`
to show gray (untested). Setting confidence = 0.2 for inferred proficiency shows colored nodes,
which is more informative than all-gray before any practice.

### Q5: Chat Integration for Study Plan Creation

**How many clarifying questions:** Minimum 2-3 turns, maximum 5. Heuristic: if user provides
a full syllabus/source text (>200 chars), count that as answering all source questions. Then
ask only about prior knowledge and depth (1 follow-up question).

**Concept preview before user approval:**
- YES: Generate the concept list from MiniMax before asking for approval.
- Show: concept names, difficulty tiers, estimated count.
- Do NOT show estimated learning time (not in the MiniMax output).
- Show: "Here are the X concepts I'll create. Does this look right?"
- Allow: user to say "add more detail" or "remove X" → re-generate.

**When user says "reclarify":** Update the specific field in `collectedContext` and re-generate
the concept preview only (not full graph + DB save). The concept preview IS just the parsed
concept list — cheap to regenerate.

**File upload integration:**
- Use existing `/api/upload` route to save file
- For `.txt` files: read as text with `FileReader` API client-side, add to `sourceText`
- For `.pdf` files: save to `/public/uploads`, display filename in chat, use server-side
  text extraction (basic: `fs.readFileSync` + plain text; or defer PDF parsing)
- **Practical choice for hackathon:** Support `.txt`, `.md`, and direct text paste. Accept
  `.pdf` uploads but display "PDF content will be used" without parsing (store path in
  `sourceText`). Add `pdf-parse` only if time permits.

### Q6: Node Detail Panel Implementation

**Prerequisites/dependents display:** Show as a simple list of concept names. Each name is
clickable to select that node in the graph (`reactFlowInstance.setCenter(x, y, zoom)`).
Do not build a mini-graph inside the panel — it's too complex for the hackathon.

**Practice CTA:** Navigate to Learn tab with a targeted concept pre-selected.
Implementation: Add `targetConceptId` to Zustand store. Learn tab reads this on mount and
pre-configures a practice session for that concept. This is smoother than opening a modal
and avoids duplication of the question UI.

**Node editing:** Use a slide-in edit form within the same panel (not a separate modal).
- Toggle `isEditMode` state in the panel component
- Show input fields for name, description, and key terms (comma-separated input)
- Save via `PATCH /api/study-plans/[id]/concepts/[conceptId]` (new endpoint needed)
- Update Zustand store immediately for optimistic UI

---

## Open Questions

1. **MiniMax `MiniMax-Text-01` backward compatibility**
   - What we know: Current code uses this model name. OpenAI-compat docs show M2/M2.1/M2.5.
   - What's unclear: Whether `MiniMax-Text-01` still works on the current API endpoint.
   - Recommendation: Test `MiniMax-Text-01` first on day one. If it returns 404, switch to
     `MiniMax-M2` immediately. Keep both as fallback constants.

2. **MiniMax streaming compatibility with Vercel AI SDK**
   - What we know: MiniMax supports streaming. AI SDK's `streamText` should work with
     OpenAI-compatible endpoints.
   - What's unclear: Whether streaming works reliably for the chat endpoint with MiniMax.
   - Recommendation: Use `generateText` (non-streaming) first. Add streaming as enhancement
     if it works. Non-streaming is fine for hackathon demo.

3. **`@dagrejs/dagre` vs custom layout for large graphs**
   - What we know: Existing `computeDAGLayout` uses a simple layer-based layout. For 30+
     concepts with complex prerequisite structures, dagre's crossing minimization would look
     better.
   - What's unclear: Whether the visual difference justifies switching.
   - Recommendation: Keep existing custom layout. If graph looks messy during demo, switch
     to dagre as a post-planning optimization.

4. **Edge type field in Prisma schema**
   - What we know: `ConceptEdge` table does not have an `edgeType` column.
   - What's unclear: Whether adding this requires a schema migration mid-hackathon.
   - Recommendation: Add `edgeType String @default("prerequisite")` to `ConceptEdge` model.
     Run `npx prisma db push`. Low-risk addition.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase inspection: `src/lib/`, `src/app/api/`, `src/app/(tabs)/` — full read
- `@xyflow/react` official docs: [reactflow.dev/examples/layout/dagre](https://reactflow.dev/examples/layout/dagre)
- `@xyflow/react` v12 migration guide: [reactflow.dev/learn/troubleshooting/migrate-to-v12](https://reactflow.dev/learn/troubleshooting/migrate-to-v12)
- `@xyflow/react` performance: [reactflow.dev/learn/advanced-use/performance](https://reactflow.dev/learn/advanced-use/performance)
- MiniMax OpenAI-compatible API docs: [platform.minimax.io/docs/api-reference/text-openai-api](https://platform.minimax.io/docs/api-reference/text-openai-api)
- Vercel AI SDK generateText reference: [ai-sdk.dev/docs/reference/ai-sdk-core/generate-text](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- Vercel AI SDK v6 announcement: [vercel.com/blog/ai-sdk-6](https://vercel.com/blog/ai-sdk-6)

### Secondary (MEDIUM confidence)
- MiniMax native API (`/text/chatcompletion_v2`) response_format: [platform.minimax.io/docs/api-reference/text-post](https://platform.minimax.io/docs/api-reference/text-post) — native endpoint only, not OpenAI-compat
- AIMLAPI MiniMax M2 reference: [docs.aimlapi.com/api-references/text-models-llm/minimax/m2](https://docs.aimlapi.com/api-references/text-models-llm/minimax/m2) — third-party proxy, confirms json_schema support
- React Flow node update pattern: [reactflow.dev/examples/nodes/update-node](https://reactflow.dev/examples/nodes/update-node)

### Tertiary (LOW confidence — needs day-one validation)
- `MiniMax-Text-01` backward compatibility: Unverified via current docs, may still work
- MiniMax streaming reliability with AI SDK: Unverified; test day one
- `@dagrejs/dagre` performance improvement over custom layout: Anecdotal, not benchmarked

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages installed, versions confirmed
- MiniMax API model names: MEDIUM — confirmed from docs but `Text-01` backward compat unknown
- Architecture patterns: HIGH — derived from existing codebase + official docs
- React Flow patterns: HIGH — confirmed from official docs
- Cycle breaking heuristics: MEDIUM — standard CS theory, implementation detail is custom
- Chat state machine: MEDIUM — pattern is sound, exact message count is educated heuristic
- Initial proficiency inference: MEDIUM — heuristic approach, no academic citation needed

**Research date:** 2026-02-24
**Valid until:** 2026-03-10 (MiniMax API, 14 days; React Flow is stable)
