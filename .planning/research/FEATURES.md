# Feature Landscape: Adaptive Learning Tutor

**Domain:** Adaptive Intelligent Tutoring System for Independent Learners
**Researched:** 2026-02-24
**Research Confidence:** MEDIUM-HIGH (verified against multiple academic and platform sources)

---

## How to Read This Document

Each feature is tagged with a status:

- **TABLE STAKES** — Users expect this. Missing means the product feels broken or incomplete.
- **DIFFERENTIATOR** — Not universally expected, but creates meaningful advantage when done well.
- **ANTI-FEATURE** — Actively harms learning outcomes, creates friction, or introduces scope risk. Avoid or deprioritize.

P0/P1/P2 assignment is a recommendation based on research findings, cross-referenced against the planned P0 feature list in PROJECT.md.

---

## Category 1: Study Plan and Curriculum Setup

These features concern how the system understands what the user wants to learn and organizes it into a learnable structure.

### 1.1 — Learning Goal Intake via Conversational Chat

**Description:** System accepts a natural language description of what the user wants to learn. Clarifying questions refine scope, prior knowledge, and depth.

**Status: TABLE STAKES**

**Rationale:** Modern platforms (Khanmigo, Study Fetch, Mindgrasp) have normalized conversational entry points. A blank form asking for structured input creates friction. Conversational intake allows the system to disambiguate "I want to learn machine learning" from "I want to understand backpropagation for a PhD qualifying exam."

**Notes:**
- The key differentiator is asking about prior knowledge explicitly — this feeds initial proficiency estimates.
- Two to four clarifying questions is the sweet spot; more than five creates abandonment.
- **P0 status in project: correct.**

---

### 1.2 — Document Upload for Material Extraction

**Description:** User uploads existing study material (notes, textbooks, PDFs, slides) and the system derives the learning scope from it.

**Status: TABLE STAKES**

**Rationale:** AI-powered study tools (Study Fetch, Mindgrasp, NoteGPT) have made this an expected capability in 2024-2025. Users who already have material do not want to describe concepts manually. Uploading a document is a lower-effort, higher-trust onboarding path.

**Notes:**
- P0 constrains this to plain text only (no PDF parsing). This is acceptable for a hackathon demo but expect user friction if format coverage is limited.
- PDF parsing is the most commonly uploaded format in practice. Plan for P1.
- **P0 status in project: correct, with P1 PDF parsing already noted.**

---

### 1.3 — Concept Prerequisite Graph (DAG) Generation

**Description:** System analyzes uploaded material and generates a directed acyclic graph (DAG) where nodes are concepts and edges represent prerequisite relationships.

**Status: TABLE STAKES** (for this class of system) / **DIFFERENTIATOR** (for consumer edtech broadly)

**Rationale:** ALEKS built its entire platform on Knowledge Space Theory — mapping what the learner knows and what they are "ready to learn." Research from 2024 confirms that students who study concepts in prerequisite order have measurably better success rates. A flat list of topics is not sufficient for complex subject matter; prerequisite structure enables meaningful path planning.

**Notes:**
- Cycle detection is non-negotiable. A DAG with cycles is invalid and causes undefined behavior in traversal. The P0 requirement to handle cycle violations is well-placed.
- LLM-generated prerequisite graphs are imperfect. Expect some incorrect edges. A human review or correction pass is important (deferred to P1 in this project, which is a reasonable compromise).
- **P0 status in project: correct and well-specified.**

---

### 1.4 — Initial Proficiency Estimation from Stated Prior Knowledge

**Description:** Based on what the user says they already know, the system sets starting proficiency estimates on concept nodes rather than treating all nodes as unknown.

**Status: TABLE STAKES** (for intelligent tutoring) / **DIFFERENTIATOR** (for simple quiz apps)

**Rationale:** ALEKS performs an intake knowledge check precisely because starting from zero wastes the learner's time. Bayesian Knowledge Tracing in Carnegie Learning's MATHia similarly initializes prior probabilities based on available evidence. Forcing a learner who already knows calculus to practice arithmetic is a critical usability failure.

**Notes:**
- Conversational intake (Feature 1.1) is the mechanism for gathering this data in P0. This is simpler than a formal diagnostic assessment and sufficient for a demo.
- The stated threshold of >0.8 for mastery in the project is a reasonable starting point; literature suggests 80-90% correct as a mastery criterion.
- **P0 status in project: correct.**

---

### 1.5 — Tentative Lesson Plan Display After Graph Creation

**Description:** After the concept graph is generated, the system presents a readable study plan summary showing the concept list and estimated learning path.

**Status: TABLE STAKES**

**Rationale:** Users need to validate that the system understood their learning goal correctly before committing time to practice. This is the "confirm your order" step. Without it, users who receive bad graph generation have no recourse until deep into the session.

**Notes:**
- Display should be readable prose or an ordered list, not just a raw graph. The graph visualization serves a different purpose.
- This is also a trust-building moment. If the extracted concepts look right, the user commits to the session.
- **P0 status in project: correct.**

---

### 1.6 — Diagnostic Pre-Assessment (Formal Placement Test)

**Description:** A structured set of questions administered before the learning session to assess current knowledge across all topics in the plan.

**Status: DIFFERENTIATOR** (in context of this project)

**Rationale:** ALEKS uses this as a core mechanism. Khan Academy's mastery system progressively assesses without a formal pre-test. For a single-session hackathon demo, a full diagnostic pre-assessment adds significant complexity and time overhead with marginal benefit over conversational prior knowledge gathering.

**Notes:**
- The stated prior knowledge approach in P0 is a reasonable substitute for this demo context.
- A formal diagnostic is a high-value P1 feature that would significantly improve proficiency estimation accuracy.
- **Recommended: P1.**

---

## Category 2: Adaptive Practice Sessions

These features concern how the system delivers practice, adapts to the learner, and processes responses.

### 2.1 — Multiple Question Types

**Description:** System supports more than one format for practice questions: flashcard (cued recall), fill-in-the-blank, multiple-choice (MCQ), and free response (open-ended evaluation).

**Status: TABLE STAKES**

**Rationale:** Research consistently shows that variety in practice format improves retention compared to single-format drill. Different question types also probe different levels of understanding:
- Flashcard/cued recall: tests recognition and basic retrieval
- Fill-in-the-blank: tests precise vocabulary and contextual usage
- MCQ with misconception distractors: diagnoses specific wrong mental models
- Free response: tests ability to explain and apply

Duolingo uses fill-in-the-blank, translation, listening, and speaking precisely because format variety drives broader proficiency. Platforms that only use MCQ produce learners who can recognize but not produce.

**Notes:**
- The four planned types (flashcard, fill-blank, MCQ, free response) is the right coverage for P0.
- MCQ distractors should be engineered as misconception probes (see Feature 2.5), not just random wrong answers. This is what separates diagnostic MCQ from simple quiz MCQ.
- **P0 status in project: correct and well-specified.**

---

### 2.2 — Procedural, Streaming Question Generation

**Description:** Questions are generated on-demand or pre-generated into a queue and streamed to the user during the session rather than fetched from a static bank.

**Status: DIFFERENTIATOR**

**Rationale:** Static question banks (Quizlet) degrade with repetition — learners memorize the question-answer pairing rather than the underlying concept. Procedural generation using LLMs allows surface-level variation while testing the same underlying knowledge component. This is a meaningful differentiator for an LLM-native system.

**Notes:**
- The P0 design pre-generates a question bank after graph creation. This is a pragmatic compromise — avoids latency during sessions, at the cost of some variety. Acceptable for demo.
- True streaming generation during session is architecturally complex. The pre-generation approach is the right P0 call.
- **P0 status in project: correct.**

---

### 2.3 — Adaptive Difficulty Selection

**Description:** The system selects next questions based on the learner's current proficiency state — easier questions for struggling learners, harder questions as proficiency increases.

**Status: TABLE STAKES**

**Rationale:** This is the defining behavior of "adaptive" learning. Without it, the system is just a quiz app. ALEKS, Khan Academy, Duolingo, and all serious adaptive systems implement this. Research confirms adaptive systems produce 15-35% performance gains vs. non-adaptive delivery.

**Notes:**
- The project specifies question difficulty and type selected based on concept proficiency. This is the right model.
- The mechanism should target the Zone of Proximal Development — questions that are neither too easy (boring) nor too hard (frustrating). A common heuristic is targeting 70-85% expected success rate.
- **P0 status in project: correct.**

---

### 2.4 — Concept-Targeted Practice Sessions

**Description:** User can initiate a practice session focused on a specific concept node from the graph, rather than following the full adaptive sequence.

**Status: TABLE STAKES**

**Rationale:** Learners know when they're struggling with something specific. Being forced to follow only a system-determined sequence frustrates motivated learners. Khan Academy and ALEKS both allow targeted drill. The "Practice this concept" CTA from the graph node detail panel is the right mechanism.

**Notes:**
- This is specified in the Graph Tab requirements ("Practice this concept" CTA). Correct.
- **P0 status in project: correct.**

---

### 2.5 — Misconception Detection via MCQ Distractors

**Description:** MCQ wrong answers are designed to represent specific misconceptions common to the concept, and when a learner selects one, the system identifies the misconception rather than just logging "incorrect."

**Status: DIFFERENTIATOR**

**Rationale:** Standard adaptive systems track correct/incorrect. Research on Intelligent Tutoring Systems (ITS) establishes that tracking which wrong answer was selected enables targeted intervention — the system can explain precisely why the misconception is wrong. This is how ALEKS and Cognitive Tutor-based systems improve on dumb drill. A 2024 ITS review describes this as comparing learner responses to the domain model to identify misconceptions.

**Notes:**
- The project specifies "MCQ with misconception distractors" and "misconception detection" in free response. Both are correctly specified.
- The difficulty is generating good misconception distractors with an LLM. Prompt engineering and post-hoc validation are required.
- Misconceptions detected should be logged to the attempt record and surfaced in the session summary and chat context.
- **P0 status in project: correct and well-specified.**

---

### 2.6 — Free Response Evaluation by LLM

**Description:** Learner's written responses to open-ended questions are evaluated by the LLM, which checks for correctness, completeness, and misconceptions.

**Status: DIFFERENTIATOR**

**Rationale:** Free response requires semantic understanding that rule-based systems cannot provide. LLM-based evaluation is now the standard approach for this. Research from 2024 shows GPT-class models achieve near-human agreement on rubric-based evaluation. This is the capability that most clearly differentiates this system from static quiz platforms.

**Notes:**
- Evaluation quality depends heavily on rubric structure. The system should pass a rubric (expected answer elements, common misconceptions to check for) to the LLM, not just ask "is this right?"
- Literature confirms that elaborated feedback (explaining why something is wrong) yields larger learning gains than simple correctness feedback. The LLM must produce an explanation, not just a score.
- **P0 status in project: correct.**

---

### 2.7 — Immediate Feedback on Every Response

**Description:** Immediately after submitting any answer, the learner receives feedback: correct/incorrect, explanation of the right answer, and (where applicable) identification of the misconception.

**Status: TABLE STAKES**

**Rationale:** Research consensus is unambiguous: immediate feedback is substantially more effective than delayed feedback. Meta-analyses find that ITS systems' advantage over traditional instruction is largely attributable to immediate, personalized feedback. Delaying feedback (e.g., showing results only at end of session) significantly reduces learning gains.

**Notes:**
- Feedback should be elaborated, not just "Correct" or "Wrong." The explanation is where learning happens.
- For free response, LLM latency may delay this. Streaming the feedback response is the correct UX approach (matches the planned streaming architecture).
- **P0 status in project: correct (immediate feedback specified).**

---

### 2.8 — Hint System (Scaffolded Assistance)

**Description:** Before revealing the answer, the system offers increasingly specific hints that guide the learner toward the correct response.

**Status: DIFFERENTIATOR**

**Rationale:** Scaffolding is one of the most robustly validated pedagogical strategies. Cognitive Tutor systems (MATHia) are famous for their hint sequences. Khanmigo implements a tiered Socratic approach: ask the student to try first, then provide progressively larger hints, then explain fully. This is more effective than immediate reveal because it encourages productive struggle.

**Notes:**
- Not specified in P0. Correct to defer — adds complexity to question structure and interaction flow.
- A simple two-level hint (conceptual hint, then specific hint) is the minimal implementation for P1.
- **Recommended: P1.**

---

### 2.9 — Spaced Repetition Scheduling

**Description:** The system schedules concept review at intervals designed to maximize long-term retention (e.g., Leitner boxes, SM-2 algorithm, or adaptive variants).

**Status: TABLE STAKES** (for Anki/flashcard-focused products) / **DIFFERENTIATOR** (for concept-graph adaptive systems)

**Rationale:** Spaced repetition is one of the best-validated interventions in learning science. However, it is primarily beneficial for long-term retention across multiple study sessions, not within a single session. For a single-session hackathon demo, spaced repetition does not materially affect the learning experience. For long-term use, it is important.

**Notes:**
- Correctly deferred to P1 in the project. This is the right call for P0.
- Note that the concept graph's proficiency decay mechanism (exponential forgetting referenced in related research) is a lightweight substitute that provides directional benefit without full spaced repetition complexity.
- **Recommended: P1 (already planned).**

---

## Category 3: Proficiency Tracking and Modeling

These features concern how the system models what the learner knows and updates that model over time.

### 3.1 — Per-Concept Proficiency State

**Description:** Each concept node maintains a proficiency score or state (e.g., gray=untested, red=weak, yellow=developing, green=mastered) that updates based on practice results.

**Status: TABLE STAKES**

**Rationale:** This is the student model component of every ITS architecture. Without it, the system cannot adapt. The four-state model specified in the project (untested/weak/developing/mastered) maps well to the cognitive states researchers discuss. Bayesian Knowledge Tracing (BKT) uses a binary learned/unlearned model; the four-state model is richer and better communicates state to the learner.

**Notes:**
- The color-coding approach (gray/red/yellow/green) is immediately intuitive. This is good UI design.
- Proficiency threshold >0.8 for mastery is within the 80-90% range recommended by mastery learning research.
- **P0 status in project: correct.**

---

### 3.2 — Real-Time Proficiency Updates from Attempt Results

**Description:** After each question attempt, the learner's proficiency score for the relevant concept updates immediately and persists to the database.

**Status: TABLE STAKES**

**Rationale:** Adaptive behavior requires current knowledge state. Batching proficiency updates until end of session would mean the session adapts to stale data. ALEKS and Khan Academy both update learner state continuously.

**Notes:**
- The P0 architecture (attempt results persist and update concept proficiency) correctly specifies this.
- The graph visualization should reflect updates, though full real-time sync during an active session may be deferred for simplicity.
- **P0 status in project: correct.**

---

### 3.3 — Prerequisite-Propagated Proficiency Inference

**Description:** When a learner demonstrates mastery of an advanced concept, the system can infer something about prerequisite concepts; when a learner fails a basic concept, the system flags advanced concepts as at-risk.

**Status: DIFFERENTIATOR**

**Rationale:** This is what separates a knowledge-graph-based system from a flat quiz system. ALEKS's Knowledge Space Theory is built on this: mastery of item A provides evidence about item B if B subsumes A. Graph-based propagation is mentioned in 2024 research as a core capability of knowledge-graph adaptive systems.

**Notes:**
- Not explicitly specified in P0. The current model appears to update only the directly-practiced concept.
- A simple version: if concept C has prerequisite A and B, and learner masters C, increase A and B proficiency slightly. And vice versa for failures.
- **Recommended: P1 (would significantly improve adaptation quality).**

---

### 3.4 — Attempt History and Answer Record

**Description:** Every question attempt (question ID, user answer, correct answer, correctness, feedback, misconceptions detected) is recorded to persistent storage.

**Status: TABLE STAKES**

**Rationale:** Attempt history is the raw data that powers everything else: proficiency updates, session summaries, chat tutor context, and future spaced repetition. Without it, the system has amnesia after each session.

**Notes:**
- Correctly specified in P0 (attempt records tracked with all relevant fields).
- This data should be surfaced in the chat tutor's context window, specifically recent mistakes and identified misconceptions.
- **P0 status in project: correct.**

---

## Category 4: Concept Graph Visualization

These features concern the interactive graph display that shows the concept landscape and proficiency state.

### 4.1 — Interactive DAG Visualization with Proficiency Color-Coding

**Description:** A visual graph where nodes represent concepts, edges represent prerequisites, and node colors reflect current proficiency state.

**Status: DIFFERENTIATOR** (in consumer edtech) / **TABLE STAKES** (for this specific project's value proposition)

**Rationale:** Most adaptive learning platforms (Duolingo, Khan Academy, Quizlet) do not expose the underlying concept graph to the user. Showing it is a deliberate design choice that makes the learning structure transparent. Research on self-regulated learning shows that learners who understand their knowledge state make better study decisions. The graph is the central novel UI element of this project.

**Notes:**
- React Flow + dagre (specified in constraints) is well-suited for this. Dagre handles automatic DAG layout.
- Node color mapping (gray/red/yellow/green) must be visually distinct and accessible. Check contrast ratios.
- **P0 status in project: correct and central to the value proposition.**

---

### 4.2 — Node Detail Panel with Metadata and Proficiency Metrics

**Description:** Clicking a concept node opens a detail panel showing the concept description, current proficiency score, attempt history summary, and a CTA to practice this concept.

**Status: TABLE STAKES** (given that the graph is the primary navigation surface)

**Rationale:** The graph is not useful as a pure visualization — learners need to act on it. The detail panel is the bridge from "I see I'm weak on X" to "I'll practice X now." Without actionable detail, the graph is decoration.

**Notes:**
- "Practice this concept" CTA is the critical action. Everything else in the panel is informational.
- Proficiency metrics should be human-readable (e.g., "You answered 3 of 5 questions correctly" not "proficiency: 0.6").
- **P0 status in project: correct.**

---

### 4.3 — Graph Editing UI (Add/Remove/Reorder Nodes)

**Description:** UI controls allowing the learner to manually edit the concept graph: add concepts, delete concepts, change prerequisite edges.

**Status: ANTI-FEATURE** (for P0) / potential P2+ feature

**Rationale:** Graph editing is high complexity with low ROI for the core learning experience. Users who want to correct graph errors can do so through the chat interface. Exposing graph editing UI creates usability risk (learners inadvertently breaking their graph structure), implementation complexity, and scope risk in a hackathon timeline. Competing platforms (Khan Academy, ALEKS) do not expose graph editing to learners at all.

**Notes:**
- Correctly identified as out of scope in PROJECT.md ("Graph refinement UI").
- The chat interface as the correction mechanism is a reasonable substitute.
- If implemented post-MVP, must include cycle detection on every edit operation.
- **P0 status in project: correct to exclude.**

---

## Category 5: Chat-Based Tutoring

These features concern the conversational tutor interface.

### 5.1 — Socratic Conversational Tutor

**Description:** A chat interface where the AI tutor guides the learner through questions and explanations using Socratic questioning — asking the learner to reason rather than providing answers directly.

**Status: DIFFERENTIATOR**

**Rationale:** Khanmigo's explicit design philosophy is Socratic: never give the answer, guide toward it. Research from 2025 shows human-AI co-tutoring with Socratic method raised critical thinking scores 23% over AI-only direct-answer sessions. The key insight: an AI that answers questions directly teaches learned helplessness. An AI that asks "what do you think?" and "why?" develops reasoning.

**Notes:**
- The Socratic approach is harder to implement well than it appears. The system prompt must be carefully engineered to resist learner pressure for direct answers.
- A tiered approach is recommended: ask student to try first, provide conceptual hints on failure, provide full explanation only after two failures. This matches how skilled human tutors behave.
- **P0 status in project: correct (chat serves as tutor and learning coordinator).**

---

### 5.2 — Proficiency-Aware Chat Context

**Description:** The chat system prompt includes a compressed summary of the learner's current state: active plan, weak concepts, recent mistakes, recent misconceptions detected, progress.

**Status: TABLE STAKES** (for the chat to function as an intelligent tutor, not just a generic chatbot)

**Rationale:** Without context about the learner's state, the chat tutor cannot provide personalized guidance. A generic LLM would answer "What is backpropagation?" the same way for a beginner and an expert. Injecting proficiency context makes the tutor's responses genuinely adaptive.

**Notes:**
- Context must be compressed — full attempt history at scale would overflow context windows. A summary of the 3-5 weakest concepts, 3-5 recent mistakes, and current proficiency distribution is sufficient.
- The P0 constraint (chat reads static snapshots; live sync deferred) is acceptable. Proficiency state changes slowly enough that a session-start snapshot is useful.
- **P0 status in project: correct.**

---

### 5.3 — Persistent Chat Message History

**Description:** Conversation messages persist across sessions so the learner can review prior explanations and the tutor has context about past interactions.

**Status: TABLE STAKES**

**Rationale:** A tutor that forgets every conversation would be maddening. Persistence is table stakes for any chat application.

**Notes:**
- SQLite via Prisma (specified in constraints) is appropriate for this.
- For context window management, only recent messages (last N) plus a compressed summary of older messages should be injected.
- **P0 status in project: correct.**

---

### 5.4 — Streaming Responses

**Description:** LLM-generated chat responses stream token-by-token rather than waiting for full completion before display.

**Status: TABLE STAKES**

**Rationale:** Non-streaming responses create perceived latency that breaks conversational flow. Duolingo reduced exercise delivery latency from 750ms to 14ms specifically because perceived speed is critical to engagement. For LLM responses that may take 2-10 seconds to complete, streaming is the difference between "feels responsive" and "feels broken."

**Notes:**
- Already planned with MiniMax streaming API.
- **P0 status in project: correct.**

---

### 5.5 — Concept Explanation on Demand

**Description:** Learner can ask the tutor to explain any concept from their study plan, and the tutor provides an explanation calibrated to their current proficiency level.

**Status: TABLE STAKES**

**Rationale:** Learners who don't understand a concept from practice need an explanation path. Without this, a wrong answer with feedback that isn't clear leaves the learner stuck. The chat interface is the natural mechanism for this.

**Notes:**
- The proficiency-aware context (Feature 5.2) enables calibrated explanations.
- **P0 status in project: correct (implicitly covered by chat tutor functionality).**

---

## Category 6: Session Summaries and Progress Reporting

These features concern end-of-session reporting and progress visibility.

### 6.1 — End-of-Session Summary

**Description:** After a practice session, the system displays a summary: concepts covered, questions answered, accuracy per concept, proficiency deltas (before vs. after), and misconceptions identified.

**Status: TABLE STAKES**

**Rationale:** Session summaries serve two functions: they close the feedback loop for the learner and they motivate continued engagement by making progress visible. Khan Academy's mastery system, ALEKS's pie chart, and Duolingo's XP summary are all forms of this. Research on self-regulated learning confirms that progress visibility directly improves intrinsic motivation and metacognition.

**Notes:**
- The summary should emphasize progress, not just performance. "You moved 2 concepts from Weak to Developing" is more motivating than "60% accuracy."
- Misconceptions detected should be surfaced explicitly with brief explanations so the learner knows what to focus on.
- **P0 status in project: correct.**

---

### 6.2 — Prompt to Review Updated Graph Post-Session

**Description:** After a session ends, the system suggests the learner review the concept graph to see how their proficiency has updated.

**Status: DIFFERENTIATOR**

**Rationale:** This closes the loop between the practice experience and the visual knowledge map. It reinforces the mental model that "I am building a map of what I know" rather than "I am answering questions." This metacognitive awareness improves self-regulated learning.

**Notes:**
- A simple notification or CTA is sufficient. Does not require complex implementation.
- **P0 status in project: correct.**

---

### 6.3 — Long-Term Progress Dashboard

**Description:** A view showing progress over multiple sessions: total concepts mastered, proficiency trends over time, time spent, sessions completed.

**Status: DIFFERENTIATOR** (valuable) / deferred

**Rationale:** This is valuable for long-term motivation but requires multiple sessions of data to be meaningful. For a hackathon demo, the session summary is sufficient.

**Notes:**
- **Recommended: P2.** The graph visualization already serves as a persistent progress artifact.

---

### 6.4 — Streak Tracking and Daily Goals

**Description:** Streak counters, daily XP targets, and achievement badges to encourage consistent study habits.

**Status: ANTI-FEATURE** (for this project's target user and design philosophy)

**Rationale:** Duolingo's streak system is famous and effective for language learning engagement. However, research consistently shows that extrinsic motivation mechanisms (streaks, badges, leaderboards) can crowd out intrinsic motivation for learners who are already self-directed. Independent learners (the target user) are by definition intrinsically motivated — adding streak anxiety is more likely to create negative affect than to improve retention. Research also documents that gamification effects are often short-term ("novelty effect") and can be harmful in longer studies.

Additionally, for a single-user local demo, streaks and daily goals have no social component — a critical source of their effectiveness in Duolingo's multi-user context.

**Notes:**
- This is not the same as progress visualization (which is genuinely useful). The distinction is whether the mechanism creates external pressure (anti-feature) vs. reflects internal progress (valuable).
- **Recommended: Explicitly exclude from P0 and P1.**

---

## Category 7: Content and Persistence

These features concern how content and learning state persist across sessions.

### 7.1 — Study Plan Persistence

**Description:** Study plans (title, description, source material reference, status) persist in the database across sessions so the learner can return to the same plan.

**Status: TABLE STAKES**

**Rationale:** Without persistence, every session starts from zero. This is a fundamental requirement for any system that aims to support learning over more than one sitting.

**Notes:**
- Correctly specified in P0.
- **P0 status in project: correct.**

---

### 7.2 — Multiple Concurrent Study Plans

**Description:** A learner can have multiple active study plans (e.g., one for calculus, one for music theory) and switch between them.

**Status: DIFFERENTIATOR**

**Rationale:** Power users of study tools often have multiple subjects in flight. However, for a single-user hackathon demo, even one working study plan proves the concept. Multiple plans adds UI complexity (plan selection, context switching) without demonstrating new capabilities.

**Notes:**
- The data model should support multiple plans (no hard constraint preventing it), but the UI can show only the active/most recent plan in P0.
- **Recommended: P1.**

---

### 7.3 — Question Bank Pre-Generation

**Description:** After graph creation, the system generates a bank of questions per concept and stores them, so the practice session has questions ready without per-question LLM latency.

**Status: TABLE STAKES** (given the latency requirements of a responsive practice session)

**Rationale:** Real-time question generation per answer introduces 1-5 second delays that break session flow. Pre-generation trades generation cost at setup time for smooth delivery during the session. This is the correct trade-off.

**Notes:**
- The bank depth matters: too shallow and questions repeat quickly (reducing variety); too deep and generation takes too long at setup. 5-10 questions per concept per type is a reasonable starting point.
- **P0 status in project: correct.**

---

## Category 8: Anti-Features Catalog

Features that are common in edtech products but should be explicitly excluded from this project.

### 8.1 — Answer-Giving AI (Non-Socratic Mode)

**Description:** An AI that directly answers "What is the formula for X?" or "Explain Y to me" without guiding the learner to discover the answer.

**Status: ANTI-FEATURE**

**Why:** Direct-answer AI tutors enable passive consumption that mimics learning without producing it. Khanmigo's core design principle is refusing to give direct answers. Research on generative AI tutoring confirms that when students are given free access to answer-providing AI, they stop engaging in the retrieval practice that drives retention. The chat tutor must be Socratic by default.

**What instead:** Socratic questioning (Feature 5.1), tiered hints (Feature 2.8), and explanation only after demonstrated effort.

---

### 8.2 — Engagement Streak Mechanics (Discussed Above)

**Description:** Streaks, daily XP quotas, hearts/lives that impose penalties for wrong answers.

**Status: ANTI-FEATURE** (for independent learners specifically)

**Why:** See Feature 6.4. Extrinsic motivation mechanisms can crowd out intrinsic motivation. For learners who are self-directed, streak anxiety is a negative experience that drives abandonment. Duolingo's research applies to a different population (language learners who need external accountability). The hearts/lives mechanic is particularly harmful — it punishes the productive struggle that is necessary for learning.

**What instead:** Progress visibility (session summary, graph color updates) that reflects internal achievement without external pressure.

---

### 8.3 — Social/Competitive Features (Leaderboards, Sharing)

**Description:** Comparison to other users, public leaderboards, sharing achievements.

**Status: ANTI-FEATURE** (for P0 scope) / possibly P2

**Why:** The project is single-user. Social features require multi-user infrastructure that is explicitly out of scope. Even in a multi-user future, leaderboards have documented negative effects on lower-performing learners and can shift motivation from mastery to performance.

**What instead:** None needed for P0. Self-referenced progress (am I better than I was?) is the appropriate metric.

---

### 8.4 — Web Scraping for External Resources

**Description:** Automatically finding external articles, videos, and resources related to the study topic.

**Status: ANTI-FEATURE** (for P0 scope)

**Why:** Correctly deferred in the project. Web scraping introduces reliability, quality control, and content safety issues that are out of scope for a demo. Unfiltered external content also risks undermining the curated learning path.

**What instead:** User-uploaded material (Feature 1.2). External resource discovery is a P2 feature.

---

### 8.5 — Infinite Practice Without Mastery-Gating

**Description:** Allowing a learner to practice advanced concepts before demonstrating readiness in prerequisites.

**Status: ANTI-FEATURE**

**Why:** Concept prerequisite graphs exist to prevent this. Allowing learners to jump to advanced material before mastering prerequisites produces surface familiarity without deep understanding — a known failure mode of unstructured self-study. ALEKS specifically blocks access to concepts the learner is "not ready for" based on Knowledge Space Theory.

**What instead:** The adaptive sequencing (Feature 2.3) should respect prerequisite ordering. The system prompt for the tutor should guide learners toward prerequisite concepts when they attempt to jump ahead.

---

### 8.6 — Over-Granular Progress Analytics

**Description:** Dashboards with detailed per-question statistics, time-spent histograms, accuracy breakdown by question type, etc.

**Status: ANTI-FEATURE** (for P0) / potentially P2

**Why:** Complex analytics dashboards optimize for the appearance of insight rather than the experience of learning. For a hackathon demo, they consume significant implementation time and can distract from the core adaptive loop. Research on learning dashboards shows that too much data can induce anxiety rather than motivation in learners.

**What instead:** Session summary (Feature 6.1) with simple, human-readable progress information. Graph color states (Feature 4.1) serve as the persistent progress artifact.

---

## P0 / P1 / P2 Validation Summary

| Feature | Category | Status | P0 Assignment | Research Verdict |
|---------|----------|--------|---------------|-----------------|
| Learning goal intake via chat | Curriculum | Table Stakes | P0 | Correct |
| Document upload | Curriculum | Table Stakes | P0 | Correct; P1 for PDF |
| Concept DAG generation | Curriculum | Table Stakes | P0 | Correct |
| Initial proficiency from stated knowledge | Curriculum | Table Stakes | P0 | Correct |
| Tentative lesson plan display | Curriculum | Table Stakes | P0 | Correct |
| Diagnostic pre-assessment | Curriculum | Differentiator | P1 | Correct to defer |
| Multiple question types (4 types) | Practice | Table Stakes | P0 | Correct |
| Procedural question generation | Practice | Differentiator | P0 (pre-gen) | Correct compromise |
| Adaptive difficulty selection | Practice | Table Stakes | P0 | Correct |
| Concept-targeted practice | Practice | Table Stakes | P0 | Correct |
| MCQ misconception distractors | Practice | Differentiator | P0 | Correct; high value |
| Free response LLM evaluation | Practice | Differentiator | P0 | Correct; high value |
| Immediate feedback | Practice | Table Stakes | P0 | Correct |
| Hint system | Practice | Differentiator | P1 | Correct to defer |
| Spaced repetition scheduling | Practice | Differentiator | P1 | Correct to defer |
| Per-concept proficiency state | Proficiency | Table Stakes | P0 | Correct |
| Real-time proficiency updates | Proficiency | Table Stakes | P0 | Correct |
| Prerequisite-propagated proficiency | Proficiency | Differentiator | P1 | Upgrade recommended |
| Attempt history record | Proficiency | Table Stakes | P0 | Correct |
| Interactive DAG visualization | Graph | Differentiator | P0 | Central to value prop |
| Node detail panel with CTA | Graph | Table Stakes | P0 | Correct |
| Graph editing UI | Graph | Anti-Feature | Excluded | Correct to exclude |
| Socratic chat tutor | Chat | Differentiator | P0 | Correct; high value |
| Proficiency-aware chat context | Chat | Table Stakes | P0 | Correct |
| Persistent message history | Chat | Table Stakes | P0 | Correct |
| Streaming responses | Chat | Table Stakes | P0 | Correct |
| Concept explanation on demand | Chat | Table Stakes | P0 | Correct (implicit) |
| End-of-session summary | Progress | Table Stakes | P0 | Correct |
| Prompt to review graph | Progress | Differentiator | P0 | Correct |
| Long-term progress dashboard | Progress | Differentiator | P2 | Correct to defer |
| Streak/gamification mechanics | Progress | Anti-Feature | Excluded | Correct to exclude |
| Social/competitive features | Progress | Anti-Feature | Excluded | Correct to exclude |
| Study plan persistence | Persistence | Table Stakes | P0 | Correct |
| Multiple concurrent plans | Persistence | Differentiator | P1 | Correct to defer |
| Question bank pre-generation | Persistence | Table Stakes | P0 | Correct |
| Web scraping for resources | Content | Anti-Feature | Excluded | Correct to exclude |

---

## Key Research Findings Summary

**Most important differentiators correctly in P0:**
1. MCQ with misconception distractors (diagnostic depth beyond simple right/wrong)
2. Free response LLM evaluation (semantic understanding of learner's reasoning)
3. Socratic chat tutor (guides reasoning rather than providing answers)
4. Concept graph with proficiency color-coding (makes knowledge structure transparent)

**Most important P1 recommendation:**
- Prerequisite-propagated proficiency inference: When mastery of concept C implies something about prerequisites A and B, and vice versa. This is what makes the knowledge graph actively useful for adaptation, not just visualization.

**Most validated design decisions:**
- Immediate feedback: Strongest evidence base in ITS research; correctly specified.
- Adaptive difficulty targeting Zone of Proximal Development: Core to all serious adaptive systems.
- Proficiency-aware context injected into chat: What separates intelligent tutor from generic chatbot.

**Most important exclusion to maintain:**
- Streak mechanics and gamification: Independent learners are intrinsically motivated. External pressure mechanics can actively harm learning outcomes for this population.

---

## Sources

- [Adaptive Learning Platforms: Coursera Overview](https://www.coursera.org/articles/adaptive-learning-platforms)
- [A Comprehensive Review of AI-based Intelligent Tutoring Systems (arXiv 2025)](https://arxiv.org/html/2507.18882v1)
- [Adaptive Learning Technology Explained: FlowSparks](https://www.flowsparks.com/resources/adaptive-learning-technology)
- [ALEKS: About and Knowledge Space Theory](https://www.aleks.com/about_aleks/knowledge_space_theory)
- [Mastery Learning Heuristics and BKT Models (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC7334722/)
- [AI-based Intelligent Tutoring Systems Systematic Review (PMC 2025)](https://pmc.ncbi.nlm.nih.gov/articles/PMC12078640/)
- [Enhancing LLM-Based Feedback: Insights from ITS and Learning Sciences (arXiv)](https://arxiv.org/html/2405.04645v2)
- [Khanmigo: Khan Academy's AI Tutor](https://www.khanmigo.ai/)
- [Khanmigo Deep Dive: Skywork Analysis](https://skywork.ai/skypage/en/Khanmigo-Deep-Dive:-How-Khan-Academy's-AI-is-Shaping-the-Future-of-Education/1972857707881885696)
- [Socratic Wisdom in the Age of AI: Frontiers in Education (2025)](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1528603/full)
- [Duolingo's AI Learning Algorithm: IEEE Spectrum](https://spectrum.ieee.org/duolingo)
- [Dark Patterns of Cuteness in Learning Apps (Springer)](https://link.springer.com/chapter/10.1007/978-3-031-46053-1_5)
- [Adaptive Gamification in Education: Literature Review](https://www.researchgate.net/publication/335698708_Adaptive_Gamification_in_Education_A_Literature_Review_of_Current_Trends_and_Developments)
- [Educational Knowledge Graphs with Prerequisite Relations (JEDM)](https://jedm.educationaldatamining.org/index.php/JEDM/article/view/737)
- [Systematic Literature Review of Knowledge Graphs in Education (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC10847940/)
- [Intelligent Tutoring Systems and Learning Outcomes: Meta-Analysis (APA)](https://www.apa.org/pubs/journals/features/edu-a0037123.pdf)
- [Automated Grading of Open-Ended Questions with GenAI (Springer 2025)](https://link.springer.com/article/10.1007/s40593-025-00517-2)
- [Spaced Repetition and Retrieval Practice: Cognitive Psychology Review](https://journals.zeuspress.org/index.php/IJASSR/article/view/425)
