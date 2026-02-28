/**
 * Test script to verify RAG sources are being generated
 * Run with: npx tsx test-rag.ts
 */

import { prisma } from "@/lib/prisma";

async function testRAG() {
  console.log("🔍 RAG Testing Script\n");

  try {
    // 1. Check question count
    const totalQuestions = await prisma.question.count();
    console.log(`📊 Total questions in DB: ${totalQuestions}`);

    // 2. Check questions with sources
    const questionsWithSources = await prisma.question.findMany({
      where: {
        NOT: {
          sourcesJson: { equals: "[]" },
        },
      },
      select: {
        id: true,
        questionText: true,
        sourcesJson: true,
        concept: { select: { name: true } },
      },
      take: 5,
    });

    console.log(`\n✅ Questions WITH sources: ${questionsWithSources.length}`);
    if (questionsWithSources.length > 0) {
      console.log("\nSample questions with sources:");
      questionsWithSources.forEach((q, i) => {
        try {
          const sources = JSON.parse(q.sourcesJson);
          console.log(`\n  [${i + 1}] "${q.concept?.name}" - ${q.questionText.substring(0, 60)}...`);
          console.log(`      Sources: ${sources.length}`);
          sources.forEach((s: any) => {
            console.log(`        [${s.index}] ${s.pageTitle} → ${s.pageUrl}`);
          });
        } catch (e) {
          console.log(`  [${i + 1}] Error parsing sources: ${e}`);
        }
      });
    }

    // 3. Check questions without sources
    const questionsWithoutSources = await prisma.question.count({
      where: {
        sourcesJson: { equals: "[]" },
      },
    });
    console.log(`\n❌ Questions WITHOUT sources: ${questionsWithoutSources}`);

    // 4. Check SourceChunks
    const sourceChunks = await prisma.sourceChunk.count();
    console.log(`\n📚 Total source chunks in DB: ${sourceChunks}`);

    // 5. Get sample SourceChunks
    if (sourceChunks > 0) {
      const samples = await prisma.sourceChunk.findMany({
        select: {
          id: true,
          pageTitle: true,
          sectionHeading: true,
          source: true,
        },
        take: 3,
      });
      console.log("\nSample source chunks:");
      samples.forEach((s, i) => {
        console.log(`  [${i + 1}] ${s.pageTitle} - ${s.sectionHeading} (${s.source})`);
      });
    }

    // 6. Summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY:");
    const percentage =
      totalQuestions > 0
        ? Math.round((questionsWithSources.length / totalQuestions) * 100)
        : 0;
    console.log(`  Questions with sources: ${questionsWithSources.length}/${totalQuestions} (${percentage}%)`);
    console.log(`  Source chunks available: ${sourceChunks}`);

    if (percentage === 100 && sourceChunks > 0) {
      console.log("\n✨ RAG is working perfectly!");
    } else if (percentage > 0 && sourceChunks > 0) {
      console.log("\n⚠️  RAG is partially working. Some questions may not have sources.");
    } else {
      console.log("\n❌ RAG is not working. No sources found.");
      console.log("   → Try generating questions with: POST /api/study-plans/[id]/generate-questions");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

testRAG();
