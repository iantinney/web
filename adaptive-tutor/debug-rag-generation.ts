/**
 * Debug script to test RAG question generation for a single concept
 */

import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/minimax-native";
import { parseLLMJson } from "@/lib/schemas";
import { generateQuestionsPrompt, LLMQuestionSchema } from "@/lib/prompts/questions";
import { searchWikipedia, fetchAndChunkPage } from "@/lib/rag/wikipedia";

async function debugRAG() {
  console.log("=== DEBUG RAG GENERATION ===\n");

  // Get any concept
  const concept = await prisma.concept.findFirst({
    where: { isDeprecated: false },
  });

  if (!concept) {
    console.log("❌ No concept found");
    process.exit(1);
  }

  console.log(`Testing concept: ${concept.name}\n`);

  // Step 1: Search Wikipedia
  console.log("📚 Step 1: Searching Wikipedia...");
  try {
    const results = await searchWikipedia(concept.name, 2, ["wikipedia"]);
    console.log(`   Found ${results.length} results`);
    results.forEach((r, i) => {
      console.log(`   [${i + 1}] ${r.title} (${r.source})`);
    });

    if (results.length === 0) {
      console.log("   ⚠️  No Wikipedia results found");
      process.exit(0);
    }

    // Step 2: Fetch and chunk the first result
    console.log(`\n📄 Step 2: Fetching and chunking first result...`);
    const chunks = await fetchAndChunkPage(
      results[0].key,
      results[0].source as "wikipedia" | "wikibooks",
      concept.id,
      "test-study-plan"
    );
    console.log(`   Generated ${chunks.length} chunks`);
    chunks.forEach((c, i) => {
      console.log(`   [${i + 1}] ${c.sectionHeading} (${c.content.length} chars)`);
    });

    if (chunks.length === 0) {
      console.log("   ⚠️  No chunks generated");
      process.exit(0);
    }

    // Step 3: Generate questions with source
    console.log(`\n🤖 Step 3: Generating question with LLM...`);
    const sourceChunks = chunks.map((c) => ({
      pageTitle: c.pageTitle,
      sectionHeading: c.sectionHeading,
      content: c.content,
      pageUrl: c.pageUrl,
    }));

    const prompt = generateQuestionsPrompt(
      {
        name: concept.name,
        description: concept.description,
        keyTermsJson: concept.keyTermsJson,
        difficultyTier: 2,
      },
      sourceChunks
    );

    console.log("   Prompt includes citation rules: ", prompt.includes("CITATION RULES"));

    const rawText = await generateText(
      [{ role: "user", content: "Generate the practice questions JSON array." }],
      prompt,
      { temperature: 0.1, maxTokens: 2048, model: "MiniMax-M2" }
    );

    console.log("\n   Raw LLM output (first 200 chars):");
    console.log("   " + rawText.substring(0, 200));

    // Step 4: Validate response
    console.log(`\n✔️  Step 4: Validating response...`);
    const parsed = parseLLMJson(rawText);
    const validated = LLMQuestionSchema.safeParse(parsed);

    if (!validated.success) {
      console.log(`   ❌ Validation failed: ${validated.error.message}`);
      process.exit(1);
    }

    const questions = validated.data;
    console.log(`   ✅ Generated ${questions.length} valid questions`);

    // Analyze sources in generated questions
    console.log(`\n📊 Analysis:`);
    questions.forEach((q, i) => {
      const hasCitations = /\[\d+\]/.test(q.questionText);
      const hasExplanationCitations = /\[\d+\]/.test(q.explanation);
      const hasSources = q.sources && q.sources.length > 0;

      console.log(`\n   Question ${i + 1}:`);
      console.log(`     Has [N] in text: ${hasCitations}`);
      console.log(`     Has [N] in explanation: ${hasExplanationCitations}`);
      console.log(`     Has sources: ${hasSources} (count: ${q.sources?.length || 0})`);
      console.log(`     Text preview: "${q.questionText.substring(0, 60)}..."`);
      if (hasSources) {
        q.sources.forEach((s) => {
          console.log(`       - [${s.index}] ${s.pageTitle}`);
        });
      }
    });
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  process.exit(0);
}

debugRAG();
