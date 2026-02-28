/**
 * Proficiency inference utility
 * Estimates initial proficiency based on stated prior knowledge and difficulty tier
 */

export function inferInitialProficiency(
  priorKnowledge: string,
  _conceptName: string,
  difficultyTier: 1 | 2 | 3
): { proficiency: number; confidence: number } {
  if (!priorKnowledge || priorKnowledge.trim().length === 0) {
    return { proficiency: 0, confidence: 0 }; // untested/gray
  }

  const lower = priorKnowledge.toLowerCase();

  // Detect self-described level
  const isExpert =
    lower.includes("expert") ||
    lower.includes("phd") ||
    lower.includes("years of experience") ||
    lower.includes("professional");
  const isIntermediate =
    lower.includes("some") ||
    lower.includes("familiar") ||
    lower.includes("worked with") ||
    lower.includes("took a course") ||
    lower.includes("basic understanding");

  // Base proficiency by level
  const baseProficiency = isExpert ? 0.7 : isIntermediate ? 0.4 : 0.15;
  const baseConfidence = isExpert ? 0.3 : isIntermediate ? 0.25 : 0.2;

  // Adjust down for higher difficulty tier concepts
  const tierPenalty = (difficultyTier - 1) * 0.15;

  return {
    proficiency: Math.max(0, Math.min(1, baseProficiency - tierPenalty)),
    confidence: baseConfidence,
  };
}

/**
 * Update proficiency and confidence after a practice attempt.
 * Correct answers boost proficiency; incorrect answers apply a tier-scaled penalty.
 * Tier 3 incorrect penalizes more than tier 1 incorrect.
 */
export function updateProficiencyFromAttempt(
  currentProficiency: number,
  confidence: number,
  isCorrect: boolean,
  difficultyTier: 1 | 2 | 3
): { proficiency: number; confidence: number } {
  let newProf = currentProficiency;
  let newConf = confidence;

  const baseGain = 0.05;
  const tierPenalty = ({ 1: 0.03, 2: 0.05, 3: 0.07 } as const)[difficultyTier];
  const confBoost = 0.1;

  if (isCorrect) {
    const boost = baseGain + (confidence * confBoost);
    newProf = Math.min(1.0, currentProficiency + boost);
    newConf = Math.min(1.0, confidence + 0.05);
  } else {
    newProf = Math.max(0.0, currentProficiency - tierPenalty);
    newConf = Math.max(0.0, confidence - 0.1);
  }

  return { proficiency: newProf, confidence: newConf };
}
