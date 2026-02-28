import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/minimax-native";
import { parseLLMJson } from "@/lib/schemas";
import { generateQuestionsPrompt, LLMQuestionSchema } from "@/lib/prompts/questions";
import { searchWikipedia, fetchAndChunkPage } from "@/lib/rag/wikipedia";

/**
 * POST /api/study-plans/[id]/generate-questions
 *
 * Generate practice questions for all concepts in a study plan.
 * Questions are stored globally (per-concept) and reused across all graphs
 * where that concept appears.
 *
 * Request body:
 * {
 *   userId: string (required, for auth)
 * }
 *
 * Returns:
 * {
 *   questionCount: number,
 *   conceptsCovered: string[],
 *   message: string,
 *   conceptsThatFailed?: string[] (if any failed)
 * }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // MUST await params (Next.js 16)
  const body = await req.json().catch(() => ({}));
  const userId = (body as { userId?: string }).userId || req.headers.get("x-user-id") || "demo-user";

  // 0. Verify the study plan belongs to this user (auth)
  const studyPlan = await prisma.studyPlan.findUnique({
    where: { id },
  });

  if (!studyPlan) {
    return NextResponse.json({ error: "Study plan not found" }, { status: 404 });
  }

  if (studyPlan.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // 1. Load concepts for this study plan via UnitGraph → GraphMembership → Concept.
  //    Multiple UnitGraphs can exist per study plan, but concepts are global (user-scoped).
  const unitGraphs = await prisma.unitGraph.findMany({
    where: { studyPlanId: id },
    include: {
      memberships: {
        include: { concept: true },
      },
    },
  });

  if (unitGraphs.length === 0) {
    return NextResponse.json({ error: "Study plan not found or has no graphs" }, { status: 404 });
  }

  // Collect all unique concepts across all graphs in this study plan
  const conceptMap = new Map<string, any>();
  for (const unitGraph of unitGraphs) {
    for (const membership of unitGraph.memberships) {
      if (!conceptMap.has(membership.concept.id)) {
        conceptMap.set(membership.concept.id, {
          ...membership.concept,
          // Use depthTier from first occurrence; ideally this should be max across graphs
          difficultyTier: Math.min(3, Math.max(1, membership.depthTier || 1)) as 1 | 2 | 3,
        });
      }
    }
  }

  const concepts = Array.from(conceptMap.values());

  if (concepts.length === 0) {
    return NextResponse.json({ error: "No concepts in study plan" }, { status: 400 });
  }

  // 2. Idempotency check: if questions already exist for these concepts, track them.
  const conceptIds = concepts.map((c) => c.id);
  const existingQuestions = await prisma.question.findMany({
    where: { conceptId: { in: conceptIds } },
    select: { conceptId: true },
    distinct: ["conceptId"],
  });
  const existingConceptIds = existingQuestions.map((q) => q.conceptId);
  const conceptsNeedingQuestions = conceptIds.filter((id) => !existingConceptIds.includes(id));

  // If all concepts already have questions, return early
  if (conceptsNeedingQuestions.length === 0) {
    const totalCount = await prisma.question.count({
      where: { conceptId: { in: conceptIds } },
    });
    return NextResponse.json({
      questionCount: totalCount,
      conceptsCovered: existingConceptIds,
      message: "Questions already exist for all concepts in this study plan",
      alreadyGenerated: true,
    });
  }

  // 3. Generate questions per concept (skip deprecated and already-generated)
  //    Use parallel generation with concurrency limit to speed up large study plans
  const conceptsCovered: string[] = [];
  let totalGenerated = 0;
  const failedConcepts: string[] = [];

  // Filter concepts that need questions
  const conceptsToGenerate = concepts.filter(
    (c) => !c.isDeprecated && conceptsNeedingQuestions.includes(c.id)
  );

  // Helper function to generate questions for a single concept
  async function generateForConcept(concept: (typeof concepts)[0]) {
    try {
      // Fetch Wikipedia sources for this concept (fire and forget on errors)
      let sourceChunks: Array<{ pageTitle: string; sectionHeading: string; content: string; pageUrl: string }> = [];
      try {
        const searchResults = await searchWikipedia(concept.name, 2, ["wikipedia", "wikibooks"]);
        const chunkArrays = await Promise.all(
          searchResults.slice(0, 2).map((result) =>
            fetchAndChunkPage(result.key, result.source as "wikipedia" | "wikibooks", concept.id, id)
          )
        );
        const chunks = chunkArrays.flat().slice(0, 3); // Limit to 3 chunks per concept

        // Store chunks in database
        for (const chunk of chunks) {
          await prisma.sourceChunk.create({
            data: chunk,
          });
        }

        // Map to format expected by prompt
        sourceChunks = chunks.map((c) => ({
          pageTitle: c.pageTitle,
          sectionHeading: c.sectionHeading,
          content: c.content,
          pageUrl: c.pageUrl,
        }));
      } catch (err) {
        console.warn(`[generate-questions] Source fetch failed for "${concept.name}":`, err);
        // Continue without sources if fetch fails
      }

      const prompt = generateQuestionsPrompt(
        {
          name: concept.name,
          description: concept.description,
          keyTermsJson: concept.keyTermsJson,
          difficultyTier: concept.difficultyTier,
        },
        sourceChunks.length > 0 ? sourceChunks : undefined
      );

      // Call MiniMax — temperature 0.3, retry at 0.1 on failure
      let rawText: string;
      try {
        rawText = await generateText(
          [{ role: "user", content: "Generate the practice questions JSON array." }],
          prompt,
          { temperature: 0.3, maxTokens: 2048, model: "MiniMax-M2" }
        );
      } catch {
        // Retry at lower temperature for better JSON reliability
        rawText = await generateText(
          [{ role: "user", content: "Generate the practice questions JSON array." }],
          prompt,
          { temperature: 0.1, maxTokens: 2048, model: "MiniMax-M2" }
        );
      }

      // Parse JSON output
      const parsed = parseLLMJson(rawText);

      // Validate against schema
      const validated = LLMQuestionSchema.safeParse(parsed);
      if (!validated.success) {
        console.error(
          `[generate-questions] Validation failed for concept ${concept.id}:`,
          validated.error.message
        );
        return { success: false, conceptId: concept.id, error: "Validation failed" };
      }

      // Insert questions into DB
      // IMPORTANT: Only save sources if they're actually cited in the question text or explanation
      // This prevents storing orphaned source references that won't be rendered
      await prisma.question.createMany({
        data: validated.data.map((q) => {
          const hasCitationsInText = /\[\d+\]/.test(q.questionText);
          const hasCitationsInExplanation = /\[\d+\]/.test(q.explanation);
          const validSources = (hasCitationsInText || hasCitationsInExplanation) ? (q.sources || []) : [];

          return {
            conceptId: concept.id,
            questionType: q.questionType,
            questionText: q.questionText,
            correctAnswer: q.correctAnswer,
            distractorsJson: JSON.stringify(q.distractors),
            explanation: q.explanation,
            difficulty: q.difficulty,
            sourcesJson: JSON.stringify(validSources),
          };
        }),
      });

      return { success: true, conceptId: concept.id, count: validated.data.length };
    } catch (err) {
      console.error(`[generate-questions] Failed for concept ${concept.id}:`, err);
      return { success: false, conceptId: concept.id, error: String(err) };
    }
  }

  // Process concepts in parallel with concurrency limit of 3
  // This speeds up generation while avoiding API rate limits
  const CONCURRENCY_LIMIT = 3;
  const results: Array<{ success: boolean; conceptId: string; count?: number; error?: string }> = [];

  for (let i = 0; i < conceptsToGenerate.length; i += CONCURRENCY_LIMIT) {
    const batch = conceptsToGenerate.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(batch.map(generateForConcept));
    results.push(...batchResults);
  }

  // Process results
  for (const result of results) {
    if (result.success) {
      conceptsCovered.push(result.conceptId);
      totalGenerated += result.count || 0;
    } else {
      failedConcepts.push(result.conceptId);
    }
  }

  return NextResponse.json({
    questionCount: totalGenerated,
    conceptsCovered,
    message: `Generated ${totalGenerated} questions across ${conceptsCovered.length} concepts`,
    ...(failedConcepts.length > 0 && { conceptsThatFailed: failedConcepts }),
  });
}
