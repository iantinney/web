import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/minimax-native";
import { parseLLMJson } from "@/lib/schemas";
import { extensionSuggestionPrompt } from "@/lib/prompts";

/**
 * POST /api/study-plans/[id]/suggest-extension
 * On-demand extension suggestion: suggest a next topic after mastering a concept.
 *
 * Body: {
 *   conceptId: string,
 *   conceptName: string,
 *   existingConcepts?: string[],
 *   seeded?: { suggestedConcept: string, explanation: string }
 * }
 *
 * Returns: { hasSuggestion: boolean, suggestedConcept?: string,
 *            explanation?: string, anchorConceptId?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { conceptId, conceptName, existingConcepts, seeded } = body;

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
        hasSuggestion: true,
        suggestedConcept: seeded.suggestedConcept,
        explanation: seeded.explanation,
        anchorConceptId: conceptId,
      });
    }

    // ── Live LLM mode ────────────────────────────────────────────────────
    try {
      const prompt = extensionSuggestionPrompt(
        conceptName,
        Array.isArray(existingConcepts) ? existingConcepts : []
      );

      const rawText = await generateText(
        [
          {
            role: "user",
            content: `Suggest what to learn next after mastering "${conceptName}".`,
          },
        ],
        prompt,
        { temperature: 0.4, maxTokens: 1024 }
      );

      console.debug(`[suggest-extension] Raw LLM response (${rawText.length} chars): ${rawText.substring(0, 300)}`);

      const parsed = parseLLMJson(rawText) as {
        suggestedConcept?: string;
        explanation?: string;
        direction?: string;
      };

      console.debug(`[suggest-extension] Parsed JSON: ${JSON.stringify(parsed).substring(0, 200)}`);

      if (parsed.suggestedConcept) {
        return NextResponse.json({
          hasSuggestion: true,
          suggestedConcept: parsed.suggestedConcept,
          explanation: parsed.explanation || "",
          direction: parsed.direction || "deeper",
          anchorConceptId: conceptId,
        });
      }

      console.warn("[suggest-extension] No suggestedConcept in parsed response");
      return NextResponse.json({ hasSuggestion: false });
    } catch (err) {
      // Graceful fallback: never 500 on LLM failure
      console.error("[suggest-extension] LLM call failed:", err);
      if (err instanceof Error) {
        console.error("[suggest-extension] Error details:", err.message);
      }
      return NextResponse.json({ hasSuggestion: false });
    }
  } catch (error) {
    console.error("[suggest-extension] Error:", error);
    return NextResponse.json(
      { error: "Failed to suggest extension" },
      { status: 500 }
    );
  }
}
