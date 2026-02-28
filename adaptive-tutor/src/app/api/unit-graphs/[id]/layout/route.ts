import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeForceLayout } from "@/lib/algorithms/forceLayout";

/**
 * POST /api/unit-graphs/[id]/layout
 *
 * Recompute force-directed layout for a unit graph and persist positions.
 * Called after graph creation, concept insertion, or on-demand recompute.
 *
 * Returns: { layout: Record<string, { x: number; y: number }> }
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch all memberships and edges for this graph
    const memberships = await prisma.graphMembership.findMany({
      where: { unitGraphId: id },
      include: { concept: true },
    });

    if (memberships.length === 0) {
      return NextResponse.json(
        { error: "No concepts found for this graph" },
        { status: 404 }
      );
    }

    const edges = await prisma.conceptEdge.findMany({
      where: { unitGraphId: id },
    });

    // Build layout input
    const nodes = memberships.map((m) => ({
      id: m.conceptId,
      depthTier: m.depthTier,
    }));

    const links = edges.map((e) => ({
      source: e.fromNodeId,
      target: e.toNodeId,
    }));

    // Compute force-directed layout
    const positions = computeForceLayout(nodes, links);

    // Batch-persist positions using $transaction to avoid SQLite single-writer lock bottleneck
    await prisma.$transaction(
      memberships.map((m) => {
        const pos = positions.get(m.conceptId) ?? { x: 0, y: 0 };
        return prisma.graphMembership.update({
          where: {
            conceptId_unitGraphId: {
              conceptId: m.conceptId,
              unitGraphId: id,
            },
          },
          data: { positionX: pos.x, positionY: pos.y },
        });
      })
    );

    // Convert Map to plain object for JSON response
    const layout: Record<string, { x: number; y: number }> = {};
    positions.forEach((pos, nodeId) => {
      layout[nodeId] = pos;
    });

    return NextResponse.json({ layout });
  } catch (error) {
    console.error("[layout] Error computing layout:", error);
    return NextResponse.json(
      { error: "Failed to compute layout" },
      { status: 500 }
    );
  }
}
