import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/minimax-native";
import { parseLLMJson } from "@/lib/schemas";
import { gapAnalysisPrompt } from "@/lib/prompts";

/**
 * POST /api/study-plans/[id]/analyze-gap
 * On-demand gap analysis: analyze a wrong answer to detect missing prerequisites.
 *
 * Body: {
 *   conceptId: string,
 *   conceptName: string,
 *   questionText: string,
 *   userAnswer: string,
 *   correctAnswer: string,
 *   seeded?: { missingConcept: string, explanation: string, severity?: string }
 * }
 *
 * Returns: { hasGap: boolean, missingConcept?: string, explanation?: string,
 *            severity?: string, parentConceptId?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { conceptId, conceptName, questionText, userAnswer, correctAnswer, seeded } = body;

    if (!conceptId || !conceptName) {
      return NextResponse.json(
        { error: "conceptId and conceptName are required" },
        { status: 400 }
      );
    }

    const userId = request.headers.get("x-user-id") || "demo-user";

    // Verify ownership of study plan
    const studyPlan = await prisma.studyPlan.findUnique({
      where: { id },
    });
    if (!studyPlan || studyPlan.userId !== userId) {
      return NextResponse.json(
        { error: "Study plan not found or unauthorized" },
        { status: 404 }
      );
    }

    // ── Seeded bypass: return pre-computed response without calling LLM ──
    if (seeded) {
      return NextResponse.json({
        hasGap: true,
        missingConcept: seeded.missingConcept,
        explanation: seeded.explanation,
        severity: seeded.severity || "high",
        parentConceptId: conceptId,
      });
    }

    // ── Live LLM mode ────────────────────────────────────────────────────
    try {
      const prompt = gapAnalysisPrompt(
        conceptName,
        questionText || "",
        userAnswer || "",
        correctAnswer || ""
      );

      const rawText = await generateText(
        [
          {
            role: "user",
            content: `Analyze this wrong answer for prerequisite gaps in "${conceptName}".`,
          },
        ],
        prompt,
        { temperature: 0.2, maxTokens: 512 }
      );

      console.debug(`[analyze-gap] Raw LLM response (${rawText.length} chars): ${rawText.substring(0, 300)}`);

      const parsed = parseLLMJson(rawText) as {
        hasGap?: boolean;
        missingConcept?: string | null;
        explanation?: string;
        severity?: string;
      };

      console.debug(`[analyze-gap] Parsed JSON: ${JSON.stringify(parsed).substring(0, 200)}`);

      if (parsed.hasGap && parsed.missingConcept) {
        return NextResponse.json({
          hasGap: true,
          missingConcept: parsed.missingConcept,
          explanation: parsed.explanation || "",
          severity: parsed.severity || "medium",
          parentConceptId: conceptId,
        });
      }

      console.warn("[analyze-gap] No gap detected or missingConcept missing");
      return NextResponse.json({ hasGap: false });
    } catch (err) {
      // Graceful fallback: never 500 on LLM failure
      console.error("[analyze-gap] LLM call failed:", err);
      if (err instanceof Error) {
        console.error("[analyze-gap] Error details:", err.message);
      }
      return NextResponse.json({ hasGap: false });
    }
  } catch (error) {
    console.error("[analyze-gap] Error:", error);
    return NextResponse.json(
      { error: "Failed to analyze gap" },
      { status: 500 }
    );
  }
}
