# Documentation for Model Review & Critique

This guide explains which documents to share with AI models (Claude, GPT, etc.) for architectural review, design feedback, and improvement suggestions.

## Quick Reference

### Share These Documents:

| Document | Purpose | Reviewer Type | Priority |
|----------|---------|---------------|----------|
| **PROJECT_OVERVIEW.md** | High-level vision, phases completed, current status | All reviewers | ★★★ Required |
| **ARCHITECTURE.md** | System design, state management, algorithms | Architects | ★★★ Required |
| **API_REFERENCE.md** | All endpoints, request/response schemas | Full-stack reviewers | ★★ Recommended |
| **KNOWN_ISSUES_AND_FUTURE_WORK.md** | Edge cases, performance, security gaps, future roadmap | All reviewers | ★★ Recommended |

### Don't Share (Yet):

- Code files (share with `/files` tool if review needed)
- Git history/commits
- .env files or secrets
- Internal design exploration notes

---

## Architecture Review (Recommended Prompt)

```
I've built an AI-powered adaptive learning platform. Here are the key documents:
- docs/PROJECT_OVERVIEW.md (project vision and current state)
- docs/ARCHITECTURE.md (system design and algorithms)
- docs/KNOWN_ISSUES_AND_FUTURE_WORK.md (known gaps and future work)

Please review the architecture and provide feedback on:

1. **Schema Design:** Is the Concept/UnitGraph/GraphMembership separation sound?
   Any data integrity concerns with the confidence-weighted deduplication approach?

2. **State Management:** Is the Zustand store structured well? Any race conditions
   with multi-user concurrent updates?

3. **Algorithms:**
   - Is the confidence-weighted proficiency merge optimal?
   - Does the DAG cycle-breaking heuristic make sense?
   - Should we use a different question selection strategy?

4. **Scalability:**
   - Any N+1 query patterns you spot?
   - Would this scale to 10K users with 50K concepts?
   - What would you prioritize for optimization?

5. **Design Trade-offs:**
   - Global vs plan-scoped concepts: did we choose right?
   - Implicit vs explicit UnitGraph creation: any issues?
   - Should shared concepts be visual-only or also behavioral?

6. **Security & Data Integrity:**
   - Any user isolation issues?
   - How would you handle concurrent edits to same concept?
   - Should we implement stricter transaction semantics?

Please be direct about any architectural concerns or improvements.
```

---

## Code Quality Review (When Ready)

```
Once you've reviewed the architecture, here's the key code:

CORE LOGIC:
- src/lib/algorithms/conceptDedup.ts — Concept deduplication with confidence-weighted merge
- src/lib/algorithms/graphValidator.ts — DAG validation and layout computation
- src/lib/algorithms/proficiency.ts — Initial proficiency inference

STATE MANAGEMENT:
- src/lib/store.ts — Zustand store with all actions

API ENDPOINTS (these are critical):
- src/app/api/study-plans/[id]/structure-plan/route.ts — Graph generation pipeline
- src/app/api/unit-graphs/route.ts — Graph listing with enrichment
- src/app/api/unit-graphs/[id]/route.ts — Graph details + shared concept computation

PLEASE REVIEW FOR:
1. Correctness: Any logic bugs or edge cases?
2. Error handling: Are we handling all failure modes?
3. Performance: Any obvious optimizations?
4. Maintainability: Is the code structure clear?
5. Security: Any input validation gaps?
```

---

## UX/Design Review

```
I'm building an adaptive learning platform. Here's the current state:

VISION:
- Users upload materials → AI generates concept graph
- Graph visualizes prerequisites and learning paths
- Users practice to gain proficiency
- System tracks progress and recommends next concepts

CURRENT FEATURES:
✅ Chat interface for gathering requirements
✅ AI-powered concept graph generation
✅ Multi-graph support (multiple learning paths per user)
✅ Graph visualization with React Flow
✅ Concept detail panels showing relationships
✅ Shared concept highlighting (glow rings)
✅ Graph navigation sidebar

ARCHITECTURE:
- Global concepts (user-scoped, reused across graphs)
- Study plans contain multiple UnitGraphs (curriculum lenses)
- Concepts linked via GraphMembership (positions per graph)

PLEASE PROVIDE FEEDBACK ON:
1. **Navigation:** Is sidebar navigation intuitive? Good UX for switching graphs?
2. **Terminology:** Are "UnitGraph," "GraphMembership," etc. clear to users?
3. **Visual Hierarchy:** Can users quickly understand concept relationships?
4. **Onboarding:** Is the auth → chat → graph flow natural?
5. **Next Steps:** What features would have highest impact?
6. **Mobile:** How should this work on mobile? (currently desktop-focused)
7. **Accessibility:** Any WCAG concerns?

PLEASE BE DIRECT about what's confusing or could be improved.
```

---

## Performance Review

```
I need a performance audit of an adaptive learning platform. Here's the context:

EXPECTED SCALE:
- 1,000 users (hackathon, but want to think production)
- 10 study plans per user (10K total)
- 50 concepts per study plan (500K concepts)
- 5M+ questions (10 per concept avg)

CURRENT BOTTLENECKS (from KNOWN_ISSUES_AND_FUTURE_WORK.md):
1. N+1 queries in graph listing (fetches all memberships per graph)
2. Missing index on GraphMembership.unitGraphId
3. Full table scan for concept dedup (nameNormalized lookup)
4. React Flow renders all nodes at once (no virtualization)
5. Single MiniMax API key limits concurrent LLM calls

ARCHITECTURE DETAILS:
- Database: Prisma ORM with SQLite (dev) / LibSQL (prod)
- Backend: Next.js API routes
- Frontend: React + Zustand store
- Graph visualization: React Flow

PLEASE ANALYZE:
1. **Database:** Which indices are critical? Should we shard Concepts table?
2. **API Design:** What's the bottleneck for concurrent users?
3. **Frontend:** At what graph size does React Flow lag? Virtualization needed?
4. **LLM API:** How to handle rate limiting with single API key?
5. **Caching:** What's worth caching? Redis strategy?
6. **Monitoring:** What metrics should we track?

PLEASE PROVIDE SPECIFIC RECOMMENDATIONS AND PRIORITY ORDER.
```

---

## Security Review

```
I'm building an adaptive learning platform and want a security audit.

AUTHENTICATION:
- Username-only (no passwords)
- localStorage-based sessions
- All API queries filtered by userId

ATTACK SURFACE:
- Chat interface (user input to LLM)
- File upload (placeholder, not implemented)
- Graph editing (future feature)
- Multi-user data isolation

PLEASE REVIEW:
1. **User Isolation:** Any ways to access another user's graphs?
2. **Input Validation:** Are all user inputs validated? Any injection vectors?
3. **CORS:** Is cross-origin access properly controlled?
4. **File Upload:** When implemented, what safety precautions needed?
5. **Data Privacy:** Should we encrypt at rest? TLS enforcement?
6. **Audit Logging:** Should we log all data access/modifications?

ARCHITECTURE DETAILS AVAILABLE IN:
- docs/PROJECT_OVERVIEW.md (current features)
- docs/ARCHITECTURE.md (schema, error handling, security considerations)
- docs/KNOWN_ISSUES_AND_FUTURE_WORK.md (security gaps)

PLEASE BE DIRECT ABOUT CRITICAL ISSUES.
```

---

## Feature Design Review

```
I'm planning Phase 4 of an adaptive learning platform. Here's what we're building:

COMPLETED (Phase 1-3):
- Authentication, multi-user isolation
- AI-powered concept graph generation
- Multi-graph support
- Graph visualization

PHASE 4 PLANNING (NEEDS YOUR INPUT):
1. **Practice Sessions**
   - Question selection strategy (spaced repetition, difficulty scaling, prerequisites)
   - SM-2 scheduling implementation
   - Session types: "diagnosis" vs "review" vs "challenge"

2. **Mastery Progression**
   - How to weight prerequisites? (hard block vs soft recommendation)
   - When to unlock new concepts? (after parent at 80%? 90%?)
   - How to handle concept "unmastery" (if proficiency drops)?

3. **Content Regeneration**
   - When to regenerate questions? (every N sessions? on demand?)
   - How to measure question difficulty?
   - Should we personalize questions by user proficiency?

4. **Analytics & Recommendations**
   - What learning metrics matter? (time/concept? error rate? attempts?)
   - How to recommend next concepts? (prerequisite → adjacent → challenge)
   - Should we detect learning patterns? (e.g., "user struggles with recursion")

5. **Multi-User Features**
   - Should users share graphs/concepts with classmates?
   - Collaborative study sessions?
   - Peer comparison (anonymized leaderboards)?

ARCHITECTURE AVAILABLE IN:
- docs/PROJECT_OVERVIEW.md
- docs/ARCHITECTURE.md

PLEASE PROVIDE:
1. Recommendations on which features have highest impact
2. Design trade-offs for each feature
3. Implementation complexity vs user value
4. Any research or papers you'd reference
5. What other systems do this well?
```

---

## How to Request Reviews

### Format 1: Comprehensive Review
```
Please review this adaptive learning platform.

Context: Hackathon project (3 days), Phase 3 complete, aiming for production-ready architecture.

Architecture documents:
[paste docs/PROJECT_OVERVIEW.md]
[paste docs/ARCHITECTURE.md]
[paste docs/KNOWN_ISSUES_AND_FUTURE_WORK.md]

Focus areas:
1. Schema design soundness
2. Scalability to 10K users
3. Any critical bugs or security gaps
4. Architecture improvements

Please be direct and prioritize high-impact feedback.
```

### Format 2: Targeted Feedback
```
I built [X feature] using [Y approach]. Here's the design:

[paste relevant section from architecture docs]

Specific questions:
1. [Question 1]
2. [Question 2]
3. [Question 3]

Any concerns or alternative approaches?
```

### Format 3: Code Review
```
I need a code review of [component/endpoint]. Context:

[paste docs/ARCHITECTURE.md - relevant section]

Code:
[paste code files]

Focus on:
1. Correctness
2. Edge cases
3. Performance
4. Maintainability
```

---

## What NOT to Share

❌ **Secrets/Credentials**
- `.env` files
- API keys
- Database credentials

❌ **Internal Notes**
- Design exploration scraps
- Decision rationale (already captured in docs)
- TODO comments

❌ **Source Code (Unless Specifically Requested)**
- Full codebase is large; share docs first
- Only share code files when doing deep review
- Use `/files` tool in Claude for code if needed

---

## Follow-Up Questions to Ask Reviewers

After sharing architecture docs, ask:

1. **"Would you design this differently? What would you change?"**
2. **"What's the biggest risk in this architecture?"**
3. **"If you had 1 week to optimize, where would you start?"**
4. **"Are there any obvious bugs I'm missing?"**
5. **"What would break at 10K users? 100K users?"**
6. **"Is this over-engineered or under-engineered for a hackathon?"**

---

## Document Generation Commands

To keep docs up-to-date:

```bash
# View all docs
ls -la docs/

# Count lines in each doc
wc -l docs/*.md

# Search for TODOs/FIXMEs
grep -r "TODO\|FIXME" src/ lib/ --include="*.ts" --include="*.tsx"

# Generate API docs from code comments (future)
npx typedoc --out docs/api src/app/api --json docs/api.json
```

---

## Document Maintenance

| Document | Last Updated | Next Review |
|----------|--------------|-------------|
| PROJECT_OVERVIEW.md | 2026-02-26 | After Phase 4 completion |
| ARCHITECTURE.md | 2026-02-26 | Before performance optimization |
| API_REFERENCE.md | 2026-02-26 | After endpoint changes |
| KNOWN_ISSUES_AND_FUTURE_WORK.md | 2026-02-26 | Weekly (as issues discovered) |

**Owner:** Dev team (keep in sync with code)

---

## Questions?

If you're unsure which documents to share, default to:
1. **PROJECT_OVERVIEW.md** (always start here)
2. **ARCHITECTURE.md** (for design review)
3. **KNOWN_ISSUES_AND_FUTURE_WORK.md** (for gap analysis)
4. **API_REFERENCE.md** (for integration planning)

Share code files only after reviewers understand the architecture.
