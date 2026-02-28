# Adaptive Learning Tutor - Project Overview

## Vision
An AI-powered personal tutor system that enables learners to upload course materials, generate concept graphs, diagnose knowledge gaps, and practice adaptively until mastery.

## Current Status
**Phase 3 Complete** - Core platform with authentication, multi-graph support, and AI-powered features

### What Works Now
- ✅ Username-based authentication (zero-friction login)
- ✅ Multi-user data isolation
- ✅ Chat interface for gathering learning requirements
- ✅ AI-powered lesson plan generation (text proposal → graph)
- ✅ Concept graph visualization with React Flow
- ✅ Multi-graph support (multiple learning paths per user)
- ✅ Shared concept tracking (concepts appearing in multiple graphs)
- ✅ AI-generated study plan titles (1-2 words, domain-appropriate)
- ✅ Graph-based navigation sidebar
- ✅ Reused concept notifications in chat
- ✅ Global concept deduplication (confidence-weighted merge)

## Core Architecture

### Database Schema (Prisma)
- **User** - User accounts (userId, displayName)
- **StudyPlan** - Learning curriculum (title, description, concepts, edges)
- **UnitGraph** - Curriculum lens (studyPlanId, title, memberships, edges)
- **Concept** - Global, user-scoped concepts (userId, name, proficiency, confidence, SM-2 state)
- **GraphMembership** - Join table (conceptId, unitGraphId, positionX, positionY, depthTier)
- **ConceptEdge** - Prerequisite/helpful relationships (unitGraphId, fromNodeId, toNodeId, edgeType)
- **Question** - Practice questions (conceptId, type, text, answer, distractors)
- **SessionRecord** - Practice sessions (unitGraphId, startedAt, endedAt, score)
- **AttemptRecord** - Individual question attempts (sessionId, questionId, response, correct, timeSpent)

### Tech Stack
- **Frontend:** Next.js 16, React, Tailwind CSS, Zustand (state management)
- **Visualization:** React Flow (interactive node-edge diagrams)
- **Backend:** Next.js API routes, Prisma ORM, SQLite (dev) / LibSQL (prod)
- **LLM:** MiniMax API (MiniMax-M2 model) for concept generation & structuring
- **Auth:** Minimal localStorage-based session (no passwords)

### File Structure
```
adaptive-tutor/
├── src/
│   ├── app/
│   │   ├── (tabs)/              # Tabbed interface (chat, graph, learn)
│   │   │   ├── chat/page.tsx    # Chat interface
│   │   │   ├── graph/page.tsx   # Graph visualization
│   │   │   ├── learn/page.tsx   # Practice interface (stub)
│   │   │   └── layout.tsx       # Shared header with user profile
│   │   ├── api/                 # API endpoints
│   │   │   ├── chat/            # Chat message processing
│   │   │   ├── study-plans/     # CRUD + structure-plan endpoint
│   │   │   ├── unit-graphs/     # Graph management
│   │   │   ├── concepts/        # Global concept CRUD
│   │   │   ├── attempts/        # Question attempt recording
│   │   │   ├── users/           # User creation/verification
│   │   │   └── upload/          # File upload (stub)
│   │   └── layout.tsx           # Root layout
│   ├── lib/
│   │   ├── store.ts             # Zustand global state
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── db.ts                # Database query abstraction
│   │   ├── prisma.ts            # Prisma client
│   │   ├── auth.ts              # localStorage auth utilities
│   │   ├── minimax-native.ts    # MiniMax API integration
│   │   ├── algorithms/
│   │   │   ├── conceptDedup.ts  # Concept deduplication
│   │   │   ├── graphValidator.ts # DAG validation & layout
│   │   │   ├── proficiency.ts   # Initial proficiency inference
│   │   │   └── questionSelector.ts # Question selection strategy
│   │   ├── prompts/             # LLM system prompts
│   │   └── schemas/             # Zod validation schemas
│   └── components/
│       ├── graph/
│       │   ├── ConceptNode.tsx      # Node component
│       │   ├── NodeDetailPanel.tsx  # Node detail sidebar
│       │   ├── GraphPillSelector.tsx # (REMOVED in Phase 3)
│       │   └── MultiGraphSelector.tsx # Graph navigation sidebar
│       ├── AuthModal.tsx           # Login modal
│       ├── UserProfile.tsx         # Username + logout
│       └── AppInitializer.tsx      # Auth + store hydration
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── dev.db                  # SQLite database
├── docs/                       # Documentation
└── scripts/
    └── migrate-to-shared-concepts.ts # Data migration script
```

## Key Design Decisions

### 1. Global vs Local Concepts
**Decision:** Concepts are global and user-scoped, not per-study-plan
**Rationale:** When a user studies "Linear Algebra" in one curriculum and then "ML Foundations" in another, they should recognize that "eigenvalues" is the same concept. Proficiency updates in one graph appear across all graphs.

### 2. Multi-Graph Architecture
**Decision:** Study plans contain multiple UnitGraphs (curriculum lenses)
**Rationale:** One lesson plan can be visualized multiple ways (by topic, by difficulty, by prerequisite depth). Each UnitGraph is a different "view" of the same concepts.

### 3. Concept Deduplication
**Decision:** When concepts with the same name appear in different study plans, they're merged using confidence-weighted proficiency averaging
**Rationale:** Prevents concept fragmentation (e.g., "React Hooks" appearing as separate nodes) while preserving proficiency uncertainty.

### 4. Minimal Auth
**Decision:** Username-only, localStorage-based sessions (no passwords)
**Rationale:** Zero-friction for demos; multi-user isolation sufficient for hackathon scope

### 5. LLM-Generated Titles
**Decision:** Study plans get 1-2 word AI-generated titles instead of generic labels
**Rationale:** Improves UX by making learning paths immediately recognizable

## Phases Completed

### Phase 0: Schema Migration ✅
- Migrated from `ConceptNode` (plan-scoped) to `Concept` (global) model
- Created `UnitGraph`, `GraphMembership`, and `GraphLink` tables
- 48 ConceptNodes → 39 Concepts (9 reused via deduplication)
- Updated all API queries and Prisma relations

### Phase 1-2: Core Infrastructure + Store Updates ✅
- Implemented `findOrCreateConcept()` utility with confidence-weighted merge
- Created concept deduplication algorithm
- Updated store with graph-focused state (activeUnitGraphId, graphConcepts, graphMemberships, graphEdges)
- Built `/api/unit-graphs` endpoints for multi-graph listing and details
- Added `loadUnitGraphData()` async store action

### Phase 2.1-2.2: Auth, UI Improvements, Graph Toggle Bar ✅
- Implemented minimal username-only authentication
- Created UserProfile component with logout
- Fixed page refresh persistence
- Added reused concept notifications in chat
- Built GraphPillSelector (horizontal pills) for graph switching
- Implemented shared concept tracking and visual indicators

### Phase 3: AI Titles + Multi-Graph Sidebar ✅
- Created `generateStudyPlanTitle()` for AI-powered naming
- Built `MultiGraphSelector` component (left sidebar)
- Removed duplicate GraphPillSelector
- Fixed schema migration edge cases (studyPlanId → conceptId)

## What's Not Implemented Yet

### Phase 4 (Future)
- [ ] Session-based practice flow (active, review, diagnosis)
- [ ] Mastery-based progression (unlock new concepts based on proficiency)
- [ ] Analytics dashboard (learning velocity, knowledge gaps)
- [ ] Spaced repetition (SM-2 scheduling in practice sessions)
- [ ] Question regeneration API (when question pool exhausted)

### Known Limitations
- Learn tab is a stub (no practice functionality yet)
- Questions are generated once and reused (no regeneration on pool exhaustion)
- File upload placeholder (no actual file parsing)
- No real spaced repetition scheduling (SM-2 fields exist but unused)
- No cross-session analytics or learning recommendations

## Testing the System

### 1. Start the App
```bash
npm run dev
```
Open http://localhost:3000

### 2. Create a Test User
- Enter username (e.g., "test-user")
- You'll be prompted to confirm/create account

### 3. Chat Flow
- Say something like "I want to learn Python"
- Model will propose a lesson plan
- Approve the plan
- Concept graph is generated and displayed

### 4. Graph Exploration
- Left sidebar shows all your learning paths (graphs)
- Click to switch between graphs
- Click nodes to see details
- Concept colors indicate proficiency (mastered = green, gap = red, etc.)

### 5. Shared Concepts
- If you create two lesson plans on related topics, some concepts will be reused
- These show with green glow rings in the graph
- Proficiency updates apply across both graphs

## Success Criteria (Phase 3)
✅ Multi-user isolation with zero-friction auth
✅ AI-generated, domain-appropriate study plan titles
✅ Multi-graph visualization and switching
✅ Shared concept tracking and visual indicators
✅ Concept deduplication across study plans
✅ Build passes with zero TypeScript errors
✅ All API endpoints functional
✅ UX improvements (sidebar nav, reused notifications)

## Next Steps for Critics/Reviewers

1. **Architecture Review:** Are the schema choices sound? Is the Concept/UnitGraph/GraphMembership separation appropriate?
2. **UX/Design:** Is the multi-graph sidebar intuitive? Should titles appear elsewhere in the UI?
3. **Performance:** Any obvious N+1 queries? Should we add database indices?
4. **Data Integrity:** Are there edge cases in concept deduplication that could cause problems?
5. **Testing:** What critical user flows are missing test coverage?
6. **Future Planning:** Is the Phase 4 scope reasonable? Should we prioritize differently?
