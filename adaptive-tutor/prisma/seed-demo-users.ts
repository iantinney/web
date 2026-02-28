/**
 * Demo User Seeding Script
 *
 * Creates two realistic demo users for video demonstration:
 *
 * 1. "Jonathan" — Struggling with calculus because his algebra is weak.
 *    Low proficiencies overall, many wrong answers, gap detection patterns.
 *
 * 2. "Tianyu" — Excelling at machine learning, wants to go deeper.
 *    High proficiencies overall, strong session stats, extension proposals.
 *
 * Run with: npm run seed:demo-users
 *
 * Both users can be accessed by typing their name in the login modal.
 * The database file (prisma/dev.db) is committed to git so teammates
 * get the same demo data after `git pull`.
 */

import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const DB_PATH = path.resolve(process.cwd(), "prisma/dev.db");
const adapter = new PrismaLibSql({ url: `file:${DB_PATH}` });
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

/** Upsert-like create that silently skips on unique constraint violations */
async function safeCreate<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e: unknown) {
    const msg = (e as Error)?.message ?? "";
    if (msg.includes("Unique constraint") || msg.includes("UNIQUE")) return null;
    throw e;
  }
}

// ---------------------------------------------------------------------------
// JONATHAN — Struggling Calculus Student
// ---------------------------------------------------------------------------

async function seedJonathan() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  JONATHAN — Calculus learner, weak algebra");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // --- User ---
  const user = await prisma.user.upsert({
    where: { id: "Jonathan" },
    update: { displayName: "Jonathan" },
    create: {
      id: "Jonathan",
      displayName: "Jonathan",
      learnerProfile: JSON.stringify({
        background: ["High school math", "AP Precalculus"],
        goals: ["Pass Calculus I", "Understand derivatives"],
        interests: ["Physics", "Engineering"],
      }),
    },
  });
  console.log(`  User: ${user.id}`);

  // --- Study Plan ---
  const plan = await prisma.studyPlan.upsert({
    where: { id: "jonathan-calc-plan" },
    update: {},
    create: {
      id: "jonathan-calc-plan",
      userId: "Jonathan",
      title: "Calculus I",
      description: "Limits, derivatives, and integrals — building from algebra foundations",
      sourceText: "Calculus I covers limits, continuity, differentiation, and integration. Prerequisites include strong algebra and trigonometry.",
      status: "active",
    },
  });
  console.log(`  Study Plan: ${plan.title}`);

  // --- Unit Graph ---
  const graph = await prisma.unitGraph.upsert({
    where: { id: "jonathan-calc-graph" },
    update: {},
    create: {
      id: "jonathan-calc-graph",
      studyPlanId: plan.id,
      title: "Calculus I",
      description: "From algebra foundations to basic integration",
    },
  });
  console.log(`  Graph: ${graph.title}`);

  // --- Concepts ---
  // Jonathan is weak at algebra (the root cause), which cascades up.
  // Layout: left-to-right flow, algebra → functions → limits → derivatives → integration
  const concepts = [
    { id: "j-algebra",       name: "Algebraic Manipulation",   desc: "Factoring, simplifying expressions, solving equations",        prof: 0.25, conf: 0.4, attempts: 12, tier: 1, x: 0,   y: 150 },
    { id: "j-functions",     name: "Functions & Graphs",       desc: "Domain, range, function composition, graph transformations",    prof: 0.30, conf: 0.35, attempts: 8,  tier: 1, x: 200, y: 50  },
    { id: "j-trig",          name: "Trigonometry",             desc: "Unit circle, trig identities, inverse trig functions",          prof: 0.20, conf: 0.3, attempts: 6,  tier: 1, x: 200, y: 250 },
    { id: "j-limits",        name: "Limits & Continuity",      desc: "Limit laws, squeeze theorem, continuity, IVT",                 prof: 0.35, conf: 0.4, attempts: 10, tier: 2, x: 450, y: 100 },
    { id: "j-derivatives",   name: "Derivatives",              desc: "Power rule, product rule, quotient rule, chain rule",           prof: 0.15, conf: 0.25, attempts: 8,  tier: 3, x: 650, y: 50  },
    { id: "j-trig-deriv",    name: "Trigonometric Derivatives", desc: "Derivatives of sin, cos, tan and inverse trig functions",      prof: 0.10, conf: 0.2, attempts: 4,  tier: 3, x: 650, y: 200 },
    { id: "j-applications",  name: "Applications of Derivatives", desc: "Related rates, optimization, linear approximation",         prof: 0.08, conf: 0.15, attempts: 3,  tier: 4, x: 900, y: 100 },
    { id: "j-integration",   name: "Basic Integration",        desc: "Antiderivatives, definite integrals, FTC",                     prof: 0.05, conf: 0.1, attempts: 2,  tier: 5, x: 1100, y: 100 },
  ];

  for (const c of concepts) {
    await prisma.concept.upsert({
      where: { id: c.id },
      update: { proficiency: c.prof, confidence: c.conf, attemptCount: c.attempts },
      create: {
        id: c.id,
        userId: "Jonathan",
        name: c.name,
        nameNormalized: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: c.desc,
        proficiency: c.prof,
        confidence: c.conf,
        attemptCount: c.attempts,
        easeFactor: 2.5,
        interval: 1,
        repetitionCount: c.attempts,
        lastPracticed: daysAgo(1),
        nextDue: new Date(),
      },
    });
    await safeCreate(() =>
      prisma.graphMembership.create({
        data: { conceptId: c.id, unitGraphId: graph.id, positionX: c.x, positionY: c.y, depthTier: c.tier },
      })
    );
  }
  console.log(`  Concepts: ${concepts.length} created`);

  // --- Edges (prerequisite flow) ---
  const edges = [
    ["j-algebra", "j-functions"],
    ["j-algebra", "j-trig"],
    ["j-functions", "j-limits"],
    ["j-trig", "j-limits"],
    ["j-limits", "j-derivatives"],
    ["j-trig", "j-trig-deriv"],
    ["j-derivatives", "j-trig-deriv"],
    ["j-derivatives", "j-applications"],
    ["j-applications", "j-integration"],
  ];
  for (const [from, to] of edges) {
    await safeCreate(() =>
      prisma.conceptEdge.create({
        data: { fromNodeId: from, toNodeId: to, unitGraphId: graph.id, studyPlanId: plan.id, edgeType: "prerequisite" },
      })
    );
  }
  console.log(`  Edges: ${edges.length} prerequisite links`);

  // --- Questions (multiple per concept, mix of types) ---
  const questionData = [
    // Algebra
    { cid: "j-algebra", type: "mcq",           q: "Simplify: (x² - 9) / (x - 3)",                                       a: "x + 3",                   d: ["x - 3", "x² - 3", "9"],             exp: "Factor the numerator: (x-3)(x+3)/(x-3) = x+3", diff: 0.3 },
    { cid: "j-algebra", type: "mcq",           q: "Factor: x² + 5x + 6",                                                a: "(x + 2)(x + 3)",          d: ["(x + 1)(x + 6)", "(x - 2)(x - 3)", "(x + 2)(x - 3)"], exp: "Find two numbers that multiply to 6 and add to 5: 2 and 3", diff: 0.3 },
    { cid: "j-algebra", type: "fill_blank",     q: "Solve for x: 3x - 7 = 2x + 5",                                      a: "12",                       d: [],                                     exp: "Subtract 2x from both sides: x - 7 = 5, then add 7: x = 12", diff: 0.2 },
    { cid: "j-algebra", type: "mcq",           q: "What is the slope of the line 2y = 6x + 4?",                           a: "3",                        d: ["6", "2", "4"],                        exp: "Divide both sides by 2: y = 3x + 2. Slope is 3.", diff: 0.3 },
    // Functions
    { cid: "j-functions", type: "mcq",         q: "If f(x) = x² + 1, what is f(3)?",                                     a: "10",                       d: ["9", "7", "12"],                       exp: "f(3) = 3² + 1 = 9 + 1 = 10", diff: 0.2 },
    { cid: "j-functions", type: "mcq",         q: "What is the domain of f(x) = 1/(x-2)?",                                a: "All real numbers except 2", d: ["All real numbers", "x > 2", "x ≥ 0"], exp: "The denominator cannot be zero, so x ≠ 2", diff: 0.4 },
    { cid: "j-functions", type: "free_response", q: "Explain what it means for a function to be 'one-to-one'.",             a: "Each output value corresponds to exactly one input value", d: [], exp: "A function is one-to-one (injective) if f(a) = f(b) implies a = b", diff: 0.5 },
    // Trig
    { cid: "j-trig", type: "mcq",             q: "What is sin(π/2)?",                                                     a: "1",                        d: ["0", "-1", "1/2"],                     exp: "On the unit circle, π/2 is at the top where y = 1", diff: 0.2 },
    { cid: "j-trig", type: "mcq",             q: "Which identity is correct?",                                             a: "sin²θ + cos²θ = 1",       d: ["sin²θ - cos²θ = 1", "sinθ + cosθ = 1", "sin²θ + cos²θ = 2"], exp: "The Pythagorean identity: sin²θ + cos²θ = 1", diff: 0.3 },
    { cid: "j-trig", type: "fill_blank",       q: "cos(0) = ?",                                                            a: "1",                        d: [],                                     exp: "On the unit circle at angle 0, the x-coordinate is 1", diff: 0.15 },
    // Limits
    { cid: "j-limits", type: "mcq",           q: "What is lim(x→2) of (x² - 4)/(x - 2)?",                                a: "4",                        d: ["0", "2", "undefined"],                exp: "Factor: (x-2)(x+2)/(x-2) = x+2. As x→2, this equals 4", diff: 0.5 },
    { cid: "j-limits", type: "mcq",           q: "A function is continuous at x = a if:",                                  a: "lim(x→a) f(x) = f(a)",    d: ["f(a) exists", "The limit exists", "f'(a) exists"], exp: "Continuity requires the limit to equal the function value", diff: 0.4 },
    { cid: "j-limits", type: "free_response",  q: "Explain the Squeeze Theorem in your own words.",                        a: "If g(x) ≤ f(x) ≤ h(x) near a, and lim g = lim h = L, then lim f = L", d: [], exp: "The Squeeze Theorem says if a function is trapped between two functions that converge to the same limit, it must also converge to that limit", diff: 0.6 },
    // Derivatives
    { cid: "j-derivatives", type: "mcq",       q: "What is the derivative of x³?",                                        a: "3x²",                     d: ["x²", "3x", "x³"],                    exp: "Power rule: d/dx(xⁿ) = nxⁿ⁻¹, so d/dx(x³) = 3x²", diff: 0.3 },
    { cid: "j-derivatives", type: "fill_blank", q: "d/dx [5x⁴ + 2x] = ?",                                                a: "20x³ + 2",                d: [],                                     exp: "Power rule: 5·4x³ + 2·1 = 20x³ + 2", diff: 0.4 },
    { cid: "j-derivatives", type: "mcq",       q: "The chain rule states that d/dx[f(g(x))] equals:",                     a: "f'(g(x)) · g'(x)",        d: ["f'(x) · g'(x)", "f(g'(x))", "f'(g(x))"], exp: "The chain rule: differentiate the outer function, then multiply by the derivative of the inner", diff: 0.6 },
    // Trig derivatives
    { cid: "j-trig-deriv", type: "mcq",       q: "What is d/dx [sin(x)]?",                                                a: "cos(x)",                   d: ["-cos(x)", "sin(x)", "-sin(x)"],       exp: "The derivative of sin(x) is cos(x)", diff: 0.3 },
    { cid: "j-trig-deriv", type: "mcq",       q: "What is d/dx [cos(x)]?",                                                a: "-sin(x)",                  d: ["sin(x)", "cos(x)", "-cos(x)"],        exp: "The derivative of cos(x) is -sin(x)", diff: 0.3 },
    // Applications
    { cid: "j-applications", type: "free_response", q: "A ball is thrown upward with position s(t) = -16t² + 64t. What is its velocity at t = 1?", a: "32 ft/s", d: [], exp: "v(t) = s'(t) = -32t + 64. At t=1: v(1) = -32 + 64 = 32 ft/s", diff: 0.5 },
    { cid: "j-applications", type: "mcq",     q: "To find the maximum value of f(x), you should:",                         a: "Set f'(x) = 0 and check critical points", d: ["Set f(x) = 0", "Find f''(x)", "Graph the function"], exp: "Maximum/minimum values occur at critical points where f'(x) = 0 or is undefined", diff: 0.5 },
    // Integration
    { cid: "j-integration", type: "mcq",       q: "What is the antiderivative of 2x?",                                    a: "x² + C",                  d: ["2x² + C", "x + C", "2 + C"],          exp: "Since d/dx(x²) = 2x, the antiderivative of 2x is x² + C", diff: 0.4 },
    { cid: "j-integration", type: "mcq",       q: "The Fundamental Theorem of Calculus connects:",                         a: "Differentiation and integration", d: ["Limits and continuity", "Algebra and geometry", "Functions and relations"], exp: "The FTC states that integration and differentiation are inverse operations", diff: 0.5 },
  ];

  // Create questions linked to both concept and study plan
  const createdQuestions: { id: string; cid: string }[] = [];
  for (const qd of questionData) {
    const q = await prisma.question.create({
      data: {
        conceptId: qd.cid,
        studyPlanId: plan.id,
        questionType: qd.type,
        questionText: qd.q,
        correctAnswer: qd.a,
        distractorsJson: JSON.stringify(qd.d),
        explanation: qd.exp,
        difficulty: qd.diff,
      },
    });
    createdQuestions.push({ id: q.id, cid: qd.cid });
  }
  console.log(`  Questions: ${createdQuestions.length} created`);

  // --- Session Record ---
  const session = await prisma.sessionRecord.create({
    data: {
      unitGraphId: graph.id,
      studyPlanId: plan.id,
      sessionType: "practice",
      startTime: hoursAgo(2),
      endTime: hoursAgo(1),
      questionsAttempted: 15,
      questionsCorrect: 4,
      conceptsCoveredJson: JSON.stringify(["j-algebra", "j-functions", "j-limits", "j-derivatives"]),
    },
  });

  // --- Attempt Records (mostly wrong — Jonathan struggles) ---
  // Create realistic attempts: ~27% accuracy
  const jonathanAttempts = [
    // Algebra — gets some right but many wrong
    { qIdx: 0, answer: "x - 3",            correct: false, score: 0   },
    { qIdx: 1, answer: "(x + 1)(x + 6)",   correct: false, score: 0   },
    { qIdx: 2, answer: "7",                 correct: false, score: 0   },
    { qIdx: 3, answer: "3",                 correct: true,  score: 1   },
    // Functions — struggles
    { qIdx: 4, answer: "10",                correct: true,  score: 1   },
    { qIdx: 5, answer: "All real numbers",  correct: false, score: 0   },
    // Trig — very weak
    { qIdx: 7, answer: "0",                 correct: false, score: 0   },
    { qIdx: 8, answer: "sinθ + cosθ = 1",   correct: false, score: 0   },
    // Limits — some understanding
    { qIdx: 10, answer: "4",                correct: true,  score: 1   },
    { qIdx: 11, answer: "f(a) exists",      correct: false, score: 0   },
    // Derivatives — really struggling
    { qIdx: 13, answer: "x²",               correct: false, score: 0   },
    { qIdx: 14, answer: "20x + 2",          correct: false, score: 0   },
    { qIdx: 15, answer: "f'(x) · g'(x)",   correct: false, score: 0   },
    // Trig derivatives — barely attempted
    { qIdx: 16, answer: "cos(x)",           correct: true,  score: 1   },
    // Applications — lost
    { qIdx: 18, answer: "I'm not sure how to take the derivative here", correct: false, score: 0.15 },
  ];

  for (const att of jonathanAttempts) {
    const qInfo = createdQuestions[att.qIdx];
    if (!qInfo) continue;
    await prisma.attemptRecord.create({
      data: {
        userId: "Jonathan",
        questionId: qInfo.id,
        sessionId: session.id,
        userAnswer: att.answer,
        isCorrect: att.correct,
        score: att.score,
        feedback: att.correct ? "Correct!" : "Not quite. Review the explanation.",
        timeTaken: Math.floor(15000 + Math.random() * 45000),
        createdAt: hoursAgo(2 - Math.random()),
      },
    });
  }
  console.log(`  Attempts: ${jonathanAttempts.length} recorded (${jonathanAttempts.filter(a => a.correct).length} correct)`);

  // --- Gap Detection (algebra is the root problem) ---
  await prisma.gapDetection.create({
    data: {
      userId: "Jonathan",
      conceptId: "j-derivatives",
      missingConcept: "Algebraic Manipulation",
      severity: "BROAD",
      explanation: "Jonathan struggles with derivative problems because he can't simplify algebraic expressions — factoring and polynomial manipulation are weak.",
      status: "detected",
      createdAt: hoursAgo(1),
    },
  });
  await prisma.gapDetection.create({
    data: {
      userId: "Jonathan",
      conceptId: "j-limits",
      missingConcept: "Algebraic Manipulation",
      severity: "MODERATE",
      explanation: "Limit evaluation requires factoring and simplification, which Jonathan hasn't mastered.",
      status: "detected",
      createdAt: hoursAgo(1),
    },
  });
  console.log("  Gap Detections: 2 (algebra weakness identified)");

  console.log("\n  Login as: Jonathan");
  console.log("  Scenario: Calculus student held back by weak algebra\n");
}

// ---------------------------------------------------------------------------
// TIANYU — Excelling ML Student
// ---------------------------------------------------------------------------

async function seedTianyu() {
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  TIANYU — Machine Learning, high proficiency");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // --- User ---
  const user = await prisma.user.upsert({
    where: { id: "Tianyu" },
    update: { displayName: "Tianyu" },
    create: {
      id: "Tianyu",
      displayName: "Tianyu",
      learnerProfile: JSON.stringify({
        background: ["Linear algebra", "Python programming", "Statistics"],
        goals: ["Master deep learning", "Publish ML research"],
        interests: ["Computer vision", "Natural language processing", "Reinforcement learning"],
      }),
    },
  });
  console.log(`  User: ${user.id}`);

  // --- Study Plan ---
  const plan = await prisma.studyPlan.upsert({
    where: { id: "tianyu-ml-plan" },
    update: {},
    create: {
      id: "tianyu-ml-plan",
      userId: "Tianyu",
      title: "Machine Learning",
      description: "From fundamentals to advanced deep learning — supervised, unsupervised, and neural architectures",
      sourceText: "Machine learning is a subset of artificial intelligence that enables systems to learn from data. Topics include regression, classification, neural networks, CNNs, RNNs, transformers, and reinforcement learning.",
      status: "active",
    },
  });
  console.log(`  Study Plan: ${plan.title}`);

  // --- Unit Graph ---
  const graph = await prisma.unitGraph.upsert({
    where: { id: "tianyu-ml-graph" },
    update: {},
    create: {
      id: "tianyu-ml-graph",
      studyPlanId: plan.id,
      title: "Machine Learning",
      description: "Supervised learning through transformers and beyond",
    },
  });
  console.log(`  Graph: ${graph.title}`);

  // --- Concepts ---
  // Tianyu is strong across the board, with some newer topics slightly lower
  const concepts = [
    { id: "t-linear-algebra", name: "Linear Algebra for ML",     desc: "Vectors, matrices, eigenvalues, SVD — the math backbone of ML",           prof: 0.92, conf: 0.9, attempts: 20, tier: 1, x: 0,   y: 100 },
    { id: "t-probability",    name: "Probability & Statistics",   desc: "Distributions, Bayes' theorem, MLE, hypothesis testing",                  prof: 0.88, conf: 0.85, attempts: 18, tier: 1, x: 0,   y: 300 },
    { id: "t-supervised",     name: "Supervised Learning",        desc: "Linear/logistic regression, SVMs, decision trees, ensemble methods",      prof: 0.90, conf: 0.88, attempts: 22, tier: 2, x: 250, y: 50  },
    { id: "t-unsupervised",   name: "Unsupervised Learning",      desc: "K-means, hierarchical clustering, PCA, autoencoders",                    prof: 0.85, conf: 0.82, attempts: 15, tier: 2, x: 250, y: 250 },
    { id: "t-neural-nets",    name: "Neural Networks",            desc: "Perceptrons, backpropagation, activation functions, optimization",        prof: 0.87, conf: 0.85, attempts: 25, tier: 3, x: 500, y: 150 },
    { id: "t-cnns",           name: "Convolutional Neural Nets",  desc: "Convolution layers, pooling, ResNets, image classification",              prof: 0.82, conf: 0.8, attempts: 16, tier: 4, x: 750, y: 50  },
    { id: "t-rnns",           name: "Recurrent Neural Nets",      desc: "LSTM, GRU, sequence modeling, time series prediction",                   prof: 0.78, conf: 0.75, attempts: 14, tier: 4, x: 750, y: 250 },
    { id: "t-transformers",   name: "Transformers & Attention",   desc: "Self-attention, multi-head attention, BERT, GPT architecture",            prof: 0.72, conf: 0.7, attempts: 10, tier: 5, x: 1000, y: 50  },
    { id: "t-rl",             name: "Reinforcement Learning",     desc: "MDPs, Q-learning, policy gradients, PPO, RLHF",                          prof: 0.65, conf: 0.6, attempts: 8,  tier: 5, x: 1000, y: 250 },
  ];

  for (const c of concepts) {
    await prisma.concept.upsert({
      where: { id: c.id },
      update: { proficiency: c.prof, confidence: c.conf, attemptCount: c.attempts },
      create: {
        id: c.id,
        userId: "Tianyu",
        name: c.name,
        nameNormalized: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        description: c.desc,
        proficiency: c.prof,
        confidence: c.conf,
        attemptCount: c.attempts,
        easeFactor: 2.8,
        interval: c.prof > 0.8 ? 7 : 3,
        repetitionCount: c.attempts,
        lastPracticed: daysAgo(1),
        nextDue: c.prof > 0.85 ? daysFromNow(7) : new Date(),
      },
    });
    await safeCreate(() =>
      prisma.graphMembership.create({
        data: { conceptId: c.id, unitGraphId: graph.id, positionX: c.x, positionY: c.y, depthTier: c.tier },
      })
    );
  }
  console.log(`  Concepts: ${concepts.length} created`);

  // --- Edges ---
  const edges = [
    ["t-linear-algebra", "t-supervised"],
    ["t-linear-algebra", "t-unsupervised"],
    ["t-probability", "t-supervised"],
    ["t-probability", "t-unsupervised"],
    ["t-supervised", "t-neural-nets"],
    ["t-unsupervised", "t-neural-nets"],
    ["t-neural-nets", "t-cnns"],
    ["t-neural-nets", "t-rnns"],
    ["t-cnns", "t-transformers"],
    ["t-rnns", "t-transformers"],
    ["t-neural-nets", "t-rl"],
  ];
  for (const [from, to] of edges) {
    await safeCreate(() =>
      prisma.conceptEdge.create({
        data: { fromNodeId: from, toNodeId: to, unitGraphId: graph.id, studyPlanId: plan.id, edgeType: "prerequisite" },
      })
    );
  }
  console.log(`  Edges: ${edges.length} prerequisite links`);

  // --- Questions ---
  const questionData = [
    // Linear Algebra
    { cid: "t-linear-algebra", type: "mcq",           q: "What does it mean for two vectors to be orthogonal?",                    a: "Their dot product is zero",           d: ["They are parallel", "They have equal magnitude", "They span R²"], exp: "Orthogonal vectors have a dot product of 0, meaning they are perpendicular", diff: 0.4 },
    { cid: "t-linear-algebra", type: "mcq",           q: "What is the purpose of SVD (Singular Value Decomposition)?",            a: "Decompose a matrix into rotation, scaling, and rotation", d: ["Solve linear systems", "Find eigenvalues only", "Invert matrices"], exp: "SVD decomposes A = UΣVᵀ: rotation, scaling, rotation", diff: 0.6 },
    { cid: "t-linear-algebra", type: "fill_blank",     q: "The rank of a 3x3 identity matrix is:",                                 a: "3",                                   d: [],  exp: "The identity matrix has 3 linearly independent columns, so rank = 3", diff: 0.2 },
    // Probability
    { cid: "t-probability", type: "mcq",               q: "Bayes' theorem relates P(A|B) to:",                                     a: "P(B|A) · P(A) / P(B)",               d: ["P(A) · P(B)", "P(A) + P(B)", "P(A∩B)"], exp: "Bayes: P(A|B) = P(B|A)P(A)/P(B)", diff: 0.4 },
    { cid: "t-probability", type: "free_response",     q: "Explain the difference between MLE and MAP estimation.",                a: "MLE maximizes likelihood only; MAP includes a prior distribution over parameters", d: [], exp: "MLE: argmax P(data|θ). MAP: argmax P(data|θ)P(θ). MAP adds a prior.", diff: 0.6 },
    // Supervised Learning
    { cid: "t-supervised", type: "mcq",                q: "Which regularization adds the absolute value of weights to the loss?",   a: "L1 (Lasso)",                          d: ["L2 (Ridge)", "Dropout", "Batch normalization"], exp: "L1/Lasso adds |w| to the loss, encouraging sparsity", diff: 0.4 },
    { cid: "t-supervised", type: "mcq",                q: "What is the bias-variance tradeoff?",                                   a: "Simpler models have high bias but low variance; complex models have low bias but high variance", d: ["Training vs test accuracy", "Speed vs accuracy", "Precision vs recall"], exp: "The bias-variance tradeoff is the tension between underfitting (high bias) and overfitting (high variance)", diff: 0.5 },
    { cid: "t-supervised", type: "fill_blank",          q: "In logistic regression, the output is transformed using the ___ function.", a: "sigmoid",                             d: [],  exp: "Logistic regression uses σ(z) = 1/(1+e^(-z)) to map outputs to [0,1]", diff: 0.3 },
    // Unsupervised
    { cid: "t-unsupervised", type: "mcq",              q: "What does PCA find?",                                                    a: "Directions of maximum variance in the data", d: ["Cluster centers", "Decision boundaries", "Outliers"], exp: "PCA finds principal components — orthogonal directions of maximum variance", diff: 0.4 },
    { cid: "t-unsupervised", type: "mcq",              q: "K-means clustering requires you to specify:",                            a: "The number of clusters k",            d: ["The cluster centers", "The distance metric", "The convergence threshold"], exp: "K-means requires pre-specifying k, the number of clusters", diff: 0.3 },
    // Neural Networks
    { cid: "t-neural-nets", type: "mcq",               q: "Why is ReLU preferred over sigmoid in hidden layers?",                   a: "It avoids the vanishing gradient problem", d: ["It's smoother", "It outputs probabilities", "It's differentiable everywhere"], exp: "ReLU: f(x)=max(0,x). Unlike sigmoid, gradients don't vanish for large inputs.", diff: 0.5 },
    { cid: "t-neural-nets", type: "free_response",     q: "Explain how backpropagation computes gradients in a neural network.",    a: "It applies the chain rule recursively from the loss backward through each layer, computing partial derivatives of the loss with respect to each weight", d: [], exp: "Backprop uses the chain rule: ∂L/∂w = ∂L/∂a · ∂a/∂z · ∂z/∂w, propagated layer by layer", diff: 0.6 },
    { cid: "t-neural-nets", type: "mcq",               q: "What is the purpose of batch normalization?",                            a: "Normalize layer inputs to stabilize training", d: ["Increase batch size", "Reduce model size", "Prevent dropout"], exp: "BatchNorm normalizes inputs to each layer, reducing internal covariate shift", diff: 0.5 },
    // CNNs
    { cid: "t-cnns", type: "mcq",                     q: "What operation does a convolutional layer perform?",                      a: "Sliding a learned filter across the input and computing dot products", d: ["Matrix multiplication", "Pooling", "Attention"], exp: "Convolution slides a kernel/filter across the input, computing local dot products to detect features", diff: 0.4 },
    { cid: "t-cnns", type: "mcq",                     q: "What problem do ResNets solve?",                                          a: "Degradation of accuracy in very deep networks", d: ["Overfitting", "Slow training", "Large memory usage"], exp: "ResNets use skip connections so gradients can flow directly, enabling training of 100+ layer networks", diff: 0.6 },
    // RNNs
    { cid: "t-rnns", type: "mcq",                     q: "What advantage does LSTM have over vanilla RNNs?",                        a: "It can learn long-term dependencies via gating mechanisms", d: ["It's faster to train", "It uses less memory", "It handles images better"], exp: "LSTM's forget/input/output gates control information flow, solving the vanishing gradient problem in sequences", diff: 0.5 },
    { cid: "t-rnns", type: "fill_blank",               q: "GRU simplifies LSTM by combining the forget and input gates into a single ___ gate.", a: "update", d: [], exp: "GRU uses an update gate (combines forget+input) and a reset gate", diff: 0.5 },
    // Transformers
    { cid: "t-transformers", type: "free_response",    q: "Explain the self-attention mechanism in transformers.",                   a: "Self-attention computes attention scores between all pairs of positions in a sequence, allowing each token to attend to every other token. It uses Query, Key, Value matrices: Attention(Q,K,V) = softmax(QKᵀ/√d)V", d: [], exp: "Self-attention: each position queries all others, computing weighted values. Score = softmax(QKᵀ/√dₖ)V", diff: 0.7 },
    { cid: "t-transformers", type: "mcq",              q: "Why do transformers use positional encoding?",                            a: "Self-attention is permutation invariant — it needs position info added", d: ["To reduce computation", "To enable parallelism", "To handle variable-length inputs"], exp: "Without positional encoding, self-attention treats 'the cat sat' the same as 'sat cat the'", diff: 0.6 },
    // RL
    { cid: "t-rl", type: "mcq",                       q: "In Q-learning, what does Q(s,a) represent?",                             a: "Expected cumulative reward from taking action a in state s", d: ["The immediate reward", "The state value", "The policy probability"], exp: "Q(s,a) = expected return from state s, taking action a, then following the optimal policy", diff: 0.5 },
    { cid: "t-rl", type: "mcq",                       q: "What is the exploration-exploitation tradeoff?",                         a: "Balancing trying new actions vs using the best known action", d: ["Training vs testing", "Speed vs accuracy", "Online vs offline learning"], exp: "Exploration discovers better strategies; exploitation uses current best. ε-greedy balances both.", diff: 0.4 },
    { cid: "t-rl", type: "free_response",              q: "Explain how PPO (Proximal Policy Optimization) improves upon vanilla policy gradients.", a: "PPO clips the policy ratio to prevent large updates that could destabilize training, keeping new policy close to the old policy", d: [], exp: "PPO adds a clipped surrogate objective: min(rₜA, clip(rₜ,1-ε,1+ε)A), preventing destructively large updates", diff: 0.8 },
  ];

  const createdQuestions: { id: string; cid: string }[] = [];
  for (const qd of questionData) {
    const q = await prisma.question.create({
      data: {
        conceptId: qd.cid,
        studyPlanId: plan.id,
        questionType: qd.type,
        questionText: qd.q,
        correctAnswer: qd.a,
        distractorsJson: JSON.stringify(qd.d),
        explanation: qd.exp,
        difficulty: qd.diff,
      },
    });
    createdQuestions.push({ id: q.id, cid: qd.cid });
  }
  console.log(`  Questions: ${createdQuestions.length} created`);

  // --- Session Records (multiple sessions — Tianyu practices regularly) ---
  const session1 = await prisma.sessionRecord.create({
    data: {
      unitGraphId: graph.id,
      studyPlanId: plan.id,
      sessionType: "practice",
      startTime: daysAgo(3),
      endTime: daysAgo(3),
      questionsAttempted: 12,
      questionsCorrect: 10,
      conceptsCoveredJson: JSON.stringify(["t-linear-algebra", "t-probability", "t-supervised", "t-unsupervised"]),
    },
  });
  const session2 = await prisma.sessionRecord.create({
    data: {
      unitGraphId: graph.id,
      studyPlanId: plan.id,
      sessionType: "practice",
      startTime: daysAgo(1),
      endTime: daysAgo(1),
      questionsAttempted: 10,
      questionsCorrect: 8,
      conceptsCoveredJson: JSON.stringify(["t-neural-nets", "t-cnns", "t-rnns", "t-transformers"]),
    },
  });

  // --- Attempt Records (mostly correct — Tianyu is strong) ---
  const tianyuAttempts = [
    // Linear Algebra — near perfect
    { qIdx: 0,  answer: "Their dot product is zero",           correct: true,  score: 1,    session: session1.id },
    { qIdx: 1,  answer: "Decompose a matrix into rotation, scaling, and rotation", correct: true, score: 1, session: session1.id },
    { qIdx: 2,  answer: "3",                                   correct: true,  score: 1,    session: session1.id },
    // Probability — strong
    { qIdx: 3,  answer: "P(B|A) · P(A) / P(B)",               correct: true,  score: 1,    session: session1.id },
    { qIdx: 4,  answer: "MLE maximizes the likelihood function P(data|θ), choosing the parameters that make the observed data most probable. MAP adds a prior P(θ), so it maximizes P(data|θ)P(θ). MAP is like regularized MLE.", correct: true, score: 0.92, session: session1.id },
    // Supervised — solid
    { qIdx: 5,  answer: "L1 (Lasso)",                          correct: true,  score: 1,    session: session1.id },
    { qIdx: 6,  answer: "Simpler models have high bias but low variance; complex models have low bias but high variance", correct: true, score: 1, session: session1.id },
    { qIdx: 7,  answer: "sigmoid",                             correct: true,  score: 1,    session: session1.id },
    // Unsupervised — good
    { qIdx: 8,  answer: "Directions of maximum variance in the data", correct: true, score: 1, session: session1.id },
    { qIdx: 9,  answer: "The number of clusters k",            correct: true,  score: 1,    session: session1.id },
    // Neural Nets — strong
    { qIdx: 10, answer: "It avoids the vanishing gradient problem", correct: true, score: 1, session: session2.id },
    { qIdx: 11, answer: "Backpropagation applies the chain rule from the output layer backward. For each weight, it computes ∂Loss/∂w by multiplying local gradients along the path from the loss to that weight. This is done efficiently by caching intermediate values during the forward pass.", correct: true, score: 0.95, session: session2.id },
    { qIdx: 12, answer: "Normalize layer inputs to stabilize training", correct: true, score: 1, session: session2.id },
    // CNNs — solid
    { qIdx: 13, answer: "Sliding a learned filter across the input and computing dot products", correct: true, score: 1, session: session2.id },
    { qIdx: 14, answer: "Overfitting",                         correct: false, score: 0,    session: session2.id }, // rare miss
    // RNNs — good but a slip
    { qIdx: 15, answer: "It can learn long-term dependencies via gating mechanisms", correct: true, score: 1, session: session2.id },
    { qIdx: 16, answer: "update",                              correct: true,  score: 1,    session: session2.id },
    // Transformers — learning these now, still strong
    { qIdx: 17, answer: "Self-attention computes pairwise attention between all tokens. Each token is projected into Q, K, V. Scores = softmax(QK^T / sqrt(d_k)). The output is a weighted sum of values, where weights come from the scores. Multi-head attention runs this in parallel across multiple heads.", correct: true, score: 0.90, session: session2.id },
    { qIdx: 18, answer: "Self-attention is permutation invariant — it needs position info added", correct: true, score: 1, session: session2.id },
    // RL — newest, still learning
    { qIdx: 19, answer: "Expected cumulative reward from taking action a in state s", correct: true, score: 1, session: session2.id },
    { qIdx: 20, answer: "Balancing trying new actions vs using the best known action", correct: true, score: 1, session: session2.id },
    { qIdx: 21, answer: "PPO limits how much the policy can change per update by clipping the probability ratio. This prevents the kind of catastrophic policy collapse you get with vanilla policy gradients where one bad update ruins everything.", correct: true, score: 0.85, session: session2.id },
  ];

  for (const att of tianyuAttempts) {
    const qInfo = createdQuestions[att.qIdx];
    if (!qInfo) continue;
    await prisma.attemptRecord.create({
      data: {
        userId: "Tianyu",
        questionId: qInfo.id,
        sessionId: att.session,
        userAnswer: att.answer,
        isCorrect: att.correct,
        score: att.score,
        feedback: att.correct ? "Excellent!" : "Not quite — review the explanation.",
        timeTaken: Math.floor(8000 + Math.random() * 25000),
        createdAt: daysAgo(att.session === session1.id ? 3 : 1),
      },
    });
  }
  console.log(`  Attempts: ${tianyuAttempts.length} recorded (${tianyuAttempts.filter(a => a.correct).length} correct)`);

  console.log("\n  Login as: Tianyu");
  console.log("  Scenario: ML expert pushing into transformers & RL\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("\n╔═══════════════════════════════════════════════════╗");
  console.log("║          DEMO USER SEED — Video Demo             ║");
  console.log("╚═══════════════════════════════════════════════════╝");

  await seedJonathan();
  await seedTianyu();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Done! Two demo accounts ready:");
  console.log("");
  console.log("  Jonathan  — type 'Jonathan' at login");
  console.log("              Calculus I, low proficiency, weak algebra");
  console.log("");
  console.log("  Tianyu    — type 'Tianyu' at login");
  console.log("              Machine Learning, high proficiency");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
