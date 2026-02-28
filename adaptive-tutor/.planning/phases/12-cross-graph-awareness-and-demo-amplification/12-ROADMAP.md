# Phase 12 Roadmap: Cross-Graph Awareness & Demo Amplification

**Phase:** 12 of 12+
**Total Effort:** 10–14 hours across 5 sub-phases
**Purpose:** Build cross-graph awareness (ghost nodes), integrate Wikipedia sources for credibility, and create rich pre-seeded demo data that showcases the full adaptive learning loop end-to-end.

---

## Executive Summary: What Phase 12 Delivers

| Feature | What It Does | Demo Value | Build Time |
|---------|-------------|-----------|-----------|
| **Cross-Graph Ghost Nodes** | Shows concepts from other study plans as external prerequisites, with visual "ghost" styling | "Your ML studies build on Linear Algebra you're already learning" | 2–2.5h |
| **Wikipedia Source Integration** | Every question and explanation is cited; click citations to see source | "This isn't a chatbot—it's grounded in verified sources" | 2–3h |
| **Rich Pre-Seeding** | Two fully-populated study plans with chat history, source chunks, session data | Eliminates cold start; every demo feature works immediately | 1.5–2h |
| **Phase 11 Integration** | Binds gap/extension proposals to seeded triggers and Wikipedia citations | "The system detects gaps and proposes structural changes" | 2–3h |
| **Demo Script + Testing** | Reproducible 4-5 min demo showcasing all features; one-person can record it | Presentation-ready; zero failure modes | 1–1.5h |

**Minimum Viable Demo:** Phase 12-01 (seeds) + Phase 12-04 (integration) = ~3.5 hours = basic story
**Full Demo:** All 5 phases = ~12 hours = polished, multi-moment showcase

---

## Phase 12 Structure

```
Phase 12 (10–14h total)
├── 12-01: Rich Seed Data + Cross-Plan Structure (1.5–2h)
│   └── Creates the foundation: two study plans, concept graphs, chat history, sources
├── 12-02: Cross-Graph Ghost Nodes (2–2.5h)
│   └── Adds visual connectivity: external prerequisites, hover tooltips, graph rendering
├── 12-03: Wikipedia Source Integration (2–3h)
│   └── Adds credibility: citations in questions, chat, source panel UI
├── 12-04: Phase 11 Enhancement + Unified Demo Flow (2–3h)
│   └── Orchestrates everything: seeded triggers, proposal cards, animations
└── 12-05: Integration Testing + Demo Rehearsal (1–1.5h)
    └── Locks it in: test suite, demo script, recording guidance
```

**Critical Path:** 12-01 must complete first; 12-02 and 12-03 can run in parallel; 12-04 depends on all three; 12-05 is final.

---

## Sub-Phase Details

### Sub-Phase 12-01: Rich Seed Data + Cross-Plan Structure

**Duration:** 1.5–2 hours
**Ownership:** Data modeling + seed script
**Deliverables:**
1. Two pre-seeded study plans with concept graphs
2. Cross-plan edge mappings and related concept metadata
3. Pre-fetched Wikipedia source chunks for all concepts
4. Chat history (learner + tutor interaction)
5. Session records and attempt history
6. User profile data (learner background, goals, interests)

**What It Creates:**

```
Plan 1: Linear Algebra Fundamentals
├── Vectors & Dot Products (90% ✅)
├── Matrix Multiplication (85% ✅)
├── Eigenvalues & Eigenvectors (70% 🟡)
├── Matrix Decomposition (40% 🟡)
└── Determinants (20% 🔴)

Plan 2: Intro to Machine Learning
├── Supervised vs Unsupervised (90% ✅)
├── Feature Engineering (80% ✅)
├── Linear Regression (75% ✅)
│   └── prerequisite: [EXT] Vectors & Dot Products (from Linear Algebra)
├── Cost Functions (55% 🟡)
│   └── prerequisite: Linear Regression + [EXT] Eigenvalues
├── Gradient Descent (45% 🟡)
│   └── prerequisite: Cost Functions + [EXT] Derivatives (Phase 11 insertion)
├── Neural Network Basics (30% 🔴)
├── Backpropagation (10% 🔴)
│   └── prerequisite: [EXT] Chain Rule (Phase 11 insertion trigger)
├── Overfitting & Regularization (0% 🔴 LOCKED)
└── Decision Trees (0% 🔴)
```

**[EXT]** = Ghost node referencing concept from another plan

**Key Decisions:**
- **Why two plans?** Shows cross-graph visibility; demonstrates multi-plan architecture
- **Why partial mastery?** Makes ghost nodes meaningful (learner already has foundation)
- **Why specific edge cases?** "Backpropagation" is designed to trigger Phase 11 insertion demo
- **Pre-fetched sources?** Wikipedia fetches are slow/unreliable for live demo; seed all chunks locally

**Implementation Tasks:**

| Task | Time | Output |
|------|------|--------|
| Create seed data structure (JSON) | 30m | Two plans + 15 concepts + proficiency states |
| Fetch Wikipedia sources for 15 concepts | 30m | 45–60 source chunks (~200 words each) stored in JSON |
| Create cross-plan edge metadata | 20m | Mappings: Linear Algebra concepts → ML prerequisites |
| Seed chat history (5–10 messages) | 20m | Realistic tutor + learner exchange |
| Create session/attempt records | 15m | 3–5 practice sessions with attempt data (makes stats real) |
| Integrate learner profile (Phase 6) | 15m | Background/goals/interests that tutor uses |
| **Total** | **~2 hours** | **Fully-populated demo state** |

**Files to Create/Modify:**
- `prisma/seed-demo-cross-graph.ts` (new) — comprehensive seed script
- `src/lib/demo-data.ts` (new) — cross-plan edge mappings + seed constants
- `src/lib/seed-sources.json` (new) — pre-fetched Wikipedia chunks (flat array)
- `prisma/schema.prisma` (modify) — add `sourceChunks` table if not present

**Success Criteria:**
- ✅ `npm run seed` creates two study plans with all 15 concepts
- ✅ Each concept has 3–4 Wikipedia source chunks attached
- ✅ Proficiency ranges from 0–90% across all concepts
- ✅ Chat history exists with 5–10 messages
- ✅ Cross-plan edges are marked and identifiable
- ✅ Learner profile is populated
- ✅ App loads with fully-functional demo state (no empty screens)

---

### Sub-Phase 12-02: Cross-Graph Ghost Nodes

**Duration:** 2–2.5 hours
**Ownership:** Data model + React Flow integration
**Depends On:** 12-01 (seed data)
**Deliverables:**
1. Extended data types: `ConceptNode.externalRef`, `CrossPlanEdge`
2. React Flow `GhostNodeComponent` with styling
3. Graph page enhancement to query all plans and render ghosts
4. Hover tooltip showing source plan + proficiency
5. Visual edge rendering from local concepts to ghost prerequisites

**What It Enables:**

In the **Graph tab**, when viewing the ML plan:
- Local concepts (Linear Regression, Gradient Descent) render normally (bold borders, colored backgrounds)
- Ghost prerequisites (Vectors, Eigenvalues from Linear Algebra) render with dashed borders, muted colors
- Edges connect local concepts to their ghost prerequisites
- Hover over ghost node → tooltip shows: "From: Linear Algebra Fundamentals | 90% mastered"
- Clicking a ghost node → navigates to that concept in the source plan

**Technical Design:**

```typescript
// types.ts additions
interface ConceptNode {
  // ... existing fields ...
  externalRef?: {
    sourceStudyPlanId: string;
    sourceConceptId: string;
    sourcePlanTitle: string;
  };
  isGhostNode?: boolean;
}

interface CrossPlanEdge {
  id: string;
  fromStudyPlanId: string;
  fromConceptId: string;
  toStudyPlanId: string;
  toConceptId: string;
  edgeType: "prerequisite" | "extension" | "related";
}

// store.ts additions
interface GraphState {
  graphConcepts: ConceptNode[]; // includes ghosts
  crossPlanEdges: CrossPlanEdge[];
  loadGraphWithGhosts(studyPlanId: string): Promise<void>;
}
```

**Implementation Tasks:**

| Task | Time | Output |
|------|------|--------|
| Update data types (types.ts) | 20m | ConceptNode.externalRef, CrossPlanEdge interface |
| Create GhostNodeComponent | 40m | Custom React Flow node with dashed border, muted colors, tooltip |
| Enhance graph/page.tsx to query cross-plan concepts | 30m | Load all plans, identify external prerequisites, render ghosts |
| Add cross-plan edge rendering | 30m | React Flow edges from local → ghost nodes |
| Wire hover tooltips + click navigation | 20m | Hover shows source plan; click navigates to source plan's concept |
| **Total** | **~2.5 hours** | **Full cross-graph visualization** |

**Files to Create/Modify:**
- `src/lib/types.ts` (modify) — add externalRef, CrossPlanEdge
- `src/components/ui/GhostNode.tsx` (new) — React Flow custom node component
- `src/app/(tabs)/graph/page.tsx` (modify) — load cross-plan data, render ghosts
- `src/lib/store.ts` (modify) — add `crossPlanEdges` state, `loadGraphWithGhosts()` method

**Visual Example:**
```
Local Graph:          Ghost Prerequisites:
┌──────────────┐      ┌─────────────────────┐
│ Linear       │      │ - - - - - - - - - - │
│ Regression   │─────→│ Vectors & Dot       │
└──────────────┘      │ Products (90% ✅)   │
                      │ [From: Lin. Algebra]│
                      └─────────────────────┘
                            (dashed, muted)
```

**Success Criteria:**
- ✅ GhostNodeComponent renders with dashed borders and source plan label
- ✅ Hovering ghost node shows tooltip: "From: [Plan Title] | X% mastered"
- ✅ Clicking ghost node navigates to source plan
- ✅ Edges from local concepts to ghosts render correctly
- ✅ Ghost nodes maintain position when graph recomputes layout
- ✅ No visual jank; smooth transitions

---

### Sub-Phase 12-03: Wikipedia Source Integration

**Duration:** 2–3 hours
**Ownership:** RAG module + citation UI
**Depends On:** 12-01 (pre-seeded sources)
**Deliverables:**
1. `lib/rag/wikipedia.ts` — MediaWiki API wrapper (search, fetch, chunk)
2. `CitationBadge` component — inline numbered citations with expandable panels
3. Question generation enhancement — cite sources in feedback
4. Chat integration — tutor references Wikipedia articles
5. MiniMax function calling integration (optional) — agentic source lookup

**What It Enables:**

In the **Learn tab**, when viewing a question:
- Question text includes [citation] markers
- Feedback explanation references specific sources: "According to Wikipedia [1], the chain rule is..."
- Click [1] → expandable panel shows: Wikipedia article title, section heading, relevant passage, link to full article

In the **Chat tab**:
- Tutor explanation: "Gradient Descent, as described in [1], is an optimization algorithm..."
- Same cite/expand interaction

**Technical Design:**

```typescript
// lib/rag/wikipedia.ts
export interface SourceChunk {
  id: string;
  conceptNodeId: string;
  source: "wikipedia" | "wikibooks";
  pageTitle: string;
  pageUrl: string;
  sectionHeading: string;
  content: string; // ~200 words
  relevanceScore: number;
}

export async function searchWikipedia(
  query: string,
  limit?: number
): Promise<WikiSearchResult[]> {
  // Calls MediaWiki REST API
  // Returns: { key, title, description, excerpt }
}

export async function fetchAndChunk(
  pageKey: string,
  conceptNodeId: string,
  source?: "wikipedia" | "wikibooks"
): Promise<SourceChunk[]> {
  // Fetches page HTML, chunks by sections (~200 words each)
  // Returns attributed SourceChunk[]
}

// lib/rag/types.ts
export interface Citation {
  index: number; // [1], [2], etc.
  chunk: SourceChunk;
}
```

**CitationBadge Component:**
```jsx
<span>
  According to Wikipedia
  <CitationBadge
    index={1}
    chunk={{
      pageTitle: "Backpropagation",
      sectionHeading: "Algorithm",
      content: "Backpropagation is...",
      pageUrl: "https://en.wikipedia.org/wiki/Backpropagation"
    }}
  />
  , the chain rule...
</span>

// CitationBadge expands to:
// ┌─────────────────────────────┐
// │ Backpropagation             │
// │ Algorithm                   │
// │ Backpropagation is...       │
// │ [View full source →]        │
// └─────────────────────────────┘
```

**Implementation Tasks:**

| Task | Time | Output |
|------|------|--------|
| Create lib/rag/wikipedia.ts (search + chunk functions) | 50m | MediaWiki API wrapper with local fallback |
| Create CitationBadge component | 40m | Inline citation UI with expandable panel |
| Integrate citations into question generation | 30m | Question prompt includes sources; output includes citation indices |
| Integrate citations into chat responses | 30m | Chat tutor prompt includes sources; responses include citations |
| MiniMax function calling integration (optional) | 20m | Define search_knowledge_base tool; wire to backend |
| **Total** | **~3 hours** | **Full RAG + citation flow** |

**Files to Create/Modify:**
- `src/lib/rag/wikipedia.ts` (new) — MediaWiki wrapper
- `src/lib/rag/types.ts` (new) — SourceChunk, Citation interfaces
- `src/components/ui/CitationBadge.tsx` (new) — Inline citation component
- `src/lib/prompts/index.ts` (modify) — Add citation-aware question + chat prompts
- `src/app/api/study-plans/[id]/questions/route.ts` (modify) — Fetch sources, include in response
- `src/app/api/chat/route.ts` (modify) — Fetch sources, pass to chat prompt

**Prompt Template:**
```
SOURCE MATERIAL FOR "${conceptName}":
[1] Backpropagation (Wikipedia - Algorithm section):
     "Backpropagation is a method for computing gradients
      using the chain rule. It propagates error derivatives
      backward through the network."

[2] Neural Network (Wikipedia - Training section):
     "Training a neural network typically involves gradient descent,
      which requires computing partial derivatives efficiently."

INSTRUCTIONS:
- Answer questions ONLY using information from sources [1] and [2]
- Include "citation": [X] in your JSON response
- Explanation must reference specific sources
- Do NOT add information not in sources
```

**Success Criteria:**
- ✅ Questions include citation indices in JSON response
- ✅ CitationBadge renders inline with superscript number
- ✅ Clicking badge expands panel with article title, section, passage, link
- ✅ Wikipedia links are valid and point to correct articles
- ✅ Chat responses include citations
- ✅ All 15 seeded concepts have 3+ source chunks available
- ✅ Live Wikipedia fetch fails gracefully (uses pre-seeded chunks)

---

### Sub-Phase 12-04: Phase 11 Enhancement + Unified Demo Flow

**Duration:** 2–3 hours
**Ownership:** Integration + demo orchestration
**Depends On:** 12-01, 12-02, 12-03
**Deliverables:**
1. Seeded trigger detection for Phase 11 proposals
2. Wikipedia citations in proposal cards
3. Demo-quality fallback responses for all LLM calls
4. Unified demo script (word-for-word with timestamps)
5. Demo mode flag (enables scripted triggers, pre-computed responses)

**What It Enables:**

**Full demo loop (4–5 minutes):**

1. **Scene 1 (30 sec):** Graph tab
   - Show ML concept graph with ghost nodes from Linear Algebra
   - Hover ghost node → tooltip shows source plan + proficiency
   - Narrate: "This learner is studying ML. The system knows their Linear Algebra progress applies here."

2. **Scene 2 (60 sec):** Learn tab (seeded question about Backpropagation)
   - Answer incorrectly (e.g., "gradient backpropagation multiplies the loss")
   - Feedback shows correct answer with citation [1] to Wikipedia
   - Click citation → expands to show Wikipedia article on Backpropagation
   - Narrate: "Every question is grounded in sources. The system cites Wikipedia."

3. **Scene 3 (90 sec):** Chat tab
   - Tutor says: "I noticed you misunderstood how gradients flow backward. This often happens when the chain rule isn't fully clear."
   - Phase 11 proposal card appears: "I'd like to add 'Chain Rule' as a prerequisite to 'Backpropagation'."
   - Read the rationale: "Chain rule is fundamental to understanding backpropagation"
   - Click "Accept" → card shows confirmation spinner → dismisses
   - Narrate: "The system detects structural gaps and asks for permission to modify the graph."

4. **Scene 4 (60 sec):** Graph tab (updated)
   - New node "Chain Rule" appears between calculus ghost nodes and Backpropagation
   - Node scales in; edge draws; layout recomputes smoothly
   - Narrate: "The graph has been restructured. Backpropagation now has a new prerequisite."

5. **Scene 5 (45 sec):** Learn tab (seeded correct answer)
   - Answer a question about Linear Regression correctly
   - Feedback shows proficiency gain [+8%]
   - Phase 11 proposal card: "You've mastered feature engineering. Ready to explore Decision Trees?"
   - Click "Explore this topic" → session resets to Decision Trees
   - Narrate: "The system also suggests next topics based on mastery."

6. **Scene 6 (30 sec):** Graph tab (final state)
   - Show complete graph with all 3 features working:
     - Ghost nodes (cross-graph awareness)
     - New inserted node (graph mutation)
     - Extension node (future direction)
   - Narrate: "This is the full adaptive loop: diagnosis, graph mutation, and personalized guidance."

**Total: 4.5 minutes. One continuous story.**

**Technical Implementation:**

```typescript
// lib/demo-mode.ts (new)
export const DEMO_SEEDED_TRIGGERS = {
  backpropagationWrongAnswer: {
    question: "Explain how gradients flow backward in a neural network.",
    incorrectSignatures: [
      /multiply.*loss/, // detect common misconception
      /single.*layer/,
    ],
    proposalType: "prerequisite" as const,
    suggestedNode: "Chain Rule",
    rationale: "Chain rule is fundamental to understanding backpropagation",
  },
  linearRegressionCorrectAnswer: {
    question: "What is feature normalization in linear regression?",
    proposalType: "extension" as const,
    suggestedNode: "Decision Trees",
    rationale: "You've mastered linear models. Decision trees are the next step.",
  },
};

// Enabled by:
// DEMO_MODE=true npm run dev
// Or in .env.local: NEXT_PUBLIC_DEMO_MODE=true
```

**Demo Mode Features:**
- When `DEMO_MODE=true`, seeded questions appear with pre-determined correct/incorrect pathways
- Proposals fire on schedule rather than waiting for 2-occurrence pattern
- All LLM calls have canned fallbacks (tutor says pre-written message if network fails)
- Timestamps help: "If scene X is dragging, skip to timestamp Y"

**Implementation Tasks:**

| Task | Time | Output |
|------|------|--------|
| Create demo mode detection + seeded trigger logic | 30m | DEMO_MODE flag, trigger checker |
| Wire Phase 11 APIs to seeded triggers | 30m | analyze-gap, suggest-extension called with pre-computed responses |
| Add Wikipedia citations to proposal cards | 20m | ProposalCard includes source references |
| Create fallback responses for all LLM calls | 20m | Canned text for tutor, graph mutation, etc. |
| Write demo script (word-for-word with timestamps) | 30m | 6 scenes, 4.5 min, with backup paths |
| Test full demo flow end-to-end | 10m | Walk through all 6 scenes, verify timing |
| **Total** | **~3 hours** | **Fully-scripted, reproducible demo** |

**Files to Create/Modify:**
- `src/lib/demo-mode.ts` (new) — seeded triggers and fallback responses
- `src/lib/store.ts` (modify) — add `demoMode` state
- `src/app/(tabs)/learn/page.tsx` (modify) — detect seeded question, trigger proposals on schedule
- `src/app/(tabs)/chat/page.tsx` (modify) — use fallback messages if LLM unavailable
- `demo/SCRIPT.md` (new) — word-for-word demo script with timestamps
- `.env.local.example` (modify) — add `NEXT_PUBLIC_DEMO_MODE=true` example

**Demo Script Structure:**
```markdown
# Phase 12 Demo Script (4.5 minutes)

## Scene 1: Graph Overview (0:00–0:30)
**Location:** Graph tab
**Action:** Show ML concept graph, hover ghost node
**Script:** "This learner is studying machine learning..."
**Timing:** Wait 5 seconds for attention, then move to Learn tab

## Scene 2: Citation in Feedback (0:30–1:30)
**Location:** Learn tab, seeded question about Backpropagation
**Action:** Answer incorrectly, feedback shows citation, click to expand
**Script:** "Every question is grounded in sources..."
**Timing:** Read feedback out loud (~10 sec), click citation (~10 sec), wait for expand (~5 sec)

... (scenes 3–6 follow same format)

## Fallback Paths
- If Wikipedia fetch hangs: citation shows "[Source loading...]" and continues
- If MiniMax is slow: proposal card appears with pre-written text
- If graph animation stutters: skip animation, jump to final state
```

**Success Criteria:**
- ✅ Demo mode flag enables all scripted triggers
- ✅ Seeded questions appear when expected
- ✅ Proposals fire on schedule (not waiting for LLM or pattern match)
- ✅ All LLM failures have graceful fallback messages
- ✅ Full 4.5-min demo completes without manual intervention
- ✅ Demo script is documented and reproducible
- ✅ One person can record the demo without debugging

---

### Sub-Phase 12-05: Integration Testing + Demo Rehearsal

**Duration:** 1–1.5 hours
**Ownership:** Testing + documentation
**Depends On:** All previous phases
**Deliverables:**
1. Playwright test suite for happy path
2. Demo recording (video file)
3. "How to Re-Record Demo" guide
4. Known issues / fallback documentation

**What It Delivers:**

**Test Suite (4 key scenarios):**
1. ✅ Cross-graph visibility: Load ML plan → see ghost nodes from Linear Algebra
2. ✅ Citation in question: Answer question → citation badge appears → click to expand
3. ✅ Phase 11 proposal: Wrong answer on seeded question → GapProposalCard appears → click Accept → graph updates
4. ✅ Full flow: All 3 features work in sequence without breaks

**Demo Recording:**
- 4.5–5 min video showcasing entire demo script
- Pre-recorded to ensure smooth playback
- Backup: If live demo fails, show the video

**Documentation:**
```markdown
# How to Re-Record Phase 12 Demo

## Prerequisites
- Node 18+, npm, running dev server
- DEMO_MODE=true in .env.local or via command: NEXT_PUBLIC_DEMO_MODE=true npm run dev

## Setup
1. npm run seed (creates two study plans)
2. Clear browser cache / use incognito window
3. Open http://localhost:3000
4. Login with demo user (pre-seeded)

## Recording (4 separate takes, then assemble)
### Take 1: Graph + Ghost Nodes (0–30 sec)
- Open Graph tab
- Hover over ghost node (Linear Algebra concept)
- Check tooltip appears

### Take 2: Learn + Citation (0:30–1:30)
- Switch to Learn tab
- Click "Practice Backpropagation"
- Answer incorrectly (pre-set for demo question)
- View feedback with citation [1]
- Click citation badge
- Wait for panel to expand
- Click Wikipedia link
- Go back to app

...etc (Scenes 3–6 as separate takes)

## Post-Production
- Trim each take to exact duration
- Add transition effects (fade between scenes)
- Add narration overlay
- Export as MP4

## Fallback (If Live Demo Fails)
- Play video in background
- Continue with Q&A
- Note: "This is a pre-recorded walkthrough; we can also run it live if you'd like to see the seeded data structure"
```

**Implementation Tasks:**

| Task | Time | Output |
|------|------|--------|
| Write Playwright tests (4 scenarios) | 30m | Test suite for happy path |
| Record demo (4–5 takes, assemble) | 20m | Demo video file |
| Write "How to Re-Record Demo" guide | 15m | One-person reproducible guide |
| Document fallbacks and known issues | 15m | Troubleshooting guide |
| **Total** | **~1.5 hours** | **Testable, recordable, rehearsed demo** |

**Files to Create:**
- `e2e/phase-12-demo.spec.ts` (new) — Playwright test suite
- `demo/RECORDING_GUIDE.md` (new) — step-by-step record instructions
- `demo/KNOWN_ISSUES.md` (new) — fallback paths, what to do if X fails
- `demo/demo.mp4` (new) — pre-recorded video

**Success Criteria:**
- ✅ All 4 test scenarios pass consistently
- ✅ Demo video is 4.5–5 minutes, shows all 3 features
- ✅ One person can re-record demo in <20 min
- ✅ Documented fallback for every potential failure point
- ✅ Video quality is presentation-ready (1080p, clear audio)

---

## Integration Points with Existing Features

### With Phase 6 (Learner Profiles)
- Phase 12-01 seeds learner profile data (background, goals, interests)
- Phase 12-04 configures tutor to mention learner's goals in proposal rationales
- Example: "Based on your interest in deep learning, Chain Rule is essential"

### With Phase 11 (Gap/Extension Insertion)
- Phase 12-04 reuses `analyze-gap` and `suggest-extension` APIs
- Phase 12-04 wraps them with seeded triggers for demo reliability
- Phase 12-03 adds Wikipedia citations to GapProposalCard and ExtensionProposalCard

### With Phase 10 (Edge Visibility + Pulse Animation)
- Phase 12-02 ghost nodes use same React Flow edge rendering as Phase 10
- Phase 12-04 can reuse pulse animations for new inserted nodes

---

## Build Plan: 3 Paths to MVP

### Path A: Minimum Viable Demo (~3.5 hours)
✅ Phase 12-01: Rich seed data (1.5–2h)
✅ Phase 12-04: Seeded demo flow (2–3h)
❌ Phase 12-02: Ghost nodes (skip)
❌ Phase 12-03: Wikipedia integration (skip)
**Story:** "Watch the tutor diagnose a gap and restructure the graph in real time"

### Path B: Full Presentation (~10–12 hours)
✅ All 5 phases
**Story:** "An AI tutor that understands you, suggests what's missing, and cites sources"

### Path C: Hackathon-Ready (~12–14 hours)
✅ All 5 phases PLUS
✅ Polished video
✅ Fallback guides
✅ Test suite
**Story:** "Production-quality demo with zero failure modes"

**Recommendation:** Aim for Path B or C (full implementation + testing). If time crunches, Path A is still compelling.

---

## Success Metrics for Presentation

| Metric | Success Criterion | Verification |
|--------|-------------------|--------------|
| Cross-graph awareness | Ghost nodes appear in ML graph | Visual: dashed nodes labeled with source plan |
| Source credibility | Citations appear in questions + chat | Functional: click citation → Wikipedia panel |
| Graph mutation | Proposal card → accepted → new node appears | Visual: smooth animation, correct edge direction |
| Demo smoothness | Full 4.5-min flow with no pauses or errors | Playback: watch recorded video |
| Audience clarity | Each feature clearly explained in narration | Script: 30-sec per feature, tie to architecture |
| Presentation fit | Demo fits seamlessly into pitch | Timing: 4.5 min demo + 2 min Q&A = 6.5 min total |

---

## Next Actions

1. **Approve Phase 12 scope** → Confirm 5 sub-phases and 10–14 hour estimate
2. **Lock demo script** → Write final word-for-word script with timestamps
3. **Begin 12-01** → Start seed data creation (critical path)
4. **Parallel: 12-02 + 12-03** → Ghost nodes and Wikipedia integration in parallel
5. **Then 12-04** → Orchestrate into unified demo
6. **Finally 12-05** → Test and record

---

*Roadmap prepared for Phase 12 planning and execution.*
