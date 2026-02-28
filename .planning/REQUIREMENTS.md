# Requirements: Adaptive Learning Tutor

**Defined:** 2026-02-24
**Core Value:** Real-time personalized learning paths with continuous knowledge diagnosis, targeted practice, and adaptive difficulty

## v1 Requirements (P0 - Hackathon MVP)

### Chat Integration

- [ ] **CHAT-01**: Chat interface accepts learning goals and clarifying questions
- [ ] **CHAT-02**: User can upload learning materials (text-based)
- [ ] **CHAT-03**: Chat gathers context via quick clarifying questions (prior knowledge, prerequisites, depth)
- [ ] **CHAT-04**: Chat provides streaming tutor responses from MiniMax
- [ ] **CHAT-05**: Chat system prompt includes compressed learning state (active plan, weak concepts, progress)
- [ ] **CHAT-06**: Message history persists in SQLite

### Graph Generation & Storage

- [ ] **GRAPH-01**: Graph generation agent structures uploaded material into concept DAG
- [ ] **GRAPH-02**: System detects and handles cycle violations using Kahn's algorithm
- [ ] **GRAPH-03**: Initial proficiency estimates set based on prior knowledge
- [ ] **GRAPH-04**: Concept graph (nodes, edges, proficiency, positions) persists in database
- [ ] **GRAPH-05**: Tentative lesson plan displayed to user after graph generation

### Graph Visualization

- [ ] **VIZ-01**: Interactive concept graph displays DAG with nodes and prerequisite edges
- [ ] **VIZ-02**: Node color reflects proficiency state (gray=untested, red=weak, yellow=developing, green=mastered)
- [ ] **VIZ-03**: Clicking node opens detail panel with metadata and proficiency metrics
- [ ] **VIZ-04**: "Practice this concept" CTA in detail panel triggers targeted session
- [ ] **VIZ-05**: Graph updates reflect proficiency changes after Learn sessions

### Adaptive Practice (Learn Tab)

- [x] **LEARN-01**: Learn tab presents adaptive practice as streaming question cards
- [x] **LEARN-02**: System supports 3+ question types (flashcard, fill-blank, MCQ, free response)
- [x] **LEARN-03**: Question difficulty and type selected based on current proficiency
- [x] **LEARN-04**: Question generation is procedural and streams during session
- [x] **LEARN-05**: User submits answers and receives immediate feedback
- [ ] **LEARN-06**: Free response answers evaluated by MiniMax with misconception detection
- [x] **LEARN-07**: Attempt results persist and update concept proficiency
- [ ] **LEARN-08**: Session summary shows concepts covered, accuracy, proficiency deltas
- [ ] **LEARN-09**: User prompted to review updated graph after session completion

## v2 Requirements (P1 - Post-Hackathon)

### Advanced Features

- **SCHED-01**: Review queue UI (due concepts via spaced repetition)
- **SCHED-02**: Prerequisite-propagated proficiency inference
- **RESOURCE-01**: Web scraping for resource discovery
- **PARSE-01**: PDF text extraction for uploaded syllabi
- **SCHEDULE-01**: Local browser notifications for due reviews

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user support | Hackathon P0 is single-user demo |
| Authentication / OAuth | No account management needed |
| Cloud deployment | Local dev only |
| Graph refinement UI | Users refine in chat; graph editor is P1 |
| Bidirectional chat↔graph sync | Chat reads proficiency snapshots; live sync is P1 |
| Linear progression fallback | P1 feature; P0 assumes valid DAGs |
| Gamification/streaks | Dark patterns; harm intrinsic motivation |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHAT-01 | Phase 2 | Pending |
| CHAT-02 | Phase 2 | Pending |
| CHAT-03 | Phase 2 | Pending |
| CHAT-04 | Phase 4 | Pending |
| CHAT-05 | Phase 4 | Pending |
| CHAT-06 | Phase 1 | Complete |
| GRAPH-01 | Phase 2 | Pending |
| GRAPH-02 | Phase 2 | Pending |
| GRAPH-03 | Phase 2 | Pending |
| GRAPH-04 | Phase 1 | Complete |
| GRAPH-05 | Phase 2 | Pending |
| VIZ-01 | Phase 1 | Pending |
| VIZ-02 | Phase 1 | Pending |
| VIZ-03 | Phase 1 | Pending |
| VIZ-04 | Phase 2 | Pending |
| VIZ-05 | Phase 2 | Pending |
| LEARN-01 | Phase 3 | Complete |
| LEARN-02 | Phase 3 | Complete |
| LEARN-03 | Phase 3 | Complete |
| LEARN-04 | Phase 3 | Complete |
| LEARN-05 | Phase 3 | Complete |
| LEARN-06 | Phase 4 | Pending |
| LEARN-07 | Phase 3 | Complete |
| LEARN-08 | Phase 4 | Pending |
| LEARN-09 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---

## Phase 7 Requirements (v1.2 - Integrated Chat Window)

- [x] **CHAT-CONTEXT-01**: ChatContext Zustand field tracks mode/activeConceptId/activeUnitGraphId/recentAttempts (Phase 7, Plan 01)
- [x] **CHAT-CONTEXT-02**: Tab navigation updates chatContext mode via layout.tsx (Phase 7, Plan 01)
- [x] **CHAT-CONTEXT-03**: /api/explain route with "Explain this" button in Learn tab after wrong answers (Phase 7, Plan 02)
- [x] **CHAT-CONTEXT-04**: chatContext injected into /api/chat system prompt as context snippet (Phase 7, Plan 02)
- [x] **CHAT-CONTEXT-05**: /api/advisor route returning 2-3 ranked AdvisorCard recommendations (Phase 7, Plan 03)
- [x] **CHAT-CONTEXT-06**: Chat tab advisor quick-action button + AdvisorCards component + graph tab activeConceptId updates (Phase 7, Plan 03)

## Phase 9 Requirements (v1.2 - Web-Style Graph Layout)

- [x] **LAYOUT-01**: Backend d3-force layout engine with forceRadial tier positioning and adaptive spacing (Phase 9, Plan 01)
- [x] **LAYOUT-02**: Particle stream edge animations flowing prerequisite to dependent with proficiency-driven intensity (Phase 9, Plan 02)
- [x] **LAYOUT-03**: Multi-directional ConceptNode handles replacing top/bottom only (Phase 9, Plan 02)
- [x] **LAYOUT-04**: User-initiated custom node addition via floating + button with LLM edge inference (Phase 9, Plan 03)
- [x] **LAYOUT-05**: Layout recomputes on graph mutation only (creation and concept insertion) (Phase 9, Plan 01)

*Requirements defined: 2026-02-24*
*Last updated: 2026-02-27 after Phase 9 completion (LAYOUT-01 through LAYOUT-05 complete)*
