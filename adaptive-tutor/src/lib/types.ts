// ---------------------------------------------------------------------------
// Core data types mirroring the Prisma schema
// ---------------------------------------------------------------------------

export interface LearnerProfile {
  background: string[];
  goals: string[];
  interests: string[];
}

export interface User {
  id: string;
  displayName: string;
  createdAt: string;
  learnerProfile: LearnerProfile;
}

export interface StudyPlan {
  id: string;
  userId: string;
  title: string;
  description: string;
  sourceText: string;
  status: "active" | "completed" | "paused";
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Concept {
  id: string;
  userId: string;
  name: string;
  nameNormalized: string;
  description: string;
  keyTermsJson: string; // JSON string[]
  proficiency: number;
  confidence: number;
  easeFactor: number;
  interval: number;
  repetitionCount: number;
  lastPracticed: string | null;
  nextDue: string | null;
  attemptCount: number;
  isDeprecated: boolean;
  isManuallyAdjusted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UnitGraph {
  id: string;
  studyPlanId: string;
  title: string;
  description: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface GraphMembership {
  id: string;
  conceptId: string;
  unitGraphId: string;
  positionX: number;
  positionY: number;
  depthTier: number;
  addedAt: string;
  addedBy: string;
}

export interface GraphLink {
  id: string;
  fromGraphId: string;
  toGraphId: string;
  linkType: string;
  sharedContext: string;
  status: "proposed" | "active" | "rejected";
  createdAt: string;
}

export interface ConceptNode {
  id: string;
  studyPlanId: string;
  name: string;
  description: string;
  keyTermsJson: string; // JSON string[]
  difficultyTier: 1 | 2 | 3;
  proficiency: number;
  confidence: number;
  easeFactor: number;
  interval: number;
  repetitionCount: number;
  lastPracticed: string | null;
  nextDue: string | null;
  attemptCount: number;
  isDeprecated: boolean;
  isManuallyAdjusted: boolean;
  positionX: number;
  positionY: number;
}

export interface ConceptEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  unitGraphId: string | null;
  studyPlanId: string | null;
  edgeType: string;
}

export type QuestionType = "flashcard" | "fill_blank" | "free_response" | "mcq";

export interface Question {
  id: string;
  conceptId: string;
  conceptName?: string; // populated by GET /questions selector
  questionType: QuestionType;
  questionText: string;
  correctAnswer: string;
  distractorsJson: string; // JSON string[]
  explanation: string;
  difficulty: number;
  createdAt: string;
  sources?: Array<{ index: number; pageTitle: string; pageUrl: string }>;
}

export interface AttemptRecord {
  id: string;
  questionId: string;
  userId: string;
  userAnswer: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
  misconceptionsJson: string; // JSON string[]
  timeTaken: number;
  createdAt: string;
  sessionId: string | null;
}

export type SessionType = "diagnosis" | "practice" | "review";

export interface SessionRecord {
  id: string;
  unitGraphId: string | null;
  studyPlanId: string | null;
  sessionType: SessionType;
  startTime: string;
  endTime: string | null;
  questionsAttempted: number;
  questionsCorrect: number;
  conceptsCoveredJson: string; // JSON string[]
}

export interface ChatThread {
  id: string;
  userId: string;
  studyPlanId: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  toolCallsJson: string;
  toolResultsJson: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// JSON field helpers
// ---------------------------------------------------------------------------

export function parseJsonField<T>(json: string): T {
  try {
    return JSON.parse(json);
  } catch {
    return [] as unknown as T;
  }
}

export function toJsonField(data: unknown): string {
  return JSON.stringify(data);
}

// ---------------------------------------------------------------------------
// LLM output types (what MiniMax returns, validated with Zod)
// ---------------------------------------------------------------------------

export interface LLMConceptNode {
  name: string;
  description: string;
  keyTerms: string[];
  difficultyTier: 1 | 2 | 3;
}

export interface LLMConceptEdge {
  from: string; // concept name
  to: string; // concept name (prerequisite → dependent)
  edgeType?: "prerequisite" | "helpful";
}

export interface LLMConceptGraph {
  concepts: LLMConceptNode[];
  edges: LLMConceptEdge[];
}

export interface LLMQuestion {
  questionType: QuestionType;
  questionText: string;
  correctAnswer: string;
  distractors?: string[];
  explanation: string;
  difficulty: number;
}

export interface LLMEvaluation {
  isCorrect: boolean;
  score: number;
  feedback: string;
  misconceptions: string[];
}

export interface GapAnalysis {
  missingConcept: string;
  severity: "NARROW" | "MODERATE" | "BROAD";
  explanation: string;
}

export interface EnhancedEvaluationResult {
  correct: boolean;
  score: number;             // 0.0-1.0
  feedback: string;          // Short feedback
  explanation: string;       // Longer explanation
  errorType: "CORRECT" | "MINOR" | "MISCONCEPTION" | "PREREQUISITE_GAP";
  gapAnalysis?: GapAnalysis; // Only when errorType is PREREQUISITE_GAP
}

export interface GapDetection {
  id: string;
  userId: string;
  conceptId: string;
  missingConcept: string;
  severity: "NARROW" | "MODERATE" | "BROAD";
  explanation: string;
  status: "detected" | "proposed" | "accepted" | "declined";
  createdAt: string;
}

// ---------------------------------------------------------------------------
// RAG / Wikipedia Integration
// ---------------------------------------------------------------------------

export interface SourceChunk {
  id: string;
  conceptId: string;
  studyPlanId: string;
  source: "wikipedia" | "wikibooks";
  pageTitle: string;
  pageUrl: string;
  sectionHeading: string;
  content: string;
  createdAt: string;
}
