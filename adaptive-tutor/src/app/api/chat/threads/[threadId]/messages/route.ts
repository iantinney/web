import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/chat/threads/[threadId]/messages
 * Return all messages in a thread, ordered chronologically.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;

    // Verify thread exists
    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    const messages = await prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/threads/[threadId]/messages
 * Append a message to a thread (and optionally an assistant reply).
 * Returns all messages in the thread after insertion.
 *
 * Body:
 *   role: "user" | "assistant" | "system"
 *   content: string
 *   toolCallsJson?: string    — default "[]"
 *   toolResultsJson?: string  — default "[]"
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { threadId } = await params;

    // Verify thread exists
    const thread = await prisma.chatThread.findUnique({
      where: { id: threadId },
    });
    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { role, content, toolCallsJson, toolResultsJson } = body;

    // Validate required fields
    if (!role || !["user", "assistant", "system"].includes(role)) {
      return NextResponse.json(
        { error: "role must be 'user', 'assistant', or 'system'" },
        { status: 400 }
      );
    }
    if (typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    // Use a transaction: create message + bump thread updatedAt
    const message = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.chatMessage.create({
        data: {
          threadId,
          role,
          content,
          toolCallsJson: typeof toolCallsJson === "string" ? toolCallsJson : "[]",
          toolResultsJson: typeof toolResultsJson === "string" ? toolResultsJson : "[]",
        },
      });

      // Touch the thread's updatedAt so list ordering reflects activity
      await tx.chatThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });

      return newMessage;
    });

    // Return the created message plus the full thread message list
    const messages = await prisma.chatMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ message, messages }, { status: 201 });
  } catch (error) {
    console.error("Error creating chat message:", error);
    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
