# Technology Stack Research

**Project:** Adaptive Learning Tutor
**Researched:** 2026-02-24
**Research Mode:** Ecosystem + Feasibility (validate proposed stack)

---

## Verdict on Proposed Stack

The proposed stack (Next.js + React Flow + dagre + Prisma/SQLite + Zustand + MiniMax) is **sound for a hackathon demo**. Most choices are well-validated. The one integration risk is MiniMax's structured output support being locked to `MiniMax-Text-01`, not the newer M2/M2.5 models — this needs a workaround strategy.

---

## Core Framework

### Next.js 15 (App Router) + React 19 + TypeScript

| Attribute | Value |
|-----------|-------|
| **Confidence** | HIGH |
| **Source** | Official docs, multiple 2025 guides |

**Why use it:** Industry standard for full-stack TypeScript apps in 2025. Next.js 15.3 + React 19.1 is the current production baseline for LMS/EdTech platforms. App Router enables server components, which reduce client bundle for static UI. API routes co-locate backend logic, eliminating need for a separate server for a hackathon demo.

**Tradeoffs:** Slight overhead from React Server Components mental model. For a single-user local demo, the SSR/streaming benefits matter less than the ecosystem familiarity.

**2025 notes:** Next.js 15 broke some Prisma singleton patterns — use the explicit singleton guard (`if (!global.prisma)`) to avoid multiple connections in dev mode. Next.js 16 is in early preview; 15 is the stable target.

---

### Tailwind CSS + shadcn/ui

| Attribute | Value |
|-----------|-------|
| **Confidence** | HIGH |
| **Source** | Official shadcn/ui docs, WebSearch |

**Why use it:** shadcn/ui is the dominant component library for Next.js App Router projects in 2025. Components are copy-paste (not a black box npm package), so they're fully customizable. Full App Router and Server Component support. CLI auto-configures Tailwind and directory structure. Tailwind v4 is the current version alongside shadcn/ui upgrades.

**Tradeoffs:** No versioned upgrades — each component is owned by your codebase. This is a feature for a hackathon: you modify exactly what you need without fighting an API boundary.

**Alternatives considered:** MUI, Chakra UI. Both are heavier and less idiomatic with App Router + Tailwind. Not recommended here.

---

## Graph Visualization

### React Flow (xyflow) + dagre

| Attribute | Value |
|-----------|-------|
| **Confidence** | HIGH |
| **Source** | Official React Flow docs (WebFetch verified), npm trends |

**React Flow verdict:** Correct choice. It is the standard library for interactive node-based UIs in React. Rebranded to xyflow but package names unchanged. 160K weekly downloads, actively maintained.

**Why React Flow beats alternatives:**
- **vs D3.js:** D3 gives maximum flexibility but requires writing substantial imperative code for even simple diagrams. Concept DAGs need interactive drag, zoom, custom node rendering — all built into React Flow. D3 is a better choice only when you need highly custom visual encodings (force layouts, unusual topology viz).
- **vs Cytoscape.js:** Cytoscape is optimized for scientific graph analysis (network topology, biology networks). Its DOM model is canvas-based, making custom React node components harder to integrate. React Flow nodes ARE React components, giving you full JSX/Tailwind control over node appearance.
- **vs Vis.js:** Largely unmaintained compared to React Flow. Avoid.

**Dagre verdict:** Correct choice for concept DAGs. React Flow's official docs recommend dagre for hierarchical tree/DAG layouts. Dagre provides automatic node placement for directed graphs with minimal config.

**dagre vs alternatives:**
- **ELK (elkjs):** More powerful (supports edge routing, sub-flows, dynamic node sizing), but ships a ~1.45MB bundle and has a steep config learning curve. Overkill for a concept DAG.
- **d3-hierarchy:** Requires a single root node. Concept DAGs can have multiple root concepts, so d3-hierarchy is not appropriate.
- **d3-force:** Physics-based, iterative — visually engaging but not suitable for pedagogically meaningful hierarchical layout (concepts should appear at consistent dependency depths).

**Recommendation:** Keep React Flow + dagre. If multi-root DAGs cause dagre layout issues, ELK is the upgrade path, not a rewrite.

**Note on @dagrejs/dagre vs dagre:** The `@dagrejs/dagre` scoped package is the actively maintained fork. Use this, not the original `dagre` package which is no longer updated.

---

## LLM Integration

### MiniMax API

| Attribute | Value |
|-----------|-------|
| **Confidence** | MEDIUM |
| **Source** | MiniMax platform docs (WebFetch), Vercel AI SDK docs |

**CRITICAL FINDING — Structured Output Caveat:**

MiniMax's `response_format: { type: "json_schema" }` parameter is **only supported by `MiniMax-Text-01`**, not by the newer M2/M2.5 models. The M2 series uses a different paradigm (tool calling for structured outputs).

**Implication for this project:** The plan to use MiniMax for graph generation and question generation requires structured JSON output. There are two strategies:

1. **Use `MiniMax-Text-01`** — supports `json_schema` response format natively. This is the lowest-friction path for JSON reliability.
2. **Use M2/M2.5 with tool calling** — define the concept graph or question schema as a "function" that the model calls. This works but requires more prompt engineering.

**Streaming:** The M2.5/M2.1 models are explicitly recommended with streaming output ("recommended with streaming output for best performance"). Streaming works through the Vercel AI SDK community provider.

### Vercel AI SDK (with MiniMax community provider)

| Attribute | Value |
|-----------|-------|
| **Confidence** | HIGH |
| **Source** | Vercel AI SDK docs (WebFetch verified), GitHub minimax-ai/vercel-minimax-ai-provider |

**Why use it:** MiniMax has published an official community provider for the Vercel AI SDK (`vercel-minimax-ai-provider`). This gives you `generateText`, `streamText`, and `generateObject` via the standard Vercel AI SDK interface. MiniMax M2.1 and M2.5 are also available on Vercel AI Gateway.

**generateObject + Zod:** The Vercel AI SDK's `generateObject` function accepts a Zod schema and handles structured output negotiation with the underlying provider. This is the recommended pattern for reliable JSON in 2025 — define once in Zod, get runtime validation + TypeScript types.

**Integration risk:** The community provider is MiniMax-maintained (not Vercel-maintained). Pin the version and test structured output behavior early. If `generateObject` fails with MiniMax-M2, fall back to `MiniMax-Text-01` with explicit `response_format`.

**Retry/validation pattern (2025 best practice):**
```typescript
// Pattern: Zod schema → generateObject → catch validation errors → retry with error context
import { generateObject } from 'ai';
import { z } from 'zod';

const ConceptGraphSchema = z.object({
  nodes: z.array(z.object({ id: z.string(), label: z.string(), level: z.number() })),
  edges: z.array(z.object({ source: z.string(), target: z.string() })),
});

const { object } = await generateObject({
  model: minimax('MiniMax-Text-01'),
  schema: ConceptGraphSchema,
  prompt: '...',
});
```

---

## Database

### Prisma ORM + SQLite

| Attribute | Value |
|-----------|-------|
| **Confidence** | HIGH |
| **Source** | Prisma official docs, multiple 2025 guides |

**Why use it:** SQLite is a file-based database with zero setup, perfect for a local-first demo. Prisma provides type-safe queries with schema migrations. The stack is widely documented with multiple 2025 Next.js guides.

**2025 note:** Prisma 7 introduced a new `libSQL` adapter for SQLite, enabling the "modern way" of SQLite usage. For a hackathon, standard `provider = "sqlite"` in schema.prisma is sufficient — no need for libSQL unless you later want Turso cloud replication.

**Critical pitfall:** Next.js hot reload creates multiple Prisma client instances in development. Use the singleton guard:
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**Migration path:** If you later need multi-user or cloud deployment, Prisma's provider swap to PostgreSQL is a one-line schema change. This is a genuine strength of the Prisma abstraction.

**Alternative considered:** Drizzle ORM — leaner, faster, more type-safe at the query level. However, Prisma has more documentation, better ecosystem integrations, and lower learning curve. For a hackathon, Prisma wins on development speed.

---

## State Management

### Zustand

| Attribute | Value |
|-----------|-------|
| **Confidence** | HIGH |
| **Source** | Multiple 2025 comparison articles |

**Why use it:** Zustand is the dominant lightweight state manager for React in 2025. It uses a centralized store with hooks — straightforward to use in an App Router context. Best fit when you have interconnected global state (current topic, quiz session, concept graph, user progress) that multiple components need.

**vs Jotai:** Jotai excels at fine-grained atomic state with fewer re-renders. For this project, Zustand is preferable because the adaptive learning state is highly interconnected (changing current concept affects practice queue, graph highlighting, and difficulty selector simultaneously). A centralized store makes these cross-cutting updates easier to reason about.

**App Router consideration:** Zustand state is client-side only. Server Components cannot access it. This is fine for this project since the UI state (current node, active session) is inherently client-side. Data fetching from SQLite goes through API routes or Server Actions.

**Recommendation:** Keep Zustand. Consider using Zustand slices pattern to keep stores organized as the feature set grows.

---

## Spaced Repetition

### ts-fsrs

| Attribute | Value |
|-----------|-------|
| **Confidence** | HIGH |
| **Source** | GitHub open-spaced-repetition/ts-fsrs (verified), fsrs.js README deprecation notice |

**Why ts-fsrs over SM-2:** FSRS v6 is the current state-of-the-art spaced repetition algorithm, designed by Anki's core team. It outperforms SM-2 on retention rate benchmarks. `ts-fsrs` is the actively maintained TypeScript implementation (ES modules + CommonJS + UMD). `fsrs.js` is **explicitly deprecated** by its maintainers in favor of ts-fsrs.

**Why not implement SM-2 manually:** SM-2 is a 1990 algorithm. ts-fsrs gives you FSRS v6 with typed card states (New/Learning/Review/Relearning), four ratings (Again/Hard/Good/Easy), and stability/difficulty tracking out of the box. This is a 5-minute integration vs. hand-rolling scheduling logic.

**Installation:**
```bash
npm install ts-fsrs
```

**Integration note:** ts-fsrs is pure computation — it returns next review dates and card state transitions. You store the results in SQLite via Prisma. No server-side process needed.

**Gap in original plan:** The original stack did not specify a spaced repetition library. ts-fsrs fills this gap explicitly.

---

## Adaptive Algorithm (Knowledge Tracing)

| Attribute | Value |
|-----------|-------|
| **Confidence** | MEDIUM |
| **Source** | WebSearch (academic sources), no JavaScript library with high adoption found |

**Observation:** Production adaptive learning systems in 2025 use one of three approaches for knowledge tracing:

1. **LLM-based diagnosis** — Ask the LLM to assess mastery level from a sequence of Q&A exchanges. Simplest to implement with MiniMax, reasonable for a demo with small concept counts.
2. **BKT (Bayesian Knowledge Tracing)** — Probabilistic model tracking P(learned) per skill. `pyBKT` is the reference Python implementation, but there is **no widely-adopted JavaScript BKT library** for this project's stack.
3. **FSRS + rubric scoring** — Use ts-fsrs for scheduling and LLM-graded rubrics for correctness. This is the most practical path for this project.

**Recommendation:** For this hackathon, use LLM-based mastery assessment (have MiniMax rate responses on a 0-1 confidence scale per concept) + ts-fsrs for scheduling. This avoids needing a separate Python service. If accuracy matters post-hackathon, integrate a BKT layer.

---

## Supporting Libraries

| Library | Purpose | Confidence | Notes |
|---------|---------|------------|-------|
| `zod` | Schema validation for LLM outputs and API routes | HIGH | De facto standard in Next.js ecosystem, 2.5M weekly downloads |
| `@dagrejs/dagre` | DAG layout engine for React Flow | HIGH | Actively maintained fork of original dagre |
| `ts-fsrs` | Spaced repetition scheduling | HIGH | Replace any custom SM-2 implementation |
| `ai` (Vercel AI SDK) | Unified LLM interface, streaming, generateObject | HIGH | Community MiniMax provider available |
| `minimax-ai-provider` | MiniMax provider for Vercel AI SDK | MEDIUM | Community-maintained by MiniMax-AI org, pin version |

---

## Alternatives Considered and Rejected

| Category | Proposed | Alternative | Why Not |
|----------|----------|-------------|---------|
| Graph viz | React Flow | D3.js | D3 requires imperative code; custom React nodes are painful without React Flow |
| Graph viz | React Flow | Cytoscape.js | Canvas-based; harder to integrate React components as nodes |
| Layout | dagre | ELK | ~1.45MB bundle, steep config; overkill for concept DAGs |
| Layout | dagre | d3-hierarchy | Requires single root; concept DAGs are multi-root |
| SRS algo | ts-fsrs | SM-2 (manual) | FSRS is objectively better; SM-2 is 35 years old |
| SRS algo | ts-fsrs | fsrs.js | Deprecated by maintainers; migrate to ts-fsrs |
| State | Zustand | Jotai | Jotai better for isolated atom state; Zustand better for interconnected global session state |
| ORM | Prisma | Drizzle ORM | Drizzle is faster/leaner but less documented; Prisma wins on hackathon dev speed |
| LLM SDK | Vercel AI SDK | Raw fetch to MiniMax API | AI SDK gives streaming, generateObject, retry handling for free |

---

## Integration Risks

### Risk 1: MiniMax Structured Output Model Mismatch — HIGH PRIORITY

**Problem:** `response_format: json_schema` only works with `MiniMax-Text-01`. The M2 series uses tool calling for structured output. If the codebase uses `minimax('MiniMax-M2')` and calls `generateObject`, behavior is undefined.

**Mitigation:** Decide upfront which model handles which task:
- **Graph generation, question generation** (need reliable JSON): Use `MiniMax-Text-01` with `response_format: json_schema` OR use M2 with a tool-calling schema.
- **Conversational tutoring** (free-form streaming): Use `MiniMax-M2.5-highspeed` for speed.

**Test this first.** Do not discover this in the final hour.

### Risk 2: Prisma Hot Reload in Next.js Dev — LOW (Known, Easy Fix)

**Problem:** Next.js fast refresh creates multiple Prisma client instances.

**Mitigation:** Use the singleton pattern shown above in `lib/prisma.ts`. This is documented everywhere and takes 5 minutes.

### Risk 3: React Flow + dagre Multi-Root DAG Positioning — MEDIUM

**Problem:** If a concept DAG has multiple root nodes (e.g., "Algebra" and "Geometry" are independent roots), dagre may produce overlapping or poorly separated layouts.

**Mitigation:** Add a virtual root node that connects to all true roots for layout purposes, then hide it in the rendered output. This is a known workaround documented in xyflow GitHub discussions.

### Risk 4: Vercel AI SDK community provider stability — LOW

**Problem:** `vercel-minimax-ai-provider` is community-maintained by MiniMax. API changes in either the Vercel AI SDK or MiniMax API could break it.

**Mitigation:** Pin the exact package version. Test `generateObject`, `streamText`, and tool calling at project start. If it breaks, fall back to raw `fetch` against MiniMax's OpenAI-compatible endpoint.

---

## Recommended Installation

```bash
# Core framework (assumed present)
npm install next react react-dom typescript

# UI
npm install tailwindcss @tailwindcss/typography
npx shadcn@latest init

# Graph visualization
npm install @xyflow/react @dagrejs/dagre

# Database
npm install prisma @prisma/client
npx prisma init --datasource-provider sqlite

# LLM
npm install ai
npm install minimax-ai-provider  # or the @MiniMax-AI/vercel-minimax-ai-provider package name

# State
npm install zustand

# Spaced repetition
npm install ts-fsrs

# Validation
npm install zod
```

---

## Confidence Summary

| Area | Confidence | Basis |
|------|-----------|-------|
| Next.js + shadcn/ui + Tailwind | HIGH | Official docs, massive 2025 adoption |
| React Flow + dagre | HIGH | Official docs (WebFetch verified), clear use case fit |
| Prisma + SQLite | HIGH | Official docs, multiple 2025 guides |
| Zustand | HIGH | Multiple 2025 comparison articles |
| ts-fsrs | HIGH | GitHub verified, fsrs.js explicitly deprecated |
| Vercel AI SDK + MiniMax provider | MEDIUM | Community provider, integration needs early testing |
| MiniMax structured output | MEDIUM | Confirmed but model-specific (`Text-01` vs M2) — HIGH RISK area |
| Adaptive algorithm (BKT/IRT) | LOW | No JS library found; LLM-based workaround recommended |

---

## Sources

- [React Flow Layout Documentation](https://reactflow.dev/learn/layouting/layouting) — verified via WebFetch
- [Vercel AI SDK MiniMax Provider](https://ai-sdk.dev/providers/community-providers/minimax) — verified via WebFetch
- [MiniMax API Reference — Text Generation](https://platform.minimax.io/docs/api-reference/text-post) — verified via WebFetch
- [MiniMax M2.5 Announcement](https://www.minimax.io/news/minimax-m25)
- [ts-fsrs GitHub](https://github.com/open-spaced-repetition/ts-fsrs) — verified via WebFetch
- [fsrs.js deprecation notice](https://github.com/open-spaced-repetition/fsrs.js) — verified via WebFetch
- [Prisma SQLite Quickstart](https://www.prisma.io/docs/getting-started/prisma-orm/quickstart/sqlite)
- [npm trends: cytoscape vs d3 vs react-flow-renderer](https://npmtrends.com/cytoscape-vs-d3-vs-react-flow-renderer)
- [MiniMax M2.1 on Vercel AI Gateway](https://vercel.com/changelog/minimax-m2-1-now-live-on-vercel-ai-gateway)
- [Structured Output AI Reliability 2025](https://www.cognitivetoday.com/2025/10/structured-output-ai-reliability/)
- [State Management in 2025](https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k)
