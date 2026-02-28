// ---------------------------------------------------------------------------
// Zod validation schemas for LLM outputs and API inputs
// ---------------------------------------------------------------------------

import { z } from "zod";

// ── LLM Output Schemas ─────────────────────────────────────────────────────

export const LLMConceptNodeSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  keyTerms: z.array(z.string()).default([]),
  difficultyTier: z.number().int().min(1).max(3).default(1),
});

export const LLMConceptEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  edgeType: z.enum(["prerequisite", "helpful"]).optional().default("prerequisite"),
});

export const LLMConceptGraphSchema = z.object({
  concepts: z.array(LLMConceptNodeSchema).min(3),
  edges: z.array(LLMConceptEdgeSchema).default([]),
});

const QuestionSourceSchema = z.object({
  index: z.number(),
  pageTitle: z.string(),
  pageUrl: z.string(),
});

export const LLMQuestionSchema = z.object({
  questionType: z.enum(["flashcard", "fill_blank", "free_response", "mcq"]),
  questionText: z.string().min(1),
  correctAnswer: z.string().min(1),
  distractors: z.array(z.string()).optional().default([]),
  explanation: z.string().default(""),
  difficulty: z.number().min(0).max(1).default(0.5),
  sources: z.array(QuestionSourceSchema).optional().default([]),
});

export const LLMQuestionsArraySchema = z.array(LLMQuestionSchema);

export const LLMEvaluationSchema = z.object({
  isCorrect: z.boolean(),
  score: z.number().min(0).max(1),
  feedback: z.string(),
  misconceptions: z.array(z.string()).default([]),
});

const GapAnalysisSchema = z.object({
  missingConcept: z.string().describe("Name of the missing prerequisite"),
  severity: z.enum(["NARROW", "MODERATE", "BROAD"]),
  explanation: z.string().describe("Why the answer reveals this gap"),
});

export const LLMEnhancedEvaluationSchema = z.object({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  feedback: z.string(),
  explanation: z.string(),
  errorType: z.enum(["CORRECT", "MINOR", "MISCONCEPTION", "PREREQUISITE_GAP"]),
  gapAnalysis: GapAnalysisSchema.optional(),
});

export type EnhancedEvaluationResult = z.infer<typeof LLMEnhancedEvaluationSchema>;

// ── API Input Schemas ──────────────────────────────────────────────────────

export const CreateStudyPlanSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  sourceText: z.string().min(1, "Source text or description is required"),
  targetDate: z.string().nullable().optional().default(null),
});

export const SubmitAttemptSchema = z.object({
  questionId: z.string().min(1),
  userAnswer: z.string(),
  timeTaken: z.number().int().min(0).optional().default(0),
  sessionId: z.string().nullable().optional().default(null),
});

// ── Helper: lenient JSON parse ─────────────────────────────────────────────

/**
 * Parse LLM output as JSON with fallbacks for common issues:
 * - Strip markdown code fences
 * - Handle trailing commas
 * - Extract JSON from text if wrapped
 * - Handle incomplete JSON
 */
export function parseLLMJson(raw: string): unknown {
  // Strip markdown fences
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try removing trailing commas
    const noTrailing = cleaned.replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(noTrailing);
    } catch {
      // Try to extract JSON object from the response
      // Look for { at start and } at end
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extracted = jsonMatch[0];
        try {
          return JSON.parse(extracted);
        } catch {
          // Try the extracted JSON with trailing commas removed
          const extractedNoTrailing = extracted.replace(/,\s*([}\]])/g, "$1");
          try {
            return JSON.parse(extractedNoTrailing);
          } catch {
            // Auto-complete incomplete JSON by adding missing closing brackets
            let repaired = extracted;
            // Close unclosed strings
            const openQuotes = (repaired.match(/(?<!\\)"/g) || []).length;
            if (openQuotes % 2 === 1) {
              repaired += '"';
            }
            // Close unclosed objects/arrays
            const openBrackets = (repaired.match(/[{[]/g) || []).length;
            const closeBrackets = (repaired.match(/[}\]]/g) || []).length;
            for (let i = closeBrackets; i < openBrackets; i++) {
              repaired += repaired.lastIndexOf('{') > repaired.lastIndexOf('[') ? '}' : ']';
            }
            try {
              return JSON.parse(repaired);
            } catch {
              throw new Error(`Failed to parse even with repair: ${extracted.slice(0, 150)}...`);
            }
          }
        }
      }
      throw new Error(`Failed to parse LLM JSON output: ${cleaned.slice(0, 200)}...`);
    }
  }
}
