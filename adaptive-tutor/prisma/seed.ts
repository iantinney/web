/**
 * Seed script: Run with `npm run seed`
 *
 * Creates the demo user and a demo study plan for first-run experience.
 * Idempotent: safe to run multiple times.
 */

import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const DB_PATH = path.resolve(process.cwd(), "prisma/dev.db");

const adapter = new PrismaLibSql({ url: `file:${DB_PATH}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...\n");

  // 1. Demo user (upsert — idempotent)
  const user = await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: {
      id: "demo-user",
      displayName: "Learner",
    },
  });
  console.log(`  Created/found demo user: ${user.id} (${user.displayName})`);

  // 2. Demo study plan (create if none exist for this user)
  const existingPlans = await prisma.studyPlan.findMany({
    where: { userId: "demo-user" },
  });

  if (existingPlans.length === 0) {
    const plan = await prisma.studyPlan.create({
      data: {
        userId: "demo-user",
        title: "Introduction to Linear Algebra",
        description: "A structured study plan covering vectors, matrices, and transformations",
        sourceText: "Linear algebra is the branch of mathematics that deals with linear equations, linear maps, and their representations in vector spaces and matrices.",
        status: "active",
      },
    });
    console.log(`  Created demo study plan: ${plan.id} ("${plan.title}")`);
  } else {
    console.log(`  Found ${existingPlans.length} existing study plan(s) — skipping demo plan creation`);
  }

  console.log("\nSeed complete! Run `npm run dev` to start the app.\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
