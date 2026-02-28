---
phase: "01"
plan: "01-01"
subsystem: "persistence"
tags: ["prisma", "sqlite", "libsql", "database", "singleton", "seed"]

dependencies:
  requires: []
  provides:
    - "prisma-client-singleton"
    - "prisma-backed-db-abstraction"
    - "sqlite-database"
    - "seed-script"
  affects:
    - "01-02"
    - "02-graph-generation"
    - "03-practice-engine"
    - "04-chat-integration"

tech-stack:
  added:
    - "@prisma/adapter-libsql@7.4.1"
    - "@libsql/client@0.17.0"
  patterns:
    - "prisma-global-singleton-hot-reload-safe"
    - "generic-crud-abstraction-over-prisma"
    - "idempotent-seed-with-upsert"

key-files:
  created:
    - "adaptive-tutor/src/lib/prisma.ts"
    - "adaptive-tutor/prisma.config.ts"
  modified:
    - "adaptive-tutor/src/lib/db.ts"
    - "adaptive-tutor/prisma/seed.ts"
    - "adaptive-tutor/prisma/schema.prisma"
    - "adaptive-tutor/package.json"
    - "adaptive-tutor/src/app/api/attempts/route.ts"
    - "adaptive-tutor/src/app/api/chat/route.ts"
    - "adaptive-tutor/src/app/api/health/route.ts"
    - "adaptive-tutor/src/app/api/study-plans/[id]/generate-graph/route.ts"
    - "adaptive-tutor/src/app/api/study-plans/[id]/route.ts"
    - "adaptive-tutor/src/app/api/study-plans/route.ts"

decisions:
  - id: "prisma7-libsql-adapter"
    description: "Use @prisma/adapter-libsql instead of Prisma built-in SQLite (Prisma 7 removed native SQLite support)"
    rationale: "Prisma 7.4.1 requires driver adapters for all databases; libsql is the standard adapter for SQLite"
  - id: "prisma-config-ts"
    description: "Create prisma.config.ts at project root for datasource URL (Prisma 7 no longer accepts url in schema.prisma)"
    rationale: "Prisma 7 changed config approach; url must be in prisma.config.ts datasource.url"
  - id: "async-db-abstraction"
    description: "db.ts functions are now async (return Promises) — all API routes updated to await them"
    rationale: "Prisma operations are inherently async; JSON file I/O was sync but that approach doesn't scale"

metrics:
  duration: "13 minutes"
  completed: "2026-02-24"
---

# Phase 01 Plan 01: Prisma & Database Foundation Summary

**One-liner:** Prisma 7 + SQLite via libsql adapter replaces JSON file I/O with singleton pattern and idempotent seed

## What Was Built

### Prisma Client Singleton (`adaptive-tutor/src/lib/prisma.ts`)

Created a hot-reload-safe PrismaClient singleton using the `globalThis` pattern:
- Uses `@prisma/adapter-libsql` with `PrismaLibSql({ url: "file:..." })` for SQLite
- DB path resolves to `prisma/dev.db` relative to `process.cwd()`
- In development: cached on `globalThis._prismaGlobal` to prevent hot-reload duplicates
- In production: always creates a fresh client

### Prisma Configuration (`adaptive-tutor/prisma.config.ts`)

Created project-root config file required by Prisma 7:
- `datasource.url` points to `prisma/dev.db` absolute path
- `schema` path set to `prisma/schema.prisma`
- Enables `npx prisma db push` and `npx prisma generate`

### Schema Update (`adaptive-tutor/prisma/schema.prisma`)

- Removed `url = "file:./dev.db"` from datasource block (Prisma 7 requirement)
- All 9 models confirmed present: User, StudyPlan, ConceptNode, ConceptEdge, Question, AttemptRecord, SessionRecord, ChatThread, ChatMessage

### Database Abstraction (`adaptive-tutor/src/lib/db.ts`)

Rewrote from JSON file I/O to Prisma-backed implementation:
- Removed all `fs` imports, `readTable`/`writeTable` functions
- Replaced with Prisma model delegation via table-name-to-model map
- All functions now async: `findMany`, `findUnique`, `findFirst`, `create`, `update`, `remove`, `removeMany`
- `create` signature excludes `id`, `createdAt`, and `updatedAt` (Prisma manages these)
- Date field conversion: ISO strings automatically converted to `Date` objects for DateTime fields
- Null/undefined stripping before Prisma operations

### Seed Script (`adaptive-tutor/prisma/seed.ts`)

Rewrote from JSON file writes to PrismaClient operations:
- Upserts demo user (id: "demo-user") — idempotent
- Creates demo study plan only if no plans exist for demo user — idempotent
- Verified: runs twice without failure
- Added `prisma` section to `package.json` for `prisma db seed` compatibility

### API Route Updates

All 6 API route files updated to `await` the now-async `db.ts` functions:
- `POST /api/attempts` — await findUnique, create, update
- `GET /api/study-plans`, `POST /api/study-plans` — await findMany, create
- `GET/PATCH/DELETE /api/study-plans/[id]` — await findUnique, update, remove, removeMany
- `POST /api/study-plans/[id]/generate-graph` — await findUnique, create, removeMany
- `POST /api/chat` — await findMany (x3)
- `GET /api/health` — direct prisma.user queries

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SQLite adapter | `@prisma/adapter-libsql` | Prisma 7 removed native SQLite; libsql is the standard adapter |
| Config approach | `prisma.config.ts` at project root | Prisma 7 requires datasource URL in config file, not schema |
| db.ts API | Keep same function signatures, make async | API routes can `await` without changing their structure |
| Seed idempotency | upsert for user, findMany check for plans | Safe to run multiple times in CI or development |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma 7 incompatible config format**

- **Found during:** Task 1 (npx prisma db push)
- **Issue:** Prisma 7.4.1 no longer accepts `url` property in `schema.prisma` datasource block. Error: "The datasource property `url` is no longer supported in schema files"
- **Fix:** Created `prisma.config.ts` with `defineConfig({ datasource: { url: "file:..." } })`. Removed `url` from `schema.prisma` datasource block.
- **Files modified:** `prisma/schema.prisma`, new `prisma.config.ts`
- **Commit:** 987c047

**2. [Rule 3 - Blocking] Prisma 7 requires driver adapter for SQLite**

- **Found during:** Task 1 (testing Prisma singleton)
- **Issue:** Prisma 7 removed built-in SQLite support; requires explicit driver adapter. `PrismaLibSql` constructor takes `Config` object `{ url }`, not a pre-created `Client` instance.
- **Fix:** Installed `@prisma/adapter-libsql` and `@libsql/client`. Used `new PrismaLibSql({ url })` directly in singleton.
- **Files modified:** `package.json`, `src/lib/prisma.ts`
- **Commit:** 987c047

**3. [Rule 1 - Bug] TypeScript error: `updatedAt` required in StudyPlan create call**

- **Found during:** TypeScript check after db.ts rewrite
- **Issue:** `StudyPlan` interface has `updatedAt: string` as required, but Prisma auto-manages `@updatedAt` fields
- **Fix:** Updated `create<T>` signature to also exclude `updatedAt` from required data: `Omit<T, "id" | "createdAt" | "updatedAt">`
- **Files modified:** `src/lib/db.ts`
- **Commit:** 987c047

## Verification Results

| Check | Result |
|-------|--------|
| `npx prisma db push` creates dev.db | PASS |
| `npx prisma generate` creates client | PASS |
| Prisma singleton executes `user.count()` | PASS (returns 1) |
| `npm run seed` first run | PASS (created user + plan) |
| `npm run seed` second run (idempotency) | PASS (no errors, skipped existing) |
| `npx tsc --noEmit` | PASS (0 errors) |
| SQLite: 1 user, 1 study plan after seed | PASS |

## Next Phase Readiness

Ready for **01-02**: Migrate remaining API routes, add ChatThread/ChatMessage CRUD endpoints.

All 9 Prisma models are available. The `prisma` singleton is importable from `@/lib/prisma`. The `db.ts` abstraction maintains backward-compatible API. Schema is locked.

**No blockers.** Phase 2 can start immediately.
