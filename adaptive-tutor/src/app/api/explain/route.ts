import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/minimax-native";
import { explainAnswerPrompt } from "@/lib/prompts/index";
import type { ChatContext } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      question: string;
      userAnswer: string;
      correctAnswer: string;
      feedback: string;
      conceptName: string;
      chatContext?: ChatContext;
    };

    const { question, userAnswer, correctAnswer, feedback, conceptName, chatContext } = body;

    if (!question || !userAnswer || !conceptName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const systemPrompt = explainAnswerPrompt({
      question,
      userAnswer,
      correctAnswer: correctAnswer ?? "",
      feedback: feedback ?? "",
      conceptName,
      chatContext,
    });

    const explanation = await generateText(
      [{ role: "user", content: "Please explain this." }],
      systemPrompt,
      { temperature: 0.5, maxTokens: 512 }
    );

    return NextResponse.json({ explanation });
  } catch (error) {
    console.error("[/api/explain] Error:", error);
    return NextResponse.json(
      { explanation: "I couldn't generate an explanation right now. Try again." },
      { status: 200 }  // Return 200 with fallback so UI doesn't show error state
    );
  }
}
