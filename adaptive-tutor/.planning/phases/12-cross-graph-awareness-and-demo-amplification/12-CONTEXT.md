# Phase 12: Cross-Graph Awareness & Demo Amplification

**Phase:** 12 of 12+ (cross-graph-awareness-and-demo-amplification)
**Estimated Effort:** 10–14 hours
**Goal:** Build on Phase 11's gap/extension insertion to add cross-graph awareness and demo-quality seeding that showcases the full adaptive learning loop end-to-end.

---

## Assessment of Consultant Proposal

### What's Good ✅
1. **Demo structure is solid** — 4-5 min story arc from practice → gap detection → graph mutation
2. **Cross-graph awareness is novel** — currently no multi-plan visibility; "ghost nodes" are genuinely new
3. **Wikipedia integration shows authority** — grounding in sources is powerful for credibility
4. **Pre-seeding insight is critical** — live LLM calls are risky for demos; pre-computed flow is smart

### What's Misaligned ❌
1. **Gap/extension insertion already exists** (Phase 11) — consultant proposed building this; we already have it
2. **RAG is secondary** — citations are nice but don't drive core value prop (personalized adaptive learning)
3. **Cross-plan assumptions** — proposal assumes users have multiple plans; architecture didn't support this until now
4. **Effort estimates** — 10–14 hours is realistic but tight without clear sequencing
5. **Missing learner profiles** — Phase 6 already personalizes tutor; proposal doesn't leverage this

### Synthesis
The proposal is **presentation-focused** (good!) but **feature-complete already** on gap/extension (built in Phase 11).

**Phase 12 should:**
- ✅ Reuse Phase 11's insertion APIs (don't rebuild)
- ✅ Add cross-graph awareness as headline feature (genuinely new)
- ✅ Add Wikipedia sources as supporting evidence (shows rigor)
- ✅ Create rich pre-seeding that makes every tap interesting (demo enabler)
- ✅ Integrate learner profiles for true personalization (Phase 6 + Phase 12 together)

---

## Why Phase 12 Matters for the Presentation

**The Story We Tell:**

> *"This is an AI tutor that doesn't just quiz you. It understands your learning state, adapts in real time, and grows your knowledge graph as you learn. It knows what you're missing, suggests what's next, and—uniquely—it connects across all your domains of study."*

**Phase 11 delivers:** Gap detection & graph mutation (downward + upward growth)
**Phase 12 delivers:** Cross-domain awareness (horizontal connections) + Evidence-based teaching + Demo readiness

Together: **A complete adaptive learning loop** that's beautiful and convincing.

---

## Key Design Constraints

### Architectural Reality
- **Zustand store** already has `activeStudyPlanId` — Phase 12 must add cross-plan query capability
- **React Flow** renders single graph at a time — "ghost nodes" are visual markers pointing to other plans, not full navigation
- **JSON file persistence** is simple but query-inefficient — Phase 12 filters in memory, not in DB
- **Phase 11 APIs** (analyze-gap, suggest-extension, concepts/insert) are proven — reuse them directly

### Demo Constraints
- **Network reliability** — Wikipedia fetches might fail; pre-seed all sources locally
- **LLM availability** — canned responses for seeded data; real LLM is bonus
- **Time pressure** — 4-5 min demo means every UI element must have a purpose
- **Narrative clarity** — each feature must reinforce the "adaptive + connected + evidenced" message

---

## Phase 12 Breakdown

### **Sub-phase 12-01: Rich Seed Data + Cross-Plan Structure**
**Hours: 1.5–2**
**Deliverables:**
- Two pre-seeded study plans: "Linear Algebra Fundamentals" (partial mastery) + "Intro to Machine Learning" (active)
- Cross-plan edge mappings (e.g., "Gradient Descent" in ML requires "Derivatives" from Linear Algebra)
- Pre-fetched Wikipedia source chunks for all 15 concepts (eliminates network dependency in demo)
- Chat history showing tutor helping the learner
- Proficiency snapshots and session records for realism

**Why first?** All other phases depend on this rich demo state.

### **Sub-phase 12-02: Cross-Graph Ghost Nodes**
**Hours: 2–2.5**
**Deliverables:**
- Data model: `ConceptNode.externalRef` + `CrossPlanEdge` type
- `generate-graph` enhancement: query other plans' concepts before generation
- React Flow `GhostNodeComponent` with dashed borders and proficiency display
- Hover tooltips showing source plan + mastery status
- Graph page integration to render ghost nodes alongside local concepts

**Why here?** Foundational for showing multi-plan connectivity; doesn't depend on Phase 11.

### **Sub-phase 12-03: Wikipedia Source Integration**
**Hours: 2–3**
**Deliverables:**
- `lib/rag/wikipedia.ts`: search + fetch + chunk functions (MediaWiki API wrapper)
- `CitationBadge` component: inline numbered citations with expandable source panels
- Integration with question generation: cite sources in feedback
- Integration with chat: tutor references Wikipedia articles
- MiniMax function calling tool for `search_knowledge_base` (optional agentic layer)

**Why here?** Independent from Phase 11; enables citations in both questions and chat.

### **Sub-phase 12-04: Phase 11 Enhancement + Unified Demo Flow**
**Hours: 2–3**
**Deliverables:**
- Bind Phase 11's `analyze-gap` + `suggest-extension` to seeded demo triggers
- Wire Phase 11's `GapProposalCard` + `ExtensionProposalCard` to use Wikipedia citations
- Add "ghost node prerequisite" detection: suggest adding external prerequisite from other plan
- Create unified demo script that hits all 4 features in 4-5 min
- Demo-quality pre-computed fallbacks for all LLM calls

**Why here?** Orchestrates everything into a coherent story.

### **Sub-phase 12-05: Integration Testing + Demo Rehearsal**
**Hours: 1–1.5**
**Deliverables:**
- Full demo script with timestamps and fallback paths
- Browser test suite (Playwright) for happy path: wrong answer → gap card → insert → graph updates
- Record a clean demo video showing the full loop
- Documentation: "How to Re-Record Demo" (one-person, reliable guide)

**Why here?** Lock in the experience before presentation day.

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Wikipedia API unreachable during live demo | High | Pre-fetch all sources; demo uses local JSON store. Live fetches only for live-mode bonus feature. |
| MiniMax M2 is slow or unavailable | High | All LLM calls are opt-in. Seeded flow uses pre-computed responses. Graph mutation, gap analysis all have canned fallbacks. |
| Cross-plan ghost node layout breaks | Medium | Pre-compute dagre layout during seeding with fixed ghost node positions at periphery. No dynamic layout for ghosts. |
| Citation chunking produces poor segments | Medium | Manually QA all 15 concepts' source chunks during Phase 12-01. For 15 concepts, this is ~1 hour of editorial work. |
| Phase 11 insertion APIs aren't flexible enough | Medium | Phase 12-04 can extend them with a wrapper if needed. No changes to Phase 11 core. |
| Demo timing (4-5 min) is too tight | Medium | Pre-record 2-3 takes. Have a "skip intro" version if needed. Script has natural pause points for Q&A. |

---

## Success Criteria

1. ✅ Cross-graph ghost nodes appear in ML graph, showing Linear Algebra concepts
2. ✅ Ghost node shows source plan + proficiency on hover
3. ✅ Questions and chat messages include numbered citations
4. ✅ Clicking citation expands source panel with real Wikipedia content
5. ✅ Phase 11 gap/extension proposal cards integrate seamlessly
6. ✅ Full demo loop (wrong answer → proposal → insertion → graph update) runs in <5 min
7. ✅ All features work with pre-seeded data (network-independent)
8. ✅ Zero TypeScript errors; successful build
9. ✅ Demo script is documented and reproducible (one-person can record it)

---

## Files Involved

### New Files
- `src/lib/rag/wikipedia.ts` — MediaWiki API wrapper
- `src/lib/rag/types.ts` — SourceChunk, WikiSearchResult types
- `src/components/ui/CitationBadge.tsx` — Inline citation with expandable panel
- `src/components/ui/GhostNode.tsx` — React Flow custom node for external prerequisites
- `.planning/phases/12-cross-graph-awareness-and-demo-amplification/12-0X-PLAN.md` — Sub-phase plans

### Modified Files
- `src/lib/types.ts` — Add SourceChunk, CrossPlanEdge, PendingMutation types
- `src/lib/store.ts` — Add sourceChunks state, ghost node handling
- `src/lib/prompts/index.ts` — Add citation-enhanced and diagnosis prompts
- `src/app/(tabs)/graph/page.tsx` — Register ghost node type, render cross-plan edges
- `src/app/api/study-plans/[id]/generate-graph/route.ts` — Query other plans' concepts
- `prisma/seed-test-accounts.ts` or equivalent — Add two-plan seeding
- Demo script / README — New documentation

---

## Presentation Talking Points

### For Each Feature

**Cross-Graph Awareness:**
> "The learner has multiple study plans active. This system understands they're interdependent—it shows that 'Gradient Descent' requires 'Derivatives' which they're already learning in Linear Algebra. These ghost nodes are living connections across domains."

**Graph Mutation (Phase 11 + 12):**
> "When the learner struggles, the AI doesn't just say 'you got it wrong.' It diagnoses the structural gap and proposes adding the missing prerequisite to the graph. The learner maintains agency—they accept, modify, or decline. The graph grows."

**Wikipedia Integration:**
> "Every question is grounded in verifiable sources. Click any citation to see the exact Wikipedia article and section the question came from. This isn't just a chatbot—it's evidence-based teaching."

**Learner Profiles (Phase 6 integration):**
> "The system learns who this person is—their background, goals, interests. Every explanation is personalized to their context."

### Demo Arc
1. **Scene 1 (20 sec):** Graph tab — show ML concepts, hover ghost node for Linear Algebra
2. **Scene 2 (60 sec):** Learn tab — answer incorrectly, see citation in feedback, click to view source
3. **Scene 3 (90 sec):** Chat tab — tutor suggests missing prerequisite, proposal card appears
4. **Scene 4 (60 sec):** Accept proposal, graph updates with animation, new node appears
5. **Scene 5 (45 sec):** Correct answer → extension suggestion, accept, practice starts
6. **Scene 6 (30 sec):** Graph tab — show updated structure with all 3 features working together

**Total: 4–5 minutes. Tells the full story.**

---

## Next Steps

1. **Approve Phase 12 scope** — confirm cross-graph + Wikipedia + demo-seeding is the plan
2. **Create sub-phase plans** — 12-01 through 12-05 detailed execution plans
3. **Lock demo script** — write word-for-word script with timestamps
4. **Begin Phase 12-01** — seed data creation (highest critical path)

---

*Context prepared for Phase 12 planning.*
