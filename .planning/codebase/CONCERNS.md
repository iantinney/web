# Codebase Concerns (Active)

**Last Updated:** 2026-02-26

## Critical Ongoing Issues

### Scaling: Single JSON File Cannot Handle Concurrent Writes
**Status:** MITIGATED by single-user design
- **Files:** Prisma schema + SQLite adapter now in use; JSON backend replaced
- **Current:** Safe for single-user demo
- **Production:** Would need proper SQLite locking or Postgres

### Gap Detection & Insertion (New Milestone)
**Status:** NOT YET IMPLEMENTED
- **Task:** Build gap detection logging (GapDetection model)
- **Task:** Extend grading prompt to classify PREREQUISITE_GAP errors
- **Concern:** False positives in gap classification (mitigate with 2-occurrence threshold)
- **Concern:** Over-eager concept insertion (always require user confirmation in Phase 1)

### Frontier Expansion & Bridge Detection (New Milestone)
**Status:** NOT YET IMPLEMENTED
- **Task:** Implement mastery detection + frontier awareness
- **Task:** Expand direction generation prompt (3 options: extend/bridge/new_unit)
- **Task:** Cross-graph bridge detection and scoring
- **Concern:** LLM may suggest concepts already known (validate against existing graph)
- **Concern:** Graph relayout complexity when inserting mid-session (incremental layout recommended)

### Persistent Chat Context (New Milestone)
**Status:** NOT YET IMPLEMENTED
- **Task:** Build chatContext state in Zustand (mode, activeConceptId, recentAttempts, etc.)
- **Task:** Update context on tab switches and practice events
- **Concern:** State sync complexity across tabs (mitigate: read lazy, not reactive)

## Historical Issues (Resolved in Phase 5)

✅ **Proficiency Persistence** — Now persists via POST /api/concepts/[id]/proficiency-update
✅ **Graph Reactivity** — Nodes animate color on proficiency updates
✅ **Prerequisite Enforcement** — Lock logic implemented in prerequisiteChecker.ts
✅ **Multi-graph Support** — Multi-user isolation verified, unit graph + graph membership pattern
✅ **Spaced Repetition** — SM-2 algorithm implemented and integrated into question selection
✅ **Question Generation** — Pre-generate on-demand via POST /api/study-plans/[id]/generate-questions
✅ **Free Response Evaluation** — MiniMax grading with misconception detection

---

## Recommendations for Milestone v1.1

1. **Implement gap detection first** (2.1 from design doc) — foundation for downward growth
2. **Extend grading prompt** (6.1) — conservative classification, only PREREQUISITE_GAP when certain
3. **Build GapDetection model** (5.1) — log detections, require 2 occurrences for proposal
4. **Single-concept insertion flow** — start simple, cluster/new-unit insertion are Phase 2
5. **Mastery detection + auto-advance** (2.2) — proficiency >= 0.8, auto-promote to next DAG concept
6. **Frontier detection + expansion** (2.2) — 3-direction LLM prompt when mastered frontier reached
7. **Bridge detection async** (2.3) — runs after new graphs created, not blocking user
8. **Advisor UI in chat** — "What should I learn next?" button + ranked recommendations

---

*Active for Milestone v1.1: Living Graph with Adaptive Gap Detection, Frontier Expansion, and Cross-Domain Bridges*
