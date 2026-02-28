import { create } from "zustand";
import type { UseBoundStore, StoreApi } from "zustand";
import type {
  StudyPlan,
  Concept,
  UnitGraph,
  GraphMembership,
  ConceptEdge,
  Question,
  SessionRecord,
  LearnerProfile,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Global app state store (Zustand)
// ---------------------------------------------------------------------------

export type ChatPhase = "idle" | "gathering" | "proposing" | "structuring" | "done";

export interface ChatContext {
  mode: "idle" | "practicing" | "exploring" | "planning";
  activeConceptId?: string;
  activeUnitGraphId?: string;
  recentAttempts?: {
    conceptId: string;
    isCorrect: boolean;
    score: number;
  }[];
}

export interface AdvisorCard {
  type: "review" | "continue" | "remediate" | "extend" | "bridge" | "new_domain";
  title: string;
  pitch: string;
  conceptId?: string;
  unitGraphId?: string;
  priority: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  messageType?: "text" | "advisor_cards";
  advisorCards?: AdvisorCard[];
  sources?: Array<{ index: number; pageTitle: string; pageUrl: string }>;
}

export interface LessonPlan {
  totalConcepts: number;
  reusedConceptCount: number;
  percentageKnown: number;
  tier1: string[];
  tier2: string[];
  tier3: string[];
}

interface AppState {
  // Active study plan
  activeStudyPlanId: string | null;
  studyPlans: StudyPlan[];

  // Active unit graph (curriculum lens)
  activeUnitGraphId: string | null;
  unitGraphs: UnitGraph[];
  graphConcepts: Concept[];
  graphMemberships: GraphMembership[];
  graphEdges: ConceptEdge[];
  sharedConceptIds: string[]; // Concepts shared with other graphs in same study plan

  // Legacy fields (kept for backward compatibility during migration)
  conceptNodes: Concept[]; // Now maps to graphConcepts
  conceptEdges: ConceptEdge[]; // Now maps to graphEdges

  // User profile
  learnerProfile: LearnerProfile;

  // Practice session
  currentSession: SessionRecord | null;
  currentQuestions: Question[];
  currentQuestionIndex: number;
  currentSessionScore: number; // running accuracy 0.0-1.0

  // UI state
  activeTab: "chat" | "learn" | "graph";
  isLoading: boolean;
  loadingMessage: string;

  // Chat state machine
  chatPhase: ChatPhase;
  chatIsGenerating: boolean; // true while handleApprove is running (survives tab switches)
  proposedLessonPlan: string | null;
  chatLessonPlan: LessonPlan | null;
  sourceText: string;
  priorKnowledge: string;
  chatMessages: ChatMessage[];

  // Practice targeting
  targetConceptId: string | null;

  // Gap detection redirect tracking
  // When practice redirects to a prerequisite, this stores the original concept ID
  // so practice can redirect back after the prerequisite is mastered.
  redirectedFromConceptId: string | null;

  // Learn tab session persistence (survives tab switches)
  learnPhase: "idle" | "generating" | "loading" | "practicing" | "feedback" | "complete";
  learnActiveStudyPlanId: string | null;
  learnNoQuestionsMessage: string | null; // persists across tab switches
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  learnLastResult: any | null; // AttemptResult — persisted for feedback restore
  learnSessionStats: { attempted: number; correct: number };

  // Pre-fetched explanation for wrong answers (bridged to chat on "Explain this")
  pendingExplanation: string | null;
  pendingExplanationConcept: string | null;

  // Web tab notification badge (count of nodes added while not on /graph)
  webTabNotificationCount: number;

  // Actions
  setActiveStudyPlan: (id: string | null) => void;
  setStudyPlans: (plans: StudyPlan[]) => void;
  setActiveUnitGraphId: (id: string | null) => void;
  setUnitGraphs: (graphs: UnitGraph[]) => void;
  setGraphConcepts: (concepts: Concept[]) => void;
  setGraphMemberships: (memberships: GraphMembership[]) => void;
  setGraphEdges: (edges: ConceptEdge[]) => void;
  setSharedConceptIds: (ids: string[]) => void;
  setConceptNodes: (nodes: Concept[]) => void; // Legacy, maps to setGraphConcepts
  setConceptEdges: (edges: ConceptEdge[]) => void; // Legacy, maps to setGraphEdges
  setLearnerProfile: (profile: LearnerProfile | null) => void;
  setCurrentSession: (session: SessionRecord | null) => void;
  setCurrentQuestions: (questions: Question[]) => void;
  setCurrentQuestionIndex: (index: number) => void;
  setActiveTab: (tab: "chat" | "learn" | "graph") => void;
  setLoading: (loading: boolean, message?: string) => void;
  setCurrentSessionScore: (score: number) => void;

  // Chat state machine actions
  setChatPhase: (phase: ChatPhase) => void;
  setProposedLessonPlan: (plan: string | null) => void;
  setChatLessonPlan: (plan: LessonPlan | null) => void;
  setSourceText: (text: string) => void;
  setPriorKnowledge: (knowledge: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  resetChatState: () => void;

  // Practice targeting actions
  setTargetConceptId: (id: string | null) => void;

  // Gap detection redirect actions
  setRedirectedFromConceptId: (conceptId: string | null) => void;

  // Learn tab session persistence actions
  setLearnPhase: (phase: "idle" | "generating" | "loading" | "practicing" | "feedback" | "complete") => void;
  setLearnActiveStudyPlanId: (id: string | null) => void;
  setLearnNoQuestionsMessage: (msg: string | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setLearnLastResult: (result: any | null) => void;
  setLearnSessionStats: (stats: { attempted: number; correct: number }) => void;
  // Chat generation persistence
  setChatIsGenerating: (generating: boolean) => void;

  // Pending explanation actions
  setPendingExplanation: (text: string | null, concept?: string | null) => void;

  // Web tab notification actions
  incrementWebNotification: () => void;
  clearWebNotification: () => void;

  // Chat context actions
  chatContext: ChatContext;
  setChatContext: (ctx: ChatContext) => void;
  updateChatContextMode: (mode: ChatContext["mode"]) => void;
  recordAttemptInContext: (attempt: { conceptId: string; isCorrect: boolean; score: number }) => void;

  // Data loading actions
  loadStudyPlanData: (planId: string) => Promise<void>;
  loadUnitGraphData: (unitGraphId: string) => Promise<void>;
  loadStudyPlans: () => Promise<void>;

  // Derived helpers
  updateConceptProficiency: (conceptId: string, proficiency: number, confidence: number) => void;
  getCurrentQuestion: () => Question | null;
  advanceQuestion: () => void;
}

const store: UseBoundStore<StoreApi<AppState>> = create<AppState>((set) => ({
  // Initial state
  activeStudyPlanId: null,
  studyPlans: [],
  activeUnitGraphId: null,
  unitGraphs: [],
  graphConcepts: [],
  graphMemberships: [],
  graphEdges: [],
  sharedConceptIds: [],
  conceptNodes: [], // Legacy
  conceptEdges: [], // Legacy
  learnerProfile: { background: [], goals: [], interests: [] },
  currentSession: null,
  currentQuestions: [],
  currentQuestionIndex: 0,
  currentSessionScore: 0,
  activeTab: "chat",
  isLoading: false,
  loadingMessage: "",

  // Chat state machine initial state
  chatPhase: "idle",
  chatIsGenerating: false,
  proposedLessonPlan: null,
  chatLessonPlan: null,
  sourceText: "",
  priorKnowledge: "",
  chatMessages: [],

  // Practice targeting initial state
  targetConceptId: null,

  // Gap detection redirect initial state
  redirectedFromConceptId: null,

  // Learn tab session persistence initial state
  learnPhase: "idle",
  learnActiveStudyPlanId: null,
  learnNoQuestionsMessage: null,
  learnLastResult: null,
  learnSessionStats: { attempted: 0, correct: 0 },

  // Pending explanation initial state
  pendingExplanation: null,
  pendingExplanationConcept: null,

  // Web tab notification initial state
  webTabNotificationCount: 0,

  // Chat context initial state
  chatContext: { mode: "idle" },

  // Actions
  setActiveStudyPlan: (id) => set({ activeStudyPlanId: id }),
  setStudyPlans: (plans) => set({ studyPlans: plans }),
  setActiveUnitGraphId: (id) => set({ activeUnitGraphId: id }),
  setUnitGraphs: (graphs) => set({ unitGraphs: graphs }),
  setGraphConcepts: (concepts) => set({ graphConcepts: concepts, conceptNodes: concepts }),
  setGraphMemberships: (memberships) => set({ graphMemberships: memberships }),
  setGraphEdges: (edges) => set({ graphEdges: edges, conceptEdges: edges }),
  setSharedConceptIds: (ids) => set({ sharedConceptIds: ids }),
  setConceptNodes: (nodes) => set({ conceptNodes: nodes, graphConcepts: nodes }), // Legacy, syncs both
  setConceptEdges: (edges) => set({ conceptEdges: edges, graphEdges: edges }), // Legacy, syncs both
  setLearnerProfile: (profile) =>
    set({
      learnerProfile: profile ?? { background: [], goals: [], interests: [] },
    }),
  setCurrentSession: (session) => set({ currentSession: session }),
  setCurrentQuestions: (questions) => set({ currentQuestions: questions }),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setLoading: (loading, message = "") =>
    set({ isLoading: loading, loadingMessage: message }),
  setCurrentSessionScore: (score) => set({ currentSessionScore: score }),

  // Chat state machine actions
  setChatPhase: (phase) => set({ chatPhase: phase }),
  setProposedLessonPlan: (plan) => set({ proposedLessonPlan: plan }),
  setChatLessonPlan: (plan) => set({ chatLessonPlan: plan }),
  setSourceText: (text) => set({ sourceText: text }),
  setPriorKnowledge: (knowledge) => set({ priorKnowledge: knowledge }),
  addChatMessage: (message) =>
    set((state) => ({ chatMessages: [...state.chatMessages, message] })),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  resetChatState: () =>
    set({
      chatPhase: "idle",
      chatIsGenerating: false,
      proposedLessonPlan: null,
      chatLessonPlan: null,
      sourceText: "",
      priorKnowledge: "",
      chatMessages: [],
    }),

  updateConceptProficiency: (conceptId, proficiency, confidence) =>
    set((state) => ({
      graphConcepts: state.graphConcepts.map((node) =>
        node.id === conceptId
          ? { ...node, proficiency, confidence }
          : node
      ),
      conceptNodes: state.conceptNodes.map((node) =>
        node.id === conceptId
          ? { ...node, proficiency, confidence }
          : node
      ),
    })),

  setTargetConceptId: (id) => set({ targetConceptId: id }),
  setRedirectedFromConceptId: (conceptId) => set({ redirectedFromConceptId: conceptId }),
  setLearnPhase: (phase) => set({ learnPhase: phase }),
  setLearnActiveStudyPlanId: (id) => set({ learnActiveStudyPlanId: id }),
  setLearnNoQuestionsMessage: (msg) => set({ learnNoQuestionsMessage: msg }),
  setLearnLastResult: (result) => set({ learnLastResult: result }),
  setLearnSessionStats: (stats) => set({ learnSessionStats: stats }),
  setChatIsGenerating: (generating) => set({ chatIsGenerating: generating }),

  // Pending explanation actions
  setPendingExplanation: (text, concept = null) =>
    set({ pendingExplanation: text, pendingExplanationConcept: concept }),

  // Web tab notification actions
  incrementWebNotification: () =>
    set((state) => ({ webTabNotificationCount: state.webTabNotificationCount + 1 })),
  clearWebNotification: () =>
    set({ webTabNotificationCount: 0 }),

  // Chat context actions
  setChatContext: (ctx) => set({ chatContext: ctx }),
  updateChatContextMode: (mode) =>
    set((state) => ({ chatContext: { ...state.chatContext, mode } })),
  recordAttemptInContext: (attempt) =>
    set((state) => ({
      chatContext: {
        ...state.chatContext,
        recentAttempts: [
          attempt,
          ...(state.chatContext.recentAttempts ?? []),
        ].slice(0, 5),
      },
    })),

  getCurrentQuestion: () => {
    const { currentQuestions, currentQuestionIndex } = store.getState();
    return currentQuestions[currentQuestionIndex] ?? null;
  },

  advanceQuestion: () => {
    const nextIndex = store.getState().currentQuestionIndex + 1;
    set({ currentQuestionIndex: nextIndex });
  },

  // ---------------------------------------------------------------------------
  // Data loading: hydrate store from API
  // ---------------------------------------------------------------------------

  loadStudyPlanData: async (planId: string) => {
    try {
      const { getUserId } = await import("@/lib/auth");
      const userId = getUserId();

      const res = await fetch(`/api/study-plans/${planId}`, {
        headers: { "x-user-id": userId },
      });
      if (!res.ok) throw new Error("Failed to load study plan");
      const { plan } = await res.json();

      // New structure: plan.unitGraphs with memberships
      const unitGraphs = plan.unitGraphs ?? [];

      set({
        activeStudyPlanId: planId,
        unitGraphs: unitGraphs,
      });

      // Also add/update this plan in the studyPlans array
      set((state) => ({
        studyPlans: state.studyPlans.some((p) => p.id === planId)
          ? state.studyPlans.map((p) => (p.id === planId ? plan : p))
          : [...state.studyPlans, plan],
      }));

      // Automatically load the first graph if available
      if (unitGraphs.length > 0) {
        const { loadUnitGraphData } = store.getState();
        await loadUnitGraphData(unitGraphs[0].id);
      }
    } catch (error) {
      console.error("Failed to load study plan data:", error);
    }
  },

  loadUnitGraphData: async (unitGraphId: string) => {
    try {
      const res = await fetch(`/api/unit-graphs/${unitGraphId}`);
      if (!res.ok) throw new Error("Failed to load unit graph");
      const { graph, concepts, memberships, edges, sharedConceptIds } = await res.json();

      set({
        activeUnitGraphId: unitGraphId,
        graphConcepts: concepts ?? [],
        graphMemberships: memberships ?? [],
        graphEdges: edges ?? [],
        sharedConceptIds: sharedConceptIds ?? [],
        conceptNodes: concepts ?? [],
        conceptEdges: edges ?? [],
      });
    } catch (error) {
      console.error("Failed to load unit graph data:", error);
    }
  },

  loadStudyPlans: async () => {
    try {
      // Import inside the function to avoid issues with server-side rendering
      const { getUserId } = await import("@/lib/auth");
      const userId = getUserId();

      const res = await fetch("/api/study-plans", {
        headers: { "x-user-id": userId },
      });
      if (!res.ok) throw new Error("Failed to load study plans");
      const { plans } = await res.json();
      // Sort ascending by createdAt so newest plan is last
      const sorted = [...(plans as StudyPlan[])].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      set({ studyPlans: sorted });

      // Only set active plan if none is currently set
      set((state) => {
        if (state.activeStudyPlanId) {
          // Already has an active plan, don't override
          return {};
        }
        // Set to most recent plan (last after sort) for page refresh
        if (sorted.length > 0) {
          return { activeStudyPlanId: sorted[sorted.length - 1].id };
        }
        return {};
      });
    } catch (error) {
      console.error("Failed to load study plans:", error);
    }
  },
}));

export const useAppStore = store;
