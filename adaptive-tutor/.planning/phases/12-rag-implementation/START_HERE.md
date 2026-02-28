# RAG Implementation: Start Here

**3-4 hours. Citations in Learn & Chat tabs. Done.**

---

## What You're Building

Wikipedia citations appear as clickable `[1]` `[2]` badges in:
- **Learn tab:** Question text and feedback
- **Chat tab:** Tutor explanations

No graph changes. Simple. Obvious in the demo.

---

## 4 Work Blocks (Do in Order)

### Block 1: Wikipedia Module + Data Model (65 min)
**Do these first — foundation for everything else**

1. Create `src/lib/rag/wikipedia.ts` (3 functions, ~100 lines)
   - `searchWikipedia(query)` → calls MediaWiki API
   - `fetchAndChunkPage(pageKey, source, nodeId, planId)` → fetches + chunks HTML
   - `chunkHtml()` → internal helper (regex-based, simple)

2. Add to `src/lib/types.ts`:
   ```typescript
   interface SourceChunk {
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
   ```

3. Verify: `await searchWikipedia("gradient descent")` returns results ✓

---

### Block 2: Questions + Graph Generation (70 min)
**Add sources to questions and fetch Wikipedia during graph creation**

1. Update `src/lib/schemas.ts` — Add to question schema:
   ```typescript
   sources: z.array(z.object({
     index: z.number(),
     pageTitle: z.string(),
     pageUrl: z.string(),
   })).optional().default([]),
   ```

2. Update `src/lib/prompts/index.ts` — Add to question gen prompt:
   ```
   SOURCE MATERIAL FOR "${conceptName}":
   [1] "Page Title" — Section
   Content text here...

   Include a "sources" field in your JSON with [index, pageTitle, pageUrl].
   ```

3. Update `src/app/api/study-plans/[id]/questions/route.ts` — Before calling LLM:
   ```typescript
   const chunks = await findMany('sourceChunks', { conceptNodeId });
   // Pass chunks.slice(0, 3) to prompt
   ```

4. Update `src/app/api/study-plans/[id]/generate-graph/route.ts` — Add Step 7 after node creation:
   ```typescript
   const sourcePromises = createdNodes.map(async (node) => {
     const results = await searchWikipedia(node.name, 2);
     for (const result of results.slice(0, 3)) {
       const chunks = await fetchAndChunkPage(result.key, result.source, node.id, id);
       for (const chunk of chunks.slice(0, 8)) {
         create('sourceChunks', chunk);
       }
     }
   });
   await Promise.all(sourcePromises);
   ```

5. Verify: Create study plan, check browser console for Wikipedia fetch logs ✓

---

### Block 3: Chat + Rendering (100 min)
**Add citations to chat, render them in both Learn & Chat**

1. Update `src/lib/prompts/index.ts` — Enhance chat system prompt:
   ```
   REFERENCE MATERIAL:
   [1] "Page Title" (url)
   Content...

   Cite sources using [N] notation in responses.
   ```

2. Update `src/app/api/chat/route.ts` — Before LLM call:
   ```typescript
   const conceptName = /* detect from user message or use weakest concept */;
   const chunks = await findMany('sourceChunks', { conceptNodeId: concept.id });
   // Append chunks to system prompt
   ```

3. Create helper in `src/app/(tabs)/learn/page.tsx`:
   ```typescript
   function renderWithCitations(text: string, sources: SourceChunk[]) {
     const parts = text.split(/\[(\d+)\]/g);
     return parts.map((part, i) => {
       if (i % 2 === 1) {
         const idx = parseInt(part) - 1;
         const chunk = sources[idx];
         return (
           <a href={chunk.pageUrl} className="inline-flex items-center justify-center
             w-4 h-4 text-[10px] rounded-full bg-blue-100 text-blue-700
             hover:bg-blue-200 cursor-pointer align-super ml-0.5">
             {parseInt(part)}
           </a>
         );
       }
       return part;
     });
   }
   ```

4. In Learn tab feedback rendering, wrap with `renderWithCitations()`

5. Copy same helper to `src/app/(tabs)/chat/page.tsx` for tutor messages

6. Verify:
   - Practice a question → See `[1]` badge in feedback ✓
   - Click badge → Shows "Wikipedia: [Topic]" ✓
   - Chat with tutor → See citations in response ✓
   - Click chat citation → Wikipedia link ✓

---

### Block 4: Seed Script (20 min)
**Pre-fetch Wikipedia sources so demo works offline**

1. Update `prisma/seed.ts` — After creating demo concept nodes:
   ```typescript
   for (const node of demoConceptNodes) {
     const results = await searchWikipedia(node.name, 2);
     for (const result of results.slice(0, 2)) {
       const chunks = await fetchAndChunkPage(result.key, result.source, node.id, planId);
       for (const chunk of chunks.slice(0, 4)) {
         create('sourceChunks', chunk);
       }
     }
   }
   ```

2. Run `npm run seed` — Sources pre-loaded ✓

---

## Demo Script (2 min)

```
"When we generate a study plan, the system fetches educational sources
from Wikipedia for each concept. Watch what happens when the learner practices."

[Open Learn tab]
"See these small numbered badges [1] [2]? Those are citations to Wikipedia
articles. Let me click one."

[Click [1] → Badge expands to show Wikipedia source]

"Now let's ask the tutor to explain a concept."

[Open Chat, ask "Explain backpropagation"]
"Notice the tutor naturally cites sources [1] [2] in the explanation.
Click any citation to see the full Wikipedia article."

[Click one → Shows Wikipedia]

"This is grounded teaching. Not a chatbot that might hallucinate.
Evidence-based, verifiable sources."
```

---

## How to Know You're Done

- [ ] Block 1: Wikipedia module creates, sources test retrieval
- [ ] Block 2: Graph generation logs "Source fetch for X"
- [ ] Block 2: Questions have `sources` field in JSON
- [ ] Block 3: Learn tab shows `[1]` badges in question/feedback
- [ ] Block 3: Click badge → Wikipedia panel with title + link
- [ ] Block 3: Chat shows citations in tutor response
- [ ] Block 4: `npm run seed` pre-fetches sources
- [ ] **Demo:** Practice question → see citation → click → works

---

## Total Time

| Block | Time |
|-------|------|
| 1 | 65m |
| 2 | 70m |
| 3 | 100m |
| 4 | 20m |
| **Total** | **3h 55m** |

**Real estimate with testing: 4 hours.**

---

## If Something Breaks

- Wikipedia API returns no results → Add fallback: `fetch()` wrapped with try-catch, return empty array
- Chunking produces weird text → Not critical for demo; just show a few words
- Performance slow → Sources fetch in parallel, 1-3 sec delay acceptable
- Chat/questions don't cite → Check that sources array is in JSON response
- Badges don't render → Check regex split on `[N]` patterns

---

## What NOT to Do

- ❌ Don't build a vector database
- ❌ Don't implement semantic search
- ❌ Don't cache sources (no Redis)
- ❌ Don't build a citation management system
- ❌ Don't change the graph visualization

---

## Success Looks Like

**Learn Tab:**
```
Question: What is gradient descent? [1]

Feedback: Correct! As described in the Wikipedia article on Gradient
Descent [1], this algorithm iteratively adjusts parameters...

[Click [1] → Wikipedia panel]
```

**Chat Tab:**
```
Tutor: Backpropagation [1] applies the chain rule [2] to compute gradients
layer by layer. The Wikipedia article on Backpropagation [1] explains...

[Click [1] → Wikipedia link in new tab]
```

**Done. Ship it.**

---

## Files Changed Summary

```
+ src/lib/rag/wikipedia.ts          (new, 100 lines)
~ src/lib/types.ts                  (add SourceChunk)
~ src/lib/schemas.ts                (add sources field)
~ src/lib/prompts/index.ts          (add source material sections)
~ src/app/api/study-plans/[id]/generate-graph/route.ts  (add Step 7)
~ src/app/api/study-plans/[id]/questions/route.ts       (fetch chunks)
~ src/app/api/chat/route.ts         (fetch chunks)
~ src/app/(tabs)/learn/page.tsx     (citation rendering)
~ src/app/(tabs)/chat/page.tsx      (citation rendering)
~ prisma/seed.ts                    (pre-fetch sources)
```

**10 files total. Mostly small additions.**

---

**Go. Do this. 4 hours. Obviously working demo. 🚀**
