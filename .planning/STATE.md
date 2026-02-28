# Project State

**Project:** Adaptive Learning Tutor
**Last Updated:** 2026-02-27
**Status:** Milestone complete

## Current Position

**Milestone:** v1.3 Prerequisite Demo Complete

**Phase:** 11 of 11 (prerequisite-insertion-demo) — Complete
**Plan:** 2 of 2 complete (11-01, 11-02 done)
**Status:** Phase 11 complete — Prerequisite and extension insertion demo feature fully implemented and verified
**Last activity:** 2026-02-28 — Executed Phase 11 (both plans), verified goal achievement

**Progress:** [██████████] 100%

**v1.0 Delivered:**
- ✅ Phase 1-5: Data foundation, graph generation, practice engine, free response evaluation, proficiency persistence
- ✅ Chat state machine with file upload and study plan creation
- ✅ Interactive DAG visualization with proficiency colors
- ✅ Adaptive practice (Learn tab) with SM-2 scheduling
- ✅ Prerequisite enforcement with lock indicators
- ✅ Full end-to-end learning loop: practice → feedback → proficiency update → graph reactivity

**v1.1 Delivered:**
- ✅ Phase 6, Plan 01: GapDetection data model + enhanced grading with error classification
- ✅ Phase 6, Plan 02: Gap proposal UI + concept insertion into graph

**v1.2 Delivered:**
- ✅ Phase 7, Plan 01: ChatContext Zustand field, AdvisorCard/ChatMessage extensions, prompt utilities, tab mode tracking
- ✅ Phase 7, Plan 02: Explain-answer button in Learn tab + chatContext injection into chat system prompt
- ✅ Phase 7, Plan 03: Advisor "What next?" button in Chat tab + /api/advisor route + AdvisorCards component

**Phase 8 Delivered:**
- ✅ Phase 8, Plan 01: Session PATCH guard (sessionCompletedRef), real LLM free-response feedback, per-concept session summary
- ✅ Phase 8, Plan 03: NodeDetailPanel Practice CTA syncs chatContext.activeConceptId before navigating to /learn

**Phase 9 Delivered:**
- ✅ Phase 9, Plan 01: d3-force layout engine with forceRadial tier-based positioning, layout API endpoint
- ✅ Phase 9, Plan 02: ParticleEdge custom edge with organic bezier splines, SVG animateMotion, 4-directional handles
- ✅ Phase 9, Plan 03: AddConceptFAB with LLM edge inference, add-custom API endpoint, DAG validation

**Phase 10 Delivered:**
- ✅ Phase 10, Plan 01: Edge zIndex visibility fix, ParticleEdge neon green styling, pulse animation

**Phase 11 Delivered:**
- ✅ Phase 11, Plan 01: demo-seeds.ts (12 patterns), analyze-gap API route, suggest-extension API route, concepts/insert extension support
- ✅ Phase 11, Plan 02: ExtensionProposalCard component, keyboard shortcuts (Ctrl+G, Ctrl+E), trigger buttons, shared insertion handler

---

## Project Reference

**Core Value:** Real-time personalized learning paths with continuous knowledge diagnosis, targeted practice, and adaptive difficulty

**Active Docs:**
- `.planning/PROJECT.md` — Project vision, validated + active requirements
- `.planning/REQUIREMENTS.md` — v1 requirements (26 total, 18 complete), v2 deferred
- `.planning/ROADMAP.md` — Phase structure and phase details
- `.planning/codebase/STACK.md` — Tech stack overview
- `.planning/codebase/CONCERNS.md` — Active architectural decisions and new-milestone concerns
- `adaptive-tutor/adaptive-graph-design.md` — v1.1 design: living graph with gap detection, frontier expansion, bridges

---

## Architecture Highlights

**Multi-graph System (Active):**
- Multiple UnitGraphs per user (each is a self-contained learning domain)
- GraphMembership links Concepts to UnitGraphs with tier + position
- Shared concepts pool: concepts reused across graphs with dedup logic
- Pill bar + sidebar for graph navigation

**Concept State:**
- Proficiency (0.0-1.0) + confidence scores
- SM-2 spaced repetition (interval, easeFactor, nextDue)
- Locked if ANY prerequisite proficiency < 0.8
- Lock indicators + gray-out styling on locked concepts

**Practice Loop:**
- GET /questions filters by due date, proficiency, difficulty, locked status
- Prerequisite priority boost (2x overdueness factor)
- Difficulty match: proficiency < 0.4 prefers MCQ/flashcard
- POST /attempt: atomic SM-2 + proficiency update via Prisma transaction
- Attempt records tracked: question, answer, correctness, feedback, misconceptions

**Proficiency Persistence:**
- Fire-and-forget POST to /api/concepts/[id]/proficiency-update after each attempt
- Zustand store syncs from database
- Graph nodes animate color change on proficiency update (0.4s smooth transition)

---

## v1.1 Roadmap Preview

**Design:** See `adaptive-tutor/adaptive-graph-design.md`

**Three Reactive Behaviors:**
1. **Downward Growth:** Struggle detection → gap proposal → prerequisite insertion
2. **Upward Growth:** Mastery detection → frontier expansion → 3 directions (extend/bridge/new_unit)
3. **Lateral Growth:** Cross-graph bridge detection → bridge proposals

**Architecture:**
- GapDetection model: log prerequisite gaps, require 2-occurrence threshold before proposing
- Extended grading prompt: error classification (CORRECT/MINOR/MISCONCEPTION/PREREQUISITE_GAP)
- Frontier detection: mastered concept with no unmastered dependents
- Expansion directions: LLM generates 3 options (extend current graph, bridge to existing graphs, new unit)
- Bridge scoring: heuristic favors connecting 2+ existing domains
- Chat context: tracks user activity (practicing/exploring/idle) for context-aware responses
- Advisor button: "What should I learn next?" → ranked recommendations (review/continue/remediate/extend/bridge/new_domain)

**Build Effort:**
- Minimum demo (gap detection + single insertion + mastery + frontier): ~13 hours
- Full feature set (advisor + bridge proposals + cluster insertion + animations): ~28 hours
- Recommended cut for hackathon: Items 1-8 (~19 hours)

---

## Tech Stack (Locked)

**Runtime:** Next.js 16 (App Router) + React 19 + TypeScript
**Database:** SQLite + Prisma ORM 7.4.1 (via @prisma/adapter-libsql)
**State:** Zustand with Persist
**Visualization:** React Flow + @dagrejs/dagre + framer-motion
**LLM:** MiniMax API (Text-01 for structured output, M2.5 for streaming chat)
**UI:** Tailwind CSS v4 + shadcn/ui
**Algorithms:** SM-2 spaced repetition, Kahn's cycle detection, heuristic concept selection
**Testing:** Vitest

---

## Key Decisions (Locked)

| Decision | Status | Notes |
|----------|--------|-------|
| Single-user local demo for hackathon | ✓ Locked | No auth, multi-user isolation via x-user-id header for structure |
| SQLite + Prisma (not Supabase) | ✓ Locked | File-based, portable, zero deployment overhead |
| React Flow + dagre (not D3) | ✓ Locked | Nodes as React components, JSX/Tailwind control, proper DAG layout |
| Pre-generate questions, never on-demand | ✓ Locked | Questions stream from cache, no LLM latency in practice path |
| SM-2 spaced repetition (not custom algorithm) | ✓ Locked | Standard, well-researched, integrated into question selection |
| Proficiency threshold 0.8 for mastery | ✓ Locked | Reasonable default, tunable post-MVP |
| Multi-graph + concept sharing via dedup | ✓ Locked | Enables cross-domain learning paths and bridge proposals |
| Gap insertion requires 2-occurrence threshold | ✓ Decided (v1.1) | Conservative: avoid false positives, filter out random misclassifications |
| User always confirms insertions in Phase 1 | ✓ Decided (v1.1) | Makes system reasoning visible in demo, automated confirmation deferred to Phase 2 |
| Incremental layout for mid-session insertion | ✓ Decided (v1.1) | Preserve existing positions, insert new nodes in available space, avoid disorienting full relayout |
| Free response proficiency uses real LLM score from Phase 6 | ✓ Decided (06-01) | Phase 3 neutral stub replaced; proficiency reflects actual answer quality |
| Conservative PREREQUISITE_GAP classification in prompt | ✓ Decided (06-01) | Explicitly instructs LLM: most errors are MINOR or MISCONCEPTION, not gap — avoids false positives |
| LLM grading failure falls back to neutral 0.5 score | ✓ Decided (06-01) | Attempt never fails due to LLM unavailability; logs error for debugging |
| GapProposalCard uses CSS vars not shadcn/ui | ✓ Decided (06-02) | shadcn/ui ui/ dir is empty in this project; used project's existing Tailwind/CSS variable patterns |
| computeDAGLayout called with full relayout on insertion | ✓ Decided (06-02) | Simpler than incremental: fetch all memberships + edges, compute fresh layout, update all positions |
| Gap detection check is fire-and-forget in submitAttempt | ✓ Decided (06-02) | Never blocks feedback display; pattern check latency is invisible to user |
| updateChatContextMode only updates mode field | ✓ Decided (07-01) | Preserves activeConceptId/activeUnitGraphId/recentAttempts across tab switches — context survives navigation |
| recordAttemptInContext keeps last 5 attempts | ✓ Decided (07-01) | Prepend+slice(5) for rolling window — lightweight, bounded context |
| advisorPrompt outputs JSON-only | ✓ Decided (07-01) | No markdown fences instruction prevents LLM from wrapping response, enabling direct JSON.parse() |
| GapDetection query uses userId directly | ✓ Decided (07-03) | Schema has no studyPlan relation on GapDetection — queried by userId + status directly |
| messageType discriminator for rich chat messages | ✓ Decided (07-03) | advisor_cards messageType enables React component embedding inside chat message list |
| /api/explain returns 200 with fallback on LLM failure | ✓ Decided (07-02) | UI shows fallback message, never error state — explanation is non-critical for learning flow |
| Explain This button positioned between proficiency delta and Next button | ✓ Decided (07-02) | Clean UX hierarchy: feedback badge → explanation → proficiency delta → explain button → next |
| chatSystemPrompt uses basePrompt variable to enable snippet append | ✓ Decided (07-02) | Required refactor to support conditional snippet append without dead code after return statement |
| Spread chatContext before setting activeConceptId in handlePractice | ✓ Decided (08-03) | setChatContext takes full ChatContext not Partial — spread preserves mode and other context fields |
| chatPhase recovery guard resets to "proposing" not "idle" | ✓ Decided (08-02) | Preserves existing proposedLessonPlan when recovering from stuck structuring state after tab-switch interruption |
| Active-session banner is passive and non-dismissable | ✓ Decided (08-02) | Indicator only — no click handler or dismiss button; uses CSS var fallbacks for color-scheme compatibility |
| Session PATCH fires only in handleAdvance on explicit completion | ✓ Decided (08-01) | cleanup useEffect removed PATCH entirely — tab switch unmount never ends session; sessionCompletedRef tracks intent |
| sessionAttempts is local useState not Zustand | ✓ Decided (08-01) | Per-session accumulation doesn't need to survive tab switches; session summary only reachable after completing all questions in one tab |
| Free response feedback uses lastResult.feedback or lastResult.explanation fallback chain | ✓ Decided (08-01) | Handles LLM feedback (free_response), structured explanation (MCQ/fill-blank), and neutral fallback |
| forceRadial strength 0.6, link strength 0.4 for tier ordering | ✓ Decided (09-01) | Plan's 0.3/0.7 caused tier ordering to break — radial must dominate link forces for consistent ring separation |
| dagre removed from dependencies | ✓ Decided (09-01) | No code imports dagre; computeDAGLayout kept in graphValidator.ts as reference only |
| Custom concept questions deferred to practice time | ✓ Decided (09-03) | On-demand generation saves LLM calls for concepts user may never practice |
| LLM edge inference graceful degradation | ✓ Decided (09-03) | Concept created with no edges if LLM fails; edgeInferenceError flag in response |
| Cycle-creating edges silently removed | ✓ Decided (09-03) | DAG validation after edge insertion; cycle edges removed, request never fails |

---

## Session Continuity

**Last Session:** 2026-02-28T14:22:00.000Z
**Work Completed:** Phase 11 execution complete — Both plans (11-01, 11-02) executed, all 8 must-haves verified, feature demo-ready
**Stopped at:** Phase 11 verification passed, ready for next steps
**Files:** .planning/phases/11-prerequisite-insertion-demo/{11-01-SUMMARY.md, 11-02-SUMMARY.md, 11-VERIFICATION.md}

## Accumulated Context

### Roadmap Evolution
- Phase 7 added: integrated chat window
- Phase 8 added: session lifecycle tab persistence and integration polish
- Phase 9 added: Web-style force-directed graph layout via backend positioning
- Phase 10 added: Fix graph edge visibility and pulse animation

### Phase 7 Context
- ChatContext Zustand field drives context-aware responses across all chat features
- layout.tsx is single authority for pathname -> mode translation (practicing/exploring/planning/idle)
- buildChatContextSnippet, explainAnswerPrompt, advisorPrompt ready for Plans 02 and 03
- All exports verified: ChatContext, AdvisorCard from store.ts; three functions from prompts/index.ts

---

**Project complete.** All 6 phases delivered. Full gap detection loop operational:
free response → LLM error classification → GapDetection record → 2-occurrence threshold → GapProposalCard in Learn tab → concept insertion + DAG relayout → practice redirect to prerequisite → mastery → redirect back.

---

## Artifacts

**Consolidated Documentation:**
- PROJECT.md (124 lines) — vision + decisions
- REQUIREMENTS.md (105 lines) — v1 + v2 + out-of-scope
- ROADMAP.md (236 lines) — phase structure
- STATE.md (this file) — session continuity
- codebase/STACK.md (118 lines) — tech choices
- codebase/CONCERNS.md (80 lines) — active decisions + new-milestone concerns
- adaptive-graph-design.md (729 lines) — v1.1 vision + architecture + build order

**Build Files:** ~1,600 lines active documentation (vs ~5,000 before cleanup)

---

*State file updated: 2026-02-26 (after Phase 5 completion, documentation consolidated, v1.1 planning initiated)*
