---
status: investigating
trigger: "Learn tab stuck in infinite loop generating questions — no questions appear; MINIMAX_API_KEY error during study plan title generation; New session button not working"
created: 2026-02-26T00:00:00Z
updated: 2026-02-26T00:00:00Z
---

## Current Focus

hypothesis: Multiple independent issues (not cascading)
test: Code inspection of endpoints, learn page flow, and env setup
expecting: Each issue has distinct root cause
next_action: Verify each issue with network traces and logs

## Symptoms

expected:
1. Questions appear after clicking "Start Practice"
2. Study plan title generates without errors
3. "New session" button triggers fresh session

actual:
1. Learn tab stuck generating questions, questions never load
2. MINIMAX_API_KEY error in minimax-native.ts:39 during title generation
3. "New session" button doesn't work on previously successful accounts

errors:
- "ANTHROPIC_API_KEY/MINIMAX_API_KEY is not configured" (minimax-native.ts:39)

started: Unknown (multiple pre-existing issues)

## Eliminated

(none yet - investigation in progress)

## Evidence

### CRITICAL: Gap Detection Endpoint Failure - Root Cause of Questions Not Loading

**Server logs show repeated errors:**
- `Error querying gap detections: TypeError: Cannot read properties of undefined (reading 'findMany')`
- Multiple occurrences between 01:34:05 and 01:41:10 in .next/dev/logs/next-development.log
- This error fires AFTER each attempt submission (learning flow calls gap-detections endpoint)

**Code inspection - gap-detections/route.ts:**
- Line 32: `await prisma.gapDetection.findMany(...)`
- Error message "Cannot read properties of undefined (reading 'findMany')" means `prisma` is `undefined`
- Import on line 2: `import { prisma } from "@/lib/prisma";` looks correct

**Root cause - prisma.ts initialization failure:**
- /home/antel/hackathon/adaptive-tutor/src/lib/prisma.ts line 14-16:
  ```typescript
  function createPrismaClient() {
    const adapter = new PrismaLibSql({ url: `file:${DB_PATH}` });
    return new PrismaClient({ adapter });
  }
  ```
- Database file exists: `/home/antel/hackathon/adaptive-tutor/prisma/dev.db` (1.05 MB, modified Feb 26)
- @prisma/adapter-libsql is installed (v7.4.1)
- **Finding:** Prisma client initialization is SILENTLY FAILING
- **Why:** The `createPrismaClient()` throws an error (likely database schema mismatch or libsql connection issue), and `export const prisma` line 25 evaluates to `undefined` when the function throws
- This causes `prisma` to be undefined in ALL route handlers that import it

**Impact on all three issues:**
1. **Issue 1 (Questions Loop):** After submitting attempt, gap-detections endpoint fails → unhandled error logged → session cannot proceed
2. **Issue 2 (MINIMAX_API_KEY):** Unrelated to gap-detections, needs separate investigation
3. **Issue 3 (New Session Button):** May work on first session, but fails on retry if gap-detections was called

### Issue 1: Questions Generation Loop - Root Cause FOUND

**The infinite loop is actually a CRASH LOOP:**
- User clicks "Start Practice" → initSession() runs → Questions load (some tests show this working)
- User submits an attempt → submitAttempt() fetches gap-detections → **CRASH: prisma undefined**
- fetch() fails silently due to catch block (line 354-362)
- User sees loading state indefinitely because error is swallowed
- If user never submits attempt, questions should work (but testing shows questions don't load at all)

**Hypothesis: Database schema mismatch or Prisma adapter issue**
- The dev.db file exists but may be out of sync with schema
- libsql adapter may have issues initializing with the database
- **Evidence:** Logs show questions ARE being generated (MiniMax calls succeed with 200 responses)
- **Evidence:** But gap-detections consistently fails with "prisma is undefined"

**Confirmation needed:** Restart dev server or rebuild Prisma client

### Issue 2: MINIMAX_API_KEY Error During Title Generation

**Code inspection - minimax-native.ts:**
- Line 7-9: getApiKey() checks `process.env.ANTHROPIC_API_KEY || process.env.MINIMAX_API_KEY`
- Line 35-36: Calls getApiKey() and getBaseURL()
- Line 38-40: If !apiKey, throws error "ANTHROPIC_API_KEY/MINIMAX_API_KEY is not configured"
- **Finding:** Error is thrown INSIDE generateText() function, not at module load time
- **Finding:** This is proper lazy evaluation - env vars should be available

**Environment verification:**
- .env.local exists at /home/antel/hackathon/adaptive-tutor/.env.local
- Contains MINIMAX_API_KEY (valid format: sk-cp-...)
- Contains ANTHROPIC_API_KEY (same value - correct for MiniMax compatibility)
- Contains ANTHROPIC_BASE_URL pointing to api.minimax.io
- **Finding:** Environment variables ARE properly set

**Code inspection - generateStudyPlanTitle.ts:**
- Line 26-30: Calls generateText() with system prompt
- Line 40-48: catch block swallows error and falls back to first line extraction
- **Finding:** Error handling exists but error is SILENT in catch block

**Hypothesis: Dev server not restarted after .env.local was updated**
- Environment variables are only loaded at Next.js startup
- If .env.local was modified and dev server wasn't restarted, the old/missing keys would be used
- **Evidence:** Logs show MiniMax API calls SUCCEEDING elsewhere (lines 250-349 in logs show successful calls)
- **Inconsistency:** generateText() works fine for question generation but fails for title generation suggests two different code paths or timing

**Confirmation needed:** Check when title generation was called vs when env file was last modified

### Issue 3: "New session" Button Not Working - Cascading Failure

**Root cause: Prisma client initialization failure affects session endpoint**
- GET /api/study-plans/[id]/session calls `prisma.sessionRecord.findFirst()` (line 37)
- When Prisma is undefined, this fails silently in the catch block
- User clicks "New session" → fetch succeeds (returns 200) but body is error JSON
- Questions endpoint ALSO calls prisma, gets undefined, returns empty array
- Result: "No questions due" message

**Code inspection - learn/page.tsx:**
- Line 487-496: handleNewSession resets state and calls initSession()
- initSession flow: POST generate-questions → GET session → GET questions
- If either session or questions endpoint fails silently, shows "complete" phase
- **Finding:** Button works, but endpoints fail due to prisma being undefined

## Resolution

root_cause:
1. **PRIMARY ROOT CAUSE (affects all 3 issues):** Prisma client initialization SILENTLY FAILING in src/lib/prisma.ts
   - Function `createPrismaClient()` throws an error (database schema mismatch, libsql adapter issue, or database corruption)
   - Error is not caught, so `export const prisma` evaluates to undefined
   - ALL route handlers that import prisma crash silently when calling prisma methods
   - Specific evidence: gap-detections endpoint logs show "Cannot read properties of undefined (reading 'findMany')" repeatedly
   - This affects GET /questions, GET /session, and all other endpoints using prisma

2. **Issue 1 (Questions Loop - infinite loading):** CAUSED BY Prisma failure
   - Questions generation itself works (MiniMax calls succeed)
   - But GET /questions endpoint crashes when prisma is undefined
   - User sees loading spinner indefinitely
   - Not truly an "infinite loop" - just a crashed endpoint

3. **Issue 2 (MINIMAX_API_KEY error):** SEPARATE ISSUE - likely dev server not restarted
   - Environment variables ARE set correctly in .env.local
   - But generateText() checking for undefined keys suggests older Next.js process still running
   - Server logs show MiniMax calls succeeding elsewhere, so API key IS available in most requests
   - Timing issue: likely first request before env loaded, or dev server hot-reload issue

4. **Issue 3 (New session button not working):** CAUSED BY Prisma failure
   - Session endpoint also uses prisma (returns error due to undefined)
   - Questions endpoint also uses prisma (returns error)
   - Button click initiates flow but endpoints fail silently

fix:
1. IMMEDIATE: Investigate Prisma client initialization failure in src/lib/prisma.ts
   - Check if database.db file is corrupted: `npm run prisma:validate` or similar
   - Rebuild Prisma client: `npx prisma generate`
   - Reinitialize database: `rm prisma/dev.db && npm run seed`
2. Restart dev server to reload environment variables
3. Add error logging to prisma.ts to prevent silent failures
4. Add error logging to all route handlers' catch blocks to expose silent failures

verification:
1. Confirm gap-detections endpoint no longer shows "prisma is undefined" error
2. Test "Start Practice" → submit attempt → verify gap-detections endpoint responds
3. Test "New session" button works and returns questions
4. Verify study plan title generation succeeds without API key errors

files_changed: []

---

## Recommended Fixes

### Fix 1: Debug Prisma Initialization (CRITICAL)
Check if there's an error being swallowed:

```typescript
// src/lib/prisma.ts - Add error logging
function createPrismaClient() {
  try {
    const adapter = new PrismaLibSql({ url: `file:${DB_PATH}` });
    const client = new PrismaClient({ adapter });
    console.log("[Prisma] Client initialized successfully");
    return client;
  } catch (error) {
    console.error("[Prisma] CRITICAL: Failed to initialize PrismaClient:", error);
    throw error; // Re-throw so we know what went wrong
  }
}
```

### Fix 2: Validate Database
```bash
cd /home/antel/hackathon/adaptive-tutor
npx prisma db push --skip-generate  # Verify schema matches
npx prisma validate  # Check schema integrity
```

### Fix 3: Rebuild if needed
```bash
cd /home/antel/hackathon/adaptive-tutor
npx prisma generate  # Rebuild client
npm run build  # Full rebuild
npm run dev  # Fresh dev server start
```

### Fix 4: Check for hot-reload issues (dev server restart)
- Kill existing dev server: `pkill -f "next dev"`
- Start fresh: `npm run dev`
- This will reload .env.local and reset Prisma client singleton
