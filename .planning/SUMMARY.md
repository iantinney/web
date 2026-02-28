# Adaptive Learning Tutor: Unified Summary

**Status:** v1.0 Complete (5 phases) → Planning v1.1
**Date:** 2026-02-26

---

## What We Built (v1.0)

A web-based adaptive tutoring system where users create concept graphs from learning materials, practice with adaptive difficulty, and watch the system respond to their learning in real-time.

**Core Loop:**
1. User describes learning goal → Chat gathers context → MiniMax generates concept DAG
2. Graph visualizes with proficiency colors (gray/red/yellow/green)
3. User practices on Learn tab (4 question types: MCQ, flashcard, fill-blank, free response)
4. Questions adapt based on proficiency and spaced repetition schedule (SM-2)
5. Proficiency updates persist → Graph nodes animate color change
6. Prerequisites enforce learning order (can't practice until mastered prerequisites)
7. Chat tutor provides explanations and guidance

**Completed Requirements:** 18/26 v1 requirements shipped. 8 remaining for v1.1-v2.

---

## Architecture Overview

**Multi-graph System:**
- Users can create multiple UnitGraphs (e.g., "ML Basics", "Linear Algebra")
- Concepts pool is shared—dedup prevents duplicates across graphs
- Each UnitGraph has independent practice sessions

**Data Model (Locked):**
```
UnitGraph (id, userId, title, description, status, createdAt, updatedAt)
├─ GraphMembership (conceptId, unitGraphId, depthTier, positionX, positionY)
├─ Concept (id, name, description, keyTermsJson, proficiency, confidence, SM2 state)
├─ ConceptEdge (fromNodeId, toNodeId, edgeType: "prerequisite"|"helpful")
├─ Question (id, conceptId, text, type, difficulty, distractorsJson, misconceptionsJson)
├─ AttemptRecord (id, conceptId, questionId, userAnswer, correctness, feedback, errorType, gapAnalysis)
├─ SessionRecord (id, unitGraphId, questionsAttempted, conceptsCovered, proficiencyDeltas)
└─ ChatThread & ChatMessage (conversational history, persistent)
```

**Practice Flow:**
1. GET /questions filters by due date (SM-2 `nextDue <= now`), proficiency, locked status
2. Prerequisite concepts get 2x boost in scoring (overdue multiplier)
3. Difficulty matched to proficiency: weak → MCQ/flashcard, strong → fill-blank/free-response
4. User answers → POST /attempt with LLM grading (MCQ/fill-blank deterministic, free-response LLM-evaluated)
5. SM-2 update: interval + easeFactor computed, nextDue set
6. Proficiency update: tier-scaled penalty (tier1: +0.01, tier2: -0.01, tier3: -0.03 on incorrect)
7. Fire-and-forget POST /api/concepts/[id]/proficiency-update persists to DB
8. Zustand store syncs → Graph re-renders with color animation

---

## Tech Stack (Locked for Hackathon)

| Layer | Stack | Notes |
|-------|-------|-------|
| **Runtime** | Next.js 16 + React 19 + TypeScript | App Router, server components |
| **Database** | SQLite + Prisma 7.4.1 (@prisma/adapter-libsql) | File-based, portable, ACID transactions |
| **State** | Zustand | Centralized app state, persist plugin for recovery |
| **Visualization** | React Flow + @dagrejs/dagre | Nodes as React components, DAG layout |
| **Animations** | framer-motion | Smooth transitions, drag gestures (flashcard swipe) |
| **LLM** | MiniMax API | Text-01 for structured JSON, M2.5 for streaming chat |
| **LLM SDK** | Vercel AI SDK v6 + minimax-ai-provider | generateObject for JSON, streamText for chat |
| **Algorithms** | SM-2, Kahn's cycle detection, heuristic selection | Pure TypeScript, tested |
| **UI** | Tailwind CSS v4 + shadcn/ui | Copy-paste components, fully customizable |
| **Testing** | Vitest | TDD for algorithms, 17 tests passing |

---

## v1.1 Vision: Living Graph

The concept graph is not static—it *responds* to how the learner actually performs.

**Three Reactive Behaviors:**

### 1. Downward Growth (Struggle Detection → Gap Insertion)
User struggles at concept → System detects which prerequisite is missing → Proposes insertion

**Implementation:**
- Extended grading prompt classifies errors: CORRECT | MINOR | MISCONCEPTION | **PREREQUISITE_GAP**
- For PREREQUISITE_GAP, LLM outputs missing concept name + severity (NARROW/MODERATE/BROAD)
- GapDetection model logs each occurrence
- 2+ occurrences of same missing concept → user-facing proposal with reasoning
- User confirms → system inserts 1 concept (NARROW), 2-4 concepts (MODERATE), or new unit graph (BROAD)
- Practice redirects to prerequisite; once mastered, redirects back to original concept

### 2. Upward Growth (Mastery Detection → Frontier Expansion)
User masters all frontier concepts → System proposes new directions

**Implementation:**
- Mastery = proficiency >= 0.8 AND confidence >= 0.5, OR 3+ consecutive correct at target difficulty
- Frontier = mastered concept with no unmastered dependents
- When frontier reached, LLM generates 3 expansion directions:
  - **Extend:** Go deeper in this domain (add 3-5 new concepts)
  - **Bridge:** Connect to another graph (shared concepts, cross-domain learning)
  - **New Unit:** Start a completely new domain (pre-seeded graph)
- User picks direction → concepts inserted, practice continues

### 3. Lateral Growth (Bridge Detection)
System identifies concepts that would meaningfully connect the learner's existing knowledge domains.

**Implementation:**
- After 2nd+ unit graph created (async, non-blocking)
- LLM analyzes all graphs, identifies bridging topics
- Bridge score measures how many domains a topic connects (2+ is valuable)
- Proposals appear in advisor or chat, user can add to existing graph or new unit

---

## Build Order for v1.1 (Recommended: 19 hours for hackathon)

| # | Feature | Hours | Priority |
|---|---------|-------|----------|
| ⭐1 | Enhanced grading prompt (error classification + gap detection) | 2 | **Critical** |
| ⭐2 | GapDetection model + logging to DB | 1 | **Critical** |
| ⭐3 | Gap pattern detection + proposal UI in Learn tab | 3 | **Critical** |
| ⭐4 | Single concept insertion flow (findOrCreateConcept + edges + relayout) | 2 | **Critical** |
| ⭐5 | Mastery detection + auto-advance to next DAG concept | 2 | **Critical** |
| ⭐6 | Frontier detection + 3-direction expansion proposal | 3 | **Critical** |
| 7 | "What should I learn next?" advisor in chat | 3 | High |
| 8 | Bridge detection + cross-graph proposals | 3 | High |
| 9 | Concept cluster insertion (2-4 concepts) | 2 | Medium |
| 10 | New unit graph insertion from expansion | 2 | Medium |
| 11 | Chat context tracking (mode, activeConceptId, recentAttempts) | 2 | Medium |
| 12 | Graph insertion animations (fade-in, edge draw) | 3 | Polish |
| 13 | Tutor explanations inline in Learn tab | 2 | Polish |

**Items 1-8 (~19 hours):** Full "living graph" story including cross-domain bridges, without fancy animations

---

## Key Design Decisions (v1.1)

| Decision | Why | Alternative Considered |
|----------|-----|------------------------|
| Gap detection requires 2 occurrences | Avoid false positives; random misclassifications unlikely to repeat | 1 occurrence, but too aggressive |
| User confirms all insertions (Phase 1) | Makes reasoning visible in demo; shows judges the "intelligence" | Auto-insert after threshold, but less transparent |
| Incremental graph layout | Inserting a node shouldn't move everything; preserves context | Full relayout, but disorienting |
| Conservative grading prompt | Error classification is error-prone; conservative is safer | Aggressive PREREQUISITE_GAP detection, but false positives |
| Bridge score favors 2+ domains | Cross-domain learning is pedagogically superior; discriminates good bridges | No scoring preference, but muddy proposals |
| Chat context lazy-read (not reactive) | Simpler to maintain state; context only reads when user switches TO chat | Reactive updates, but sync complexity |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Over-eager gap insertion | Learner feels patronized, graph bloat | Require 2-occurrence threshold, user confirmation |
| LLM misclassifies PREREQUISITE_GAP | Inserts wrong prerequisites | Conservative prompt, show reasoning for user review |
| Expansion direction generates known concepts | Waste user time with redundant material | Validate against all existing concepts before suggesting |
| Graph relayout on insertion is slow | Noticeable lag when graph has 30+ concepts | Incremental layout, only position new nodes |
| Concept pool dedup is buggy | Same concept created multiple times across graphs | Use findOrCreateConcept + nameNormalized index |
| Frontier expansion on every mastery | Too many proposals, user overwhelmed | Only trigger when mastering true frontier (no unmastered dependents) |

---

## Critical Prompts to Write

1. **Enhanced Grading Prompt:** Error classification (MINOR vs MISCONCEPTION vs PREREQUISITE_GAP)
2. **Expansion Direction Prompt:** Generate 3 options (extend/bridge/new_unit) at frontier
3. **Bridge Detection Prompt:** Identify 2-3 bridging topics across existing graphs
4. **Advisor Synthesis Prompt:** Rank recommendations (review/continue/remediate/extend/bridge/new_domain)

All prompts require strict JSON validation + Zod schemas + retry on parse failure.

---

## Deliverables (v1.1)

**If 19 hours invested (items 1-8):**
- ✅ User struggles → system detects gap → inserts prerequisite
- ✅ User masters frontier → system expands with 3 directions
- ✅ Cross-domain bridges detected and proposed
- ✅ Chat advisor suggests "what to learn next" with composite scoring
- ✅ Full demo story: cold start → struggle → gap insert → mastery → frontier expand → bridge connect

**Metrics:**
- ~50 new lines of Prisma schema (GapDetection model)
- ~200 lines of API endpoints (gap proposals, insertion, expansion)
- ~300 lines of LLM prompts
- ~400 lines of UI (proposal cards, advisor list, confirmation flows)
- ~200 lines of algorithm (mastery detection, frontier scoring, bridge heuristic)

---

## Remaining v2+ Features

- **Cluster insertion:** 2-4 related concepts at once
- **New unit insertion:** Graph generation from expansion proposal
- **Persistent chat panel:** Move from tab to always-visible sidebar
- **Hint system:** Two-level hints (conceptual then specific)
- **PDF parsing:** Support PDF uploads, not just plain text
- **Notification system:** Review reminders when due
- **Learning dashboard:** Progress visualization over time

---

## Files to Review Before Starting

1. **`adaptive-tutor/adaptive-graph-design.md`** — Full vision, prompts, data structures, 9 open questions
2. **`.planning/PROJECT.md`** — Vision + validated requirements
3. **`.planning/codebase/STACK.md`** — Tech stack choices
4. **`.planning/codebase/CONCERNS.md`** — Active decisions + v1.1-specific concerns

---

## How to Start v1.1

1. Run `/gsd:new-milestone` to formally gather requirements
2. It will offer to research design (say yes, or skip to requirements)
3. Generate REQUIREMENTS.md with explicit v1.1 feature list
4. Create ROADMAP.md with phase breakdown
5. `/gsd:plan-phase 6` to create detailed plan for Phase 6 (gap detection)
6. Execute in waves (build order above)

---

*Unified summary created 2026-02-26. Ready to plan v1.1.*
