import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chatSystemPrompt, studyPlanGatheringPrompt, buildChatContextSnippet } from "@/lib/prompts";
import { generateText } from "@/lib/minimax-native";
import type { ChatContext } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { messages: { role: string; content: string }[]; chatPhase?: string; chatContext?: ChatContext };
    const { messages, chatPhase } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    // ── Gathering phase: natural conversation with lesson plan proposal detection ───
    if (chatPhase === "gathering") {
      const { sourceText } = body as { sourceText?: string };
      const systemPrompt = studyPlanGatheringPrompt(sourceText);

      try {
        const text = await generateText(
          messages.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          systemPrompt,
          { temperature: 0.7, maxTokens: 2048 }
        );

        if (!text) {
          console.warn("MiniMax returned empty text");
          return NextResponse.json({
            content: "I couldn't generate a response. Please check your API key and try again.",
            proposedLessonPlan: null,
          });
        }

        // Check if response contains a lesson plan proposal marker
        const lessonPlanStartIdx = text.indexOf("<<<LESSON_PLAN_START>>>");
        const lessonPlanEndIdx = text.indexOf("<<<LESSON_PLAN_END>>>");

        let proposedLessonPlan: string | null = null;
        if (lessonPlanStartIdx !== -1 && lessonPlanEndIdx !== -1) {
          // Extract the lesson plan block (including markers for now, client will strip if needed)
          proposedLessonPlan = text.substring(
            lessonPlanStartIdx + "<<<LESSON_PLAN_START>>>".length,
            lessonPlanEndIdx
          ).trim();
        }

        return NextResponse.json({
          content: text,
          proposedLessonPlan,
        });
      } catch (generateError) {
        console.error("MiniMax generateText error:", generateError);
        return NextResponse.json(
          { error: "Failed to generate response from MiniMax", details: String(generateError) },
          { status: 500 }
        );
      }
    }

    // ── Idle/default phase: use tutor system prompt ────────────────────────
    try {
    const userId = req.headers.get("x-user-id") ?? "demo-user";

    // Fetch user's learner profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const learnerProfile = user?.learnerProfile
      ? JSON.parse(user.learnerProfile)
      : undefined;

    const studyPlans = await prisma.studyPlan.findMany({
      where: { userId },
    });
    const activePlans = studyPlans.filter((p) => p.status === "active");

    // Fetch most recent unit graph for this user
    const recentGraph = await prisma.unitGraph.findFirst({
      where: { studyPlan: { userId } },
      orderBy: { createdAt: "desc" },
      include: { memberships: { include: { concept: true } } },
    });

    const recentAttempts = await prisma.attemptRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const planContexts = activePlans.map((plan) => {
      const graphsForPlan = recentGraph?.studyPlanId === plan.id ? [recentGraph] : [];
      const allConcepts = graphsForPlan.flatMap((g) =>
        g.memberships.map((m) => m.concept)
      );
      const mastered = allConcepts.filter((c) => c.proficiency >= 0.8).length;
      return {
        title: plan.title,
        conceptCount: allConcepts.length,
        progress: allConcepts.length > 0 ? mastered / allConcepts.length : 0,
      };
    });

    const weakestConcepts = recentGraph
      ? recentGraph.memberships
          .map((m) => m.concept)
          .filter((c) => !c.isDeprecated && c.confidence > 0.1)
          .sort((a, b) => a.proficiency - b.proficiency)
          .slice(0, 5)
          .map((c) => ({ name: c.name, proficiency: c.proficiency }))
      : [];

    const recentMistakes = recentAttempts
      .filter((a) => !a.isCorrect)
      .slice(0, 3)
      .map((a) => a.feedback || "Incorrect answer");

    // Note: chatContext is only as fresh as what the client sends.
    // The client should read chatContext from useAppStore.getState().chatContext at call time, not from a stale closure.
    const systemPrompt = chatSystemPrompt({
      activePlans: planContexts,
      weakestConcepts,
      recentMistakes,
      learnerProfile,
      chatContextSnippet: body.chatContext ? buildChatContextSnippet(body.chatContext) : undefined,
    });

    const text = await generateText(
      messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      systemPrompt,
      { temperature: 0.7, maxTokens: 2048 }
    );

    return NextResponse.json({ content: text });
    } catch (idlePhaseError) {
      console.error("Idle phase error:", idlePhaseError);
      return NextResponse.json(
        { error: "Idle phase error", details: String(idlePhaseError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Chat API outer error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
