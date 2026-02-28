import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  updateSM2,
  getNextDueDate,
  userAnswerToQuality,
} from "@/lib/algorithms/sm2";
import { updateProficiencyFromAttempt } from "@/lib/algorithms/proficiency";
import { LLMEnhancedEvaluationSchema, parseLLMJson } from "@/lib/schemas";
import { evaluateFreeResponsePrompt } from "@/lib/prompts";
import { generateText } from "@/lib/minimax-native";

/**
 * POST /api/study-plans/[id]/attempt
 *
 * Core hot path: evaluates an answer (rule-based for MCQ/fill_blank/flashcard,
 * neutral for free_response in Phase 3), then atomically writes:
 *   - AttemptRecord
 *   - ConceptNode proficiency + SM-2 state update
 *   - SessionRecord stats increment
 *
 * Returns { isCorrect, feedback, explanation, score, proficiencyUpdate, sessionUpdate, sessionComplete }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // MUST await params (Next.js 16)

  const body = await req.json().catch(() => null);
  if (
    !body ||
    !body.questionId ||
    body.userAnswer === undefined ||
    body.timeTaken === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: questionId, userAnswer, timeTaken",
      },
      { status: 400 }
    );
  }

  const { questionId, userAnswer, timeTaken, sessionId } = body as {
    questionId: string;
    userAnswer: string;
    timeTaken: number;
    sessionId?: string;
    userId?: string;
  };

  const userId = req.headers.get("x-user-id") ?? body.userId ?? "demo-user";

  // 1. Load question — look it up directly
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) {
    return NextResponse.json(
      { error: "Question not found", code: "QUESTION_NOT_FOUND" },
      { status: 404 }
    );
  }

  // 2. Load the Concept for this question.
  //    Questions created by generate-questions store Concept.id in question.conceptId.
  const conceptId = question.conceptId;
  if (!conceptId) {
    return NextResponse.json(
      { error: "Question has no associated concept", code: "NO_CONCEPT" },
      { status: 400 }
    );
  }

  const concept = await prisma.concept.findUnique({
    where: { id: conceptId },
  });
  if (!concept) {
    return NextResponse.json(
      { error: "Concept not found", code: "CONCEPT_NOT_FOUND" },
      { status: 404 }
    );
  }

  // 3. Get difficultyTier from GraphMembership.depthTier (Concept has no difficultyTier field)
  const membership = await prisma.graphMembership.findFirst({
    where: { conceptId: concept.id },
  });
  const difficultyTier = Math.max(1, Math.min(3, membership?.depthTier ?? 1)) as 1 | 2 | 3;

  // 4. Evaluate correctness — rule-based for all types except free_response
  let isCorrect = false;
  let feedback = "";
  let score = 0.0;
  let errorType: "CORRECT" | "MINOR" | "MISCONCEPTION" | "PREREQUISITE_GAP" | undefined;
  let gapAnalysis: { missingConcept: string; severity: string; explanation: string } | undefined;

  if (question.questionType === "free_response") {
    // Phase 6: LLM evaluation with error classification and gap detection
    try {
      const prompt = evaluateFreeResponsePrompt(
        question.questionText,
        question.correctAnswer,
        userAnswer,
        concept.name
      );
      const rawResponse = await generateText(
        [{ role: "user", content: prompt }],
        "You are an expert tutor grading student answers. Respond only with valid JSON.",
        { temperature: 0.2, maxTokens: 512 }
      );
      const parsed = LLMEnhancedEvaluationSchema.parse(parseLLMJson(rawResponse));
      isCorrect = parsed.correct;
      score = parsed.score;
      feedback = parsed.feedback;
      errorType = parsed.errorType;
      gapAnalysis = parsed.gapAnalysis;

      // Create GapDetection record when a prerequisite gap is identified
      if (parsed.errorType === "PREREQUISITE_GAP" && parsed.gapAnalysis) {
        await prisma.gapDetection.create({
          data: {
            userId,
            conceptId,
            missingConcept: parsed.gapAnalysis.missingConcept,
            severity: parsed.gapAnalysis.severity,
            explanation: parsed.gapAnalysis.explanation,
            status: "detected",
          },
        });
      }
    } catch (evalError) {
      // Fallback to neutral score if LLM evaluation fails
      console.error("[attempt] Free response LLM evaluation failed:", evalError);
      isCorrect = false;
      feedback = "Answer recorded. Evaluation temporarily unavailable.";
      score = 0.5;
    }
  } else if (question.questionType === "flashcard") {
    // Flashcard: user self-reports via "Got it!" / "Missed it" buttons
    // userAnswer is "correct" or "incorrect" (or "got_it"/"missed_it") from the UI
    isCorrect =
      userAnswer.toLowerCase() === "correct" ||
      userAnswer.toLowerCase() === "got_it";
    feedback = isCorrect
      ? "Great! You remembered."
      : "Keep practicing — it'll come.";
    score = isCorrect ? 1.0 : 0.0;
  } else {
    // MCQ and fill_blank: case-insensitive trimmed string comparison
    const normalized = userAnswer.trim().toLowerCase();
    const correct = question.correctAnswer.trim().toLowerCase();
    isCorrect = normalized === correct;
    feedback = isCorrect
      ? "Correct!"
      : `Not quite. The correct answer is: ${question.correctAnswer}`;
    score = isCorrect ? 1.0 : 0.0;
  }

  // 5. SM-2 quality score from isCorrect + timeTaken
  const quality = userAnswerToQuality(isCorrect, timeTaken);

  // 6. SM-2 state update
  const currentSM2 = {
    easeFactor: concept.easeFactor,
    interval: concept.interval,
    repetitionCount: concept.repetitionCount,
  };
  const newSM2 = updateSM2(currentSM2, quality);
  const nextDue = getNextDueDate(newSM2.interval);

  // 7. Proficiency update
  // Phase 6: free_response now has real LLM evaluation — update proficiency like other types
  const { proficiency: newProficiency, confidence: newConfidence } =
    updateProficiencyFromAttempt(
      concept.proficiency,
      concept.confidence,
      isCorrect,
      difficultyTier
    );

  // 8. Get or create session
  let session = sessionId
    ? await prisma.sessionRecord.findUnique({ where: { id: sessionId } })
    : await prisma.sessionRecord.findFirst({
        where: { studyPlanId: id, endTime: null },
        orderBy: { startTime: "desc" },
      });

  if (!session) {
    session = await prisma.sessionRecord.create({
      data: { studyPlanId: id, sessionType: "practice" },
    });
  }

  // 9. Atomic transaction: write AttemptRecord + update ConceptNode + update SessionRecord
  const [, , updatedSession] = await prisma.$transaction([
    prisma.attemptRecord.create({
      data: {
        questionId,
        userId,
        userAnswer: String(userAnswer),
        isCorrect,
        score,
        feedback,
        timeTaken,
        sessionId: session.id,
      },
    }),
    prisma.concept.update({
      where: { id: concept.id },
      data: {
        proficiency: newProficiency,
        confidence: newConfidence,
        easeFactor: newSM2.easeFactor,
        interval: newSM2.interval,
        repetitionCount: newSM2.repetitionCount,
        nextDue,
        lastPracticed: new Date(),
        attemptCount: { increment: 1 },
      },
    }),
    prisma.sessionRecord.update({
      where: { id: session.id },
      data: {
        questionsAttempted: { increment: 1 },
        ...(isCorrect && { questionsCorrect: { increment: 1 } }),
        conceptsCoveredJson: JSON.stringify(
          [
            ...new Set([
              ...JSON.parse(session.conceptsCoveredJson || "[]"),
              concept.id,
            ]),
          ]
        ),
      },
    }),
  ]);

  const accuracy =
    updatedSession.questionsAttempted > 0
      ? updatedSession.questionsCorrect / updatedSession.questionsAttempted
      : 0;

  return NextResponse.json({
    isCorrect,
    feedback,
    explanation: question.explanation || null,
    score,
    errorType: errorType ?? null,
    gapAnalysis: gapAnalysis ?? null,
    proficiencyUpdate: {
      conceptId: concept.id,
      previousProficiency: concept.proficiency,
      newProficiency,
      previousConfidence: concept.confidence,
      newConfidence,
    },
    sessionUpdate: {
      sessionId: updatedSession.id,
      questionsAttempted: updatedSession.questionsAttempted,
      questionsCorrect: updatedSession.questionsCorrect,
      accuracy,
    },
    sessionComplete: false, // UI determines completion by exhausting its question list
  });
}
