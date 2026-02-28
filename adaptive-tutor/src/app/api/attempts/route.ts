import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubmitAttemptSchema } from "@/lib/schemas";
import { updateProficiency } from "@/lib/algorithms/questionSelector";

/**
 * POST /api/attempts
 * Submit an answer to a question and get evaluation results.
 * Uses a Prisma transaction for atomicity: attempt + proficiency update together.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SubmitAttemptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { questionId, userAnswer, timeTaken, sessionId } = parsed.data;
    const userId = req.headers.get("x-user-id") ?? body.userId ?? "demo-user";

    // Fetch the question
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      return NextResponse.json(
        { error: "Question not found" },
        { status: 404 }
      );
    }

    // Evaluate the answer
    let isCorrect = false;
    let score = 0;
    let feedback = "";
    const misconceptions: string[] = [];

    if (
      question.questionType === "flashcard" ||
      question.questionType === "fill_blank"
    ) {
      // Deterministic evaluation: fuzzy string matching
      const normalizedUser = userAnswer.trim().toLowerCase();
      const normalizedCorrect = question.correctAnswer.trim().toLowerCase();
      isCorrect =
        normalizedUser === normalizedCorrect ||
        normalizedCorrect.includes(normalizedUser) ||
        normalizedUser.includes(normalizedCorrect);
      score = isCorrect ? 1 : 0;
      feedback = isCorrect
        ? "Correct!"
        : `The correct answer is: ${question.correctAnswer}`;
    } else if (question.questionType === "mcq") {
      isCorrect =
        userAnswer.trim().toLowerCase() ===
        question.correctAnswer.trim().toLowerCase();
      score = isCorrect ? 1 : 0;
      feedback = isCorrect
        ? "Correct!"
        : `The correct answer is: ${question.correctAnswer}. ${question.explanation}`;
    } else {
      // Free response: for now, simple keyword matching.
      // When MiniMax is connected, replace with LLM evaluation.
      const keywords = question.correctAnswer
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const userLower = userAnswer.toLowerCase();
      const matchedKeywords = keywords.filter((k) => userLower.includes(k));
      score = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;
      isCorrect = score >= 0.5;
      feedback = isCorrect
        ? "Good answer! You covered the key points."
        : `Your answer could be improved. Key points to include: ${question.correctAnswer}`;
    }

    // Fetch current concept proficiency for update calculation
    const concept = question.conceptId
      ? await prisma.concept.findUnique({ where: { id: question.conceptId } })
      : null;

    // Use a transaction: record attempt + mark question used + update proficiency
    const attempt = await prisma.$transaction(async (tx) => {
      // Record the attempt
      const newAttempt = await tx.attemptRecord.create({
        data: {
          questionId,
          userId,
          userAnswer,
          isCorrect,
          score,
          feedback,
          misconceptionsJson: JSON.stringify(misconceptions),
          timeTaken: timeTaken ?? 0,
          sessionId: sessionId ?? null,
        },
      });

      // Note: Question freshness is determined by sessionId via AttemptRecord (Pushback A).
      // Questions are "fresh" if they haven't been attempted in the current session.

      // Update concept proficiency if concept exists
      if (concept) {
        const { proficiency, confidence } = updateProficiency(
          concept.proficiency,
          concept.confidence,
          question.difficulty,
          isCorrect,
          score
        );
        await tx.concept.update({
          where: { id: concept.id },
          data: {
            proficiency,
            confidence,
            attemptCount: concept.attemptCount + 1,
            lastPracticed: new Date(),
          },
        });
      }

      return newAttempt;
    });

    return NextResponse.json({
      attempt,
      isCorrect,
      score,
      feedback,
      misconceptions,
    });
  } catch (error) {
    console.error("Attempt submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit attempt" },
      { status: 500 }
    );
  }
}
