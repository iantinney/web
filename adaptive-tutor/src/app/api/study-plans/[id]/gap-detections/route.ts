import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/study-plans/[id]/gap-detections
 * Query gap detections for a concept and check for 2-occurrence pattern.
 *
 * Query params:
 * - conceptId: the concept user was practicing
 *
 * Returns:
 *   { hasPattern: false }
 *   { hasPattern: true, missingConcept: string, severity: string, explanation: string }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await params; // MUST await params (Next.js 16) — id not used for this query
    const conceptId = request.nextUrl.searchParams.get("conceptId");
    if (!conceptId) {
      return NextResponse.json(
        { error: "conceptId required" },
        { status: 400 }
      );
    }

    const userId = request.headers.get("x-user-id") || "demo-user";

    // Find all GapDetection records for this concept where status = "detected"
    const gaps = await prisma.gapDetection.findMany({
      where: {
        userId,
        conceptId,
        status: "detected",
      },
      orderBy: { createdAt: "desc" },
    });

    if (gaps.length === 0) {
      return NextResponse.json({ hasPattern: false });
    }

    // Group by missingConcept to find patterns
    const gapsByPrerequisite: Record<string, typeof gaps> = {};
    gaps.forEach((gap) => {
      if (!gapsByPrerequisite[gap.missingConcept]) {
        gapsByPrerequisite[gap.missingConcept] = [];
      }
      gapsByPrerequisite[gap.missingConcept].push(gap);
    });

    // Find any prerequisite with 2+ occurrences
    for (const [missingConcept, records] of Object.entries(gapsByPrerequisite)) {
      if (records.length >= 2) {
        // Found a pattern — return the most recent record's metadata
        const latestRecord = records[0];
        return NextResponse.json({
          hasPattern: true,
          missingConcept,
          severity: latestRecord.severity,
          explanation: latestRecord.explanation,
        });
      }
    }

    return NextResponse.json({ hasPattern: false });
  } catch (error) {
    console.error("Error querying gap detections:", error);
    return NextResponse.json(
      { error: "Failed to query gap detections" },
      { status: 500 }
    );
  }
}
