import { NextRequest, NextResponse } from "next/server";
import { findMany, create } from "@/lib/db";
import { CreateStudyPlanSchema } from "@/lib/schemas";
import type { StudyPlan } from "@/lib/types";

/**
 * GET /api/study-plans
 * List all study plans for the current user (from x-user-id header or default to demo-user)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "demo-user";
    const plans = await findMany<StudyPlan>("studyPlans", { userId });
    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Error fetching study plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch study plans" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/study-plans
 * Create a new study plan.
 * Body should include userId; falls back to demo-user if not provided
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateStudyPlanSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, description, sourceText, targetDate } = parsed.data;
    const userId = (body as { userId?: string }).userId || "demo-user";

    const plan = await create<StudyPlan>("studyPlans", {
      userId,
      title,
      description: description ?? "",
      sourceText,
      status: "active",
      targetDate: targetDate ?? null,
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error("Error creating study plan:", error);
    return NextResponse.json(
      { error: "Failed to create study plan" },
      { status: 500 }
    );
  }
}
