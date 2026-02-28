import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Question type ordering for ease-in progression:
// MCQ first (lowest cognitive load), then flashcard/fill_blank, then free_response (hardest)
const TYPE_ORDER: Record<string, number> = {
  mcq: 0,
  flashcard: 1,
  fill_blank: 2,
  free_response: 3,
};

// Per-concept cap: select at most 3 questions per concept per session (covers 2-3 range from spec)
const PER_CONCEPT_CAP = 3;

// Default session length — matches DEFAULT_SESSION_LENGTH from spec (20 questions)
const DEFAULT_LIMIT = 20;

/**
 * Fisher-Yates shuffle: randomly reorder an array in-place
 */
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * GET /api/study-plans/[id]/questions
 *
 * Get a balanced, personalized set of practice questions for a study plan.
 * Questions are scored and prioritized by:
 * 1. Concept status (due, new, mastered)
 * 2. Prerequisite importance (prereqs weighted 2x)
 * 3. Overdue days (older reviews prioritized)
 * 4. User proficiency (easier questions for low proficiency)
 *
 * Query parameters:
 * - due=1 (optional): Only return overdue questions
 * - limit=20 (optional): Max questions to return (default 20, max 100)
 * - conceptId=string (optional): Filter to questions for a specific concept only
 * - userId=string (optional, preferred in header x-user-id)
 *
 * Returns:
 * {
 *   questions: array of question objects,
 *   metadata: { total, dueConceptCount }
 * }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // MUST await params (Next.js 16)
  const { searchParams } = new URL(req.url);
  const dueOnly = searchParams.get("due") === "1";
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10),
    100
  );
  const userId = searchParams.get("userId") || req.headers.get("x-user-id") || "demo-user";
  const targetConceptId = searchParams.get("conceptId") ?? null;

  // Parse locked concept IDs (comma-separated)
  const lockedConceptIdsStr = searchParams.get("locked") ?? "";
  const lockedConceptIds = new Set(
    lockedConceptIdsStr ? lockedConceptIdsStr.split(",") : []
  );

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

  // 1. Load concepts from ALL graphs in this study plan via UnitGraph → GraphMembership → Concept.
  //    Multiple UnitGraphs can exist per study plan.
  //    Concepts are global (user-scoped), so proficiency applies across all graphs.
  const unitGraphs = await prisma.unitGraph.findMany({
    where: { studyPlanId: id },
    include: {
      memberships: { include: { concept: true } },
      edges: true, // ConceptEdge records with unitGraphId set
    },
  });

  if (unitGraphs.length === 0) {
    return NextResponse.json({ error: "Study plan not found or has no graphs" }, { status: 404 });
  }

  // Collect all concepts and edges (concepts are global, edges are per-graph)
  const conceptMap = new Map<string, any>();
  const allEdges: any[] = [];

  for (const graph of unitGraphs) {
    // Collect unique concepts
    for (const membership of graph.memberships) {
      if (!conceptMap.has(membership.concept.id)) {
        conceptMap.set(membership.concept.id, membership.concept);
      }
    }
    // Collect all edges (from first graph is sufficient for prerequisite checking)
    allEdges.push(...graph.edges);
  }

  const allConcepts = Array.from(conceptMap.values());
  const now = new Date();

  // 2. Identify which Concept IDs are prerequisites for others.
  //    ConceptEdge.fromNodeId stores the Concept.id of the prerequisite concept.
  //    Collect from all graphs since edges are graph-scoped.
  const prereqConceptIds = new Set<string>();
  for (const edge of allEdges) {
    prereqConceptIds.add(edge.fromNodeId);
  }

  // 3. Filter concepts: due or new (nextDue <= now OR nextDue null), not deprecated
  //    Include mastered concepts for retention practice/spaced repetition
  const dueConcepts = allConcepts.filter((c) => {
    if (c.isDeprecated) return false;
    if (!dueOnly) return true;
    if (!c.nextDue) return true; // never practiced = always due
    return new Date(c.nextDue) <= now;
  });

  if (dueConcepts.length === 0) {
    return NextResponse.json({
      questions: [],
      metadata: {
        total: 0,
        dueConceptCount: 0,
        message: "All concepts mastered or not yet due",
      },
    });
  }

  // 4. Score concepts: prerequisites that are overdue get highest priority
  //    Score = prereqBoost * (1 + overdueDays)
  //    prereqBoost = 2.0 for prereqs, 1.0 otherwise
  let scoredConcepts = dueConcepts
    .map((c) => {
      const isPrereq = prereqConceptIds.has(c.id);
      let overdueDays = 0;
      if (c.nextDue) {
        overdueDays = Math.max(
          0,
          (now.getTime() - new Date(c.nextDue).getTime()) / 86400000
        );
      }
      const score = (isPrereq ? 2.0 : 1.0) * (1 + overdueDays);
      return { concept: c, score, isPrereq };
    })
    .sort((a, b) => b.score - a.score);

  // 4a. Optional: filter to a specific concept if conceptId provided
  if (targetConceptId) {
    scoredConcepts = scoredConcepts.filter(({ concept }) => concept.id === targetConceptId);
  }

  // 4b. Filter out locked concepts
  if (lockedConceptIds.size > 0) {
    scoredConcepts = scoredConcepts.filter(({ concept }) => !lockedConceptIds.has(concept.id));
  }

  // 5. Fetch ALL questions for all due concepts in ONE query (avoid N+1 anti-pattern)
  const dueConceptIds = scoredConcepts.map(({ concept }) => concept.id);
  const allQuestionsRaw = await prisma.question.findMany({
    where: { conceptId: { in: dueConceptIds } },
  });

  // Build a Map for O(1) lookup: conceptId -> Question[]
  // NOTE: We do NOT filter out previously attempted questions here.
  // SM-2 spaced repetition is specifically designed to re-ask the same questions
  // at increasing intervals. Filtering them out would defeat the algorithm entirely.
  const questionsByConceptId = new Map<string, typeof allQuestionsRaw>();
  for (const q of allQuestionsRaw) {
    if (!questionsByConceptId.has(q.conceptId || "")) {
      questionsByConceptId.set(q.conceptId || "", []);
    }
    questionsByConceptId.get(q.conceptId || "")!.push(q);
  }

  // 5a. For each concept (in priority order), select questions:
  //    - Apply difficulty-to-proficiency filter (proficiency < 0.4 → prefer easy types)
  //    - Sort by type ease-in order (MCQ first → flashcard/fill_blank → free_response)
  //    - Apply per-concept cap (max PER_CONCEPT_CAP questions per concept)
  //    - Track session-level type counts for diversity
  const selectedQuestions: Array<{
    id: string;
    conceptId: string;
    conceptName: string;
    questionType: string;
    questionText: string;
    correctAnswer: string;
    distractorsJson: string;
    explanation: string;
    difficulty: number;
    createdAt: string;
    sources?: Array<{ index: number; pageTitle: string; pageUrl: string }>;
  }> = [];

  // Session-level type tracking for diversity
  const sessionTypeCount: Record<string, number> = {};

  for (const { concept } of scoredConcepts) {
    if (selectedQuestions.length >= limit) break;

    // Retrieve questions for this concept from Map (O(1) lookup, no DB query)
    const conceptQuestions = questionsByConceptId.get(concept.id) ?? [];

    if (conceptQuestions.length === 0) continue;

    const proficiency = concept.proficiency;

    // Sort by composite score with reduced type bias (more balanced approach)
    // - At low proficiency: moderately prefer easier types, but still allow variety
    // - At high proficiency: nearly equal weighting for all types (full diversity)
    const sorted = [...conceptQuestions].sort((a, b) => {
      const typeOrderA = TYPE_ORDER[a.questionType] ?? 99;
      const typeOrderB = TYPE_ORDER[b.questionType] ?? 99;

      // Reduced type weighting (was Math.max(0.3, 1.0 - proficiency), now 0.05-0.2)
      // This allows free_response and fill_blank to be selected regularly
      // At proficiency 0.0: typeWeight = 0.2 (mild preference for MCQ)
      // At proficiency 1.0: typeWeight = 0.05 (nearly neutral)
      const typeWeight = Math.max(0.05, 0.2 - proficiency * 0.15);
      const typeScoreA = typeOrderA * typeWeight;
      const typeScoreB = typeOrderB * typeWeight;

      // Difficulty-based weighting (unchanged)
      const diffWeight = Math.max(0.2, 1.0 - proficiency * 0.5);
      const diffScoreA = a.difficulty * diffWeight;
      const diffScoreB = b.difficulty * diffWeight;

      // Combined score
      const scoreA = typeScoreA + diffScoreA;
      const scoreB = typeScoreB + diffScoreB;
      return scoreA - scoreB;
    });

    // Select PER_CONCEPT_CAP questions, respecting BOTH per-concept AND session-level diversity
    const capped: typeof conceptQuestions = [];
    const conceptTypeCount: Record<string, number> = {};

    for (const q of sorted) {
      if (capped.length >= PER_CONCEPT_CAP) break;
      const qType = q.questionType;
      conceptTypeCount[qType] = (conceptTypeCount[qType] ?? 0) + 1;
      sessionTypeCount[qType] = (sessionTypeCount[qType] ?? 0) + 1;

      // Per-concept constraint: max 2 of same type
      const maxSameTypePerConcept = proficiency < 0.3 ? 3 : 2;

      // Session-level constraint: try to balance types across session
      // Max questions of one type = 40% of limit (e.g., 8 MCQ out of 20)
      const maxSameTypePerSession = Math.ceil(limit * 0.4);

      if (
        conceptTypeCount[qType] <= maxSameTypePerConcept &&
        sessionTypeCount[qType] <= maxSameTypePerSession
      ) {
        capped.push(q);
      }
    }

    // Fallback: if diversity constraint excluded too many, just take top 3 as-is
    if (capped.length === 0) {
      capped.push(...sorted.slice(0, PER_CONCEPT_CAP));
      // Update session count for fallback selections
      for (const q of capped) {
        sessionTypeCount[q.questionType] = (sessionTypeCount[q.questionType] ?? 0) + 1;
      }
    }

    selectedQuestions.push(
      ...capped.map((q) => {
        let sources: Array<{ index: number; pageTitle: string; pageUrl: string }> = [];
        try {
          if (q.sourcesJson) {
            sources = JSON.parse(q.sourcesJson);
          }
        } catch {
          // If parsing fails, just use empty array
          sources = [];
        }

        // CRITICAL FIX: Only include sources if they're actually cited in the text
        // The LLM should add [N] citations to questionText and explanation when sources are provided.
        // If citations are missing, it means the LLM didn't properly reference the sources,
        // so don't return them to the frontend (prevents citation badges for non-existent citations)
        const hasCitationsInText = /\[\d+\]/.test(q.questionText);
        const hasCitationsInExplanation = /\[\d+\]/.test(q.explanation);
        const validSources = hasCitationsInText || hasCitationsInExplanation ? sources : [];

        return {
          id: q.id,
          conceptId: q.conceptId ?? "",
          conceptName: concept.name,
          questionType: q.questionType,
          questionText: q.questionText,
          correctAnswer: q.correctAnswer,
          distractorsJson: q.distractorsJson,
          explanation: q.explanation,
          difficulty: q.difficulty,
          createdAt: q.createdAt.toISOString(),
          sources: validSources,
        };
      })
    );
  }

  // Apply overall session limit and deduplicate (same question ID can appear from different concepts)
  const seenQuestionIds = new Set<string>();
  const deduplicatedQuestions = selectedQuestions.filter((q) => {
    if (seenQuestionIds.has(q.id)) return false; // Skip duplicate
    seenQuestionIds.add(q.id);
    return true;
  });

  // Sort by sources first: questions with citations appear before questions without
  // This prioritizes RAG-sourced questions to the top of the session
  const sortedBySource = deduplicatedQuestions.sort((a, b) => {
    const aHasSources = (a.sources && a.sources.length > 0) ? 1 : 0;
    const bHasSources = (b.sources && b.sources.length > 0) ? 1 : 0;
    return bHasSources - aHasSources; // Descending: sources first
  });

  // Randomize question order within each source group for better learning variety
  // Group by source presence, then shuffle within groups
  const withSources = sortedBySource.filter(q => q.sources && q.sources.length > 0);
  const withoutSources = sortedBySource.filter(q => !q.sources || q.sources.length === 0);
  const finalQuestions = [
    ...shuffle(withSources).slice(0, limit),
    ...shuffle(withoutSources).slice(0, Math.max(0, limit - withSources.length))
  ].slice(0, limit);

  return NextResponse.json({
    questions: finalQuestions,
    metadata: {
      total: finalQuestions.length,
      dueConceptCount: dueConcepts.length,
    },
  });
}
