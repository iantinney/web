import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/health
 * Verify that the database, MiniMax config, and basic infrastructure work.
 */
export async function GET() {
  const checks: Record<string, boolean | string> = {};

  // Check database
  try {
    const userCount = await prisma.user.count();
    checks.database = userCount >= 0;
    const demoUser = await prisma.user.findUnique({ where: { id: "demo-user" } });
    checks.demoUser = demoUser !== null;
  } catch {
    checks.database = false;
    checks.demoUser = false;
  }

  // Check MiniMax API key
  checks.minimaxKeySet = !!process.env.MINIMAX_API_KEY && process.env.MINIMAX_API_KEY !== "your_key_here";

  // Check environment
  checks.nodeEnv = process.env.NODE_ENV ?? "unknown";

  const allGood = checks.database && checks.demoUser;

  return NextResponse.json({
    status: allGood ? "healthy" : "needs_setup",
    checks,
    message: allGood
      ? "All systems operational!"
      : "Run the seed script: npm run seed",
  });
}
