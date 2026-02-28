/**
 * Test sources end-to-end: DB → API → Frontend
 */

import { prisma } from "@/lib/prisma";

async function testFlow() {
  console.log("=== TESTING SOURCES FLOW ===\n");

  // 1. Check one question with sources in DB
  const dbQuestion = await prisma.question.findFirst({
    where: { sourcesJson: { not: "[]" } },
  });

  if (!dbQuestion) {
    console.log("❌ NO QUESTIONS WITH SOURCES IN DB");
    process.exit(1);
  }

  console.log("✅ Found question in DB with sources:");
  console.log(`   ID: ${dbQuestion.id}`);
  console.log(`   Concept: ${dbQuestion.conceptId}`);
  console.log(`   Sources JSON: ${dbQuestion.sourcesJson}`);

  // 2. Parse sourcesJson
  let sources = [];
  try {
    sources = JSON.parse(dbQuestion.sourcesJson);
    console.log(`\n✅ Parsed sources: ${JSON.stringify(sources, null, 2)}`);
  } catch (e) {
    console.log(`❌ Failed to parse: ${e}`);
    process.exit(1);
  }

  // 3. Check if question text has citations
  const hasCitations = /\[\d+\]/.test(dbQuestion.questionText);
  console.log(`\n${hasCitations ? "✅" : "⚠️"} Question text ${hasCitations ? "HAS" : "MISSING"} citations`);
  if (!hasCitations) {
    console.log(`   Text: "${dbQuestion.questionText.substring(0, 100)}..."`);
  }

  // 4. Check if explanation has citations
  const explanationHasCitations = /\[\d+\]/.test(dbQuestion.explanation);
  console.log(`${explanationHasCitations ? "✅" : "⚠️"} Explanation ${explanationHasCitations ? "HAS" : "MISSING"} citations`);
  if (!explanationHasCitations) {
    console.log(`   Text: "${dbQuestion.explanation.substring(0, 100)}..."`);
  }

  console.log("\n=== TEST COMPLETE ===");
  process.exit(0);
}

testFlow().catch(e => {
  console.error(e);
  process.exit(1);
});
