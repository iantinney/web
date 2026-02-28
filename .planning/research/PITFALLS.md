# Domain Pitfalls: Adaptive Learning Tutor

**Domain:** Adaptive learning system with LLM-generated concept graphs, question generation, free-response evaluation, and proficiency modeling
**Researched:** 2026-02-24
**Confidence:** MEDIUM-HIGH (mix of verified academic sources and WebSearch findings)

---

## Critical Pitfalls

Mistakes that cause rewrites, data integrity failures, or make the product unusable.

---

### Pitfall 1: LLM Concept Graph Produces Cycles in What Should Be a DAG

**What goes wrong:**
When an LLM generates a concept dependency graph, it does not enforce topological ordering. The model "knows" that Concept A relates to Concept B and that Concept B relates to Concept A, and it may output both directed edges. The resulting graph has cycles, which breaks topological sort, mastery sequencing, and any "prerequisites first" logic. The system may silently accept a malformed graph and then loop indefinitely or skip entire topic clusters.

**Why it happens:**
LLMs predict probable text sequences, not graph-theoretically valid structures. Even with clear prompting, models substitute plausible-sounding relationships for structurally correct ones. This is compounded by a known failure archetype: "over-helpfulness under uncertainty," where the model fills gaps with plausible alternatives rather than refusing.

**Warning signs:**
- Topological sort throws an error or returns empty
- Concept X lists Y as prerequisite AND Y lists X as prerequisite
- Certain concepts never appear in the generated question sequence

**Consequences:**
- Question ordering becomes arbitrary or loops
- Mastery progression breaks silently
- Users get questions on concepts whose prerequisites they haven't seen

**Prevention:**
- Run Kahn's algorithm cycle detection immediately after every graph generation call — before persisting anything
- If cycles are detected: either (a) prune the lowest-confidence edges in the cycle, or (b) regenerate with explicit anti-cycle constraints in the prompt
- Add schema validation as a post-processing step, not an afterthought
- Store original LLM output and validated graph separately for debugging

**Phase assignment:** Graph generation phase (early). This validation layer must be built before any downstream feature depends on the graph structure.

**Confidence:** HIGH — Cycle detection is a standard algorithm (Kahn's); the LLM reliability issue is well-documented in production KG systems.

---

### Pitfall 2: LLM JSON Structured Output Silently Breaks in Production

**What goes wrong:**
The LLM produces a concept graph (or question, or evaluation) as JSON. In testing, this works. In production, the model occasionally outputs malformed JSON (truncated, missing closing braces, renamed fields, extra commentary outside the JSON block). The parser throws an exception or silently drops fields. If the application doesn't handle this, a single bad response can corrupt a user's session or concept graph.

**Why it happens:**
Even leading models like GPT-4 show an 11.97% invalid response rate for complex extraction tasks without schema enforcement. Without native structured output (function calling or JSON schema mode), the failure rate is much higher. MiniMax models support function calling and structured output via OpenAI-compatible API, but these features must be explicitly used — prompting alone is insufficient.

**Warning signs:**
- `json.JSONDecodeError` in logs
- Missing keys in parsed output (field was renamed by model)
- Graph with fewer nodes than expected
- Application crash on edge cases but not in testing

**Consequences:**
- Session corruption if graph is partially parsed and stored
- Silent data loss if exceptions are swallowed
- Cascading failures if downstream features assume graph is valid

**Prevention:**
- Use MiniMax's function calling / structured output mode with an explicit JSON schema — do not rely on free-form JSON prompting
- Implement a validation wrapper: parse → validate schema → check required fields → reject and retry if invalid
- Set a retry budget (e.g., 3 attempts) before surfacing error to user
- Log every raw LLM response for post-hoc debugging
- Never store partially parsed output

**Phase assignment:** Graph generation phase. Also applies to question generation and evaluation phases — each LLM call that expects structured output needs this treatment.

**Confidence:** HIGH — Multiple sources including production benchmarks confirm this failure mode.

---

### Pitfall 3: Proficiency Modeling That Creates False Mastery

**What goes wrong:**
A user answers 3 questions correctly in a row on a concept. The system marks them as "mastered" and moves on. In reality, the questions were too easy, or the user got lucky, or they memorized a single pattern. The system has high confidence in low-quality evidence. This is the "false mastery" failure: the proficiency estimate exceeds the threshold prematurely.

**Why it happens:**
Binary "right/wrong" signals on small samples are noisy. Fixed-threshold BKT (Bayesian Knowledge Tracing) has a documented equity problem: a single parameter set cannot simultaneously accommodate fast and slow learners. Setting the threshold too low (e.g., p(mastery) > 0.7) means fast learners advance on lucky streaks; too high (e.g., > 0.99) means slow learners over-practice one concept while never progressing.

Research from EDM 2025 finds that 0.95 is widely adopted but 0.98 yields better downstream performance on subsequent concepts without causing excessive over-practice.

**Warning signs:**
- Users say "I got marked as knowing X but I actually don't"
- Users complete a topic quickly but fail prerequisites for the next one
- Proficiency score jumps from 0.3 to 0.95 in two questions

**Consequences:**
- Users are advanced past concepts they don't know
- Later concepts become incomprehensible, causing frustration and dropout
- Proficiency data becomes worthless for analytics

**Prevention:**
- Set mastery threshold at 0.95 minimum; consider 0.98 for foundational concepts
- Require minimum N correct responses (not just threshold probability) before declaring mastery — combine threshold AND streak count
- Use variable difficulty questions to confirm mastery: an easy question and a hard question on the same concept should both be correct
- Flag rapid proficiency gains (< 3 questions to mastery) for manual review or additional confirmation questions
- Never rely on a single correct response for mastery on high-stakes concepts

**Phase assignment:** Proficiency modeling phase. Also relevant when setting up question difficulty tiers.

**Confidence:** HIGH — Based on verified academic research (EDM 2025, BKT literature).

---

### Pitfall 4: LLM Free-Response Grading Exhibits Systematic Biases

**What goes wrong:**
The LLM grades a student's free-text answer. It gives full credit to verbose, fluent answers even if they are technically wrong. It penalizes terse but correct answers. If the same answer is presented in different positions in the evaluation prompt, the grade changes. The grader exhibits position bias (favoring the first or last option), verbosity bias (favoring longer answers), and self-enhancement bias (favoring outputs stylistically similar to its own outputs).

**Why it happens:**
These are documented, well-quantified biases in LLM-as-judge systems. GPT-4 shows approximately 40% position bias — it may flip its grading decision when answer order is swapped. Verbosity bias is an artifact of RLHF training that rewards detailed, fluent responses. These biases do not disappear with better prompting alone.

**Warning signs:**
- Long, vague student answers consistently score higher than short, precise ones
- Grading scores are not reproducible (same answer, same prompt, different scores on retry)
- Student feedback shows confusion about why wrong answers were marked correct

**Consequences:**
- Proficiency scores corrupted by grading noise
- Students learn that "sounding confident" beats "being correct"
- Trust in the system erodes when grading seems arbitrary

**Prevention:**
- Use rubric-anchored prompts: define explicit criteria (not just "is this correct?") with examples of correct and incorrect answers
- Include explicit anti-verbosity instruction: "Penalize responses that are unnecessarily verbose. Reward concise, accurate answers."
- Use reference answers in the evaluation prompt so the judge compares against ground truth, not general fluency
- For high-stakes evaluations, run the grader twice with answer order swapped; only accept if scores agree within a tolerance
- Track inter-rater reliability against a human-labeled golden test set regularly
- Define and implement a fallback: if grading confidence is low (ambiguous rubric match), fall back to a multiple-choice follow-up question rather than assigning a score

**Phase assignment:** Free-response evaluation phase. Build rubric infrastructure before wiring grading scores into proficiency updates.

**Confidence:** HIGH — Multiple peer-reviewed sources on LLM-as-judge bias, verified with official research (IJCNLP 2025, arXiv 2410.02736).

---

### Pitfall 5: Question Generation Produces Repetitive or Near-Duplicate Questions

**What goes wrong:**
The system generates questions for a concept. Over 10 sessions, the user sees "What is the difference between X and Y?" phrased four different ways. The questions are semantically identical but lexically varied enough that exact-match deduplication misses them. The user notices the pattern, stops engaging, and the proficiency signal becomes invalid (they're answering from pattern recognition, not understanding).

**Why it happens:**
LLMs have finite ways to frame questions for narrow topics. Without a diversity mechanism, the same question-generating prompt will converge on the same handful of framings. Frequency/presence penalty parameters reduce surface-level repetition but do not prevent semantic duplicates.

**Warning signs:**
- User feedback mentions "same questions over and over"
- Embedding similarity between generated questions is consistently > 0.9
- Question bank for a concept has fewer distinct question types than expected

**Consequences:**
- Proficiency signal is corrupted: user scores well because they memorized question patterns
- User disengagement and dropout
- Card fatigue — the most cited cause of adaptive learning abandonment

**Prevention:**
- Maintain a per-concept question log with embeddings; before showing a new question, compute cosine similarity against seen questions and reject if > threshold (e.g., 0.85)
- Enforce question type diversity: for each concept, cycle through at least 3 distinct types (definition, application, comparison, counterexample) before repeating a type
- Use explicit "avoid these phrasings" negative examples in the question generation prompt
- Set a per-concept question cap: after N questions, declare concept reviewed regardless of additional question availability
- Track question-type distribution in analytics to detect convergence

**Phase assignment:** Question generation phase. Deduplication infrastructure must be in place before any user-facing question serving.

**Confidence:** MEDIUM-HIGH — Semantic similarity-based deduplication is verified practice; the specific LLM convergence failure is well-documented in production anecdotes and supported by research on near-duplicate detection.

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or material UX degradation.

---

### Pitfall 6: Cold Start Produces Inappropriate First Questions

**What goes wrong:**
A user begins a new topic with no interaction history. The system has no proficiency estimate, so it defaults to some initial difficulty — either too easy (boring) or too hard (discouraging). This is the cold start problem in adaptive learning. It is especially severe when the concept graph has many isolated entry-point concepts with no shared prerequisite history.

**Why it happens:**
Knowledge tracing models need prior interaction data to calibrate estimates. Without it, the system must guess difficulty. Default assumptions (start everyone at "beginner") are wrong for domain-experienced learners.

**Warning signs:**
- New users report first questions are trivially easy or incomprehensibly hard
- Early dropout concentrated in sessions 1-2
- First-session completion rate significantly lower than later sessions

**Prevention:**
- Add a short diagnostic quiz (3-5 questions at varied difficulty) before starting a topic — use responses to calibrate initial difficulty
- Use prior performance on related concepts to inform cold-start estimate (warm transfer)
- Start at medium difficulty by default, then adapt rapidly based on first 2-3 responses

**Phase assignment:** Proficiency modeling phase. Also requires question difficulty tagging infrastructure to be in place.

**Confidence:** MEDIUM — Cold start is extensively documented; specific mitigation strategies are research-backed (Springer 2024).

---

### Pitfall 7: LLM Latency Degrades Real-Time UX

**What goes wrong:**
Graph generation takes 8-12 seconds. The user clicks "Start learning" and stares at a spinner. Question generation takes 3-5 seconds per question. Each answer-submit triggers another wait. The cumulative latency destroys the flow state that makes learning effective.

**Research context:**
For interactive applications, the acceptable latency thresholds are: TTFT under 500ms, per-token latency under 15ms, end-to-end under 2 seconds. A 5-10 second wait for graph generation may be acceptable if it is a one-time setup operation — but only if the user has clear feedback (progress indicator, "building your learning path..."). The same delay on every question is not acceptable.

**Warning signs:**
- Question-to-question transition time > 3 seconds
- Users abandon mid-session during loading states
- Session logs show long gaps between question delivery and next interaction

**Consequences:**
- Users lose focus during waits
- Latency variability (sometimes 1s, sometimes 8s) is worse for trust than consistent 3s
- High LLM API costs from unnecessarily large requests

**Prevention:**
- Graph generation: accept 5-10s as a one-time cost; communicate it clearly with a progress indicator and set expectations
- Question generation: pre-generate the next 2-3 questions in the background while the user answers the current one (question prefetch queue)
- Use streaming for any response over 1 second — stream the question text token-by-token so users see progress immediately
- Cache generated questions per concept so repeat visits are instant
- Set a hard timeout on LLM calls (15 seconds); surface an error and retry rather than waiting indefinitely

**Phase assignment:** Infrastructure/performance phase. Prefetch queue and streaming should be planned from the start, not retrofitted.

**Confidence:** MEDIUM-HIGH — Latency thresholds are from verified benchmark research (AIMultiple 2026); prefetch pattern is standard practice.

---

### Pitfall 8: Concept Graph Quality Is Not Validated Before Use

**What goes wrong:**
The LLM generates a concept graph. It looks reasonable. It passes cycle detection. But many edges are wrong — concepts that are not actually prerequisites are listed as prerequisites, or vice versa. The system asks a user about "gradient descent" before explaining "partial derivatives." The learning sequence is incoherent even though the graph is structurally valid.

**Why it happens:**
Structural validity (no cycles) is not the same as semantic validity (edges represent true learning dependencies). LLMs hallucinate relationships with high confidence. Without human expert review or automated validation against a reference curriculum, these errors are invisible.

**Warning signs:**
- Users express confusion about question ordering ("why am I being asked about this before learning X?")
- Expert review finds topologically valid but pedagogically wrong prerequisite edges
- Concept graph looks different every time the same topic is generated (non-deterministic)

**Prevention:**
- For known domains, validate generated graphs against established curricula or textbook chapter orderings
- Add a human review step for graphs used by many users (high-traffic topics)
- Use LLM-based validation as a second pass: generate the graph, then ask a separate LLM call "Is this prerequisite ordering pedagogically correct? List any suspicious edges."
- Make graph regeneration easy and cheap — treat the first generation as a draft
- Log graph versions and allow rollback if user complaints spike after a graph update

**Phase assignment:** Graph generation phase. Validation tooling should ship alongside generation, not as a later polish item.

**Confidence:** MEDIUM — Hallucination in KG generation is well-documented; the specific pedagogical ordering issue is inferred from general LLM KG failure patterns and is considered LOW confidence without direct citation.

---

### Pitfall 9: User Disengagement From Predictable Feedback Patterns

**What goes wrong:**
The system always responds to incorrect answers with "Incorrect. The right answer is X." Users learn to ignore feedback. The feedback is technically correct but does not explain why the user was wrong, connect to prior concepts, or offer encouragement. Users disengage from the feedback loop entirely, reducing the learning benefit and eventually abandoning the system.

**Why it happens:**
Feedback generation is often treated as a low-priority feature. The focus is on question generation and grading, with feedback as an afterthought. Generic "correct/incorrect" responses are easy to implement but ineffective at maintaining engagement.

**Warning signs:**
- Users stop reading feedback (inferred from rapid answer submission after feedback display)
- Low variation in feedback seen in session logs (same 2-3 feedback templates)
- Dropout spikes correlate with low-variety feedback sessions

**Prevention:**
- Generate personalized feedback that references the specific error the user made, not just the correct answer
- Vary feedback tone: sometimes encouraging ("Good attempt — you got the key idea, just missed the precision"), sometimes Socratic ("What would happen if X were false?")
- For incorrect answers, provide a brief explanation and link back to the prerequisite concept
- For correct answers, occasionally add a "stretch" insight to reward mastery and maintain interest
- Measure time-on-feedback as a proxy for engagement — if users spend < 1 second on feedback, it is not being read

**Phase assignment:** Question/feedback UX phase. Feedback quality affects retention more than question quality in the long run.

**Confidence:** MEDIUM — Supported by general adaptive learning engagement research; specific feedback pattern research is inferred from broader disengagement literature.

---

### Pitfall 10: Difficulty Calibration Drifts Without Correction

**What goes wrong:**
Questions are tagged as "easy," "medium," or "hard" at generation time. But these tags are based on LLM judgment, not empirical student performance data. In practice, a question tagged "easy" may be consistently missed by 70% of users. As a result, the adaptive difficulty algorithm gives users questions that are systematically too hard or too easy, because the difficulty estimates are wrong.

**Why it happens:**
LLM-assessed difficulty and human-perceived difficulty diverge, especially for domain-specific content. Without collecting and using real response data to recalibrate difficulty tags, the initial estimates decay in accuracy as edge-case topics are encountered.

**Warning signs:**
- "Easy" questions have high miss rates in aggregate
- Users at supposedly the same proficiency level perform very differently
- The adaptive algorithm rarely changes difficulty (stuck on a band because estimates are uncalibrated)

**Prevention:**
- Treat initial difficulty tags as priors, not ground truth — update them from actual response rates
- After 20-50 responses per question, compute empirical difficulty (p-value: fraction of users who got it wrong) and override the LLM-assigned tag
- Alert on high-surprise questions: if a question tagged "easy" has > 60% miss rate, flag for human review
- Use IRT-adjacent methods once sufficient data is collected to estimate question discrimination as well as difficulty

**Phase assignment:** Analytics/data phase. Recalibration infrastructure can be deferred to post-MVP, but the data collection for it must start at MVP.

**Confidence:** MEDIUM — Based on AutoIRT research (arXiv 2409.08823) and IRT calibration literature.

---

## Minor Pitfalls

Mistakes that create annoyance or technical debt but are fixable without major rework.

---

### Pitfall 11: Graph Regeneration Is Not Idempotent

**What goes wrong:**
A user revisits a topic. The system regenerates the concept graph (or retrieves a cached one). The graph is different from the first time — same concepts, but different edge structure. The user's proficiency data, stored per concept node, may now map to different node IDs or no longer match the graph topology. Proficiency data becomes orphaned.

**Prevention:**
- Cache graphs by topic identifier with a stable hash; never regenerate without a deliberate cache invalidation
- Use stable concept IDs (not generated names) as primary keys — if a concept "gradient descent" appears in multiple graphs, use a canonical ID
- When graph structure changes, run a migration step to remap proficiency data

**Phase assignment:** Data modeling phase.

---

### Pitfall 12: LLM Hallucination in Concept Descriptions

**What goes wrong:**
The LLM generates a concept description or explanation that is factually wrong. The user reads it, learns the wrong thing, then gets questions about it. When they get answers wrong, they think the question is wrong — not realizing the description was incorrect.

**Prevention:**
- For factual domains, include retrieval-augmented context in the description generation prompt
- Mark AI-generated descriptions as "draft — may contain errors" in early releases
- Add a user feedback mechanism on concept descriptions specifically ("Report an error")
- For high-traffic concepts, conduct periodic human review of descriptions

**Phase assignment:** Content generation phase.

---

### Pitfall 13: Session State Not Persisted Across Network Failures

**What goes wrong:**
A user is mid-session. Their internet drops. When they reconnect, the session is lost — question history, partial proficiency updates, and generated questions are all gone. They see a blank state. Proficiency does not reflect the work they did.

**Prevention:**
- Persist proficiency updates after every answered question, not at session end
- Store question history locally (browser localStorage or server-side) and sync on reconnect
- Display a "session resumed" indicator with a summary of progress preserved

**Phase assignment:** Infrastructure phase.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Concept graph generation | Cycles in DAG output | Run Kahn's algorithm immediately; retry with anti-cycle prompt on failure |
| Concept graph generation | Semantic validity vs. structural validity | Build human review / second-pass LLM validation tooling early |
| Concept graph generation | Non-idempotent regeneration | Cache with stable hashes; use canonical concept IDs |
| Question generation | Semantic duplicate questions | Embedding-based similarity check before serving; question-type rotation |
| Question generation | LLM difficulty tags are wrong | Collect empirical p-values from real responses; recalibrate after N samples |
| Question generation | JSON output malformed | Use MiniMax function calling / schema mode; parse-validate-retry wrapper |
| Free-response evaluation | Verbosity and position bias | Rubric-anchored prompts; reference answers; dual-pass grading for high stakes |
| Free-response evaluation | Inconsistent grading | Golden test set; inter-rater reliability tracking |
| Proficiency modeling | False mastery (premature advancement) | Threshold >= 0.95; minimum streak count; variable difficulty confirmation |
| Proficiency modeling | Cold start produces bad first questions | 3-5 question diagnostic before topic entry; warm transfer from related concepts |
| Proficiency modeling | Difficulty drift over time | Empirical recalibration from response data; IRT-adjacent methods |
| UX / engagement | Card fatigue from repetitive questions | Question diversity enforcement; per-concept question cap |
| UX / engagement | Generic feedback drives disengagement | Personalized, varied feedback generation |
| Infrastructure | LLM API latency in real-time flow | Question prefetch queue; streaming; hard timeouts; graph generation as one-time cost |
| Infrastructure | Session state lost on disconnect | Persist after every question; local state sync |
| Infrastructure | LLM hallucination in content | RAG-augmented descriptions; user error reporting; human review for high-traffic concepts |

---

## Sources

**Adaptive Learning Modeling:**
- [Adaptive Learning is Hard: Challenges, Nuances, and Trade-offs](https://link.springer.com/article/10.1007/s40593-024-00400-6) — Springer IJAIED 2024
- [How Much Mastery is Enough Mastery?](https://educationaldatamining.org/edm2025/proceedings/2025.EDM.short-papers.4/2025.EDM.short-papers.4.pdf) — EDM 2025 (threshold 0.95 vs 0.98 empirical finding)
- [Bayesian Knowledge Tracing — Wikipedia](https://en.wikipedia.org/wiki/Bayesian_knowledge_tracing) — BKT equity limitations
- [A Systematic Review of Deep Knowledge Tracing (2015-2025)](https://www.preprints.org/manuscript/202510.1845) — Practical deployment flaws

**LLM Structured Output:**
- [Which LLMs Actually Produce Valid JSON?](https://medium.com/@lyx_62906/which-llms-actually-produce-valid-json-7c7b1a56c225) — GPT-4 11.97% failure rate
- [Structured Output AI Reliability: JSON Schema & Function Calling Guide 2025](https://www.cognitivetoday.com/2025/10/structured-output-ai-reliability/) — 99% reliability with schema enforcement

**LLM-as-Judge Bias:**
- [Justice or Prejudice? Quantifying Biases in LLM-as-a-Judge](https://arxiv.org/html/2410.02736v1) — arXiv
- [A Systematic Study of Position Bias in LLM-as-a-Judge](https://aclanthology.org/2025.ijcnlp-long.18.pdf) — IJCNLP 2025
- [The 5 Biases That Can Silently Kill Your LLM Evaluations](https://www.sebastiansigl.com/blog/llm-judge-biases-and-how-to-fix-them/)
- [Advances in Auto-Grading with Large Language Models](https://aclanthology.org/2025.bea-1.35.pdf) — ACL 2025

**Knowledge Graph Generation:**
- [Why LLMs Fail and How Knowledge Graphs Save Them](https://medium.com/@visrow/why-llms-fail-and-how-knowledge-graphs-save-them-the-complete-guide-6979a564c1b8) — Medium
- [How Do LLMs Fail In Agentic Scenarios?](https://arxiv.org/html/2512.07497v1) — arXiv (malformed tool calls, generation loops)
- [Knowledge Graph Validation by Integrating LLMs and Human-in-the-Loop](https://www.sciencedirect.com/science/article/pii/S030645732500086X) — ScienceDirect 2025
- [Detect Cycle in a Directed Graph](https://www.geeksforgeeks.org/dsa/detect-cycle-in-a-graph/) — Kahn's algorithm reference

**Difficulty Calibration:**
- [AutoIRT: Calibrating Item Response Theory Models with Automated Machine Learning](https://arxiv.org/abs/2409.08823) — arXiv 2024
- [SMART: Simulated Students Aligned with IRT for Question Difficulty Prediction](https://arxiv.org/abs/2507.05129) — arXiv 2025

**User Engagement and Dropout:**
- [Adult Learner Dropout in Online Education](https://www.mdpi.com/2673-8392/5/4/214) — MDPI 2025
- [AI-Powered Adaptive Learning Interfaces: A User Experience Study](https://www.frontiersin.org/journals/computer-science/articles/10.3389/fcomp.2025.1672081/pdf) — Frontiers 2025

**Latency:**
- [LLM Latency Benchmark by Use Cases in 2026](https://research.aimultiple.com/llm-latency-benchmark/) — AIMultiple
- [Understand LLM Latency and Throughput Metrics](https://docs.anyscale.com/llm/serving/benchmarking/metrics) — Anyscale Docs

**Cold Start:**
- [Alleviating the Cold Start Problem in Adaptive Learning](https://link.springer.com/article/10.1007/s42113-021-00101-6) — Springer
- [Large-Scale Evaluation of Cold-Start Mitigation in Adaptive Fact Learning](https://link.springer.com/article/10.1007/s11257-024-09401-5) — UMUAI 2024

**Question Generation:**
- [Analysis of LLMs for Educational Question Classification and Generation](https://www.sciencedirect.com/science/article/pii/S2666920X24001012) — ScienceDirect 2024
- [Near-Duplicate Question Detection](https://assets.amazon.science/05/0e/7da5195f4976a9ebcd4a81266464/near-duplicate-question-detection.pdf) — Amazon Science
