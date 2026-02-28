# Phase 12: RAG Implementation (Live Wikipedia/Wikibooks)

**Goal:** Add Wikipedia citations to questions and chat. Quick, obvious, working.
**Estimated Time:** 3–4 hours
**Demo Visibility:** Citations appear as clickable [1] [2] badges in Learn and Chat tabs

---

## Implementation Tasks

### Task 1: Wikipedia Retrieval Module (50 min)
**File:** Create `src/lib/rag/wikipedia.ts`

```typescript
interface WikiSearchResult {
  key: string;
  title: string;
  description: string;
  excerpt: string;
  source: "wikipedia" | "wikibooks";
}

export interface SourceChunk {
  id: string;
  conceptNodeId: string;
  studyPlanId: string;
  source: "wikipedia" | "wikibooks";
  pageTitle: string;
  pageUrl: string;
  sectionHeading: string;
  content: string;
  createdAt: string;
}

// searchWikipedia(query, limit?, sources?)
// Returns: WikiSearchResult[]
// Calls MediaWiki REST API for both Wikipedia and Wikibooks

// fetchAndChunkPage(pageKey, source, conceptNodeId, studyPlanId)
// Returns: SourceChunk[] (5-6 chunks per page, capped)
// Fetches HTML, strips tags, splits by sections

// chunkHtml(html, pageTitle, pageUrl, ...)
// Internal helper: regex-based chunking, drops boilerplate sections
```

**What to do:**
1. Copy the three functions from spec into new file
2. `chunkHtml`: Strip HTML tags, split on `<h2>/<h3>`, keep first 5-6 chunks, drop References/External Links
3. Test: `searchWikipedia("gradient descent")` should return 2-3 results

---

### Task 2: Data Model (15 min)
**Files to modify:**
- `src/lib/types.ts` — Add `SourceChunk` interface
- `src/lib/db.ts` — Ensure `sourceChunks` table is accessible (follow existing pattern)

**What to do:**
1. Add SourceChunk type (shown above)
2. No changes to ConceptNode or ConceptEdge

---

### Task 3: Question Generation Integration (40 min)
**Files to modify:**
- `src/lib/schemas.ts` — Add `sources` field to question schema
- `src/lib/prompts/index.ts` — Enhance question generation prompt
- `src/app/api/study-plans/[id]/questions/route.ts` — Fetch chunks, pass to prompt

**What to do:**
1. Update question Zod schema to include:
   ```typescript
   sources: z.array(z.object({
     index: z.number(),
     pageTitle: z.string(),
     pageUrl: z.string(),
   })).optional().default([]),
   ```

2. In questions route, before calling LLM:
   ```typescript
   const chunks = await findMany('sourceChunks', { conceptNodeId });
   // Pass to prompt: chunks.slice(0, 3)
   ```

3. Update prompt to include chunks and instruct model to include sources in JSON response

---

### Task 4: Graph Generation Wikipedia Fetch (30 min)
**File to modify:** `src/app/api/study-plans/[id]/generate-graph/route.ts`

**What to do:**
1. After nodes are created (Step 6), add Step 7:
   ```typescript
   const sourcePromises = createdNodes.map(async (node) => {
     try {
       const results = await searchWikipedia(node.name, 2);
       for (const result of results.slice(0, 3)) {
         const chunks = await fetchAndChunkPage(result.key, result.source, node.id, id);
         for (const chunk of chunks.slice(0, 8)) {
           create('sourceChunks', chunk);
         }
       }
     } catch (err) {
       console.warn(`Source fetch failed for "${node.name}"`, err);
     }
   });
   await Promise.all(sourcePromises);
   ```

2. This adds 1-3 seconds to graph generation (acceptable, parallel)

---

### Task 5: Chat Tutor Integration (40 min)
**Files to modify:**
- `src/lib/prompts/index.ts` — Enhance chat system prompt
- `src/app/api/chat/route.ts` — Fetch chunks for active concept, include in prompt

**What to do:**
1. In chat route, detect which concept user is asking about (keyword match or just weakest concept)
2. Fetch chunks for that concept
3. Append to system prompt:
   ```
   REFERENCE MATERIAL:
   [1] "Page Title" (url)
   Content here...

   Cite sources using [N] notation in your response.
   ```

4. Update response handling to parse [N] citations

---

### Task 6: Citation Rendering in Learn Tab (30 min)
**File to modify:** `src/app/(tabs)/learn/page.tsx`

**What to do:**
1. After question/feedback is rendered, parse `[1]` `[2]` patterns
2. Replace with clickable blue badges:
   ```tsx
   <a href={pageUrl} className="inline-flex items-center justify-center w-4 h-4
     text-[10px] rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200
     cursor-pointer align-super ml-0.5">
     {index}
   </a>
   ```

3. Hover title shows: "PageTitle — Section"

---

### Task 7: Citation Rendering in Chat Tab (30 min)
**File to modify:** `src/app/(tabs)/chat/page.tsx`

**What to do:**
1. Same citation parsing + rendering as Learn tab
2. Apply to tutor's response messages

---

### Task 8: Seed Script Enhancement (20 min)
**File to modify:** `prisma/seed.ts`

**What to do:**
1. After creating demo concept nodes, fetch Wikipedia sources:
   ```typescript
   for (const node of demoNodes) {
     const results = await searchWikipedia(node.name, 2);
     for (const result of results.slice(0, 2)) {
       const chunks = await fetchAndChunkPage(result.key, result.source, node.id, planId);
       for (const chunk of chunks.slice(0, 4)) {
         create('sourceChunks', chunk);
       }
     }
   }
   ```

2. This ensures demo works offline (chunks pre-seeded)

---

## What You See in Demo

### Learn Tab
```
Question: Which optimization algorithm adjusts weights iteratively? [1]

Your answer: Correct!

Feedback: The correct answer is Gradient Descent. As described in the
Wikipedia article on Gradient Descent [1], this algorithm iteratively
updates parameters to minimize loss.

Click [1] → Badge shows "Wikipedia: Gradient Descent"
```

### Chat Tab
```
User: "Explain backpropagation"

Tutor: "Backpropagation [1] is the algorithm used to train neural networks.
It works by applying the chain rule [2] to compute gradients layer by layer,
then updating weights in the direction of steepest descent [1]."

[1] → Wikipedia: Backpropagation
[2] → Wikipedia: Chain Rule
```

**That's it. No graph changes. Citations everywhere obvious.**

---

## Files Summary

| File | Action |
|------|--------|
| `src/lib/rag/wikipedia.ts` | **Create** — 3 functions (~100 lines) |
| `src/lib/types.ts` | **Modify** — Add SourceChunk interface |
| `src/lib/schemas.ts` | **Modify** — Add sources field to question |
| `src/lib/prompts/index.ts` | **Modify** — Add source material sections |
| `src/app/api/study-plans/[id]/generate-graph/route.ts` | **Modify** — Step 7: parallel fetch |
| `src/app/api/study-plans/[id]/questions/route.ts` | **Modify** — Fetch chunks, pass to prompt |
| `src/app/api/chat/route.ts` | **Modify** — Fetch chunks, include in prompt |
| `src/app/(tabs)/learn/page.tsx` | **Modify** — Citation rendering |
| `src/app/(tabs)/chat/page.tsx` | **Modify** — Citation rendering |
| `prisma/seed.ts` | **Modify** — Pre-fetch sources |

---

## Timeline

| Task | Time | Done |
|------|------|------|
| 1. Wikipedia module | 50m | ✓ |
| 2. Data model | 15m | ✓ |
| 3. Question integration | 40m | ✓ |
| 4. Graph generation fetch | 30m | ✓ |
| 5. Chat integration | 40m | ✓ |
| 6. Learn tab rendering | 30m | ✓ |
| 7. Chat tab rendering | 30m | ✓ |
| 8. Seed enhancement | 20m | ✓ |
| **Total** | **3h 55m** | |

**Start with Task 1 + 2** (65 min) → foundation
**Then 3 + 4** (70 min) → questions working
**Then 5 + 6 + 7** (100 min) → chat + rendering
**Finally 8** (20 min) → seed

---

## How to Know It's Working

1. ✅ Create a new study plan
2. ✅ After graph generation, check browser console for Wikipedia fetch logs
3. ✅ Open Learn tab, practice a question
4. ✅ See small `[1]` badges in question text and feedback
5. ✅ Click badge → see "Wikipedia: [Topic]" tooltip
6. ✅ Open Chat tab, ask tutor to explain a concept
7. ✅ See `[1]` citations in tutor's response
8. ✅ Click → Wikipedia link works

**Done.**

---

## Demo Script

> *"When we generate a study plan, the system automatically fetches educational sources for each concept from Wikipedia and Wikibooks. Watch what happens when the learner practices."*

1. Open Learn tab, see a question with `[1]` badge → click → show Wikipedia panel
2. Answer wrong, see feedback with `[2]` badge → click → show source
3. Open Chat, ask tutor to explain, see natural citations in response `[1]` `[2]`
4. Click one → Wikipedia link

> *"Every question is grounded in verified sources. Not a chatbot—evidence-based teaching."*

---

**That's the whole feature. 3-4 hours. Obviously works. Ready to present.**
