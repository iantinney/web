---
phase: 06
uat: true
date_started: 2026-02-26
status: in_progress
tests_total: 10
tests_passed: 0
tests_failed: 0
tests_skipped: 0
---

# Phase 6: Gap Detection & Single Concept Insertion — UAT

**Objective:** Validate the complete gap detection → proposal → insertion → redirect flow through manual user scenarios.

**Approach:** One test at a time, plain text responses. User describes what they observe; verifier infers severity if issue found.

---

## Test List

### Wave 1: GapDetection Model & Enhanced Grading

**Test 1.1: Free Response Evaluation Returns Error Type**
- **Expected:** Answer a free response question and get feedback that includes an `errorType` field (CORRECT/MINOR/MISCONCEPTION/PREREQUISITE_GAP)
- **Status:** Pending
- **Result:** —

**Test 1.2: PREREQUISITE_GAP Detection Creates GapDetection Record**
- **Expected:** Answer a free response question incorrectly in a way that reveals a missing prerequisite. Check database (Prisma Studio) — a new `GapDetection` record should exist with the concept ID, missing concept name, severity, and explanation.
- **Status:** Pending
- **Result:** —

**Test 1.3: Non-Free-Response Questions Skip Gap Detection**
- **Expected:** Answer an MCQ/flashcard/fill-blank question incorrectly. Check API response — should NOT include `gapAnalysis` field (no gap detection for these types).
- **Status:** Pending
- **Result:** —

**Test 1.4: Conservative Gap Classification (False Positives Avoided)**
- **Expected:** Answer a free response question incorrectly but it's just a minor arithmetic error or misunderstanding of THIS concept (not a prerequisite gap). Should be classified as MINOR or MISCONCEPTION, not PREREQUISITE_GAP.
- **Status:** Pending
- **Result:** —

### Wave 2: Gap Proposal UI & Concept Insertion

**Test 2.1: Single Gap Detection — No Proposal Shown**
- **Expected:** Get one free response question wrong on a concept, with LLM classification as PREREQUISITE_GAP. Return to Learn tab — GapProposalCard should NOT appear (threshold not met yet).
- **Status:** Pending
- **Result:** —

**Test 2.2: Two-Occurrence Threshold — Proposal Appears**
- **Expected:** Get a SECOND free response question wrong on the same concept, with the same missing prerequisite detected. Return to Learn tab — GapProposalCard should appear showing the missing prerequisite name and explanation.
- **Status:** Pending
- **Result:** —

**Test 2.3: Concept Insertion on Confirm**
- **Expected:** Click "Add to learning path" on the GapProposalCard. Wait 2 seconds, then observe: (a) Graph page shows the new prerequisite concept inserted above the original concept, (b) Graph layout is recomputed (nodes repositioned), (c) the new concept has a prerequisite edge pointing to the original.
- **Status:** Pending
- **Result:** —

**Test 2.4: Practice Redirect to Prerequisite**
- **Expected:** After confirming gap insertion, Learn tab session resets and redirects practice to the NEW prerequisite concept. See banner: "Let's build your understanding of [prerequisite] first." Questions are now about the prerequisite, not the original concept.
- **Status:** Pending
- **Result:** —

**Test 2.5: Mastery Redirect Back to Original**
- **Expected:** Practice the prerequisite concept until proficiency reaches 0.8 (mastery). After that attempt, Learn tab auto-redirects: "You've mastered [prerequisite]! Let's try [original] again." Practice now focuses back on the original concept.
- **Status:** Pending
- **Result:** —

**Test 2.6: Questions Generated for New Concept**
- **Expected:** After inserting a new prerequisite, fire-and-forget generates 5 questions for that concept. Within a few seconds, new questions for the prerequisite should be available (verify via GET /questions?conceptId=[newId]).
- **Status:** Pending
- **Result:** —

---

## Test Execution Notes

*Updated as tests progress. Plain text responses accepted.*

---

## Summary (After Testing)

| Status | Count |
|--------|-------|
| Passed | 0/10 |
| Failed | 0/10 |
| Skipped | 0/10 |

---

*UAT created 2026-02-26 — Ready for manual acceptance testing*
