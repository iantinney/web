import { prisma } from "../src/lib/prisma";
import { parseJsonField } from "../src/lib/types";

interface ConceptNodeLike {
  id: string;
  studyPlanId: string;
  name: string;
  description: string;
  keyTermsJson: string;
  proficiency: number;
  confidence: number;
  easeFactor: number;
  interval: number;
  repetitionCount: number;
  lastPracticed: Date | null;
  nextDue: Date | null;
  attemptCount: number;
  isDeprecated: boolean;
  isManuallyAdjusted: boolean;
  positionX: number;
  positionY: number;
}

/**
 * Normalize concept name for deduplication:
 * trim + lowercase
 */
function normalizeConceptName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Merge two concepts using confidence-weighted average
 * (merging existing concept with new concept data)
 */
function mergeConceptProficiency(
  existingProf: number,
  existingConf: number,
  newProf: number,
  newConf: number
): { proficiency: number; confidence: number } {
  // confidence-weighted average for proficiency
  const totalConf = existingConf + newConf;
  if (totalConf === 0) {
    return { proficiency: 0, confidence: 0 };
  }
  const mergedProf = (existingProf * existingConf + newProf * newConf) / totalConf;
  const mergedConf = Math.max(existingConf, newConf);
  return { proficiency: mergedProf, confidence: mergedConf };
}

/**
 * Find or create a concept, handling deduplication
 */
async function findOrCreateConcept(
  userId: string,
  name: string,
  description: string,
  keyTermsJson: string,
  proficiency: number,
  confidence: number,
  easeFactor: number,
  interval: number,
  repetitionCount: number,
  lastPracticed: Date | null,
  nextDue: Date | null,
  attemptCount: number,
  isDeprecated: boolean,
  isManuallyAdjusted: boolean
): Promise<{ id: string; wasReused: boolean }> {
  const nameNormalized = normalizeConceptName(name);

  // Check if concept already exists
  const existing = await prisma.concept.findFirst({
    where: { userId, nameNormalized },
  });

  if (existing) {
    // Merge proficiency using confidence-weighted average
    const { proficiency: mergedProf, confidence: mergedConf } =
      mergeConceptProficiency(
        existing.proficiency,
        existing.confidence,
        proficiency,
        confidence
      );

    // Merge attempt count (sum)
    const mergedAttemptCount = existing.attemptCount + attemptCount;

    await prisma.concept.update({
      where: { id: existing.id },
      data: {
        proficiency: mergedProf,
        confidence: mergedConf,
        attemptCount: mergedAttemptCount,
        // Keep existing description/keyTerms unless new ones are richer
        description: description || existing.description,
        keyTermsJson: keyTermsJson || existing.keyTermsJson,
      },
    });

    return { id: existing.id, wasReused: true };
  }

  // Create new concept
  const newConcept = await prisma.concept.create({
    data: {
      userId,
      name,
      nameNormalized,
      description,
      keyTermsJson,
      proficiency,
      confidence,
      easeFactor,
      interval,
      repetitionCount,
      lastPracticed,
      nextDue,
      attemptCount,
      isDeprecated,
      isManuallyAdjusted,
    },
  });

  return { id: newConcept.id, wasReused: false };
}

/**
 * Main migration: ConceptNode → Concept + GraphMembership
 */
async function migrateToSharedConcepts() {
  console.log("🚀 Starting migration: ConceptNode → Concept + UnitGraph + GraphMembership");

  // Get all study plans
  const studyPlans = await prisma.studyPlan.findMany({
    include: {
      user: true,
    },
  });

  console.log(`📋 Found ${studyPlans.length} study plans`);

  for (const plan of studyPlans) {
    console.log(`\n📚 Processing study plan: ${plan.title} (${plan.id})`);

    // Get all concept nodes for this study plan
    const conceptNodes = await prisma.conceptNode.findMany({
      where: { studyPlanId: plan.id },
    });

    console.log(`  - Found ${conceptNodes.length} concept nodes`);

    if (conceptNodes.length === 0) {
      console.log(`  - Skipping (no concepts)`);
      continue;
    }

    // Create UnitGraph from StudyPlan
    const unitGraph = await prisma.unitGraph.create({
      data: {
        studyPlanId: plan.id,
        title: plan.title,
        description: plan.description,
      },
    });

    console.log(`  ✓ Created UnitGraph: ${unitGraph.id}`);

    // Migrate each ConceptNode to Concept + GraphMembership
    const conceptMapping: Record<string, string> = {}; // ConceptNode.id → Concept.id
    let reusedCount = 0;

    for (const node of conceptNodes) {
      const { id: conceptId, wasReused } = await findOrCreateConcept(
        plan.userId,
        node.name,
        node.description,
        node.keyTermsJson,
        node.proficiency,
        node.confidence,
        node.easeFactor,
        node.interval,
        node.repetitionCount,
        node.lastPracticed,
        node.nextDue,
        node.attemptCount,
        node.isDeprecated,
        node.isManuallyAdjusted
      );

      conceptMapping[node.id] = conceptId;

      if (wasReused) {
        reusedCount++;
      }

      // Create GraphMembership (position from ConceptNode)
      await prisma.graphMembership.create({
        data: {
          conceptId,
          unitGraphId: unitGraph.id,
          positionX: node.positionX,
          positionY: node.positionY,
          depthTier: 0, // Will be computed later
        },
      });
    }

    console.log(
      `  ✓ Migrated ${conceptNodes.length} concept nodes (${reusedCount} reused)`
    );

    // Update Questions to point to Concept instead of ConceptNode
    for (const oldNodeId of Object.keys(conceptMapping)) {
      const newConceptId = conceptMapping[oldNodeId];
      const updateCount = await prisma.question.updateMany({
        where: { conceptId: oldNodeId },
        data: { conceptId: newConceptId },
      });
      if (updateCount.count > 0) {
        console.log(`  - Updated ${updateCount.count} questions for ${oldNodeId}`);
      }
    }

    // Update SessionRecords
    const sessionCount = await prisma.sessionRecord.updateMany({
      where: { studyPlanId: plan.id },
      data: { unitGraphId: unitGraph.id },
    });
    console.log(`  ✓ Updated ${sessionCount.count} session records`);

    // Create ConceptEdges for this UnitGraph (from old edges)
    const oldEdges = await prisma.conceptEdge.findMany({
      where: { studyPlanId: plan.id },
    });

    console.log(`  - Found ${oldEdges.length} concept edges to migrate`);

    for (const edge of oldEdges) {
      const fromConceptId = conceptMapping[edge.fromNodeId];
      const toConceptId = conceptMapping[edge.toNodeId];

      if (!fromConceptId || !toConceptId) {
        console.log(
          `  ⚠️ Skipping edge ${edge.id}: missing concept mapping`
        );
        continue;
      }

      // Check if edge already exists in new structure
      const existing = await prisma.conceptEdge.findFirst({
        where: {
          fromNodeId: fromConceptId,
          toNodeId: toConceptId,
          unitGraphId: unitGraph.id,
        },
      });

      if (!existing) {
        await prisma.conceptEdge.create({
          data: {
            fromNodeId: fromConceptId,
            toNodeId: toConceptId,
            unitGraphId: unitGraph.id,
            edgeType: edge.edgeType,
          },
        });
      }
    }

    console.log(`  ✓ Migrated concept edges`);
  }

  console.log("\n✅ Migration complete!");

  // Verify counts
  const conceptCount = await prisma.concept.count();
  const graphCount = await prisma.unitGraph.count();
  const membershipCount = await prisma.graphMembership.count();

  console.log(`\n📊 Final counts:`);
  console.log(`  - Concepts: ${conceptCount}`);
  console.log(`  - UnitGraphs: ${graphCount}`);
  console.log(`  - GraphMemberships: ${membershipCount}`);
}

// Run migration
migrateToSharedConcepts()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  });
