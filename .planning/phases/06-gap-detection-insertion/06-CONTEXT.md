# Phase 6: Gap Detection & Single Concept Insertion

**Milestone:** v1.1 (Living Graph)
**Goal:** Enable downward growth — detect when learners struggle due to missing prerequisites and propose insertion

---

## Phase Summary

Implement the first reactive behavior of the living graph: when a learner fails at a concept, detect if it's due to a structural gap (missing prerequisite) and propose inserting that prerequisite into their graph.

**What users will see:**
1. Practice, get a question wrong
2. Grading LLM classifies error (MINOR / MISCONCEPTION / **PREREQUISITE_GAP**)
3. If same prerequisite gap detected 2+ times → system proposes: "I think you're missing [X]. Add it?"
4. User confirms → graph animates new node, practice pivots to that concept
5. After mastery of prerequisite → redirects back to original concept

---

## Requirements Addressed

From `adaptive-tutor/adaptive-graph-design.md`:

- **2.1 Downward Growth:** Struggle detection → prerequisite insertion
- **6.1 Enhanced Grading Prompt:** Error classification with gap analysis
- **5.1 GapDetection Data Model:** Log and pattern-detect gaps
- **Section 4.1 Integration:** Gap detection in Learn tab practice flow

---

## Build Tasks (Estimated: 8 hours)

| # | Task | Hours | Dependencies |
|---|------|-------|--------------|
| 1 | Enhanced grading prompt (error classification + gap analysis) | 2 | Existing grading endpoint |
| 2 | GapDetection Prisma model + migration | 1 | Database setup |
| 3 | Gap pattern detection + proposal UI in Learn tab | 3 | Task 2 |
| 4 | Single concept insertion flow (findOrCreateConcept + edges + dagre relayout) | 2 | Task 3 |

**Total: 8 hours** (should fit in one wave, maybe two if UI iteration needed)

---

## Key Decisions

| Decision | Why |
|----------|-----|
| Require 2 occurrences before proposal | Avoid false positives; random misclassifications unlikely to repeat |
| Conservative grading prompt ("most errors are MINOR or MISCONCEPTION") | LLM classification is error-prone; conservative bias catches real gaps |
| User always confirms insertions (no auto-insert) | Makes system reasoning visible in demo; auto-insertion deferred to Phase 2 |
| Only insert single concepts in Phase 6 | Cluster insertion (2-4 concepts) is Phase 2; keep Phase 6 focused |
| Incremental graph relayout on insertion | Don't move every node; only position new nodes in available space |

---

## Success Criteria

After Phase 6:
- ✅ GapDetection model persists gap observations
- ✅ Grading LLM classifies errors with gap analysis
- ✅ System detects 2-occurrence pattern
- ✅ Learn tab shows proposal when pattern detected
- ✅ User can confirm insertion
- ✅ New concept inserted into graph with correct prerequisite edges
- ✅ Proficiency initialized based on prior knowledge (existing logic)
- ✅ Practice redirects to new prerequisite concept
- ✅ Prerequisite mastery triggers redirect back to original concept
- ✅ Graph animates new node insertion (optional polish)

---

## LLM Prompts Needed

### 6.1: Enhanced Grading Prompt

Extend existing free response grading prompt to classify error type:

```
After evaluating correctness, classify the error:
- CORRECT: No error
- MINOR: Arithmetic, recall, or terminology slip. Student understands the concept.
- MISCONCEPTION: Misunderstands THIS concept. Needs more practice.
- PREREQUISITE_GAP: Error reveals missing knowledge of a DIFFERENT, foundational concept.
  The student cannot succeed without first learning the prerequisite.

Only classify as PREREQUISITE_GAP when the error CANNOT be fixed by more practice on the current concept alone.
Be conservative — most wrong answers are MINOR or MISCONCEPTION, not PREREQUISITE_GAP.

If PREREQUISITE_GAP, also provide:
- The name of the missing prerequisite concept (specific: "Chain Rule" not "calculus")
- A 1-sentence explanation of why the answer reveals this gap
- Severity: NARROW (one concept), MODERATE (2-4 related concepts), BROAD (entire domain)
```

---

## Data Flow

```
User answers question wrong
  ↓
POST /api/study-plans/[id]/attempt
  ├─ Evaluate answer + classify error (LLM)
  ├─ If PREREQUISITE_GAP: create GapDetection record (status: "detected")
  └─ Return feedback to Learn tab
        ↓
Learn tab receives response
  ├─ Display inline feedback: "Not quite. [explanation]"
  └─ If gapAnalysis present: show "💡 Gap detected: [missing concept]"

[User continues practice, gets question wrong again on same concept]
  ↓
POST /api/study-plans/[id]/attempt
  ├─ Evaluate, classify as PREREQUISITE_GAP
  ├─ Create 2nd GapDetection record
  └─ Return to Learn tab
        ↓
Learn tab checks: are there 2+ GapDetection records for same missingConcept?
  ├─ YES: Show proposal card
  │  "I've noticed you struggle with [original concept].
  │   I think you might be missing [prerequisite].
  │   Add [prerequisite] to your learning path?"
  │   [Confirm] [Decline]
  └─ NO: Continue as normal

User clicks [Confirm]
  ↓
POST /api/study-plans/[id]/concepts/insert (new endpoint)
  ├─ Validate: prerequisite doesn't already exist in this graph (else just redirect)
  ├─ Call findOrCreateConcept(prerequisiteName) → Concept
  ├─ Create GraphMembership (conceptId, unitGraphId, depthTier=tier-1)
  ├─ Create ConceptEdge (prerequisiteId → originalConceptId, "prerequisite")
  ├─ Recompute dagre layout → update all positions
  ├─ Update GapDetection status: "proposed" → "accepted"
  └─ Return: { conceptId, layout }
        ↓
Learn tab receives insertion
  ├─ Show animation: new concept node fades in at calculated position
  ├─ Refresh graph visualization (existing concept lighting should update)
  ├─ Redirect practice to new prerequisite: "Let's build your understanding of [X] first"
  └─ Set targetConceptId in store
```

---

## Test Scenarios

1. **Basic Gap Detection:**
   - User practices [Backpropagation], gets 2 free-response questions wrong
   - Grading LLM classifies both as PREREQUISITE_GAP for "Chain Rule"
   - System proposes: "Add Chain Rule to graph?"
   - User confirms → Chain Rule concept inserted as prerequisite to Backpropagation

2. **False Positive Filtering:**
   - User gets one free-response wrong, LLM classifies as PREREQUISITE_GAP
   - Gap detection created but not displayed (only 1 occurrence)
   - Next attempt on different question → classified MINOR (no 2nd gap)
   - No proposal shown (2-occurrence threshold not met)

3. **Existing Prerequisite:**
   - Graph already contains "Chain Rule" (from previous study)
   - User struggles on Backpropagation
   - System proposes inserting Chain Rule
   - Insertion flow detects it exists → instead of creating new, just adds edge + redirects practice
   - Graph doesn't animate (concept already visible)

4. **Mastery Redirect:**
   - Chain Rule inserted, user practices it
   - Proficiency reaches 0.8 (mastery)
   - Learn tab auto-redirects: "You've mastered Chain Rule! Let's try Backpropagation again."
   - Practice session continues on original concept

---

## Open Questions to Resolve During Planning

1. **Should MCQ errors trigger gap analysis?** Free response is diagnostic; MCQ wrong answers are less informative. Recommendation: Simplified analysis on MCQ (only if distractor is linked to specific misconception).

2. **How to determine original concept after insertion?** When practice redirects to new prerequisite, how does system know which concept to redirect back to? Options: (a) store in SessionRecord, (b) store in GapDetection, (c) pass in redirect call. Recommendation: Store in SessionRecord or session context.

3. **What if inserting a cluster of 2-4 concepts?** Phase 6 does single insertion. If prerequisite severity is MODERATE, should we defer to Phase 2, or do cluster insertion now? Recommendation: Defer; Phase 6 is single concepts only.

4. **Should we pre-generate questions for newly inserted concepts?** When a concept is inserted mid-session, we need questions for practice. Fire-and-forget LLM call during insertion, or assume questions will be generated on-demand? Recommendation: Fire-and-forget POST /generate-questions for the new concept while practice redirects (async, non-blocking).

---

## Files to Create/Modify

**New:**
- `src/lib/models/GapDetection.ts` — Type definitions
- `prisma/migrations/[timestamp]_add_gap_detection/` — Schema migration
- `src/app/api/study-plans/[id]/concepts/insert/route.ts` — Insertion endpoint
- `src/components/GapProposalCard.tsx` — UI component for proposal

**Modify:**
- `prisma/schema.prisma` — Add GapDetection model
- `src/lib/prompts/grading.ts` — Extend with error classification
- `src/app/api/study-plans/[id]/attempt/route.ts` — Create GapDetection on PREREQUISITE_GAP
- `src/app/(tabs)/learn/page.tsx` — Check for 2+ gaps, show proposal, handle confirm
- `src/lib/store.ts` — Track redirected/original concept (optional)

---

## Dependencies & Blockers

- Prerequisite system already working (Phase 5) ✓
- Question generation working (Phase 3) ✓
- Proficiency updates persisting (Phase 5) ✓
- Free response grading stub needs extension (Task 1)

No external blockers.

---

*Phase 6 context created 2026-02-26 — Ready for planning*
