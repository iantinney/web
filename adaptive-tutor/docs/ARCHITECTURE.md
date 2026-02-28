# System Architecture & Design Decisions

## State Management Flow

### Zustand Store (`src/lib/store.ts`)

The global state manages three independent concerns:

```typescript
// 1. Study Plans (curriculum level)
activeStudyPlanId: string | null
studyPlans: StudyPlan[]

// 2. Unit Graphs (learning path lens)
activeUnitGraphId: string | null
unitGraphs: UnitGraph[]

// 3. Graph Data (concept + relationships for current graph)
graphConcepts: Concept[]
graphMemberships: GraphMembership[]
graphEdges: ConceptEdge[]
sharedConceptIds: string[]
```

**Design Rationale:**
- Separating `activeUnitGraphId` from `activeStudyPlanId` allows viewing graphs from different study plans
- `graphMemberships` and `graphEdges` are scoped to `activeUnitGraphId` (loaded via `loadUnitGraphData()`)
- `sharedConceptIds` computed per graph to highlight concept reuse

### Data Loading Pipeline

```
User loads Chat → AppInitializer → loadStudyPlans()
                                  → setUnitGraphs() (all graphs for user)
                                  → loadUnitGraphData(firstGraphId)
                                  → setGraphConcepts(), setGraphMemberships(), setGraphEdges()

User clicks graph in sidebar → handleGraphSelect() → loadUnitGraphData(graphId)
                                                   → store updates with new graph data
```

## Concept Deduplication Algorithm

### Problem
When two study plans both mention "Linear Algebra", creating separate ConceptNode records prevents:
1. Cross-graph proficiency sharing (studying in Graph A shouldn't advance Graph B)
2. Efficient question reuse (two question pools for same concept)
3. Unified learner profile (LLM can't see concept relationships)

### Solution: Confidence-Weighted Merge

```typescript
// In findOrCreateConcept(userId, name, description, keyTerms)

const nameNormalized = name.trim().toLowerCase()

// 1. Check if concept already exists for this user
const existing = await prisma.concept.findUnique({
  where: { userId_nameNormalized: { userId, nameNormalized } }
})

if (existing) {
  // 2. Merge proficiency using confidence weighting
  const merged = {
    proficiency: (existingProf * existingConf + newProf * newConf) / (existingConf + newConf),
    confidence: Math.max(existingConf, newConf),
    attemptCount: existingAttempts + newAttempts,
    // Keep richer description
    description: newDesc.length > existingDesc.length ? newDesc : existingDesc,
  }

  // 3. Return existing concept with merged proficiency
  return { id: existing.id, wasReused: true }
}

// 4. Create new concept with inference-seeded proficiency
const newConcept = await prisma.concept.create({
  data: {
    userId,
    name,
    nameNormalized,
    proficiency: inferInitialProficiency(priorKnowledge, description),
    confidence: 0.3, // seed low confidence for inference
    // ...
  }
})

return { id: newConcept.id, wasReused: false }
```

**Confidence Weighting Rationale:**
- High-confidence proficiency (0.9) should override low-confidence inference (0.2)
- Merged confidence = max(confA, confB) ensures uncertainty doesn't increase
- Attempt count sums to preserve interaction history

### Impact on User Experience

**Scenario:** User creates "ML Foundations" after "Linear Algebra"

1. **During graph generation:** LLM identifies "eigenvalues" in both plans
2. **Structure endpoint:** `findOrCreateConcept("eigenvalues", ...)` finds existing
3. **Result:** Same Concept used in both UnitGraphs via different GraphMemberships
4. **Proficiency:** User's mastery of "eigenvalues" appears in both graphs
5. **Layout:** Can have different positionX/Y in each graph (via GraphMembership)

## Graph Layout & Positioning

### DAG Layout Algorithm (`computeDAGLayout`)

```typescript
// 1. Topological sort → assigns "depth tier" (longest path from root)
// 2. Breadth calculation → counts nodes at each depth
// 3. Position assignment:
//    - Y = depth * TIER_SPACING (vertical position by tier)
//    - X = assigned node index * NODE_WIDTH (horizontal spread)
//    - Random jitter to prevent overlaps

const TIER_SPACING = 150
const NODE_WIDTH = 200
```

**Design Rationale:**
- Hierarchical layout reflects prerequisite structure (roots at top, leaves at bottom)
- Depth tier (topological) is stable across user edits (unlike arbitrary numbering)
- Stored in GraphMembership.depthTier for future analytics (e.g., "how deep is this curriculum?")

## Concept Edge Types

### Prerequisite vs Helpful

```typescript
// ConceptEdge.edgeType: "prerequisite" | "helpful"

"prerequisite" → Must understand source before target
                 Rendered as solid line, counts in mastery calculations

"helpful" → Useful context but not required
           Rendered as dashed line, doesn't block progress
```

**Display:**
- Solid lines: stroke=2px, full opacity
- Dashed lines: stroke=1px, 50% opacity, strokeDasharray="5,5"

**Question Selection:** (Future Phase 4)
- Prerequisite edges will gate new concepts (can't practice "Eigenvalue Decomposition" if "Linear Independence" not mastered)
- Helpful edges used for context in question generation

## Multi-Graph Architecture

### Why Multiple Unit Graphs per Study Plan?

A single lesson plan can have multiple "views":

```
"Python Mastery" Study Plan
├── UnitGraph 1: "Syntax & Basics" (filtered by tier 1)
├── UnitGraph 2: "Intermediate Patterns" (filtered by tier 2)
└── UnitGraph 3: "Advanced Concepts" (filtered by tier 3)
```

**Current Implementation:** Creates one UnitGraph per connected component in the concept graph

**Future Enhancement:** Could split by difficulty tier or learning path

### Shared Concepts Computation

```typescript
// In /api/unit-graphs/[id] endpoint

const memberships = await prisma.graphMembership.findMany({
  where: { unitGraphId: graphId },
  select: { conceptId: true }
})

const conceptIds = memberships.map(m => m.conceptId)

const sharedInOtherGraphs = await prisma.graphMembership.findMany({
  where: {
    conceptId: { in: conceptIds },
    unitGraphId: { not: graphId },
    unitGraph: { studyPlanId: studyPlanId } // Optional: same study plan only
  },
  select: { conceptId: true, distinct: ['conceptId'] }
})

return {
  sharedConceptIds: sharedInOtherGraphs.map(m => m.conceptId)
}
```

**Visual Feedback:**
- Shared concepts show green glow ring (via CSS filter on ConceptNode)
- NodeDetailPanel shows "Also in: [other graph names]"
- Summary bar: "X concepts shared with Y other graphs"

## Question Generation & Storage

### Current (Phase 3)

```
structure-plan endpoint → creates UnitGraph + GraphMembership
                       → (does NOT generate questions)

User navigates to Learn tab → (stub, no questions generated)
```

### Phase 4 (Planned)

```
POST /api/study-plans/[id]/generate-questions
├─ Load all concepts for study plan (via UnitGraph → GraphMembership)
├─ For each concept: call MiniMax with concept details
├─ Parse questions JSON (array of MCQ, flashcard, free_response items)
├─ Store in Question table (conceptId, not studyPlanId)
├─ Return success status

GET /api/study-plans/[id]/questions?due=1&limit=20
├─ Filter concepts by "due" status (using SM-2 nextDue)
├─ Score concepts: prerequisites get boost, overdue gets boost
├─ Select per-concept cap (3 questions per concept)
├─ Return balanced question set
```

### Question Freshness (Phase 4)

**Old Approach (REMOVED):**
```typescript
// WRONG: isUsed = true globally
Question.isUsed = true  // Question unavailable for ANY user session
```

**New Approach:**
```typescript
// RIGHT: Track per-session
// In practice session, questions are fresh if they have no AttemptRecord
// with that sessionId

POST /api/attempts
├─ { sessionId, questionId, response, timeSpent }
├─ Create AttemptRecord
├─ Update Concept proficiency via SM-2
├─ Return feedback
```

**Benefit:** Same question can be reused across sessions without state pollution

## Error Handling Strategy

### At Boundaries (User Input)

```typescript
// ❌ Trust unvalidated data
const { title } = req.body

// ✅ Validate at system boundary
const schema = z.object({ title: z.string().min(1).max(200) })
const { title } = schema.parse(req.body)
```

### Internal APIs (Service Layer)

```typescript
// ❌ Over-validate internal calls
async function createConcept(name: string) {
  if (!name) throw new Error("Name required") // Redundant
}

// ✅ Trust framework + type system
async function createConcept(name: string) {
  // TypeScript ensures name is string
  // Caller responsible for validation
}
```

### API Response Errors

```typescript
// 400: Validation error (client's fault)
// 401: Unauthorized
// 404: Not found
// 500: Internal error (server's fault, should be rare)
// 502: External service error (MiniMax API down)
```

## Performance Considerations

### Implemented
- ✅ GraphMembership `unitGraphId` index (fast graph-scoped queries)
- ✅ Concept `userId_nameNormalized` unique index (dedup lookup)
- ✅ Store memoization via `useMemo()` in React (prevent re-renders)
- ✅ Async data loading (don't block UI)

### Future Optimizations
- [ ] Add ConceptEdge `unitGraphId` index for question selection
- [ ] Cache API responses (graphs change infrequently)
- [ ] Paginate large concept graphs (1000+ concepts)
- [ ] Database query analysis (detect N+1 issues)
- [ ] Code splitting for React Flow (large dependency)

## Security Considerations

### User Isolation
- ✅ All queries filter by `userId` (no cross-user leaks)
- ✅ Auth middleware enforces user context
- ❌ No CSRF tokens (not applicable for hackathon + minimal auth)

### Input Validation
- ✅ All API inputs validated with Zod schemas
- ❌ XSS prevention (assumed Tailwind + React prevent injection)
- ❌ SQL injection (Prisma parameterizes all queries)

### Data Privacy
- ❌ No encryption at rest (hackathon scope)
- ❌ No TLS enforcement (assumes localhost dev only)
- ❌ No audit logs (future: log concept edits + sessions)

## Testing Strategy (Not Yet Implemented)

### Unit Tests
- Concept deduplication logic
- DAG validation + cycle breaking
- Proficiency inference formula
- Question selection scoring

### Integration Tests
- Chat → structure-plan flow
- Graph loading + switching
- Shared concept computation
- Multi-graph CRUD

### E2E Tests
- New user flow (auth → chat → graph)
- Multi-graph switching
- Concept editing (future)

## Observability

### Logging
- ❌ No structured logging (use `console.error()` for now)
- ❌ No request tracing (no trace IDs)
- ❌ No performance metrics

### Debugging
- ✅ Prisma Studio: `npx prisma studio` (inspect database)
- ✅ Network tab: inspect API requests/responses
- ✅ React DevTools: inspect store and component state
