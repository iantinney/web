# Phase 12: Cross-Graph Awareness & Demo Amplification

**A Tight, Presentation-Ready Feature Plan**

---

## What You'll See in the Demo (4.5 minutes)

```
Scene 1: Graph Tab
├─ Show ML concept graph
├─ Hover over ghost node from Linear Algebra plan
└─ Narrate: "The system knows your ML studies build on Linear Algebra"

Scene 2: Learn Tab
├─ Practice a question about backpropagation
├─ Answer incorrectly
├─ See correct answer with Wikipedia citation [1]
├─ Click citation → Wikipedia panel expands
└─ Narrate: "Every question is grounded in verified sources"

Scene 3: Chat Tab
├─ Tutor notices the misconception
├─ Proposes adding "Chain Rule" as prerequisite
├─ Learner approves
└─ Narrate: "The system diagnoses gaps and asks permission to restructure"

Scene 4: Graph Tab
├─ New "Chain Rule" node animates in
├─ Edge appears connecting to Backpropagation
├─ Layout recomputes smoothly
└─ Narrate: "The knowledge graph grows in real time"

Scene 5: Learn Tab
├─ Answer about Linear Regression correctly
├─ See extension suggestion: "Ready to explore Decision Trees?"
├─ Accept proposal
└─ Narrate: "The system also guides what to learn next"

Scene 6: Graph Tab
├─ Show complete structure
├─ Highlight all three features working together
└─ Narrate: "One system. Full adaptive learning loop."
```

**The Story:** From diagnosis → to graph mutation → to guided exploration, all grounded in sources.

---

## Three Core Features

### 1. Cross-Graph Awareness
**Problem:** Each study plan is isolated. You don't see that your ML prerequisites overlap with Linear Algebra.
**Solution:** "Ghost nodes" in the graph show external concepts from other plans, with proficiency status.
**Impact:** Feels like the system understands your entire learning ecosystem.
**Build:** 2–2.5 hours

### 2. Wikipedia Integration
**Problem:** Questions and chat feel disconnected from reality. Is the tutor making this up?
**Solution:** Every question and explanation includes numbered citations. Click to see real Wikipedia articles.
**Impact:** Credibility. "This isn't a chatbot—it's evidence-based teaching."
**Build:** 2–3 hours

### 3. Rich Pre-Seeding + Demo Orchestration
**Problem:** Live demos fail. LLMs are slow. Network is unreliable. Cold starts look empty.
**Solution:** Pre-seeded data (2 study plans, 15 concepts, 45 Wikipedia chunks). Seeded triggers for reliable proposals.
**Impact:** Reproducible demo. Same result every take.
**Build:** 3.5 hours for seeding + orchestration

**Plus Phase 11 Reuse:** Graph mutation APIs already built; Phase 12 wraps them in citations and seeding.

---

## Why Phase 12 Matters for Pitching

| Before Phase 12 | After Phase 12 |
|----------------|----------------|
| "The system can add concepts" | "The system understands your entire learning ecosystem and actively restructures it" |
| Features work individually | Full story arc from practice → diagnosis → growth |
| Requires live LLM (risky) | Pre-seeded demo (reliable) |
| "Here's what you can do..." | "Watch what happens when..." |

**Investor reaction shift:** From "Interesting tech" to "Wow, I actually understand how this helps me learn."

---

## Build Plan: Choose Your Path

### Path A: Minimum Viable (3.5h)
- ✅ Pre-seeded data (12-01)
- ✅ Phase 11 integration with demo mode (12-04)
- ❌ Ghost nodes, Wikipedia
- **Story:** "Watch gap detection and graph restructuring"
- **When:** If you're time-constrained

### Path B: Full Showcase (10–12h)
- ✅ All features: cross-graph, citations, seeding, integration
- ✅ Full demo script
- ❌ Video backup + test suite
- **Story:** "Complete adaptive learning loop"
- **When:** Standard approach (recommended)

### Path C: Bulletproof (12–14h)
- ✅ All features
- ✅ Pre-recorded video backup
- ✅ Playwright test suite
- ✅ Fallback documentation
- **Story:** + "If something breaks, here's the video"
- **When:** You want zero demo-day risk

**Recommendation:** Plan for Path B; do Path C if you have time.

---

## 5 Sub-Phases (10–14 hours total)

| Phase | What | Hours | Critical |
|-------|------|-------|----------|
| **12-01** | Rich seed data (2 plans, 15 concepts, 45 Wikipedia chunks) | 1.5–2 | ⭐ Blocks all others |
| **12-02** | Cross-graph ghost nodes (React Flow component + graph enhancement) | 2–2.5 | Parallel with 12-03 |
| **12-03** | Wikipedia citations (MediaWiki API wrapper + CitationBadge UI) | 2–3 | Parallel with 12-02 |
| **12-04** | Demo orchestration (seeded triggers, fallback responses, script) | 2–3 | Depends on 01–03 |
| **12-05** | Testing + rehearsal (test suite, video, recording guide) | 1–1.5 | Final polish |

**Start with 12-01** (highest critical path) while planning 12-02/12-03 in parallel.

---

## What You Get

### Code Files (New)
- `prisma/seed-demo-cross-graph.ts` — Seed script
- `src/lib/rag/wikipedia.ts` — MediaWiki integration
- `src/components/ui/GhostNode.tsx` — React Flow ghost nodes
- `src/components/ui/CitationBadge.tsx` — Inline citations
- `src/lib/demo-mode.ts` — Seeded triggers
- `e2e/phase-12-demo.spec.ts` — Test suite

### Deliverables
- Fully-seeded demo state (no cold starts)
- Reproducible 4.5-min demo script
- Pre-recorded backup video
- One-page "How to Re-Record Demo"
- Zero-failure-mode fallback documentation

---

## Risk Mitigation

| Worst Case | Mitigation |
|-----------|-----------|
| Wikipedia API is down | All sources pre-fetched locally; demo works offline |
| MiniMax M2 is slow | All proposals use seeded responses; no LLM wait |
| Ghost node layout breaks | Pre-computed layout during seeding |
| Live demo fails | Pre-recorded video backup |
| Someone asks "Can this work with live data?" | Yes—demo mode is optional; live mode also works (just slower/unreliable) |

---

## Talking Points

**For Engineers:**
> "Cross-graph edges are stored separately. Ghost nodes are rendered as React Flow custom nodes with external refs. Wikipedia is fetched via MediaWiki REST API with zero setup. We reuse Phase 11's insertion APIs, so no code duplication."

**For Investors/Judges:**
> "This system doesn't just quiz you—it understands your entire learning universe. It sees where your knowledge domains overlap, proposes structural changes based on misconceptions, and teaches using real-world sources. Watch."

**For Your Teammates:**
> "Phase 12 is about presentation readiness. Phase 11 built the tech. Phase 12 wraps it in a story and pre-seeded data so the demo works reliably every time."

---

## Next Steps

1. **Review & approve** this Phase 12 plan (4 documents created)
2. **Decide: Path A, B, or C?** (Affects scope/timeline)
3. **Start 12-01 immediately** (critical path)
   - Acquire Wikipedia chunks (~30 min)
   - Structure concept maps (15 min)
   - Write seed script (30 min)
   - Test (15 min)
   - **Total: ~2 hours, unblocks everything else**

4. **While 12-01 is running, prepare 12-02 & 12-03**
   - Identify React Flow component needs
   - Design CitationBadge UI

5. **Once 12-01 is done, lock the demo script**
   - Write word-for-word with timestamps
   - Share for feedback

6. **Final week: build + rehearse**
   - Implement all 5 phases
   - Record video
   - Test all fallback paths

---

## Resources

📄 **Phase 12 Documents (in `.planning/phases/12-cross-graph-awareness-and-demo-amplification/`):**
- `README.md` — Executive summary (detailed)
- `12-CONTEXT.md` — Assessment of consultant proposal
- `12-ROADMAP.md` — 5-phase breakdown with hour-by-hour
- `12-01-PLAN.md` — Step-by-step execution for seed data

---

## Questions for You

1. Which path: A (3.5h minimum), B (10–12h full), or C (12–14h bulletproof)?
2. For Wikipedia sources: real text (credible) or synthetic (faster)?
3. For the demo: live LLM calls or fully seeded fallbacks?
4. Want a pre-recorded video backup, or rely on live demo only?

---

## TL;DR

**Phase 12 = Demo-Ready Version of Everything**

Phases 1–11 built the system. Phase 12 makes it presentable.

✅ **What you get:** 4.5-min demo showing cross-domain awareness, citations, and graph mutation—all in one continuous story
✅ **How long:** 10–14 hours (or 3.5 hours for minimum viable)
✅ **Risk:** Low (builds on Phase 11; reuses APIs)
✅ **Impact:** High (this is what closes the deal)

---

**Let's build something that impresses.** 🚀
