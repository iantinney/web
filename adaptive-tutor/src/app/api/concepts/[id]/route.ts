import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toJson } from "@/lib/utils";

/**
 * GET /api/concepts/[id]
 * Fetch a concept by ID. Verifies ownership via userId.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get("x-user-id") ?? "demo-user";

    const concept = await prisma.concept.findUnique({
      where: { id },
    });

    if (!concept) {
      return NextResponse.json(
        { error: "Concept not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (concept.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json(concept);
  } catch (error) {
    console.error("GET /api/concepts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch concept" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/concepts/[id]
 * Update concept fields (name, description, keyTermsJson).
 * Syncs nameNormalized when name changes.
 * Verifies ownership via userId.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get("x-user-id") ?? "demo-user";
    const body = await req.json();

    const concept = await prisma.concept.findUnique({
      where: { id },
    });

    if (!concept) {
      return NextResponse.json(
        { error: "Concept not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (concept.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const { name, description, keyTermsJson } = body;

    // Build update data
    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name;
      updateData.nameNormalized = name.trim().toLowerCase();
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (keyTermsJson !== undefined) {
      updateData.keyTermsJson = toJson(keyTermsJson);
    }

    try {
      const updated = await prisma.concept.update({
        where: { id },
        data: updateData,
      });
      return NextResponse.json(updated);
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
    console.error("PATCH /api/concepts/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update concept" },
      { status: 500 }
    );
  }
}
