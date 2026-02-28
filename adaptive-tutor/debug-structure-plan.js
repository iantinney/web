#!/usr/bin/env node

/**
 * Debug script: Test the structure-plan endpoint directly
 */

const apiKey = process.env.ANTHROPIC_API_KEY || process.env.MINIMAX_API_KEY || "";
const baseURL = process.env.ANTHROPIC_BASE_URL || "https://api.minimax.io/anthropic";

async function main() {
  // First, create a study plan
  console.log("Step 1: Creating study plan...");

  const planRes = await fetch("http://localhost:3000/api/study-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "Debug Test Plan",
      description: "For testing structure-plan",
      sourceText: "Test material",
    }),
  });

  if (!planRes.ok) {
    const err = await planRes.json();
    console.error("❌ Failed to create study plan:", err);
    return;
  }

  const { plan } = await planRes.json();
  const planId = plan.id;
  console.log(`✅ Created plan: ${planId}`);

  // Now test structure-plan endpoint
  console.log("\nStep 2: Testing structure-plan endpoint...");

  const textPlan = `# Machine Learning Basics

**Tier 1 — Foundations**
- Linear Algebra
- Probability & Statistics
- Python Programming

**Tier 2 — Core ML Concepts**
- Supervised Learning
- Unsupervised Learning
- Model Evaluation

**Tier 3 — Advanced Topics**
- Deep Learning
- Reinforcement Learning
- Production ML Systems`;

  console.log("\n📤 Sending textPlan:");
  console.log(textPlan);
  console.log("\n📡 Requesting /api/study-plans/" + planId + "/structure-plan...");

  const structRes = await fetch(`http://localhost:3000/api/study-plans/${planId}/structure-plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      textPlan,
      priorKnowledge: "Some programming experience",
    }),
  });

  console.log(`\n📥 Response Status: ${structRes.status}`);

  const responseText = await structRes.text();
  console.log("\n📥 Response Body:");

  try {
    const data = JSON.parse(responseText);
    console.log(JSON.stringify(data, null, 2));

    if (structRes.ok) {
      console.log("\n✅ SUCCESS!");
      console.log(`Lesson plan: ${data.lessonPlan?.totalConcepts} concepts`);
      console.log(`Tier 1: ${data.lessonPlan?.tier1?.length || 0} concepts`);
      console.log(`Tier 2: ${data.lessonPlan?.tier2?.length || 0} concepts`);
      console.log(`Tier 3: ${data.lessonPlan?.tier3?.length || 0} concepts`);
    } else {
      console.log("\n❌ FAILED");
      if (data.error) {
        console.log(`Error: ${data.error}`);
        if (data.details) {
          console.log(`Details:`, data.details);
        }
      }
    }
  } catch {
    console.log("Raw response (not JSON):");
    console.log(responseText);
  }
}

main().catch(console.error);
