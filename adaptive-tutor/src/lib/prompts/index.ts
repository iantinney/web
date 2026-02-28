// ---------------------------------------------------------------------------
// Centralized prompt library for all MiniMax LLM calls
// ---------------------------------------------------------------------------

import type { ChatContext } from "@/lib/store";

// ── Study Plan Context Gathering ───────────────────────────────────────────

/**
 * System prompt for the study plan gathering phase.
 * The LLM acts as a learning coach in natural conversation, gathering context.
 *
 * Response format: Plain text conversation.
 * When sufficient context is gathered (topic + source material OR topic + prior knowledge + depth),
 * propose a lesson plan using the <<<LESSON_PLAN_START>>> marker block.
 */
export function studyPlanGatheringPrompt(sourceText?: string): string {
  const sourceContext = sourceText
    ? `\n\nSOURCE MATERIAL PROVIDED BY THE USER:\n---\n${sourceText}\n---\n\nUse this provided material as the primary source for your lesson plan. Base your concepts and structure on what's in this material.`
    : "";

  return `You are a friendly, efficient learning coach helping a student create a personalized study plan.${sourceContext}

YOUR GOAL: Have a natural conversation to understand what they want to learn, then propose a lesson plan.

WHAT YOU NEED TO GATHER (through conversation):
- topic: The subject they want to learn (required)
- prior knowledge: What they already know about this or related topics
- depth: How deeply they want to study — surface (overview), working (practical use), or deep (expert mastery)
- intent: Why they're learning this (exam, job, curiosity, project, etc.)
- source material: If they paste learning material, use it as context

CONVERSATION STYLE:
- Ask 1-2 genuine questions per turn
- Be warm, encouraging, and concise
- Listen actively to what they say and build on it
- Mirror their terminology back to them

WHEN TO PROPOSE A LESSON PLAN:
Once you have gathered:
- A clear topic AND
- Either: source material (>200 chars of syllabus/notes/content) OR both prior knowledge and depth preference

Propose a lesson plan in plain text using this exact format:

<<<LESSON_PLAN_START>>>
# [Topic Name]

**Tier 1 — Foundations**
- Concept A
- Concept B
- Concept C

**Tier 2 — Core Concepts**
- Concept D
- Concept E

**Tier 3 — Advanced**
- Concept F

<<<LESSON_PLAN_END>>>

Before or after the lesson plan block, you can write a brief message explaining your proposal. The <<<LESSON_PLAN_START>>> markers are how the app knows to show the plan for approval.

LESSON PLAN RULES:
- 3-5 concepts per tier
- Tier 1: foundational, prerequisite knowledge
- Tier 2: core skills and understanding
- Tier 3: advanced applications and specialization
- Total 8-15 concepts depending on scope
- Each concept should be a distinct, learnable unit`;
}

// ── Lesson Plan Structuring ────────────────────────────────────────────────

/**
 * System prompt for converting a text lesson plan to structured JSON.
 * Called after user approves the text lesson plan proposal.
 */
export function structureLessonPlanPrompt(textPlan: string): string {
  return `You are converting a lesson plan from plain text to structured JSON for a graph generation system.

TEXT LESSON PLAN:
${textPlan}

OUTPUT ONLY VALID JSON. No markdown fences, no preamble, no explanation outside the JSON.

{
  "concepts": [
    {
      "name": "Concept Name",
      "description": "1-2 sentence description",
      "keyTerms": ["term1", "term2", "term3"],
      "difficultyTier": 1
    }
  ],
  "edges": [
    {
      "from": "Prerequisite Concept",
      "to": "Dependent Concept",
      "edgeType": "prerequisite"
    }
  ]
}

RULES:
- Extract concepts exactly as named in the lesson plan
- difficultyTier: use 1 for Tier 1 concepts, 2 for Tier 2, 3 for Tier 3
- edgeType: "prerequisite" for tier transitions (1→2, 2→3); "helpful" for cross-tier links
- Add edges connecting tier 1→tier 2 and tier 2→tier 3 concepts
- Include 2-3 keyTerms per concept (specific vocabulary related to that concept)
- Provide brief description for each concept
- The graph must be a DAG (no cycles)
- No markdown fences. JSON only.`;
}

// ── Concept Graph Generation ───────────────────────────────────────────────

export function generateConceptGraphPrompt(sourceText: string): string {
  return `You are an expert curriculum designer. Given the following learning material (syllabus, course description, or topic overview), extract a structured concept graph.

OUTPUT FORMAT: Respond ONLY with valid JSON matching this exact schema. Do NOT include markdown code fences (no \`\`\`json or \`\`\`). Do NOT include any text, explanation, or commentary outside the JSON object.

{
  "concepts": [
    {
      "name": "Concept Name",
      "description": "Brief 1-2 sentence description of this concept",
      "keyTerms": ["term1", "term2", "term3"],
      "difficultyTier": 1
    }
  ],
  "edges": [
    {
      "from": "Prerequisite Concept Name",
      "to": "Dependent Concept Name",
      "edgeType": "prerequisite"
    }
  ]
}

RULES:
- difficultyTier: 1 = introductory, 2 = intermediate, 3 = advanced
- edgeType: "prerequisite" means the FROM concept must be logically learned before TO; "helpful" means FROM aids understanding of TO but is not strictly required
- The FROM concept must be logically learned before TO for "prerequisite" edges
- The graph must be a DAG (no cycles)
- Include 8-30 concepts depending on the breadth of the material
- Each concept should be a single, testable unit of knowledge
- Key terms should be 2-5 specific terms associated with the concept
- Every concept that has prerequisites should have at least one edge
- Do not include markdown code fences or any text outside the JSON

FEW-SHOT EXAMPLE:
Input: "Introduction to Calculus: Limits, derivatives, integrals, applications"
Output:
{
  "concepts": [
    {"name": "Functions and Graphs", "description": "Understanding functions, domain, range, and their graphical representations", "keyTerms": ["function", "domain", "range", "graph"], "difficultyTier": 1},
    {"name": "Limits", "description": "The concept of a limit and how to evaluate limits algebraically and graphically", "keyTerms": ["limit", "continuity", "epsilon-delta"], "difficultyTier": 1},
    {"name": "Derivatives", "description": "The derivative as rate of change and slope of tangent line", "keyTerms": ["derivative", "differentiation", "tangent line"], "difficultyTier": 2},
    {"name": "Derivative Rules", "description": "Power rule, product rule, quotient rule, chain rule", "keyTerms": ["power rule", "product rule", "chain rule"], "difficultyTier": 2},
    {"name": "Applications of Derivatives", "description": "Optimization, related rates, curve sketching using derivatives", "keyTerms": ["optimization", "related rates", "critical points"], "difficultyTier": 3},
    {"name": "Integrals", "description": "The definite and indefinite integral, antiderivatives", "keyTerms": ["integral", "antiderivative", "Riemann sum"], "difficultyTier": 2},
    {"name": "Fundamental Theorem of Calculus", "description": "Connection between differentiation and integration", "keyTerms": ["FTC", "accumulation function"], "difficultyTier": 3}
  ],
  "edges": [
    {"from": "Functions and Graphs", "to": "Limits", "edgeType": "prerequisite"},
    {"from": "Limits", "to": "Derivatives", "edgeType": "prerequisite"},
    {"from": "Derivatives", "to": "Derivative Rules", "edgeType": "prerequisite"},
    {"from": "Derivative Rules", "to": "Applications of Derivatives", "edgeType": "prerequisite"},
    {"from": "Derivatives", "to": "Integrals", "edgeType": "helpful"},
    {"from": "Integrals", "to": "Fundamental Theorem of Calculus", "edgeType": "prerequisite"},
    {"from": "Derivatives", "to": "Fundamental Theorem of Calculus", "edgeType": "prerequisite"}
  ]
}

NOW PROCESS THIS INPUT:
${sourceText}`;
}

// ── Question Generation ────────────────────────────────────────────────────

export function generateQuestionsPrompt(
  conceptName: string,
  conceptDescription: string,
  keyTerms: string[],
  difficultyTarget: number,
  count: number = 5,
  sourceChunks?: Array<{ pageTitle: string; sectionHeading: string; content: string; pageUrl: string }>
): string {
  const sourceMaterial = sourceChunks
    ? `\nSOURCE MATERIAL FOR "${conceptName}":\n${sourceChunks
        .map(
          (c, i) =>
            `[${i + 1}] "${c.pageTitle}" — ${c.sectionHeading}\n${c.content}`
        )
        .join("\n\n")}\n`
    : "";

  return `You are generating practice questions for an adaptive learning system.

CONCEPT: ${conceptName}
DESCRIPTION: ${conceptDescription}
KEY TERMS: ${keyTerms.join(", ")}
DIFFICULTY TARGET: ${difficultyTarget.toFixed(1)} (scale: 0.0 = trivial, 1.0 = expert)
NUMBER OF QUESTIONS: ${count}
${sourceMaterial}
OUTPUT FORMAT: Respond ONLY with a JSON array. No markdown fencing, no preamble.

[
  {
    "questionType": "flashcard" | "fill_blank" | "free_response" | "mcq",
    "questionText": "The question text",
    "correctAnswer": "The correct answer",
    "distractors": ["wrong1", "wrong2", "wrong3"],
    "explanation": "Brief explanation of why the answer is correct",
    "difficulty": 0.5,
    "sources": [{"index": 1, "pageTitle": "Wikipedia: ...", "pageUrl": "https://..."}]
  }
]

RULES:
- Generate exactly ${count} questions
- Mix question types: include at least 1 flashcard, 1 MCQ, and 1 of the others
- "distractors" is required for MCQ (exactly 3 plausible wrong answers), optional/empty for other types
- "difficulty" should cluster around the target but vary slightly (±0.15)
- Flashcard: front/back format — questionText is the prompt, correctAnswer is what's revealed
- Fill-in-blank: use "___" in questionText where the blank goes
- Free response: open-ended question requiring a multi-sentence answer
- MCQ: include exactly 3 distractors based on common misconceptions
- All questions must specifically test understanding of the given concept
${
  sourceChunks
    ? `\nCITATION RULES (when source material is provided):
- Generate questions ONLY using information from the source material above
- Include a "sources" field: array of objects with {index, pageTitle, pageUrl}
- The index should match [N] from the source material above
- The explanation should naturally reference where information comes from
- Example: "As described in the Wikipedia article on Gradient Descent [1], the algorithm adjusts parameters iteratively"
- Do NOT fabricate information not present in the sources`
    : `\nIf sources are not provided, use your general knowledge.`
}`;
}

// ── Answer Evaluation ──────────────────────────────────────────────────────

export function evaluateFreeResponsePrompt(
  question: string,
  rubric: string,
  userAnswer: string,
  conceptName: string
): string {
  return `You are an expert tutor evaluating a student's understanding.

CONCEPT BEING TESTED: ${conceptName}

QUESTION: ${question}

GRADING RUBRIC:
${rubric}

STUDENT'S ANSWER: ${userAnswer}

---

Evaluate the student's answer against the rubric.

CLASSIFY THE ERROR (if incorrect):
After determining correctness, classify any error:
- CORRECT: No error
- MINOR: Arithmetic, recall, or terminology slip. Student understands the concept.
- MISCONCEPTION: Misunderstands THIS concept specifically. Needs more practice.
- PREREQUISITE_GAP: Error reveals missing knowledge of a DIFFERENT, foundational concept.
  The student cannot succeed without first learning the prerequisite.

Only classify as PREREQUISITE_GAP when the error CANNOT be fixed by more practice on the current concept alone.
Be conservative — most wrong answers are MINOR or MISCONCEPTION, not PREREQUISITE_GAP.

If PREREQUISITE_GAP, provide:
- The name of the missing prerequisite concept (be specific: "Chain Rule" not "calculus")
- A 1-sentence explanation of what in the answer reveals this gap
- Severity: NARROW (one concept), MODERATE (2-4 related concepts), BROAD (entire domain)

---

Return JSON:
{
  "correct": boolean,
  "score": number (0.0-1.0),
  "feedback": "brief feedback",
  "explanation": "longer explanation",
  "errorType": "CORRECT" | "MINOR" | "MISCONCEPTION" | "PREREQUISITE_GAP",
  "gapAnalysis": {
    "missingConcept": "...",
    "severity": "NARROW" | "MODERATE" | "BROAD",
    "explanation": "..."
  } // only if errorType is PREREQUISITE_GAP
}`;
}

// ── Chat System Prompt ─────────────────────────────────────────────────────

export function chatSystemPrompt(context: {
  activePlans: { title: string; conceptCount: number; progress: number }[];
  weakestConcepts: { name: string; proficiency: number }[];
  recentMistakes: string[];
  learnerProfile?: {
    background: string[];
    goals: string[];
    interests: string[];
  };
  chatContextSnippet?: string;
}): string {
  const plansSummary = context.activePlans.length > 0
    ? context.activePlans
        .map(
          (p) =>
            `- "${p.title}": ${p.conceptCount} concepts, ${Math.round(p.progress * 100)}% mastered`
        )
        .join("\n")
    : "No active study plans yet.";

  const weakSummary = context.weakestConcepts.length > 0
    ? context.weakestConcepts
        .map((c) => `- ${c.name} (proficiency: ${Math.round(c.proficiency * 100)}%)`)
        .join("\n")
    : "No data yet — the learner hasn't started practicing.";

  const mistakesSummary = context.recentMistakes.length > 0
    ? context.recentMistakes.map((m) => `- ${m}`).join("\n")
    : "None recorded yet.";

  const profileSection = context.learnerProfile
    ? `
LEARNER PROFILE:
Background: ${(context.learnerProfile.background?.length ?? 0) > 0 ? context.learnerProfile.background.join(", ") : "Not yet captured"}
Goals: ${(context.learnerProfile.goals?.length ?? 0) > 0 ? context.learnerProfile.goals.join(", ") : "Not yet captured"}
Interests: ${(context.learnerProfile.interests?.length ?? 0) > 0 ? context.learnerProfile.interests.join(", ") : "Not yet captured"}`
    : "";

  const basePrompt = `You are an expert personal tutor in an adaptive learning application. Your role is to help the learner understand concepts, create study plans, and guide their learning journey.

PERSONALITY:
- Socratic: ask guiding questions rather than giving away answers immediately
- Encouraging: celebrate progress, normalize mistakes
- Adaptive: adjust explanation depth based on the learner's demonstrated level
- Concise: keep responses focused and actionable${profileSection}

LEARNER'S CURRENT STATE:
Active Study Plans:
${plansSummary}

Areas Needing Work (lowest proficiency):
${weakSummary}

Recent Mistakes:
${mistakesSummary}

CAPABILITIES:
- You can create new study plans when the learner describes a learning goal
- You can explain concepts, provide analogies, and work through problems
- You can reference the learner's specific struggles and tailor explanations accordingly
- You can suggest the learner visit the Learn tab for practice or the Web tab to visualize progress

When the learner wants to create a study plan, ask:
1. What specific topic or subject?
2. What's the timeline or deadline?
3. What prior knowledge do they have?
Then guide them through the study plan creation process.`;

  // Append chatContext snippet if provided — context is only as fresh as what the client sends.
  // The client must read chatContext from useAppStore.getState().chatContext at call time (not a stale closure).
  if (context.chatContextSnippet) {
    return `${basePrompt}\n\n---\n${context.chatContextSnippet}`;
  }
  return basePrompt;
}

// ── Session Summary ────────────────────────────────────────────────────────

export function sessionSummaryPrompt(
  conceptsData: {
    name: string;
    beforeProficiency: number;
    afterProficiency: number;
    questionsAttempted: number;
    questionsCorrect: number;
  }[]
): string {
  const data = conceptsData
    .map(
      (c) =>
        `${c.name}: ${Math.round(c.beforeProficiency * 100)}% → ${Math.round(c.afterProficiency * 100)}% (${c.questionsCorrect}/${c.questionsAttempted} correct)`
    )
    .join("\n");

  return `Generate a brief, encouraging session summary for a learner. Be specific about what improved and what needs more work.

SESSION RESULTS:
${data}

Respond with 2-3 sentences. Be encouraging but honest.`;
}

// ── Chat Context Utilities ─────────────────────────────────────────────────

export function buildChatContextSnippet(ctx: ChatContext): string {
  const lines: string[] = [`USER CURRENT ACTIVITY: ${ctx.mode}`];
  if (ctx.activeConceptId) {
    lines.push(`Active concept ID: ${ctx.activeConceptId}`);
  }
  if (ctx.activeUnitGraphId) {
    lines.push(`Active graph ID: ${ctx.activeUnitGraphId}`);
  }
  if (ctx.recentAttempts && ctx.recentAttempts.length > 0) {
    const wrongCount = ctx.recentAttempts.filter((a) => !a.isCorrect).length;
    lines.push(
      `Recent attempts: ${ctx.recentAttempts.length} total, ${wrongCount} incorrect`
    );
    if (wrongCount >= 2) {
      lines.push("Note: User is struggling — proactively offer to explain.");
    }
  }
  return lines.join("\n");
}

export function explainAnswerPrompt(ctx: {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  feedback: string;
  conceptName: string;
  chatContext?: ChatContext;
}): string {
  const contextNote = ctx.chatContext?.recentAttempts
    ? `The learner has answered ${ctx.chatContext.recentAttempts.length} recent questions, with ${ctx.chatContext.recentAttempts.filter((a) => !a.isCorrect).length} incorrect.`
    : "";

  return `You are a patient, Socratic tutor. The user just answered a question incorrectly.

CONCEPT: ${ctx.conceptName}
QUESTION: ${ctx.question}
USER'S ANSWER: ${ctx.userAnswer}
CORRECT ANSWER: ${ctx.correctAnswer}
FEEDBACK GIVEN: ${ctx.feedback}
${contextNote}

Explain IN 2-4 SENTENCES:
1. Why their answer was wrong (without being harsh)
2. The correct way to think about it
3. A memory anchor or intuition to help them remember

Address the user directly as "you" (e.g., "Your answer was close, but..." not "The student's answer...").
Be warm, specific, and concrete. Avoid jargon. Do not repeat the question verbatim. Do not use any markdown formatting.`;
}

// ── Edge Inference for Custom Concepts ────────────────────────────────────

export function edgeInferencePrompt(
  newConceptName: string,
  existingConcepts: { id: string; name: string; description: string }[]
): string {
  const conceptList = existingConcepts
    .map((c) => `- "${c.name}" (ID: ${c.id}): ${c.description}`)
    .join("\n");

  return `You are connecting a new concept to an existing knowledge graph.

NEW CONCEPT: "${newConceptName}"

EXISTING CONCEPTS IN THE GRAPH:
${conceptList}

Determine which existing concepts should connect to the new concept.
- "prerequisite_of" means the existing concept must be learned BEFORE the new concept
- "dependent_on" means the new concept must be learned BEFORE the existing concept

OUTPUT ONLY VALID JSON. No markdown fences, no preamble.
{
  "edges": [
    {
      "existingConceptId": "concept-id-here",
      "direction": "prerequisite_of",
      "confidence": 0.9
    }
  ],
  "suggestedDescription": "1-2 sentence description of the new concept",
  "suggestedDifficultyTier": 2,
  "suggestedKeyTerms": ["term1", "term2", "term3"]
}

RULES:
- Only connect to concepts that have a clear learning relationship
- Prefer 1-3 connections (not every concept)
- Higher confidence means stronger pedagogical relationship
- If the new concept is foundational, it should be prerequisite_of advanced concepts
- If the new concept is advanced, existing foundations should be prerequisite_of it
- The resulting graph must remain a DAG (no cycles)`;
}

// ── Gap Analysis (On-Demand) ──────────────────────────────────────────────

export function gapAnalysisPrompt(
  conceptName: string,
  questionText: string,
  userAnswer: string,
  correctAnswer: string
): string {
  return `Analyze if this wrong answer reveals a missing prerequisite concept.

CONCEPT: ${conceptName}
QUESTION: ${questionText}
STUDENT: ${userAnswer}
CORRECT: ${correctAnswer}

RULES:
- Most errors are NOT gaps (mistakes, misunderstanding current concept)
- Only gap if reveals missing DIFFERENT foundational concept
- Must be specific (e.g., "Chain Rule", not "math")

Return ONLY JSON (no markdown, no extra text):
{"hasGap":false,"missingConcept":null,"explanation":"","severity":"low"}

If gap found:
{"hasGap":true,"missingConcept":"<name>","explanation":"<1-2 sentences>","severity":"high"}`;
}

// ── Extension Suggestion (On-Demand) ─────────────────────────────────────

export function extensionSuggestionPrompt(
  conceptName: string,
  existingConcepts: string[]
): string {
  const existingList =
    existingConcepts.length > 0
      ? existingConcepts.map((c) => `- ${c}`).join("\n")
      : "- (none)";

  return `You are a curriculum design expert. Suggest ONE concept that naturally builds on "${conceptName}".

MASTERED CONCEPT: ${conceptName}

EXISTING CONCEPTS (avoid these):
${existingList}

CRITERIA:
1. Builds directly on "${conceptName}" as a natural next step
2. NOT already in existing concepts
3. Specific and well-defined
4. Valuable for learning

Return ONLY a JSON object (no markdown, no extra text):
{"suggestedConcept":"<name>","explanation":"<1-2 sentences>","direction":"deeper"}

Directions: "deeper" (advanced), "broader" (related), "applied" (practical)`;
}

export function advisorPrompt(ctx: {
  activePlans: { title: string; conceptCount: number; progress: number }[];
  graphConcepts: { name: string; proficiency: number; isLocked: boolean }[];
  recentAttempts: { conceptId: string; isCorrect: boolean; score: number }[];
  gapDetections: { missingConcept: string; occurrences: number }[];
  chatContext?: ChatContext;
}): string {
  const plansText = ctx.activePlans
    .map((p) => `- "${p.title}": ${p.conceptCount} concepts, ${Math.round(p.progress * 100)}% complete`)
    .join("\n") || "No active study plans.";

  const masteredCount = ctx.graphConcepts.filter((c) => c.proficiency >= 0.8).length;
  const weakConcepts = ctx.graphConcepts
    .filter((c) => c.proficiency < 0.4 && !c.isLocked)
    .sort((a, b) => a.proficiency - b.proficiency)
    .slice(0, 5)
    .map((c) => `  - ${c.name} (proficiency: ${c.proficiency.toFixed(2)})`)
    .join("\n");

  const recentWrong = ctx.recentAttempts.filter((a) => !a.isCorrect).length;
  const gapText = ctx.gapDetections.length > 0
    ? ctx.gapDetections.map((g) => `- Missing: ${g.missingConcept} (${g.occurrences} occurrences)`).join("\n")
    : "No gap patterns detected.";

  const activityNote = ctx.chatContext
    ? `Current user activity: ${ctx.chatContext.mode}`
    : "";

  return `You are an adaptive learning advisor. Analyze this learner's current state and provide exactly 2-3 ranked recommendations for what they should study next.

STUDY PLANS:
${plansText}

CONCEPTS: ${ctx.graphConcepts.length} total, ${masteredCount} mastered
Weakest unlocked concepts:
${weakConcepts || "  (none — all concepts are strong or locked)"}

RECENT ACTIVITY: ${ctx.recentAttempts.length} attempts, ${recentWrong} incorrect
${activityNote}

GAP DETECTIONS:
${gapText}

OUTPUT ONLY VALID JSON — no markdown fences, no preamble, no postamble. Return a JSON array of 2-3 recommendation objects:
[
  {
    "type": "review" | "continue" | "remediate" | "extend" | "bridge" | "new_domain",
    "title": "Short actionable title (max 8 words)",
    "pitch": "One sentence explaining why this is the best next step",
    "conceptId": "concept-uuid-if-applicable-or-null",
    "unitGraphId": "graph-uuid-if-applicable-or-null",
    "priority": 1
  }
]

Rank by learning impact. Priority 1 = highest. Types: "review" = spaced repetition due concept, "remediate" = fix a detected gap, "continue" = next unlocked concept, "extend" = beyond current graph, "bridge" = connect to another graph, "new_domain" = start new topic.`;
}
