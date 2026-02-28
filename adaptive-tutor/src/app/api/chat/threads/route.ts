import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { USER_ID } from "@/lib/config";

/**
 * GET /api/chat/threads
 * List all chat threads for the demo user, ordered newest first.
 */
export async function GET() {
  try {
    const threads = await prisma.chatThread.findMany({
      where: { userId: USER_ID },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Error fetching chat threads:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat threads" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/threads
 * Create a new chat thread for the demo user.
 *
 * Body (optional):
 *   title: string       — thread title (default: "New Chat")
 *   studyPlanId: string — associated study plan (optional)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "New Chat";
    const studyPlanId = typeof body.studyPlanId === "string"
      ? body.studyPlanId
      : undefined;

    // Validate studyPlanId if provided
    if (studyPlanId) {
      const plan = await prisma.studyPlan.findUnique({
        where: { id: studyPlanId },
      });
      if (!plan) {
        return NextResponse.json(
          { error: "Study plan not found" },
          { status: 404 }
        );
      }
    }

    const thread = await prisma.chatThread.create({
      data: {
        userId: USER_ID,
        title,
        studyPlanId: studyPlanId ?? null,
      },
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    console.error("Error creating chat thread:", error);
    return NextResponse.json(
      { error: "Failed to create chat thread" },
      { status: 500 }
    );
  }
}
