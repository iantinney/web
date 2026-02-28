/**
 * Seed script: Add Wikipedia citations to questions
 *
 * Usage: npx tsx seed-citations.ts [conceptName]
 *
 * If conceptName is provided, only seeds that concept.
 * Otherwise, seeds all concepts in the database.
 *
 * Run this to demo RAG when Wikipedia API is rate-limited.
 */

import { prisma } from "@/lib/prisma";

// Curated citation database: concept name → Wikipedia sources
const CITATION_DB: Record<string, Array<{ pageTitle: string; pageUrl: string }>> = {
  // Calculus concepts
  "Limits and Continuity": [
    {
      pageTitle: "Limit (mathematics)",
      pageUrl: "https://en.wikipedia.org/wiki/Limit_(mathematics)",
    },
    {
      pageTitle: "Continuity (mathematics)",
      pageUrl: "https://en.wikipedia.org/wiki/Continuity_(mathematics)",
    },
  ],
  "Derivatives and Differentiation": [
    {
      pageTitle: "Derivative",
      pageUrl: "https://en.wikipedia.org/wiki/Derivative",
    },
    {
      pageTitle: "Differential calculus",
      pageUrl: "https://en.wikipedia.org/wiki/Differential_calculus",
    },
  ],
  "Applications of Derivatives": [
    {
      pageTitle: "Related Rates",
      pageUrl: "https://en.wikipedia.org/wiki/Related_rates",
    },
    {
      pageTitle: "Optimization (mathematics)",
      pageUrl: "https://en.wikipedia.org/wiki/Mathematical_optimization",
    },
  ],
  "Integration and Antiderivatives": [
    {
      pageTitle: "Integral",
      pageUrl: "https://en.wikipedia.org/wiki/Integral",
    },
    {
      pageTitle: "Antiderivative",
      pageUrl: "https://en.wikipedia.org/wiki/Antiderivative",
    },
  ],
  "Infinite Series": [
    {
      pageTitle: "Series (mathematics)",
      pageUrl: "https://en.wikipedia.org/wiki/Series_(mathematics)",
    },
    {
      pageTitle: "Convergence (mathematics)",
      pageUrl: "https://en.wikipedia.org/wiki/Convergence_(mathematics)",
    },
  ],

  // Linear Algebra concepts
  "Vectors and Vector Spaces": [
    {
      pageTitle: "Vector space",
      pageUrl: "https://en.wikipedia.org/wiki/Vector_space",
    },
    {
      pageTitle: "Euclidean vector",
      pageUrl: "https://en.wikipedia.org/wiki/Euclidean_vector",
    },
  ],
  "Matrices and Operations": [
    {
      pageTitle: "Matrix (mathematics)",
      pageUrl: "https://en.wikipedia.org/wiki/Matrix_(mathematics)",
    },
    {
      pageTitle: "Matrix multiplication",
      pageUrl: "https://en.wikipedia.org/wiki/Matrix_multiplication",
    },
  ],
  "Linear Transformations": [
    {
      pageTitle: "Linear map",
      pageUrl: "https://en.wikipedia.org/wiki/Linear_map",
    },
    {
      pageTitle: "Linear transformation",
      pageUrl: "https://en.wikipedia.org/wiki/Linear_map",
    },
  ],
  "Eigenvalues and Eigenvectors": [
    {
      pageTitle: "Eigenvalue and eigenvector",
      pageUrl: "https://en.wikipedia.org/wiki/Eigenvalue_and_eigenvector",
    },
    {
      pageTitle: "Characteristic polynomial",
      pageUrl: "https://en.wikipedia.org/wiki/Characteristic_polynomial",
    },
  ],

  // Statistics concepts
  Probability: [
    {
      pageTitle: "Probability",
      pageUrl: "https://en.wikipedia.org/wiki/Probability",
    },
    {
      pageTitle: "Probability theory",
      pageUrl: "https://en.wikipedia.org/wiki/Probability_theory",
    },
  ],
  "Distributions and Density": [
    {
      pageTitle: "Probability distribution",
      pageUrl: "https://en.wikipedia.org/wiki/Probability_distribution",
    },
    {
      pageTitle: "Probability density function",
      pageUrl: "https://en.wikipedia.org/wiki/Probability_density_function",
    },
  ],
  "Hypothesis Testing": [
    {
      pageTitle: "Statistical hypothesis testing",
      pageUrl: "https://en.wikipedia.org/wiki/Statistical_hypothesis_testing",
    },
    {
      pageTitle: "P-value",
      pageUrl: "https://en.wikipedia.org/wiki/P-value",
    },
  ],

  // Computer Science concepts
  "Data Structures": [
    {
      pageTitle: "Data structure",
      pageUrl: "https://en.wikipedia.org/wiki/Data_structure",
    },
    {
      pageTitle: "Array data structure",
      pageUrl: "https://en.wikipedia.org/wiki/Array_(data_structure)",
    },
  ],
  Algorithms: [
    {
      pageTitle: "Algorithm",
      pageUrl: "https://en.wikipedia.org/wiki/Algorithm",
    },
    {
      pageTitle: "Sorting algorithm",
      pageUrl: "https://en.wikipedia.org/wiki/Sorting_algorithm",
    },
  ],
  "Complexity Theory": [
    {
      pageTitle: "Computational complexity theory",
      pageUrl: "https://en.wikipedia.org/wiki/Computational_complexity_theory",
    },
    {
      pageTitle: "Big O notation",
      pageUrl: "https://en.wikipedia.org/wiki/Big_O_notation",
    },
  ],

  // Programming concepts
  "Variables and Data Types": [
    {
      pageTitle: "Variable (computer science)",
      pageUrl: "https://en.wikipedia.org/wiki/Variable_(computer_science)",
    },
    {
      pageTitle: "Data type",
      pageUrl: "https://en.wikipedia.org/wiki/Data_type",
    },
  ],
  "Functions and Methods": [
    {
      pageTitle: "Subroutine",
      pageUrl: "https://en.wikipedia.org/wiki/Subroutine",
    },
    {
      pageTitle: "Function (mathematics)",
      pageUrl: "https://en.wikipedia.org/wiki/Function_(mathematics)",
    },
  ],
  "Object-Oriented Programming": [
    {
      pageTitle: "Object-oriented programming",
      pageUrl: "https://en.wikipedia.org/wiki/Object-oriented_programming",
    },
    {
      pageTitle: "Class (computer programming)",
      pageUrl: "https://en.wikipedia.org/wiki/Class_(computer_programming)",
    },
  ],
};

async function seedCitations(conceptNameFilter?: string) {
  console.log("🌱 Seeding citations from Wikipedia sources...\n");

  // Get all concepts, optionally filtered
  let concepts = await prisma.concept.findMany({
    where: { isDeprecated: false },
  });

  if (conceptNameFilter) {
    concepts = concepts.filter(
      (c) =>
        c.name.toLowerCase().includes(conceptNameFilter.toLowerCase()) ||
        c.nameNormalized.toLowerCase().includes(conceptNameFilter.toLowerCase())
    );
    console.log(`Filtering to concepts matching: "${conceptNameFilter}"\n`);
  }

  if (concepts.length === 0) {
    console.log("❌ No concepts found");
    process.exit(1);
  }

  console.log(`📚 Found ${concepts.length} concept(s) to process\n`);

  let totalUpdated = 0;
  let totalQuestions = 0;

  for (const concept of concepts) {
    const citations = CITATION_DB[concept.name];

    if (!citations) {
      console.log(`⏭️  ${concept.name} - No citations in database (skipped)`);
      continue;
    }

    // Get all questions for this concept
    const questions = await prisma.question.findMany({
      where: { conceptId: concept.id },
    });

    if (questions.length === 0) {
      console.log(`⏭️  ${concept.name} - No questions found (skipped)`);
      continue;
    }

    totalQuestions += questions.length;

    // Update each question with citations
    const citationArray = citations.map((c, i) => ({
      index: i + 1,
      pageTitle: c.pageTitle,
      pageUrl: c.pageUrl,
    }));

    for (const question of questions) {
      // Add first citation to question text if not already cited
      const firstCitation = `[1]`;
      let updatedQuestionText = question.questionText;
      if (!updatedQuestionText.includes("[")) {
        updatedQuestionText = `${updatedQuestionText} ${firstCitation}`;
      }

      await prisma.question.update({
        where: { id: question.id },
        data: {
          sourcesJson: JSON.stringify(citationArray),
          questionText: updatedQuestionText,
        },
      });

      totalUpdated++;
    }

    console.log(
      `✅ ${concept.name} - Updated ${questions.length} question(s) with ${citations.length} source(s)`
    );
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Summary:`);
  console.log(`  Concepts processed: ${concepts.length}`);
  console.log(`  Questions updated: ${totalUpdated}/${totalQuestions}`);
  console.log(`\n✨ Citations seeded successfully!`);
  console.log(`   Questions now have Wikipedia sources and [1], [2] citations.`);
  console.log(`   Citation badges will be clickable in the Learn tab.\n`);

  process.exit(0);
}

// Get concept name from command line args
const conceptNameFilter = process.argv[2];
seedCitations(conceptNameFilter).catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
