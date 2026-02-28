# API Reference

## Authentication

All authenticated endpoints require `x-user-id` header or `userId` in request body.

```bash
curl -H "x-user-id: user-123" http://localhost:3000/api/study-plans
# OR
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","displayName":"John Doe"}'
```

## Endpoints

### Users

#### `POST /api/users`
Create or verify a user (upsert).

**Request:**
```json
{
  "userId": "string (required, unique per auth context)",
  "displayName": "string (optional)"
}
```

**Response:**
```json
{
  "id": "user-123",
  "displayName": "John Doe",
  "createdAt": "2026-02-26T10:30:00Z"
}
```

---

### Study Plans

#### `GET /api/study-plans`
List all study plans for the authenticated user.

**Headers:**
- `x-user-id: user-123` (required)

**Response:**
```json
{
  "plans": [
    {
      "id": "plan-1",
      "title": "Python Basics",
      "description": "Learn Python fundamentals",
      "userId": "user-123",
      "createdAt": "2026-02-26T10:30:00Z",
      "concepts": [],
      "edges": []
    }
  ]
}
```

#### `POST /api/study-plans`
Create a new study plan.

**Request:**
```json
{
  "userId": "user-123",
  "title": "Python Basics",
  "description": "Learn Python fundamentals",
  "sourceText": "Python is a high-level programming language...",
  "targetDate": "2026-03-31" // optional
}
```

**Response:**
```json
{
  "plan": {
    "id": "plan-1",
    "title": "Python Basics",
    "userId": "user-123",
    "createdAt": "2026-02-26T10:30:00Z"
  }
}
```

#### `GET /api/study-plans/[id]`
Get a specific study plan with all concepts and edges.

**Response:**
```json
{
  "id": "plan-1",
  "title": "Python Basics",
  "concepts": [
    {
      "id": "c1",
      "name": "Variables",
      "description": "...",
      "proficiency": 0.5,
      "confidence": 0.8,
      "keyTerms": ["variable", "assignment", "scope"]
    }
  ],
  "edges": [
    {
      "id": "e1",
      "from": "c1",
      "to": "c2",
      "edgeType": "prerequisite"
    }
  ]
}
```

---

### Unit Graphs (Curriculum Lenses)

#### `GET /api/unit-graphs`
List all unit graphs for the authenticated user (or filtered by study plan).

**Query Parameters:**
- `studyPlanId=plan-1` (optional, filter by study plan)

**Headers:**
- `x-user-id: user-123` (required if no studyPlanId filter)

**Response:**
```json
{
  "unitGraphs": [
    {
      "id": "ug1",
      "title": "Python Basics",
      "description": "Learn Python fundamentals",
      "status": "active",
      "studyPlanId": "plan-1",
      "studyPlanTitle": "Python Mastery",
      "conceptCount": 15,
      "avgProficiency": 0.45,
      "createdAt": "2026-02-26T10:30:00Z"
    }
  ]
}
```

#### `GET /api/unit-graphs/[id]`
Get a specific unit graph with all concepts, memberships, and edges.

**Response:**
```json
{
  "graph": {
    "id": "ug1",
    "title": "Python Basics",
    "studyPlanId": "plan-1"
  },
  "concepts": [
    {
      "id": "c1",
      "name": "Variables",
      "description": "...",
      "proficiency": 0.5,
      "confidence": 0.8,
      "userId": "user-123"
    }
  ],
  "memberships": [
    {
      "id": "m1",
      "conceptId": "c1",
      "unitGraphId": "ug1",
      "positionX": 100,
      "positionY": 200,
      "depthTier": 1
    }
  ],
  "edges": [
    {
      "id": "e1",
      "fromNodeId": "c1",
      "toNodeId": "c2",
      "unitGraphId": "ug1",
      "edgeType": "prerequisite"
    }
  ],
  "sharedConceptIds": ["c1", "c3"]
}
```

---

### Concepts (Global)

#### `PATCH /api/concepts/[id]`
Update a concept's proficiency or other fields.

**Request:**
```json
{
  "proficiency": 0.7,
  "confidence": 0.9,
  "name": "Variables",
  "description": "..."
}
```

**Response:**
```json
{
  "id": "c1",
  "name": "Variables",
  "proficiency": 0.7,
  "confidence": 0.9
}
```

---

### Lesson Plan Structuring

#### `POST /api/study-plans/[id]/structure-plan`
Convert a text lesson plan into a structured concept graph.

**Request:**
```json
{
  "textPlan": "1. Learn Variables\n2. Learn Functions\n3. Learn Classes\n...",
  "priorKnowledge": "I know JavaScript basics",
  "userId": "user-123"
}
```

**Response:**
```json
{
  "lessonPlan": {
    "totalConcepts": 15,
    "reusedConceptCount": 3,
    "percentageKnown": 20,
    "tier1": ["Variables", "Functions"],
    "tier2": ["Classes", "Decorators"],
    "tier3": ["Metaclasses"]
  }
}
```

**Behavior:**
1. Calls MiniMax LLM to parse text plan into JSON
2. Identifies concepts and edges
3. Deduplicates against existing user concepts
4. Creates UnitGraph and GraphMemberships
5. Tracks reused concepts for UI notification

---

### Chat

#### `POST /api/chat`
Process a chat message and optionally return a lesson plan proposal.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "I want to learn Python" },
    { "role": "assistant", "content": "Great! Let me understand..." }
  ],
  "chatPhase": "gathering",
  "sourceText": "Uploaded course content..."
}
```

**Response:**
```json
{
  "content": "Here's what I suggest for your Python learning path...",
  "proposedLessonPlan": "1. Variables and Types\n2. Functions\n3. Classes\n..."
}
```

**Chat Phases:**
- `"idle"` → Start new conversation
- `"gathering"` → Collect learning requirements
- `"proposing"` → LLM has generated a lesson plan proposal
- `"structuring"` → Converting proposal to concept graph
- `"done"` → Graph created, ready to practice

---

### Questions

#### `GET /api/study-plans/[id]/questions`
Get a balanced set of practice questions for a study plan.

**Query Parameters:**
- `due=1` (optional, only return overdue questions)
- `limit=20` (optional, max questions to return, default 20)

**Response:**
```json
{
  "questions": [
    {
      "id": "q1",
      "conceptId": "c1",
      "conceptName": "Variables",
      "questionType": "mcq",
      "questionText": "What is a variable?",
      "correctAnswer": "A named container for data",
      "distractorsJson": "[\"A function\", \"A class\"]",
      "explanation": "Variables store values for later use",
      "difficulty": 0.2,
      "createdAt": "2026-02-26T10:30:00Z"
    }
  ],
  "metadata": {
    "total": 5,
    "dueConceptCount": 3
  }
}
```

**Scoring Logic:**
1. Filter concepts by SM-2 `nextDue` date
2. Score concepts: `(isPrerequisite ? 2.0 : 1.0) * (1 + overdueDays)`
3. Select top concepts, up to 3 questions each
4. Apply difficulty-to-proficiency filter (low proficiency → easier questions)

#### `POST /api/study-plans/[id]/generate-questions` (Stub)
Generate questions for all concepts (not implemented in Phase 3).

---

### Attempts

#### `POST /api/study-plans/[id]/attempt`
Record a question attempt and update concept proficiency via SM-2.

**Request:**
```json
{
  "sessionId": "session-1",
  "questionId": "q1",
  "userId": "user-123",
  "userResponse": "A named container for data",
  "timeSpentSeconds": 45
}
```

**Response:**
```json
{
  "isCorrect": true,
  "feedback": "Correct! Variables are containers for storing data values.",
  "concept": {
    "id": "c1",
    "name": "Variables",
    "proficiency": 0.6,
    "confidence": 0.85,
    "nextDue": "2026-02-28T10:30:00Z"
  }
}
```

**SM-2 Update:**
- Correct answer: increase proficiency, schedule next review in N days
- Incorrect answer: decrease proficiency, set nextDue to now (immediate review)
- Track in AttemptRecord for session-level analytics

---

## Error Responses

### 400: Validation Error
```json
{
  "error": "Validation error",
  "details": {
    "fieldErrors": {
      "title": ["Title must be 1-200 characters"]
    }
  }
}
```

### 401: Unauthorized
```json
{
  "error": "User not authenticated"
}
```

### 404: Not Found
```json
{
  "error": "Study plan not found"
}
```

### 500: Internal Server Error
```json
{
  "error": "Failed to process request",
  "details": "Unexpected database error"
}
```

### 502: External Service Error
```json
{
  "error": "MiniMax API call failed",
  "details": "API rate limit exceeded"
}
```

---

## Rate Limits

- No rate limiting implemented (hackathon scope)
- MiniMax API has its own limits (check dashboard)

---

## Batch Operations

All endpoints are single-resource. Batch operations (e.g., bulk concept updates) are not supported.

---

## Pagination

No pagination implemented. Lists return all results. For large datasets (1000+ concepts), consider implementing cursor-based pagination.

---

## Webhooks

No webhooks implemented (future consideration for async events like question generation completion).

---

## SDK / Client Libraries

- **Frontend:** Zustand store + fetch API
- **Backend:** Prisma client
- No public SDK yet

---

## Versioning

All APIs are v1 (no versioning scheme). Breaking changes unlikely until Phase 4+.
