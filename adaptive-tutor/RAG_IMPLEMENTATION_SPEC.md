# RAG Implementation Spec: Live Wikipedia/Wikibooks Retrieval

## Goal

When a concept graph is generated, fetch educational source material from Wikipedia and Wikibooks for each concept node. Store chunks alongside concept data. Use these chunks to ground question generation and chat tutor explanations with clickable citations. No visible graph changes — citations appear in the Learn tab (questions/feedback) and Chat tab (tutor explanations).

## Why This Approach

- Zero new dependencies. Uses native `fetch()` against the MediaWiki REST API.
- No API keys, no vector DB, no embeddings, no external services.
- Every chunk comes with a page title and URL — citation is free.
- Runs in parallel during graph generation so there's no user-facing latency.
- Wikipedia + Wikibooks cover any topic the demo could need.

---

## Data Model

Add a new `sourceChunks` table to the JSON file store (same pattern as existing tables in `lib/db.ts`).

```typescript
// Add to lib/types.ts

interface SourceChunk {
  id: string;
  conceptNodeId: string;        // FK to ConceptNode
  studyPlanId: string;          // FK to StudyPlan (for easy queries)
  source: "wikipedia" | "wikibooks";
  pageTitle: string;
  pageUrl: string;              // e.g. "https://en.wikipedia.org/wiki/Gradient_descent"
  sectionHeading: string;       // which section of the article this came from
  content: string;              // ~150-250 words of clean text
  createdAt: string;
}
```

No changes to ConceptNode, ConceptEdge, or any existing types.

---

## New Module: `lib/rag/wikipedia.ts`

Two public functions:

### `searchWikipedia(query, limit?, sources?)`

Searches the MediaWiki REST API for pages matching a concept name.

```typescript
const ENDPOINTS = {
  wikipedia: "https://en.wikipedia.org/w/rest.php/v1/search/page",
  wikibooks: "https://en.wikibooks.org/w/rest.php/v1/search/page",
};

interface WikiSearchResult {
  key: string;       // page key for fetching (e.g. "Gradient_descent")
  title: string;     // display title
  description: string;
  excerpt: string;   // snippet with search highlights
}

export async function searchWikipedia(
  query: string,
  limit: number = 3,
  sources: ("wikipedia" | "wikibooks")[] = ["wikipedia", "wikibooks"]
): Promise<(WikiSearchResult & { source: string })[]> {
  const results = await Promise.all(
    sources.map(async (source) => {
      const url = `${ENDPOINTS[source]}?q=${encodeURIComponent(query)}&limit=${limit}`;
      const res = await fetch(url, {
        headers: { "Api-User-Agent": "AdaptiveLearningTutor/1.0 (hackathon project)" },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.pages || []).map((p: any) => ({
        key: p.key,
        title: p.title,
        description: p.description || "",
        excerpt: p.excerpt || "",
        source,
      }));
    })
  );
  return results.flat();
}
```

### `fetchAndChunkPage(pageKey, source, conceptNodeId, studyPlanId)`

Fetches page HTML, strips to text, splits into section-based chunks.

```typescript
export async function fetchAndChunkPage(
  pageKey: string,
  source: "wikipedia" | "wikibooks",
  conceptNodeId: string,
  studyPlanId: string
): Promise<Omit<SourceChunk, "id">[]> {
  const base = source === "wikipedia"
    ? "https://en.wikipedia.org"
    : "https://en.wikibooks.org";

  const url = `${base}/w/rest.php/v1/page/${encodeURIComponent(pageKey)}/html`;
  const res = await fetch(url, {
    headers: { "Api-User-Agent": "AdaptiveLearningTutor/1.0 (hackathon project)" },
  });
  if (!res.ok) return [];
  const html = await res.text();

  const pageUrl = `${base}/wiki/${pageKey}`;
  return chunkHtml(html, pageTitle, pageUrl, source, conceptNodeId, studyPlanId);
}
```

### `chunkHtml` (internal helper)

This does NOT need to be sophisticated. For a demo, simple regex splitting is fine:

1. Strip all HTML tags except `<h2>`, `<h3>`, `<p>`.
2. Split on `<h2>` and `<h3>` to get sections.
3. For each section, take the heading text as `sectionHeading` and concatenate `<p>` text as content.
4. If a section is longer than ~250 words, split at sentence boundaries.
5. Drop sections that are very short (<30 words) or are boilerplate (References, See also, External links, Notes, Further reading).
6. Keep at most 5-6 chunks per page to avoid bloating the store.

Return array of `SourceChunk` objects (without `id` — the caller adds that via `db.create()`).

---

## Integration Point 1: Graph Generation (parallel fetch)

In `src/app/api/study-plans/[id]/generate-graph/route.ts`, AFTER concept nodes are created and persisted, add:

```typescript
// After: "Step 6: Clear existing graph and persist new one"
// (after the loop that creates concept nodes)

// Step 7 (NEW): Fetch source material for each concept in parallel
import { searchWikipedia, fetchAndChunkPage } from "@/lib/rag/wikipedia";
import { create } from "@/lib/db";

const sourcePromises = createdNodes.map(async (node) => {
  try {
    const searchResults = await searchWikipedia(node.name, 2, ["wikipedia", "wikibooks"]);
    const chunkArrays = await Promise.all(
      searchResults.slice(0, 3).map((result) =>
        fetchAndChunkPage(result.key, result.source, node.id, id)
      )
    );
    const chunks = chunkArrays.flat().slice(0, 8); // cap at 8 chunks per concept
    for (const chunk of chunks) {
      create("sourceChunks", chunk);
    }
    return chunks.length;
  } catch (err) {
    console.warn(`Source fetch failed for "${node.name}":`, err);
    return 0;
  }
});

// Don't block the response — fire and forget, or await if fast enough
await Promise.all(sourcePromises);
```

This adds maybe 1-3 seconds to graph generation (all fetches are parallel). The response already takes time for graph validation and layout, so this is acceptable.

---

## Integration Point 2: Question Generation Prompts

In `src/lib/prompts/index.ts`, modify the question generation prompt to include source material.

The caller (wherever questions are generated) should:
1. Look up `sourceChunks` for the concept being questioned: `findMany("sourceChunks", { conceptNodeId: concept.id })`
2. Pass the top 3-4 chunks (by relevance or just first N) into the prompt

Add to the prompt template:

```
SOURCE MATERIAL FOR "${conceptName}":
${chunks.map((c, i) => 
  `[${i + 1}] "${c.pageTitle}" — ${c.sectionHeading}\n${c.content}`
).join("\n\n")}

CITATION RULES:
- Generate questions using information from the source material above.
- Each question object must include a "sources" field: an array of objects
  with { index: number, pageTitle: string, pageUrl: string } for each
  source used.
- The explanation field should naturally reference where the information
  comes from (e.g., "As described in the Wikipedia article on Gradient Descent...").
- Do NOT fabricate information not present in the sources.
```

Update the Zod schema for generated questions to include the sources field:

```typescript
// In lib/schemas.ts, extend the question schema
const QuestionSourceSchema = z.object({
  index: z.number(),
  pageTitle: z.string(),
  pageUrl: z.string(),
});

// Add to the existing question schema:
sources: z.array(QuestionSourceSchema).optional().default([]),
```

---

## Integration Point 3: Answer Evaluation / Feedback

In the answer evaluation prompt (also in `lib/prompts/index.ts`), include the same source chunks so the feedback can reference them:

```
When providing feedback, reference the source material to help the
learner understand where they can read more. Use natural phrasing like
"According to [Source Title]..." or "The Wikipedia article on X explains
that...". Include the source index in your feedback so the UI can render
citation links.

Add a "citedSources" field to your JSON response: an array of source
indices (e.g., [1, 3]) that were referenced in the feedback.
```

---

## Integration Point 4: Chat Tutor

In `src/lib/prompts/index.ts` `chatSystemPrompt()`, when the tutor is explaining a concept, retrieve source chunks for the relevant concept(s) and append them to the system prompt.

The chat route (`src/app/api/chat/route.ts`) should:
1. Detect which concepts the user is asking about (keyword match against concept names in the active plan, or just include sources for the weakest concepts).
2. Fetch their source chunks from the store.
3. Append to the system prompt:

```
REFERENCE MATERIAL (cite when explaining concepts):
${chunks.map((c, i) => `[${i+1}] "${c.pageTitle}" (${c.pageUrl})\n${c.content}`).join("\n\n")}

When explaining concepts, naturally cite your sources using [N] notation
so the UI can render clickable links. Example: "Gradient descent works
by iteratively adjusting parameters in the direction of steepest
descent [1]."
```

---

## UI: Citation Rendering

### In Chat messages (`src/app/(tabs)/chat/page.tsx`)

Parse the assistant's response text for `[N]` patterns. Replace them with clickable citation badges.

```tsx
// Simple citation parser for message text
function renderWithCitations(text: string, sources: SourceChunk[]) {
  // Split on [N] patterns
  const parts = text.split(/\[(\d+)\]/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      // This is a number reference
      const idx = parseInt(part) - 1;
      const chunk = sources[idx];
      if (!chunk) return `[${part}]`;
      return (
        <a
          key={i}
          href={chunk.pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`${chunk.pageTitle} — ${chunk.sectionHeading}`}
          className="inline-flex items-center justify-center w-4 h-4
            text-[10px] rounded-full bg-blue-100 text-blue-700
            hover:bg-blue-200 cursor-pointer align-super ml-0.5
            no-underline"
        >
          {parseInt(part)}
        </a>
      );
    }
    return part;
  });
}
```

### In Learn tab question feedback

Same approach. When rendering feedback after an answer, parse `[N]` references and render as linked badges. The `sources` array comes from the question's `sources` field.

### In question text itself

If the LLM includes a citation in the question text (e.g., "Based on [1], which of the following..."), render it the same way.

---

## Seed Script Enhancement

In the seed script (`prisma/seed.ts` or equivalent), after creating the demo concept nodes, call the Wikipedia retrieval functions to pre-populate `sourceChunks`. This ensures the demo works even without network access:

```typescript
// After seeding concept nodes for the ML study plan:
for (const node of mlConceptNodes) {
  const results = await searchWikipedia(node.name, 2);
  for (const result of results.slice(0, 2)) {
    const chunks = await fetchAndChunkPage(
      result.key, result.source, node.id, mlPlan.id
    );
    for (const chunk of chunks.slice(0, 4)) {
      create("sourceChunks", chunk);
    }
  }
}
```

Run this once. The chunks persist in the JSON store and are available for all subsequent demo runs without network.

---

## What This Looks Like in the Demo

1. **Learn tab**: User sees a practice question. Below the question or in the feedback after answering, there are small blue `[1]` `[2]` badges. Hovering or clicking shows the source: "Wikipedia: Gradient descent" with a link. The feedback says something like "The key insight, as explained in the Wikipedia article on Gradient Descent [1], is that the learning rate controls step size."

2. **Chat tab**: User asks the tutor to explain a concept. The tutor's response includes natural citations: "Neural networks learn by adjusting weights through backpropagation [1], which applies the chain rule [2] to compute gradients layer by layer." The `[1]` and `[2]` are clickable links to Wikipedia.

3. **No graph changes at all.** The graph looks exactly as before. The source data is associated with concept nodes in the data layer but has no visual presence on the graph.

---

## Files to Create/Modify

| File | Action | What |
|------|--------|------|
| `src/lib/rag/wikipedia.ts` | **Create** | `searchWikipedia()`, `fetchAndChunkPage()`, `chunkHtml()` |
| `src/lib/types.ts` | **Modify** | Add `SourceChunk` interface |
| `src/lib/schemas.ts` | **Modify** | Add `QuestionSourceSchema`, extend question schema |
| `src/lib/prompts/index.ts` | **Modify** | Add source material sections to question gen, evaluation, and chat prompts |
| `src/app/api/study-plans/[id]/generate-graph/route.ts` | **Modify** | Add Step 7: parallel Wikipedia fetch after node creation |
| `src/app/(tabs)/chat/page.tsx` | **Modify** | Add `renderWithCitations()` to message rendering |
| `src/app/(tabs)/learn/page.tsx` | **Modify** | Add citation rendering to question text and feedback |
| `prisma/seed.ts` | **Modify** | Pre-fetch and store source chunks during seeding |

## Estimated Implementation Time

3-4 hours total. The wikipedia.ts module is ~100 lines. Prompt modifications are copy-paste. Citation rendering is a simple regex parser + a styled `<a>` tag. The seed script addition is a for loop.
