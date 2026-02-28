import { z } from "zod";

interface ConceptForPrompt {
  name: string;
  description: string;
  keyTermsJson: string;
  difficultyTier: 1 | 2 | 3;
}

/**
 * Generate practice questions prompt for a single concept.
 * Asks MiniMax for a JSON array of 5 questions covering all 4 types.
 * Optionally includes Wikipedia source material for grounding.
 */
export function generateQuestionsPrompt(
  concept: ConceptForPrompt,
  sourceChunks?: Array<{ pageTitle: string; sectionHeading: string; content: string; pageUrl: string }>
): string {
  const tierDifficulty = ({ 1: 0.3, 2: 0.6, 3: 0.8 } as Record<number, number>)[concept.difficultyTier] ?? 0.5;
  const keyTerms = (() => {
    try { return JSON.parse(concept.keyTermsJson).join(", "); } catch { return ""; }
  })();

  const sourceMaterial = sourceChunks
    ? `\nSOURCE MATERIAL FOR "${concept.name}":\n${sourceChunks
        .map(
          (c, i) =>
            `[${i + 1}] "${c.pageTitle}" — ${c.sectionHeading}\n${c.content}`
        )
        .join("\n\n")}\n`
    : "";

  return `Generate exactly 5 diverse practice questions for this learning concept.

Concept: ${concept.name}
Description: ${concept.description}
Key Terms: ${keyTerms || "N/A"}
Difficulty Tier: ${concept.difficultyTier} (1=foundational, 2=intermediate, 3=advanced)
${sourceMaterial}
Return a JSON array with no markdown fences, no extra text. Each object must include:
{
  "questionType": "mcq" | "fill_blank" | "flashcard" | "free_response",
  "questionText": "...",
  "correctAnswer": "...",
  "distractors": ["...", "...", "..."],   // exactly 3 for MCQ; empty array for other types
  "explanation": "...",
  "difficulty": ${tierDifficulty},
  "sources": [{"index": 1, "pageTitle": "...", "pageUrl": "..."}]
}

Rules:
- Include exactly 1 question of each type: mcq, fill_blank, flashcard, free_response (5th can be any type)
- MCQ distractors: plausible wrong answers (not obviously false)
- fill_blank: questionText has a ___ blank; correctAnswer fills the blank
- flashcard: questionText is the front of the card; correctAnswer is the back
- free_response: open-ended, no single correct answer; correctAnswer is a model answer
- Do not output markdown code blocks or any text outside the JSON array
- difficulty must be a float between 0.0 and 1.0
${
  sourceChunks
    ? `\nCITATION RULES (MANDATORY - source material provided):
- CRITICAL: You MUST include citations [N] in the questionText and/or explanation for every source you list
- Generate questions ONLY using information from the source material above (sections [1], [2], [3], etc)
- Include "sources" field: array of {index, pageTitle, pageUrl} - ONLY include sources you actually cite
- Add [N] citations to questionText: "According to [1], what is...?" or "Based on [1] and [2], which...?" or "In [1], it states..."
- Add [N] citations to explanation: "[1] explains that..." or "According to [1], the reason is..."
- RULE: If you include a source in the sources array, you MUST cite it with [N] at least once in questionText or explanation
- RULE: If you do NOT cite a source, DO NOT include it in the sources array
- Index numbers MUST match [N] from source material above
- VIOLATION: If sources are listed but not cited with [N], the sources will not be displayed to the user
- Do NOT fabricate information not in sources
- Example: Q: "According to [1], what is convergence?" + Explanation: "As [1] explains, convergence means..." + sources: [{index:1, pageTitle:"Convergence", pageUrl:"..."}]`
    : ""
}`;
}

/**
 * Zod schema for validating a single LLM-generated question.
 */
const QuestionSourceSchema = z.object({
  index: z.number(),
  pageTitle: z.string(),
  pageUrl: z.string(),
});

export const LLMQuestionItemSchema = z.object({
  questionType: z.enum(["mcq", "fill_blank", "flashcard", "free_response"]),
  questionText: z.string().min(5),
  correctAnswer: z.string().min(1),
  distractors: z.array(z.string()).default([]),
  explanation: z.string().default(""),
  difficulty: z.number().min(0).max(1).default(0.5),
  sources: z.array(QuestionSourceSchema).optional().default([]),
});

/**
 * Zod schema for validating the full LLM response (array of questions).
 * Use with parseLLMJson from schemas.ts before calling .safeParse().
 */
export const LLMQuestionSchema = z.array(LLMQuestionItemSchema).min(1);

export type LLMQuestionItem = z.infer<typeof LLMQuestionItemSchema>;
