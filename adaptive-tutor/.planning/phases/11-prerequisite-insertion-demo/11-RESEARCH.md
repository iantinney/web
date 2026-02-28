# Phase 11: Prerequisite & Extension Insertion Demo - Research

**Researched:** 2026-02-27
**Domain:** Learn tab keyboard shortcuts, LLM-driven gap/extension analysis, graph node insertion animation, seeded demo mode
**Confidence:** HIGH (primary source: codebase audit)

## Summary

This research audits the actual codebase against the `prerequisite-extension-demo-spec.md` to determine what exists, what is missing, and what the critical path is for a minimal working demo.

The codebase already has a **working prerequisite gap detection pipeline** (Phase 6): the attempt route creates `GapDetection` records on incorrect free-response answers, the learn page polls `gap-detections` for 2-occurrence patterns, the `GapProposalCard` renders proposals, and `handleGapConfirm` calls the `concepts/insert` API to add the prerequisite, reload the graph, and redirect practice. There is also an existing seed script (`seed-test-accounts.ts`) that creates test data for gap detection testing.

**What does NOT exist:** Keyboard shortcuts, `analyze-gap` API route, `suggest-extension` API route, `ExtensionProposalCard`, `demo-seeds.ts`, extension edge direction support in the insert API, graph insertion animations, and question-polling after insertion.

**Primary recommendation:** The spec's architecture is sound and matches existing patterns well. The fastest path to a working demo is: (1) create the two new API routes with seeded bypass, (2) add keyboard shortcut listeners to the feedback phase, (3) create ExtensionProposalCard and modify GapProposalCard, (4) modify the insert API to support `position: "extension"`, (5) wire up the shared insertion handler. Graph animations are nice-to-have and can be deferred.

## Current State Audit

### What Works Today (Phase 6 Gap Detection)

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| GapDetection model in schema | DONE | `prisma/schema.prisma` line 162 | Fields: userId, conceptId, missingConcept, severity, explanation, status |
| Auto gap creation on PREREQUISITE_GAP | DONE | `attempt/route.ts` lines 122-133 | Only fires on `free_response` question types via LLM evaluation |
| Gap pattern query (2-occurrence) | DONE | `gap-detections/route.ts` | GET endpoint groups by missingConcept, returns hasPattern if count >= 2 |
| GapProposalCard component | DONE | `src/components/GapProposalCard.tsx` | Props: originalConceptName, missingConceptName, explanation, onConfirm, onDecline, isLoading |
| Learn page gap detection check | DONE | `learn/page.tsx` submitAttempt callback | Fire-and-forget fetch to gap-detections after each attempt |
| Learn page gap proposal rendering | DONE | `learn/page.tsx` line 1285 | Renders GapProposalCard when showGapProposal state is set |
| handleGapConfirm insertion flow | DONE | `learn/page.tsx` lines 620-674 | Calls concepts/insert, sets redirectedFromConceptId, reloads graph, redirects practice |
| concepts/insert API route | DONE | `concepts/insert/route.ts` | Creates concept via dedup, creates membership, creates prerequisite edge, computes force layout, fire-and-forget question generation |
| Mastery redirect back | DONE | `learn/page.tsx` lines 412-432 | When proficiency >= 0.8 on a redirected-to concept, redirects back to original |
| Test seed script | DONE | `prisma/seed-test-accounts.ts` | Creates gap-test-user and mastery-test-user with pre-built data |
| Force-directed layout | DONE | `src/lib/algorithms/forceLayout.ts` | d3-force based, computes synchronously |
| Graph node animations | PARTIAL | `ConceptNode.tsx` | Has entrance animation (`node-entrance` keyframe) and glow-pulse for mastered nodes, but NO insertion-specific animation |

### What Does NOT Exist (Spec Requirements)

| Feature | Status | Spec Section |
|---------|--------|--------------|
| Keyboard shortcuts (Ctrl+G, Ctrl+E) | NOT IMPLEMENTED | Section 1 |
| Clickable "Analyze Gap" / "What's Next?" buttons | NOT IMPLEMENTED | Section 1 |
| `POST /analyze-gap` route | NOT IMPLEMENTED | Section 2a |
| `POST /suggest-extension` route | NOT IMPLEMENTED | Section 2b |
| `lib/demo-seeds.ts` seed config | NOT IMPLEMENTED | Section 3a |
| ExtensionProposalCard component | NOT IMPLEMENTED | Section 4b |
| Shared insertion handler (gap + extension) | NOT IMPLEMENTED | Section 4c |
| Question polling after insertion | NOT IMPLEMENTED | Section 4d |
| Graph node insertion animation | NOT IMPLEMENTED | Section 5 |
| `position` field in concepts/insert | NOT IMPLEMENTED | Section 6 |
| Error handling fallbacks | NOT IMPLEMENTED | Section 7 |

## Spec vs. Codebase Analysis

### Spec Accuracy Assessment

#### Section 1: Keyboard Shortcuts - ACCURATE but needs adjustment
- The spec references `app/(app)/study-plans/[id]/learn/page.tsx` but the actual path is `src/app/(tabs)/learn/page.tsx`
- The spec's state variables for gap/extension analysis are not yet in the learn page
- The feedback phase (`phase === "feedback"`) and `lastResult` state already exist and are accessible
- **Risk:** Keyboard shortcuts may conflict with browser defaults (Ctrl+G opens "Find" in some browsers). Consider using Ctrl+Shift+G instead or only the clickable buttons.

#### Section 2a: analyze-gap API - MOSTLY ACCURATE
- The spec's request/response shape is reasonable
- The existing `attempt/route.ts` already does gap analysis during free_response evaluation and stores `GapDetection` records. The `analyze-gap` route would be a NEW on-demand analysis (not reusing the existing 2-occurrence pattern)
- The spec correctly separates seeded mode from live LLM mode
- The LLM prompt structure matches existing patterns in the codebase (`evaluateFreeResponsePrompt`, `edgeInferencePrompt`)
- **Adjustment needed:** The seeded bypass pattern is clean and should remain as-is

#### Section 2b: suggest-extension API - ACCURATE
- No existing extension suggestion logic exists in the codebase
- The spec's approach of providing existing concept names to avoid duplicates is correct
- The LLM prompt pattern matches established patterns

#### Section 3: Seeded Demo Flow - MOSTLY ACCURATE
- The spec's seed configuration pattern (concept name matching + pre-computed responses) is sound
- The existing `seed-test-accounts.ts` shows the team's pattern for test data seeding
- **Important:** The spec seeds match against concept name patterns. This means the seeded demo requires a study plan with concepts matching those patterns (e.g., "Derivatives", "Backpropagation"). The seed script should create this plan, OR the seeds should be more flexible
- **Adjustment:** The `findDemoSeed` function runs client-side. This is correct -- seeds are checked client-side, and the `seeded` field is passed to the API which bypasses LLM

#### Section 4: Proposal Cards - NEEDS ADJUSTMENT
- The existing `GapProposalCard` has a DIFFERENT prop interface than what the spec proposes:
  - Current: `{ originalConceptName, missingConceptName, explanation, onConfirm, onDecline, isLoading }`
  - Spec proposes: `{ proposal: { missingConcept, explanation, severity, parentConceptId }, onConfirm, onDecline, isInserting }`
- **Recommendation:** Keep the existing GapProposalCard interface mostly unchanged. The current interface works well. Just add the missing fields (severity) if needed, or leave as-is since severity doesn't affect the UI significantly
- The spec's `ExtensionProposalCard` with blue/teal styling is a clean counterpart -- create fresh

#### Section 5: Graph Animations - OVERENGINEERED FOR A HACKATHON
- The spec describes a detailed 1.5-second animation sequence with CSS keyframes, relayout transitions, glow effects
- The codebase already has:
  - `ConceptNode` entrance animation (`node-entrance` keyframe, ~0.7s, staggered)
  - Glow pulse for mastered nodes
  - Smooth position transitions on the graph (React Flow `style={{ transition: ... }}`)
  - `loadUnitGraphData` already refreshes graph data from API
- **Critical insight:** The graph page already applies smooth `transform` transitions (0.8s cubic-bezier) to all nodes via their `style` prop. When `loadUnitGraphData` refreshes positions after insertion, existing nodes will ALREADY slide smoothly to new positions. The new node will appear with the existing entrance animation.
- **Recommendation:** Skip custom animation system. Just call `loadUnitGraphData` after insertion. The existing entrance animation + position transitions give 80% of the visual impact for 0% additional code.

#### Section 6: concepts/insert Modifications - PARTIALLY NEEDED
- The existing insert API hardcodes the edge direction as `prerequisite -> target` (fromNodeId: prerequisiteConceptId, toNodeId: targetConceptId)
- For extension support, we need to reverse the edge: `fromNodeId: anchor, toNodeId: newConcept`
- The `position` field addition is a simple conditional
- The API already returns `conceptId` in the response, so the spec's requirement is met
- **Adjustment:** The insert API uses `targetConceptId` as the param name. For extensions, the spec proposes `anchorConceptId`. Renaming or aliasing is needed.

### Critical Architecture Observations

1. **The existing gap detection flow is automatic (after 2 incorrect attempts), while the spec proposes on-demand (keyboard shortcut)**. These are COMPLEMENTARY, not conflicting. The existing flow should remain, and the new on-demand flow adds a parallel path.

2. **The learn page is already ~1685 lines**. Adding keyboard shortcuts, extension state, and insertion handlers will add ~200 more lines. This is manageable but the file is getting large.

3. **The `concepts/insert` API already does question generation fire-and-forget**. The spec's `waitForQuestions` polling is only needed if we want to guarantee questions exist before redirecting. Currently, `initSession` has its own retry loop (3 retries, 4s apart) that handles this.

4. **The store already has `redirectedFromConceptId`** and mastery-redirect logic. This works for prerequisite insertion. Extension insertion does NOT need redirect-back logic (you just start practicing the new concept).

## Critical Path (Ordered by Priority)

### Tier 1: Core Demo (MUST HAVE) - Enables end-to-end flow

1. **`lib/demo-seeds.ts`** - Seed configuration file
   - Defines seed patterns for gap and extension proposals
   - `findDemoSeed(conceptName, type)` function
   - Enables guaranteed demo without LLM dependency
   - Effort: Small (~50 lines)

2. **`POST /analyze-gap` API route** - On-demand gap analysis
   - Seeded bypass: if `body.seeded`, return pre-computed response
   - Live mode: LLM prompt to analyze wrong answer for prerequisite gaps
   - Follows existing pattern from `attempt/route.ts` and `add-custom/route.ts`
   - Effort: Medium (~80 lines)

3. **`POST /suggest-extension` API route** - On-demand extension suggestion
   - Seeded bypass: if `body.seeded`, return pre-computed response
   - Live mode: LLM prompt to suggest next topic
   - Effort: Medium (~80 lines)

4. **Modify `concepts/insert` for extension support** - Add `position` field
   - Accept `position: "prerequisite" | "extension"` (default "prerequisite")
   - If extension: edge direction is `anchor -> new` instead of `new -> anchor`
   - Place extension at `targetMembership.depthTier + 1` instead of `- 1`
   - Effort: Small (~15 lines changed)

5. **Keyboard shortcuts + trigger buttons in learn/page.tsx** - User interaction
   - `useEffect` with keydown listener for Ctrl+G (wrong answer) and Ctrl+E (correct answer)
   - Clickable buttons in feedback UI: "Analyze Gap" and "What's Next?"
   - `triggerGapAnalysis()` and `triggerExtensionAnalysis()` functions
   - State: `isAnalyzingGap`, `isAnalyzingExtension`, `gapProposal`, `extensionProposal`
   - Effort: Medium (~120 lines)

6. **ExtensionProposalCard component** - New UI component
   - Blue/teal themed card (vs amber for gap)
   - Props: suggestedConcept, explanation, onConfirm, onDecline, isInserting
   - Effort: Small (~80 lines, based on existing GapProposalCard)

7. **Shared insertion handler in learn/page.tsx** - Wire up confirm flow
   - `handleInsertConcept(type, conceptName, anchorConceptId)`
   - Calls concepts/insert with position field
   - Reloads graph data
   - For prerequisite: sets redirectedFromConceptId, redirects to new concept
   - For extension: just starts new session on the extension concept
   - Effort: Medium (~60 lines)

### Tier 2: Polish (NICE TO HAVE) - Improves demo quality

8. **Seeded demo study plan creation** - Test data
   - Extend `seed-test-accounts.ts` or create new script
   - Create study plan with concepts matching seed patterns (e.g., "Derivatives")
   - Pre-generate questions for those concepts
   - Effort: Medium (~100 lines)

9. **Question polling after insertion** - Reliability
   - `waitForQuestions()` polls GET /questions?conceptId=X until ready
   - Prevents "no questions" error when practicing newly inserted concept
   - The existing initSession retry (3x 4s) partially handles this already
   - Effort: Small (~30 lines)

10. **Error handling fallbacks** - Robustness
    - LLM failure fallback: generic "`${conceptName} Fundamentals`" suggestion
    - Question generation timeout toast
    - Insertion failure handling
    - Effort: Small (~40 lines)

### Tier 3: Visual Polish (DEFER IF SHORT ON TIME)

11. **Graph insertion animation** - Visual impact
    - Add "entering" CSS class for newly inserted nodes
    - Glow effect on new node for ~1s after insertion
    - Already gets smooth position transitions from existing React Flow setup
    - Effort: Medium (~60 lines of CSS + JS)

12. **Color coding for new nodes** - Visual distinction
    - Amber border/glow for prerequisite insertions
    - Blue border/glow for extension insertions
    - Temporary styling that transitions to normal after first practice
    - Effort: Medium (~40 lines in ConceptNode)

## Minimal Demo Definition

### What constitutes a "guaranteed-to-work" demo:

1. **Seeded mode is mandatory** - The demo MUST work with seeds (no LLM dependency)
2. **Both gap AND extension** - Both directions demonstrate the system's intelligence
3. **Graph refresh (not animation)** - Calling `loadUnitGraphData` after insertion shows the new node; custom animation is optional
4. **Question generation works** - The inserted concept must have questions to practice
5. **Redirect flow works** - Prerequisite insertion redirects to new concept, extension starts new concept practice

### Demo Script (Minimum Viable):

1. Have a study plan with "Derivatives" concept (matches seed pattern)
2. Practice Derivatives, answer incorrectly
3. In feedback, press Ctrl+G or click "Analyze Gap"
4. GapProposalCard appears: "Limit Definition" prerequisite suggested
5. Click "Add to Learning Path"
6. Graph reloads with new "Limit Definition" node
7. Practice redirects to Limit Definition
8. Answer correctly, master it, redirect back to Derivatives
9. Practice Derivatives, answer correctly
10. Press Ctrl+E or click "What's Next?"
11. ExtensionProposalCard appears: "Integration Techniques" suggested
12. Click "Explore This Topic"
13. Graph reloads with new "Integration Techniques" node
14. Practice redirects to Integration Techniques

### Pre-conditions for Demo:
- Seeded study plan with "Derivatives" concept + pre-generated questions
- `demo-seeds.ts` with matching patterns
- Both API routes deployed with seeded bypass

## Risk Assessment

### HIGH RISK

1. **Question generation timing** - Newly inserted concepts need questions before practice can begin. Current approach is fire-and-forget generation + retry polling. If generation takes >15s, the user sees "No questions available."
   - **Mitigation:** For seeded mode, pre-generate questions in the seed script. For live mode, add `waitForQuestions` polling.

2. **Learn page complexity** - The file is already ~1685 lines. Adding ~200 more lines of state/handlers increases cognitive load and bug surface.
   - **Mitigation:** Extract the new keyboard shortcut/analysis logic into a custom hook (e.g., `useInsertionDemo`).

### MEDIUM RISK

3. **Keyboard shortcut conflicts** - Ctrl+G opens "Find on Page" in Firefox. Ctrl+E focuses address bar in Chrome.
   - **Mitigation:** Use clickable buttons as primary UX. Keyboard shortcuts as secondary. Consider using `e.preventDefault()` aggressively, or change shortcuts.

4. **Extension edge direction** - The existing insert API always creates edges as `prerequisite -> target`. Reversing for extensions needs careful testing with the force layout (tier calculation, prerequisite checker).
   - **Mitigation:** Add the `position` field with a simple conditional. Test that `getLockedConcepts` still works correctly with extension edges.

5. **GapDetection status field mismatch** - The seed script creates records with `status: "pending"` but the gap-detections query filters on `status: "detected"`. This means the existing seed script's gap detections WON'T trigger the pattern query.
   - **Mitigation:** Fix seed script to use `status: "detected"` or update the gap-detections query.

### LOW RISK

6. **LLM quality in live mode** - The MiniMax model may not produce great gap/extension suggestions. But seeded mode exists as fallback.
7. **Store state management** - Adding extension proposal state alongside existing gap proposal state. These are mutually exclusive (can't have both active), which simplifies management.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Force layout computation | Custom layout algorithm | Existing `computeForceLayout` (d3-force) | Already handles graph relayout after insertion |
| Concept deduplication | Manual name matching | Existing `findOrCreateConcept` | Handles normalized name matching, prevents duplicates |
| Graph data refresh | Manual Zustand state updates | Existing `loadUnitGraphData` | Fetches fresh data from API, updates all graph stores atomically |
| LLM text generation | Direct API calls | Existing `generateText` from `minimax-native.ts` | Handles auth, retries, model selection |
| JSON parsing from LLM | Manual regex/parse | Existing `parseLLMJson` from `schemas.ts` | Handles markdown fences, trailing commas, common LLM JSON issues |
| Question generation | Custom question creator | Existing `generate-questions/route.ts` | Already handles per-concept generation with dedup |
| Node entrance animation | Custom CSS/JS animation | Existing `node-entrance` keyframe in ConceptNode | Already present, staggered, with spring easing |
| Smooth node repositioning | Custom transition system | Existing React Flow node `style.transition` | Already applies 0.8s cubic-bezier transforms |

## Code Examples

### Pattern: API Route with Seeded Bypass (from existing codebase patterns)

```typescript
// Based on existing patterns in add-custom/route.ts and attempt/route.ts
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // MUST await params (Next.js 16)
  const body = await request.json();
  const userId = request.headers.get("x-user-id") || "demo-user";

  // Seeded mode bypass
  if (body.seeded) {
    return NextResponse.json({
      hasGap: true,
      missingConcept: body.seeded.missingConcept,
      explanation: body.seeded.explanation,
      severity: "high",
      parentConceptId: body.conceptId,
    });
  }

  // Live LLM mode
  const rawText = await generateText(
    [{ role: "user", content: "Analyze this student answer." }],
    gapAnalysisPrompt(body.conceptName, body.questionText, body.userAnswer, body.correctAnswer),
    { temperature: 0.2, maxTokens: 512, model: "MiniMax-M2" }
  );
  const parsed = parseLLMJson(rawText);
  // ... validate and return
}
```

### Pattern: Concept Insertion (from existing concepts/insert/route.ts)

```typescript
// The existing insert route already handles:
// 1. findOrCreateConcept (dedup)
// 2. GraphMembership creation
// 3. ConceptEdge creation
// 4. computeForceLayout (all positions)
// 5. Batch position persist
// 6. Fire-and-forget question generation
//
// Only change needed: edge direction conditional
if (position === "prerequisite") {
  // New concept -> target (new is prereq OF target)
  fromNodeId = newConceptId;
  toNodeId = targetConceptId;
  newDepthTier = Math.max(1, targetMembership.depthTier - 1);
} else {
  // Target -> new concept (new extends FROM target)
  fromNodeId = targetConceptId;
  toNodeId = newConceptId;
  newDepthTier = targetMembership.depthTier + 1;
}
```

### Pattern: Keyboard Shortcut in Learn Page

```typescript
// Based on existing keydown pattern in graph/page.tsx (Escape key)
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (phase !== "feedback" || !lastResult) return;

    if (e.ctrlKey && e.key === "g" && !lastResult.isCorrect) {
      e.preventDefault();
      triggerGapAnalysis();
    }
    if (e.ctrlKey && e.key === "e" && lastResult.isCorrect) {
      e.preventDefault();
      triggerExtensionAnalysis();
    }
  };

  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [phase, lastResult]);
```

## Open Questions

1. **Should the seeded demo require a specific study plan, or should seeds match any plan?**
   - Current recommendation: Seeds match by concept name pattern (regex), so any study plan with matching concepts works. But for a guaranteed demo, a dedicated seed script should create the perfect plan.
   - Confidence: MEDIUM

2. **Should extension proposals be available on ANY correct answer, or only when proficiency is high?**
   - Spec says "correct answer." For demo purposes, any correct answer is fine. For production, limiting to high-proficiency concepts makes more educational sense.
   - Confidence: LOW (design decision, not technical)

3. **How to handle the graph page being on a different tab?**
   - When insertion happens on the learn page and graph data is reloaded, the graph page (if user switches to it) will show the new node. But there's no cross-tab animation. The user would need to switch to graph tab to see the visual result.
   - Current behavior is fine for demo: user stays on learn tab, graph refreshes in background.

## Sources

### Primary (HIGH confidence)
- Direct codebase audit of all referenced files
- `src/app/(tabs)/learn/page.tsx` - 1685 lines, full gap detection + insertion flow
- `src/components/GapProposalCard.tsx` - 116 lines, existing card component
- `src/app/api/study-plans/[id]/concepts/insert/route.ts` - 197 lines, insertion API
- `src/app/api/study-plans/[id]/gap-detections/route.ts` - 76 lines, pattern detection
- `src/app/api/study-plans/[id]/attempt/route.ts` - 269 lines, gap detection creation
- `src/app/(tabs)/graph/page.tsx` - 433 lines, graph rendering with React Flow
- `src/components/graph/ConceptNode.tsx` - 278 lines, node with animations
- `src/lib/algorithms/forceLayout.ts` - 115 lines, d3-force layout
- `src/lib/store.ts` - 397 lines, Zustand store with redirect state
- `prisma/schema.prisma` - full data model
- `prisma/seed-test-accounts.ts` - existing test seeding patterns

### Secondary (MEDIUM confidence)
- `/home/antel/hackathon/prerequisite-extension-demo-spec.md` - the proposal spec being validated

## Metadata

**Confidence breakdown:**
- Current state audit: HIGH - direct codebase reading, every claim verified
- Spec accuracy analysis: HIGH - compared spec line-by-line against actual code
- Critical path ordering: HIGH - based on dependency analysis of what enables what
- Minimal demo definition: MEDIUM - some design decisions are judgment calls
- Risk assessment: MEDIUM - some risks are speculative

**Research date:** 2026-02-27
**Valid until:** 2026-03-06 (stable codebase, hackathon context)
