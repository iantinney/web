import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/unit-graphs?studyPlanId=xxx
 * GET /api/unit-graphs (no params - returns all graphs for user)
 *
 * List all unit graphs (curriculum lenses).
 * If studyPlanId provided, filters to that plan.
 * Otherwise returns all graphs for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studyPlanId = searchParams.get("studyPlanId");
    const userId = req.headers.get("x-user-id") || "demo-user";

    let whereClause: any;
    if (studyPlanId) {
      // Specific study plan
      whereClause = { studyPlanId };
    } else {
      // All graphs for this user
      whereClause = {
        studyPlan: { userId },
      };
    }

    // Fetch unit graphs with parent study plan info
    const unitGraphs = await prisma.unitGraph.findMany({
      where: whereClause,
      include: {
        studyPlan: true,
        _count: {
          select: { memberships: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Enrich with concept and mastery info
    const enriched = await Promise.all(
      unitGraphs.map(async (graph) => {
        // Get all concepts and their avg proficiency in this graph
        const memberships = await prisma.graphMembership.findMany({
          where: { unitGraphId: graph.id },
          include: { concept: true },
        });

        const concepts = memberships.map((m) => m.concept);
        const avgProficiency =
          concepts.length > 0
            ? concepts.reduce((sum, c) => sum + c.proficiency, 0) /
              concepts.length
            : 0;

        return {
          id: graph.id,
          title: graph.title,
          description: graph.description,
          status: graph.status,
          studyPlanId: graph.studyPlanId,
          studyPlanTitle: graph.studyPlan.title,
          conceptCount: graph._count.memberships,
          avgProficiency: Math.round(avgProficiency * 100) / 100,
          createdAt: graph.createdAt,
        };
      })
    );

    return NextResponse.json({ unitGraphs: enriched });
  } catch (error) {
    console.error("Failed to fetch unit graphs:", error);
    return NextResponse.json(
      { error: "Failed to fetch unit graphs" },
      { status: 500 }
    );
  }
}
