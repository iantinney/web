# Known Issues & Future Work

## Known Issues (Phase 3)

### 1. Learn Tab is a Stub
**Status:** Not implemented
**Impact:** Users can't practice yet
**Workaround:** Placeholder component, no errors but no functionality
**Fix (Phase 4):** Implement `src/app/(tabs)/learn/page.tsx` with:
- Session creation
- Question selection from API
- User response input
- Feedback + SM-2 updates
- Progress tracking

---

### 2. Questions Generated Once, Never Regenerated
**Status:** By design (Phase 3 limitation)
**Impact:** If user exhausts question pool, no new questions available
**Symptom:** Learn tab will be limited to ~10-20 questions per concept
**Fix (Phase 4):** Implement `/api/study-plans/[id]/generate-questions` endpoint to regenerate on demand

---

### 3. File Upload is a Placeholder
**Status:** POST /api/upload exists but does nothing
**Impact:** Users can't upload study materials
**Workaround:** Paste text directly in chat
**Fix (Phase 4):** Implement file parsing (PDF, markdown, plain text)

---

### 4. SM-2 Spaced Repetition Not Used
**Status:** Fields exist (nextDue, easeFactor, interval) but not queried
**Impact:** Questions appear randomly rather than spaced optimally
**Symptom:** Concept.nextDue is always null (never gets set)
**Root Cause:** `POST /api/study-plans/[id]/attempt` endpoint doesn't exist yet
**Fix (Phase 4):** Implement attempt recording with SM-2 scheduling

---

### 5. No Analytics Dashboard
**Status:** Not implemented
**Impact:** Users can't track learning progress over time
**Future:** Dashboard showing:
- Learning velocity (concepts mastered per day)
- Knowledge gaps (low-proficiency concepts)
- Study time allocation
- Session history

---

### 6. Concept Fragmentation Prevention is Synchronous Only
**Status:** Concept deduplication works but async fuzzy matching stubbed
**Impact:** "Matrix Multiplication" vs "Matrix Operations" create separate concepts
**Current Behavior:** Exact name match only
**Future:** Add async fuzzy-matching agent (runs after graph creation, notifies user of potential merges)

---

## Edge Cases & Limitations

### 1. Multi-Component Graphs
**Scenario:** Lesson plan with disconnected topics (e.g., "Python" + "Math")
**Current Behavior:** Creates one UnitGraph per connected component (correct)
**Potential Issue:** User might not expect multiple graphs from one lesson plan
**Mitigation:** Chat should clarify when proposing multi-component plans

---

### 2. Circular Dependencies
**Scenario:** LLM generates edges that form cycles (e.g., A→B→C→A)
**Current Behavior:** `breakCycles()` removes edges based on difficultyTier heuristic
**Potential Issue:** Removed edges might be user-meaningful (e.g., "Generics" is both a prerequisite and helpful for "Functional Programming")
**Mitigation:** Log removed edges; future UI could show "simplified view" option

---

### 3. Concept Deduplication Conflicts
**Scenario:** User creates two study plans with same concept but different descriptions
**Current Behavior:** Uses confidence-weighted merge; longer description wins
**Potential Issue:** User's updated description gets overwritten by older inference
**Fix:** Store description history or allow user to choose which description to keep

---

### 4. Large Graphs (1000+ Concepts)
**Scenario:** MBA curriculum with many prerequisites
**Current Behavior:** React Flow renders all nodes (no virtualization)
**Potential Issue:** UI will lag with 1000+ nodes
**Mitigation:** Implement React Flow virtualization or depth-based filtering

---

### 5. Browser Storage Limits
**Scenario:** User has 10+ large study plans
**Current Behavior:** All graphs loaded into Zustand store on init
**Potential Issue:** Browser localStorage might hit 5-10MB limit
**Mitigation:** Implement pagination or lazy loading of graphs

---

### 6. Shared Concepts with Different Positions
**Scenario:** "Variables" appears in "Python 101" at position (100, 200) and "Python Advanced" at position (500, 600)
**Current Behavior:** Positions stored per GraphMembership (correct)
**Potential Issue:** ConceptNode component needs to read position from store membership, not concept
**Status:** ✅ Fixed in Phase 3 update

---

## Performance Bottlenecks

### 1. N+1 Query: Concept Enrichment
**Location:** `src/app/api/unit-graphs/route.ts`
**Issue:** Fetches all memberships for each graph sequentially
```typescript
// ❌ N+1 pattern
const enriched = await Promise.all(
  unitGraphs.map(async (graph) => {
    const memberships = await prisma.graphMembership.findMany({...})
    // ✓ Parallelized but could be single query
  })
)
```
**Fix:** Use Prisma aggregation or single JOIN query

---

### 2. Missing Index on GraphMembership
**Location:** `prisma/schema.prisma`
**Issue:** Queries `graphMembership.find({ where: { unitGraphId } })` without index
**Impact:** Slow for large graphs (100+ concepts)
**Fix:** Add `@@index([unitGraphId])` to GraphMembership

---

### 3. React Flow Re-renders
**Location:** `src/app/(tabs)/graph/page.tsx`
**Issue:** Entire graph re-renders when any node is clicked
**Impact:** Noticeable lag with 200+ nodes
**Fix:** Memoize individual node components with `React.memo()`

---

### 4. LLM API Latency
**Location:** `/api/chat` and `/api/study-plans/[id]/structure-plan`
**Issue:** MiniMax API calls can take 5-10 seconds
**Impact:** User sees loading spinner; UX feels slow
**Mitigation:** Add optimistic UI updates or streaming responses

---

## Security Gaps

### 1. No CORS Protection
**Status:** Not implemented
**Risk:** Medium (CSRF attacks possible if user visits malicious site)
**Fix:** Add CORS middleware to validate Origin header

---

### 2. No Rate Limiting
**Status:** Not implemented
**Risk:** Low (localhost only) but important for production
**Fix:** Implement middleware (e.g., `next-rate-limit`) or use third-party service

---

### 3. No Input Sanitization
**Status:** Zod validates schema but doesn't sanitize XSS/injection
**Risk:** Low (React auto-escapes HTML) but best practice
**Fix:** Add DOMPurify or similar HTML sanitizer for user-generated content

---

### 4. Study Plan Visibility
**Status:** All queries filter by userId (correct)
**Risk:** Low, no known leaks
**Test:** Verify user A cannot access user B's graphs via API

---

## Scalability Concerns

### 1. Database Growth
**Projection (1000 users, 10 study plans each, 50 concepts avg):**
- Concepts: 500K
- UnitGraphs: 10K
- GraphMemberships: 500K
- ConceptEdges: 1M+
- Questions: 5M+

**Current Bottleneck:** Full table scans for concept dedup (no full-text index)
**Mitigation:** Add `nameNormalized` index (✓ done), plan sharding for Concepts table

---

### 2. API Concurrency
**Projection (100 concurrent users generating graphs):**
- 100 × 5 MiniMax API calls (chat + structure + questions) = 500 calls/min
- MiniMax rate limit: ~60 req/min per API key

**Current Bottleneck:** Single API key
**Mitigation:** Implement request queue, fallback to lower-capacity model

---

### 3. File Upload Storage
**Current:** No file storage (placeholder only)
**Projection:** 1000 users × 5 files × 10MB avg = 50GB/year
**Plan:** Use S3 or similar object storage with pre-signed URLs

---

## Future Work (Phase 4+)

### Priority 1: Core Learning Flow
- [ ] Implement Learn tab with question rendering
- [ ] Implement attempt recording + SM-2 scheduling
- [ ] Add session creation/completion endpoints
- [ ] Display mastery progression and knowledge gaps

### Priority 2: Content Management
- [ ] Implement file upload + parsing
- [ ] Implement question regeneration API
- [ ] Add concept editing UI (name, description, edges)
- [ ] Add graph splitting/merging

### Priority 3: Analytics
- [ ] Learning dashboard (velocity, gaps, time spent)
- [ ] Session history and replay
- [ ] Concept relationship strength analysis
- [ ] Recommended study paths

### Priority 4: Advanced Features
- [ ] Collaborative graphs (share with classmates)
- [ ] AI-powered study recommendations
- [ ] Integration with external content (YouTube, Khan Academy)
- [ ] Export graphs as study guides (PDF, markdown)

### Priority 5: Infrastructure
- [ ] Database sharding for Concepts table
- [ ] Request queue for MiniMax API calls
- [ ] Caching layer (Redis or similar)
- [ ] Database query monitoring
- [ ] Structured logging + observability
- [ ] E2E test coverage

---

## Deprecated / Removed

### GraphPillSelector (Phase 3)
**Removed:** Horizontal pill bar for graph switching
**Reason:** Duplicate of MultiGraphSelector sidebar
**Replacement:** Use MultiGraphSelector (left sidebar)
**Status:** ✅ Removed in Phase 3 update

---

### `Question.isUsed` Boolean (Phase 0 Migration)
**Removed:** Global "used" flag on Question
**Reason:** Prevents question reuse across sessions; breaks multi-graph architecture
**Replacement:** Check AttemptRecord (sessionId + questionId) instead
**Status:** ✅ Removed during schema migration

---

### `ConceptNode` Model (Phase 0 Migration)
**Removed:** Plan-scoped concept nodes
**Reason:** Prevented cross-graph proficiency sharing
**Replacement:** Global Concept + GraphMembership architecture
**Status:** ✅ Migrated in Phase 0

---

## Testing Checklist

### Automated Tests (Not Yet Implemented)
- [ ] Unit: Concept deduplication logic
- [ ] Unit: DAG validation + cycle breaking
- [ ] Unit: SM-2 proficiency calculation
- [ ] Integration: Chat → structure-plan flow
- [ ] Integration: Multi-graph CRUD
- [ ] E2E: User signup → graph creation → practice

### Manual Testing
- [✓] New user flow (auth → chat → graph creation)
- [✓] Multi-graph switching
- [✓] Shared concept highlighting
- [✓] API endpoints (curl tests)
- [ ] Large graph performance (200+ concepts)
- [ ] Concurrent users (stress test)
- [ ] Mobile responsiveness (React Flow is desktop-optimized)

---

## Design Decisions to Revisit

### 1. Should Concepts Be Global or Plan-Scoped?
**Current:** Global (user-scoped)
**Pros:** Proficiency sharing, question reuse, unified learner model
**Cons:** Concept fragmentation if names differ slightly
**Alternative:** Plan-scoped with explicit merge UI
**Recommendation:** Keep global; add fuzzy-matching agent in Phase 4

---

### 2. Should UnitGraphs Be Implicit or Explicit?
**Current:** Implicit (created per connected component during graph gen)
**Pros:** No user action needed, natural grouping
**Cons:** User might not expect multiple graphs from one lesson plan
**Alternative:** Create single UnitGraph, let user split if desired
**Recommendation:** Keep implicit; add notification in proposal

---

### 3. Should Shared Concepts Be Visual or Algorithmic?
**Current:** Both (visual glow rings + algorithmic blocking)
**Pros:** User awareness + correct behavior
**Cons:** Slightly more complex UI
**Alternative:** Visual only (just highlight, no behavior)
**Recommendation:** Keep both; user feedback is positive

---

## Recommendations for Reviewers

### Code Review Focus
1. **Concept dedup merge formula** - Is confidence-weighted average optimal?
2. **DAG cycle breaking** - Does difficultyTier heuristic make sense?
3. **Question selection scoring** - Are prerequisites weighted correctly?
4. **API error handling** - Do we handle all edge cases?

### Architecture Review
1. **Schema design** - Is Concept/UnitGraph/GraphMembership separation sound?
2. **State management** - Is Zustand store structure optimal?
3. **API design** - Are endpoints RESTful and consistent?
4. **Performance** - Any obvious bottlenecks?

### User Experience
1. **Onboarding** - Is signup/chat flow intuitive?
2. **Graph exploration** - Can users understand concept relationships?
3. **Terminology** - Are "UnitGraph" and "GraphMembership" clear terms?
4. **Mobile** - How does it feel on mobile devices?

### Data Integrity
1. **Multi-user isolation** - Can users see each other's graphs?
2. **Concurrent updates** - What happens if two users edit same concept?
3. **Cascading deletes** - If study plan deleted, are orphans cleaned up?
4. **Transaction safety** - Are graph creation writes atomic?
