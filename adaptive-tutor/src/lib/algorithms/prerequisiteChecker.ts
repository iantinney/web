import { PROFICIENCY_MASTERED } from "@/lib/config";
import type { Concept, ConceptEdge } from "@/lib/types";

/**
 * Calculate which concepts are locked based on prerequisite mastery.
 * A concept is locked if any of its prerequisites (concepts that must be learned first)
 * have proficiency < PROFICIENCY_MASTERED.
 *
 * @param concepts - All concepts in the graph
 * @param edges - All concept edges (edges point FROM prerequisite TO dependent)
 * @returns Set of locked concept IDs
 */
export function getLockedConcepts(
  concepts: Concept[],
  edges: ConceptEdge[]
): Set<string> {
  const lockedIds = new Set<string>();
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));

  // For each edge (prerequisite -> dependent)
  for (const edge of edges) {
    // Get the prerequisite concept (the one that must be learned first)
    const prerequisite = conceptMap.get(edge.fromNodeId);
    const dependent = conceptMap.get(edge.toNodeId);

    if (!prerequisite || !dependent) continue;

    if (prerequisite.proficiency < PROFICIENCY_MASTERED) {
      lockedIds.add(edge.toNodeId);
    }
  }

  return lockedIds;
}

/**
 * Get the prerequisite concepts for a specific concept.
 * Returns array of prerequisite concepts that must be mastered first.
 */
export function getPrerequisites(
  conceptId: string,
  concepts: Concept[],
  edges: ConceptEdge[]
): Array<{ concept: Concept; isMastered: boolean }> {
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const prerequisites: Array<{ concept: Concept; isMastered: boolean }> = [];

  // Find all edges pointing TO this concept (these are prerequisites)
  for (const edge of edges) {
    if (edge.toNodeId === conceptId) {
      const prereqConcept = conceptMap.get(edge.fromNodeId);
      if (prereqConcept) {
        prerequisites.push({
          concept: prereqConcept,
          isMastered: prereqConcept.proficiency >= PROFICIENCY_MASTERED,
        });
      }
    }
  }

  return prerequisites;
}

/**
 * Get the dependent concepts (concepts that require this one as prerequisite).
 */
export function getDependents(
  conceptId: string,
  concepts: Concept[],
  edges: ConceptEdge[]
): Concept[] {
  const conceptMap = new Map(concepts.map((c) => [c.id, c]));
  const dependents: Concept[] = [];

  // Find all edges FROM this concept
  for (const edge of edges) {
    if (edge.fromNodeId === conceptId) {
      const dependentConcept = conceptMap.get(edge.toNodeId);
      if (dependentConcept) {
        dependents.push(dependentConcept);
      }
    }
  }

  return dependents;
}

/**
 * Check if a concept is locked (has unmastered prerequisites).
 */
export function isConceptLocked(
  conceptId: string,
  concepts: Concept[],
  edges: ConceptEdge[]
): boolean {
  const prerequisites = getPrerequisites(conceptId, concepts, edges);
  return prerequisites.some((p) => !p.isMastered);
}
