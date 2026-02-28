# Project Research Summary

**Project:** Adaptive Learning Tutor
**Domain:** Adaptive Intelligent Tutoring System (ITS) for Independent Learners
**Researched:** 2026-02-24
**Confidence:** HIGH (stack, features, architecture) / MEDIUM-HIGH (pitfalls)

## Executive Summary

This is a knowledge-graph-driven Intelligent Tutoring System built on a well-validated Next.js 15 + MiniMax LLM stack. The classical four-component ITS architecture (Domain Model, Student Model, Tutor Model, User Interface) directly maps to this project's planned structure, which gives it a strong academic and engineering foundation. The concept DAG is the central data artifact — every other component reads from it, and locking its schema early is the single most critical architectural decision. The recommended approach is to build the DAG and student model first (as stable foundations), then layer in question generation, the practice loop, and finally the chat tutor.

The primary differentiation of this system over commodity quiz apps comes from three features that are all correctly prioritized in P0: MCQ with misconception distractors, LLM-graded free response evaluation, and a Socratic chat tutor that guides reasoning rather than providing answers directly. Research validates that these are the capabilities most responsible for learning outcome improvements in ITS systems. The graph visualization makes the knowledge structure transparent, which is a novel UI element that platforms like Duolingo and Khan Academy do not expose — this is a genuine differentiator.

The top two risks that could kill the demo are: (1) MiniMax's structured output support being model-specific — `MiniMax-Text-01` supports `json_schema` natively while M2/M2.5 use tool calling, so this must be tested on day one; and (2) the LLM concept graph producing cycles, which breaks every downstream component — cycle detection via Kahn's algorithm must run immediately on every graph generation, before anything is persisted. Both risks are fully mitigable if addressed early.

---

## Key Findings

### Recommended Stack

The proposed stack is sound for a hackathon demo. Most choices are well-validated with HIGH confidence. Next.js 15 (App Router) + React 19 + TypeScript is the current production baseline for EdTech platforms. React Flow (`@xyflow/react`) + `@dagrejs/dagre` is the correct combination for interactive concept DAGs — React Flow handles interactive node-based UIs as first-class React components, and dagre provides automatic hierarchical layout for directed graphs. The `ts-fsrs` library fills an important gap as the actively maintained TypeScript implementation of FSRS v6 (the current state-of-the-art spaced repetition algorithm; the previously listed `fsrs.js` is deprecated).

The one integration risk requiring early validation is MiniMax structured output: `response_format: json_schema` only works with `MiniMax-Text-01`, not the newer M2/M2.5 models. The recommended split is: use `MiniMax-Text-01` (via `generateObject` + Zod) for graph generation and question generation where reliable JSON is required, and use `MiniMax-M2.5-highspeed` for conversational streaming in the chat tutor.

**Core technologies:**
- **Next.js 15 + React 19 + TypeScript:** Full-stack framework — App Router enables server components and co-located API routes; industry standard for EdTech in 2025
- **shadcn/ui + Tailwind CSS v4:** UI components — copy-paste components, fully customizable, idiomatic with App Router; dominant choice in Next.js ecosystem
- **React Flow (`@xyflow/react`) + `@dagrejs/dagre`:** Concept DAG visualization — React components as nodes, automatic hierarchical layout; correct choice over D3/Cytoscape for this use case
- **Prisma ORM + SQLite:** Persistence — zero-setup file-based DB, type-safe queries, one-line migration path to Postgres; use singleton guard in `lib/prisma.ts` for Next.js dev mode
- **Vercel AI SDK + MiniMax community provider:** LLM integration — `generateObject` + Zod schema for structured output; `streamText` for chat; pin the community provider version
- **Zustand:** State management — centralized store ideal for interconnected adaptive learning state (current concept, quiz session, proficiency) across multiple components
- **ts-fsrs:** Spaced repetition — FSRS v6, typed card states, pure computation; replaces any custom SM-2 implementation
- **Zod:** Schema validation — de facto standard for LLM output validation and API route contracts in Next.js ecosystem

### Expected Features

**Must have (table stakes) — all correctly in P0:**
- Learning goal intake via conversational chat — normalized expectation; 2-4 clarifying questions is the right scope
- Concept DAG generation with cycle validation — structural validity is non-negotiable before any downstream feature runs
- Initial proficiency estimation from stated prior knowledge — avoids wasting learner time; conversational intake is sufficient for demo
- Tentative lesson plan display after graph creation — required trust-building step before committing to a session
- Four question types (flashcard, fill-blank, MCQ, free response) — format variety drives broader proficiency than single-format drill
- Adaptive difficulty selection targeting Zone of Proximal Development — the defining behavior of "adaptive"; 70-85% expected success rate heuristic
- Per-concept proficiency state (gray/red/yellow/green) with real-time updates — student model core; must persist after every answered question
- Attempt history record — raw data powering everything else; provide as context to chat tutor
- Interactive DAG visualization with proficiency color-coding — central novel UI element; makes knowledge structure transparent
- Node detail panel with "Practice this concept" CTA — makes graph actionable, not decorative
- Socratic chat tutor with proficiency-aware context — what separates intelligent tutor from generic chatbot
- Streaming chat responses — non-streaming LLM responses break conversational flow; table stakes for perceived responsiveness
- End-of-session summary — closes feedback loop; emphasize progress over performance
- Question bank pre-generation — one-time cost at setup; eliminates per-question latency during practice

**Should have (P1 differentiators):**
- Prerequisite-propagated proficiency inference — when mastery of C implies something about prerequisites A and B; significantly improves adaptation quality; currently missing from P0
- Spaced repetition scheduling with ts-fsrs — important for long-term retention; correctly deferred from single-session demo
- Formal diagnostic pre-assessment — higher accuracy proficiency initialization; deferred correctly
- Hint system (two-level: conceptual then specific) — scaffolding is robustly validated; minimal complexity for P1
- PDF upload parsing — most common format in practice; plain text sufficient for demo
- Multiple concurrent study plans — power user feature; data model should support it even if UI defers

**Defer to P2+:**
- Long-term progress dashboard — requires multi-session data to be meaningful
- Prerequisite-aware difficulty calibration using empirical response data (IRT-adjacent)

**Explicitly exclude (anti-features):**
- Streak mechanics and gamification — crowds out intrinsic motivation for self-directed learners; this is the target user population
- Graph editing UI — high complexity, low ROI; chat interface is sufficient correction mechanism
- Social/leaderboard features — out of scope; negative effects on lower-performing learners
- Answer-giving AI (non-Socratic mode) — enables passive consumption that mimics learning without producing it

### Architecture Approach

The system maps cleanly onto the classical ITS architecture: Concept DAG = Domain Model, per-concept proficiency + ts-fsrs schedule = Student Model, Chat Tutor Agent + Question Selector = Tutor Model, three-tab UI (Chat/Learn/Graph) = User Interface. The most important structural decision is treating the Concept DAG as write-once during setup — mutation during a session creates cascading inconsistencies in question bank, student model, and visualization. The student model should be event-sourced (store every attempt as an immutable record, derive proficiency from the log) rather than just storing the current proficiency float, which enables debugging and replay.

**Major components and build order:**
1. **Concept DAG store** — schema foundation; everything else reads from it; lock schema first
2. **Graph visualization (frontend)** — depends only on DAG; validates schema through use; can be tested with seed data
3. **Question generation agent** — depends on DAG schema; fire-and-forget async after graph is persisted; 8-12 questions per concept
4. **Student Model (ts-fsrs + proficiency state)** — depends on question schema; implements FSRS state tracking and compressed proficiency snapshot
5. **Question Selector + Learn Tab** — depends on Student Model and Question Bank; wires the adaptive practice loop
6. **Chat Tutor Agent** — depends on Student Model snapshot and DAG; dual-layer prompt (static persona + dynamic proficiency snapshot ~200 tokens)
7. **Orchestration pipeline** — integrates Resource Agent, Graph Agent, Question Agent into the setup flow; can be built last using seeded data for earlier phases

**Critical patterns:**
- Dual-layer prompt for chat tutor: static pedagogical persona (never changes) + dynamic proficiency snapshot rebuilt from DB on every call
- DAG topology as learning path oracle: "what can I study next?" = concepts whose prerequisites are all mastered (graph query, not business logic)
- Question bank as static cache: generation pipeline writes, practice loop only reads — prevents generation latency from affecting practice UX

### Critical Pitfalls

1. **DAG cycles from LLM generation** — Run Kahn's algorithm immediately after every graph generation before persisting anything. If cycles detected, prune lowest-confidence edges or regenerate with explicit anti-cycle prompt constraints. This is the highest-severity failure mode.

2. **MiniMax structured output model mismatch** — `json_schema` response format only works on `MiniMax-Text-01`; M2/M2.5 uses tool calling. Test `generateObject` against the intended model on day one. Use `MiniMax-Text-01` for graph/question generation; use `MiniMax-M2.5-highspeed` for streaming chat.

3. **False mastery from low-quality evidence** — Set mastery threshold at 0.95 minimum (not 0.80 as initially planned); require minimum streak count in addition to threshold probability. A single correct response on an easy question must not declare mastery.

4. **LLM free-response grading biases** — Use rubric-anchored prompts with reference answers and explicit anti-verbosity instruction. Do not ask "is this correct?" — define scoring criteria with examples. For high-stakes evaluations, consider dual-pass grading with answer order swapped.

5. **Semantic duplicate questions degrading proficiency signal** — Enforce question-type rotation per concept (definition, application, comparison, counterexample before repeating); use embedding similarity check against seen questions to reject near-duplicates before serving. Pool sizing of 8-12 per concept provides sufficient variety for a demo.

---

## Implications for Roadmap

Based on the data dependency graph and pitfall phase assignments, the following phase structure is recommended:

### Phase 1: Data Foundation — DAG Schema and Storage
**Rationale:** The DAG is the backbone of every other component. Nothing can be built until its schema is stable. "Critical path: DAG schema → Student Model schema → everything else" (ARCHITECTURE.md). Changing either schema after Phase 5 requires coordinated updates across 5+ components.
**Delivers:** Prisma schema for ConceptNode, ConceptEdge, StudyPlan; cycle detection utility; seed data for all downstream phases
**Addresses:** Features 1.3 (DAG generation infrastructure), 3.4 (attempt history record)
**Avoids:** Pitfall 1 (cycles), Pitfall 11 (non-idempotent regeneration); stable IDs prevent orphaned proficiency data
**Research flag:** Standard patterns; no additional research needed

### Phase 2: Graph Visualization and Setup UI
**Rationale:** Depends only on DAG schema; can be validated with seed data before the generation pipeline exists. Builds the central UI artifact early, de-risks React Flow + dagre integration.
**Delivers:** Interactive concept graph with proficiency color-coding; node detail panel with "Practice this concept" CTA; responsive layout with shadcn/ui
**Addresses:** Features 4.1, 4.2 (graph visualization and node panel)
**Avoids:** Pitfall 3 (multi-root DAG layout) — virtual root workaround should be implemented here
**Research flag:** Standard patterns; React Flow + dagre are well-documented

### Phase 3: LLM Graph Generation Pipeline
**Rationale:** With the schema and visualization working against seed data, this phase replaces seed data with real LLM output. The schema is already validated by Phase 2 so generation output has a proven target to write into. MiniMax structured output risk is resolved here.
**Delivers:** Resource Agent (topic synthesis), Graph Agent (DAG extraction with Zod validation + retry), conversational intake flow, lesson plan display
**Addresses:** Features 1.1 (chat intake), 1.2 (document upload), 1.3 (DAG generation), 1.5 (lesson plan display)
**Avoids:** Pitfall 2 (JSON output failures — parse/validate/retry wrapper); Pitfall 8 (semantic graph quality — second-pass LLM validation)
**Research flag:** Needs attention — test `generateObject` vs MiniMax model variants on day one; validate Zod schema + retry behavior early

### Phase 4: Student Model and Question Generation
**Rationale:** Student model depends on question schema (needs concept_id to track state). Question generation depends on DAG schema. Both are prerequisites for the practice loop.
**Delivers:** ts-fsrs integration (FSRS state per concept); proficiency snapshot generation (~200 tokens); Question Generation Agent (8-12 questions/concept, async fire-and-forget); question bank storage
**Addresses:** Features 3.1, 3.2 (proficiency state and updates); 7.3 (question bank pre-generation)
**Avoids:** Pitfall 5 (semantic duplicates — question-type rotation enforced during generation); Pitfall 3 (false mastery — threshold 0.95, streak minimum)
**Research flag:** ts-fsrs integration is well-documented; question diversity enforcement needs prompt engineering attention

### Phase 5: Practice Loop — Learn Tab
**Rationale:** Depends on both Student Model and Question Bank being functional. Wires together the Question Selector, attempt recording, proficiency updates, and immediate feedback display.
**Delivers:** Question Selector (ZPD-targeting algorithm with priority order); adaptive practice session; immediate feedback; per-question proficiency updates persisted after every answer; attempt history
**Addresses:** Features 2.1–2.7, 2.9 (all practice session features); 4.4 (concept-targeted practice)
**Avoids:** Pitfall 7 (latency — questions served from pre-generated bank; no LLM calls in the practice loop); Pitfall 13 (session persistence — persist after every question)
**Research flag:** Standard patterns for question selection logic; ZPD targeting heuristic needs tuning against real interaction data

### Phase 6: Chat Tutor Agent
**Rationale:** Depends on Student Model (for proficiency snapshot) and DAG (for topic structure). Both are available after Phase 4. Chat can be developed in parallel with Phase 5 using mock student model data.
**Delivers:** Socratic chat tutor with streaming responses; dual-layer prompt (static persona + dynamic proficiency snapshot); proficiency-aware context injection; persistent message history; concept explanation on demand
**Addresses:** Features 5.1–5.5 (all chat features)
**Avoids:** Pitfall 4 (free-response grading bias — rubric-anchored evaluation prompts with reference answers); Pitfall 9 (predictable feedback patterns — varied, personalized feedback generation)
**Research flag:** Socratic prompt engineering requires careful iteration; system prompt must resist learner pressure for direct answers (no short-circuit to answer-giving mode)

### Phase 7: Session Summaries and Polish
**Rationale:** End-of-session summary requires attempt history (Phase 4+) and proficiency deltas. This phase closes the core feature loop and adds the progress prompt to review the updated graph.
**Delivers:** End-of-session summary (concepts covered, proficiency deltas, misconceptions identified); prompt to review updated graph; proficiency color updates in graph after session
**Addresses:** Features 6.1, 6.2 (session summary and graph review prompt)
**Avoids:** Pitfall 9 (engagement dropout) — session summary emphasizes progress framing, not raw accuracy
**Research flag:** Standard patterns; no deep research needed

### Phase Ordering Rationale

- Phases 1-2 are schema-first: building against stable, seed-data-backed schemas prevents cascading rework when LLM output quality varies.
- Phase 3 before Phase 4 because the graph schema must be finalized before question generation can target specific concept IDs.
- Phase 4 before Phase 5 because the practice loop is useless without questions to serve and a student model to update.
- Phase 6 can begin alongside Phase 5 (they share dependencies but are independent features); the chat tutor does not depend on the practice loop.
- Phase 7 last because it aggregates data from all previous phases.

### Research Flags

Phases needing deeper research or early validation during implementation:
- **Phase 3 (Graph Generation):** Test MiniMax `generateObject` + Zod schema against `MiniMax-Text-01` vs M2 variants on day one. The community provider `minimax-ai-provider` must be pinned and tested before any generation code is written.
- **Phase 6 (Chat Tutor):** Socratic system prompt engineering is nontrivial. Allocate time for iteration. The prompt must refuse direct answers under learner pressure; test adversarial prompts explicitly.

Phases with well-documented standard patterns (skip additional research):
- **Phase 1 (Data Foundation):** Prisma + SQLite singleton pattern is thoroughly documented.
- **Phase 2 (Graph Visualization):** React Flow + dagre official docs cover all required patterns including multi-root workarounds.
- **Phase 4 (Student Model):** ts-fsrs GitHub docs are comprehensive; FSRS state tracking is straightforward.
- **Phase 5 (Practice Loop):** Question selection algorithm is a well-understood pattern from CAT literature; no novel research needed.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core libraries verified via official docs and WebFetch; only MiniMax structured output is MEDIUM due to model-specific behavior |
| Features | HIGH | Cross-referenced against academic ITS literature, ALEKS, Khan Academy, Khanmigo; P0 feature set validated as correct throughout |
| Architecture | HIGH | Classical ITS component model is well-established; build order derived from dependency analysis is solid; D3.js recommendation in ARCHITECTURE.md conflicts with React Flow decision — React Flow is the correct choice |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (cycles, JSON failures, false mastery, LLM bias) are HIGH confidence with peer-reviewed sources; moderate pitfalls are MEDIUM based on production anecdotes and research inference |

**Overall confidence:** HIGH — The proposed project is well-specified, the stack is appropriate, the feature set is validated, and the critical risks are known and mitigable.

### Gaps to Address

- **MiniMax model selection for structured output:** Confirm `MiniMax-Text-01` supports `generateObject` via the community Vercel AI SDK provider before committing to the generation pipeline. Fallback is raw `fetch` to the OpenAI-compatible MiniMax endpoint with `response_format: json_schema`.

- **Adaptive algorithm depth:** No JavaScript BKT library exists with high adoption. The recommended approach (LLM-based mastery assessment + ts-fsrs scheduling) is a pragmatic substitute. If post-hackathon accuracy matters, a BKT layer would require a Python service or WebAssembly port.

- **Difficulty calibration at MVP:** LLM-assigned difficulty tags are priors, not ground truth. Initial tags will be wrong for some questions. Plan to collect empirical p-values from real responses from the first session; recalibration infrastructure is a P1/P2 item but data collection must begin at P0.

- **D3.js vs React Flow discrepancy:** ARCHITECTURE.md recommends D3.js force-directed layout for graph visualization, but STACK.md recommends React Flow + dagre. React Flow is the correct choice — it provides React components as nodes, full JSX/Tailwind control, and is already specified in the project constraints. D3.js recommendation in ARCHITECTURE.md should be disregarded.

- **Concept granularity for graph generation:** Targeting 10-40 concepts per topic for the DAG provides good proficiency tracking granularity. The LLM generation prompt must specify this range explicitly to avoid either too-coarse (5-node) or too-fine (100-node) output.

---

## Sources

### Primary (HIGH confidence)
- [React Flow Layout Documentation](https://reactflow.dev/learn/layouting/layouting) — React Flow + dagre patterns, multi-root DAG workarounds
- [Vercel AI SDK MiniMax Provider](https://ai-sdk.dev/providers/community-providers/minimax) — `generateObject`, `streamText`, community provider interface
- [MiniMax API Reference — Text Generation](https://platform.minimax.io/docs/api-reference/text-post) — `json_schema` support model-specificity
- [ts-fsrs GitHub](https://github.com/open-spaced-repetition/ts-fsrs) — FSRS v6 TypeScript implementation
- [Prisma SQLite Quickstart](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/sqlite) — singleton pattern, migration path
- [How Much Mastery is Enough Mastery? (EDM 2025)](https://educationaldatamining.org/edm2025/proceedings/2025.EDM.short-papers.4/2025.EDM.short-papers.4.pdf) — mastery threshold 0.95 vs 0.98

### Secondary (MEDIUM confidence)
- [Comprehensive Review of AI-based ITS (arXiv 2025)](https://arxiv.org/html/2507.18882v1) — classical ITS architecture, component model
- [LPITutor dual-layer prompt strategy (PMC 2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12453719/) — system prompt architecture for LLM-based ITS
- [Justice or Prejudice? LLM-as-Judge Biases (arXiv)](https://arxiv.org/html/2410.02736v1) — position bias, verbosity bias in grading
- [Survey of Computerized Adaptive Testing (arXiv 2024)](https://arxiv.org/html/2404.00712v2) — ZPD targeting, question selection
- [Structured Output AI Reliability 2025](https://www.cognitivetoday.com/2025/10/structured-output-ai-reliability/) — JSON schema enforcement reliability
- [Khanmigo Design Philosophy](https://www.khanmigo.ai/) — Socratic tutoring principles, anti-answer-giving approach

### Tertiary (LOW confidence)
- LLM-based mastery assessment as BKT substitute — inferred from general LLM capability literature; no direct production benchmark found
- Concept granularity 10-40 target — inferred from ARCHITECTURE.md analysis; not directly cited in literature

---
*Research completed: 2026-02-24*
*Ready for roadmap: yes*
