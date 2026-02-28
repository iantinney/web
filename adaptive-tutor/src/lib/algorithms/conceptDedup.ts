import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/utils";

/**
 * Normalize concept name for deduplication:
 * trim + lowercase
 */
export function normalizeConceptName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Find or create a concept with automatic deduplication.
 *
 * If a concept with the same userId and nameNormalized exists,
 * merges it using confidence-weighted average for proficiency.
 * Otherwise creates a new concept.
 *
 * Returns { id, wasReused } where wasReused indicates if concept existed.
 */
export async function findOrCreateConcept(
  userId: string,
  name: string,
  description: string,
  keyTerms: string[],
  proficiency: number,
  confidence: number
): Promise<{ id: string; wasReused: boolean }> {
  const nameNormalized = normalizeConceptName(name);

  // Check if concept already exists
  const existing = await prisma.concept.findFirst({
    where: { userId, nameNormalized },
  });

  if (existing) {
    // Merge with confidence-weighted average
    const totalConf = existing.confidence + confidence;
    const mergedProf =
      totalConf > 0
        ? (existing.proficiency * existing.confidence +
            proficiency * confidence) /
          totalConf
        : 0;
    const mergedConf = Math.max(existing.confidence, confidence);

    await prisma.concept.update({
      where: { id: existing.id },
      data: {
        proficiency: mergedProf,
        confidence: mergedConf,
        description: description || existing.description,
        keyTermsJson: toJson(keyTerms) || existing.keyTermsJson,
      },
    });

    return { id: existing.id, wasReused: true };
  }

  // Create new concept
  const newConcept = await prisma.concept.create({
    data: {
      userId,
      name,
      nameNormalized,
      description,
      keyTermsJson: toJson(keyTerms),
      proficiency,
      confidence,
      easeFactor: 2.5,
      interval: 1,
      repetitionCount: 0,
      lastPracticed: null,
      nextDue: null,
      attemptCount: 0,
      isDeprecated: false,
      isManuallyAdjusted: false,
    },
  });

  return { id: newConcept.id, wasReused: false };
}
