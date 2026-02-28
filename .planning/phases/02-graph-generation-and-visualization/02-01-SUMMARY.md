---
phase: 02-graph-generation-and-visualization
plan: "02-01"
subsystem: api
tags: [minimax, llm, zod, prisma, dag, graph, sqlite, typescript]

# Dependency graph
requires:
  - phase: 01-data-foundation
    provides: Prisma client singleton, ConceptNode/ConceptEdge models, db.ts CRUD helpers, SQLite dev.db

provides:
  - Live MiniMax generateText call replacing generateDemoGraph stub in POST /api/study-plans/[id]/generate-graph
  - Retry logic: JSON parse failure triggers second call at temperature 0.1
  - edgeType field on ConceptEdge Prisma model and Zod schema (prerequisite | helpful)
  - Source text length validation (400 if < 50 chars)
  - removedEdges array in API response
  - Improved breakCycles with tier-based heuristic and console.log per removed edge
  - Updated graph generation prompt with edgeType rules and markdown fence warning

affects:
  - 02-02 (React Flow visualization — reads edges, may render edgeType differently)
  - 03-question-generation (graph data shapes nodes/edges it consumes)
  - 05-polish (error handling patterns established here)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "generateText from Vercel AI SDK called with { model: minimax(MINIMAX_MODEL_STRONG), prompt, temperature }"
    - "parseLLMJson strips markdown fences + trailing commas before JSON.parse"
    - "Retry pattern: catch JSON parse error, retry same call with lower temperature (0.1)"
    - "edgeTypeMap keyed on 'fromId::toId' tracks edgeType through ID remapping"
    - "removedEdges computed by diffing tempEdges vs validEdges post-breakCycles"

key-files:
  created: []
  modified:
    - adaptive-tutor/src/lib/minimax.ts
    - adaptive-tutor/prisma/schema.prisma
    - adaptive-tutor/src/lib/schemas.ts
    - adaptive-tutor/src/lib/types.ts
    - adaptive-tutor/src/lib/prompts/index.ts
    - adaptive-tutor/src/lib/algorithms/graphValidator.ts
    - adaptive-tutor/src/app/api/study-plans/[id]/generate-graph/route.ts

key-decisions:
  - "Keep MINIMAX_MODEL_STRONG=MiniMax-Text-01 as primary; M2.5 noted as fallback in comments"
  - "Retry on JSON parse failure only (not on API errors); return 502 for API errors"
  - "edgeType stored as String in Prisma (not enum) for SQLite compat, validated at Zod layer"
  - "removedEdges returned as name-pairs (not IDs) for human-readable API response"

patterns-established:
  - "MiniMax integration: import { minimax, generateText, MINIMAX_MODEL_STRONG } from @/lib/minimax"
  - "All LLM output parsed through parseLLMJson then validated with Zod safeParse"
  - "Source text length gate: < 50 chars returns 400 before any LLM call"

# Metrics
duration: 4min
completed: 2026-02-24
---

# Phase 02 Plan 01: MiniMax Integration & Graph Generation Pipeline Summary

**Live MiniMax generateText call with temperature-0.1 retry, edgeType-aware Zod schemas, tier-heuristic cycle breaking, and removedEdges tracking replaces the generateDemoGraph stub**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-02-24T18:23:30Z
- **Completed:** 2026-02-24T18:27:03Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Replaced `generateDemoGraph` stub entirely with a live `generateText` call to `minimax(MINIMAX_MODEL_STRONG)` at temperature 0.3
- Added single retry at temperature 0.1 when the first response fails JSON parsing
- Added `edgeType String @default("prerequisite")` to `ConceptEdge` Prisma model (`prisma db push` succeeded)
- Extended `LLMConceptEdgeSchema` with `edgeType: z.enum(["prerequisite","helpful"]).optional().default("prerequisite")` and bumped `LLMConceptGraphSchema` concepts to `.min(3)`
- Updated `generateConceptGraphPrompt` with edgeType edge schema, explicit markdown-fence prohibition, and updated few-shot examples showing edgeType on every edge
- Improved `breakCycles` to prefer removing edges where `from-tier > to-tier` (reversed difficulty = likely erroneous), falling back to first cyclic edge; logs each removal
- API response now includes `removedEdges` as human-readable name-pairs and validates source text length >= 50 chars

## Task Commits

1. **Task 1: Update MiniMax model names, Prisma schema, and Zod schemas** - `77b03c8` (feat)
2. **Task 2: Wire MiniMax graph generation, improve cycle breaking, update prompt** - `62fc444` (feat)

## Files Created/Modified

- `adaptive-tutor/src/lib/minimax.ts` - Added M2.5 fallback comment to model constants
- `adaptive-tutor/prisma/schema.prisma` - Added `edgeType String @default("prerequisite")` to ConceptEdge
- `adaptive-tutor/src/lib/schemas.ts` - `LLMConceptEdgeSchema` gets edgeType enum; concepts min bumped to 3
- `adaptive-tutor/src/lib/types.ts` - Added `edgeType` to ConceptEdge and LLMConceptEdge interfaces
- `adaptive-tutor/src/lib/prompts/index.ts` - Updated `generateConceptGraphPrompt` with edgeType, markdown warning, updated few-shot edges
- `adaptive-tutor/src/lib/algorithms/graphValidator.ts` - `breakCycles` improved with tier heuristic + console.log per removed edge
- `adaptive-tutor/src/app/api/study-plans/[id]/generate-graph/route.ts` - Full rewrite: live MiniMax call, retry logic, edgeType persistence, removedEdges, source text validation

## Decisions Made

- **MiniMax-Text-01 kept as primary:** Backward compatibility is confirmed; M2.5 series noted as fallback via code comment. No breaking change needed.
- **Retry on JSON parse failure only:** API connectivity errors return 502 immediately. Only malformed JSON triggers the temperature-0.1 retry (single attempt).
- **edgeType as Prisma String, not enum:** SQLite via libsql doesn't support Prisma native enums. Validation is enforced at the Zod layer.
- **removedEdges as name-pairs:** The API consumer (React Flow UI) benefits from human-readable concept names, not internal UUIDs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Updated LLMConceptEdge and ConceptEdge TypeScript interfaces**

- **Found during:** Task 1 (schema updates)
- **Issue:** Plan specified Zod schema and Prisma schema changes but didn't mention updating the TypeScript interface types in `types.ts`. Without updating `ConceptEdge` and `LLMConceptEdge`, TypeScript would error when `edgeType` was passed to `create<ConceptEdge>()` or used downstream.
- **Fix:** Added `edgeType: string` to `ConceptEdge` interface and `edgeType?: "prerequisite" | "helpful"` to `LLMConceptEdge` interface in `types.ts`.
- **Files modified:** `adaptive-tutor/src/lib/types.ts`
- **Verification:** `tsc --noEmit` passes with zero errors
- **Committed in:** `77b03c8` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (missing critical — type interface sync)
**Impact on plan:** Required for TypeScript correctness. No scope creep.

## Issues Encountered

None - TypeScript compiled cleanly after all changes. `prisma db push` succeeded on first run.

## User Setup Required

**MINIMAX_API_KEY must be set in `.env.local`** for graph generation to work:

```
MINIMAX_API_KEY=your_minimax_api_key_here
```

Without this, the MiniMax API call will fail with an authentication error and the route will return 502.

## Next Phase Readiness

- Graph generation pipeline is fully wired to MiniMax
- `POST /api/study-plans/[id]/generate-graph` will call live LLM when `MINIMAX_API_KEY` is set
- `edgeType` persisted to DB and returned in API response — React Flow renderer can use it for visual differentiation
- `removedEdges` in response allows UI to optionally inform user of cycle-breaking decisions
- Ready for Phase 02-02 (React Flow visualization wiring)

---
*Phase: 02-graph-generation-and-visualization*
*Completed: 2026-02-24*
