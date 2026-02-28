# Architecture Patterns: Adaptive Learning Tutor

**Domain:** Adaptive Learning / Intelligent Tutoring Systems (ITS)
**Researched:** 2026-02-24
**Confidence:** HIGH for classical ITS patterns (well-established literature), MEDIUM for LLM-specific patterns (fast-moving area)

---

## Classical ITS Architecture (Baseline Mental Model)

The established academic architecture for Intelligent Tutoring Systems uses four components. Every modern adaptive learning system either follows this or consciously diverges from it.

```
┌─────────────────────────────────────────────┐
│                 DOMAIN MODEL                 │
│   (What can be known? Concept graph,         │
│    prerequisite relationships, difficulty)   │
└─────────────────┬───────────────────────────┘
                  │ informs
┌─────────────────▼───────────────────────────┐
│                 TUTOR MODEL                  │
│   (What should we teach next? Strategy       │
│    selection, scaffolding, hint generation)  │
└──────────┬──────────────────────┬────────────┘
           │ reads                │ writes to
┌──────────▼──────────┐  ┌───────▼────────────┐
│   STUDENT MODEL     │  │   USER INTERFACE    │
│ (What does the      │  │ (Chat, exercises,   │
│  learner know now?  │  │  graph, feedback)   │
│  Proficiency state) │  │                     │
└─────────────────────┘  └─────────────────────┘
```

**Sources:** [Wikipedia: Intelligent Tutoring System](https://en.wikipedia.org/wiki/Intelligent_tutoring_system), [Comprehensive Review of AI-based ITS (2025)](https://arxiv.org/html/2507.18882v1)

In the project's planned design:
- Domain Model = Concept DAG + Question Bank
- Student Model = Per-concept proficiency scores + review schedule
- Tutor Model = Chat Tutor Agent + question selection logic
- User Interface = Three-tab UI (Chat / Learn / Graph)

---

## Proposed Component Architecture

### System Overview (Text Diagram)

```
╔══════════════════════════════════════════════════════════════════╗
║                        USER INTERFACE                            ║
║  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐  ║
║  │   Chat Tab      │  │   Learn Tab       │  │  Graph Tab     │  ║
║  │ (tutor + plan)  │  │ (adaptive practice│  │ (concept DAG   │  ║
║  │                 │  │  + spaced repeat) │  │  visualized)   │  ║
║  └────────┬────────┘  └────────┬──────────┘  └───────┬────────┘  ║
╚═══════════╪═════════════════════╪════════════════════╪═══════════╝
            │                     │                    │
            ▼                     ▼                    ▼
╔══════════════════════════════════════════════════════════════════╗
║                       BACKEND API LAYER                          ║
║  POST /chat  ·  POST /attempt  ·  GET /graph  ·  GET /questions  ║
╚══════╤═══════════════════╤══════════════════════════════════════╝
       │                   │
       ▼                   ▼
┌──────────────┐   ┌────────────────────────────────────────┐
│  CHAT TUTOR  │   │          ORCHESTRATOR                  │
│  AGENT       │   │  (coordinates build pipeline)          │
│              │   │                                        │
│ Reads:       │   │  1. Resource Agent → raw content       │
│  - concept   │   │  2. Graph Agent   → concept DAG        │
│    DAG       │   │  3. Question Agent→ question bank      │
│  - proficiency│  │                                        │
│    snapshot  │   │  (Phase 2: Graph + Question gen)       │
│  - chat hist │   └────────────────────────────────────────┘
└──────────────┘

┌──────────────────────────────────────────────────────────────┐
│                     CORE DATA STORES                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ CONCEPT DAG  │  │ QUESTION BANK│  │ STUDENT MODEL   │   │
│  │              │  │              │  │                 │   │
│  │ nodes:       │  │ questions[]  │  │ proficiency{}   │   │
│  │  - id        │  │  - id        │  │  - concept_id   │   │
│  │  - name      │  │  - concept_id│  │  - p_mastery    │   │
│  │  - summary   │  │  - body      │  │  - stability    │   │
│  │  - difficulty│  │  - options[] │  │  - difficulty   │   │
│  │              │  │  - answer    │  │  - next_review  │   │
│  │ edges:       │  │  - difficulty│  │  - attempt_hist │   │
│  │  - from → to │  │  - explanation│  └─────────────────┘  │
│  │  (prereq)    │  └──────────────┘                        │
│  └──────────────┘                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Details

### Component 1: Resource Gathering Agent

**Purpose:** Translate the user's topic prompt into structured learning material via web search, document parsing, or LLM synthesis.

**Inputs:**
- User topic string (e.g., "Rust ownership and borrowing")
- Optional: URL, PDF, or pasted text

**Outputs:**
- Raw content blob (text, structured sections)
- Feeds into Graph Agent

**Key decisions:**
- This agent runs synchronously and blocks until Graph Agent can proceed. It is the entry point of the build pipeline.
- Content quality directly caps the quality of the concept graph. Poor content in = poor graph out.
- For MVP: LLM synthesis from topic description is sufficient. No web crawling required.

---

### Component 2: Graph Creation Agent

**Purpose:** Transform raw content into a typed Concept DAG with prerequisite edges.

**Inputs:**
- Raw content from Resource Agent
- Schema for concept nodes

**Outputs:**
- `ConceptDAG` (JSON): nodes + directed edges
- Stored persistently as the project's domain model

**Internal logic:**
1. Identify atomic concepts and cluster into nodes
2. Infer prerequisite relationships (A must come before B)
3. Assign difficulty levels per concept
4. Validate: no cycles, all prerequisites reachable

**Key decisions:**
- The DAG is the backbone of the entire system. Every other component reads from it.
- Topological sort of the DAG defines the "canonical" learning order used by the question selector and learning path planner.
- Concept granularity is critical: too coarse (few large nodes) = bad proficiency tracking; too fine (many tiny nodes) = fragmented experience. Aim for 10-40 concepts for a focused topic.
- Once persisted, the DAG is read-only during a session. Mutation requires re-running the build pipeline.

**Data shape (per concept node):**
```json
{
  "id": "rust-ownership",
  "name": "Ownership",
  "summary": "Single-owner memory model with move semantics",
  "prerequisites": ["rust-variables", "rust-memory-model"],
  "difficulty": 0.6,
  "estimated_minutes": 20
}
```

---

### Component 3: Question Generation Agent

**Purpose:** Pre-generate a pool of questions per concept from the DAG.

**Inputs:**
- `ConceptDAG` (all nodes)
- Difficulty distribution target (e.g., 40% easy / 40% medium / 20% hard)
- Questions-per-concept count (e.g., 5-15)

**Outputs:**
- `QuestionBank` (JSON array): questions indexed by concept_id

**Key decisions:**
- **Pre-generate, don't real-time generate.** Pre-generation decouples latency from practice UX. Real-time generation means a 1-3s pause before each question — unacceptable for fluent practice. Pre-generation pays a one-time upfront cost.
- **Fire-and-forget async.** Question generation happens after the DAG is persisted, in background. The user can inspect the graph while questions generate. UI shows progress.
- **Per-concept pools, not global bank.** Questions must be tagged to concept_id for proficiency-aware selection to work.
- **Include distractors and explanations.** Multiple-choice questions need plausible wrong answers and answer explanations. Generate these during initial creation, not at attempt time.
- **Pool sizing recommendation:** 8-12 questions per concept provides enough variety for 3-4 practice rounds before content repeats. Replenishment can be triggered when pool drops below a threshold.

**Data shape (per question):**
```json
{
  "id": "q-rust-ownership-003",
  "concept_id": "rust-ownership",
  "body": "What happens when you pass a String to a function without using a reference?",
  "type": "multiple_choice",
  "options": ["A) The String is copied", "B) Ownership moves into the function", "C) A borrow error occurs", "D) Nothing changes"],
  "answer": "B",
  "explanation": "Strings are heap-allocated and do not implement Copy. Passing by value moves ownership.",
  "difficulty": 0.55
}
```

---

### Component 4: Student Model

**Purpose:** Track per-concept mastery and schedule next review times.

**Inputs:**
- `attempt` events: `{ question_id, concept_id, correct: bool, time_taken_ms }`
- Initial state: all concepts at `p_mastery = 0.0`

**Outputs:**
- Proficiency snapshot for Chat Tutor context injection
- Next-question selector inputs
- Review schedule for spaced repetition

**Algorithm recommendation: FSRS (Free Spaced Repetition Scheduler)**

FSRS is the current best-practice for open-source spaced repetition, now the default in Anki. It models three per-card memory variables:
- `stability (S)`: time (days) for retrievability to decay from 100% to 90%
- `difficulty (D)`: how hard this item is for this learner
- `retrievability (R)`: current probability of recall (decreases daily)

Map "card" to "concept". After each attempt, update the concept's `{S, D, R}` state and compute `next_review` date.

**Sources:** [FSRS Algorithm (open-spaced-repetition)](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler), [FSRS PyPI package](https://pypi.org/project/fsrs/)

**Data shape (per concept in student model):**
```json
{
  "concept_id": "rust-ownership",
  "p_mastery": 0.72,
  "stability": 4.2,
  "difficulty": 0.58,
  "retrievability": 0.91,
  "next_review": "2026-02-26T10:00:00Z",
  "attempt_count": 7,
  "correct_count": 5,
  "last_attempt": "2026-02-24T14:30:00Z"
}
```

**Proficiency snapshot (for Chat Tutor):**

The full student model is too verbose to inject into every chat prompt. Compress to a structured summary:

```json
{
  "topic": "Rust Ownership and Borrowing",
  "total_concepts": 18,
  "mastered": ["rust-variables", "rust-types"],
  "in_progress": ["rust-ownership", "rust-references"],
  "not_started": ["rust-lifetimes", "rust-smart-pointers"],
  "weak_spots": ["rust-move-semantics"],
  "due_for_review": ["rust-variables"],
  "overall_progress_pct": 34
}
```

This snapshot is injected as a system prompt section, not the full JSON blob.

---

### Component 5: Question Selector

**Purpose:** Given the student model state, choose the next question to present.

**Inputs:**
- Student model (all concept states)
- Question bank (pool per concept)
- Session context (questions shown this session, avoid repeats)

**Outputs:**
- Selected `question_id`

**Selection algorithm:**

```
Priority order:
1. Concepts due for review (retrievability below threshold, e.g., R < 0.85)
2. Unlocked concepts (all prerequisites mastered) with lowest p_mastery
3. In-progress concepts not yet mastered (p_mastery < 0.8)

Within a concept:
- Select question at difficulty closest to student's current level
- Exclude recently seen questions (last 5 per concept)
- Vary difficulty: occasionally go ±0.2 from estimated ability
```

This implements a simplified Computerized Adaptive Testing (CAT) approach. The target: present questions the student has roughly 60-70% probability of answering correctly (Zone of Proximal Development — harder than easy, but not frustrating).

**Sources:** [Survey of Computerized Adaptive Testing (2024)](https://arxiv.org/html/2404.00712v2), [Adaptive Quiz Difficulty Scaling](https://www.quizcat.ai/blog/what-is-adaptive-quiz-difficulty-scaling)

---

### Component 6: Chat Tutor Agent

**Purpose:** Conversational tutor that answers questions, explains concepts, and discusses the learning plan.

**Inputs (per turn):**
- Chat history (last N turns)
- Proficiency snapshot (compressed student model)
- Concept DAG (topic structure, for "what should I learn next" questions)
- Current question context (if the user is asking about a specific question)
- User message

**Outputs:**
- Assistant response (streamed)
- Optional: commands that mutate state (e.g., "mark concept X as understood")

**Context injection pattern (dual-layer):**

```
System prompt =
  [Static pedagogical persona]
  +
  [Dynamic: proficiency snapshot JSON block]
  +
  [Dynamic: current focus concept and prerequisites]
  +
  [Dynamic: recent incorrect attempts, if any]

User turn = [chat history] + [current message]
```

**Key decisions:**
- The chat agent does NOT directly mutate the student model. Attempts flow through the formal attempt tracking pipeline. The chat agent can reinforce, explain, and plan — but practice happens in the Learn tab.
- Compressing the student model to a snapshot (not the full JSON) keeps token cost manageable. The snapshot is a ~200-token block that fits in every call.
- The chat agent should be aware of the DAG structure so it can answer "what do I need to learn before X?" questions by traversing prerequisites.

---

### Component 7: Graph Visualization (Frontend)

**Purpose:** Render the Concept DAG as an interactive node-link diagram.

**Inputs:**
- Concept DAG (nodes + edges)
- Student model (per-concept proficiency, for color coding)

**Outputs:**
- Interactive visualization: click node to see summary, highlight learning path

**Implementation recommendation:** D3.js force-directed layout.

- D3 force simulation handles layout automatically for arbitrary graphs
- Node color encodes proficiency level (grey = not started, yellow = in progress, green = mastered)
- Edge direction encodes prerequisite flow (arrow: A → B means B requires A)
- Hover/click reveals concept summary and estimated time

**Sources:** [D3 Force-Directed Graph (Observable)](https://observablehq.com/@d3/force-directed-graph/2), [d3-force module](https://d3js.org/d3-force)

---

## Data Flow Diagrams

### Flow 1: Initial Setup Pipeline (One-time, Synchronous then Async)

```
User enters topic
       │
       ▼
[1] Resource Agent                  ← LLM call (synchronous, ~5s)
  synthesizes topic content
       │
       ▼
[2] Graph Agent                     ← LLM call (synchronous, ~10s)
  extracts concept DAG
  validates + stores DAG
       │
       ├──────────────────────────────────────────────────────────┐
       ▼                                                          ▼
  User sees Graph tab              [3] Question Agent (async, fire-and-forget)
  (can start exploring)              generates questions per concept
                                     stores to question bank
                                     (~30-120s depending on concept count)
```

### Flow 2: Practice Session (Learn Tab)

```
User opens Learn tab
       │
       ▼
[Question Selector]
  reads: student model, question bank
  selects: next question by priority algorithm
       │
       ▼
[Question displayed in UI]
  user submits answer
       │
       ▼
[Attempt recorded]
  { question_id, concept_id, correct, time_ms }
       │
       ├──────────────────────────┐
       ▼                          ▼
[Student Model updated]      [Explanation shown]
  FSRS state recalculated      (from question bank,
  next_review scheduled         pre-generated)
       │
       ▼
[Loop → Question Selector]
```

### Flow 3: Chat Interaction (Chat Tab)

```
User types message
       │
       ▼
[Context Assembly]
  + proficiency snapshot (from student model)
  + chat history (last N turns, ~10-20)
  + concept DAG summary
  + optional: current question context
       │
       ▼
[Chat Tutor Agent (LLM)]
  generates response
       │
       ▼
[Response streamed to UI]
  (no student model mutation from chat)
```

### Flow 4: Cross-Component Data Dependencies

```
Concept DAG ──────────────────────┬──→ Question Bank (generated from DAG)
     │                            │
     │                            └──→ Graph Visualization
     │
     └──────────────────────────────→ Chat Tutor (topic structure)
     └──────────────────────────────→ Question Selector (which concepts unlocked)

Student Model ─────────────────────→ Question Selector (which to practice)
     │
     └──────────────────────────────→ Chat Tutor (proficiency snapshot)
     └──────────────────────────────→ Graph Visualization (node color)

Question Bank ─────────────────────→ Question Selector (pool to select from)
     └──────────────────────────────→ Learn Tab (question display + explanation)

Attempt Events ────────────────────→ Student Model (updates proficiency + schedule)
```

---

## Build Order Implications

The data dependency graph above directly maps to a safe build order:

```
Phase 1: Concept DAG (foundation)
  Build and validate the ConceptDAG data structure and storage first.
  Nothing else can be built until the DAG schema is stable.

Phase 2: Graph Visualization
  Depends only on DAG. Can be built and tested with mock/seed data before
  agent pipeline exists. Validates the DAG schema through use.

Phase 3: Question Bank (generation + storage)
  Depends on DAG schema. Build the generation pipeline and the question
  storage schema. Can test with a single concept.

Phase 4: Student Model
  Depends on question schema (needs concept_id to track state).
  Implement FSRS state tracking + proficiency snapshot generation.

Phase 5: Question Selector + Learn Tab
  Depends on Student Model + Question Bank. Wires together practice loop.

Phase 6: Chat Tutor Agent
  Depends on Student Model (for snapshot) + DAG (for topic structure).
  Proficiency injection can be tested with mock student model data.

Phase 7: Orchestration Pipeline (Resource → Graph → Questions)
  Integrates all generation agents. Can be built last because individual
  components can be developed with seeded data.
```

**Critical path:** DAG schema → Student Model schema → everything else. Lock these schemas early. Changing either one after the Learn tab is built requires coordinated updates across 5+ components.

---

## Integration Points

### Internal Integration Points

| Point | Producer | Consumer | Format | Notes |
|-------|----------|----------|--------|-------|
| DAG handoff | Graph Agent | Question Agent | JSON file or DB table | Schema must be stable before question gen |
| DAG to selector | DB | Question Selector | Query by concept_id | Topological sort computed at read time |
| Attempt event | Learn Tab | Student Model | `POST /attempt` | Synchronous: block until model updated |
| Proficiency snapshot | Student Model | Chat Tutor | JSON in system prompt | Compress to ~200 tokens |
| DAG to visualization | DB | Graph Tab frontend | `GET /graph` JSON | Include proficiency data per node |
| Next question | Question Selector | Learn Tab | `GET /next-question` | Selector is pure function of DB state |

### External Integration Points

| Point | Dependency | Notes |
|-------|------------|-------|
| LLM calls (agents) | OpenAI / Anthropic / local model | All three agents call an LLM. Abstract behind a single client wrapper |
| FSRS library | `fsrs` Python package | Well-maintained open source, available on PyPI |
| D3.js | npm package | Frontend only, no backend dependency |

---

## Architecture Patterns to Follow

### Pattern 1: Event-Sourced Student Model

Store every attempt as an immutable event, derive proficiency state from the event log. This means:
- You can replay and recompute the student model from scratch
- You can debug "why is this concept marked mastered?"
- You can show the learner their history

Do NOT store only the current proficiency float per concept. Store the attempt history.

### Pattern 2: Dual-Layer Prompt for Chat Tutor

Static layer: pedagogical persona, instructions, output format
Dynamic layer: proficiency snapshot, current concept context, recent errors

The static layer never changes during a session. The dynamic layer rebuilds on every call from the current DB state. This decouples persona tuning from data plumbing.

**Source:** [LPITutor dual-layer prompt strategy (PMC 2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12453719/)

### Pattern 3: DAG Topology as Learning Path Oracle

Rather than hard-coding learning sequence logic, query the DAG:
- "What can I study next?" = concepts whose prerequisites are all mastered
- "What do I need before X?" = BFS/DFS backwards from X through prerequisite edges
- "What is the full learning path?" = topological sort from current frontier to goal

Implement these as graph query functions, not business logic scattered across agents.

### Pattern 4: Question Bank as Static Cache

Treat the question bank as a read-mostly cache of pre-generated content. The generation pipeline populates it; the practice loop only reads from it. Writes to the bank happen only through the generation pipeline, not during practice. This separation prevents generation latency from affecting practice UX.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Generating Questions On-Demand During Practice

**What it looks like:** When the user clicks "next question," make an LLM call to generate a question.

**Why bad:**
- 1-3s latency before every question breaks practice flow
- Rate limit and cost issues compound as the student progresses
- Question quality is inconsistent without batch validation

**Instead:** Pre-generate all questions asynchronously after graph creation. Show a progress indicator during generation. Practice starts only after the bank is populated (or partially populated, per-concept).

### Anti-Pattern 2: Proficiency Tracked Only at Session Level

**What it looks like:** "The student has answered 7 of 10 questions correctly this session."

**Why bad:**
- Loses concept-level granularity needed for adaptive selection
- Can't implement spaced repetition without per-concept review schedule
- Chat tutor can't give targeted feedback about specific weak areas

**Instead:** Track per-concept proficiency from the first attempt. The student model is the source of truth.

### Anti-Pattern 3: Mutable Concept DAG During Practice

**What it looks like:** Allowing the chat tutor to add/remove concepts in real-time as the session progresses.

**Why bad:**
- Question bank becomes inconsistent (questions for deleted concepts)
- Student model has orphaned entries
- Visualization state is confusing if the graph changes under the learner

**Instead:** DAG is write-once during setup. If the learner wants to adjust scope, trigger a new session with a new build pipeline run.

### Anti-Pattern 4: Flat Question List (No Concept Tagging)

**What it looks like:** A single array of questions, with difficulty the only metadata.

**Why bad:**
- Can't do concept-level proficiency tracking
- Can't do prerequisite-aware question sequencing
- Can't answer "which questions practice concept X?"

**Instead:** Every question is tagged with exactly one `concept_id`. Questions may reference neighboring concepts, but they are owned by one concept for tracking purposes.

### Anti-Pattern 5: Sending Full Student Model JSON to LLM

**What it looks like:** Injecting the raw student model JSON (all concepts, all FSRS state, full attempt history) into every chat prompt.

**Why bad:**
- Full model can be 5,000+ tokens for a 30-concept topic
- Most of the data is irrelevant to any given conversation turn
- Wastes context window and increases cost

**Instead:** Compute a compressed proficiency snapshot (~200 tokens) that highlights the salient state: mastered concepts, current focus, weak spots, due for review.

---

## Scalability Considerations (for Reference)

The project is a single-user local demo. These notes are FYI, not active requirements.

| Concern | Local Demo (1 user) | At 100 users | At 10K users |
|---------|---------------------|--------------|--------------|
| DAG storage | JSON file or SQLite | SQLite per user | Postgres, per-user DAGs |
| Question bank | JSON file | SQLite | Postgres with full-text search |
| Student model | SQLite | SQLite per user | Postgres, indexed by user+concept |
| LLM calls | Direct API | Same | Rate limiting, queuing needed |
| Graph viz | Client-side D3 | Client-side D3 | Client-side D3 (no scaling needed) |

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Classical ITS component model | HIGH | Well-documented in academic literature, Wikipedia |
| Concept DAG as central data structure | HIGH | Consistent across Metacademy, academic papers, modern LLM-based systems |
| Pre-generation vs real-time question decision | HIGH | Multiple sources agree on latency tradeoff; pre-gen is standard for practice apps |
| FSRS for spaced repetition | HIGH | Open source, well-documented, actively maintained, used by Anki |
| Dual-layer prompt injection | MEDIUM | Pattern confirmed by LPITutor paper; exact token budget varies by model |
| Question selector algorithm (ZPD targeting) | MEDIUM | CAT literature well-established; exact difficulty calibration needs tuning |
| D3.js for graph visualization | HIGH | Mature library, widely used for force-directed graphs in web apps |
| Build order implications | MEDIUM | Derived from dependency analysis; specific phase breaks depend on project scope |

---

## Sources

- [Comprehensive Review of AI-based ITS (arxiv 2025)](https://arxiv.org/html/2507.18882v1)
- [LPITutor: LLM-based ITS using RAG (PMC 2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12453719/)
- [Training LLM Tutors to Improve Student Outcomes (arxiv 2025)](https://arxiv.org/html/2503.06424v2)
- [AI-Powered Math Tutoring Platform (arxiv 2025)](https://arxiv.org/html/2507.12484v1)
- [Can LLMs Match Tutoring System Adaptivity? (arxiv 2025)](https://arxiv.org/html/2504.05570)
- [FSRS Algorithm (open-spaced-repetition GitHub)](https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler)
- [FSRS PyPI package](https://pypi.org/project/fsrs/)
- [Survey of Computerized Adaptive Testing (arxiv 2024)](https://arxiv.org/html/2404.00712v2)
- [Metacademy: package manager for knowledge (hunch.net)](https://hunch.net/?p=2714)
- [D3 force-directed graph layout](https://d3js.org/d3-force)
- [Bayesian Knowledge Tracing Survey (arxiv)](https://arxiv.org/pdf/2105.15106)
- [Hierarchical Bayesian Knowledge Tracing (arxiv 2025)](https://arxiv.org/html/2506.00057v1)
- [LLM Multi-agent Orchestration (arxiv 2025)](https://arxiv.org/html/2601.13671v1)
