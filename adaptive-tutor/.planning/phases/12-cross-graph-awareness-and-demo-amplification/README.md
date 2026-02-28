# Phase 12: Cross-Graph Awareness & Demo Amplification

**Executive Summary for Presentations**

---

## The Story Phase 12 Tells

> *"This is an AI tutor that doesn't just quiz you. It understands how your different domains of study connect, proactively restructures your knowledge graph when it detects gaps, and grounds everything in verified sources. Watch."*

**In 4.5 minutes, show:**
1. How the system knows your Linear Algebra background applies to your ML studies
2. How it cites Wikipedia when teaching
3. How it detects a conceptual gap and proposes adding the missing prerequisite
4. How it visualizes the graph growing in real time

---

## Why Phase 12 Now?

### What Phase 11 Delivered
✅ **Gap detection & graph mutation** — The tutor can propose adding prerequisite/extension nodes
✅ **Keyboard shortcuts + proposal cards** — Seeded triggers for reliable demos
✅ **Integration with learn/chat tabs** — Full end-to-end insertion flow

### What Phase 12 Adds
✅ **Cross-graph awareness** — "Ghost nodes" showing concepts from other study plans (genuinely novel)
✅ **Wikipedia integration** — Every question is cited; click citations to verify sources
✅ **Rich pre-seeding** — Two fully-populated study plans eliminating cold starts
✅ **Polished demo loop** — 4.5-minute story that showcases all features seamlessly

### Together
The system goes from "I can add concepts" (Phase 11) to "I understand your entire learning ecosystem and help you navigate it intelligently" (Phase 12).

---

## Phase 12 Breakdown: 5 Sub-Phases

### 12-01: Rich Seed Data (1.5–2h) ⭐ Critical Path
**What:** Create two interconnected study plans (Linear Algebra + ML) with:
- 15 total concepts across both plans
- Partial mastery in LA (shows ghost nodes are meaningful)
- Pre-fetched Wikipedia chunks for all concepts
- Chat history + session records (feels lived-in)
- Learner profile (background/goals/interests)

**Why:** All other phases depend on this. Without rich demo data, every feature looks empty.

**Deliverable:** `npm run seed:demo` creates fully-populated state

---

### 12-02: Cross-Graph Ghost Nodes (2–2.5h)
**What:** "Ghost nodes" showing external prerequisites from other plans
- Visual: dashed borders, muted colors, source plan label
- Interaction: hover → proficiency from other plan; click → navigate to source plan
- Graph rendering: edges from local concepts to ghosts

**Why:** Shows the system understands interdependencies across domains
**Demo moment:** "Your ML studies build on Linear Algebra you're already learning"

**Example:**
```
ML Concept: Gradient Descent
  ├─ Prerequisite: Cost Functions (local)
  └─ Prerequisite: [EXT] Derivatives (from Linear Algebra plan)
                    ↓ (dashed edge, muted, shows 70% mastery)
```

---

### 12-03: Wikipedia Source Integration (2–3h)
**What:** Citations in every question and explanation
- Question feedback: "[1] According to Wikipedia..."
- Chat responses: tutor cites sources
- Citation UI: click badge → expand to Wikipedia panel (title, section, passage, link)

**Why:** Shows rigor; not a hallucinating chatbot, but evidence-based teaching
**Demo moment:** Click citation → see real Wikipedia article proving the source

---

### 12-04: Phase 11 Integration + Demo Flow (2–3h)
**What:** Orchestrates all 3 features into a unified 4.5-minute demo
- Seeded triggers: specific questions that reliably fire proposals
- Fallback responses: all LLM calls have canned backups
- Demo mode flag: enables scripted flow for reproducibility
- Citations in proposal cards: "Here's what Wikipedia says about Chain Rule"

**Why:** Makes the demo repeatable and presentation-ready

**Demo script (6 scenes, 4.5 min):**
```
Scene 1 (0:00–0:30):  Graph tab — show ghost nodes
Scene 2 (0:30–1:30):  Learn tab — answer wrong, see citation
Scene 3 (1:30–3:00):  Chat tab — tutor proposes gap insertion
Scene 4 (3:00–4:00):  Graph tab — new node animates in
Scene 5 (4:00–4:45):  Learn tab — correct answer, extension suggestion
Scene 6 (4:45–5:00):  Graph tab — show final structure with all 3 features
```

---

### 12-05: Integration Testing + Demo Rehearsal (1–1.5h)
**What:**
- Playwright test suite for happy path (4 scenarios)
- Pre-recorded demo video
- "How to Re-Record Demo" guide (one-person, reproducible)
- Fallback documentation (what to do if X fails)

**Why:** Eliminates demo-day anxiety; you have a video backup

---

## Build Paths to MVP

### Path A: Minimum Viable (3.5h)
✅ 12-01: Rich seed data
✅ 12-04: Seeded demo flow with Phase 11
**Story:** "Watch the tutor diagnose a gap and restructure the graph"
**Best for:** If time is tight; still compelling

### Path B: Full Presentation (10–12h)
✅ All 5 sub-phases
**Story:** "Complete adaptive learning loop with cross-domain awareness and citations"
**Best for:** Full showcase of all capabilities

### Path C: Hackathon-Ready (12–14h)
✅ All 5 sub-phases PLUS
✅ Polished video + fallback guides
✅ Test suite
**Best for:** Zero-failure-mode demo day

**Recommendation:** Aim for **Path B** minimum. If you have extra hours, do Path C for bulletproof demo.

---

## Key Design Decisions

### 1. Cross-Graph Awareness, Not Full Graph Merging
**Decision:** Ghost nodes point to other plans; don't merge them visually
**Rationale:** Simpler, clearer UI; respects that plans are separate learning journeys
**Demo impact:** Still shows the system understands connections

### 2. Wikipedia, Not Custom Vector Store
**Decision:** Use MediaWiki REST API for sources; pre-seed chunks for demo reliability
**Rationale:** No infrastructure; free; real attribution; network-independent demo
**Demo impact:** "Grounded in verified sources" is more credible than "internal database"

### 3. Seeded Triggers for Demo, Live LLM as Bonus
**Decision:** Phase 12-04 pre-computes demo responses; live LLM is optional fallback
**Rationale:** Demos fail when LLM is slow/unavailable; pre-computed guarantees success
**Demo impact:** Reproducible, professional, zero network delays

### 4. Reuse Phase 11 APIs, Don't Rebuild
**Decision:** Phase 12-04 calls existing `analyze-gap`, `suggest-extension`, `concepts/insert`
**Rationale:** No code duplication; leverages proven Phase 11 implementation
**Demo impact:** Focus on orchestration and UI, not reimplementing insertion logic

---

## Success Metrics

| Metric | Success Criterion |
|--------|-------------------|
| **Cross-graph visibility** | Ghost nodes appear in ML graph showing Linear Algebra prerequisites |
| **Citation credibility** | Questions include numbered citations; clicking expands Wikipedia panel |
| **Graph mutation** | Wrong answer → proposal card → Accept → new node animates in graph |
| **Demo smoothness** | Full 4.5-min flow completes without pauses or manual intervention |
| **Presentation clarity** | Each feature explained in ~30-sec segment; audience understands the story |
| **Reproducibility** | One person can re-record demo in <20 min; documented fallback for every failure point |

---

## Files to Create (Summary)

### New Files (Phase 12-01)
- `prisma/seed-demo-cross-graph.ts` — Seed script
- `src/lib/seed-data/` — JSON files for plans, concepts, sources, chat, sessions

### New Files (Phase 12-02)
- `src/components/ui/GhostNode.tsx` — React Flow ghost node component

### New Files (Phase 12-03)
- `src/lib/rag/wikipedia.ts` — MediaWiki API wrapper
- `src/lib/rag/types.ts` — SourceChunk interfaces
- `src/components/ui/CitationBadge.tsx` — Inline citation UI

### New Files (Phase 12-04)
- `src/lib/demo-mode.ts` — Seeded triggers and fallback responses
- `demo/SCRIPT.md` — Word-for-word demo script with timestamps

### New Files (Phase 12-05)
- `e2e/phase-12-demo.spec.ts` — Playwright test suite
- `demo/RECORDING_GUIDE.md` — Step-by-step recording instructions
- `demo/demo.mp4` — Pre-recorded demo video

### Modified Files
- `src/lib/types.ts` — Add SourceChunk, CrossPlanEdge, PendingMutation
- `src/lib/store.ts` — Add cross-graph and source chunk state
- `src/lib/prompts/index.ts` — Add citation-aware question/chat prompts
- `src/app/(tabs)/graph/page.tsx` — Render ghost nodes and cross-plan edges
- `src/app/api/study-plans/[id]/generate-graph/route.ts` — Query other plans' concepts
- `src/app/(tabs)/learn/page.tsx` — Integrate seeded demo triggers (12-04 only)
- `src/app/(tabs)/chat/page.tsx` — Show proposal cards, use fallback tutor responses

---

## Talking Points for Your Presentation

### Opening (30 sec)
> *"Most tutoring systems are reactive—they respond to what you get wrong. This system is proactive. It understands the structure of knowledge, sees where your learning paths overlap, and actively helps you navigate them. Watch what happens when you practice."*

### Cross-Graph Awareness (60 sec)
> *"This learner is studying both linear algebra and machine learning. Notice these dashed nodes—they're 'ghosts' from the linear algebra plan. The system automatically identifies that gradient descent requires derivatives, which you're already learning elsewhere. Your knowledge domains are connected."*

### Citations (30 sec)
> *"Every question is grounded in verifiable sources. Click any citation to see the Wikipedia article it came from. This isn't a chatbot that might hallucinate—it's teaching from evidence."*

### Graph Mutation (60 sec)
> *"Here's where it gets interesting. The learner answered a question about backpropagation incorrectly, revealing a misconception about how derivatives flow. The system didn't just say 'wrong'—it diagnosed the structural gap and proposed adding Chain Rule as a prerequisite. The learner accepts, and the graph is restructured in real time. The system respects autonomy while enabling growth."*

### Closing (30 sec)
> *"This is the full adaptive learning loop: personalization through learner profiles, diagnosis through attempts, structural growth through graph mutation, and credibility through citations. All in one system."*

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Wikipedia API fails during demo | Pre-fetch all sources; demo uses local JSON. Live fetches are bonus. |
| MiniMax M2 is slow | All proposals use seeded responses. LLM is optional fallback. |
| Ghost node layout breaks | Pre-compute layout during seeding; ghost nodes have fixed positions. |
| Demo timing is off | Script has natural pause points; fallback video if live demo takes too long. |
| Someone asks "Can you show this with live data?" | Fallback: show pre-recorded video + explain how seeded mode works |

---

## Estimated Timeline

| Phase | Duration | Critical |
|-------|----------|----------|
| 12-01 | 1.5–2h | ⭐ YES (blocks all others) |
| 12-02 | 2–2.5h | Can run in parallel with 12-03 |
| 12-03 | 2–3h | Can run in parallel with 12-02 |
| 12-04 | 2–3h | Depends on 01, 02, 03 |
| 12-05 | 1–1.5h | Final polish |
| **Total** | **10–14h** | |

**Recommended pace:** 2 hours/day for 5–7 days, OR 3 hours/day for 4 days

---

## Next Steps

1. **Approve Phase 12 scope** (this document)
   - Confirm 5 sub-phases and effort estimate
   - Identify any scope changes

2. **Begin Phase 12-01** immediately
   - Acquire Wikipedia chunks (can be done in parallel with other work)
   - Structure concept maps

3. **Lock the demo script** before building
   - Write word-for-word script with timestamps
   - Share for feedback (ensures story clarity)

4. **Parallel work** (once 12-01 is halfway done)
   - Phase 12-02: Ghost node component
   - Phase 12-03: Wikipedia integration

5. **Demo rehearsal** (once all code is done)
   - Run through script 2–3 times
   - Record final video
   - Test all fallback paths

---

## Questions for You

1. **Do you want Path A (minimum), Path B (full), or Path C (polished)?**
   - Path A is doable in 3.5 hours and still compelling
   - Path B is ideal; gives full showcase
   - Path C is bulletproof; adds video + testing

2. **For Wikipedia sources, do you want real text copied from Wikipedia, or synthetic summaries?**
   - Real text is more credible but requires manual copying (30 min per Wikipedia visit)
   - Synthetic can be faster but should be clearly marked as demo data

3. **Should we enable live MiniMax calls in the demo, or stick with fully seeded fallbacks?**
   - Seeded is safer (zero network dependency)
   - Live is more impressive ("Look, it's really calling the API")
   - Both can work with proper fallbacks

4. **Do you want to pre-record a video as backup, or rely entirely on live demo?**
   - Pre-recorded eliminates demo-day anxiety but feels less interactive
   - Live is impressive but risky
   - Recommend: pre-recorded as backup, attempt live, fall back to video if needed

---

## Resources

- **12-CONTEXT.md** — Assessment of consultant proposal + Phase 12 synthesis
- **12-ROADMAP.md** — Detailed 5-phase breakdown with hour-by-hour breakdown
- **12-01-PLAN.md** — Step-by-step execution plan for Phase 12-01 (critical first phase)
- **12-02-PLAN.md** — (To be created) Detailed plan for ghost nodes
- **12-03-PLAN.md** — (To be created) Detailed plan for Wikipedia integration
- **12-04-PLAN.md** — (To be created) Detailed plan for demo orchestration
- **12-05-PLAN.md** — (To be created) Detailed plan for testing + rehearsal

---

## TL;DR

**Phase 12 = Everything Before Was Setup; This Is The Show**

Phase 11 gave you the tech (gap detection, graph insertion). Phase 12 wraps it in a compelling 4.5-minute story with pre-seeded data, cross-domain awareness, and evidence-based citations. The result is a demo that makes sense to every audience member, from engineers ("Look at the architecture") to non-technical people ("Wow, the system actually understands me").

**Budget:** 10–14 hours
**Risk:** Low (builds on Phase 11; reuses APIs)
**Demo Impact:** High (this is what you show investors/judges)

---

*Phase 12 planning complete. Ready to begin Phase 12-01 (Rich Seed Data).*
