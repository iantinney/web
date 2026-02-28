# Adaptive Learning Graph: Living System Design

**Project:** Adaptive Learning Tutor (Hackathon)
**Date:** February 26, 2026
**Scope:** Reactive graph intelligence, persistent chat architecture, recursive learning loops

---

## 1. Vision

The concept graph is not a static curriculum — it is a living representation of the learner's knowledge that grows, fills gaps, and reshapes itself in response to how the learner actually performs. Combined with a persistent AI tutor that accompanies the learner across every context, the system creates a **recursive learning loop**: struggle → gap detection → graph growth → mastery → frontier expansion → cross-domain synthesis → new struggles in new territory → repeat infinitely.

The demo pitch in one sentence: "This system watches how you learn, identifies what's missing, grows the graph to fill it, and proposes new directions that connect everything you know."

---

## 2. Architecture: The Three Reactive Behaviors

The graph responds to the learner in three directions:

### 2.1 Downward Growth: Struggle Detection → Prerequisite Insertion

When the learner fails at a concept, the system determines whether the failure is a surface-level mistake or a deep structural gap. If it's structural — the learner is missing a foundational concept that was assumed — the system proposes inserting new prerequisite material into the graph.

**Detection model (integrated into question grading):**

The LLM that evaluates free-response and open-ended answers classifies each error into one of four categories:

| Classification | Meaning | System Response |
|---|---|---|
| CORRECT | No error | Advance proficiency |
| MINOR | Arithmetic, recall, or terminology slip — understands the concept | Normal proficiency adjustment, continue |
| MISCONCEPTION | Misunderstands the current concept specifically | More practice on this concept, possibly lower difficulty |
| PREREQUISITE_GAP | Error reveals missing knowledge of a *different*, more foundational concept | Log the gap; propose insertion if pattern recurs |

For PREREQUISITE_GAP, the grading LLM also outputs:
- The name of the missing prerequisite concept
- A brief explanation of why the student's answer reveals this gap
- A severity assessment: NARROW (one concept missing), MODERATE (a small cluster of 2-4 concepts), or BROAD (an entire prerequisite domain)

**Sensitivity calibration (avoiding false positives):**

The system must not insert prerequisites on every wrong answer. The calibration works on a pattern-detection basis:

1. **First occurrence:** Log the gap silently. No user-visible action. The data is: `{ conceptId, missingPrerequisite, severity, timestamp }`.

2. **Second occurrence (same missing prerequisite):** The system is now confident there's a real, recurring gap. This triggers a user-facing proposal.

3. **The proposal is always a suggestion, not automatic insertion.** The user sees:
   > "I've noticed your answers about [concept] suggest you might need more background in [prerequisite]. Would you like me to add this to your learning path?"

4. **Automatic insertion is deferred until post-hackathon.** For now, the user always confirms. This is actually better for demos — judges see the system explain its reasoning, then the user accepts, then the graph changes. The reasoning makes the intelligence visible.

**Future refinement (post-hackathon):** Track gap frequency per concept over longer periods. If a user consistently triggers the same gap across sessions, auto-insert with a notification. Allow user to set a preference: "always ask" vs. "insert automatically."

**Three scales of insertion:**

The severity assessment determines what gets proposed:

| Scale | Trigger | What Happens | Example |
|---|---|---|---|
| **Single concept** | NARROW gap — one specific foundational concept is missing | Insert one new node with a prerequisite edge to the struggling concept | "Chain Rule" inserted below "Backpropagation" |
| **Concept cluster** | MODERATE gap — a small set of related foundations are missing | Insert 2-4 connected concepts forming a mini-prerequisite chain | "Limits → Derivatives → Chain Rule" inserted as a chain below "Backpropagation" |
| **New unit graph** | BROAD gap — an entire prerequisite domain is missing | Propose creating a separate UnitGraph for the prerequisite domain; share relevant concepts with the current graph | "You'd benefit from a dedicated Calculus Fundamentals unit" — creates a new graph sharing foundational concepts |

For single concept and cluster insertions, the user sees the proposal inline (in the Learn tab or chat). For new unit graph proposals, the chat takes over to gather additional context ("What's your calculus background?" etc.) before generating.

**When the user accepts an insertion:**

1. `findOrCreateConcept` is called for each new concept (dedup against existing knowledge pool)
2. `GraphMembership` records are created, linking new concepts to the current UnitGraph
3. New `ConceptEdge` records connect the prerequisites to the struggling concept
4. The graph's dagre layout is recomputed to accommodate the new nodes
5. Updated positions are stored on all GraphMemberships
6. The practice session redirects to the new prerequisite concept(s): "Let's build up your understanding of [X] first"
7. Once proficiency on the prerequisite(s) reaches a threshold (e.g., 0.6), the system redirects back: "Now let's try [original concept] again"

**Checking existing knowledge first:**

Before proposing insertion, the system checks whether the prerequisite already exists:

| State | Response |
|---|---|
| Prerequisite exists in this graph, proficiency is low | "You've seen [X] but haven't mastered it yet. Let's practice that first." → Redirect practice to existing concept, no insertion needed |
| Prerequisite exists in another graph, proficiency is high | "You studied [X] in your [other graph] and know it well (82%). Let me connect it to this graph." → Add GraphMembership to pull it in, no new concept creation |
| Prerequisite exists in another graph, proficiency is low | "You started learning [X] in [other graph] but haven't mastered it. Let's practice it in this context." → Add GraphMembership + redirect practice |
| Prerequisite doesn't exist anywhere | Full insertion flow — create Concept + GraphMembership + edges |


### 2.2 Upward Growth: Mastery Detection → Frontier Expansion

When the learner demonstrates mastery of a concept, the system either advances them to the next concept in the graph or, if they've reached the frontier, proposes expansion.

**Mastery detection criteria:**

A concept is considered mastered when:
- `proficiency >= 0.8` AND `confidence >= 0.5`
- OR the user has answered 3+ consecutive questions correctly at or above the target difficulty

A "frontier concept" is one where:
- The concept is mastered
- It has no dependents in this graph, OR all of its dependents are also mastered

**Two cases:**

**Case A: Next concept exists in graph.**
The system auto-advances: "You've mastered [concept]! Moving on to [next concept]." The Learn tab smoothly transitions to questions about the next concept in the DAG ordering. No user confirmation needed — this is the natural flow.

**Case B: Frontier reached — no next concept (or all mastered).**
The system proposes expansion. The LLM generates 2-3 possible directions, each at a potentially different scale:

> "You've mastered the frontier of ML Foundations! Here's where we could go:"
>
> 🧠 **Go deeper** — Convolutional Networks, Recurrent Networks (extends this graph with 3-4 concepts)
>
> 🌉 **Bridge to Linear Algebra** — Principal Component Analysis connects your ML and Linear Algebra knowledge (adds 1-2 bridge concepts shared between graphs)
>
> 🆕 **New territory** — Reinforcement Learning (creates a new unit graph, sharing relevant prerequisites from this one)
>
> What interests you?

The user picks a direction. Depending on the scale:

- **Extend (concepts added to current graph):** LLM generates concepts + edges, `findOrCreateConcept` handles dedup, new GraphMemberships created, dagre relayouts the graph, practice continues with the new material.
- **Bridge (concepts shared across graphs):** Same as extend, but the new concepts get GraphMemberships in multiple UnitGraphs. Edges in each graph connect them to the appropriate local concepts.
- **New unit graph:** The chat flow is triggered with pre-seeded context: "You want to learn Reinforcement Learning. Based on your mastery of [concepts], I'll build a focused plan." The new graph shares relevant concepts via the existing dedup system. A new pill appears in the pill bar.

**The expansion LLM prompt:**

```
The learner has mastered the frontier of their [graph title] unit.

Mastered concepts: [list with descriptions and proficiency]
All concepts in this graph: [full list]
All concepts across all graphs: [full list — prevents suggesting things they already know]
Other unit graphs: [titles + concept lists — enables bridge detection]

Generate 2-3 possible expansion directions. For each:
- A short label and 1-sentence pitch
- Scale: "extend" (add concepts to this graph), "bridge" (connect to another graph), or "new_unit" (new domain)
- For "extend": list 3-5 new concepts with prerequisite edges to mastered concepts
- For "bridge": identify which existing graph(s) it connects to and which shared concepts form the bridge
- For "new_unit": suggest a topic title and 2-3 seed concepts

Return JSON: { directions: [{ label, pitch, scale, concepts?, bridgeGraphIds?, newUnitTitle? }] }
```

**The bridge scoring heuristic:**

When generating directions, the system should favor bridges over extensions when possible. A "bridge score" measures how many existing graphs a new topic would connect to. Topics that link 2+ existing domains are ranked higher because integrative knowledge is pedagogically superior to siloed learning. This scoring happens inside the expansion LLM prompt — the model is instructed to prefer cross-domain connections.


### 2.3 Lateral Growth: Cross-Graph Bridge Proposals

Independent of any single practice session, the system actively identifies opportunities for learning that would connect the learner's existing knowledge domains.

**When bridge analysis runs:**

- After creating a 2nd+ UnitGraph (automatic, async)
- When the user clicks "What should I learn next?" (on-demand)
- After a graph expansion that adds shared concepts (automatic, async)

**The bridge detection prompt:**

```
The learner has the following knowledge domains:

[For each UnitGraph: title, concept list with proficiency, mastery %]

Identify 2-3 concepts or small topic areas (3-5 concepts each) that would
BRIDGE multiple existing knowledge domains. For each proposal:

- Name the bridging topic
- List which existing graphs it connects to
- Identify which existing concepts in each graph form the connection points
- Explain in one sentence why this bridge is valuable for the learner
- Rate the "bridge score": how many existing domains does it connect? Higher is better.
- Specify scale: single concept, concept cluster, or new unit graph

Prefer proposals that:
- Connect MORE existing domains (bridge score 3 > bridge score 2)
- Build on concepts the learner has already mastered (not struggled concepts)
- Fill genuine intellectual gaps between domains (not superficial name overlaps)

Return JSON: { bridges: [{ topic, connectedGraphIds, connectionPoints, pitch, bridgeScore, scale, concepts? }] }
```

**What the user sees (in the advisor / chat):**

> 🌉 **Principal Component Analysis** (bridge score: 2)
> Connects: Linear Algebra ↔ ML Foundations
> Via: Eigenvalues, Matrix Decomposition → Dimensionality Reduction
> "PCA ties your matrix theory directly to practical ML data processing"
>
> [Add to ML graph] [Create new unit] [Tell me more] [Skip]

When accepted, the insertion follows the same `findOrCreateConcept` + GraphMembership + edge creation pipeline as all other insertions.

---

## 3. The Persistent Chat / AI Tutor

### 3.1 Current State

The chat tab is a phase machine: gathering → structuring → generating → idle. After graph generation, it has no ongoing role. The user switches to Learn or Graph and the chat sits unused.

### 3.2 Target State

The chat becomes the system's voice — a persistent AI tutor that accompanies the learner everywhere and serves multiple roles depending on context.

**Roles by context:**

| User Context | Chat Role | Examples |
|---|---|---|
| Practicing on Learn tab | Tutor / explainer | "Here's why that answer is wrong…", "Hint: think about how X relates to Y", "Great streak!" |
| Exploring on Graph tab | Guide / advisor | "This concept connects to your ML graph because…", "You're close to mastering this cluster" |
| Idle / between sessions | Advisor / motivator | "What should I learn next?" analysis, "You haven't practiced Statistics in 3 days" |
| Creating a new plan | Plan builder (current) | Gathering context, proposing lesson plan, generating graph |
| After a struggle event | Diagnostic | "I noticed you keep mixing up X and Y. Here's what I think is happening…" |
| After mastery event | Pathfinder | "You've cleared the frontier! Here are your options…" |

### 3.3 Recommended Architecture: Intelligence First, Layout Later

**Do not redesign the chat layout now.** Instead, build the tutor behaviors as capabilities that currently live in their respective tabs, and are architecturally ready to be embedded in a persistent panel later.

**Phase 1 (hackathon):** Build the intelligence. The chat maintains a `chatContext` that tracks what the user is doing:

```typescript
interface ChatContext {
  mode: "idle" | "practicing" | "exploring" | "planning";
  activeConceptId?: string;
  activeUnitGraphId?: string;
  recentAttempts?: { conceptName: string; correct: boolean; errorType: string }[];
  recentGapDetections?: { missingConcept: string; count: number }[];
  lastAction?: string;
}
```

This context is updated when the user:
- Starts a practice session (mode → "practicing", set activeUnitGraphId + activeConceptId)
- Switches to the Graph tab (mode → "exploring")
- Finishes a session or goes idle (mode → "idle")
- Gets a question wrong (append to recentAttempts, possibly recentGapDetections)

When the user opens the Chat tab, it reads this context and can immediately offer relevant help without the user re-explaining what they were doing.

**Phase 2 (post-hackathon or if time permits):** Migrate to a persistent layout. Options:
- Split-screen: Chat on the right, Learn/Graph on the left (desktop only)
- Slide-over panel: Chat slides in from the right on any tab
- Floating widget: Chat bubble in the corner, expands on click

The intelligence built in Phase 1 transfers directly — only the rendering changes.

### 3.4 The "What Should I Learn Next?" Advisor

This is a specific chat capability triggered by a dedicated button (not free-form chat). When activated, it runs a comprehensive analysis of the learner's state and produces a ranked list of recommendations.

**Trigger:** A button in the chat interface — a ✨ icon labeled "Suggest next steps" or similar. Always available regardless of what the user was doing.

**Analysis inputs:**
- All UnitGraphs with concept proficiency data
- Spaced repetition due dates (concepts due for review)
- Recent struggle history (gap detections)
- Bridge detection results (cross-graph opportunities)
- Expansion possibilities (mastered frontiers)

**Output: Ranked recommendation list.**

The system produces 3-5 recommendations, ranked by a composite score that weighs immediacy, learning value, and bridge potential:

| Type | Example | When it appears |
|---|---|---|
| **Review** | "Eigenvalues — proficiency decaying, due for practice" | A concept's spaced repetition interval has elapsed |
| **Continue** | "Backpropagation — next in your ML graph, prerequisites met" | The natural next concept in the current graph's DAG |
| **Remediate** | "Chain Rule — detected as a recurring gap in your ML practice" | Gap detection has flagged this 2+ times |
| **Extend** | "Regularization Techniques — extends ML Foundations" | User has mastered the frontier of a graph |
| **Bridge** | "PCA — connects Linear Algebra + ML (bridge score: 2)" | Cross-graph bridge opportunity detected |
| **New domain** | "Deep Learning — builds on ML Foundations + Linear Algebra" | User has sufficient foundation for a new unit |

Each recommendation is an interactive card. Clicking it either starts a practice session (for review/continue/remediate), triggers the insertion flow (for extend/bridge), or opens the chat's plan-building mode (for new domain).

**Ranking heuristic:**

```
score = urgency × 0.3 + learning_value × 0.4 + bridge_bonus × 0.3

urgency:
  - Review overdue: 0.9
  - Gap detected 3+ times: 0.8
  - Gap detected 2 times: 0.5
  - Frontier reached: 0.4
  - Idle: 0.2

learning_value:
  - Concept with many dependents waiting: 0.9
  - Bridge concept (unlocks progress in 2+ graphs): 0.8
  - Next DAG concept: 0.6
  - Extension concept: 0.5
  - New domain: 0.4

bridge_bonus:
  - Connects 3+ graphs: 1.0
  - Connects 2 graphs: 0.6
  - Single graph only: 0.0
```

This scoring ensures the system prioritizes filling urgent gaps and cross-domain connections over simple extensions.

### 3.5 Tutor Explanations in the Learn Tab

When the user gets a question wrong, the Learn tab shows a brief inline explanation. This does NOT require the chat tab — it's a small expandable section below the answer feedback.

**The explanation flow:**

1. User submits wrong answer
2. The grading LLM returns its classification (MINOR / MISCONCEPTION / PREREQUISITE_GAP) along with a 2-3 sentence explanation
3. The Learn tab shows: "❌ Not quite. [short explanation]. [Expand for more detail]"
4. If the user clicks "Expand," a longer explanation appears (still inline, not in chat)
5. If PREREQUISITE_GAP is detected, an additional callout appears: "💡 This might be a gap in [prerequisite]. [Learn more about this]" — clicking this opens the gap-insertion proposal

When the chat becomes persistent (Phase 2), these explanations migrate to the chat panel. The underlying LLM call is identical — only the rendering location changes.

---

## 4. Integration Flow: How Everything Connects

### 4.1 The Learner's Session (End-to-End)

```
User opens app
  │
  ├─ Has existing graphs → Graph tab shows pill bar, last active graph
  │   └─ Clicks "Practice" on a concept → Learn tab starts session
  │
  └─ No graphs → Chat tab guides plan creation (existing flow)

Practice session (Learn tab):
  │
  ├─ Answers correctly
  │   ├─ Proficiency updates on global Concept
  │   ├─ Streak detected? → "Nice! 4 in a row on Eigenvalues"
  │   └─ Mastery threshold reached?
  │       ├─ Next concept in DAG → auto-advance: "Moving to [next]!"
  │       └─ Frontier reached → expansion proposal (3 directions)
  │           ├─ User picks "extend" → new concepts added, practice continues
  │           ├─ User picks "bridge" → shared concepts added, practice continues
  │           └─ User picks "new unit" → chat opens with pre-seeded context
  │
  ├─ Answers incorrectly
  │   ├─ MINOR → proficiency adjusts, inline note: "Watch out for [X]"
  │   ├─ MISCONCEPTION → proficiency adjusts, inline explanation, lower difficulty next
  │   └─ PREREQUISITE_GAP → logged silently
  │       └─ 2+ gaps on same prereq?
  │           └─ Proposal: "I think you need [X]. Add it?"
  │               ├─ User accepts → insertion (1 concept / cluster / new unit)
  │               │   ├─ Graph animates new node(s)
  │               │   └─ Practice redirects to prerequisite(s)
  │               │       └─ Prereq mastered → "Let's try [original] again"
  │               └─ User declines → continue as normal
  │
  └─ Session ends (natural or user-initiated)
      └─ Summary: concepts practiced, proficiency changes, gaps detected
          └─ If gaps were declined: "Still think [X] might help. Available in your graph."

Graph tab:
  │
  ├─ Pill bar shows all UnitGraphs with mastery %
  ├─ Shared concepts glow (chain icon + colored ring)
  ├─ Recently inserted concepts (from struggle detection) have "new" indicator
  ├─ Click any concept → detail panel with proficiency, key terms, "Also in: [graphs]"
  └─ "What should I learn next?" button → triggers advisor in chat

Chat tab:
  │
  ├─ "Suggest next steps" button → runs full advisor analysis → ranked cards
  ├─ Context-aware: knows what user was just doing
  │   ├─ Was practicing → "How's ML going? I noticed you struggled with [X]..."
  │   ├─ Was exploring graph → "Interested in [concept you clicked]?"
  │   └─ Idle → "It's been 3 days since you practiced Statistics..."
  ├─ Plan creation flow (existing, for new unit graphs)
  └─ Bridge proposal cards (when detected)
```

### 4.2 The Demo Script

A compelling hackathon demo would follow this exact sequence:

1. **Cold start:** User describes wanting to learn ML. Chat gathers context, generates an ML Foundations graph with 12 concepts. Graph tab shows the DAG.

2. **First practice round:** User practices on the Learn tab. Gets a few right, proficiency updates, nodes light up in the graph.

3. **Struggle moment:** User hits Backpropagation, gets two questions wrong — the grading LLM detects a Chain Rule gap. System proposes: "I think you need Chain Rule." User accepts. The graph animates a new node appearing below Backpropagation. Practice pivots to Chain Rule.

4. **Recovery:** User masters Chain Rule (a few questions). System redirects back to Backpropagation. This time the user succeeds. "See? That foundation made the difference."

5. **Mastery surge:** User masters several concepts quickly. Hits the frontier. System proposes three directions: extend, bridge to a hypothetical Linear Algebra graph, or start Reinforcement Learning.

6. **Cross-domain connection:** User creates a Linear Algebra graph (or it's pre-seeded for the demo). The system detects shared concepts: "3 concepts already mastered from your ML graph." Pill bar shows both graphs. Shared concepts glow.

7. **The bridge proposal:** User clicks "What should I learn next?" — the advisor proposes PCA as a bridge between Linear Algebra and ML. User accepts. The concept appears in both graphs, connected to relevant nodes in each.

8. **The pitch:** "This system never stops learning about what you need. It fills gaps when you struggle, opens new frontiers when you master, and finds connections between everything you know. The graph is alive."

---

## 5. Data Requirements

### 5.1 New Data: Gap Detection Log

Struggle detection requires persisting gap observations. This can be a lightweight log table:

```prisma
model GapDetection {
  id                String   @id @default(cuid())
  userId            String
  conceptId         String       // The concept the user was practicing
  missingConcept    String       // The prerequisite the LLM identified as missing
  severity          String       // NARROW | MODERATE | BROAD
  explanation       String       // LLM's reasoning
  attemptId         String?      // The specific attempt that triggered this detection
  status            String   @default("detected")  // detected | proposed | accepted | declined
  createdAt         DateTime @default(now())

  concept           Concept  @relation(fields: [conceptId], references: [id])
}
```

**Querying for pattern detection:**
```sql
SELECT missingConcept, COUNT(*) as occurrences
FROM GapDetection
WHERE userId = :userId AND conceptId = :conceptId AND status = 'detected'
GROUP BY missingConcept
HAVING COUNT(*) >= 2
```

When `occurrences >= 2`, trigger the proposal. When the user accepts or declines, update `status`.

### 5.2 Extended Grading Response

The question grading endpoint's LLM response expands to include gap analysis:

```typescript
interface GradingResult {
  correct: boolean;
  score: number;             // 0.0-1.0
  feedback: string;          // Short feedback shown inline
  explanation: string;       // Longer explanation (shown on expand)
  errorType: "CORRECT" | "MINOR" | "MISCONCEPTION" | "PREREQUISITE_GAP";
  
  // Only present when errorType is PREREQUISITE_GAP:
  gapAnalysis?: {
    missingConcept: string;
    severity: "NARROW" | "MODERATE" | "BROAD";
    explanation: string;
    suggestedConcepts?: string[];   // For MODERATE: list of 2-4 concepts
    suggestedDomain?: string;       // For BROAD: the prerequisite domain name
  };
}
```

### 5.3 Expansion Direction Response

The expansion proposal endpoint returns structured options:

```typescript
interface ExpansionDirection {
  label: string;              // "Go deeper", "Bridge to Linear Algebra", etc.
  pitch: string;              // 1-sentence explanation
  scale: "extend" | "bridge" | "new_unit";
  concepts?: {                // For extend and bridge
    name: string;
    description: string;
    keyTerms: string[];
    edgesFrom: string[];      // Names of existing concepts this connects from
  }[];
  bridgeGraphIds?: string[];  // For bridge: which existing graphs it connects to
  newUnitTitle?: string;      // For new_unit: suggested title
  bridgeScore?: number;       // How many graphs this connects
}
```

### 5.4 Advisor Recommendation Response

```typescript
interface AdvisorRecommendation {
  type: "review" | "continue" | "remediate" | "extend" | "bridge" | "new_domain";
  priority: number;           // 0.0-1.0 composite score
  title: string;              // "Review Eigenvalues", "Bridge to Statistics"
  pitch: string;              // 1-sentence explanation
  conceptId?: string;         // For review/continue/remediate: the target concept
  unitGraphId?: string;       // Which graph this relates to
  expansionDirection?: ExpansionDirection;  // For extend/bridge/new_domain
}
```

---

## 6. LLM Prompts Required

### 6.1 Enhanced Grading Prompt (Modify Existing)

The existing question grading prompt is extended to include gap analysis. The additional instruction block:

```
After evaluating correctness, classify the error:
- CORRECT: No error
- MINOR: Arithmetic, recall, or terminology slip. The student understands the concept.
- MISCONCEPTION: Misunderstands THIS concept specifically. Needs more practice on it.
- PREREQUISITE_GAP: The error reveals missing knowledge of a DIFFERENT, more foundational
  concept that is not the one being tested. The student cannot succeed at this concept 
  without first learning the prerequisite.

Only classify as PREREQUISITE_GAP when the student's answer demonstrates a fundamental
misunderstanding that CANNOT be fixed by more practice on the current concept alone.
Be conservative — most wrong answers are MINOR or MISCONCEPTION, not PREREQUISITE_GAP.

If PREREQUISITE_GAP, also provide:
- The name of the missing prerequisite concept (be specific: "Chain Rule" not "calculus")
- A 1-sentence explanation of what in the student's answer reveals this gap
- Severity: NARROW (one concept), MODERATE (a cluster of 2-4 related concepts), 
  or BROAD (an entire prerequisite domain)
```

### 6.2 Expansion Direction Prompt (New)

```
The learner has mastered the frontier of their "{graphTitle}" unit.

MASTERED FRONTIER CONCEPTS (high proficiency, no unmastered dependents):
{frontierConcepts with descriptions and proficiency}

ALL CONCEPTS IN THIS GRAPH:
{allGraphConcepts}

ALL CONCEPTS ACROSS ALL GRAPHS (do not suggest any of these):
{allUserConceptNames}

OTHER UNIT GRAPHS THE LEARNER HAS:
{otherGraphs with titles and concept lists}

Generate exactly 3 expansion directions:

1. An "extend" direction — 3-5 new concepts that go deeper in this graph's topic,
   with prerequisite edges from mastered frontier concepts.
2. A "bridge" direction — 1-3 concepts that connect this graph to one or more of the
   learner's OTHER graphs. Identify which graphs and which existing concepts form 
   the connection points. ONLY suggest this if there's a genuine intellectual bridge
   (not superficial name overlap).
3. A "new_unit" direction — a new topic area that builds on mastered knowledge. 
   Suggest a title and 2-3 seed concepts.

For each direction, provide:
- A short label (3-5 words)
- A 1-sentence pitch explaining why this direction is valuable
- The scale ("extend", "bridge", or "new_unit")
- A bridge_score (0-3): how many existing graphs this connects to

IMPORTANT: Never suggest concepts the learner already has (check the full concept list).
Prefer bridges over extensions when a genuine cross-domain connection exists.
```

### 6.3 Bridge Detection Prompt (New)

```
The learner has the following knowledge domains:

{For each UnitGraph: title, concepts with proficiency, overall mastery %}

Identify 2-3 concepts or small topic areas that would meaningfully BRIDGE 
multiple existing knowledge domains. A bridge is a concept or topic that:
- Requires knowledge from multiple domains as prerequisites
- Deepens understanding of already-mastered material in both domains
- Is a natural "connective tissue" concept in the field, not an artificial connection

For each proposal:
- topic: the bridging concept or topic name
- connectedGraphIds: which existing graphs it connects
- connectionPoints: which specific concepts in each graph form the bridge endpoints
- pitch: 1-sentence explanation of the bridge's value
- bridgeScore: number of graphs connected (2 or 3)
- scale: "single_concept" | "concept_cluster" | "new_unit"
- concepts: if cluster or unit, list the 2-5 concepts with prerequisites

Return JSON. Prefer proposals with higher bridge scores.
```

### 6.4 Advisor Synthesis Prompt (New)

```
Analyze the learner's complete state and recommend the single best next action.

KNOWLEDGE STATE:
{All UnitGraphs with concepts, proficiency, confidence, last practiced dates}

SPACED REPETITION STATUS:
{Concepts overdue for review, sorted by urgency}

RECENT STRUGGLE HISTORY:
{Gap detections from last 5 sessions — which prerequisites were flagged}

FRONTIER STATUS:
{Which graphs have mastered frontiers, which have unmastered next-steps}

BRIDGE OPPORTUNITIES:
{Pre-computed bridge candidates if available}

Produce a ranked list of 3-5 recommendations. Each should be one of:
- REVIEW: A specific concept that's overdue for spaced repetition practice
- CONTINUE: The natural next concept in a graph where prerequisites are met
- REMEDIATE: A prerequisite gap that's been detected 2+ times and not yet addressed
- EXTEND: Expansion of a graph where the frontier is mastered
- BRIDGE: A cross-graph connection opportunity
- NEW_DOMAIN: A new unit graph building on existing knowledge

Rank by composite priority:
- Urgent reviews and unresolved gaps first
- Then natural continuations (keep momentum)
- Then bridges (highest learning value)
- Then extensions and new domains

For each recommendation, provide: type, title, pitch (1 sentence), and the relevant 
conceptId or graphId.
```

---

## 7. Concerns and Risk Mitigation

### 7.1 Over-Eager Gap Detection

**Risk:** The system inserts prerequisites too aggressively, making the learner feel patronized or creating concept bloat.

**Mitigations:**
- Require 2+ detections before proposing (no single-occurrence triggers)
- The grading prompt is explicitly instructed to be conservative ("most wrong answers are MINOR or MISCONCEPTION")
- The user always confirms insertions — no automatic additions for now
- Post-hackathon: allow users to set sensitivity ("ask me" / "auto-insert" / "never insert")

### 7.2 LLM Quality in Error Classification

**Risk:** The grading LLM misclassifies errors — calls a MINOR error a PREREQUISITE_GAP, or misidentifies which prerequisite is missing.

**Mitigations:**
- The 2-occurrence threshold acts as a filter — random misclassifications are unlikely to repeat with the same missing concept name
- The proposal shows the system's reasoning ("I think you're missing X because your answer about Y suggests Z"). The user can evaluate whether this makes sense before accepting.
- Post-hackathon: Track acceptance/decline rates per error type to calibrate the prompt

### 7.3 Concept Bloat

**Risk:** Aggressive insertion + expansion creates graphs with too many concepts, overwhelming the learner.

**Mitigations:**
- Single insertions add 1 concept at a time (the common case). Clusters add 2-4. Neither is overwhelming.
- New unit graph proposals are separated from the current graph (the learner doesn't see 50 concepts in one view)
- The pill bar + graph selector keeps each view focused
- Post-hackathon: add a "graph health" metric — if a graph exceeds ~25 concepts, suggest splitting

### 7.4 Demo Reliability

**Risk:** The demo depends on LLM responses being coherent and well-structured. If the LLM generates garbage, the demo breaks.

**Mitigations:**
- Zod validation on all LLM responses — malformed output is caught and falls back gracefully
- For the demo specifically, pre-seed data for the happy path (a pre-built Linear Algebra graph with realistic proficiency) so the cross-graph story doesn't depend on live generation
- The gap detection can be "primed" — have a few questions where a specific gap is likely, so the demo doesn't require many attempts to trigger it
- Always have the user-confirmation step — if the LLM suggests something weird, the user can decline and the demo continues

### 7.5 Persistent Chat State Complexity

**Risk:** Maintaining `chatContext` across tab switches introduces state synchronization bugs.

**Mitigations:**
- `chatContext` lives in the Zustand store (same as all other state). Tab switches update it via simple setters.
- The chat doesn't need real-time awareness — it reads context when the user switches TO the chat tab, not continuously.
- Phase 1: Chat is a separate tab, context is read lazily. Phase 2: Persistent panel, context updates reactively.

### 7.6 Latency

**Risk:** Gap detection, expansion proposals, and bridge analysis all require LLM calls, adding latency to the practice flow.

**Mitigations:**
- Gap detection classification is part of the existing grading LLM call — no additional latency for detection itself
- The proposal step (when 2+ gaps are found) is a separate LLM call, but it only fires occasionally and the user can continue practicing while it generates
- Expansion proposals fire when the user has mastered the frontier — this is a natural pause point where a 2-3 second LLM call is acceptable
- Bridge analysis runs async after graph creation — never blocks the user

---

## 8. Build Order

Priority order for hackathon implementation. Items marked with ⭐ are the minimum for a compelling demo.

| # | Feature | Effort | Dependencies | Notes |
|---|---------|--------|--------------|-------|
| ⭐1 | Enhanced grading prompt (error classification + gap analysis) | 2h | Existing grading endpoint | Foundation for everything. Invisible to user but produces the data. |
| ⭐2 | GapDetection model + logging | 1h | #1 | Prisma model + write to it from grading endpoint |
| ⭐3 | Gap pattern detection + proposal UI | 3h | #2 | Query for 2+ occurrences, show proposal card in Learn tab, user confirm/decline |
| ⭐4 | Single concept insertion flow | 2h | #3 | `findOrCreateConcept` + GraphMembership + edges + dagre relayout. Practice redirect. |
| ⭐5 | Mastery detection + auto-advance | 2h | Existing proficiency | Detect mastery threshold → advance to next DAG concept in practice session |
| ⭐6 | Frontier detection + expansion proposal | 3h | #5 | Detect mastered frontier → LLM generates directions → user picks → create concepts |
| 7 | Advisor button in chat | 3h | #2, #5, #6 | "What should I learn next?" → ranked recommendations from all signals |
| 8 | Bridge detection prompt + proposals | 3h | #6, #7 | Cross-graph bridge analysis integrated into advisor results |
| 9 | Concept cluster insertion (2-4 concepts) | 2h | #4 | Extension of single insertion — create multiple connected concepts at once |
| 10 | New unit graph from insertion/expansion | 2h | #4, #6 | When scale = "new_unit", trigger chat plan-building with pre-seeded context |
| 11 | Chat context tracking | 2h | All above | `chatContext` in store, updated on tab switches + practice events |
| 12 | Graph insertion animation | 3h | #4 | Smooth node fade-in, edge draw animation in React Flow |
| 13 | Tutor explanations inline in Learn | 2h | #1 | Show LLM explanation inline after wrong answers |

**Minimum demo (items 1-6): ~13 hours.** Gets you struggle detection, gap insertion, mastery advancement, and frontier expansion.

**Full feature set (all items): ~28 hours.** Adds the advisor, bridge proposals, cluster insertion, new unit creation, animations, and inline tutoring.

**Recommended cut:** Items 1-8 (~19 hours) gives you the full "living graph" story including cross-graph bridges, without the animation polish or layout changes.

---

## 9. Open Questions (To Resolve During Implementation)

1. **Should the grading prompt always run gap analysis, or only for free-response questions?** MCQ wrong answers are less diagnostic — a wrong multiple choice pick doesn't reveal *why* the student is confused. Recommendation: Run full analysis on free-response, simplified analysis on MCQ (only flag PREREQUISITE_GAP if the distractor the student chose is associated with a specific misconception).

2. **How does the Learn tab's question selector change after insertion?** When a new prerequisite is inserted mid-session, the question generator needs to immediately have questions for the new concept. Options: (a) generate questions on the fly via LLM when a concept is first practiced, (b) pre-generate a batch of questions during insertion. Recommendation: (a) for hackathon, (b) for production.

3. **Should expansion directions be cached?** If the user dismisses all three expansion directions and comes back later, should they see the same options or regenerated ones? Recommendation: Cache for 24 hours, regenerate after. This prevents the user seeing the same dismissed options repeatedly, and fresh suggestions may be better after more learning.

4. **How aggressive should the bridge scoring be?** Should the system *always* prefer bridges over extensions? Or only when the bridge score is significantly higher? Recommendation: Prefer bridges when bridgeScore >= 2 and the bridge concept has genuine pedagogical value. Don't force bridges when the extension direction is clearly more relevant to the user's immediate goals.

5. **What happens to the graph layout when concepts are inserted mid-practice?** Dagre relayout can shift every node's position. This is disorienting if the user switches to the Graph tab and everything has moved. Options: (a) full relayout (positions may shift), (b) incremental layout (only position new nodes, keep existing positions fixed), (c) relayout but animate the transition smoothly. Recommendation: (b) for hackathon — insert new nodes in available space near their parent edge, don't disturb existing positions. (c) for production.
