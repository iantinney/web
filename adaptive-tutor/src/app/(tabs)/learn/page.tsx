"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { BookOpen, Loader2, ChevronRight, X, CheckCircle, XCircle, Trophy, Target, ArrowLeft, ArrowRight, ArrowDown, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { getUserId } from "@/lib/auth";
import { getLockedConcepts } from "@/lib/algorithms/prerequisiteChecker";
import { DEFAULT_SESSION_LENGTH } from "@/lib/config";
import type { Question } from "@/lib/types";
import { GapProposalCard } from "@/components/GapProposalCard";
import { ExtensionProposalCard } from "@/components/ExtensionProposalCard";
import { findDemoSeed } from "@/lib/demo-seeds";
import { renderWithCitations, extractCitations } from "@/lib/rag/citation-renderer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AttemptResult {
  isCorrect: boolean;
  feedback: string;
  explanation: string | null;
  score: number;
  errorType?: string | null;
  gapAnalysis?: {
    missingPrerequisite?: string | null;
    missingConcept?: string | null;
    confidence?: number | null;
  } | null;
  proficiencyUpdate: {
    conceptId: string;
    conceptName?: string;
    previousProficiency: number;
    newProficiency: number;
    previousConfidence: number;
    newConfidence: number;
  };
  sessionUpdate: {
    sessionId: string;
    questionsAttempted: number;
    questionsCorrect: number;
    accuracy: number;
  };
}

// ---------------------------------------------------------------------------
// Helper: shuffle array in place
// ---------------------------------------------------------------------------
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// LearnPage
// ---------------------------------------------------------------------------

export default function LearnPage() {
  const router = useRouter();
  const {
    activeStudyPlanId,
    activeUnitGraphId,
    studyPlans,
    setActiveStudyPlan,
    updateConceptProficiency,
    setCurrentQuestions,
    setCurrentQuestionIndex,
    targetConceptId,
    setTargetConceptId,
    setCurrentSession,
    graphConcepts,
    graphEdges,
    redirectedFromConceptId,
    setRedirectedFromConceptId,
    loadUnitGraphData,
    pendingExplanation,
    incrementWebNotification,
  } = useAppStore();

  // ------------------------------------------------------------------
  // Session state machine
  // ------------------------------------------------------------------
  const [phase, setPhase] = useState<"idle" | "generating" | "loading" | "practicing" | "feedback" | "complete">("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStart, setSessionStart] = useState<Date>(new Date());
  const [isFlipped, setIsFlipped] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [lastResult, setLastResult] = useState<AttemptResult | null>(null);
  const [sessionStats, setSessionStats] = useState({ attempted: 0, correct: 0 });
  const [selectedMcqOption, setSelectedMcqOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noQuestionsMessage, setNoQuestionsMessage] = useState<string | null>(null);
  // Per-session attempt accumulation for the per-concept summary on the complete screen
  const [sessionAttempts, setSessionAttempts] = useState<AttemptResult[]>([]);
  // Optimistic total shown in "Question X of Y" — may exceed actual questions loaded so far
  const [displayedTotal, setDisplayedTotal] = useState(0);

  const [generationProgress, setGenerationProgress] = useState(0);
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);

  // ------------------------------------------------------------------
  // Gap detection proposal state
  // ------------------------------------------------------------------
  interface GapProposal {
    conceptName: string;       // The concept user was struggling with
    missingConceptName: string; // The detected prerequisite gap
    explanation: string;
    targetConceptId: string;   // ID of the struggling concept
  }
  const [showGapProposal, setShowGapProposal] = useState<GapProposal | null>(null);
  const [isInsertingConcept, setIsInsertingConcept] = useState(false);
  const [gapRedirectMessage, setGapRedirectMessage] = useState<string | null>(null);

  // On-demand analysis state (keyboard shortcuts / buttons)
  const [isAnalyzingGap, setIsAnalyzingGap] = useState(false);
  const [isAnalyzingExtension, setIsAnalyzingExtension] = useState(false);

  interface ExtensionProposal {
    conceptName: string;           // Current concept (anchor)
    suggestedConceptName: string;  // Extension to add
    explanation: string;
    anchorConceptId: string;       // ID of the current concept
  }
  const [extensionProposal, setExtensionProposal] = useState<ExtensionProposal | null>(null);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionStartTimeRef = useRef<number>(Date.now());
  const skipFeedbackRef = useRef(false);
  const handleAdvanceRef = useRef<() => void | Promise<void>>(() => {});
  const sessionCompletedRef = useRef(false);

  // ------------------------------------------------------------------
  // framer-motion drag values (for flashcard swipe indicators)
  // ------------------------------------------------------------------
  const dragX = useMotionValue(0);
  const leftIndicatorOpacity = useTransform(dragX, [-150, -80, 0], [1, 0.5, 0]);
  const rightIndicatorOpacity = useTransform(dragX, [0, 80, 150], [0, 0.5, 1]);

  // ------------------------------------------------------------------
  // Derived: current question
  // ------------------------------------------------------------------
  const currentQuestion: Question | null = questions[questionIndex] ?? null;

  // ------------------------------------------------------------------
  // MCQ: shuffle options once per question (locked shuffle using useMemo)
  // ------------------------------------------------------------------
  const shuffledMcqOptions = useMemo(() => {
    if (!currentQuestion || currentQuestion.questionType !== "mcq") return [];
    const distractors: string[] = (() => {
      try {
        return JSON.parse(currentQuestion.distractorsJson) as string[];
      } catch {
        return [];
      }
    })();
    const options = [currentQuestion.correctAnswer, ...distractors];
    return shuffleArray(options);
    // Intentionally only recalculates when questionIndex or questions changes
  }, [questionIndex, questions]);

  // Gate: sync effects must NOT fire until initial restore is complete,
  // otherwise useState defaults ("idle", null, {0,0}) overwrite the store
  // before the restore effect reads it.
  const hasRestoredRef = useRef(false);

  // ------------------------------------------------------------------
  // On mount / when activeStudyPlanId changes: restore or reset
  // ------------------------------------------------------------------
  useEffect(() => {
    hasRestoredRef.current = false; // block sync effects during restore
    const store = useAppStore.getState();
    // Returning from a tab switch with an active session — restore state
    if (store.learnActiveStudyPlanId === activeStudyPlanId) {
      if (store.learnPhase === "practicing" || store.learnPhase === "feedback") {
        if (store.currentQuestions.length > 0) {
          setQuestions([...store.currentQuestions]);
          setDisplayedTotal(Math.max(store.currentQuestions.length, DEFAULT_SESSION_LENGTH));
          setQuestionIndex(store.currentQuestionIndex);
          setSessionId(store.currentSession?.id ?? null);
          setSessionStats(store.learnSessionStats);
          if (store.learnPhase === "feedback" && store.learnLastResult) {
            setLastResult(store.learnLastResult);
            setPhase("feedback");
          } else {
            setPhase("practicing");
          }
          // Allow sync effects after restore is applied
          requestAnimationFrame(() => { hasRestoredRef.current = true; });
          return;
        }
      }
      if (store.learnPhase === "loading") {
        setPhase("loading");
        requestAnimationFrame(() => { hasRestoredRef.current = true; });
        return;
      }
      if (store.learnPhase === "complete") {
        setPhase("complete");
        setNoQuestionsMessage(store.learnNoQuestionsMessage);
        requestAnimationFrame(() => { hasRestoredRef.current = true; });
        return;
      }
    }
    // Study plan changed or no active session — reset to idle
    setPhase("idle");
    setQuestions([]);
    setQuestionIndex(0);
    setSessionId(null);
    setLastResult(null);
    setSessionStats({ attempted: 0, correct: 0 });
    setNoQuestionsMessage(null);
    store.setLearnActiveStudyPlanId(activeStudyPlanId);
    requestAnimationFrame(() => { hasRestoredRef.current = true; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudyPlanId]);

  // Sync local state → store (gated by hasRestoredRef to prevent mount overwrites)
  useEffect(() => {
    if (hasRestoredRef.current) useAppStore.getState().setLearnPhase(phase);
  }, [phase]);
  useEffect(() => {
    if (hasRestoredRef.current) useAppStore.getState().setLearnLastResult(lastResult);
  }, [lastResult]);
  useEffect(() => {
    if (hasRestoredRef.current) useAppStore.getState().setLearnSessionStats(sessionStats);
  }, [sessionStats]);
  useEffect(() => {
    if (hasRestoredRef.current) useAppStore.getState().setLearnNoQuestionsMessage(noQuestionsMessage);
  }, [noQuestionsMessage]);

  // ------------------------------------------------------------------
  // initSession: called when user clicks "Start Practice"
  // @param requestAll: if true, fetch all questions (including practiced/non-due ones)
  // ------------------------------------------------------------------
  const initSession = useCallback(async (requestAll: boolean = false) => {
    if (!activeStudyPlanId) return;

    // Clear target immediately so returning to this tab later doesn't re-trigger
    if (targetConceptId) setTargetConceptId(null);

    // 1. Fire-and-forget generate-questions (idempotent — no-op if already generated).
    //    Do NOT await — question generation can take 30-60s for new study plans.
    //    If questions don't exist yet, the fetch below returns 0 and we show a retry message.
    setNoQuestionsMessage(null);
    setPhase("loading");
    const userId = getUserId();
    fetch(`/api/study-plans/${activeStudyPlanId}/generate-questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": userId },
      body: JSON.stringify({ userId }),
    }).catch(() => {/* fire-and-forget — errors are silent */});

    // 2. GET/create session
    let sid: string | null = null;
    try {
      const sessionRes = await fetch(
        `/api/study-plans/${activeStudyPlanId}/session`,
        {
          headers: { "x-user-id": userId },
        }
      );
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        sid = sessionData.session?.id ?? null;
        // Store the session in Zustand
        setCurrentSession(sessionData.session ?? null);
      }
    } catch {
      // continue without session id
    }

    // 3. GET questions with retry for first-time generation.
    //    Questions may not exist yet (generation is fire-and-forget).
    //    Retry up to 3 times with 4s gap — first batch of 3 concepts usually ready in ~5-10s.
    async function fetchQuestions(): Promise<Question[]> {
      const conceptIdParam = targetConceptId ? `&conceptId=${targetConceptId}` : "";
      const dueParam = requestAll ? "" : "due=1&";
      try {
        const qRes = await fetch(
          `/api/study-plans/${activeStudyPlanId}/questions?${dueParam}limit=${DEFAULT_SESSION_LENGTH}${conceptIdParam}&userId=${userId}`,
          { headers: { "x-user-id": userId } }
        );
        if (qRes.ok) {
          const qData = await qRes.json();
          const qs: Question[] = qData.questions ?? [];
          if (qs.length > 0) return qs;
        }
      } catch { /* fall through */ }
      // Fallback: fetch all (ignore due filter)
      try {
        const qRes = await fetch(
          `/api/study-plans/${activeStudyPlanId}/questions?limit=${DEFAULT_SESSION_LENGTH}&userId=${userId}`,
          { headers: { "x-user-id": userId } }
        );
        if (qRes.ok) {
          const qData = await qRes.json();
          return qData.questions ?? [];
        }
      } catch { /* fall through */ }
      return [];
    }

    let fetchedQuestions = await fetchQuestions();

    // If nothing yet, retry up to 3 more times (4s apart) while generation runs in background
    if (fetchedQuestions.length === 0) {
      for (let attempt = 0; attempt < 3 && fetchedQuestions.length === 0; attempt++) {
        await new Promise((r) => setTimeout(r, 4000));
        fetchedQuestions = await fetchQuestions();
      }
    }

    // 4. Handle results
    if (fetchedQuestions.length === 0) {
      setNoQuestionsMessage("No questions available — try again in a moment.");
      setPhase("complete");
      return;
    }

    setSessionId(sid);
    sessionCompletedRef.current = false; // Reset for the new session — tab switch must NOT trigger PATCH
    setSessionStart(new Date());
    setQuestions(fetchedQuestions);
    // Show an optimistic total so "Question X of Y" doesn't reveal that only a few are loaded.
    // By the time the user works through the first batch, generation will have completed.
    setDisplayedTotal(Math.max(fetchedQuestions.length, DEFAULT_SESSION_LENGTH));
    setQuestionIndex(0);
    setCurrentQuestions(fetchedQuestions);
    setCurrentQuestionIndex(0);
    setSessionStats({ attempted: 0, correct: 0 });
    setSessionAttempts([]); // Clear per-session attempt accumulation for the new session
    setLastResult(null);
    setIsFlipped(false);
    setTextInput("");
    setCharCount(0);
    setSelectedMcqOption(null);
    questionStartTimeRef.current = Date.now();
    dragX.set(0);
    setPhase("practicing");
  }, [activeStudyPlanId, dragX, setCurrentQuestionIndex, setCurrentQuestions, setCurrentSession, targetConceptId]);

  // Auto-start session when arriving via "Practice this" advisor card
  useEffect(() => {
    if (targetConceptId && activeStudyPlanId && phase === "idle") {
      initSession();
    }
    // Only fire when targetConceptId changes; phase/initSession are runtime guards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetConceptId]);

  // ------------------------------------------------------------------
  // Reset per-question state when questionIndex changes
  // ------------------------------------------------------------------
  useEffect(() => {
    setIsFlipped(false);
    setTextInput("");
    setCharCount(0);
    setSelectedMcqOption(null);
    dragX.set(0);
    questionStartTimeRef.current = Date.now();
  }, [questionIndex, dragX]);

  // ------------------------------------------------------------------
  // Cleanup timer and session on unmount
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      // Do NOT PATCH the session here — this fires on tab switch too.
      // Session PATCH is sent exclusively in handleAdvance when all questions
      // are exhausted (explicit completion). Tab switches must NOT end the session
      // so the tab-switch restore guard (lines 148-173) can resume practice.
      setCurrentSession(null);
      setTargetConceptId(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------------------------
  // Core: submit attempt
  // ------------------------------------------------------------------
  const submitAttempt = useCallback(
    async (questionId: string, userAnswer: string, timeTaken: number) => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        const userId = getUserId();
        const res = await fetch(
          `/api/study-plans/${activeStudyPlanId}/attempt`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-user-id": userId },
            body: JSON.stringify({ questionId, userAnswer, timeTaken, sessionId, userId }),
          }
        );

        if (!res.ok) {
          console.error("Attempt submission failed:", await res.text());
          skipFeedbackRef.current = false;
          setIsSubmitting(false);
          return;
        }

        const result: AttemptResult = await res.json();
        setLastResult(result);
        // Accumulate attempt for per-concept session summary on complete screen
        setSessionAttempts((prev) => [...prev, result]);

        // Update chatContext with this attempt — use direct store access to avoid stale closures
        // (same pattern used for redirectedFromConceptId in this function)
        const store = useAppStore.getState();
        store.recordAttemptInContext({
          conceptId: result.proficiencyUpdate.conceptId,
          isCorrect: result.isCorrect,
          score: result.score ?? 0,
        });
        store.setChatContext({
          ...store.chatContext,
          activeConceptId: result.proficiencyUpdate.conceptId,
          activeUnitGraphId: store.activeUnitGraphId ?? undefined,
        });

        // Update Zustand conceptNodes proficiency
        updateConceptProficiency(
          result.proficiencyUpdate.conceptId,
          result.proficiencyUpdate.newProficiency,
          result.proficiencyUpdate.newConfidence
        );

        // NOTE: Proficiency is already persisted atomically by the attempt route.
        // Do NOT fire-and-forget another update here — it creates a race condition
        // where stale data could overwrite the transaction's results.

        // Check if we should redirect back to the original concept
        // (user had been redirected to a prerequisite and just mastered it)
        // ONLY redirect if: (1) we were redirected here, AND (2) this is the prerequisite concept, AND (3) it's mastered
        const { redirectedFromConceptId: currentRedirectId } = useAppStore.getState();
        if (
          currentRedirectId &&
          result.proficiencyUpdate.conceptId !== currentRedirectId && // Must be a different concept (the prerequisite)
          result.proficiencyUpdate.newProficiency >= 0.8
        ) {
          const originalConceptId = currentRedirectId;
          const prereqName = currentQuestion?.conceptName ?? "the prerequisite";
          setRedirectedFromConceptId(null);
          setTargetConceptId(originalConceptId);
          setGapRedirectMessage(
            `You've mastered ${prereqName}! Redirecting back to your original concept.`
          );
          // Re-initialize session targeting the original concept
          setTimeout(() => {
            setGapRedirectMessage(null);
          }, 3000);
        }

        // Gap detection check: look for 2-occurrence pattern after each attempt
        if (activeStudyPlanId && result.proficiencyUpdate.conceptId && !showGapProposal) {
          const conceptId = result.proficiencyUpdate.conceptId;
          fetch(
            `/api/study-plans/${activeStudyPlanId}/gap-detections?conceptId=${conceptId}`,
            {
              method: "GET",
              headers: { "x-user-id": userId },
            }
          )
            .then((r) => r.json())
            .then((gapData) => {
              if (gapData.hasPattern && gapData.missingConcept) {
                // Find the concept name for display
                const conceptName =
                  graphConcepts.find((c) => c.id === conceptId)?.name ??
                  currentQuestion?.conceptName ??
                  "this concept";
                setShowGapProposal({
                  conceptName,
                  missingConceptName: gapData.missingConcept,
                  explanation: gapData.explanation ?? "",
                  targetConceptId: conceptId,
                });
              }
            })
            .catch(() => {
              // Non-blocking: gap detection failure should not affect practice flow
            });
        }

        // Update local session stats
        setSessionStats({
          attempted: result.sessionUpdate.questionsAttempted,
          correct: result.sessionUpdate.questionsCorrect,
        });

        // Flashcards skip the feedback screen and advance directly
        if (skipFeedbackRef.current) {
          skipFeedbackRef.current = false;
          handleAdvanceRef.current();
        } else {
          setPhase("feedback");

          // Pre-fetch explanation for wrong answers so it's ready when user clicks "Explain this"
          if (!result.isCorrect && currentQuestion) {
            const storeNow = useAppStore.getState();
            storeNow.setPendingExplanation(null); // clear previous
            fetch("/api/explain", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                question: currentQuestion.questionText,
                userAnswer: userAnswer,
                correctAnswer: currentQuestion.correctAnswer ?? "",
                feedback: result.feedback ?? "",
                conceptName: currentQuestion.conceptName ?? "",
                chatContext: storeNow.chatContext,
              }),
            })
              .then((r) => r.json())
              .then((data: { explanation: string }) => {
                useAppStore.getState().setPendingExplanation(
                  data.explanation,
                  currentQuestion.conceptName ?? null
                );
              })
              .catch(() => {
                // Non-blocking: explanation pre-fetch failure doesn't affect practice
              });
          }
        }
      } catch (err) {
        console.error("submitAttempt error:", err);
      } finally {
        setIsSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeStudyPlanId, sessionId, isSubmitting]
  );

  // ------------------------------------------------------------------
  // Advance to next question or complete
  // ------------------------------------------------------------------
  const handleAdvance = useCallback(async () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    // Clear pending explanation when advancing to next question
    useAppStore.getState().setPendingExplanation(null);
    // Reset analysis / proposal state so they don't persist across questions
    setExtensionProposal(null);
    setShowGapProposal(null);
    setIsAnalyzingGap(false);
    setIsAnalyzingExtension(false);

    const nextIndex = questionIndex + 1;
    if (nextIndex >= questions.length) {
      // Try to fetch more questions (may have been generated since session started)
      const store = useAppStore.getState();
      const userId = getUserId();
      let moreQuestions: Question[] = [];
      if (activeStudyPlanId) {
        try {
          const qRes = await fetch(
            `/api/study-plans/${activeStudyPlanId}/questions?limit=${DEFAULT_SESSION_LENGTH}&userId=${userId}`,
            { headers: { "x-user-id": userId } }
          );
          if (qRes.ok) {
            const qData = await qRes.json();
            const all: Question[] = qData.questions ?? [];
            // Only questions we haven't shown yet
            const seenIds = new Set(questions.map((q) => q.id));
            moreQuestions = all.filter((q) => !seenIds.has(q.id));
          }
        } catch { /* silent */ }
      }

      if (moreQuestions.length > 0) {
        // Append new questions and keep practicing seamlessly
        const extended = [...questions, ...moreQuestions];
        setQuestions(extended);
        setCurrentQuestions(extended);
        setDisplayedTotal(Math.max(extended.length, displayedTotal));
        setQuestionIndex(nextIndex);
        setCurrentQuestionIndex(nextIndex);
        setPhase("practicing");
        setLastResult(null);
        return;
      }

      // No more questions — complete the session
      sessionCompletedRef.current = true;
      if (activeStudyPlanId) {
        fetch(`/api/study-plans/${activeStudyPlanId}/session`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "x-user-id": userId },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {});
      }
      setCurrentSession(null);
      setTargetConceptId(null);
      setNoQuestionsMessage(null);
      setPhase("complete");
    } else {
      setQuestionIndex(nextIndex);
      setCurrentQuestionIndex(nextIndex);
      setPhase("practicing");
      setLastResult(null);
    }
  }, [questionIndex, questions, displayedTotal, activeStudyPlanId, sessionId, setCurrentQuestionIndex]);

  // Keep ref current so submitAttempt can call handleAdvance without stale closure
  useEffect(() => {
    handleAdvanceRef.current = handleAdvance;
  }, [handleAdvance]);

  // ------------------------------------------------------------------
  // MCQ: tap option → auto-submit
  // ------------------------------------------------------------------
  const handleMcqSelect = useCallback(
    (option: string) => {
      if (phase !== "practicing" || isSubmitting) return;
      setSelectedMcqOption(option);
      const timeTaken = Date.now() - questionStartTimeRef.current;
      submitAttempt(currentQuestion!.id, option, timeTaken);
    },
    [phase, isSubmitting, currentQuestion, submitAttempt]
  );

  // ------------------------------------------------------------------
  // Fill-blank: submit
  // ------------------------------------------------------------------
  const handleFillBlankSubmit = useCallback(() => {
    if (!textInput.trim() || phase !== "practicing" || isSubmitting) return;
    const timeTaken = Date.now() - questionStartTimeRef.current;
    submitAttempt(currentQuestion!.id, textInput.trim(), timeTaken);
  }, [textInput, phase, isSubmitting, currentQuestion, submitAttempt]);

  // ------------------------------------------------------------------
  // Free-response: submit
  // ------------------------------------------------------------------
  const handleFreeResponseSubmit = useCallback(() => {
    if (!textInput.trim() || phase !== "practicing" || isSubmitting) return;
    const timeTaken = Date.now() - questionStartTimeRef.current;
    submitAttempt(currentQuestion!.id, textInput, timeTaken);
  }, [textInput, phase, isSubmitting, currentQuestion, submitAttempt]);

  // ------------------------------------------------------------------
  // Flashcard: handle swipe result
  // ------------------------------------------------------------------
  const handleFlashcardSwipe = useCallback(
    async (direction: "left" | "right") => {
      const isCorrect = direction === "right";
      const userAnswer = isCorrect ? "got_it" : "missed_it";
      const timeTaken = Date.now() - questionStartTimeRef.current;
      skipFeedbackRef.current = true;
      await submitAttempt(currentQuestion!.id, userAnswer, timeTaken);
    },
    [currentQuestion, submitAttempt]
  );

  // ------------------------------------------------------------------
  // New session: reset state then start a fresh session
  // ------------------------------------------------------------------
  const handleNewSession = useCallback(() => {
    setQuestions([]);
    setQuestionIndex(0);
    setSessionId(null);
    setLastResult(null);
    setSessionStats({ attempted: 0, correct: 0 });
    setNoQuestionsMessage(null);
    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initSession]);

  // ------------------------------------------------------------------
  // Shared insertion handler for both gap (prerequisite) and extension flows
  // ------------------------------------------------------------------
  const handleInsertConcept = useCallback(async (
    type: "prerequisite" | "extension",
    conceptName: string,
    anchorConceptId: string,
  ) => {
    if (!activeStudyPlanId || !activeUnitGraphId) return;
    setIsInsertingConcept(true);

    try {
      const userId = getUserId();
      const insertRes = await fetch(
        `/api/study-plans/${activeStudyPlanId}/concepts/insert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": userId },
          body: JSON.stringify({
            unitGraphId: activeUnitGraphId,
            conceptName,
            targetConceptId: anchorConceptId,
            position: type,
          }),
        }
      );

      if (insertRes.ok) {
        const insertData = await insertRes.json();
        const insertedConceptId: string = insertData.conceptId;

        // Reload graph data so the new concept appears
        loadUnitGraphData(activeUnitGraphId).catch(() => {});

        // Notify Web tab that a new node was added
        incrementWebNotification();

        if (type === "prerequisite") {
          // Store redirect origin so mastery triggers redirect-back
          setRedirectedFromConceptId(anchorConceptId);
          setTargetConceptId(insertedConceptId);
          setGapRedirectMessage(
            `Added "${conceptName}" to your learning path. Let's master it first!`
          );
          setShowGapProposal(null);
        } else {
          // Extension: just start practicing the new concept (no redirect-back)
          setTargetConceptId(insertedConceptId);
          setGapRedirectMessage(
            `Added "${conceptName}" to your learning path. Let's explore it!`
          );
          setExtensionProposal(null);
        }

        // Reset session to start fresh on the new concept
        setQuestions([]);
        setQuestionIndex(0);
        setSessionId(null);
        setLastResult(null);
        setSessionStats({ attempted: 0, correct: 0 });
        setTimeout(() => {
          setGapRedirectMessage(null);
          initSession();
        }, 2000);
      } else {
        console.error("[handleInsertConcept] Insert failed:", await insertRes.text());
        setShowGapProposal(null);
        setExtensionProposal(null);
      }
    } catch (err) {
      console.error("[handleInsertConcept] Error:", err);
      setShowGapProposal(null);
      setExtensionProposal(null);
    } finally {
      setIsInsertingConcept(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudyPlanId, activeUnitGraphId, loadUnitGraphData, setRedirectedFromConceptId, setTargetConceptId, initSession, incrementWebNotification]);

  // ------------------------------------------------------------------
  // Gap proposal: confirm — wrapper calling shared handler
  // ------------------------------------------------------------------
  const handleGapConfirm = useCallback(() => {
    if (!showGapProposal) return;
    handleInsertConcept("prerequisite", showGapProposal.missingConceptName, showGapProposal.targetConceptId);
  }, [showGapProposal, handleInsertConcept]);

  // ------------------------------------------------------------------
  // Gap proposal: decline — dismiss the proposal and continue practice
  // ------------------------------------------------------------------
  const handleGapDecline = useCallback(() => {
    setShowGapProposal(null);
  }, []);

  // ------------------------------------------------------------------
  // Extension proposal: confirm/decline
  // ------------------------------------------------------------------
  const handleExtensionConfirm = useCallback(() => {
    if (!extensionProposal) return;
    handleInsertConcept("extension", extensionProposal.suggestedConceptName, extensionProposal.anchorConceptId);
  }, [extensionProposal, handleInsertConcept]);

  const handleExtensionDecline = useCallback(() => {
    setExtensionProposal(null);
  }, []);

  // ------------------------------------------------------------------
  // On-demand gap analysis (triggered by button or Ctrl+Alt+G)
  // ------------------------------------------------------------------
  const triggerGapAnalysis = useCallback(async () => {
    if (!currentQuestion || !lastResult || !activeStudyPlanId || lastResult.isCorrect) return;
    setIsAnalyzingGap(true);

    try {
      const userId = getUserId();
      const conceptName = currentQuestion.conceptName ?? "Unknown";
      const seed = findDemoSeed(conceptName, "gap");

      const res = await fetch(`/api/study-plans/${activeStudyPlanId}/analyze-gap`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({
          conceptId: lastResult.proficiencyUpdate.conceptId,
          conceptName,
          questionText: currentQuestion.questionText,
          userAnswer: selectedMcqOption || textInput || "",
          correctAnswer: currentQuestion.correctAnswer ?? "",
          ...(seed ? { seeded: { missingConcept: seed.missingConcept, explanation: seed.explanation, severity: seed.severity } } : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.hasGap && data.missingConcept) {
          setShowGapProposal({
            conceptName,
            missingConceptName: data.missingConcept,
            explanation: data.explanation || "",
            targetConceptId: lastResult.proficiencyUpdate.conceptId,
          });
        }
      }
    } catch (err) {
      console.error("[triggerGapAnalysis] Error:", err);
    } finally {
      setIsAnalyzingGap(false);
    }
  }, [currentQuestion, lastResult, activeStudyPlanId, selectedMcqOption, textInput]);

  // ------------------------------------------------------------------
  // On-demand extension analysis (triggered by button or Ctrl+Shift+K)
  // ------------------------------------------------------------------
  const triggerExtensionAnalysis = useCallback(async () => {
    if (!currentQuestion || !lastResult || !activeStudyPlanId || !lastResult.isCorrect) return;
    setIsAnalyzingExtension(true);

    try {
      const userId = getUserId();
      const conceptName = currentQuestion.conceptName ?? "Unknown";
      const seed = findDemoSeed(conceptName, "extension");

      // Gather existing concept names to avoid duplicates
      const existingConcepts = graphConcepts.map(c => c.name);

      const res = await fetch(`/api/study-plans/${activeStudyPlanId}/suggest-extension`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": userId },
        body: JSON.stringify({
          conceptId: lastResult.proficiencyUpdate.conceptId,
          conceptName,
          existingConcepts,
          ...(seed ? { seeded: { suggestedConcept: seed.suggestedConcept, explanation: seed.explanation } } : {}),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.hasSuggestion && data.suggestedConcept) {
          setExtensionProposal({
            conceptName,
            suggestedConceptName: data.suggestedConcept,
            explanation: data.explanation || "",
            anchorConceptId: lastResult.proficiencyUpdate.conceptId,
          });
        }
      }
    } catch (err) {
      console.error("[triggerExtensionAnalysis] Error:", err);
    } finally {
      setIsAnalyzingExtension(false);
    }
  }, [currentQuestion, lastResult, activeStudyPlanId, graphConcepts]);

  // ------------------------------------------------------------------
  // Keyboard shortcuts: Ctrl+Alt+G (gap analysis), Ctrl+Shift+K (extension analysis)
  // ------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only active during feedback phase
      if (phase !== "feedback" || !lastResult) return;
      // Don't trigger if a proposal is already showing
      if (showGapProposal || extensionProposal) return;

      if (e.ctrlKey && e.altKey && e.key === "g" && !lastResult.isCorrect) {
        e.preventDefault();
        triggerGapAnalysis();
      }
      if (e.ctrlKey && e.shiftKey && e.key === "K" && lastResult.isCorrect) {
        e.preventDefault();
        triggerExtensionAnalysis();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, lastResult, showGapProposal, extensionProposal, triggerGapAnalysis, triggerExtensionAnalysis]);

  // ------------------------------------------------------------------
  // Explain this: inject pre-fetched explanation into chat and navigate
  // ------------------------------------------------------------------
  function handleExplainThis() {
    const store = useAppStore.getState();
    const explanation = store.pendingExplanation;
    const concept = store.pendingExplanationConcept ?? currentQuestion?.conceptName ?? "this concept";

    if (!explanation) return;

    store.addChatMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: `**Why your answer to "${currentQuestion?.questionText ?? "the question"}" was wrong:**\n\n${explanation}\n\n*Ask me any follow-up questions about ${concept}.*`,
    });
    store.setPendingExplanation(null);
    router.push("/chat");
  }

  // ------------------------------------------------------------------
  // Derived display values
  // ------------------------------------------------------------------
  const progressPercent =
    displayedTotal > 0 ? (questionIndex / displayedTotal) * 100 : 0;

  const accuracy =
    sessionStats.attempted > 0
      ? Math.round((sessionStats.correct / sessionStats.attempted) * 100)
      : null;

  const elapsedMs = Date.now() - sessionStart.getTime();
  const elapsedMinutes = Math.floor(elapsedMs / 60000);

  // Concept name — returned inline by GET /questions (no Zustand lookup needed)
  const currentConceptName = currentQuestion?.conceptName ?? null;

  // ------------------------------------------------------------------
  // RENDER: idle
  // ------------------------------------------------------------------
  if (phase === "idle") {
    // Has a study plan — show Start Practice screen
    if (activeStudyPlanId) {
      return (
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="flex flex-col items-center justify-center h-full gap-5 px-6">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-soft)" }}
            >
              <BookOpen size={36} style={{ color: "var(--accent)" }} />
            </div>
            <div className="text-center">
              <h2
                className="text-2xl font-bold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Ready to Practice
              </h2>
              <p
                className="text-sm max-w-sm leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Questions are selected based on what you need most. Concepts you
                haven&apos;t seen yet come first.
              </p>
            </div>
            <button
              onClick={() => initSession()}
              className="mt-2 px-8 py-3 rounded-xl text-base font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
            >
              Start Practice
            </button>
          </div>
    
        </div>
      );
    }

    // No study plan — prompt to create one
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: "var(--accent-soft)" }}
          >
            <BookOpen size={28} style={{ color: "var(--accent)" }} />
          </div>
          <h2
            className="text-xl font-semibold text-center"
            style={{ color: "var(--text-primary)" }}
          >
            No study plan active
          </h2>
          <p
            className="text-sm text-center max-w-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            Head to the <strong>Chat</strong> tab to create a study plan. Once
            your concept graph is generated, practice questions will appear here.
          </p>
          <button
            onClick={() => router.push("/chat")}
            className="mt-2 px-5 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
          >
            Go to Chat
          </button>
        </div>
  
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: generating
  // ------------------------------------------------------------------
  if (phase === "generating") {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full gap-5 px-6">
          <Loader2
            size={40}
            className="animate-spin"
            style={{ color: "var(--accent)" }}
          />
          <div className="text-center">
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Generating practice questions...
            </h2>
            <p
              className="text-sm mt-1 max-w-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              This may take a minute for new study plans.
            </p>
          </div>
          <div className="w-full max-w-xs flex flex-col gap-2">
            <div
              className="h-2 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${generationProgress}%`,
                  backgroundColor: "var(--accent)",
                }}
              />
            </div>
            <p
              className="text-xs text-center"
              style={{ color: "var(--text-muted)" }}
            >
              {Math.round(generationProgress)}%
            </p>
          </div>
        </div>
  
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: loading
  // ------------------------------------------------------------------
  if (phase === "loading") {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: "var(--accent)" }}
          />
          <p
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Loading your session...
          </p>
        </div>
  
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: complete
  // ------------------------------------------------------------------
  if (phase === "complete") {
    // Concepts covered: derive names from the questions array directly
    const coveredConceptMap = new Map<string, string>();
    questions.forEach((q) => {
      if (q.conceptId && q.conceptName) coveredConceptMap.set(q.conceptId, q.conceptName);
    });
    const nextDueConcepts: never[] = []; // nextDue requires a separate API call; omit for now

    // Per-concept stats derived from accumulated sessionAttempts
    type ConceptStats = {
      name: string;
      attempts: number;
      correct: number;
      firstProficiency: number;
      lastProficiency: number;
    };
    const conceptStatsMap = new Map<string, ConceptStats>();
    sessionAttempts.forEach((attempt) => {
      const conceptId = attempt.proficiencyUpdate.conceptId;
      // Try to resolve the concept name from the questions array, then fallback to proficiencyUpdate
      const conceptName =
        coveredConceptMap.get(conceptId) ??
        attempt.proficiencyUpdate.conceptName ??
        conceptId;
      const existing = conceptStatsMap.get(conceptId);
      if (!existing) {
        conceptStatsMap.set(conceptId, {
          name: conceptName,
          attempts: 1,
          correct: attempt.isCorrect ? 1 : 0,
          firstProficiency: attempt.proficiencyUpdate.previousProficiency,
          lastProficiency: attempt.proficiencyUpdate.newProficiency,
        });
      } else {
        conceptStatsMap.set(conceptId, {
          ...existing,
          attempts: existing.attempts + 1,
          correct: existing.correct + (attempt.isCorrect ? 1 : 0),
          lastProficiency: attempt.proficiencyUpdate.newProficiency,
        });
      }
    });
    const conceptStatsList = [...conceptStatsMap.values()];

    return (
      <div className="flex flex-col h-full overflow-y-auto pb-20">
        <div className="flex flex-col items-center gap-6 px-4 py-8">
          {/* Header */}
          <div className="text-center">
            <div style={{ animation: "feedback-pop 0.5s ease-out both" }}>
              <Trophy size={40} style={{ color: "var(--success)" }} />
            </div>
            <h2
              className="text-xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {noQuestionsMessage === "generating"
                ? "Preparing Questions..."
                : noQuestionsMessage
                ? "All caught up!"
                : "Session Complete!"}
            </h2>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              {noQuestionsMessage === "generating"
                ? "Your practice questions are being generated in the background. This takes about a minute the first time."
                : noQuestionsMessage === "No questions due — come back tomorrow!"
                ? "No questions due for today. Practice more concepts, or try spaced repetition for mastered topics."
                : noQuestionsMessage ??
                  "You've finished today's practice session."}
            </p>
          </div>

          {/* Stats card */}
          {!noQuestionsMessage && (
            <div
              className="w-full max-w-md rounded-2xl border p-4 flex flex-col gap-3"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
                animation: "message-in 0.4s ease-out 0.2s both",
              }}
            >
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }} className="text-sm">
                  Questions Attempted
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {sessionStats.attempted}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }} className="text-sm">
                  Correct
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--success)" }}
                >
                  {sessionStats.correct}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }} className="text-sm">
                  Accuracy
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {accuracy !== null ? `${accuracy}%` : "--"}
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }} className="text-sm">
                  Time
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {elapsedMinutes} min
                </span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--text-secondary)" }} className="text-sm">
                  Concepts Covered
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {coveredConceptMap.size}
                </span>
              </div>
            </div>
          )}

          {/* Per-concept breakdown — shown when we have attempt data */}
          {conceptStatsList.length > 0 && (
            <div className="w-full max-w-md" style={{ animation: "message-in 0.4s ease-out 0.4s both" }}>
              <p
                className="text-sm font-semibold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Concept Breakdown
              </p>
              <div className="flex flex-col gap-2">
                {conceptStatsList.map((stats) => {
                  const accuracy = Math.round((stats.correct / stats.attempts) * 100);
                  const profDelta = Math.round(
                    (stats.lastProficiency - stats.firstProficiency) * 100
                  );
                  const deltaColor =
                    profDelta > 0 ? "var(--success)" : profDelta < 0 ? "var(--error)" : "var(--text-muted)";
                  const deltaLabel =
                    profDelta > 0 ? `+${profDelta}%` : profDelta < 0 ? `${profDelta}%` : "0%";
                  return (
                    <div
                      key={stats.name}
                      className="rounded-xl border px-3 py-2 flex flex-col gap-1"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {stats.name}
                      </span>
                      <div className="flex gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                        <span>{stats.attempts} attempt{stats.attempts !== 1 ? "s" : ""}</span>
                        <span>{accuracy}% accuracy</span>
                        <span style={{ color: deltaColor }}>
                          Proficiency {deltaLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Concepts practiced (fallback flat list when no attempt data) */}
          {conceptStatsList.length === 0 && coveredConceptMap.size > 0 && (
            <div className="w-full max-w-md">
              <p
                className="text-sm font-semibold mb-2"
                style={{ color: "var(--text-primary)" }}
              >
                Concepts Practiced
              </p>
              <div className="flex flex-col gap-1.5">
                {[...coveredConceptMap.values()].map((name) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span style={{ color: "var(--text-secondary)" }}>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 w-full max-w-md flex-wrap">
            {noQuestionsMessage && (
              <button
                onClick={() => initSession(true)}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
              >
                Request More Practice
              </button>
            )}
            {noQuestionsMessage === "generating" ? (
              <button
                onClick={() => initSession()}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
              >
                Try Again
              </button>
            ) : !noQuestionsMessage ? (
              <button
                onClick={handleNewSession}
                className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
              >
                New Session
              </button>
            ) : null}
            <button
              onClick={() => router.push("/graph")}
              className="flex-1 py-3 rounded-xl text-sm font-medium border"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              View Web
            </button>
            <button
              onClick={() => router.push("/chat")}
              className="flex-1 py-3 rounded-xl text-sm font-medium border"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-primary)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              Chat
            </button>
          </div>
        </div>
  
      </div>
    );
  }

  // ------------------------------------------------------------------
  // RENDER: practicing / feedback
  // ------------------------------------------------------------------
  if (!currentQuestion) return null;

  const isPracticing = phase === "practicing";
  const isFeedback = phase === "feedback";

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-20">
      {/* ---------------------------------------------------------------- */}
      {/* Header: progress bar + meta                                       */}
      {/* ---------------------------------------------------------------- */}
      <div className="px-4 pt-4 pb-2 flex flex-col gap-2">
        {/* Study plan selector */}
        {studyPlans.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <label style={{ color: "var(--text-muted)" }}>Study Plan:</label>
            <select
              value={activeStudyPlanId || ""}
              onChange={(e) => {
                const newPlanId = e.target.value;
                if (newPlanId) {
                  setActiveStudyPlan(newPlanId);
                  setPhase("idle");
                  setQuestions([]);
                  setQuestionIndex(0);
                  setSessionId(null);
                  setLastResult(null);
                  setSessionStats({ attempted: 0, correct: 0 });
                }
              }}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--bg-secondary)",
                color: "var(--text-primary)",
              }}
            >
              {studyPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Progress label */}
        <div className="flex justify-between items-center text-xs" style={{ color: "var(--text-muted)" }}>
          <span>
            Question {questionIndex + 1} of {displayedTotal}
          </span>
          <span>
            {accuracy !== null
              ? `${accuracy}% (${sessionStats.correct}/${sessionStats.attempted})`
              : "--"}
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="h-1.5 w-full rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--bg-tertiary)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: "var(--accent)",
            }}
          />
        </div>

        {/* Concept badge */}
        {currentConceptName && (
          <div
            className="text-xs px-2 py-0.5 rounded-full self-start"
            style={{
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            {currentConceptName}
          </div>
        )}

        {/* Targeting banner — show when practicing a specific concept */}
        {targetConceptId && isPracticing && currentQuestion && (
          <div
            className="text-xs px-3 py-2 rounded-md flex items-center justify-between"
            style={{
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text-secondary)",
              borderLeft: "3px solid var(--accent)",
            }}
          >
            <span className="flex items-center gap-1.5"><Target size={13} style={{ flexShrink: 0 }} /> Focusing on: <strong>{currentQuestion.conceptName}</strong></span>
            <button
              onClick={() => {
                setTargetConceptId(null);
                // Reinitialize session without targeting
                initSession();
              }}
              className="ml-2 p-2 hover:opacity-75 rounded-lg"
              title="Stop focusing on this concept"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Gap redirect notification                                         */}
      {/* ---------------------------------------------------------------- */}
      {gapRedirectMessage && (
        <div
          className="mx-4 mt-2 rounded-xl px-4 py-3 text-sm"
          style={{
            backgroundColor: "rgba(0, 210, 160, 0.12)",
            borderLeft: "3px solid var(--success)",
            color: "var(--text-primary)",
          }}
        >
          {gapRedirectMessage}
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Gap proposal card                                                  */}
      {/* ---------------------------------------------------------------- */}
      {showGapProposal && (
        <div className="px-4 mt-2">
          <GapProposalCard
            originalConceptName={showGapProposal.conceptName}
            missingConceptName={showGapProposal.missingConceptName}
            explanation={showGapProposal.explanation}
            onConfirm={handleGapConfirm}
            onDecline={handleGapDecline}
            isLoading={isInsertingConcept}
          />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Extension proposal card                                           */}
      {/* Design note: Placed at the same DOM level as GapProposalCard,     */}
      {/* OUTSIDE the feedback guard. isInsertingConcept is the shared      */}
      {/* loading flag for both proposal card types.                        */}
      {/* ---------------------------------------------------------------- */}
      {extensionProposal && (
        <div className="px-4 mt-2">
          <ExtensionProposalCard
            currentConceptName={extensionProposal.conceptName}
            suggestedConceptName={extensionProposal.suggestedConceptName}
            explanation={extensionProposal.explanation}
            onConfirm={handleExtensionConfirm}
            onDecline={handleExtensionDecline}
            isLoading={isInsertingConcept}
          />
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Main question card                                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex-1 px-4 py-2 flex flex-col gap-4">
        {/* Feedback badge */}
        {isFeedback && lastResult && (
          <div
            className="rounded-xl px-4 py-3 text-sm font-semibold flex items-center gap-2"
            style={{
              backgroundColor: lastResult.isCorrect
                ? "var(--success)"
                : "var(--error)",
              color: "#ffffff",
              animation: "feedback-pop 0.35s ease-out both",
            }}
          >
            {lastResult.isCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {lastResult.isCorrect ? "Correct!" : "Not quite."}
          </div>
        )}

        {/* Question text */}
        <div
          className="rounded-2xl border p-4"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex justify-between items-start gap-4">
            <p
              className="text-base leading-relaxed flex-1"
              style={{ color: "var(--text-primary)" }}
            >
              {(() => { const citations = extractCitations(currentQuestion?.sources); return citations.length > 0 ? renderWithCitations(currentQuestion.questionText, citations) : currentQuestion.questionText; })()}
            </p>
            {currentQuestion?.sources && currentQuestion.sources.length > 0 && (
              <button
                onClick={() => setShowSourcesPanel(!showSourcesPanel)}
                className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0"
                style={{
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--accent)",
                  border: "1px solid var(--accent)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--accent)";
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--accent-soft)";
                  e.currentTarget.style.color = "var(--accent)";
                }}
              >
                {showSourcesPanel ? "Hide" : "View"} Sources
              </button>
            )}
          </div>
        </div>

        {/* Sources Panel */}
        {showSourcesPanel && currentQuestion?.sources && currentQuestion.sources.length > 0 && (
          <div
            className="rounded-2xl border p-4 gap-3 flex flex-col"
            style={{
              backgroundColor: "rgba(var(--accent-rgb), 0.05)",
              borderColor: "var(--accent)",
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm" style={{ color: "var(--accent)" }}>
                Wikipedia Sources ({currentQuestion.sources.length})
              </h3>
              <button
                onClick={() => setShowSourcesPanel(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X size={16} style={{ color: "var(--accent)" }} />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {currentQuestion.sources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-3 rounded-lg border transition-all hover:scale-102"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-card)";
                    e.currentTarget.style.borderColor = "var(--border)";
                  }}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "#ffffff",
                      }}
                    >
                      {source.index}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                        {source.pageTitle}
                      </p>
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                        {source.pageUrl}
                      </p>
                    </div>
                    <ArrowRight size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px" }} />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Question type: MCQ                                                */}
        {/* ---------------------------------------------------------------- */}
        {currentQuestion.questionType === "mcq" && (
          <div className="flex flex-col gap-2">
            {shuffledMcqOptions.map((option) => {
              const isSelected = selectedMcqOption === option;
              const isCorrectAnswer = option === currentQuestion.correctAnswer;
              let borderColor = "var(--border)";
              let bgColor = "var(--bg-card)";
              let textColor = "var(--text-primary)";

              if (isFeedback) {
                if (isCorrectAnswer) {
                  borderColor = "var(--success)";
                  bgColor = "rgba(0, 210, 160, 0.1)";
                } else if (isSelected && !isCorrectAnswer) {
                  borderColor = "var(--error)";
                  bgColor = "rgba(255, 107, 107, 0.1)";
                  textColor = "var(--error)";
                }
              } else if (isSelected) {
                borderColor = "var(--accent)";
                bgColor = "var(--accent-soft)";
              }

              return (
                <button
                  key={option}
                  onClick={() => isPracticing && handleMcqSelect(option)}
                  disabled={isFeedback || isSubmitting}
                  className="w-full text-left rounded-xl border px-4 py-3 text-sm"
                  style={{
                    borderColor,
                    backgroundColor: bgColor,
                    color: textColor,
                    cursor: isFeedback ? "default" : "pointer",
                    transition: "all 0.2s ease",
                    transform: isSelected && !isFeedback ? "scale(1.01)" : "scale(1)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isFeedback && !isSelected) {
                      e.currentTarget.style.backgroundColor = "var(--bg-card-hover)";
                      e.currentTarget.style.borderColor = "var(--text-muted)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isFeedback && !isSelected) {
                      e.currentTarget.style.backgroundColor = bgColor;
                      e.currentTarget.style.borderColor = borderColor;
                    }
                  }}
                >
                  <span className="flex items-center gap-2">
                    {isFeedback && isCorrectAnswer && (
                      <CheckCircle size={15} style={{ color: "var(--success)", flexShrink: 0 }} />
                    )}
                    {isFeedback && isSelected && !isCorrectAnswer && (
                      <XCircle size={15} style={{ color: "var(--error)", flexShrink: 0 }} />
                    )}
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Question type: FLASHCARD — implemented with framer-motion         */}
        {/* ---------------------------------------------------------------- */}
        {currentQuestion.questionType === "flashcard" && (
          <div
            className="relative flex items-center justify-center"
            style={{ minHeight: 200 }}
          >
            {/* Left drag indicator */}
            <motion.div
              style={{ opacity: leftIndicatorOpacity }}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-2xl font-bold pointer-events-none select-none"
              aria-hidden="true"
            >
              <span className="flex items-center gap-1" style={{ color: "var(--error)" }}><ArrowLeft size={20} /><XCircle size={20} /></span>
            </motion.div>

            {/* Right drag indicator */}
            <motion.div
              style={{ opacity: rightIndicatorOpacity }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl font-bold pointer-events-none select-none"
              aria-hidden="true"
            >
              <span className="flex items-center gap-1" style={{ color: "var(--success)" }}><CheckCircle size={20} /><ArrowRight size={20} /></span>
            </motion.div>

            {/* The draggable flashcard */}
            <motion.div
              drag={isFlipped && isPracticing ? "x" : false}
              dragConstraints={{ left: -100, right: 100 }}
              dragElastic={0.2}
              style={{
                x: dragX,
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                minHeight: 160,
                cursor: isFlipped ? "grab" : "pointer",
              }}
              onDragEnd={(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
                if (info.offset.x > 80) {
                  handleFlashcardSwipe("right"); // correct — Got it!
                } else if (info.offset.x < -80) {
                  handleFlashcardSwipe("left"); // incorrect — Missed it!
                } else {
                  // Snap back — not enough drag distance
                  dragX.set(0);
                }
              }}
              onClick={() => {
                if (!isFlipped && isPracticing) setIsFlipped(true);
              }}
              className="w-full rounded-2xl p-6 select-none"
              whileTap={{ scale: 0.98 }}
            >
              {!isFlipped ? (
                <div className="flex flex-col items-center gap-3">
                  <p
                    className="text-center text-base"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {(() => { const citations = extractCitations(currentQuestion?.sources); return citations.length > 0 ? renderWithCitations(currentQuestion.questionText, citations) : currentQuestion.questionText; })()}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Tap to reveal answer
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <p
                    className="text-center text-base font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {currentQuestion.correctAnswer}
                  </p>
                  {currentQuestion.explanation && (
                    <p
                      className="text-xs text-center leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {currentQuestion.explanation}
                    </p>
                  )}
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Swipe right if you knew it · Swipe left if you missed it
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Question type: FILL_BLANK                                         */}
        {/* ---------------------------------------------------------------- */}
        {currentQuestion.questionType === "fill_blank" && (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              autoFocus
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFillBlankSubmit();
              }}
              disabled={isFeedback || isSubmitting}
              placeholder="Type your answer..."
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            {isPracticing && (
              <button
                onClick={handleFillBlankSubmit}
                disabled={!textInput.trim() || isSubmitting}
                className="w-full py-3 rounded-xl text-sm font-medium transition-opacity"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "#ffffff",
                  opacity: !textInput.trim() || isSubmitting ? 0.4 : 1,
                  cursor: !textInput.trim() || isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                Submit Answer
              </button>
            )}
            {/* Show correct answer in feedback */}
            {isFeedback && lastResult && !lastResult.isCorrect && (
              <div
                className="text-sm px-4 py-2 rounded-xl"
                style={{
                  backgroundColor: "rgba(0, 210, 160, 0.1)",
                  color: "var(--success)",
                  borderLeft: "3px solid var(--success)",
                }}
              >
                Correct answer: <strong>{currentQuestion.correctAnswer}</strong>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Question type: FREE_RESPONSE                                      */}
        {/* ---------------------------------------------------------------- */}
        {currentQuestion.questionType === "free_response" && (
          <div className="flex flex-col gap-3">
            <textarea
              autoFocus
              rows={4}
              value={textInput}
              maxLength={500}
              onChange={(e) => {
                setTextInput(e.target.value);
                setCharCount(e.target.value.length);
              }}
              disabled={isFeedback || isSubmitting}
              placeholder="Write your answer..."
              className="w-full rounded-xl border px-4 py-3 text-sm outline-none resize-y"
              style={{
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <p
              className="text-xs text-right"
              style={{ color: "var(--text-muted)" }}
            >
              {charCount} / 500 characters
            </p>
            {isPracticing && (
              <button
                onClick={handleFreeResponseSubmit}
                disabled={!textInput.trim() || isSubmitting}
                className="w-full py-3 rounded-xl text-sm font-medium transition-opacity"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "#ffffff",
                  opacity: !textInput.trim() || isSubmitting ? 0.4 : 1,
                  cursor: !textInput.trim() || isSubmitting ? "not-allowed" : "pointer",
                }}
              >
                Submit Answer
              </button>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Feedback section                                                  */}
        {/* ---------------------------------------------------------------- */}
        {isFeedback && lastResult && (
          <div className="flex flex-col gap-3">
            {/* Explanation */}
            {lastResult.explanation && (
              <div
                className="rounded-xl border p-3 text-sm leading-relaxed"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  borderColor: "var(--border)",
                  color: "var(--text-secondary)",
                }}
              >
                <span
                  className="font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Explanation:{" "}
                </span>
                {(() => {
                  const text = currentQuestion.questionType === "free_response"
                    ? (lastResult.feedback || lastResult.explanation || "Answer recorded.")
                    : lastResult.explanation;
                  const citations = extractCitations(currentQuestion?.sources);
                  return citations.length > 0 
                    ? renderWithCitations(text, citations)
                    : text;
                })()}
              </div>
            )}
            {/* Proficiency delta */}
            <div
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {(() => {
                const prev = Math.round(lastResult.proficiencyUpdate.previousProficiency * 100);
                const next = Math.round(lastResult.proficiencyUpdate.newProficiency * 100);
                const delta = next - prev;
                if (delta === 0) return null;
                const conceptName = currentQuestion?.conceptName ?? "Proficiency";
                return (
                  <span>
                    {conceptName} updated to {next}%{" "}
                    <span
                      style={{ color: delta > 0 ? "var(--success)" : "var(--error)" }}
                    >
                      {delta > 0 ? "↑" : "↓"}
                    </span>
                  </span>
                );
              })()}
            </div>

            {/* === Action row: Discuss / Analyze Gap (wrong) or Explore Next (correct) === */}
            {/* CRITICAL: These buttons access lastResult.isCorrect and MUST remain */}
            {/* INSIDE the {isFeedback && lastResult && (...)} guard to avoid        */}
            {/* null-reference errors during the practicing phase.                    */}
            {!lastResult.isCorrect && !showGapProposal && !extensionProposal && (
              <div className="flex gap-2">
                <button
                  onClick={handleExplainThis}
                  disabled={!pendingExplanation}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border transition-opacity disabled:opacity-40"
                  style={{
                    borderColor: "var(--accent-glow)",
                    backgroundColor: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  Discuss in Depth
                </button>
                <button
                  onClick={triggerGapAnalysis}
                  disabled={isAnalyzingGap}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border transition-opacity"
                  style={{
                    borderColor: "rgba(255, 197, 61, 0.4)",
                    backgroundColor: "rgba(255, 197, 61, 0.08)",
                    color: "var(--text-primary)",
                    opacity: isAnalyzingGap ? 0.6 : 1,
                  }}
                >
                  {isAnalyzingGap ? <Loader2 size={12} className="animate-spin" /> : <ArrowDown size={12} />}
                  {isAnalyzingGap ? "Analyzing..." : "Analyze Gap"}
                </button>
              </div>
            )}
            {lastResult.isCorrect && !showGapProposal && !extensionProposal && (
              <div className="flex gap-2">
                <button
                  onClick={triggerExtensionAnalysis}
                  disabled={isAnalyzingExtension}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium border transition-opacity"
                  style={{
                    borderColor: "rgba(56, 189, 248, 0.4)",
                    backgroundColor: "rgba(56, 189, 248, 0.08)",
                    color: "var(--text-primary)",
                    opacity: isAnalyzingExtension ? 0.6 : 1,
                  }}
                >
                  {isAnalyzingExtension ? <Loader2 size={12} className="animate-spin" /> : <ArrowUp size={12} />}
                  {isAnalyzingExtension ? "Analyzing..." : "Explore Next"}
                </button>
              </div>
            )}
            {/* === END Action row === */}

            {/* Next question button */}
            <button
              onClick={handleAdvance}
              className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
            >
              Next Question <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>


    </div>
  );
}
