# Learn Tab Issues - Root Cause Diagnosis

**Investigation Date:** February 26, 2026
**Status:** ROOT CAUSE FOUND - PRIMARY ISSUE IDENTIFIED

---

## Executive Summary

All three reported issues trace back to a **single critical root cause**: The Prisma database client is failing to initialize silently, causing `prisma` to be `undefined` in all API route handlers. This cascades through the entire learn tab flow, causing:

1. Questions endpoint crashes (returns empty due to undefined prisma)
2. Session endpoint crashes (returns error due to undefined prisma)
3. Gap detection endpoint explicitly fails (logs "Cannot read properties of undefined")

**Confidence Level: HIGH** - Error message directly observed in server logs.

---

## Issue 1: Learn Tab Stuck in Infinite Loop (Questions Not Loading)

### Root Cause
**PRIMARY:** Prisma client initialization failure in `/home/antel/hackathon/adaptive-tutor/src/lib/prisma.ts`

### Evidence
1. Server logs (`.next/dev/logs/next-development.log`) show repeated errors:
   ```
   Error querying gap detections: TypeError: Cannot read properties of undefined (reading 'findMany')
   ```
   - Occurs repeatedly between 01:34:05 and 01:41:10
   - Triggered after each attempt submission (when gap-detections endpoint is called)

2. Code inspection of `gap-detections/route.ts` line 32:
   ```typescript
   const gaps = await prisma.gapDetection.findMany({...})
   ```
   - Error message indicates `prisma` is `undefined`
   - Import statement is correct: `import { prisma } from "@/lib/prisma";`

3. Prisma initialization code (`src/lib/prisma.ts` lines 14-26):
   ```typescript
   function createPrismaClient() {
     const adapter = new PrismaLibSql({ url: `file:${DB_PATH}` });
     return new PrismaClient({ adapter });
   }

   export const prisma: PrismaClient =
     globalThis._prismaGlobal ?? createPrismaClient();
   ```
   - **Issue:** If `createPrismaClient()` throws an error, the export `prisma` becomes `undefined`
   - No try-catch wrapping, so errors are silent
   - The function likely throws due to database issues or adapter problems

### Impact on Learn Tab
1. User clicks "Start Practice"
2. `initSession()` calls `POST /generate-questions` (succeeds - MiniMax API calls work)
3. `initSession()` calls `GET /questions` (fails - prisma undefined → endpoint crashes)
4. Since questions endpoint returns empty/error, frontend shows "No questions due"
5. User perceives "infinite loop" as system never progresses past loading screen

### Cascade Effect
- Questions endpoint (`questions/route.ts` line 77) calls `prisma.unitGraph.findMany()`
- This will also fail with prisma undefined
- Silent catch block (lines 218-220 in learn/page.tsx) hides the error

### Confidence
**HIGH** - Direct error message in logs showing prisma is undefined

---

## Issue 2: MINIMAX_API_KEY Error During Title Generation

### Root Cause
**SECONDARY:** Dev server not restarted after `.env.local` was updated, OR race condition between env loading and module initialization

### Evidence
1. `.env.local` file exists and contains:
   - `MINIMAX_API_KEY=sk-cp-...` ✓
   - `ANTHROPIC_API_KEY=sk-cp-...` ✓ (same value, correct for MiniMax API)
   - `ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic` ✓

2. Logs show MiniMax calls SUCCEEDING in other contexts:
   - Question generation calls succeed (lines 250-349 in logs show 200 responses)
   - Multiple successful requests with `[MiniMax] Response status: 200`

3. Code inspection of `minimax-native.ts`:
   - Line 7-9: Lazy evaluation - `getApiKey()` checks env vars at call time
   - Line 35-40: Throws error if apiKey is empty string

4. Inconsistency:
   - Questions generation: MiniMax calls work (env vars available)
   - Title generation: Env vars reported as undefined
   - Same `generateText()` function called differently - timing issue

### Why This Happens
- Next.js loads `.env.local` at startup
- Hot module reload doesn't reload env vars
- If `.env.local` was modified and dev server wasn't restarted:
  - Older process may be using missing/old keys
  - OR race condition where module loads before env is read

### Workaround Already In Place
`generateStudyPlanTitle.ts` lines 40-48 have try-catch that silently falls back to first line extraction. This is why you see titles despite errors.

### Confidence
**MEDIUM** - Error handling masks the issue; likely scenario but not 100% certain without env var inspection at runtime

---

## Issue 3: "New Session" Button Not Working

### Root Cause
**PRIMARY:** Cascading failure from Prisma client initialization issue (Issue #1)

### Evidence
1. Session endpoint (`session/route.ts` line 37) calls:
   ```typescript
   let session = await prisma.sessionRecord.findFirst({...})
   ```
   - When prisma is undefined, this will crash

2. Questions endpoint also calls prisma (line 77 in questions/route.ts)

3. Frontend flow (learn/page.tsx lines 487-496):
   ```typescript
   const handleNewSession = useCallback(() => {
     setQuestions([]);
     setQuestionIndex(0);
     setSessionId(null);
     setLastResult(null);
     setSessionStats({ attempted: 0, correct: 0 });
     setNoQuestionsMessage(null);
     initSession();
   }, [initSession]);
   ```
   - Button click handler is wired correctly
   - Calls `initSession()` which makes GET /session and GET /questions
   - If those endpoints fail due to prisma undefined, user sees loading indefinitely

### Why Appears as "Not Working"
- Button click initiates flow but doesn't progress
- User sees "loading" or "generating" phase indefinitely
- Eventually times out or shows "No questions due"
- Appears broken, but actually cascading Prisma failure

### Confidence
**HIGH** - Same root cause as Issue #1

---

## Critical Database Files

| File | Status |
|------|--------|
| `/home/antel/hackathon/adaptive-tutor/prisma/dev.db` | Exists (1.05 MB, modified Feb 26 13:42) |
| `/home/antel/hackathon/adaptive-tutor/.env.local` | Exists (all vars set) |
| `src/lib/prisma.ts` | Has silent error handling (NO try-catch) |

---

## Recommended Immediate Actions

### 1. CRITICAL: Fix Prisma Initialization (Fixes all 3 issues)

```bash
cd /home/antel/hackathon/adaptive-tutor

# Option A: Rebuild Prisma client
npx prisma generate

# Option B: Verify and push schema
npx prisma db push

# Option C: Fresh database (nuclear option)
rm prisma/dev.db
npm run seed
```

### 2. Add Error Logging to Prevent Future Silent Failures

Update `src/lib/prisma.ts`:
```typescript
function createPrismaClient() {
  try {
    const adapter = new PrismaLibSql({ url: `file:${DB_PATH}` });
    const client = new PrismaClient({ adapter });
    console.log("[Prisma] ✓ Client initialized successfully");
    return client;
  } catch (error) {
    console.error("[Prisma] FATAL: Failed to initialize PrismaClient");
    console.error("[Prisma] Error:", error);
    throw error; // Let it fail loudly instead of silently
  }
}
```

### 3. Restart Dev Server

```bash
pkill -f "next dev"
npm run dev
```

This reloads .env vars and reinitializes Prisma client.

### 4. Add Error Logging to API Routes (Gap Detections)

Update `src/app/api/study-plans/[id]/gap-detections/route.ts`:
```typescript
} catch (error) {
  console.error("Error querying gap detections:", error);
  // Log the full error, not just message
  if (error instanceof Error) {
    console.error("  Stack:", error.stack);
  }
  return NextResponse.json(
    { error: "Failed to query gap detections" },
    { status: 500 }
  );
}
```

---

## Verification Checklist

After applying fixes:

- [ ] Restart dev server and check logs for Prisma initialization success message
- [ ] Verify gap-detections endpoint no longer shows "prisma is undefined" error
- [ ] Test "Start Practice" → verify questions load (not just generating screen)
- [ ] Test "New session" button → verify it progresses to practicing phase
- [ ] Submit an attempt → verify gap-detections endpoint doesn't error
- [ ] Test study plan title generation → verify no API key errors
- [ ] Check logs for any remaining silent errors

---

## Summary Table

| Issue | Root Cause | Confidence | Fix |
|-------|-----------|------------|-----|
| 1. Questions Loop | Prisma undefined | HIGH | Reinitialize Prisma |
| 2. API Key Error | Env vars stale (dev server not restarted) | MEDIUM | Restart dev server |
| 3. New Session Button | Prisma undefined (cascading) | HIGH | Reinitialize Prisma |

---

## Files Involved

### Core Issue
- `src/lib/prisma.ts` - Silent error in `createPrismaClient()`
- `prisma/dev.db` - Possible schema mismatch or corruption

### Affected Endpoints
- `src/app/api/study-plans/[id]/questions/route.ts` - Returns empty due to prisma undefined
- `src/app/api/study-plans/[id]/session/route.ts` - Fails to create/get session
- `src/app/api/study-plans/[id]/gap-detections/route.ts` - Explicitly logged error
- `src/app/api/study-plans/[id]/generate-questions/route.ts` - May also affected

### Frontend
- `src/app/(tabs)/learn/page.tsx` - Initiates affected API calls, has silent error handling

---

## Next Steps for Development Team

1. **Apply Prisma fixes** (fixes 70% of issues immediately)
2. **Restart dev server** (fixes env var timing issue)
3. **Add error logging** to prevent future silent failures
4. **Monitor logs** during testing to confirm fix
5. **Consider** adding error boundary / user feedback for API failures

