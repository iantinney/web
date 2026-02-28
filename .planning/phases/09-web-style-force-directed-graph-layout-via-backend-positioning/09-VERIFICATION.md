---
phase: 09-web-style-force-directed-graph-layout-via-backend-positioning
verified: 2026-02-27T08:30:00Z
status: gaps_found
score: 10/12 must-haves verified
re_verification: false
gaps:
  - truth: "Positions persist to GraphMembership.positionX/positionY in the database with correct depthTier for recompute"
    status: partial
    reason: "structure-plan/route.ts computes forceLayout correctly at creation time using difficultyTier from LLM data, but persists depthTier: 0 ('Will be computed later') to the database. No subsequent step ever updates depthTier. All subsequent layout recomputes via /api/unit-graphs/[id]/layout read depthTier from the DB and get 0 for all nodes, collapsing radial tier separation."
    artifacts:
      - path: "adaptive-tutor/src/app/api/study-plans/[id]/structure-plan/route.ts"
        issue: "Lines 219 and 226 set depthTier: 0 in GraphMembership upsert despite correct difficultyTier being available at lines 163 and 192 from graphData.concepts[i].difficultyTier"
    missing:
      - "Change depthTier: 0 to depthTier: graphData.concepts[i]?.difficultyTier ?? 1 (or equivalent concept.difficultyTier) in the GraphMembership upsert at lines 209-228"
      - "Remove the 'Will be computed later' comment — the depthTier IS available from the LLM-parsed data at this point"

  - truth: "LAYOUT-01 through LAYOUT-05 requirement IDs are formally tracked in REQUIREMENTS.md"
    status: failed
    reason: "REQUIREMENTS.md contains no LAYOUT-01 through LAYOUT-05 entries. These IDs appear only in PLAN frontmatter and SUMMARY files. REQUIREMENTS.md was never updated to include phase 9 requirements. The IDs exist in plans but have no canonical description or traceability entry."
    artifacts:
      - path: ".planning/REQUIREMENTS.md"
        issue: "No LAYOUT-* section. Traceability table ends at Phase 7 requirements (CHAT-CONTEXT-06). Phase 9 requirements are unregistered."
    missing:
      - "Add LAYOUT-01 through LAYOUT-05 requirement definitions to REQUIREMENTS.md with descriptions, phase mapping, and status"
human_verification:
  - test: "Verify particle animation visual quality in browser"
    expected: "Edges show animated green particle streams flowing from prerequisite toward dependent. Proficiency 0 produces 1 slow particle (4s), proficiency 1.0 produces 5 fast particles (1.5s). Locked edges are dim dashed lines with no particles."
    why_human: "SVG animateMotion rendering and visual quality cannot be verified programmatically"
  - test: "Verify force-directed layout organic appearance"
    expected: "Graph renders as organic web — tier 1 nodes near center, tier 3 nodes at periphery. Not a rigid flowchart top-to-bottom layout."
    why_human: "Visual layout quality requires browser rendering to assess"
  - test: "Verify AddConceptFAB interaction flow"
    expected: "Clicking + opens glass morphism overlay with framer-motion animation. Enter submits. Escape closes. After submission, graph reloads with new node appearing at force-directed position."
    why_human: "UI interaction, animation quality, and graph refresh behavior require live browser testing"
---

# Phase 9: Web-style Force-Directed Graph Layout Verification Report

**Phase Goal:** Replace hierarchical Dagre layout with organic force-directed web layout (d3-force on backend), add particle stream edge animations with proficiency-driven intensity, and enable user-initiated custom node addition with LLM edge inference — transforming the graph into a living neural network.
**Verified:** 2026-02-27T08:30:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Graph positions are computed by d3-force with forceRadial (prerequisites near center, advanced outer) | VERIFIED | `forceLayout.ts` uses all 6 d3-force forces including `forceRadial` with tier-based radius (0.3/0.7/1.0 * baseRadius). Radial strength 0.6 dominates link forces. |
| 2 | Adaptive spacing scales with graph size | VERIFIED | `scaleFactor = Math.max(1, Math.sqrt(nodeCount / 10))` at line 57; all forces scale with it |
| 3 | Positions persist to GraphMembership.positionX/positionY in DB | PARTIAL | Layout endpoint and add-custom/insert routes correctly persist. **structure-plan persists positions correctly but saves `depthTier: 0` — breaking subsequent recomputes** |
| 4 | Layout recomputes on graph mutation (creation and concept insertion) | VERIFIED | structure-plan, concepts/insert, concepts/add-custom all call `computeForceLayout` and persist positions |
| 5 | POST /api/unit-graphs/[id]/layout returns computed positions | VERIFIED | `layout/route.ts` exists, imports computeForceLayout, runs simulation, returns `{ layout: Record<string,{x,y}> }` |
| 6 | Edges show animated particle streams flowing from prerequisite to dependent | VERIFIED | `ParticleEdge.tsx` uses SVG `<animateMotion>` on bezier path with `repeatCount="indefinite"` |
| 7 | Particle density and speed scale with source node proficiency | VERIFIED | `particleCount = Math.max(1, Math.round(proficiency * 5))`, `duration = 4 - proficiency * 2.5` at lines 71-72 |
| 8 | Locked edges appear dim and dashed with zero particles | VERIFIED | Early return at line 53-65 renders `strokeDasharray="4 6"` and zero particle elements when `isLocked` |
| 9 | Edges arrive at nodes from any direction (multi-directional handles) | VERIFIED | `ConceptNode.tsx` has handles on all 4 sides: target-top, target-left, source-bottom, source-right with `hiddenHandleStyle` |
| 10 | Node positions animate smoothly when layout changes | VERIFIED | `style: { transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }` at line 92 of graph page |
| 11 | User can tap a floating + button in graph view to add a custom concept | VERIFIED | `AddConceptFAB.tsx` renders at `bottom: 80, right: 24` with framer-motion. Graph page renders it at lines 391-397 |
| 12 | After entering concept name, node appears with LLM-inferred edges and graph reflows | VERIFIED | `add-custom/route.ts` calls LLM, creates concept via findOrCreateConcept, creates edges, runs computeForceLayout, persists positions, returns layout |

**Score:** 10/12 truths verified (1 partial gap, 1 administrative gap)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `adaptive-tutor/src/lib/algorithms/forceLayout.ts` | computeForceLayout() with d3-force simulation | VERIFIED | 115 lines. Exports `computeForceLayout`, `LayoutNode`, `LayoutLink`. Full d3-force simulation with forceRadial. |
| `adaptive-tutor/src/app/api/unit-graphs/[id]/layout/route.ts` | POST endpoint for on-demand layout recompute | VERIFIED | 82 lines. Fetches memberships+edges, calls computeForceLayout, $transaction persist, returns `{ layout }` |
| `adaptive-tutor/src/components/graph/ParticleEdge.tsx` | Custom React Flow edge with bezier + SVG animateMotion particles | VERIFIED | 124 lines. Exports `ParticleEdge` (React.memo) and `edgeTypes`. Handles locked/active states. |
| `adaptive-tutor/src/components/graph/ConceptNode.tsx` | Multi-directional handles (4 sides) | VERIFIED | 4 Handle components: target-top, target-left, source-bottom, source-right with hiddenHandleStyle |
| `adaptive-tutor/src/app/(tabs)/graph/page.tsx` | Wired ParticleEdge + proficiency-driven edge data + AddConceptFAB | VERIFIED | Imports edgeTypes and AddConceptFAB. flowEdges passes `type:"particle"` with `sourceProficiency`/`isLocked`. HandleConceptAdded callback triggers loadUnitGraphData. |
| `adaptive-tutor/src/components/graph/AddConceptFAB.tsx` | Floating + button + form overlay for custom concept | VERIFIED | 216 lines. Glass morphism, framer-motion animations, keyboard shortcuts, submit/cancel handlers |
| `adaptive-tutor/src/app/api/study-plans/[id]/concepts/add-custom/route.ts` | POST endpoint: LLM edge inference + DAG validation + force layout | VERIFIED | 329 lines. Full pipeline: LLM call, graceful degradation, concept create, edge creation, validateDAG with cycle removal, computeForceLayout, $transaction persist |
| `adaptive-tutor/src/lib/prompts/index.ts` | edgeInferencePrompt function | VERIFIED | `edgeInferencePrompt` exported at line 436 with full prompt instructing prerequisite/dependent edge inference |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `structure-plan/route.ts` | `forceLayout.ts` | `import computeForceLayout` | WIRED | Line 6: `import { computeForceLayout } from "@/lib/algorithms/forceLayout"`. Used at line 160. |
| `concepts/insert/route.ts` | `forceLayout.ts` | `import computeForceLayout` | WIRED | Line 4: `import { computeForceLayout }`. Used at line 137. |
| `unit-graphs/[id]/layout/route.ts` | `forceLayout.ts` | `import computeForceLayout` | WIRED | Line 3: `import { computeForceLayout }`. Used at line 49. |
| `graph/page.tsx` | `ParticleEdge.tsx` | `edgeTypes` registration + proficiency data | WIRED | Line 19 import, line 320 `edgeTypes={edgeTypes}`, flowEdges passes `type:"particle"` with `sourceProficiency`/`isLocked` |
| `ConceptNode.tsx` | `@xyflow/react` | Handle on all 4 Positions | WIRED | Lines 110-111, 263-264: Top, Left, Bottom, Right handles present |
| `AddConceptFAB.tsx` | `add-custom` API | fetch POST | WIRED | Line 52-62: `fetch(\`/api/study-plans/${studyPlanId}/concepts/add-custom\`, { method: "POST" })` |
| `add-custom/route.ts` | `prompts/index.ts` | `import edgeInferencePrompt` | WIRED | Line 5: `import { edgeInferencePrompt } from "@/lib/prompts"`. Used at line 73. |
| `add-custom/route.ts` | `forceLayout.ts` | `import computeForceLayout` | WIRED | Line 4: `import { computeForceLayout }`. Used at line 281. |
| `graph/page.tsx` | `AddConceptFAB.tsx` | renders component with props | WIRED | Line 22 import, lines 391-397 render with `studyPlanId`, `unitGraphId`, `onConceptAdded` |

---

## Requirements Coverage

| Requirement ID | Source Plan | Status | Evidence |
|---------------|------------|--------|----------|
| LAYOUT-01 | 09-01-PLAN.md | SATISFIED (implementation) / ORPHANED (REQUIREMENTS.md) | `computeForceLayout` in `forceLayout.ts` with d3-force simulation and forceRadial tier positioning. **Not registered in REQUIREMENTS.md.** |
| LAYOUT-02 | 09-02-PLAN.md | SATISFIED (implementation) / ORPHANED (REQUIREMENTS.md) | `ParticleEdge.tsx` with SVG animateMotion, proficiency-driven particle count/speed. **Not registered in REQUIREMENTS.md.** |
| LAYOUT-03 | 09-02-PLAN.md | SATISFIED (implementation) / ORPHANED (REQUIREMENTS.md) | Multi-directional ConceptNode handles (4 sides), edgeTypes registered in graph page. **Not registered in REQUIREMENTS.md.** |
| LAYOUT-04 | 09-03-PLAN.md | SATISFIED (implementation) / ORPHANED (REQUIREMENTS.md) | AddConceptFAB + add-custom endpoint with LLM edge inference + DAG validation. **Not registered in REQUIREMENTS.md.** |
| LAYOUT-05 | 09-01-PLAN.md | SATISFIED (implementation) / ORPHANED (REQUIREMENTS.md) | POST /api/unit-graphs/[id]/layout endpoint exists and returns computed layout. **Not registered in REQUIREMENTS.md.** |

**Orphaned requirements:** All 5 LAYOUT-* requirement IDs are claimed in plan frontmatter and summaries but have NO entry in `.planning/REQUIREMENTS.md`. The traceability table in REQUIREMENTS.md does not include Phase 9 at all. These are orphaned from the requirements tracking system.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `structure-plan/route.ts` | 219, 226 | `depthTier: 0, // Will be computed later` | BLOCKER | "Will be computed later" never happens. All concepts in graphs created via structure-plan have `depthTier: 0` in DB. The `/api/unit-graphs/[id]/layout` recompute endpoint fetches these 0 values and passes them to `computeForceLayout`, which will calculate `baseRadius * 0.3` for all nodes (tier 1 path), collapsing the radial ring structure on any recompute. Initial graph creation works because the forceLayout call at line 160 uses `graphData.concepts[i].difficultyTier` (correct), but the DB value is wrong for all future use. |
| `structure-plan/route.ts` | 219, 226 | `depthTier: 0` as placeholder never updated | WARNING | `generate-questions/route.ts` reads `membership.depthTier` for `difficultyTier` (line 71) and uses fallback `|| 1`, masking the issue in question generation. But layout recomputes are not masked. |

---

## Human Verification Required

### 1. Particle Animation Visual Quality

**Test:** Open the graph tab on a study plan with concepts at varying proficiency levels (some mastered, some untested). Observe edges between nodes.
**Expected:** Mastered (green) source nodes emit 5 fast green particles traveling along bezier paths to target nodes. Untested (gray) source nodes emit 1 slow particle. Locked target nodes show dim gray dashed lines with no particles.
**Why human:** SVG animateMotion rendering quality and visual correctness cannot be verified through static code analysis.

### 2. Force-Directed Layout Organic Appearance

**Test:** Create a new study plan from a text document with concepts at 3 difficulty tiers. View the resulting graph.
**Expected:** Graph renders as an organic web, not a top-down flowchart. Foundation concepts (tier 1) cluster near center. Advanced concepts (tier 3) are at the periphery. Edges curve organically (curvature 0.4 bezier).
**Why human:** Visual layout quality and "organic" vs "hierarchical" distinction requires browser rendering.

### 3. AddConceptFAB End-to-End Flow

**Test:** Open graph tab. Tap the green + button (bottom-right). Type "Linear Regression". Press Enter.
**Expected:** Form overlay appears with framer-motion scale animation. After submitting, the graph reloads with a new "Linear Regression" node connected to related existing concepts (inferred by LLM). Graph smoothly reflows to accommodate new node.
**Why human:** UI interaction, animation, LLM response quality, and live graph refresh behavior require manual testing.

### 4. Node Transition Animation

**Test:** Trigger a layout recompute by inserting a prerequisite concept via the gap detection flow. Observe existing nodes.
**Expected:** Existing nodes glide smoothly to new positions over 0.8s with cubic-bezier easing.
**Why human:** CSS transition animation quality requires visual inspection in browser.

---

## Gaps Summary

### Gap 1: depthTier Not Persisted in structure-plan (Blocker)

The structure-plan route computes the force layout correctly for the initial graph, using `graphData.concepts[i].difficultyTier` (the LLM-assigned difficulty tiers). However, when it persists GraphMemberships to the database, it saves `depthTier: 0` with a "Will be computed later" comment that is never executed. No subsequent code updates these values.

**Impact on layout recomputes:** The `/api/unit-graphs/[id]/layout` endpoint reads `m.depthTier` from the database to build the layout nodes array. For graphs created via structure-plan, all nodes have `depthTier: 0`. The `computeForceLayout` function treats tier 0 as a non-tier-1/2 case and applies `baseRadius * 1.0` (the "advanced" path via the `else` branch), placing all nodes on the outer ring — entirely defeating the radial tier separation.

**Fix required:** Change lines 219 and 226 in structure-plan/route.ts to use the actual difficulty tier:
```typescript
// Inside the loop: for (const concept of graphData.concepts) { ... }
depthTier: concept.difficultyTier,
```

### Gap 2: LAYOUT-* Requirements Not in REQUIREMENTS.md (Administrative)

All five LAYOUT-01 through LAYOUT-05 requirement IDs are referenced in plan frontmatter and summaries but are absent from `.planning/REQUIREMENTS.md`. The requirements document has no phase 9 section, no LAYOUT requirement definitions, and no traceability entries for these IDs. This is an administrative tracking gap, not a functional implementation gap.

---

_Verified: 2026-02-27T08:30:00Z_
_Verifier: Claude (gsd-verifier)_
