import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/minimax-native";
import { advisorPrompt } from "@/lib/prompts/index";
import { prisma } from "@/lib/prisma";
import type { ChatContext, AdvisorCard } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") ?? "demo-user";
    const body = (await req.json()) as { chatContext?: ChatContext };
    const { chatContext } = body;

    // Fetch learner state from DB — same pattern as /api/chat idle handler
    const studyPlans = await prisma.studyPlan.findMany({
      where: { userId },
      include: {
        unitGraphs: {
          include: {
            memberships: {
              include: { concept: true },
            },
          },
        },
      },
    });

    const recentAttempts = await prisma.attemptRecord.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // GapDetection uses userId directly (no studyPlan relation in schema)
    const gapDetections = await prisma.gapDetection.findMany({
      where: {
        userId,
        status: "detected",
      },
      orderBy: { createdAt: "desc" },
    });

    // Build summary data for the prompt
    const activePlans = studyPlans.map((sp) => {
      const allConcepts = sp.unitGraphs.flatMap((g) =>
        g.memberships.map((m) => m.concept)
      );
      const masteredCount = allConcepts.filter(
        (c) => (c.proficiency ?? 0) >= 0.8
      ).length;
      const progress =
        allConcepts.length > 0 ? masteredCount / allConcepts.length : 0;
      return {
        title: sp.title ?? "Untitled Plan",
        conceptCount: allConcepts.length,
        progress,
      };
    });

    const graphConcepts = studyPlans
      .flatMap((sp) =>
        sp.unitGraphs.flatMap((g) =>
          g.memberships.map((m) => ({
            name: m.concept.name,
            proficiency: m.concept.proficiency ?? 0,
            isLocked: false, // simplified — lock state requires edge query
          }))
        )
      )
      .slice(0, 50); // cap to avoid token overflow

    // Deduplicate gap detections by missingConcept and count occurrences
    const gapSummary = Object.values(
      gapDetections.reduce<
        Record<string, { missingConcept: string; occurrences: number }>
      >((acc, g) => {
        const key = g.missingConcept;
        if (!acc[key]) acc[key] = { missingConcept: key, occurrences: 0 };
        acc[key].occurrences++;
        return acc;
      }, {})
    );

    const recentAttemptsForPrompt = recentAttempts.map((a) => ({
      conceptId: a.questionId, // AttemptRecord links to questionId, not conceptId directly
      isCorrect: a.isCorrect,
      score: a.score ?? 0.5,
    }));

    const systemPrompt = advisorPrompt({
      activePlans,
      graphConcepts,
      recentAttempts: recentAttemptsForPrompt,
      gapDetections: gapSummary,
      chatContext,
    });

    const text = await generateText(
      [{ role: "user", content: "What should I learn next?" }],
      systemPrompt,
      { temperature: 0.3, maxTokens: 1024 }
    );

    // Parse LLM JSON response — guard against markdown fences
    let recommendations: AdvisorCard[] = [];
    try {
      const cleaned = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      recommendations = JSON.parse(cleaned) as AdvisorCard[];
    } catch {
      console.error("[/api/advisor] Failed to parse LLM response:", text);
      return NextResponse.json({
        recommendations: [
          {
            type: "continue",
            title: "Continue practicing",
            pitch: "Keep working through your current study plan.",
            priority: 1,
          },
        ],
      });
    }

    return NextResponse.json({ recommendations: recommendations.slice(0, 3) });
  } catch (error) {
    console.error("[/api/advisor] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}
