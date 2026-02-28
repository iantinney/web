// ---------------------------------------------------------------------------
// Adaptive question selection algorithm
// ---------------------------------------------------------------------------

import type { Concept, Question } from "@/lib/types";
import { safeJsonParse } from "@/lib/utils";
import {
  ELO_K_FACTOR,
  TARGET_SUCCESS_RATE,
  PROFICIENCY_MASTERED,
} from "@/lib/config";

interface ConceptWithEdges extends Concept {
  prerequisiteIds: string[];
  dependentIds: string[];
}

/**
 * Compute a priority score for a concept to determine testing order.
 * Higher score = should be tested sooner.
 *
 * Score = uncertainty × importance × prerequisiteReadiness
 */
export function conceptPriorityScore(
  concept: ConceptWithEdges,
  allConcepts: Map<string, ConceptWithEdges>
): number {
  // Uncertainty: how little we know (inverse of confidence)
  const uncertainty = 1 - concept.confidence;

  // Importance: number of concepts that depend on this one (centrality)
  const importance = 1 + concept.dependentIds.length * 0.5;

  // Prerequisite readiness: are prerequisites mastered?
  let readiness = 1.0;
  if (concept.prerequisiteIds.length > 0) {
    const prereqsMastered = concept.prerequisiteIds.filter((pid) => {
      const prereq = allConcepts.get(pid);
      return prereq && prereq.proficiency >= PROFICIENCY_MASTERED;
    }).length;
    readiness = concept.prerequisiteIds.length > 0
      ? prereqsMastered / concept.prerequisiteIds.length
      : 1.0;
  }

  // Skip deprecated concepts
  if (concept.isDeprecated) return -1;

  // Skip already mastered concepts (low priority)
  if (concept.proficiency >= PROFICIENCY_MASTERED && concept.confidence > 0.5) {
    return 0.1;
  }

  return uncertainty * importance * readiness;
}

/**
 * Select the next concepts to test, ordered by priority.
 */
export function selectConceptsForSession(
  concepts: ConceptWithEdges[],
  sessionType: "diagnosis" | "practice" | "review",
  maxConcepts: number = 10
): ConceptWithEdges[] {
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  if (sessionType === "diagnosis") {
    // For diagnosis: start with high-level concepts (if they get these right,
    // we can infer prerequisite mastery)
    return [...concepts]
      .filter((c) => !c.isDeprecated)
      .sort((a, b) => {
        // Prefer concepts with more dependents (higher-level)
        const aScore = a.dependentIds.length - a.prerequisiteIds.length;
        const bScore = b.dependentIds.length - b.prerequisiteIds.length;
        // Also factor in uncertainty
        const aUncertainty = 1 - a.confidence;
        const bUncertainty = 1 - b.confidence;
        return (bScore + bUncertainty * 2) - (aScore + aUncertainty * 2);
      })
      .slice(0, maxConcepts);
  }

  if (sessionType === "review") {
    // For review: concepts that are due for spaced repetition
    const now = new Date().toISOString();
    return [...concepts]
      .filter((c) => !c.isDeprecated && c.nextDue && c.nextDue <= now)
      .sort((a, b) => {
        // Most overdue first
        const aOverdue = a.nextDue ? new Date(a.nextDue).getTime() : 0;
        const bOverdue = b.nextDue ? new Date(b.nextDue).getTime() : 0;
        return aOverdue - bOverdue;
      })
      .slice(0, maxConcepts);
  }

  // Practice: use priority scoring
  return [...concepts]
    .map((c) => ({
      concept: c,
      score: conceptPriorityScore(c, conceptMap),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxConcepts)
    .map((item) => item.concept);
}

/**
 * Select the next question for a given concept based on difficulty targeting.
 *
 * Note: Question freshness is determined by sessionId via AttemptRecord (Pushback A).
 * Questions are "fresh" if they haven't been attempted in the current session.
 * Question filtering by session should happen in Phase 3 when building the question list.
 */
export function selectQuestion(
  questions: Question[],
  currentProficiency: number
): Question | null {
  if (questions.length === 0) return null;

  // Target difficulty: slightly above current proficiency (zone of proximal development)
  const targetDifficulty = Math.min(currentProficiency + 0.15, 1.0);

  // Sort by closeness to target difficulty
  return questions.sort((a, b) => {
    const aDist = Math.abs(a.difficulty - targetDifficulty);
    const bDist = Math.abs(b.difficulty - targetDifficulty);
    return aDist - bDist;
  })[0];
}

/**
 * Update proficiency after an attempt using Elo-like adjustment.
 *
 * proficiency += K × (outcome - expected)
 * where expected = sigmoid(proficiency - difficulty)
 */
export function updateProficiency(
  currentProficiency: number,
  currentConfidence: number,
  questionDifficulty: number,
  isCorrect: boolean,
  score: number = isCorrect ? 1 : 0
): { proficiency: number; confidence: number } {
  // Expected probability of correct answer
  const expected = 1 / (1 + Math.exp(-(currentProficiency - questionDifficulty) * 4));

  // Update proficiency
  const outcome = score;
  const newProficiency = Math.max(
    0,
    Math.min(1, currentProficiency + ELO_K_FACTOR * (outcome - expected))
  );

  // Confidence increases with each attempt (diminishing returns)
  const newConfidence = Math.min(1, currentConfidence + 0.15 * (1 - currentConfidence));

  return { proficiency: newProficiency, confidence: newConfidence };
}

/**
 * When a user correctly answers a higher-level concept, boost confidence
 * in its prerequisites proportionally.
 */
export function propagatePrerequisiteConfidence(
  conceptId: string,
  allConcepts: Map<string, ConceptWithEdges>,
  isCorrect: boolean
): Map<string, { proficiency: number; confidence: number }> {
  const updates = new Map<string, { proficiency: number; confidence: number }>();
  const concept = allConcepts.get(conceptId);
  if (!concept || !isCorrect) return updates;

  // If correct on a high-level concept, slightly boost prerequisite confidence
  const boostFactor = 0.1;
  for (const prereqId of concept.prerequisiteIds) {
    const prereq = allConcepts.get(prereqId);
    if (!prereq) continue;

    updates.set(prereqId, {
      proficiency: Math.min(1, prereq.proficiency + boostFactor * (1 - prereq.proficiency)),
      confidence: Math.min(1, prereq.confidence + 0.05),
    });
  }

  return updates;
}
