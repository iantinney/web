import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/utils";

/**
 * PATCH /api/study-plans/[id]/concepts/[conceptId]
 * Update a concept's editable fields (name, description, keyTermsJson).
 * Concept is now user-global, not study-plan-scoped.
 * This endpoint validates study plan ownership for authorization.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; conceptId: string }> }
) {
  try {
    const { id, conceptId } = await params;
    const userId = req.headers.get("x-user-id") ?? "demo-user";
    const body = await req.json();

    // Validate study plan exists and belongs to user
    const studyPlan = await prisma.studyPlan.findUnique({
      where: { id },
    });

    if (!studyPlan) {
      return NextResponse.json(
        { error: "Study plan not found" },
        { status: 404 }
      );
    }

    if (studyPlan.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Fetch the concept
    const concept = await prisma.concept.findUnique({
      where: { id: conceptId },
    });

    if (!concept) {
      return NextResponse.json(
        { error: "Concept not found" },
        { status: 404 }
      );
    }

    // Verify concept belongs to this user
    if (concept.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Build update data — only allow editable fields
    const updateData: any = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updateData.name = body.name.trim();
      updateData.nameNormalized = body.name.trim().toLowerCase();
    }

    if (typeof body.description === "string") {
      updateData.description = body.description;
    }

    if (body.keyTermsJson !== undefined) {
      // Accept either a JSON string or an array
      if (Array.isArray(body.keyTermsJson)) {
        updateData.keyTermsJson = JSON.stringify(body.keyTermsJson);
      } else if (typeof body.keyTermsJson === "string") {
        // Validate it's valid JSON
        try {
          JSON.parse(body.keyTermsJson);
          updateData.keyTermsJson = body.keyTermsJson;
        } catch {
          return NextResponse.json(
            { error: "keyTermsJson must be valid JSON" },
            { status: 400 }
          );
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    try {
      const updated = await prisma.concept.update({
        where: { id: conceptId },
        data: updateData,
      });
      return NextResponse.json({ concept: updated });
    } catch (error: any) {
      // Handle unique constraint violation on nameNormalized
      if (error.code === "P2002" && error.meta?.target?.includes("nameNormalized")) {
        return NextResponse.json(
          { error: "A concept with this name already exists for this user" },
          { status: 409 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Error updating concept:", error);
    return NextResponse.json(
      { error: "Failed to update concept" },
      { status: 500 }
    );
  }
}
