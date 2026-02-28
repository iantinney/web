---
phase: 06-gap-detection-insertion
verified: 2026-02-26T20:36:43Z
status: gaps_found
score: 7/9 must-haves verified
gaps:
  - truth: "Learn tab shows proposal card when 2-occurrence pattern detected"
    status: partial
    reason: "AttemptResult interface in learn/page.tsx does not include errorType or gapAnalysis fields. The gap detection query runs after every attempt (not just PREREQUISITE_GAP ones), so the proposal CAN still appear if the API returns hasPattern:true — but the UI cannot know the current attempt triggered a gap (it queries independently). This works in practice but differs from the designed intent."
    artifacts:
      - path: "adaptive-tutor/src/app/(tabs)/learn/page.tsx"
        issue: "AttemptResult interface is missing errorType and gapAnalysis fields added by Plan 01. The gap detection query is not conditioned on result.errorType === PREREQUISITE_GAP — it runs after every attempt unconditionally."
    missing:
      - "errorType and gapAnalysis fields in AttemptResult interface"
      - "Guard: gap check should only run when result.errorType === PREREQUISITE_GAP"
  - truth: "GapDetection model persists gap observations with all required fields"
    status: partial
    reason: "GapDetection model in schema.prisma is missing the attemptId and unitGraphId fields that were specified in Plan 01. The model also does not have a reverse relation (gapDetections[]) on the Concept model as planned. The schema is functional but incomplete per spec."
    artifacts:
      - path: "adaptive-tutor/prisma/schema.prisma"
        issue: "GapDetection model is missing: attemptId (String?), unitGraphId (String?), and the reverse relation gapDetections[] on Concept."
    missing:
      - "attemptId String? field on GapDetection model"
      - "unitGraphId String? field on GapDetection model"
      - "gapDetections GapDetection[] reverse relation on Concept model"
---

# Phase 6: Gap Detection & Single Concept Insertion Verification Report

**Phase Goal:** Implement the first reactive behavior of the living graph: detect when learners struggle due to missing prerequisites and propose insertion of the missing concept.
**Verified:** 2026-02-26T20:36:43Z
**Status:** gaps_found — 7/9 must-haves verified (2 partial issues)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GapDetection model persists gap observations to database | PARTIAL | Model exists at schema.prisma:162 with core fields, but missing `attemptId`, `unitGraphId`, and reverse relation on Concept |
| 2 | Free response grading classifies errors with gap analysis | VERIFIED | `evaluateFreeResponsePrompt` in prompts/index.ts:223 includes PREREQUISITE_GAP classification; `LLMEnhancedEvaluationSchema` in schemas.ts:51 validates output; attempt route:100-133 calls LLM |
| 3 | System detects 2-occurrence pattern for same missing prerequisite | VERIFIED | gap-detections/route.ts:46-66 groups by missingConcept and checks `records.length >= 2` |
| 4 | Learn tab shows proposal card when pattern detected | PARTIAL | GapProposalCard is imported and rendered (learn/page.tsx:13, 1031-1042); gap check fires after every attempt (line 344) but AttemptResult interface is missing errorType/gapAnalysis fields |
| 5 | User can confirm insertion (concept + edge + graph update) | VERIFIED | `handleGapConfirm` in learn/page.tsx:493-547 POSTs to concepts/insert, calls `loadUnitGraphData`, sets `redirectedFromConceptId` |
| 6 | Practice redirects to new prerequisite concept after insertion | VERIFIED | `setTargetConceptId(insertedConceptId)` at learn/page.tsx:521; `initSession()` restarts targeting new concept |
| 7 | Prerequisite mastery triggers redirect back to original concept | VERIFIED | Mastery check at learn/page.tsx:321-341: when proficiency >= 0.8 and `currentRedirectId` is set, clears redirect and sets `setTargetConceptId(originalConceptId)` |
| 8 | Graph visualization shows newly inserted node | VERIFIED | `loadUnitGraphData(activeUnitGraphId)` called in `handleGapConfirm` (line 519); graph/page.tsx re-renders from store via `useEffect([flowNodes, flowEdges])` |
| 9 | Questions generated for new concept (fire-and-forget) | VERIFIED | concepts/insert/route.ts:168-178 fires fetch to `/api/study-plans/${id}/generate-questions` with catch handler |

**Score: 7/9 truths verified** (2 partial)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `adaptive-tutor/prisma/schema.prisma` | GapDetection model with all required fields | PARTIAL | Model exists (line 162), has core fields (userId, conceptId, missingConcept, severity, explanation, status, createdAt), but missing `attemptId` and `unitGraphId` fields from the plan spec |
| `adaptive-tutor/src/lib/types.ts` | GapDetection + GapAnalysis TypeScript interfaces | VERIFIED | `GapAnalysis` at line 228, `GapDetection` interface at line 243, `EnhancedEvaluationResult` at line 234 with `errorType` and `gapAnalysis` |
| `adaptive-tutor/src/lib/schemas.ts` | LLMEnhancedEvaluationSchema Zod schema | VERIFIED | Exported at schemas.ts:51 with `correct`, `score`, `feedback`, `explanation`, `errorType`, `gapAnalysis` |
| `adaptive-tutor/src/lib/prompts/index.ts` | evaluateFreeResponsePrompt with PREREQUISITE_GAP | VERIFIED | Function at line 223; includes PREREQUISITE_GAP classification instruction, conservative calibration, JSON output format with `errorType` and `gapAnalysis` |
| `adaptive-tutor/src/app/api/study-plans/[id]/attempt/route.ts` | GapDetection record creation on PREREQUISITE_GAP | VERIFIED | `prisma.gapDetection.create` at line 123; LLM evaluation at lines 100-133; errorType/gapAnalysis in response at lines 252-253 |
| `adaptive-tutor/src/components/GapProposalCard.tsx` | UI component with confirm/decline buttons (40+ lines) | VERIFIED | 116 lines; shows originalConceptName, missingConceptName, explanation; Confirm/Decline buttons; loading state |
| `adaptive-tutor/src/app/api/study-plans/[id]/concepts/insert/route.ts` | POST endpoint for concept insertion with edges | VERIFIED | 196 lines; findOrCreateConcept, GraphMembership, ConceptEdge creation, full DAG relayout, fire-and-forget question generation |
| `adaptive-tutor/src/app/api/study-plans/[id]/gap-detections/route.ts` | GET endpoint for 2-occurrence pattern query | VERIFIED | 76 lines; groups by missingConcept, returns `hasPattern: true` when count >= 2 |
| `adaptive-tutor/src/app/(tabs)/learn/page.tsx` | Gap detection check, GapProposalCard render, redirect logic | PARTIAL | GapProposalCard imported and rendered; gap check fires; handleGapConfirm/handleGapDecline exist; BUT AttemptResult interface missing errorType/gapAnalysis fields |
| `adaptive-tutor/src/lib/store.ts` | redirectedFromConceptId state for tracking | VERIFIED | `redirectedFromConceptId: string | null` in AppState (line 70); `setRedirectedFromConceptId` action (line 104/206) |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `prompts/index.ts` | `attempt/route.ts` | evaluateFreeResponsePrompt called for free_response | WIRED | attempt/route.ts:10 imports evaluateFreeResponsePrompt; called at line 103 |
| `schemas.ts` | `attempt/route.ts` | LLMEnhancedEvaluationSchema validates LLM output | WIRED | attempt/route.ts:9 imports; `.parse(parseLLMJson(rawResponse))` at line 114 |
| `attempt/route.ts` | `prisma.gapDetection` | Creates record when PREREQUISITE_GAP | WIRED | `prisma.gapDetection.create` at line 123 inside `if (parsed.errorType === "PREREQUISITE_GAP")` |
| `learn/page.tsx` | `GapProposalCard` | Renders when pattern detected | WIRED | Import at line 13; `{showGapProposal && <GapProposalCard ...>}` at lines 1031-1042 |
| `learn/page.tsx` | `/api/concepts/insert` | POST fetch on user confirm | WIRED | fetch at learn/page.tsx:499-510 using `concepts/insert` endpoint |
| `concepts/insert/route.ts` | `findOrCreateConcept` | Concept dedup on insertion | WIRED | Import at line 3; called at line 65 |
| `learn/page.tsx` | `store.redirectedFromConceptId` | Tracks redirect origin | WIRED | `setRedirectedFromConceptId(showGapProposal.targetConceptId)` at line 517 |
| `learn/page.tsx` | `gap-detections API` | Checks 2-occurrence pattern | WIRED | fetch to `/gap-detections?conceptId=${conceptId}` at lines 346-371; checks `gapData.hasPattern` |

---

## Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| ADAPT-01: Error classification in free response grading (CORRECT/MINOR/MISCONCEPTION/PREREQUISITE_GAP) | SATISFIED | Prompt, schema, and attempt route all implement this |
| ADAPT-02: Gap pattern detection with 2-occurrence threshold and user-facing proposal | PARTIAL | Pattern detection endpoint works; proposal card shows; but gap check fires for all attempts, not just PREREQUISITE_GAP results |
| ADAPT-03: Single concept insertion flow with prerequisite edges, graph update, and practice redirect | SATISFIED | Full flow implemented: insert → edge → graph reload → redirect → mastery → redirect back |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/app/(tabs)/learn/page.tsx` | 19-37 | AttemptResult interface missing errorType/gapAnalysis | Warning | Gap check fires for all attempts; if non-PREREQUISITE_GAP errors accumulate GapDetection records (they can't — creation is conditioned in attempt route), this could produce false proposals. In practice, no false proposals because gap records are only created on PREREQUISITE_GAP in the API. |
| `src/app/(tabs)/learn/page.tsx` | 344 | Gap detection query runs after every attempt regardless of errorType | Warning | Unnecessary API call for MCQ/flashcard/fill_blank correct answers. No functional harm but sub-optimal. |
| `prisma/schema.prisma` | 162-175 | GapDetection model missing attemptId and unitGraphId fields | Warning | Cannot link gap records to specific attempts or graph contexts. Reduces auditability but does not break functionality. |

---

## Human Verification Required

### 1. End-to-end Gap Detection Flow

**Test:** Start practice, answer a free_response question wrong with a clearly prerequisite-based error (e.g., attempt calculus question without knowing algebra). Then answer a second question wrong on the same concept with the same type of gap.
**Expected:** After the second wrong answer, a GapProposalCard should appear showing the missing prerequisite concept name with an explanation.
**Why human:** Requires the LLM to classify the error as PREREQUISITE_GAP (not deterministic), and 2 occurrences must accumulate before the proposal appears.

### 2. Concept Insertion and Graph Update

**Test:** With a GapProposalCard shown, click "Add to learning path". Immediately navigate to the Graph tab.
**Expected:** The new prerequisite concept node should be visible in the graph with a connecting edge to the concept that triggered the gap.
**Why human:** Verifies the `loadUnitGraphData` refresh actually populates new nodes in the React Flow canvas (timing-dependent).

### 3. Mastery Redirect

**Test:** After being redirected to a prerequisite concept, answer enough questions correctly to push proficiency to 0.8+. Observe the redirect message.
**Expected:** A message saying "You've mastered [prerequisite]! Redirecting back to your original concept." and practice shifts back to the original concept.
**Why human:** Requires actual practice to reach the 0.8 threshold; verifies the store-based redirect tracking across session resets.

---

## Gaps Summary

Two partial issues were found:

**Gap 1 (Minor — functional but incomplete):** The `AttemptResult` interface in learn/page.tsx (lines 19-37) does not include `errorType` or `gapAnalysis` fields that the attempt API now returns. The gap detection check at line 344 fires after every attempt unconditionally rather than only when `result.errorType === "PREREQUISITE_GAP"`. In practice this does not cause incorrect behavior — the gap-detections API only returns `hasPattern: true` if actual PREREQUISITE_GAP records exist (which are only created by the attempt route when the LLM returns that classification). So the proposal card will not show for non-gap attempts. However, the implementation is fragile: a conceptual mismatch between the types and the actual API response exists, and the unconditional polling adds unnecessary API calls.

**Gap 2 (Minor — schema deviation):** The GapDetection model in the Prisma schema is missing `attemptId` (String?) and `unitGraphId` (String?) fields specified in Plan 01's task 1. Additionally, the Concept model is missing the reverse relation `gapDetections GapDetection[]`. The model compiles and functions (Prisma client can still access the model via direct queries), but these fields would enable linking gap records to specific attempt IDs and graph contexts for richer querying and auditability.

Neither gap blocks core goal achievement. The living graph behavior — detect gaps, propose insertion, insert concept, redirect practice, redirect back on mastery, update graph — is fully implemented and wired. The 9th success criterion (question generation fire-and-forget) is also verified.

---

_Verified: 2026-02-26T20:36:43Z_
_Verifier: Claude (gsd-verifier)_
