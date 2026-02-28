// ---------------------------------------------------------------------------
// Demo seed configuration for prerequisite insertion demo
// Maps concept name patterns to pre-computed gap and extension proposals
// so demos work without LLM dependency.
// ---------------------------------------------------------------------------

export interface DemoSeed {
  type: "gap" | "extension";
  conceptPattern: RegExp; // Matches concept name (case-insensitive)
  missingConcept?: string; // For gap seeds
  suggestedConcept?: string; // For extension seeds
  explanation: string;
  severity?: string;
}

export const DEMO_SEEDS: DemoSeed[] = [
  // ── Gap seeds (prerequisite detection) ──────────────────────────────────
  {
    type: "gap",
    conceptPattern: /deriv/i,
    missingConcept: "Limit Definition",
    explanation:
      "Derivatives are defined as limits. Understanding limits is essential before working with derivatives.",
    severity: "high",
  },
  {
    type: "gap",
    conceptPattern: /calculus/i,
    missingConcept: "Algebra Fundamentals",
    explanation:
      "Calculus builds on algebraic manipulation. You need solid algebra skills first.",
    severity: "high",
  },
  {
    type: "gap",
    conceptPattern: /hash.?table/i,
    missingConcept: "Array Fundamentals",
    explanation:
      "Hash tables use arrays internally. Understanding arrays is a prerequisite.",
    severity: "high",
  },
  {
    type: "gap",
    conceptPattern: /backprop/i,
    missingConcept: "Chain Rule",
    explanation:
      "Backpropagation is an application of the chain rule from calculus.",
    severity: "high",
  },
  {
    type: "gap",
    conceptPattern: /recursion/i,
    missingConcept: "Call Stack Fundamentals",
    explanation:
      "Recursion relies on the call stack. Understanding how function calls are managed is a prerequisite.",
    severity: "high",
  },
  {
    type: "gap",
    conceptPattern: /neural.?net/i,
    missingConcept: "Linear Algebra Basics",
    explanation:
      "Neural networks use matrix multiplication extensively. Linear algebra is essential.",
    severity: "high",
  },

  // ── Extension seeds (what to learn next) ────────────────────────────────
  {
    type: "extension",
    conceptPattern: /deriv/i,
    suggestedConcept: "Integration Techniques",
    explanation:
      "You have a strong grasp of derivatives. Integration is the natural next step in calculus.",
  },
  {
    type: "extension",
    conceptPattern: /calculus/i,
    suggestedConcept: "Multivariable Calculus",
    explanation:
      "Extend your calculus knowledge to functions of multiple variables.",
  },
  {
    type: "extension",
    conceptPattern: /array/i,
    suggestedConcept: "Dynamic Arrays & Amortized Analysis",
    explanation:
      "Dive deeper into how arrays resize and the amortized cost analysis.",
  },
  {
    type: "extension",
    conceptPattern: /hash.?table/i,
    suggestedConcept: "Balanced Binary Search Trees",
    explanation:
      "Another key data structure for efficient lookup and ordered operations.",
  },
  {
    type: "extension",
    conceptPattern: /recursion/i,
    suggestedConcept: "Dynamic Programming",
    explanation:
      "Build on your recursion skills by learning to optimize overlapping subproblems.",
  },
  {
    type: "extension",
    conceptPattern: /neural.?net/i,
    suggestedConcept: "Convolutional Neural Networks",
    explanation:
      "Apply your neural network knowledge to image recognition with CNNs.",
  },
];

/**
 * Find a matching demo seed for a concept name and type.
 * Returns null if no matching seed exists.
 */
export function findDemoSeed(
  conceptName: string,
  type: "gap" | "extension"
): DemoSeed | null {
  return (
    DEMO_SEEDS.find(
      (s) => s.type === type && s.conceptPattern.test(conceptName)
    ) ?? null
  );
}
