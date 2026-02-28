import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { LearnerProfile } from "@/lib/types";

/**
 * POST /api/users
 * Create or verify a user record
 * Body: { userId: string, displayName: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, displayName } = body;

    if (!userId || !userId.trim()) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Upsert user (create if not exists, update if does)
    const user = await prisma.user.upsert({
      where: { id: userId },
      update: { displayName: displayName || userId },
      create: {
        id: userId,
        displayName: displayName || userId,
      },
    });

    // Parse learnerProfile JSON with safety
    let learnerProfile = { background: [], goals: [], interests: [] };
    if (user.learnerProfile) {
      try {
        const parsed = JSON.parse(user.learnerProfile);
        learnerProfile = {
          background: Array.isArray(parsed?.background) ? parsed.background : [],
          goals: Array.isArray(parsed?.goals) ? parsed.goals : [],
          interests: Array.isArray(parsed?.interests) ? parsed.interests : [],
        };
      } catch (e) {
        console.warn("Failed to parse learner profile in POST:", e);
      }
    }

    return NextResponse.json({ user: { ...user, learnerProfile } }, { status: 201 });
  } catch (error) {
    console.error("Error creating/verifying user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users
 * Get current user info (from x-user-id header)
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "demo-user";

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse learnerProfile JSON with safety
    let learnerProfile = { background: [], goals: [], interests: [] };
    if (user.learnerProfile) {
      try {
        const parsed = JSON.parse(user.learnerProfile);
        learnerProfile = {
          background: Array.isArray(parsed?.background) ? parsed.background : [],
          goals: Array.isArray(parsed?.goals) ? parsed.goals : [],
          interests: Array.isArray(parsed?.interests) ? parsed.interests : [],
        };
      } catch (e) {
        console.warn("Failed to parse learner profile in GET:", e);
      }
    }

    return NextResponse.json({ user: { ...user, learnerProfile } });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/users
 * Update user's learner profile
 * Body: { learnerProfile: { background: string[], goals: string[], interests: string[] } }
 */
export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "demo-user";
    const body = await req.json();
    const { learnerProfile } = body;

    if (!learnerProfile || typeof learnerProfile !== "object") {
      return NextResponse.json(
        { error: "learnerProfile object is required" },
        { status: 400 }
      );
    }

    // Validate structure
    if (!Array.isArray(learnerProfile.background) || !Array.isArray(learnerProfile.goals) || !Array.isArray(learnerProfile.interests)) {
      return NextResponse.json(
        { error: "learnerProfile must contain background, goals, and interests arrays" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        learnerProfile: JSON.stringify(learnerProfile),
      },
    });

    // Parse learnerProfile JSON for response with safety
    let parsedProfile: LearnerProfile = { background: [], goals: [], interests: [] };
    if (user.learnerProfile) {
      try {
        const parsed = JSON.parse(user.learnerProfile);
        parsedProfile = {
          background: Array.isArray(parsed?.background) ? parsed.background : [],
          goals: Array.isArray(parsed?.goals) ? parsed.goals : [],
          interests: Array.isArray(parsed?.interests) ? parsed.interests : [],
        };
      } catch (e) {
        console.warn("Failed to parse learner profile in PATCH response:", e);
      }
    }

    return NextResponse.json({ user: { ...user, learnerProfile: parsedProfile } });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
