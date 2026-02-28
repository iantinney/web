import { NextRequest, NextResponse } from "next/server";
import { generateText } from "@/lib/minimax-native";

/**
 * POST /api/generate-title
 * Generate a study plan title from lesson plan text
 */
export async function POST(req: NextRequest) {
  const { lessonPlanText } = await req.json();

  if (!lessonPlanText || lessonPlanText.trim().length === 0) {
    return NextResponse.json({ title: "Study Plan" });
  }

  try {
    const prompt = `You are a course naming expert. Given the following lesson plan, generate a SHORT (1-2 words) descriptive title that's appropriate for a study curriculum.

The title should be:
- Concise (1-2 words maximum)
- Descriptive of the main topic
- Professional and suitable for education
- Creative but clear

Lesson Plan:
${lessonPlanText.slice(0, 500)}

Return ONLY the title, nothing else. Example: "React Fundamentals" or "Python Basics"`;

    const title = await generateText(
      [{ role: "user", content: "Generate a study plan title" }],
      prompt,
      { temperature: 0.7, maxTokens: 20, model: "MiniMax-M2" }
    );

    // Clean up the title
    const cleaned = title
      .trim()
      .replace(/["""]/g, "") // Remove quotes
      .replace(/^\d+\.\s*/, "") // Remove numbering
      .slice(0, 50); // Cap at 50 chars

    return NextResponse.json({
      title: cleaned || "Study Plan",
    });
  } catch (error) {
    console.error("Failed to generate study plan title:", error);
    // Fallback: extract first line
    const lines = lessonPlanText.split("\n").filter((l: string) => l.trim());
    if (lines.length > 0) {
      const fallback = lines[0].replace(/^#+\s*/, "").trim().slice(0, 50);
      return NextResponse.json({ title: fallback });
    }
    return NextResponse.json({ title: "Study Plan" });
  }
}
