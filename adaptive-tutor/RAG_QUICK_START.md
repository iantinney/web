# RAG Implementation: Quick Start

**Add Wikipedia citations to Learn & Chat tabs. 3-4 hours. Done.**

---

## The Feature

**What it is:** Questions and chat explanations now include clickable `[1]` `[2]` badges linking to Wikipedia.

**What it isn't:** No graph changes. No complex UI. Simple regex parsing + styled badges.

---

## Demo Moment

```
Learn Tab:
  Question: "What is gradient descent?" [1]
  Feedback: "Correct! As described in Wikipedia [1], gradient descent..."
  [Click [1] → Shows: "Wikipedia: Gradient Descent (link to article)"]

Chat Tab:
  Tutor: "Backpropagation [1] applies the chain rule [2]..."
  [Click [1] → Wikipedia link]
```

---

## 4 Blocks (Do in Order)

### 1️⃣ Wikipedia Module (65 min)
- Create `src/lib/rag/wikipedia.ts` (3 functions, copy from spec)
- Add `SourceChunk` interface to `src/lib/types.ts`
- Test: `searchWikipedia("gradient descent")` works

**Why first:** Everything else needs this.

### 2️⃣ Questions + Graph (70 min)
- Update question schema + prompt (add `sources` field)
- Fetch chunks in question generation route
- Add Step 7 to graph generation: parallel Wikipedia fetch

**Why here:** Populates data for Learn tab.

### 3️⃣ Chat + Rendering (100 min)
- Enhance chat prompt with source material
- Create `renderWithCitations()` helper (regex parser)
- Apply to Learn tab feedback AND Chat tab messages

**Why here:** Makes citations visible in UI.

### 4️⃣ Seed Script (20 min)
- Pre-fetch Wikipedia sources during seeding
- Ensures demo works offline

**Why last:** Nice-to-have; demo works without this.

---

## Files to Touch

```
+ src/lib/rag/wikipedia.ts          (new)
~ src/lib/types.ts                  (add SourceChunk)
~ src/lib/schemas.ts                (add sources to question)
~ src/lib/prompts/index.ts          (add source material)
~ src/app/api/study-plans/[id]/generate-graph/route.ts
~ src/app/api/study-plans/[id]/questions/route.ts
~ src/app/api/chat/route.ts
~ src/app/(tabs)/learn/page.tsx
~ src/app/(tabs)/chat/page.tsx
~ prisma/seed.ts
```

**10 files. Mostly small additions.**

---

## Verification Checklist

- [ ] Create study plan → Browser logs show "Fetching sources for X..."
- [ ] Practice a question → See `[1]` badge in feedback
- [ ] Click badge → Shows Wikipedia title + link
- [ ] Open Chat → Ask tutor → See citations in response
- [ ] Click chat citation → Wikipedia link works
- [ ] Run `npm run seed` → Sources pre-fetched
- [ ] Works offline (after seeding)

---

## Timeline

```
Block 1 (Module):     65 min  → Foundation
Block 2 (Questions):  70 min  → Learn tab data
Block 3 (Rendering):  100 min → Citations visible
Block 4 (Seed):       20 min  → Offline support
─────────────────────────────
Total:                4 hours
```

---

## Core Implementation Details

**Wikipedia Module:**
```typescript
// src/lib/rag/wikipedia.ts
searchWikipedia(query)          // → WikiSearchResult[]
fetchAndChunkPage(key, source)  // → SourceChunk[]
chunkHtml(html, ...)            // → chunks (strips tags, splits by sections)
```

**Question Schema:**
```typescript
sources: z.array({
  index: z.number(),
  pageTitle: z.string(),
  pageUrl: z.string(),
})
```

**Rendering Helper:**
```typescript
function renderWithCitations(text, sources) {
  return text.split(/\[(\d+)\]/g).map(part => {
    if (is_number) return <a href={source.url}>[N]</a>
    return part
  })
}
```

**Graph Generation Step 7:**
```typescript
const sourcePromises = createdNodes.map(async (node) => {
  const results = await searchWikipedia(node.name, 2);
  for (const result of results) {
    const chunks = await fetchAndChunkPage(result.key, ...);
    for (const chunk of chunks) create('sourceChunks', chunk);
  }
});
await Promise.all(sourcePromises);
```

---

## What to Show in Demo

1. **Open Learn tab** → Practice a question
   - Point to `[1]` badge in question text
   - Point to `[2]` badge in feedback
   - Click one → Show Wikipedia panel

2. **Open Chat tab** → Ask tutor a question
   - Show citations in response
   - Click to open Wikipedia

3. **Narrate:**
   > *"Every question and explanation is grounded in Wikipedia sources. This isn't a chatbot—it's evidence-based teaching. Click any citation to verify."*

**Total demo time: 90 seconds.**

---

## Common Issues + Fixes

| Issue | Fix |
|-------|-----|
| Wikipedia API timeout | Wrap in try-catch, return empty array |
| Chunks are messy text | They don't need to be perfect; just show something |
| Rendering doesn't show badges | Check regex split on `[N]` patterns |
| Chat doesn't cite | Verify LLM is including [N] in response |
| Performance slow | Fetches run parallel; 1-3 sec delay is fine |

---

## Detailed Docs

- **PLAN.md** — All 8 tasks broken down by file
- **START_HERE.md** — 4 blocks with code snippets

---

## Status

- [x] Spec finalized (RAG_IMPLEMENTATION_SPEC.md)
- [x] Tasks identified (8 total)
- [x] Timeline estimated (3-4 hours)
- [x] Demo moment clear (citations in Learn + Chat)
- [ ] **Ready to implement**

---

**Next step: Do Block 1 (Wikipedia module). Everything else flows from there.**

**Estimated ship time: 4 hours. Go.** 🚀
