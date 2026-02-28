---
phase: 06
plan: 02
subsystem: gap-proposal-ui
tags: [react, zustand, nextjs-api, tailwind, gap-detection, concept-insertion, dagre-layout]

dependency-graph:
  requires: [06-01-gap-detection-model]
  provides: [GapProposalCard, gap-detections-endpoint, concepts-insert-endpoint, practice-redirect-flow]
  affects: [future-upward-growth, future-advisor-button]

tech-stack:
  added: []
  patterns:
    - "Fire-and-forget gap pattern check after each attempt (non-blocking)"
    - "2-occurrence threshold before surfacing proposal to user"
    - "Practice redirect: store redirectedFromConceptId, auto-redirect back on mastery"
    - "Next.js 16 async params pattern in all new API routes"

key-files:
  created:
    - adaptive-tutor/src/components/GapProposalCard.tsx
    - adaptive-tutor/src/app/api/study-plans/[id]/gap-detections/route.ts
    - adaptive-tutor/src/app/api/study-plans/[id]/concepts/insert/route.ts
  modified:
    - adaptive-tutor/src/app/(tabs)/learn/page.tsx
    - adaptive-tutor/src/lib/store.ts

decisions:
  - "GapProposalCard uses custom Tailwind/CSS variable styling (no shadcn/ui — ui/ dir is empty)"
  - "computeDAGLayout accepts (GraphNode[], GraphEdge[]) not a plain object — adapted insert endpoint accordingly"
  - "Task 5 (store) executed before Task 4 (learn page) since learn page depends on store fields"
  - "gap-detections endpoint awaits params even when id is unused (Next.js 16 requirement)"
  - "handleGapConfirm reinitializes session after 2s delay to show redirect message to user"
  - "useAppStore.getState() used inside submitAttempt callback to avoid stale closure for redirectedFromConceptId"

metrics:
  duration: "8 minutes"
  completed: "2026-02-26"
---

# Phase 6 Plan 02: Gap Proposal UI & Concept Insertion Flow Summary

**One-liner:** Amber card proposal UI + 2-occurrence query endpoint + DAG-relayout insertion endpoint + learn tab redirect logic completing the gap detection → proposal → insertion → redirect loop.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | GapProposalCard component | 87fc37e | src/components/GapProposalCard.tsx |
| 2 | GET /gap-detections endpoint | 2160af4 | src/app/api/.../gap-detections/route.ts |
| 3 | POST /concepts/insert endpoint | b6ef246 | src/app/api/.../concepts/insert/route.ts |
| 5 | redirectedFromConceptId in store | 7f10765 | src/lib/store.ts |
| 4 | Learn tab integration | b538573 | src/app/(tabs)/learn/page.tsx |

## What Was Built

### GapProposalCard (`src/components/GapProposalCard.tsx`)

An amber-bordered card rendered in the Learn tab when the 2-occurrence threshold is met. Shows:
- The concept the user was struggling with
- The detected missing prerequisite name
- An explanation from the LLM
- "Add to learning path" (confirm) and "Not now" (decline) buttons
- Loading state during insertion

Uses project's CSS variables and Tailwind — no shadcn/ui (that directory is empty in this project).

### GET /gap-detections (`/api/study-plans/[id]/gap-detections`)

Queries all `GapDetection` records for a given `conceptId` with `status: "detected"`. Groups by `missingConcept` and returns `{ hasPattern: true, missingConcept, severity, explanation }` when any prerequisite appears 2+ times, otherwise `{ hasPattern: false }`.

### POST /concepts/insert (`/api/study-plans/[id]/concepts/insert`)

Inserts a prerequisite concept into a graph:
1. Uses `findOrCreateConcept` for dedup-safe concept creation
2. Creates `GraphMembership` at `targetTier - 1` depth
3. Creates `ConceptEdge` (prerequisite → target)
4. Fetches all memberships + edges for the graph
5. Calls `computeDAGLayout()` to relayout entire graph
6. Updates all `GraphMembership` positions in database
7. Fire-and-forget: generates 5 questions for the new concept

### Zustand Store Addition

Added `redirectedFromConceptId: string | null` to track the original concept when practice redirects to a prerequisite. Cleared to null after mastery redirect completes.

### Learn Tab Integration

After each attempt's `submitAttempt`:
1. Checks `redirectedFromConceptId` — if set and new proficiency >= 0.8, auto-redirects back to original concept
2. Fires non-blocking GET to `/gap-detections` for the attempted concept
3. If `hasPattern: true`, shows `GapProposalCard` above the question area

On **confirm**: calls `/concepts/insert`, sets `redirectedFromConceptId`, reloads graph data, reinitializes session targeting the new prerequisite after a 2s "Adding..." message.

On **decline**: dismisses the card, practice continues normally.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn/ui components not available**

- **Found during:** Task 1
- **Issue:** Plan specified `import { Button, Card, ... } from "@/components/ui/button"` but the `src/components/ui/` directory is empty
- **Fix:** Built GapProposalCard using the same CSS variable + Tailwind styling patterns used throughout the rest of the project (NodeDetailPanel, learn/page.tsx)
- **Files modified:** `src/components/GapProposalCard.tsx`
- **Commit:** 87fc37e

**2. [Rule 3 - Blocking] Next.js 16 async params pattern**

- **Found during:** Task 2
- **Issue:** Plan's route handler signatures used `{ params }: { params: { id: string } }` (Next.js 13/14 style) which fails in Next.js 16 where params is a Promise
- **Fix:** Updated both new endpoints to use `{ params }: { params: Promise<{ id: string }> }` and `await params`
- **Files modified:** Both new route.ts files
- **Commits:** 2160af4, b6ef246

**3. [Rule 3 - Blocking] computeDAGLayout signature mismatch**

- **Found during:** Task 3
- **Issue:** Plan's pseudocode called `computeDAGLayout({ nodes: [...], edges: [...] })` (single object) but actual implementation takes `(nodes: GraphNode[], edges: GraphEdge[])` as two separate args, and returns `Map<string, {x, y}>` not a plain object
- **Fix:** Adapted the insert endpoint to call `computeDAGLayout(nodeArray, edgeArray)` and convert the returned Map to a plain object for JSON serialization
- **Files modified:** `src/app/api/study-plans/[id]/concepts/insert/route.ts`
- **Commit:** b6ef246

**4. [Rule 2 - Missing Critical] findOrCreateConcept signature has different parameter order**

- **Found during:** Task 3
- **Issue:** Plan's pseudocode called `findOrCreateConcept(conceptName, "", userId)` but actual function signature is `findOrCreateConcept(userId, name, description, keyTerms, proficiency, confidence)`
- **Fix:** Called with correct signature: `findOrCreateConcept(userId, conceptName, "", [], 0.0, 0.0)`
- **Files modified:** `src/app/api/study-plans/[id]/concepts/insert/route.ts`
- **Commit:** b6ef246

## Next Phase Readiness

Phase 6 complete. The full gap detection loop is implemented:
1. Free response attempt evaluated by LLM with error classification
2. PREREQUISITE_GAP classification creates GapDetection record
3. After 2 occurrences for same prerequisite, proposal appears in Learn tab
4. User confirms → prerequisite inserted into graph → practice redirects there
5. After mastery (>= 0.8 proficiency) → practice redirects back to original concept

**Build status:** Zero TypeScript/runtime errors.
