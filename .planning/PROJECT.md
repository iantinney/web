# Adaptive Learning Tutor

## What This Is

An AI-powered adaptive tutoring system for independent learners. Users upload learning materials or describe a learning goal, the system generates a concept prerequisite graph and initial proficiency estimates, then guides adaptive practice sessions with streaming question cards. A conversational tutor chat interface stays aware of the learner's current proficiency state and provides targeted feedback. The app is optimized as a single-user local demo, demonstrating a closed-loop learning experience without traditional classroom structure.

## Core Value

Real-time personalized learning paths: the system continuously diagnoses knowledge gaps, generates targeted practice, and adapts difficulty based on proficiency — enabling independent learners to master complex subjects efficiently without human tutor supervision.

## Requirements

### Validated

**Existing Scaffold (Next.js + Prisma + React Flow foundation)**
- ✓ Next.js 16 (App Router) configured with TypeScript
- ✓ Prisma ORM + SQLite database schema (StudyPlan, ConceptNode, ConceptEdge, Question, AttemptRecord, SessionRecord, ChatThread, ChatMessage)
- ✓ React Flow + dagre integrated for graph visualization
- ✓ Zustand state management structure
- ✓ API route structure (study-plans, chat, attempts, upload, graph generation endpoints)
- ✓ Three-tab UI layout (Chat, Learn, Graph) with routing
- ✓ MiniMax integration via Vercel AI SDK (OpenAI-compatible)
- ✓ Core algorithm stubs (DAG validation with Kahn's algorithm, question selector, difficulty adapter)
- ✓ Tailwind CSS + shadcn/ui components ready
- ✓ File upload route structure (/public/uploads)
- ✓ Seed script for demo user initialization

### Active

**Resource Gathering & Graph Generation**
- [ ] Chat interface accepts learning goals and clarifying questions about prior knowledge
- [ ] User can upload learning materials (text/documents)
- [ ] Chat gathers context via quick clarifying questions (prior knowledge, prerequisites, depth)
- [ ] Graph generation agent structures uploaded material into concept DAG with prerequisite edges
- [ ] System detects and handles cycle violations in generated graphs
- [ ] Initial proficiency estimates set based on stated prior knowledge
- [ ] Tentative lesson plan (concept list) displayed to user as notification/screen

**Adaptive Practice (Learn Tab)**
- [ ] Learn tab presents adaptive practice as streaming question cards (Tinder/Quizlet-style)
- [ ] System supports 3+ question types (flashcard, fill-in-blank, MCQ with misconception distractors, free response)
- [ ] Question difficulty and type selected based on current concept proficiency
- [ ] Question generation is procedural and streams new cards during session
- [ ] User submits answers and receives immediate feedback
- [ ] Free response answers evaluated by MiniMax with misconception detection
- [ ] Attempt results persist and update concept proficiency
- [ ] Session summary shows concepts covered, accuracy, proficiency deltas
- [ ] User prompted to review updated concept graph after session completion

**Graph Visualization (Graph Tab)**
- [ ] Interactive concept graph displays DAG with nodes and prerequisite edges
- [ ] Node color reflects proficiency state (gray=untested, red=weak, yellow=developing, green=mastered)
- [ ] Clicking node opens detail panel with metadata and proficiency metrics
- [ ] "Practice this concept" CTA in detail panel triggers targeted session
- [ ] Graph updates reflect proficiency changes after Learn sessions

**Chat Integration (Chat Tab)**
- [ ] Chat serves as tutor and learning coordinator
- [ ] Tutor responds to questions, explains concepts, discusses mistakes
- [ ] Chat system prompt includes compressed learning state (active plan, weak concepts, recent mistakes, progress)
- [ ] Message history persists in SQLite
- [ ] Streaming responses from MiniMax

**Project Persistence**
- [ ] Study plans persist with title, description, source material, status
- [ ] Concept graph (nodes, edges, proficiency, positions) persists across sessions
- [ ] Question bank pre-generated after graph creation
- [ ] Attempt records tracked with question ID, user answer, correctness, feedback, misconceptions

### Out of Scope

- **Multi-user support** — single hardcoded demo user for hackathon
- **Authentication / OAuth** — no sign-up, no account management
- **Web scraping for resources** — P1 feature; P0 uses only uploaded documents
- **Cloud deployment** — local demo only (Vercel/similar deferred)
- **Graph refinement UI** — users cannot edit DAG in P0; rejection/refinement deferred to post-MVP
- **Proficiency ↔ Chat bidirectional integration** — proficiency updates from Learn to DB; chat reads static snapshots for P0; live sync deferred if complex
- **Linear progression fallback for malformed graphs** — P1 feature; P0 assumes valid DAGs or user-corrects in chat
- **Review scheduling / spaced repetition** — P1 feature
- **Browser notifications** — P2 feature
- **PDF parsing** — P1 feature; P0 accepts plain text only
- **Resource discovery agent** — P2 feature

## Context

**Hackathon Scope:**
This project was created to solve the hackathon challenge: build agentic edtech for independent learners (people outside traditional schools) using MiniMax core models. The system demonstrates agentic behavior through role-specialized agents: resource gathering (chat), graph creation (structure), question generation (personalization), and tutoring (guidance).

**Architecture Philosophy:**
Multi-agent system where each agent handles a focused responsibility:
- **Chat/Resource agent** gathers learning context via clarifying questions
- **Graph agent** structures concepts and prerequisites autonomously
- **Question agent** procedurally generates adaptive practice sequences
- **Chat tutor** stays aware of proficiency state and guides forward

**MiniMax Spike:**
JSON reliability and streaming behavior pre-validated. All LLM operations use MiniMax API.

**Single-User Local Demo:**
No deployment infrastructure, no multi-tenancy, no cloud dependencies. Deliverable is repository with local setup instructions.

## Constraints

- **Tech Stack**: Next.js (App Router) + React + TypeScript + SQLite (Prisma ORM) + React Flow + dagre — non-negotiable for P0
- **LLM**: MiniMax API only (no fallback to other providers); `MINIMAX_API_KEY` is sole required environment variable
- **Timeline**: All P0 features must be working end of hackathon
- **Data**: Single hardcoded demo user; local file uploads only (no cloud storage)
- **Deployment**: Local development only (`next dev`); no Vercel/cloud services
- **Persistence**: SQLite file-based database; Prisma handles schema and queries

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Local-only, single-user demo | Hackathon constraints; reduces complexity of deployment and auth | — Pending |
| Multi-agent architecture | Separates concerns (resource gathering, graph creation, question generation, tutoring); enables parallel development and testing | — Pending |
| MiniMax as sole LLM | Hackathon requirement; already validated for reliability and streaming | — Pending |
| Proficiency threshold >0.8 for mastery | Reasonable default pending education research; tunable later | — Pending |
| Defer chat↔graph bidirectional sync to P1 | Reduces P0 complexity; chat reads proficiency snapshots from DB; live updates deferred if integration is complex | — Pending |
| Graph fallback (linear) deferred to P1 | P0 assumes valid DAGs; user can refine in chat if needed; simple fallback added post-MVP | — Pending |

---

*Last updated: 2026-02-24 after codebase mapping (scaffold foundation validated)*
