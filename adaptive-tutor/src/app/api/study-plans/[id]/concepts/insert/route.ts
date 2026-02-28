import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findOrCreateConcept } from "@/lib/algorithms/conceptDedup";
import { computeForceLayout } from "@/lib/algorithms/forceLayout";

/**
 * POST /api/study-plans/[id]/concepts/insert
 * Insert a new concept into the graph as either a prerequisite or extension.
 *
 * Body: { unitGraphId, conceptName, targetConceptId, position? }
 * - unitGraphId: the graph to insert into
 * - conceptName: name of the new concept to insert
 * - targetConceptId: the anchor concept it connects to
 * - position: "prerequisite" (default) or "extension"
 *   - prerequisite: new concept is prereq OF target (edge: new -> target, tier - 1)
 *   - extension: new concept extends FROM target (edge: target -> new, tier + 1)
 *
 * Returns: { conceptId, membership, edge, layout, position }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // MUST await params (Next.js 16)
    const body = await request.json();
    const { unitGraphId, conceptName, targetConceptId, position } = body;

    if (!unitGraphId || !conceptName || !targetConceptId) {
      return NextResponse.json(
        { error: "unitGraphId, conceptName, targetConceptId required" },
        { status: 400 }
      );
    }

    const insertPosition = position === "extension" ? "extension" : "prerequisite";

    const userId = request.headers.get("x-user-id") || "demo-user";

    // Verify ownership of study plan
    const studyPlan = await prisma.studyPlan.findUnique({
      where: { id },
    });
    if (!studyPlan || studyPlan.userId !== userId) {
      return NextResponse.json(
        { error: "Study plan not found or unauthorized" },
        { status: 404 }
      );
    }

    // Get the target concept's membership (to determine tier for new concept)
    const targetMembership = await prisma.graphMembership.findUnique({
      where: {
        conceptId_unitGraphId: {
          conceptId: targetConceptId,
          unitGraphId,
        },
      },
      include: { concept: true },
    });

    if (!targetMembership) {
      return NextResponse.json(
        { error: "Target concept not found in this graph" },
        { status: 404 }
      );
    }

    // Insert or find the new concept via dedup
    const { id: newConceptId } = await findOrCreateConcept(
      userId,
      conceptName,
      "", // description — will be filled by question generation
      [], // keyTerms
      0.0, // starting proficiency
      0.0 // starting confidence
    );

    // Check if already in this graph
    let newMembership = await prisma.graphMembership.findUnique({
      where: {
        conceptId_unitGraphId: {
          conceptId: newConceptId,
          unitGraphId,
        },
      },
    });

    // Compute tier and edge direction based on position
    const newDepthTier =
      insertPosition === "extension"
        ? targetMembership.depthTier + 1
        : Math.max(1, targetMembership.depthTier - 1);

    // Edge direction:
    //   prerequisite: new -> target (new is prereq OF target)
    //   extension:    target -> new (target is prereq OF new)
    const fromNodeId =
      insertPosition === "extension" ? targetConceptId : newConceptId;
    const toNodeId =
      insertPosition === "extension" ? newConceptId : targetConceptId;

    if (!newMembership) {
      newMembership = await prisma.graphMembership.create({
        data: {
          conceptId: newConceptId,
          unitGraphId,
          depthTier: newDepthTier,
          positionX: 0, // placeholder — updated by layout below
          positionY: 0,
        },
      });
    }

    // Create edge scoped to this graph.
    // If the edge already exists, reuse it instead of failing on uniqueness.
    const existingEdge = await prisma.conceptEdge.findFirst({
      where: {
        fromNodeId,
        toNodeId,
        unitGraphId,
      },
    });

    const newEdge =
      existingEdge ??
      (await prisma.conceptEdge.create({
        data: {
          fromNodeId,
          toNodeId,
          unitGraphId,
          studyPlanId: id,
          edgeType: "prerequisite",
        },
      }));

    // Fetch all memberships and edges for this graph to relayout
    const memberships = await prisma.graphMembership.findMany({
      where: { unitGraphId },
      include: { concept: true },
    });

    const allEdges = await prisma.conceptEdge.findMany({
      where: {
        OR: [
          { fromNodeId: { in: memberships.map((m) => m.conceptId) } },
          { toNodeId: { in: memberships.map((m) => m.conceptId) } },
        ],
      },
    });

    // Compute force-directed layout
    const positions = computeForceLayout(
      memberships.map((m) => ({ id: m.conceptId, depthTier: m.depthTier })),
      allEdges.map((e) => ({ source: e.fromNodeId, target: e.toNodeId }))
    );

    // Convert Map to plain object for JSON response
    const layout: Record<string, { x: number; y: number }> = {};
    positions.forEach((pos, nodeId) => {
      layout[nodeId] = pos;
    });

    // Batch-persist positions using $transaction to avoid SQLite single-writer lock bottleneck
    await prisma.$transaction(
      memberships.map((m) => {
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

    // Fire-and-forget question generation for the new concept
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/study-plans/${id}/generate-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify({
        conceptId: newConceptId,
        count: 5,
      }),
    }).catch((err) =>
      console.error("[concepts/insert] Question generation failed:", err)
    );

    return NextResponse.json({
      conceptId: newConceptId,
      membership: newMembership,
      edge: {
        from: fromNodeId,
        to: toNodeId,
      },
      layout,
      position: insertPosition,
    });
  } catch (error) {
    console.error("[concepts/insert] Error inserting concept:", error);
    return NextResponse.json(
      { error: "Failed to insert concept" },
      { status: 500 }
    );
  }
}
