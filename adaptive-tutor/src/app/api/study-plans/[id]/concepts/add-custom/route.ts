import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findOrCreateConcept } from "@/lib/algorithms/conceptDedup";
import { computeForceLayout } from "@/lib/algorithms/forceLayout";
import { edgeInferencePrompt } from "@/lib/prompts";
import { generateText } from "@/lib/minimax-native";
import { parseLLMJson } from "@/lib/schemas";
import { validateDAG } from "@/lib/algorithms/graphValidator";
import { toJson } from "@/lib/utils";

/**
 * POST /api/study-plans/[id]/concepts/add-custom
 * Add a user-defined custom concept to the knowledge graph.
 * The LLM infers edge connections automatically.
 * Questions are NOT generated here — deferred to on-demand at practice time.
 *
 * Body: { unitGraphId: string, conceptName: string }
 * Returns: { conceptId, membership, edges, layout, edgeInferenceError? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // MUST await params (Next.js 16)
    const body = await request.json();
    const { unitGraphId, conceptName } = body;

    if (!unitGraphId || !conceptName) {
      return NextResponse.json(
        { error: "unitGraphId and conceptName are required" },
        { status: 400 }
      );
    }

    const userId = request.headers.get("x-user-id") || "demo-user";

    // Verify study plan exists and belongs to user
    const studyPlan = await prisma.studyPlan.findUnique({
      where: { id },
    });
    if (!studyPlan || studyPlan.userId !== userId) {
      return NextResponse.json(
        { error: "Study plan not found or unauthorized" },
        { status: 404 }
      );
    }

    // Fetch all existing concepts in this unitGraph
    const existingMemberships = await prisma.graphMembership.findMany({
      where: { unitGraphId },
      include: { concept: true },
    });

    const existingConcepts = existingMemberships.map((m) => ({
      id: m.concept.id,
      name: m.concept.name,
      description: m.concept.description ?? "",
    }));

    // -- LLM edge inference ---------------------------------------------------
    let suggestedDescription = "";
    let suggestedKeyTerms: string[] = [];
    let suggestedDifficultyTier = 2;
    let inferredEdges: {
      existingConceptId: string;
      direction: string;
      confidence: number;
    }[] = [];
    let edgeInferenceError = false;

    try {
      const prompt = edgeInferencePrompt(conceptName, existingConcepts);

      const rawText = await generateText(
        [
          {
            role: "user",
            content: `Connect "${conceptName}" to this knowledge graph.`,
          },
        ],
        prompt,
        { temperature: 0.2, maxTokens: 2048, model: "MiniMax-M2" }
      );

      const parsed = parseLLMJson(rawText) as {
        edges?: {
          existingConceptId?: string;
          direction?: string;
          confidence?: number;
        }[];
        suggestedDescription?: string;
        suggestedDifficultyTier?: number;
        suggestedKeyTerms?: string[];
      };

      suggestedDescription = parsed.suggestedDescription || "";
      suggestedKeyTerms = Array.isArray(parsed.suggestedKeyTerms)
        ? parsed.suggestedKeyTerms
        : [];
      suggestedDifficultyTier =
        typeof parsed.suggestedDifficultyTier === "number"
          ? Math.max(1, Math.min(3, parsed.suggestedDifficultyTier))
          : 2;

      // Validate each inferred edge: only keep ones referencing existing concepts
      const existingConceptIdSet = new Set(existingConcepts.map((c) => c.id));
      if (Array.isArray(parsed.edges)) {
        inferredEdges = parsed.edges.filter(
          (e) =>
            e &&
            typeof e.existingConceptId === "string" &&
            existingConceptIdSet.has(e.existingConceptId) &&
            (e.direction === "prerequisite_of" ||
              e.direction === "dependent_on")
        ) as typeof inferredEdges;
      }

      console.log(
        `[add-custom] LLM inferred ${inferredEdges.length} valid edges for "${conceptName}"`
      );
    } catch (err) {
      // Graceful degradation: create concept with no edges
      console.error("[add-custom] Edge inference failed:", err);
      edgeInferenceError = true;
    }

    // -- Create new concept ---------------------------------------------------
    const { id: newConceptId } = await findOrCreateConcept(
      userId,
      conceptName,
      suggestedDescription,
      suggestedKeyTerms,
      0.0, // starting proficiency
      0.0 // starting confidence
    );

    // Update concept with description/keyTerms if findOrCreate reused an existing one
    // that had empty fields
    if (suggestedDescription || suggestedKeyTerms.length > 0) {
      await prisma.concept.update({
        where: { id: newConceptId },
        data: {
          ...(suggestedDescription ? { description: suggestedDescription } : {}),
          ...(suggestedKeyTerms.length > 0
            ? { keyTermsJson: toJson(suggestedKeyTerms) }
            : {}),
        },
      });
    }

    // -- Create GraphMembership -----------------------------------------------
    // Clamp depthTier to [1, maxExistingTier + 1]
    const maxExistingTier = existingMemberships.reduce(
      (max, m) => Math.max(max, m.depthTier),
      1
    );
    const clampedTier = Math.max(
      1,
      Math.min(suggestedDifficultyTier, maxExistingTier + 1)
    );

    let newMembership = await prisma.graphMembership.findUnique({
      where: {
        conceptId_unitGraphId: {
          conceptId: newConceptId,
          unitGraphId,
        },
      },
    });

    if (!newMembership) {
      newMembership = await prisma.graphMembership.create({
        data: {
          conceptId: newConceptId,
          unitGraphId,
          depthTier: clampedTier,
          positionX: 0,
          positionY: 0,
          addedBy: "user",
        },
      });
    }

    // -- Create edges ---------------------------------------------------------
    const createdEdges: { from: string; to: string; id: string }[] = [];
    const newEdgeRecords: { from: string; to: string }[] = [];

    for (const inferredEdge of inferredEdges) {
      let fromId: string;
      let toId: string;

      if (inferredEdge.direction === "prerequisite_of") {
        // Existing concept is prerequisite OF new concept
        fromId = inferredEdge.existingConceptId;
        toId = newConceptId;
      } else {
        // direction === "dependent_on": new concept is prerequisite OF existing
        fromId = newConceptId;
        toId = inferredEdge.existingConceptId;
      }

      // Check if edge already exists
      const existing = await prisma.conceptEdge.findFirst({
        where: { fromNodeId: fromId, toNodeId: toId, unitGraphId },
      });

      if (existing) {
        createdEdges.push({ from: fromId, to: toId, id: existing.id });
      } else {
        try {
          const edge = await prisma.conceptEdge.create({
            data: {
              fromNodeId: fromId,
              toNodeId: toId,
              unitGraphId,
              studyPlanId: id,
              edgeType: "prerequisite",
            },
          });
          createdEdges.push({ from: fromId, to: toId, id: edge.id });
          newEdgeRecords.push({ from: fromId, to: toId });
        } catch (err) {
          // Unique constraint violation — skip silently
          console.warn("[add-custom] Edge creation skipped (duplicate):", err);
        }
      }
    }

    // -- DAG validation (cycle check) -----------------------------------------
    // Fetch all edges for this graph after insertions
    const allMembershipsAfter = await prisma.graphMembership.findMany({
      where: { unitGraphId },
      include: { concept: true },
    });

    const allEdgesAfter = await prisma.conceptEdge.findMany({
      where: { unitGraphId },
    });

    const dagResult = validateDAG(
      allMembershipsAfter.map((m) => ({
        id: m.conceptId,
        name: m.concept.name,
      })),
      allEdgesAfter.map((e) => ({ from: e.fromNodeId, to: e.toNodeId }))
    );

    if (!dagResult.isDAG) {
      // Remove edges we just created that participate in cycles
      const cyclicSet = new Set(dagResult.cyclicNodes ?? []);
      for (const newEdge of newEdgeRecords) {
        if (cyclicSet.has(newEdge.from) || cyclicSet.has(newEdge.to)) {
          console.log(
            `[add-custom] Removing cycle-creating edge: ${newEdge.from} -> ${newEdge.to}`
          );
          await prisma.conceptEdge.deleteMany({
            where: {
              fromNodeId: newEdge.from,
              toNodeId: newEdge.to,
              unitGraphId,
            },
          });
          // Remove from createdEdges list
          const idx = createdEdges.findIndex(
            (e) => e.from === newEdge.from && e.to === newEdge.to
          );
          if (idx >= 0) createdEdges.splice(idx, 1);
        }
      }
    }

    // -- Compute force layout -------------------------------------------------
    const membershipsForLayout = await prisma.graphMembership.findMany({
      where: { unitGraphId },
    });
    const edgesForLayout = await prisma.conceptEdge.findMany({
      where: { unitGraphId },
    });

    const positions = computeForceLayout(
      membershipsForLayout.map((m) => ({
        id: m.conceptId,
        depthTier: m.depthTier,
      })),
      edgesForLayout.map((e) => ({ source: e.fromNodeId, target: e.toNodeId }))
    );

    // Convert Map to plain object for JSON response
    const layout: Record<string, { x: number; y: number }> = {};
    positions.forEach((pos, nodeId) => {
      layout[nodeId] = pos;
    });

    // Batch-persist positions using $transaction
    await prisma.$transaction(
      membershipsForLayout.map((m) => {
        const pos = positions.get(m.conceptId) ?? { x: 0, y: 0 };
        return prisma.graphMembership.update({
          where: {
            conceptId_unitGraphId: {
              conceptId: m.conceptId,
              unitGraphId,
            },
          },
          data: {
            positionX: pos.x,
            positionY: pos.y,
          },
        });
      })
    );

    return NextResponse.json({
      conceptId: newConceptId,
      membership: newMembership,
      edges: createdEdges,
      layout,
      ...(edgeInferenceError ? { edgeInferenceError: true } : {}),
    });
  } catch (error) {
    console.error("[add-custom] Error adding custom concept:", error);
    return NextResponse.json(
      { error: "Failed to add custom concept" },
      { status: 500 }
    );
  }
}
