import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/minimax-native";
import type { LearnerProfile } from "@/lib/types";

/**
 * POST /api/users/profile/extract
 * Extract learner profile tags from conversation text
 * Body: { conversationText: string, userId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationText, userId } = body;

    if (!conversationText || !userId) {
      return NextResponse.json(
        { error: "conversationText and userId are required" },
        { status: 400 }
      );
    }

    // Fetch existing profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Parse existing profile with safety checks
    let existingProfile: LearnerProfile = { background: [], goals: [], interests: [] };
    if (user.learnerProfile) {
      try {
        const parsed = JSON.parse(user.learnerProfile);
        existingProfile = {
          background: Array.isArray(parsed?.background) ? parsed.background : [],
          goals: Array.isArray(parsed?.goals) ? parsed.goals : [],
          interests: Array.isArray(parsed?.interests) ? parsed.interests : [],
        };
      } catch (parseError) {
        console.warn("Failed to parse existing learner profile:", parseError);
      }
    }

    // Call MiniMax to extract tags
    const extractionPrompt = `You are extracting structured learner profile information from a conversation.

EXISTING PROFILE TAGS (already captured):
- Background: ${(existingProfile.background?.length ?? 0) > 0 ? existingProfile.background.join(", ") : "none"}
- Goals: ${(existingProfile.goals?.length ?? 0) > 0 ? existingProfile.goals.join(", ") : "none"}
- Interests: ${(existingProfile.interests?.length ?? 0) > 0 ? existingProfile.interests.join(", ") : "none"}

CONVERSATION TEXT:
${conversationText}

---

Extract NEW tags about the learner from this conversation. Focus on information not already captured above.

Return ONLY a JSON object (no markdown, no explanation):
{
  "background": ["tag1", "tag2"],
  "goals": ["tag1", "tag2"],
  "interests": ["tag1", "tag2"]
}

RULES:
- background: qualifications, experience, education level (e.g., "Software Developer", "Computer Science Student", "Self-taught Programmer")
- goals: what they want to achieve (e.g., "Learn Next.js", "Build full-stack apps", "Prepare for interviews")
- interests: topics or domains they care about (e.g., "Web development", "AI", "Startups")
- Each tag should be 2-5 words max
- Only include NEW tags not already in the existing profile
- If no new information found for a category, return empty array
- Return valid JSON only`;

    const extractedJson = await generateText(
      [
        {
          role: "user",
          content: extractionPrompt,
        },
      ],
      "", // empty system prompt, all context in user message
      { temperature: 0.5, maxTokens: 1024 }
    );

    // Parse extracted tags
    let newTags: { background: string[]; goals: string[]; interests: string[] } = {
      background: [],
      goals: [],
      interests: [],
    };

    try {
      newTags = JSON.parse(extractedJson);
    } catch (parseError) {
      console.warn("Failed to parse extracted tags:", extractedJson);
    }

    // Merge with existing profile (deduplicate by lowercased value)
    const mergedProfile: LearnerProfile = {
      background: deduplicate([...(existingProfile.background ?? []), ...(newTags.background ?? [])]),
      goals: deduplicate([...(existingProfile.goals ?? []), ...(newTags.goals ?? [])]),
      interests: deduplicate([...(existingProfile.interests ?? []), ...(newTags.interests ?? [])]),
    };

    // Save merged profile to database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        learnerProfile: JSON.stringify(mergedProfile),
      },
    });

    return NextResponse.json({
      profile: mergedProfile,
      newTags,
    });
  } catch (error) {
    console.error("Error extracting profile:", error);
    return NextResponse.json(
      { error: "Failed to extract profile", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Deduplicate array by lowercased value while preserving original case
 */
function deduplicate(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const normalized = item.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(item);
    }
  }

  return result;
}
