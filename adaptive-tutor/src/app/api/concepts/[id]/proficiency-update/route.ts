import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/concepts/[id]/proficiency-update
 * Update a concept's proficiency, confidence, and SM-2 metrics.
 * Called after practice attempts to persist learning progress to database.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = req.headers.get("x-user-id") ?? "demo-user";
    const body = await req.json();

    const {
      proficiency,
      confidence,
      lastPracticed,
      attemptCount,
      nextDue,
      easeFactor,
      interval,
      repetitionCount,
    } = body;

    // Verify concept exists and belongs to user
    const concept = await prisma.concept.findUnique({
      where: { id },
    });

    if (!concept) {
      return NextResponse.json(
        { error: "Concept not found" },
        { status: 404 }
      );
    }

    if (concept.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Update concept with new proficiency metrics
    const updated = await prisma.concept.update({
      where: { id },
      data: {
        proficiency: proficiency ?? concept.proficiency,
        confidence: confidence ?? concept.confidence,
        lastPracticed: lastPracticed ?? (new Date()),
        attemptCount: attemptCount ?? concept.attemptCount,
        nextDue: nextDue ?? concept.nextDue,
        easeFactor: easeFactor ?? concept.easeFactor,
        interval: interval ?? concept.interval,
        repetitionCount: repetitionCount ?? concept.repetitionCount,
      },
    });

    return NextResponse.json({
      success: true,
      concept: updated,
    });
  } catch (error) {
    console.error("Proficiency update error:", error);
    return NextResponse.json(
      { error: "Failed to update proficiency" },
      { status: 500 }
    );
  }
}
