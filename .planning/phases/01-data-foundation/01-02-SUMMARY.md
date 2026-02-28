---
phase: "01"
plan: "01-02"
subsystem: "persistence"
tags: ["prisma", "api-routes", "chat", "crud", "transactions", "sqlite"]

dependencies:
  requires:
    - "01-01"
  provides:
    - "study-plan-crud-with-relations"
    - "chat-thread-crud"
    - "chat-message-crud"
    - "atomic-attempt-recording"
    - "persistent-message-history"
    - "persistent-graph-data"
  affects:
    - "02-graph-generation"
    - "03-practice-engine"
    - "04-chat-integration"

tech-stack:
  added: []
  patterns:
    - "prisma-include-for-relations"
    - "prisma-transaction-for-atomicity"
    - "direct-prisma-queries-in-routes"

key-files:
  created:
    - "adaptive-tutor/src/app/api/chat/threads/route.ts"
    - "adaptive-tutor/src/app/api/chat/threads/[threadId]/messages/route.ts"
  modified:
    - "adaptive-tutor/src/app/api/study-plans/[id]/route.ts"
    - "adaptive-tutor/src/app/api/attempts/route.ts"

decisions:
  - id: "direct-prisma-in-routes"
    description: "Use Prisma directly (not db.ts abstraction) where relational queries or transactions are needed"
    rationale: "db.ts generic CRUD cannot express Prisma include/relations or $transaction; direct Prisma is simpler and type-safe"
  - id: "transaction-for-attempts"
    description: "Wrap attempt recording + question mark-used + proficiency update in a Prisma $transaction"
    rationale: "If proficiency update fails, the attempt record would be orphaned; transaction ensures atomicity"
  - id: "thread-updatedAt-touch"
    description: "POST message touches thread's updatedAt inside the same transaction"
    rationale: "Thread list is ordered by updatedAt; bumping it on new message keeps active threads at the top"

metrics:
  duration: "4 minutes"
  completed: "2026-02-24"
---

# Phase 01 Plan 02: API Route Migration & Chat CRUD Endpoints Summary

**One-liner:** Study plan GET now includes concepts/edges via Prisma include, attempts use $transaction, and new thread/message CRUD endpoints complete CHAT-06 persistence

## What Was Built

### Study Plan GET with Relations (`adaptive-tutor/src/app/api/study-plans/[id]/route.ts`)

Updated `GET /api/study-plans/[id]` to use `prisma.studyPlan.findUnique` with `include: { concepts: true, edges: true }`:
- Returns the full study plan object with nested `concepts` (ConceptNode[]) and `edges` (ConceptEdge[])
- Required by GRAPH-04 and by the React Flow graph tab which needs both nodes and edges in one request
- PATCH and DELETE handlers unchanged (still use `db.ts` abstraction which is correct)

### Atomic Attempt Recording (`adaptive-tutor/src/app/api/attempts/route.ts`)

Replaced three sequential `db.ts` calls with a single `prisma.$transaction`:
1. `attemptRecord.create` — creates the attempt
2. `question.update` — marks question as `isUsed: true`
3. `conceptNode.update` — updates proficiency, confidence, attemptCount, lastPracticed

If any step fails, all three roll back. The proficiency calculation logic (`updateProficiency`) is unchanged.

### Chat Thread CRUD (`adaptive-tutor/src/app/api/chat/threads/route.ts`)

- `GET /api/chat/threads` — lists all threads for `USER_ID`, ordered by `updatedAt` desc, with `_count.messages` included
- `POST /api/chat/threads` — creates a thread with optional `title` (default "New Chat") and optional `studyPlanId`; validates study plan exists if provided
- Returns `{ threads }` and `{ thread }` respectively, status 201 on create

### Chat Message CRUD (`adaptive-tutor/src/app/api/chat/threads/[threadId]/messages/route.ts`)

- `GET /api/chat/threads/[threadId]/messages` — returns all messages in chronological order
- `POST /api/chat/threads/[threadId]/messages` — creates a message and bumps thread `updatedAt` in a single `$transaction`; returns `{ message, messages }` with full thread history
- Validates: thread exists, role is valid enum, content is non-empty
- `toolCallsJson` and `toolResultsJson` default to `"[]"` if not provided

## Persistence Verification

Both CHAT-06 and GRAPH-04 verified by restarting the dev server and confirming data survival:

| Requirement | Before Restart | After Restart |
|-------------|---------------|---------------|
| GRAPH-04: Graph nodes | 13 nodes | 13 nodes |
| GRAPH-04: Graph edges | 15 edges | 15 edges |
| CHAT-06: Chat thread | Present | Present |
| CHAT-06: Chat messages | 2 messages | 2 messages |

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Prisma include vs JOIN | `prisma.studyPlan.findUnique({ include })` | Cleanest way to get nested data; db.ts generic CRUD doesn't support include |
| Transaction scope | attempt + mark-used + proficiency | All three must succeed or fail together |
| Message list in POST response | Return full thread after insert | Client gets updated history in one round-trip |

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

**Clarification:** The plan stated "migrate all existing API routes from JSON file CRUD to Prisma queries". Review of existing routes confirmed they were already using Prisma via the `db.ts` abstraction from Plan 01-01. The actual work in Task 1 was:
1. Adding relational data (concepts/edges) to the study plan GET response
2. Adding transaction atomicity to the attempts endpoint

This matches the plan's intent: "every data operation goes through Prisma + SQLite."

## Verification Results

| Endpoint | Check | Result |
|----------|-------|--------|
| GET /api/study-plans | Returns plans from SQLite | PASS |
| POST /api/study-plans | Creates plan in SQLite | PASS |
| GET /api/study-plans/[id] | Returns plan with concepts and edges | PASS |
| PATCH /api/study-plans/[id] | Updates plan in SQLite | PASS |
| DELETE /api/study-plans/[id] | Cascade-deletes plan | PASS |
| POST /api/study-plans/[id]/generate-graph | Generates 13 nodes, 15 edges | PASS |
| GET /api/chat/threads | Lists threads with message counts | PASS |
| POST /api/chat/threads | Creates thread with studyPlanId | PASS |
| GET /api/chat/threads/[threadId]/messages | Returns ordered messages | PASS |
| POST /api/chat/threads/[threadId]/messages | Creates message, returns full history | PASS |
| POST /api/attempts | Atomic attempt + proficiency update | PASS |
| Data persists after server restart | GRAPH-04 + CHAT-06 | PASS |
| TypeScript: `npx tsc --noEmit` | Zero errors | PASS |

## Next Phase Readiness

Ready for **Phase 2 (Graph Generation)**. All persistence infrastructure is complete:
- Every model has working Prisma-backed CRUD
- Concepts and edges are stored and retrieved correctly
- Chat message history persists across restarts
- Attempt recording is atomic

**No blockers.** Phase 2 can start immediately.
