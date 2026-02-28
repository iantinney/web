import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/study-plans/[id]/session
 *
 * Returns the current active session for a study plan.
 * If no active session exists, creates one automatically (idempotent session start).
 * Query param: unitGraphId (optional, used for session scoping)
 * Dates are serialized to ISO strings for JSON compatibility.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // MUST await params (Next.js 16)
  const userId = req.headers.get("x-user-id") ?? "demo-user";
  const unitGraphId = new URL(req.url).searchParams.get("unitGraphId") ?? null;

  const plan = await prisma.studyPlan.findUnique({ where: { id } });
  if (!plan) {
    return NextResponse.json(
      { error: "Study plan not found" },
      { status: 404 }
    );
  }

  // Verify ownership
  if (plan.userId !== userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  // Get the most recent active (un-ended) session, or create one
  let session = await prisma.sessionRecord.findFirst({
    where: { studyPlanId: id, endTime: null },
    orderBy: { startTime: "desc" },
  });

  if (!session) {
    session = await prisma.sessionRecord.create({
      data: { studyPlanId: id, unitGraphId: unitGraphId ?? undefined, sessionType: "practice" },
    });
  }

  const accuracy =
    session.questionsAttempted > 0
      ? session.questionsCorrect / session.questionsAttempted
      : 0;

  return NextResponse.json({
    session: {
      ...session,
      accuracy,
      conceptsCovered: JSON.parse(session.conceptsCoveredJson || "[]"),
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString() ?? null,
    },
  });
}

/**
 * PATCH /api/study-plans/[id]/session
 *
 * End a session by setting endTime = now.
 * Body: { sessionId?: string }
 * If sessionId not provided, ends the most recent active session.
 * Verifies study plan ownership via userId header.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // MUST await params (Next.js 16)
  const userId = req.headers.get("x-user-id") ?? "demo-user";

  const plan = await prisma.studyPlan.findUnique({ where: { id } });
  if (!plan) {
    return NextResponse.json(
      { error: "Study plan not found" },
      { status: 404 }
    );
  }

  // Verify ownership
  if (plan.userId !== userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { sessionId } = body as { sessionId?: string };

  // Find session to end
  const session = sessionId
    ? await prisma.sessionRecord.findUnique({ where: { id: sessionId } })
    : await prisma.sessionRecord.findFirst({
        where: { studyPlanId: id, endTime: null },
        orderBy: { startTime: "desc" },
      });

  if (!session) {
    return NextResponse.json(
      { error: "No active session found" },
      { status: 404 }
    );
  }

  const ended = await prisma.sessionRecord.update({
    where: { id: session.id },
    data: { endTime: new Date() },
  });

  const accuracy =
    ended.questionsAttempted > 0
      ? ended.questionsCorrect / ended.questionsAttempted
      : 0;

  const conceptsCovered = JSON.parse(ended.conceptsCoveredJson || "[]");

  return NextResponse.json({
    session: {
      ...ended,
      accuracy,
      conceptsCovered,
      startTime: ended.startTime.toISOString(),
      endTime: ended.endTime?.toISOString() ?? null,
      message: `Session complete. You studied ${conceptsCovered.length} concept(s).`,
    },
  });
}
