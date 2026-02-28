import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/questions/[id]/add-sources
 *
 * Manually add or update sources/citations for a question.
 * Used for backend seeding of RAG sources when Wikipedia API is rate-limited.
 *
 * Request body:
 * {
 *   sources: [
 *     { index: 1, pageTitle: "...", pageUrl: "..." },
 *     { index: 2, pageTitle: "...", pageUrl: "..." }
 *   ],
 *   updateQuestionText?: boolean  // If true, will add [1], [2] citations to question text
 * }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { sources, updateQuestionText } = body as {
    sources?: Array<{ index: number; pageTitle: string; pageUrl: string }>;
    updateQuestionText?: boolean;
  };

  if (!sources || !Array.isArray(sources)) {
    return NextResponse.json(
      { error: "sources array is required" },
      { status: 400 }
    );
  }

  // Validate sources format
  for (const source of sources) {
    if (!source.index || !source.pageTitle || !source.pageUrl) {
      return NextResponse.json(
        { error: "Each source must have index, pageTitle, and pageUrl" },
        { status: 400 }
      );
    }
  }

  // Find and update question
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Update sources
  const updateData: any = {
    sourcesJson: JSON.stringify(sources),
  };

  // Optionally add citations to question text
  if (updateQuestionText && sources.length > 0) {
    // Add [1] citation to the end of question text if not already present
    const firstCitation = `[${sources[0].index}]`;
    if (!question.questionText.includes(firstCitation)) {
      updateData.questionText = `${question.questionText} ${firstCitation}`;
    }
  }

  const updated = await prisma.question.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    questionId: id,
    sourcesAdded: sources.length,
    sources,
  });
}
