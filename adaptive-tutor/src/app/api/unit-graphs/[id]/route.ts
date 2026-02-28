import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/unit-graphs/[id]
 *
 * Fetch a unit graph with all its concepts, memberships, and edges.
 * Used by the Graph tab to display the curriculum lens.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the unit graph
    const graph = await prisma.unitGraph.findUnique({
      where: { id },
      include: {
        studyPlan: true,
      },
    });

    if (!graph) {
      return NextResponse.json(
        { error: "Unit graph not found" },
        { status: 404 }
      );
    }

    // Fetch all memberships for this graph (concept placements)
    const memberships = await prisma.graphMembership.findMany({
      where: { unitGraphId: id },
      include: {
        concept: true,
      },
    });

    // Extract concepts from memberships (with positions)
    const concepts = memberships.map((m) => ({
      ...m.concept,
      positionX: m.positionX,
      positionY: m.positionY,
    }));

    // Fetch edges scoped to this graph
    const edges = await prisma.conceptEdge.findMany({
      where: { unitGraphId: id },
    });

    // Find concepts shared with other graphs in the same study plan
    const sharedConceptIds: string[] = [];
    const conceptIds = new Set(concepts.map((c) => c.id));

    if (graph.studyPlanId) {
      const otherGraphs = await prisma.unitGraph.findMany({
        where: {
          studyPlanId: graph.studyPlanId,
          id: { not: id },
        },
        include: {
          memberships: { select: { conceptId: true } },
        },
      });

      for (const otherGraph of otherGraphs) {
        for (const membership of otherGraph.memberships) {
          if (conceptIds.has(membership.conceptId)) {
            sharedConceptIds.push(membership.conceptId);
          }
        }
      }
    }

    return NextResponse.json({
      graph,
      concepts,
      memberships,
      edges,
      sharedConceptIds: [...new Set(sharedConceptIds)],
    });
  } catch (error) {
    console.error("Failed to fetch unit graph:", error);
    return NextResponse.json(
      { error: "Failed to fetch unit graph" },
      { status: 500 }
    );
  }
}
