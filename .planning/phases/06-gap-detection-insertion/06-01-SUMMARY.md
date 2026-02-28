---
phase: 06
plan: 01
subsystem: gap-detection
tags: [prisma, zod, llm-grading, free-response, gap-detection, sqlite]

dependency-graph:
  requires: [05-proficiency-persistence]
  provides: [GapDetection model, enhanced-grading-prompt, LLMEnhancedEvaluationSchema, gap-record-creation]
  affects: [06-02-gap-proposal-ui, future-graph-insertion]

tech-stack:
  added: []
  patterns:
    - "LLM error classification: CORRECT/MINOR/MISCONCEPTION/PREREQUISITE_GAP"
    - "Zod schema validation of LLM structured output"
    - "Fire-and-persist gap detection on free_response attempts"

key-files:
  created: []
  modified:
    - adaptive-tutor/prisma/schema.prisma
    - adaptive-tutor/src/lib/types.ts
    - adaptive-tutor/src/lib/schemas.ts
    - adaptive-tutor/src/lib/prompts/index.ts
    - adaptive-tutor/src/app/api/study-plans/[id]/attempt/route.ts

decisions:
  - "evaluateFreeResponsePrompt renamed parameters to question/rubric for semantic clarity"
  - "Free response proficiency update is no longer neutral — uses real LLM score since Phase 6"
  - "LLM evaluation failure falls back to neutral score (0.5, isCorrect=false) with error log"
  - "GapDetection created only for free_response questions (MCQ/flashcard/fill_blank cannot reveal prerequisite gaps)"
  - "Conservative gap classification guidance in prompt: most errors are MINOR or MISCONCEPTION"

metrics:
  duration: "3 minutes"
  tasks-completed: 4
  tasks-total: 4
  completed: "2026-02-26"
---

# Phase 6 Plan 01: GapDetection Data Model & Enhanced Grading Summary

**One-liner:** SQLite GapDetection model + MiniMax LLM error classification (PREREQUISITE_GAP) triggering gap records on free response grading.

## What Was Built

GapDetection infrastructure: database model, TypeScript types, Zod validation schemas, enhanced grading prompt, and attempt route integration. Free response answers now receive full LLM evaluation with error classification — when the LLM identifies a prerequisite gap, a GapDetection record is persisted to SQLite.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add GapDetection Prisma model | f0c835b | prisma/schema.prisma |
| 2 | Add TypeScript types + Zod schema | a27e27c | src/lib/types.ts, src/lib/schemas.ts |
| 3 | Extend evaluateFreeResponsePrompt | 82bc752 | src/lib/prompts/index.ts |
| 4 | Create GapDetection records in attempt route | 1dc59b4 | src/app/api/study-plans/[id]/attempt/route.ts |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Neutral fallback on LLM failure | Prevents attempt from failing entirely if MiniMax is unavailable; logs error for debugging |
| Free response proficiency now uses real LLM score | Phase 3 stub replaced; proficiency reflects actual answer quality |
| Conservative PREREQUISITE_GAP classification | Prompt explicitly instructs LLM: "most wrong answers are MINOR or MISCONCEPTION, not PREREQUISITE_GAP" — avoids false positives |
| GapDetection status defaults to "detected" | Wave 2 will promote to "proposed" after 2-occurrence threshold |

## Key Interfaces

**LLMEnhancedEvaluationSchema** validates LLM grading response:
```typescript
{
  correct: boolean,
  score: number,           // 0.0-1.0
  feedback: string,
  explanation: string,
  errorType: "CORRECT" | "MINOR" | "MISCONCEPTION" | "PREREQUISITE_GAP",
  gapAnalysis?: {
    missingConcept: string,
    severity: "NARROW" | "MODERATE" | "BROAD",
    explanation: string
  }
}
```

**GapDetection model** (SQLite):
```prisma
model GapDetection {
  id             String   @id @default(cuid())
  userId         String
  conceptId      String   // concept being practiced
  missingConcept String   // prerequisite LLM identified
  severity       String   // NARROW | MODERATE | BROAD
  explanation    String   // LLM reasoning
  status         String   @default("detected")
  createdAt      DateTime @default(now())
}
```

## Deviations from Plan

None — plan executed exactly as written.

The only minor note: `db push` was used instead of `prisma migrate dev` because the dev database has accumulated changes via `db push` (no migration history). This is consistent with the existing project pattern.

## Next Phase Readiness

**06-02 can proceed immediately.** GapDetection records are being created. Wave 2 needs:
- Read GapDetection records (query by userId + conceptId, count occurrences)
- Implement 2-occurrence threshold before proposing insertion
- UI to show gap proposal notification
- Concept insertion into graph on user acceptance
