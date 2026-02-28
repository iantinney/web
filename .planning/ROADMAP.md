# Roadmap: Adaptive Learning Tutor

**Created:** 2026-02-24
**Total Phases:** 6
**Total Requirements:** 26 (v1) + v1.1 adaptive graph
**Methodology:** Critical-path-first (DAG generation -> visualization -> practice loop -> tutor -> polish -> adaptive graph)

---

## Phase Structure

| Phase | Name | Goal | Requirements | Success Criteria |
|-------|------|------|--------------|-----------------|
| 01 | Data Foundation & Persistence | Stabilize database schemas and persistence layer | CHAT-06, GRAPH-04 | Study plans persist, database initialized, seed data loads |
| 02 | Graph Generation & Visualization | Implement MiniMax DAG generation and React Flow visualization | CHAT-01, CHAT-02, CHAT-03, GRAPH-01, GRAPH-02, GRAPH-03, GRAPH-05, VIZ-01, VIZ-02, VIZ-03 | Graph generation works, DAG visualizes, cycles detected, lesson plan shows, graph colors reflect proficiency |
| 03 | 5/6 | In Progress|  | Questions stream, multiple types work, difficulty adapts, proficiency updates, session persists |
| 04 | Free Response & Chat Integration | Implement MiniMax evaluation and chat tutor | CHAT-04, CHAT-05, LEARN-06, LEARN-08, LEARN-09, VIZ-04, VIZ-05 | Free response evaluates, misconceptions detected, chat responds, proficiency context injected, graph updates |
| 05 | Polish & Delivery | Error handling, loading states, demo safety net, README | All remaining | Full P0 feature set working, error states handled, demo reproducible, local setup documented |
| 06 | ✓ Gap Detection & Single Concept Insertion | Implement downward growth: struggle detection, gap proposal, prerequisite insertion | ADAPT-01, ADAPT-02, ADAPT-03 | Gap detection works, proposals appear, insertion flow complete, practice redirect works |

---

## Phase Details

### Phase 01: Data Foundation & Persistence

**Goal:** Migrate from JSON file backend to Prisma + SQLite. Verify schema, establish Prisma client singleton, rewrite persistence layer, add missing CRUD endpoints.

**Plans:** 2 plans

Plans:
- [x] 01-01-PLAN.md -- Prisma client singleton, db.ts migration from JSON to Prisma, seed script rewrite
- [x] 01-02-PLAN.md -- Migrate all API routes to Prisma, add ChatThread/ChatMessage CRUD endpoints

**Requirements Addressed:**
- CHAT-06: Message history persists
- GRAPH-04: Concept graph persists

**Success Criteria:**
1. `npm run seed` creates demo user and optional demo study plan
2. Prisma client singleton works in all API routes
3. Study plan CRUD endpoints work (create, read, update, delete)
4. ChatThread and ChatMessage CRUD works
5. ConceptNode, ConceptEdge, Question models persist
6. No migrations needed during later phases (schema is locked)

**Build Focus:**
- Verify Prisma schema against requirements
- Ensure all model relationships are correct
- Test seed script
- Basic API routes for persistence

---

### Phase 02: Graph Generation & Visualization

**Goal:** Implement MiniMax-driven graph generation pipeline and React Flow visualization. This is the "hero feature" and critical path.

**Plans:** 5 plans

Plans:
- [ ] 02-01-PLAN.md -- MiniMax integration and graph generation pipeline (model names, Zod schemas, prompt, API wiring, cycle breaking)
- [ ] 02-02-PLAN.md -- Chat state machine and study plan creation flow (context gathering, file upload, concept preview, progress feedback)
- [ ] 02-03-PLAN.md -- React Flow visualization, node detail panel, and edge type rendering (React.memo, onNodeClick, edit mode)
- [ ] 02-04-PLAN.md -- Initial proficiency inference and live graph updates (prior knowledge, store hydration, lesson plan)
- [ ] 02-05-PLAN.md -- End-to-end integration, app initialization, and human verification

**Requirements Addressed:**
- CHAT-01: Chat accepts learning goals
- CHAT-02: User uploads materials
- CHAT-03: Chat gathers clarifying context
- GRAPH-01: DAG generation from MiniMax
- GRAPH-02: Cycle detection (Kahn's algorithm)
- GRAPH-03: Initial proficiency from prior knowledge
- GRAPH-05: Lesson plan notification
- VIZ-01: Graph displays DAG
- VIZ-02: Node colors reflect proficiency
- VIZ-03: Node detail panel

**Success Criteria:**
1. Graph generation API calls MiniMax successfully, returns structured JSON
2. Zod validation catches malformed JSON, logs for debugging
3. Kahn's algorithm detects cycles; graph handles or rejects cycles
4. Node layout computed with dagre; positions persisted
5. React Flow renders graph with correct styling (proficiency colors)
6. Clicking node opens detail panel with concept metadata
7. Study plan creation UI shows loading state during generation
8. Lesson plan (concept list) displayed as notification after generation
9. User can create study plan from pasted text or uploaded file

**Build Focus:**
- MiniMax graph generation prompt + structured output
- Zod schemas for graph validation
- Kahn's algorithm implementation
- dagre layout + position persistence
- React Flow integration
- Study plan creation flow

---

### Phase 03: Adaptive Practice Engine

**Goal:** Build the Learn tab's complete interactive practice loop: question generation, card presentation for all 4 question types (MCQ tap-to-submit, flashcard tap-to-flip/swipe, fill-blank with submit, free-response with character counter), SM-2 spaced repetition scheduling, and proficiency updates from attempts.

**Plans:** 5/6 plans executed

Plans:
- [x] 03-01-PLAN.md -- SM-2 spaced repetition algorithm (TDD: sm2.ts with unit tests)
- [x] 03-02-PLAN.md -- Proficiency update function, Zustand store extensions, question generation prompt
- [x] 03-03-PLAN.md -- Question generation endpoint (idempotent MiniMax per-concept, cached in DB)
- [x] 03-04-PLAN.md -- Attempt recording + session management routes ($transaction SM-2 + proficiency)
- [x] 03-05-PLAN.md -- Full Learn tab UI (all 4 types, state machine, feedback, summary) + FloatingChatButton stub
- [ ] 03-06-PLAN.md -- Human verification of complete practice engine end-to-end

**Requirements Addressed:**
- LEARN-01: Card-based practice UI
- LEARN-02: Question types (flashcard, fill-blank, MCQ, free response)
- LEARN-03: Difficulty selection based on proficiency
- LEARN-04: Streaming question generation
- LEARN-05: Immediate feedback on submission
- LEARN-07: Proficiency updates from attempts

**Success Criteria:**
1. Question selector prioritizes high-uncertainty concepts
2. Difficulty adapter targets ~70% success rate (Elo-like)
3. Pre-generated question bank contains 5+ questions per concept per type
4. Question cards stream during practice session (real-time or pre-batched)
5. Card UI supports all 4 question types (Tinder/Quizlet-style UX)
6. Attempt submission stores answer, evaluates correctness (except free response)
7. Proficiency updates persist to database
8. Session summary shows concepts covered, accuracy, proficiency deltas
9. No LLM calls in practice path (fast, responsive)

**Build Focus:**
- Question selector algorithm (priority scoring)
- Difficulty adapter (Elo-like updates)
- Question pre-generation pipeline (async, fire-and-forget)
- Card UI component (supports all types)
- Session recording (SessionRecord model)
- Attempt evaluation (except free response)

---

### Phase 04: Free Response & Chat Integration

**Goal:** Implement MiniMax-powered free response evaluation and chat tutor with proficiency awareness.

**Requirements Addressed:**
- CHAT-04: Chat streaming from MiniMax
- CHAT-05: Proficiency snapshot in chat context
- LEARN-06: Free response evaluation with misconception detection
- LEARN-08: Session summary with evaluation results
- LEARN-09: Graph review prompt after session
- VIZ-04: "Practice this concept" CTA
- VIZ-05: Graph updates after Learn session

**Success Criteria:**
1. Free response evaluation calls MiniMax with rubric-anchored prompts
2. Determines correctness, extracts misconceptions, generates feedback
3. Stores evaluation results in AttemptRecord
4. Chat system prompt includes compressed proficiency snapshot (~200 tokens)
5. Chat responds to questions, explains concepts, discusses mistakes
6. Chat can reference user's weak areas from proficiency state
7. Graph detail panel "Practice" CTA triggers targeted session
8. Graph updates proficiency colors after Learn session completion
9. Chat maintains message history across sessions

**Build Focus:**
- Free response evaluation prompt + Zod schema
- Chat system prompt with proficiency compression
- Streaming chat route (MiniMax integration)
- Proficiency snapshot generation (from DB state)
- Graph update triggers after Learn sessions
- Error handling for LLM failures (fallback feedback)

---

### Phase 05: Polish & Delivery

**Goal:** Finalize P0 feature set with error handling, loading states, demo safety net, and documentation.

**Requirements:** All remaining (refinement)

**Success Criteria:**
1. All error states handled gracefully (fallback UI, retry logic)
2. Loading states on all async operations (graph generation, question streaming, chat)
3. Dark mode toggle (Tailwind)
4. Seeded demo study plan with pre-generated graph and questions (safety net)
5. Demo flow works end-to-end in <4 minutes
6. README with local setup steps and demo instructions
7. All P0 features functional and integrated
8. No console errors during demo

**Build Focus:**
- Error boundary components
- Loading/skeleton UI
- Demo data initialization
- Documentation
- Dark mode styling
- Final integration testing

---

### Phase 06: Gap Detection & Single Concept Insertion

**Goal:** Implement the first reactive behavior of the living graph: detect when learners struggle due to missing prerequisites and propose insertion of the missing concept.

**Plans:** 2 plans

Plans:
- [ ] 06-01-PLAN.md -- GapDetection Prisma model, enhanced grading prompt with error classification, gap logging in attempt route
- [ ] 06-02-PLAN.md -- Gap pattern detection UI, concept insertion endpoint, practice redirect to prerequisite and back on mastery

**Requirements Addressed:**
- ADAPT-01: Error classification in free response grading (CORRECT/MINOR/MISCONCEPTION/PREREQUISITE_GAP)
- ADAPT-02: Gap pattern detection with 2-occurrence threshold and user-facing proposal
- ADAPT-03: Single concept insertion flow with prerequisite edges, graph update, and practice redirect

**Success Criteria:**
1. GapDetection model persists gap observations to database
2. Free response grading classifies errors with gap analysis
3. System detects 2-occurrence pattern for same missing prerequisite
4. Learn tab shows proposal card when pattern detected
5. User can confirm insertion (concept + edge + graph update)
6. Practice redirects to new prerequisite concept after insertion
7. Prerequisite mastery triggers redirect back to original concept
8. Graph visualization shows newly inserted node
9. Questions generated for new concept (fire-and-forget)
10. No regression in existing practice flow

**Build Focus:**
- GapDetection Prisma model + migration
- Enhanced grading prompt with error classification + Zod schema
- Gap pattern detection query + UI proposal card
- Concept insertion endpoint (findOrCreateConcept + edges + layout)
- Practice redirect logic (to prerequisite, back on mastery)
- Store tracking for redirect origin

---

## Critical Path & Dependencies

**Build Order (Must follow this):**

1. **Phase 01** -- Database schemas (foundation for everything)
2. **Phase 02** -- Graph generation & visualization (validates DAG schema, establishes central data flow)
3. **Phase 03** -- Practice loop (independent from chat, testable with stub proficiency)
4. **Phase 04** -- Chat & evaluation (depends on proficiency persistence from phase 03)
5. **Phase 05** -- Polish (depends on all features working)
6. **Phase 06** -- Gap detection & insertion (depends on Phases 1-5 complete, extends grading + practice + graph)

**Parallel Opportunities:**

- Phase 01 and Phase 02 can start together if DAG schema is locked first
- Phase 03 and Phase 04 can be developed in parallel if practice loop provides stable API
- Phase 05 can start once Phase 04 basic functionality works
- Phase 06 is sequential after Phase 05 (extends existing grading, practice, and graph systems)

---

## Success Metrics

**MVP Definition (All P0):**
- User can create a study plan from text
- System generates a concept graph
- Graph visualizes with proficiency colors
- User can practice with adaptive questions (3+ types)
- Free response evaluation works with misconception detection
- Chat tutor responds with context awareness
- All data persists locally
- Zero external dependencies beyond MiniMax API

**v1.1 Definition (Adaptive Graph):**
- System detects prerequisite gaps from wrong answers
- Proposes insertion when pattern recurs (2+ occurrences)
- User confirms and concept is inserted into graph
- Practice redirects to prerequisite, then back on mastery
- Graph grows reactively in response to learner behavior

### Phase 7: Integrated Chat Window

**Goal:** Make the chat tutor context-aware and accessible from where the user is learning — chatContext state tracks current activity, chat API injects this context into system prompt, "Explain this" inline tutor in Learn tab, and "What should I learn next?" advisor with interactive recommendation cards in Chat tab.
**Depends on:** Phase 6
**Plans:** 3/3 plans complete — PHASE COMPLETE

Plans:
- [x] 07-01-PLAN.md -- chatContext Zustand field + AdvisorCard/ChatMessage types + prompt utilities (buildChatContextSnippet, explainAnswerPrompt, advisorPrompt) + tab-switch mode update in layout
- [x] 07-02-PLAN.md -- /api/explain route + "Explain this" button in Learn tab (wrong answers only) + chatContext injection into /api/chat system prompt + key-event store updates
- [x] 07-03-PLAN.md -- /api/advisor route + AdvisorCards component + advisor quick-action button in Chat tab + chatContext.activeConceptId update on Graph tab concept click

### Phase 8: Session Lifecycle, Tab Persistence & Integration Polish

**Goal:** Fix post-Phase-7 bugs and polish cross-tab integration: stop premature session PATCH on tab switch, fix chat "structuring" stuck state, clear chatLessonPlan on new conversation, replace Phase 3 placeholder with real LLM feedback for free response, update chatContext.activeConceptId from NodeDetailPanel, add per-concept session summary, and add active-session banner in Chat tab.
**Depends on:** Phase 7
**Plans:** 3/3 plans complete

Plans:
- [ ] 08-01-PLAN.md -- Fix session PATCH on tab switch + free response LLM feedback + per-concept session summary (learn/page.tsx)
- [ ] 08-02-PLAN.md -- Fix chat stuck-state + chatLessonPlan reset on new conversation + active Learn session banner (chat/page.tsx)
- [ ] 08-03-PLAN.md -- NodeDetailPanel "Practice this concept" syncs chatContext.activeConceptId (NodeDetailPanel.tsx)

### Phase 9: Web-style force-directed graph layout via backend positioning

**Goal:** Replace hierarchical Dagre layout with organic force-directed web layout (d3-force on backend), add particle stream edge animations with proficiency-driven intensity, and enable user-initiated custom node addition with LLM edge inference — transforming the graph into a living neural network.
**Depends on:** Phase 8
**Plans:** 3 plans

Plans:
- [x] 09-01-PLAN.md -- Backend force-directed layout engine (d3-force) + layout API endpoint + migrate all computeDAGLayout callers
- [ ] 09-02-PLAN.md -- ParticleEdge custom edge (organic bezier + SVG animateMotion particles) + multi-directional ConceptNode handles + graph page wiring
- [ ] 09-03-PLAN.md -- AddConceptFAB (floating + button + form overlay) + edgeInferencePrompt + add-custom API endpoint + graph page integration

### Phase 10: Fix graph edge visibility and pulse animation

**Goal:** Fix the edge visibility bug (edges hidden behind opaque nodes) by setting zIndex: 1 on edge objects, and refine ParticleEdge styling to match the IntroAnimation's neon green aesthetic with flowing dash-dot pulse animation and glow effects.
**Depends on:** Phase 9
**Plans:** 1/1 plans complete

Plans:
- [ ] 10-01-PLAN.md -- Edge zIndex visibility fix + ParticleEdge neon green style matching IntroAnimation + human verification

### Phase 11: Prerequisite & Extension Insertion Demo

**Goal:** Make the prerequisite and extension node insertion feature demo-ready with keyboard shortcuts, seeded mode for guaranteed demos, on-demand gap/extension analysis, and reliable insertion flow supporting both downward (prerequisite) and upward (extension) graph growth.
**Depends on:** Phase 10
**Plans:** 2/2 plans complete ✓

Plans:
- [x] 11-01-PLAN.md -- Demo seed config, analyze-gap API route, suggest-extension API route, concepts/insert extension support
- [x] 11-02-PLAN.md -- ExtensionProposalCard component, keyboard shortcuts + trigger buttons in Learn tab, shared insertion handler

**Status:** Complete ✓ — All 8 must-haves verified. Feature demo-ready with seeded and live modes, full E2E flow working.

---

*Roadmap created: 2026-02-24*
*Last updated: 2026-02-28 after Phase 11 execution complete*
