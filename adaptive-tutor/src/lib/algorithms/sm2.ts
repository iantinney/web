/**
 * SM-2 Spaced Repetition Algorithm
 *
 * Implementation of the SM-2 algorithm as specified in PHASE3-TECHNICAL-SPEC.md.
 * This module provides pure functions with no side effects.
 *
 * Quality score scale (0-5):
 *   5 - Perfect answer, immediate recall
 *   4 - Correct with hesitation
 *   3 - Correct with serious difficulty
 *   2 - Incorrect, but correct answer remembered
 *   1 - Incorrect, correct answer forgotten
 *   0 - Completely wrong
 */

/** SM-2 scheduling state for a single concept */
export interface SM2State {
  /** Ease factor — multiplier for interval growth. Initial: 2.5. Min: 1.3 */
  easeFactor: number;
  /** Days until next review */
  interval: number;
  /** Number of consecutive correct repetitions */
  repetitionCount: number;
}

/**
 * Update SM-2 state based on a quality score (0-5).
 *
 * Algorithm:
 * - If quality < 3: reset to beginning (interval=1, repetitionCount=0)
 * - If quality >= 3: increment repetitionCount and grow interval
 * - Always updates easeFactor (clamped to minimum 1.3)
 *
 * @param state - Current SM-2 state (not mutated)
 * @param quality - Answer quality score 0-5
 * @returns New SM-2 state
 */
export function updateSM2(state: SM2State, quality: number): SM2State {
  let { easeFactor, interval, repetitionCount } = state;

  if (quality < 3) {
    // Failed: reset to beginning
    repetitionCount = 0;
    interval = 1;
  } else {
    // Passed: advance repetition schedule
    repetitionCount++;
    if (repetitionCount === 1) {
      interval = 1;
    } else if (repetitionCount === 2) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
  }

  // Always update ease factor (uses quality, not the updated repetitionCount)
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  return { easeFactor, interval, repetitionCount };
}

/**
 * Compute the next due date by adding interval days to today.
 *
 * @param interval - Number of days until next review
 * @returns Date object set to today + interval days
 */
export function getNextDueDate(interval: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + interval);
  return date;
}

/**
 * Map user answer performance to a SM-2 quality score (0-5).
 *
 * Mapping:
 * - Incorrect answer → 1
 * - Correct + fast (< 10 seconds) → 5
 * - Correct + medium (10-29 seconds) → 4
 * - Correct + slow (>= 30 seconds) → 3
 *
 * @param isCorrect - Whether the user answered correctly
 * @param timeTaken - Time taken in milliseconds
 * @returns Quality score 0-5
 */
export function userAnswerToQuality(isCorrect: boolean, timeTaken: number): number {
  if (!isCorrect) return 1;

  if (timeTaken < 10000) return 5;
  if (timeTaken < 30000) return 4;
  return 3;
}
