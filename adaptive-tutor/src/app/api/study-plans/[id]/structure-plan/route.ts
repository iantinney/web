import { NextRequest, NextResponse } from "next/server";
import { findUnique } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { LLMConceptGraphSchema, parseLLMJson } from "@/lib/schemas";
import { validateDAG, breakCycles } from "@/lib/algorithms/graphValidator";
import { computeForceLayout } from "@/lib/algorithms/forceLayout";
import { generateText } from "@/lib/minimax-native";
import { structureLessonPlanPrompt } from "@/lib/prompts";
import { inferInitialProficiency } from "@/lib/algorithms/proficiency";
import { findOrCreateConcept } from "@/lib/algorithms/conceptDedup";
import type { StudyPlan, ConceptEdge } from "@/lib/types";

/**
 * POST /api/study-plans/[id]/structure-plan
 *
 * Converts a text lesson plan into a structured concept graph.
 *
 * Request body:
 * {
 *   textPlan: string,           // The text lesson plan from the model proposal
 *   priorKnowledge?: string     // User's stated prior knowledge (for proficiency inference)
 * }
 *
 * Returns:
 * {
 *   lessonPlan: {
 *     totalConcepts: number,
 *     tier1: string[],
 *     tier2: string[],
 *     tier3: string[]
 *   }
 * }
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const textPlan = (body as { textPlan?: string }).textPlan ?? "";
    const priorKnowledge = (body as { priorKnowledge?: string }).priorKnowledge ?? "";
    const userId = (body as { userId?: string }).userId ?? "demo-user";

    if (!textPlan || textPlan.trim().length === 0) {
      return NextResponse.json(
        { error: "textPlan is required" },
        { status: 400 }
      );
    }

    // Verify study plan exists
    const plan = await findUnique<StudyPlan>("studyPlans", id);
    if (!plan) {
      return NextResponse.json({ error: "Study plan not found" }, { status: 404 });
    }

    // --- LLM call to convert text plan to JSON ---
    const prompt = structureLessonPlanPrompt(textPlan);

    let rawText: string;
    try {
      rawText = await generateText(
        [{ role: "user", content: "Structure this lesson plan." }],
        prompt,
        { temperature: 0.1, maxTokens: 8192, model: "MiniMax-M2" }
      );
    } catch (apiError) {
      console.error("MiniMax API error:", apiError);
      return NextResponse.json(
        { error: "Failed to call MiniMax API", details: String(apiError) },
        { status: 502 }
      );
    }

    // Parse JSON from LLM output
    let parsedRaw: unknown;
    try {
      parsedRaw = parseLLMJson(rawText);
    } catch (firstParseError) {
      console.warn(
        "[structure-plan] First JSON parse failed, retrying at temperature 0:",
        firstParseError
      );
      try {
        const retryText = await generateText(
          [{ role: "user", content: "Structure this lesson plan." }],
          prompt,
          { temperature: 0, maxTokens: 8192, model: "MiniMax-M2" }
        );
        parsedRaw = parseLLMJson(retryText);
      } catch (retryError) {
        console.error("[structure-plan] Retry also failed:", retryError);
        return NextResponse.json(
          { error: "LLM returned malformed JSON after retry", details: String(retryError) },
          { status: 422 }
        );
      }
    }

    // Validate against schema
    const parsed = LLMConceptGraphSchema.safeParse(parsedRaw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid graph schema", details: parsed.error.flatten() },
        { status: 422 }
      );
    }
    const graphData = parsed.data;

    // Build node ID map from concept names
    const nameToId = new Map<string, string>();
    const tempNodes = graphData.concepts.map((c) => {
      const nodeId = crypto.randomUUID();
      nameToId.set(c.name, nodeId);
      return { id: nodeId, name: c.name };
    });

    // Build temp edges (id-based), track edgeType per edge pair
    const edgeTypeMap = new Map<string, string>();
    const tempEdges = graphData.edges
      .map((e) => {
        const fromId = nameToId.get(e.from) ?? "";
        const toId = nameToId.get(e.to) ?? "";
        if (fromId && toId) {
          edgeTypeMap.set(`${fromId}::${toId}`, e.edgeType ?? "prerequisite");
        }
        return { from: fromId, to: toId };
      })
      .filter((e) => e.from && e.to);

    // DAG validation and cycle breaking
    let validEdges = tempEdges;
    const removedEdgesInfo: { from: string; to: string }[] = [];
    const dagResult = validateDAG(tempNodes, tempEdges);

    if (!dagResult.isDAG) {
      const edgesBeforeBreak = [...tempEdges];
      validEdges = breakCycles(tempNodes, tempEdges, (nid) => {
        const c = graphData.concepts.find((x) => nameToId.get(x.name) === nid);
        return c?.difficultyTier ?? 1;
      });

      // Record removed edges
      const validSet = new Set(validEdges.map((e) => `${e.from}::${e.to}`));
      for (const e of edgesBeforeBreak) {
        if (!validSet.has(`${e.from}::${e.to}`)) {
          const fromName =
            [...nameToId.entries()].find(([, v]) => v === e.from)?.[0] ?? e.from;
          const toName =
            [...nameToId.entries()].find(([, v]) => v === e.to)?.[0] ?? e.to;
          removedEdgesInfo.push({ from: fromName, to: toName });
        }
      }
    }

    const positions = computeForceLayout(
      tempNodes.map((n, i) => ({
        id: n.id,
        depthTier: graphData.concepts[i]?.difficultyTier ?? 1,
      })),
      validEdges.map((e) => ({ source: e.from, target: e.to }))
    );

    // --- Create Concept + UnitGraph + GraphMembership + Edges ---

    // Create UnitGraph for this lesson plan
    const unitGraph = await prisma.unitGraph.create({
      data: {
        studyPlanId: id,
        title: plan.title,
        description: plan.description,
      },
    });

    const conceptMapping = new Map<string, string>(); // tempNodeId -> Concept.id
    let conceptCount = 0;
    let reusedConceptCount = 0;

    for (const concept of graphData.concepts) {
      const nodeId = nameToId.get(concept.name)!;
      const pos = positions.get(nodeId) ?? { x: 0, y: 0 };

      // Infer initial proficiency from stated prior knowledge
      const { proficiency: initProf, confidence: initConf } =
        inferInitialProficiency(
          priorKnowledge,
          concept.name,
          concept.difficultyTier as 1 | 2 | 3
        );

      const { id: conceptId, wasReused } = await findOrCreateConcept(
        userId,
        concept.name,
        concept.description,
        concept.keyTerms,
        initProf,
        initConf
      );

      conceptMapping.set(nodeId, conceptId);
      conceptCount++;
      if (wasReused) reusedConceptCount++;

      // Create GraphMembership for this concept in this UnitGraph
      await prisma.graphMembership.upsert({
        where: {
          conceptId_unitGraphId: {
            conceptId: conceptId,
            unitGraphId: unitGraph.id,
          },
        },
        update: {
          positionX: pos.x,
          positionY: pos.y,
          depthTier: concept.difficultyTier,
        },
        create: {
          conceptId: conceptId,
          unitGraphId: unitGraph.id,
          positionX: pos.x,
          positionY: pos.y,
          depthTier: concept.difficultyTier,
        },
      });
    }

    const createdEdges: ConceptEdge[] = [];
    for (const edge of validEdges) {
      const edgeType = edgeTypeMap.get(`${edge.from}::${edge.to}`) ?? "prerequisite";
      const fromConceptId = conceptMapping.get(edge.from);
      const toConceptId = conceptMapping.get(edge.to);

      if (!fromConceptId || !toConceptId) {
        console.warn(`Skipping edge: missing concept mapping for ${edge.from} -> ${edge.to}`);
        continue;
      }

      // Check if edge already exists
      const existing = await prisma.conceptEdge.findFirst({
        where: {
          fromNodeId: fromConceptId,
          toNodeId: toConceptId,
          unitGraphId: unitGraph.id,
        },
      });

      if (!existing) {
        const e = await prisma.conceptEdge.create({
          data: {
            fromNodeId: fromConceptId,
            toNodeId: toConceptId,
            unitGraphId: unitGraph.id,
            edgeType,
          },
        });
        createdEdges.push(e);
      }
    }

    // Build lesson plan summary grouped by tier
    const lessonPlan = {
      totalConcepts: conceptCount,
      reusedConceptCount,
      percentageKnown: conceptCount > 0 ? Math.round((reusedConceptCount / conceptCount) * 100) : 0,
      tier1: graphData.concepts
        .filter((c) => c.difficultyTier === 1)
        .map((c) => c.name),
      tier2: graphData.concepts
        .filter((c) => c.difficultyTier === 2)
        .map((c) => c.name),
      tier3: graphData.concepts
        .filter((c) => c.difficultyTier === 3)
        .map((c) => c.name),
    };

    return NextResponse.json({
      lessonPlan,
    });
  } catch (error) {
    console.error("Structure plan error:", error);
    return NextResponse.json(
      { error: "Failed to structure lesson plan" },
      { status: 500 }
    );
  }
}
