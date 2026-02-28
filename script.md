# Hackathon Presentation Script: Adaptive Learning Tutor
 
**Project:** AI-Powered Personalized Education — From Diagnosis to Mastery
**Hackathon:** Yale Agentic AI Hackathon
**Powered By:** MiniMax M2.5 (Anthropic-compatible API)
 
---
 
## PART 1: THE PROBLEM (2 minutes)
 
### Opening Hook
 
> "There are 773 million adults worldwide who lack basic literacy skills. 250 million children are not in school. And even among those who have access to education — millions more are stuck. They're watching YouTube tutorials that don't know what they already understand. They're using flashcard apps that drill without diagnosing. They're reading textbooks that were never designed for *them*."
>
> "Independent learners — people teaching themselves outside traditional classrooms — are the fastest-growing segment in education. Self-paced online learners, career changers, hobbyists mastering new domains, students in under-resourced regions. They all share one problem: **they don't have a tutor.**"
 
### The Problem Statement
 
The core problem for independent learners is a **broken feedback loop**:
 
1. **No diagnosis** — You don't know what you don't know. Traditional platforms give you a flat list of topics and say "start here." They have no concept of *your* knowledge state.
 
2. **No structure** — Learning complex subjects requires understanding prerequisite relationships. You can't learn backpropagation without understanding the chain rule. But no app maps this for you.
 
3. **No adaptation** — Quizlet drills the same cards regardless of whether you've mastered the material. Khan Academy unlocks levels, but the content doesn't reshape itself around your specific misconceptions.
 
4. **No intelligent feedback** — When you get something wrong, most apps say "Incorrect. The answer is B." A real tutor would say: "You're confusing gradient descent with the gradient *vector* — let me explain the difference."
 
5. **No growth** — Your study plan is static. If you struggle because you're missing a prerequisite, the system doesn't notice. It just keeps failing you on the same concept.
 
> "We built a system that solves all five of these problems. It diagnoses, structures, adapts, explains, and grows — all powered by MiniMax."
 
---
 
## PART 2: THE SOLUTION — WHAT WE BUILT (3 minutes)
 
### One-Sentence Description
 
> "The Adaptive Learning Tutor is a web application that acts as a complete personal tutor: it ingests your learning materials, maps the conceptual landscape as a knowledge graph, diagnoses your gaps, and guides you through adaptive practice sessions — then restructures itself in real time based on what you get wrong."
 
### Three-Tab Architecture
 
The application has three integrated tabs that form a complete learning loop:
 
**1. Chat Tab — The Conversational Tutor**
- Natural conversation to define what you want to learn
- Gathers your prior knowledge, learning depth, and goals
- Proposes a structured lesson plan with tiered concepts
- After study plans are created, acts as a Socratic tutor — aware of your proficiency state, your recent mistakes, and your weak concepts
- Every response is grounded in your actual learning data
 
**2. Graph Tab — The Living Knowledge Map**
- Interactive force-directed concept graph (not a static tree — a living neural network)
- Nodes represent concepts; edges represent prerequisite relationships
- Color-coded proficiency: gray (untested) → red (weak) → yellow (developing) → green (mastered)
- Click any node to see its description, your proficiency metrics, and a "Practice this concept" button
- Animated particle-flow edges show the energy and direction of knowledge flow
- The graph grows and restructures in real time as the system detects gaps
 
**3. Learn Tab — The Adaptive Practice Engine**
- Streaming question cards in four formats: MCQ, fill-in-the-blank, flashcard, and free response
- Questions are pre-generated per concept with misconception-engineered distractors
- Adaptive difficulty targeting your Zone of Proximal Development (~70% expected success rate)
- Immediate, elaborated feedback — not just "wrong," but *why* you're wrong and what misconception you hold
- Free-response answers evaluated by MiniMax with semantic understanding
- Session summaries showing concepts covered, accuracy, and proficiency deltas
 
### The Complete Learning Loop
 
```
Chat (define goals) → Graph (structure knowledge) → Learn (adaptive practice)
     ↑                         ↕                          ↓
     └─── Tutor guidance ←── Gap detection ←── Proficiency updates ──┘
```
 
> "This isn't three separate features. It's one closed loop. You chat to define your goals. The system generates a knowledge graph. You practice adaptively. Your proficiency updates. The graph detects gaps. The tutor guides you forward. And the graph grows."
 
---
 
## PART 3: TECHNICAL DEPTH — AGENTIC AI APPROACHES (5 minutes)
 
### Multi-Agent Architecture
 
This system implements a classical **Intelligent Tutoring System (ITS)** architecture — Domain Model, Student Model, Tutor Model, and User Interface — reimagined with agentic AI. Each responsibility is handled by a specialized agent:
 
| Agent | Role | What It Does |
|-------|------|-------------|
| **Resource Gathering Agent** | Intake | Gathers learning context through conversational chat. Accepts topic descriptions, uploaded documents, prior knowledge. Feeds structured context to the Graph Agent. |
| **Graph Creation Agent** | Structure | Transforms raw learning material into a validated Concept DAG. Identifies atomic concepts, infers prerequisite relationships, assigns difficulty tiers. Validates with Kahn's algorithm for cycle detection. |
| **Question Generation Agent** | Assessment | Pre-generates a bank of 5+ questions per concept across all 4 types. Creates misconception-engineered MCQ distractors. Indexes questions by concept and difficulty. |
| **Gap Detection Agent** | Diagnosis | Classifies errors as CORRECT / MINOR / MISCONCEPTION / PREREQUISITE_GAP. Detects patterns when the same missing prerequisite causes repeated failures. Proposes concept insertion. |
| **Extension Suggestion Agent** | Growth | When a learner masters a concept, suggests what to learn next. Analyzes the graph frontier and proposes upward growth — new advanced concepts with inferred edges. |
| **Chat Tutor Agent** | Guidance | Socratic conversational tutor that reads a compressed proficiency snapshot, recent mistakes, misconceptions, and graph structure. Guides reasoning, never just gives answers. |
| **Advisor Agent** | Navigation | Analyzes the full learning state and recommends next actions: which concept to practice, when to review, whether to extend the graph. Returns interactive recommendation cards. |
| **Explain Agent** | Clarification | Triggered from the Learn tab after wrong answers. Takes the specific question, the wrong answer, and the concept context — generates a targeted, proficiency-aware explanation. |
 
> "Each agent has a focused responsibility and a structured interface. They don't share state through side channels — they communicate through the database and typed API contracts. This is agentic AI in the compositional sense: autonomous, specialized units that collectively produce intelligent behavior."
 
### Key Algorithms
 
**1. DAG Generation + Cycle Detection (Kahn's Algorithm)**
- MiniMax generates a concept graph with prerequisite edges from raw learning material
- Output is validated with Zod schemas for structural correctness
- Kahn's topological sort algorithm detects and breaks any cycles in the generated graph
- Result: a valid Directed Acyclic Graph that defines the canonical learning order
 
**2. Adaptive Question Selection (Priority Scoring)**
- Concepts are scored by: `uncertainty × importance × readiness`
- Uncertainty: how variable is the learner's recent performance?
- Importance: how many downstream concepts depend on this one?
- Readiness: are all prerequisites mastered?
- The highest-scoring concept gets the next question
 
**3. Difficulty Adaptation (Elo-Like Updates)**
- Targets ~70% expected success rate (Zone of Proximal Development)
- After each attempt, adjusts the difficulty of the next question up or down
- Too many correct answers → harder questions. Too many wrong → easier.
- This keeps the learner in the "productive struggle" zone that research shows maximizes retention
 
**4. Spaced Repetition (Modified SM-2)**
- Each concept has stability, difficulty, and retrievability scores
- After each attempt, SM-2 recalculates the optimal review interval
- Concepts due for review are prioritized in question selection
- Concepts that are easy to recall get pushed further out; concepts that decay are surfaced sooner
 
**5. Proficiency State Machine**
- Per-concept proficiency tracked as a float from 0.0 to 1.0
- Visual mapping: 0.0 (gray/untested) → <0.4 (red/weak) → <0.8 (yellow/developing) → ≥0.8 (green/mastered)
- Updates are atomic and transactional — each attempt triggers a database transaction that updates proficiency, records the attempt, and recalculates SM-2 scheduling
 
**6. Force-Directed Graph Layout (d3-force)**
- Backend computes node positions using d3-force simulation
- Nodes repel each other; edges act as springs; prerequisite direction flows downward
- Result: an organic, web-like layout that looks like a neural network — not a rigid tree
- Positions are persisted and recomputed on graph mutation
 
**7. Gap Detection + Concept Insertion**
- Free-response grading classifies errors into four categories: CORRECT, MINOR, MISCONCEPTION, PREREQUISITE_GAP
- When a "prerequisite gap" pattern recurs 2+ times for the same missing concept, the system proposes insertion
- On user approval: a new concept node is created, prerequisite edges are inferred by MiniMax, layout is recomputed, questions are generated, and practice redirects to the new prerequisite
- On mastery of the prerequisite: practice automatically redirects back to the original concept
 
**8. Extension Suggestion (Upward Growth)**
- When a learner masters a concept, the system checks if the graph frontier can be extended
- MiniMax analyzes the mastered concept and proposes what advanced topic naturally follows
- New concept is inserted above in the graph with inferred edges
- The knowledge graph grows both downward (gap insertion) and upward (extension)
 
### RAG Pipeline — Wikipedia-Grounded Knowledge
 
- Every concept in the graph triggers a parallel Wikipedia/Wikibooks fetch
- MediaWiki REST API retrieves articles, which are chunked by section into `SourceChunk` records
- Question generation prompts include relevant source chunks — grounding questions in verified content
- Chat tutor prompts include source material with `[N]` citation notation
- Clickable citation badges in Learn and Chat tabs link back to Wikipedia articles
- Result: every question and explanation is evidence-based, not hallucinated
 
> "This is RAG in its purest practical form: retrieve real-world knowledge, inject it into generation prompts, and surface the provenance to the user. The learner can click any citation and verify the source."
 
---
 
## PART 4: SHOWCASING MINIMAX CAPABILITIES (3 minutes)
 
### Why MiniMax?
 
MiniMax is the sole LLM powering every intelligent operation in this system. Here's how we use it:
 
**Model Selection Strategy:**
- **MiniMax-M2.5** — Used for high-stakes operations requiring deep reasoning: graph generation, free-response evaluation, gap analysis, extension suggestions
- **MiniMax-M2.5-highspeed** — Used for fast-turnaround operations: chat streaming, question generation, title generation, concept explanations
 
**Integration Architecture:**
- MiniMax exposes an **Anthropic-compatible API** at `api.minimax.io/anthropic`
- We connect via the **Vercel AI SDK's Anthropic provider** (`@ai-sdk/anthropic`), giving us `streamText()` and `generateText()` with full streaming support
- A separate **native fetch client** handles direct API calls for operations requiring precise response parsing (thinking blocks, structured JSON extraction)
 
### MiniMax Powers Every Agent
 
| Operation | Model | What MiniMax Does |
|-----------|-------|------------------|
| **Study Plan Gathering** | M2.5-highspeed | Natural conversation to understand learning goals. Generates structured lesson plan proposals with tiered concepts. |
| **Lesson Plan Structuring** | M2.5 | Converts approved text lesson plan into structured JSON: concepts with descriptions, key terms, difficulty tiers, prerequisite edges. |
| **Concept Graph Generation** | M2.5 | Produces a full prerequisite DAG from raw material. Identifies atomic concepts, infers dependency relationships, assigns difficulty. |
| **Question Generation** | M2.5 | Generates 5 diverse practice questions per concept: MCQ with misconception distractors, fill-in-the-blank, flashcard, free response. Grounded in Wikipedia sources. |
| **Free Response Evaluation** | M2.5 | Semantically evaluates open-ended answers. Determines correctness, identifies specific misconceptions, classifies error type (minor/misconception/prerequisite gap), generates elaborated feedback. |
| **Gap Analysis** | M2.5 | Analyzes patterns of wrong answers to identify missing prerequisites. Returns structured JSON with the missing concept name, description, and why it's needed. |
| **Extension Suggestion** | M2.5 | Given a mastered concept, proposes what to learn next. Returns a new concept with description and inferred prerequisite edges to existing graph nodes. |
| **Chat Tutoring** | M2.5-highspeed | Streaming Socratic tutoring with proficiency-aware context. Responds to questions, explains concepts, discusses mistakes — with citations from Wikipedia sources. |
| **Explanation Generation** | M2.5-highspeed | Targeted explanations for wrong answers in the Learn tab. Takes the specific question, wrong answer, and concept context. |
| **Advisor Recommendations** | M2.5 | Analyzes full learning state and recommends next actions. Returns structured recommendation cards with concept targets and reasoning. |
| **Edge Inference** | M2.5 | When a new concept is inserted (via gap detection, extension, or custom addition), infers which existing concepts should be prerequisites and which should be dependents. |
| **Title Generation** | M2.5-highspeed | Auto-generates concise study plan titles from conversation context. |
| **Profile Extraction** | M2.5 | Extracts structured learner profile data (prior knowledge, goals, learning style) from conversational input. |
 
> "MiniMax M2.5 handles everything from structuring knowledge to evaluating free-form answers to diagnosing learning gaps. The Anthropic-compatible API means we get the full power of a frontier model with a standard integration path. Streaming support is critical for the chat experience — token-by-token responses make the tutor feel alive."
 
### Structured Output + Validation
 
Every MiniMax call that produces structured data is validated with **Zod schemas**:
- Graph generation output is validated against a DAG schema (nodes with IDs, descriptions, difficulty; edges with source/target)
- Question generation output is validated against a question schema (type, text, answer, distractors, difficulty, sources)
- Gap analysis output is validated against an error classification schema
- Extension suggestions are validated against a concept insertion schema
 
> "We don't just trust the LLM output. Every structured response passes through Zod validation. If the JSON is malformed, we catch it, log it for debugging, and retry or fall back gracefully. This is production-grade LLM integration."
 
---
 
## PART 5: THE FULL TECH STACK (1 minute)
 
| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19 + TypeScript | Component-based UI with strict typing |
| **Framework** | Next.js 16 (App Router) | Full-stack framework with API routes, SSR, Turbopack |
| **State Management** | Zustand | Lightweight client-side store for graph, session, and chat state |
| **Graph Visualization** | @xyflow/react (React Flow) | Interactive node-edge graph rendering |
| **Graph Layout** | d3-force (backend) | Force-directed physics simulation for organic graph positioning |
| **LLM Integration** | MiniMax M2.5 via Vercel AI SDK | All intelligent operations — streaming, generation, evaluation |
| **LLM Client** | @ai-sdk/anthropic | Anthropic-compatible provider for MiniMax API |
| **Schema Validation** | Zod | Runtime validation of all LLM outputs and API inputs |
| **Database** | SQLite via Prisma ORM | Persistent storage for study plans, concepts, questions, attempts, sessions |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first CSS with pre-built accessible components |
| **Animation** | Framer Motion | Smooth transitions, card animations, graph node entry effects |
| **Icons** | Lucide React | Consistent SVG icon system |
| **RAG** | MediaWiki REST API | Wikipedia/Wikibooks retrieval for grounding |
| **Testing** | Vitest | Unit testing for core algorithms (SM-2, proficiency, selection) |
 
---
 
## PART 6: DEMO WALKTHROUGH SCRIPT (5 minutes)
 
### Scene 1: Starting a New Study Plan (1 min)
 
> "Let's say I want to learn machine learning. I open the app and start chatting."
 
1. Type: "I want to learn the fundamentals of machine learning"
2. The tutor asks clarifying questions: "What do you already know? How deep do you want to go?"
3. Respond: "I know basic statistics and Python. I want working-level knowledge."
4. The tutor proposes a tiered lesson plan with 10-12 concepts
5. Approve the plan
 
> "Notice how the tutor asked about my prior knowledge. That's not just friendly conversation — it's feeding the proficiency model. Concepts I said I know start with higher proficiency scores."
 
### Scene 2: The Knowledge Graph Comes Alive (1 min)
 
1. Switch to the Graph tab
2. Show the force-directed concept graph with nodes and animated edges
3. Point out: gray nodes (untested), the organic web layout, the particle-flow edges
 
> "This isn't a static diagram. It's a force-directed physics simulation. Nodes repel each other, edges act as springs, and the whole thing settles into an organic layout. Each node is a concept. Each edge is a prerequisite relationship. And those animated particles flowing along the edges — they'll intensify as your proficiency grows."
 
4. Click a node → show the detail panel with description, proficiency, and "Practice this concept" button
 
### Scene 3: Adaptive Practice in Action (1.5 min)
 
1. Start a practice session from the Learn tab
2. Answer an MCQ correctly → show the green feedback with explanation
3. Answer a fill-in-the-blank wrong → show the red feedback with misconception detection
 
> "Watch the feedback. It doesn't just say 'wrong.' It identifies the specific misconception — what I confused, and why. Those MCQ distractors? They're not random. Each wrong answer represents a specific misconception that MiniMax engineered into the question."
 
4. Answer a free-response question → show MiniMax evaluating the answer in real time
5. Show citations: click a `[1]` badge → Wikipedia source
 
> "Every question is grounded in Wikipedia sources. Click the citation — there's the real article. This isn't a chatbot making things up. It's evidence-based teaching."
 
### Scene 4: Gap Detection — The Graph Grows (1 min)
 
1. Trigger a gap detection (answer wrong about a concept that requires a missing prerequisite)
2. Show the proposal card: "It looks like you're missing the concept 'Chain Rule' — would you like to add it?"
3. Accept the proposal
4. Switch to Graph tab → show the new node animating into the graph with edges connecting it
 
> "This is the key differentiator. The system noticed I keep getting backpropagation questions wrong because I don't understand the chain rule. It detected the pattern, proposed a new prerequisite, and when I approved — the knowledge graph grew in real time. New node, new edges, new questions generated, and practice redirects to the prerequisite."
 
### Scene 5: Extension Suggestion — What's Next? (30 sec)
 
1. Master a concept (show green proficiency)
2. Show the extension suggestion: "Ready to explore Decision Trees?"
3. Accept → graph extends upward
 
> "The graph doesn't just grow downward to fill gaps. When you master something, it suggests what to learn next. The knowledge graph is alive — it grows in both directions based on your learning behavior."
 
### Scene 6: The Tutor Knows Everything (30 sec)
 
1. Switch to Chat tab
2. Ask: "What should I focus on next?"
3. Show the tutor's response referencing your weak concepts, recent mistakes, and graph structure
 
> "The tutor isn't a generic chatbot. Its system prompt includes your proficiency snapshot — which concepts you've mastered, where you're struggling, what misconceptions you've shown. It's a tutor that knows your entire learning state."
 
---
 
## PART 7: WHY THIS MATTERS (1 minute)
 
### Summary of Agentic AI Patterns Demonstrated
 
1. **Multi-Agent Composition** — 8 specialized agents with distinct roles, communicating through typed interfaces and a shared database
2. **Autonomous Knowledge Structuring** — The graph agent independently creates valid prerequisite DAGs from unstructured text
3. **Adaptive Behavior** — Real-time difficulty adjustment, proficiency-aware question selection, Zone of Proximal Development targeting
4. **Self-Healing Knowledge Graphs** — Gap detection identifies missing prerequisites; extension suggestion identifies growth opportunities; the graph mutates autonomously (with user approval)
5. **Context-Aware Reasoning** — Every agent operates with awareness of the learner's state: proficiency, history, misconceptions, graph structure
6. **RAG-Grounded Generation** — All content is grounded in Wikipedia sources, with citation provenance exposed to the user
7. **Structured Output Discipline** — Every LLM output is validated with Zod schemas; malformed responses are caught and handled
8. **Streaming-First UX** — Chat, explanations, and feedback stream token-by-token for responsive interaction
 
### The Vision
 
> "A world-class human tutor does five things: they diagnose what you know, structure what you need to learn, adapt to how you respond, explain your mistakes, and evolve the plan as you grow. Every one of those capabilities — diagnosis, structure, adaptation, explanation, evolution — is implemented as an AI agent in this system."
>
> "This is what agentic AI means for education: not a chatbot that answers questions, but a *system* that understands your knowledge state and actively works to change it."
>
> "One app. One LLM. A complete adaptive learning loop — from diagnosis to mastery."
 
---
 
## APPENDIX A: Feature List (Quick Reference)
 
### Core Features
- Conversational learning goal intake with clarifying questions
- Document upload and material extraction
- AI-generated concept prerequisite graph (DAG) with cycle detection
- Initial proficiency estimation from stated prior knowledge
- Tiered lesson plan proposal and approval
- Interactive force-directed graph visualization
- Proficiency color-coded nodes (gray/red/yellow/green)
- Node detail panel with metrics and "Practice" CTA
- Animated particle-flow edges
- Four question types: MCQ, fill-in-the-blank, flashcard, free response
- Misconception-engineered MCQ distractors
- Adaptive difficulty selection (Elo-like, targeting ~70% success)
- Pre-generated question bank (5+ per concept per type)
- Immediate elaborated feedback on every answer
- Free-response semantic evaluation by MiniMax
- SM-2 spaced repetition scheduling
- Per-concept proficiency tracking with atomic database updates
- Session summaries with accuracy and proficiency deltas
- Proficiency-aware Socratic chat tutor
- Streaming LLM responses
- Persistent message history
- Context-aware advisor with recommendation cards
- "Explain this" inline tutor for wrong answers
- Wikipedia/Wikibooks RAG pipeline with citation badges
 
### Adaptive Graph Features
- Gap detection: error classification (CORRECT/MINOR/MISCONCEPTION/PREREQUISITE_GAP)
- Gap pattern detection with 2-occurrence threshold
- Prerequisite concept insertion with user approval
- Practice redirect to prerequisite → return on mastery
- Extension suggestion for mastered concepts
- Custom concept addition with LLM edge inference
- Real-time graph layout recomputation on mutation
- Questions auto-generated for inserted concepts
 
### Technical Features
- Multi-agent architecture with 8 specialized agents
- MiniMax M2.5 integration via Anthropic-compatible API
- Vercel AI SDK with streaming support
- Zod schema validation on all LLM outputs
- Kahn's algorithm for DAG cycle detection
- d3-force backend layout engine
- Prisma ORM with SQLite persistence
- Zustand client state management
- React Flow interactive graph rendering
- Next.js 16 App Router with API routes
- Vitest unit testing
- Demo seed scripts for reliable presentations
 
---
 
## APPENDIX B: Agentic AI Pattern Catalog
 
| Pattern | How We Implement It |
|---------|-------------------|
| **Role Specialization** | Each of 8 agents has a single, focused responsibility. The Graph Agent only builds DAGs. The Question Agent only generates questions. No agent tries to do everything. |
| **Autonomous Decision-Making** | The gap detection agent independently decides when a prerequisite is missing — it doesn't wait to be asked. The extension agent independently identifies growth opportunities. |
| **Structured Communication** | Agents communicate through typed interfaces (Zod schemas) and a shared database (Prisma/SQLite). No unstructured message passing. |
| **Human-in-the-Loop** | Graph mutations (gap insertion, extension, custom concepts) always require user approval. The system proposes; the learner decides. |
| **Context Injection** | Every agent receives a compressed, relevant slice of the learning state. The chat tutor gets a ~200-token proficiency snapshot, not the entire database. |
| **Grounded Generation (RAG)** | Question generation and tutoring prompts include retrieved Wikipedia content. Citations are surfaced to the user. |
| **Validation Pipeline** | Every LLM output passes through Zod schema validation before being used. Malformed outputs are caught, logged, and handled gracefully. |
| **Streaming-First Design** | Chat, explanations, and evaluations stream token-by-token. The user never stares at a loading spinner waiting for a complete response. |
| **Event-Sourced State** | Every attempt is stored as an immutable event. Proficiency is derived from attempt history, not stored as a mutable float. This enables replay, debugging, and history visualization. |
| **Separation of Read/Write Paths** | The question bank is write-once (generated after graph creation) and read-many (queried during practice). Practice never triggers generation. |
 
---
 
## APPENDIX C: MiniMax Model Usage Map
 
```
MiniMax M2.5 (Strong)                    MiniMax M2.5-highspeed (Fast)
├── Graph generation                     ├── Chat tutoring (streaming)
├── Lesson plan structuring              ├── Concept explanations
├── Free-response evaluation             ├── Question generation
├── Gap analysis                         ├── Title generation
├── Extension suggestions                └── Profile extraction
├── Edge inference
└── Advisor recommendations
```
 
**Total MiniMax-powered operations: 13 distinct agent functions**
**API integration: Anthropic-compatible REST API via Vercel AI SDK**
**Streaming: Full SSE streaming for all chat and explanation operations**
