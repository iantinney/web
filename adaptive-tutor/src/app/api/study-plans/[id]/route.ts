import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { update, remove, removeMany } from "@/lib/db";
import type { StudyPlan } from "@/lib/types";

/**
 * GET /api/study-plans/[id]
 * Get a single study plan with its unit graphs and concepts.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Use Prisma directly to include unit graphs and their memberships
    const plan = await prisma.studyPlan.findUnique({
      where: { id },
      include: {
        unitGraphs: {
          include: {
            memberships: { include: { concept: true } },
            edges: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Study plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Error fetching study plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch study plan" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/study-plans/[id]
 * Update a study plan's metadata.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await update<StudyPlan>("studyPlans", id, body);

    if (!updated) {
      return NextResponse.json(
        { error: "Study plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ plan: updated });
  } catch (error) {
    console.error("Error updating study plan:", error);
    return NextResponse.json(
      { error: "Failed to update study plan" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/study-plans/[id]
 * Delete a study plan and all associated data (unit graphs, memberships, sessions, etc).
 * Uses Prisma transactions for safety.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // First verify the study plan exists
    const studyPlan = await prisma.studyPlan.findUnique({
      where: { id },
      include: { unitGraphs: { select: { id: true } } },
    });

    if (!studyPlan) {
      return NextResponse.json(
        { error: "Study plan not found" },
        { status: 404 }
      );
    }

    const unitGraphIds = studyPlan.unitGraphs.map((g) => g.id);

    // Use transaction for atomic deletion
    await prisma.$transaction(async (tx) => {
      // Delete ConceptEdge records linked to this plan's graphs
      if (unitGraphIds.length > 0) {
        await tx.conceptEdge.deleteMany({
          where: { unitGraphId: { in: unitGraphIds } },
        });
      }

      // Delete GraphMembership records
      if (unitGraphIds.length > 0) {
        await tx.graphMembership.deleteMany({
          where: { unitGraphId: { in: unitGraphIds } },
        });
      }

      // Delete UnitGraph records
      await tx.unitGraph.deleteMany({
        where: { studyPlanId: id },
      });

      // Delete legacy ConceptNode records (for any old data)
      await tx.conceptNode.deleteMany({
        where: { studyPlanId: id },
      });

      // Delete legacy ConceptEdge records (for any old data)
      await tx.conceptEdge.deleteMany({
        where: { studyPlanId: id },
      });

      // Delete SessionRecord records
      if (unitGraphIds.length > 0) {
        await tx.sessionRecord.deleteMany({
          where: {
            OR: [
              { studyPlanId: id },
              { unitGraphId: { in: unitGraphIds } },
            ],
          },
        });
      }

      // Finally, delete the StudyPlan itself
      await tx.studyPlan.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting study plan:", error);
    return NextResponse.json(
      { error: "Failed to delete study plan" },
      { status: 500 }
    );
  }
}
