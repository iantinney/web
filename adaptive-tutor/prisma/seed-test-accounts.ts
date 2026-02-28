/**
 * Test Account Seeding Script
 *
 * Creates two test users with pre-built data to bypass the learning flow:
 * 1. "gap-test-user" — Ready to test gap detection (has 2 PREREQUISITE_GAP attempts recorded)
 * 2. "mastery-test-user" — Ready to test mastery redirect (prerequisite at 0.8, original at 0.3)
 *
 * Run with: npm run seed:test-accounts
 *
 * These accounts let you test the gap detection UI immediately without going through
 * the full study plan creation and practice flow.
 */

import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const DB_PATH = path.resolve(process.cwd(), "prisma/dev.db");

const adapter = new PrismaLibSql({ url: `file:${DB_PATH}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("\n🧪 Seeding test accounts...\n");

  // ============================================================================
  // TEST ACCOUNT 1: Gap Detection Test
  // ============================================================================
  console.log("📊 Setting up: gap-test-user (gap detection ready)");

  // 1a. Create user
  const gapTestUser = await prisma.user.upsert({
    where: { id: "gap-test-user" },
    update: {},
    create: {
      id: "gap-test-user",
      displayName: "Gap Test Learner",
      learnerProfile: JSON.stringify({
        background: ["High School Math"],
        goals: ["Learn Calculus"],
        interests: ["STEM"],
      }),
    },
  });
  console.log(`  ✓ User created: ${gapTestUser.id}`);

  // 1b. Create study plan
  const gapStudyPlan = await prisma.studyPlan.upsert({
    where: { id: "gap-study-plan-1" },
    update: {},
    create: {
      id: "gap-study-plan-1",
      userId: "gap-test-user",
      title: "Calculus Fundamentals",
      description: "Learn calculus basics",
      sourceText: "Calculus is the study of continuous change.",
      status: "active",
    },
  });
  console.log(`  ✓ Study plan created: ${gapStudyPlan.id}`);

  // 1c. Create concepts
  const algebraConcept = await prisma.concept.upsert({
    where: { id: "algebra-concept-1" },
    update: {},
    create: {
      id: "algebra-concept-1",
      userId: "gap-test-user",
      name: "Algebra Fundamentals",
      description: "Solving equations, polynomials, factoring",
      nameNormalized: "algebra-fundamentals",
      proficiency: 0.0,
      nextDue: null,
    },
  });

  const calculusConcept = await prisma.concept.upsert({
    where: { id: "calculus-concept-1" },
    update: {},
    create: {
      id: "calculus-concept-1",
      userId: "gap-test-user",
      name: "Differential Calculus",
      description: "Limits, derivatives, rates of change",
      nameNormalized: "differential-calculus",
      proficiency: 0.3, // User has some knowledge but will struggle
      nextDue: null,
    },
  });
  console.log(`  ✓ Concepts created: Algebra, Calculus`);

  // 1d. Create unit graph
  const gapGraph = await prisma.unitGraph.upsert({
    where: { id: "gap-graph-1" },
    update: {},
    create: {
      id: "gap-graph-1",
      studyPlanId: gapStudyPlan.id,
      title: "Calculus Learning Path",
      description: "With prerequisites",
    },
  });
  console.log(`  ✓ Graph created: ${gapGraph.id}`);

  // 1e. Create graph memberships
  try {
    await prisma.graphMembership.create({
      data: {
        unitGraphId: gapGraph.id,
        conceptId: "algebra-concept-1",
        positionX: 0,
        positionY: 0,
        depthTier: 1,
      },
    });
  } catch (e) {
    // Ignore if already exists
  }

  try {
    await prisma.graphMembership.create({
      data: {
        unitGraphId: gapGraph.id,
        conceptId: "calculus-concept-1",
        positionX: 200,
        positionY: 0,
        depthTier: 2,
      },
    });
  } catch (e) {
    // Ignore if already exists
  }
  console.log(`  ✓ Graph memberships created`);

  // 1f. Create prerequisite edge (Algebra → Calculus)
  try {
    await prisma.conceptEdge.create({
      data: {
        unitGraphId: gapGraph.id,
        fromNodeId: "algebra-concept-1", // Prerequisite
        toNodeId: "calculus-concept-1", // Depends on
        edgeType: "prerequisite",
      },
    });
  } catch (e) {
    // Ignore if already exists
  }
  console.log(`  ✓ Prerequisite edge created: Algebra → Calculus`);

  // 1g. Create questions for both concepts
  const calcQuestion1 = await prisma.question.create({
    data: {
      conceptId: "calculus-concept-1",
      questionType: "free_response",
      questionText: "What is the derivative of x² + 3x?",
      correctAnswer: "2x + 3",
      distractorsJson: JSON.stringify([]),
      explanation: "Use the power rule: d/dx(x²) = 2x, d/dx(3x) = 3",
      difficulty: 0.5,
    },
  });

  const calcQuestion2 = await prisma.question.create({
    data: {
      conceptId: "calculus-concept-1",
      questionType: "free_response",
      questionText: "Find the derivative of sin(x) + x³",
      correctAnswer: "cos(x) + 3x²",
      distractorsJson: JSON.stringify([]),
      explanation: "Derivative of sin(x) is cos(x), derivative of x³ is 3x²",
      difficulty: 0.6,
    },
  });

  const algebraQuestion = await prisma.question.create({
    data: {
      conceptId: "algebra-concept-1",
      questionType: "mcq",
      questionText: "Solve for x: 2x + 5 = 13",
      correctAnswer: "4",
      distractorsJson: JSON.stringify(["3", "5", "9"]),
      explanation: "2x = 8, so x = 4",
      difficulty: 0.2,
    },
  });
  console.log(`  ✓ Questions created: 2 calculus, 1 algebra`);

  // 1h. Create attempt records (basic, for realism)
  // The GapDetection records (below) are what trigger the GapProposalCard
  try {
    await prisma.attemptRecord.create({
      data: {
        userId: "gap-test-user",
        questionId: calcQuestion1.id,
        userAnswer: "I don't know algebra",
        isCorrect: false,
        feedback: "Your answer was incorrect.",
        score: 0,
      },
    });
  } catch (e) {
    // Ignore if already exists
  }

  try {
    await prisma.attemptRecord.create({
      data: {
        userId: "gap-test-user",
        questionId: calcQuestion2.id,
        userAnswer: "Don't know where to start",
        isCorrect: false,
        feedback: "Your answer was incorrect.",
        score: 0,
      },
    });
  } catch (e) {
    // Ignore if already exists
  }
  console.log(`  ✓ Attempt records created: 2 failed attempts`);

  // 1i. Create GapDetection records to trigger the pattern
  // This is what makes the GapProposalCard appear
  try {
    await prisma.gapDetection.create({
      data: {
        userId: "gap-test-user",
        conceptId: "calculus-concept-1",
        missingConcept: "algebra-concept-1",
        severity: "high",
        explanation: "Student lacks algebraic foundation needed for calculus",
        status: "pending",
      },
    });
  } catch (e) {
    // Ignore if already exists
  }

  try {
    await prisma.gapDetection.create({
      data: {
        userId: "gap-test-user",
        conceptId: "calculus-concept-1",
        missingConcept: "algebra-concept-1",
        severity: "high",
        explanation: "Second instance: algebraic manipulation skills missing",
        status: "pending",
      },
    });
  } catch (e) {
    // Ignore if already exists
  }
  console.log(`  ✓ GapDetection records created: 2-occurrence pattern (triggers proposal)`);
  console.log(
    "\n  🎯 To test: Open Learn tab, start practice on 'Differential Calculus'"
  );
  console.log("     After viewing question, the GapProposalCard should appear\n");

  // ============================================================================
  // TEST ACCOUNT 2: Mastery Redirect Test
  // ============================================================================
  console.log("📊 Setting up: mastery-test-user (mastery redirect ready)");

  // 2a. Create user
  const masteryTestUser = await prisma.user.upsert({
    where: { id: "mastery-test-user" },
    update: {},
    create: {
      id: "mastery-test-user",
      displayName: "Mastery Test Learner",
      learnerProfile: JSON.stringify({
        background: ["Computer Science"],
        goals: ["Master Data Structures"],
        interests: ["Algorithms"],
      }),
    },
  });
  console.log(`  ✓ User created: ${masteryTestUser.id}`);

  // 2b. Create study plan
  const masteryStudyPlan = await prisma.studyPlan.upsert({
    where: { id: "mastery-study-plan-1" },
    update: {},
    create: {
      id: "mastery-study-plan-1",
      userId: "mastery-test-user",
      title: "Data Structures Deep Dive",
      description: "Advanced data structures learning",
      sourceText: "Master complex data structure concepts",
      status: "active",
    },
  });
  console.log(`  ✓ Study plan created: ${masteryStudyPlan.id}`);

  // 2c. Create concepts
  const arraysConcept = await prisma.concept.upsert({
    where: { id: "arrays-concept-1" },
    update: {},
    create: {
      id: "arrays-concept-1",
      userId: "mastery-test-user",
      name: "Array Fundamentals",
      description: "Arrays, indexing, iteration",
      nameNormalized: "array-fundamentals",
      proficiency: 0.95, // ✅ MASTERED (prerequisite that was inserted)
      nextDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  const hashTablesConcept = await prisma.concept.upsert({
    where: { id: "hashtables-concept-1" },
    update: {},
    create: {
      id: "hashtables-concept-1",
      userId: "mastery-test-user",
      name: "Hash Tables",
      description: "Hash functions, collision handling, hash maps",
      nameNormalized: "hash-tables",
      proficiency: 0.35, // 🔴 LOW (original concept user is struggling with)
      nextDue: null,
    },
  });
  console.log(`  ✓ Concepts created: Arrays (mastered), Hash Tables (struggling)`);

  // 2d. Create unit graph
  const masteryGraph = await prisma.unitGraph.upsert({
    where: { id: "mastery-graph-1" },
    update: {},
    create: {
      id: "mastery-graph-1",
      studyPlanId: masteryStudyPlan.id,
      title: "Data Structures Path",
      description: "Arrays → Hash Tables",
    },
  });
  console.log(`  ✓ Graph created: ${masteryGraph.id}`);

  // 2e. Create graph memberships
  try {
    await prisma.graphMembership.create({
      data: {
        unitGraphId: masteryGraph.id,
        conceptId: "arrays-concept-1",
        positionX: 0,
        positionY: 0,
        depthTier: 1,
      },
    });
  } catch (e) {
    // Ignore if already exists
  }

  try {
    await prisma.graphMembership.create({
      data: {
        unitGraphId: masteryGraph.id,
        conceptId: "hashtables-concept-1",
        positionX: 200,
        positionY: 0,
        depthTier: 2,
      },
    });
  } catch (e) {
    // Ignore if already exists
  }
  console.log(`  ✓ Graph memberships created`);

  // 2f. Create prerequisite edge
  try {
    await prisma.conceptEdge.create({
      data: {
        unitGraphId: masteryGraph.id,
        fromNodeId: "arrays-concept-1",
        toNodeId: "hashtables-concept-1",
        edgeType: "prerequisite",
      },
    });
  } catch (e) {
    // Ignore if already exists
  }
  console.log(`  ✓ Prerequisite edge created: Arrays → Hash Tables`);

  // 2g. Create questions
  const htQuestion1 = await prisma.question.create({
    data: {
      conceptId: "hashtables-concept-1",
      questionType: "mcq",
      questionText: "What is a hash function?",
      correctAnswer: "A function that maps keys to array indices",
      distractorsJson: JSON.stringify([
        "A type of encryption",
        "A data structure",
        "A sorting algorithm",
      ]),
      explanation: "Hash functions convert keys into array indices",
      difficulty: 0.4,
    },
  });

  const arrayQuestion1 = await prisma.question.create({
    data: {
      conceptId: "arrays-concept-1",
      questionType: "mcq",
      questionText: "What is the time complexity of accessing array[5]?",
      correctAnswer: "O(1)",
      distractorsJson: JSON.stringify(["O(n)", "O(log n)", "O(n²)"]),
      explanation: "Array access is constant time",
      difficulty: 0.2,
    },
  });
  console.log(`  ✓ Questions created: 1 hash tables, 1 arrays`);

  // 2h. Create some attempt records for realism
  try {
    await prisma.attemptRecord.create({
      data: {
        userId: "mastery-test-user",
        questionId: arrayQuestion1.id,
        userAnswer: "O(1)",
        isCorrect: true,
        feedback: "Correct!",
        score: 1,
      },
    });
  } catch (e) {
    // Ignore if already exists
  }

  try {
    await prisma.attemptRecord.create({
      data: {
        userId: "mastery-test-user",
        questionId: htQuestion1.id,
        userAnswer: "A function that maps keys to array indices",
        isCorrect: true,
        feedback: "Correct!",
        score: 1,
      },
    });
  } catch (e) {
    // Ignore if already exists
  }
  console.log(`  ✓ Attempt records created for realism`);

  console.log(
    "\n  🎯 To test: Open Learn tab, start practice on 'Hash Tables'"
  );
  console.log(
    "     Arrays is already mastered (0.95), so redirect should trigger\n"
  );

  // ============================================================================
  console.log("\n✅ Test account setup complete!\n");
  console.log("Test accounts ready:");
  console.log(
    "  1. gap-test-user → GapProposalCard will appear immediately in Learn tab"
  );
  console.log("  2. mastery-test-user → Mastery redirect flow ready to test");
  console.log(
    "\nTo use these accounts, modify the login or select them in the app.\n"
  );
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
