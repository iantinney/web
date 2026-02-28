"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Paperclip, X, CheckCircle, RefreshCw, BookOpen } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { WebLogo } from "@/components/WebLogo";
import { getUserId } from "@/lib/auth";
import { AdvisorCards } from "@/components/AdvisorCards";
import type { AdvisorCard, LessonPlan, ChatMessage } from "@/lib/store";

import { renderWithCitations, extractCitations } from "@/lib/rag/citation-renderer";

// Renders **bold** markdown inline without raw asterisks
function renderInline(text: string): React.ReactNode {
  // Handle **bold** and *italic* inline formatting
  const segments = text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g);
  return segments.map((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**")) {
      return <strong key={i}>{seg.slice(2, -2)}</strong>;
    }
    if (seg.startsWith("*") && seg.endsWith("*") && seg.length > 2) {
      return <em key={i}>{seg.slice(1, -1)}</em>;
    }
    return <span key={i}>{seg}</span>;
  });
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const Tag = listType;
      result.push(
        <Tag key={`list-${result.length}`} className="pl-4 my-1 space-y-0.5" style={{ listStyleType: listType === "ul" ? "disc" : "decimal" }}>
          {listItems}
        </Tag>
      );
      listItems = [];
      listType = null;
    }
  };

  lines.forEach((line, lineIdx) => {
    const bulletMatch = line.match(/^[-•]\s+(.*)/);
    const numberedMatch = line.match(/^\d+[.)]\s+(.*)/);

    if (bulletMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(<li key={lineIdx}>{renderInline(bulletMatch[1])}</li>);
    } else if (numberedMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(<li key={lineIdx}>{renderInline(numberedMatch[1])}</li>);
    } else {
      flushList();
      result.push(
        <span key={lineIdx}>
          {renderInline(line)}
          {lineIdx < lines.length - 1 && <br />}
        </span>
      );
    }
  });

  flushList();
  return result;
}
const TIER_LABELS: Record<number, string> = { 1: "Intro", 2: "Intermediate", 3: "Advanced" };
const TIER_COLORS: Record<number, string> = {
  1: "var(--success)",
  2: "var(--accent)",
  3: "var(--warning, #f59e0b)",
};

export default function ChatPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    chatPhase,
    chatIsGenerating,
    chatMessages,
    proposedLessonPlan,
    chatLessonPlan,
    sourceText,
    priorKnowledge,
    learnerProfile,
    activeStudyPlanId,
    learnPhase,
    setChatPhase,
    setChatIsGenerating,
    setProposedLessonPlan,
    setChatLessonPlan,
    setSourceText,
    setPriorKnowledge,
    addChatMessage,
    loadStudyPlanData,
    loadStudyPlans,
    setUnitGraphs,
    loadUnitGraphData,
  } = useAppStore();

  // Check if profile has any data
  const hasProfileData = learnerProfile &&
    (learnerProfile.background.length > 0 ||
     learnerProfile.goals.length > 0 ||
     learnerProfile.interests.length > 0);

  // Derive active Learn session state for the banner
  const activeSession = learnPhase === "practicing" || learnPhase === "feedback";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Recovery: if chatPhase is stuck in "structuring" but generation is NOT active (crash/error),
  // reset to proposing. If chatIsGenerating is true, we're mid-generation (tab switch) — keep structuring.
  useEffect(() => {
    const store = useAppStore.getState();
    if (chatPhase === "structuring" && !store.chatIsGenerating) {
      setChatPhase("proposing");
    }
  }, []); // intentional empty deps — mount-only check

  // ── File upload handler ──────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        setSourceText(sourceText + (sourceText ? "\n" : "") + text);
        setUploadedFiles((prev) => [...prev, file.name]);
        setInput((prev) => (prev ? prev + "\n" : "") + `[File: ${file.name} loaded]`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function removeFile(filename: string) {
    setUploadedFiles((prev) => prev.filter((f) => f !== filename));
  }

  // ── Main submit handler ───────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    addChatMessage(userMessage);
    setInput("");
    setIsLoading(true);

    // Transition to gathering on new message (from idle, done, or proposing)
    let currentPhase = chatPhase;
    if (chatPhase === "idle" || chatPhase === "done" || chatPhase === "proposing") {
      currentPhase = "gathering";
      setChatPhase("gathering");
      // When starting fresh from done state, clear old proposal and lesson plan
      if (chatPhase === "done") {
        setProposedLessonPlan(null);
        setChatLessonPlan(null);
      }
    }

    try {
      const allMessages = [...chatMessages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({
          messages: allMessages,
          chatPhase: currentPhase,
          sourceText,
          chatContext: useAppStore.getState().chatContext, // read fresh to avoid stale closure
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Chat API error:", {
          status: res.status,
          statusText: res.statusText,
          error: errorData,
        });
        throw new Error(`Chat request failed: ${res.status}`);
      }

      const data = await res.json();
      const assistantContent = data.content ?? "I'm sorry, I couldn't generate a response.";

      // If a plan is being proposed, show a short intro in the bubble (not the raw plan text)
      const displayContent =
        data.proposedLessonPlan
          ? "Here's your proposed study plan — review it below and approve or ask for changes:"
          : assistantContent;

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: displayContent,
      };
      addChatMessage(assistantMessage);

      // Handle gathering phase: check for lesson plan proposal
      if (currentPhase === "gathering") {
        if (data.proposedLessonPlan) {
          setProposedLessonPlan(data.proposedLessonPlan);
          setChatPhase("proposing");
          // Show user feedback that we're generating the study plan
          addChatMessage({
            id: crypto.randomUUID(),
            role: "assistant",
            content: "✨ Great! I've created a lesson plan. Let me generate your study plan and concept web...",
          });
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      addChatMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Sorry, something went wrong. Please check that your MINIMAX_API_KEY is set in .env.local and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ── Lesson plan approval ──────────────────────────────────────────────────
  async function handleApprove() {
    if (!proposedLessonPlan) return;

    setChatPhase("structuring");
    setChatIsGenerating(true);

    try {
      // Generate AI-powered title for the study plan via API (server has env vars)
      const titleRes = await fetch("/api/generate-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonPlanText: proposedLessonPlan }),
      });
      if (!titleRes.ok) throw new Error("Failed to generate title");
      const { title: planTitle } = await titleRes.json();

      // Create study plan
      const planRes = await fetch("/api/study-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: planTitle,
          description: "Created from lesson plan proposal",
          sourceText: sourceText || proposedLessonPlan,
          userId: getUserId(),
        }),
      });

      if (!planRes.ok) throw new Error("Failed to create study plan");
      const { plan } = await planRes.json();
      const planId: string = plan.id;

      // Structure the lesson plan (convert text to JSON) and generate graph
      const structRes = await fetch(`/api/study-plans/${planId}/structure-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          textPlan: proposedLessonPlan,
          priorKnowledge,
          userId: getUserId(),
        }),
      });

      if (!structRes.ok) throw new Error("Failed to structure lesson plan");
      const structData = await structRes.json();

      // Hydrate store with study plan data
      await loadStudyPlanData(planId);

      // Refresh the full study plans list to include the newly created plan
      await loadStudyPlans();

      // Fetch and load the first unit graph (most recently created)
      const graphsRes = await fetch(`/api/unit-graphs?studyPlanId=${planId}`);
      if (graphsRes.ok) {
        const graphsData = await graphsRes.json();
        const unitGraphs = graphsData.unitGraphs ?? [];
        if (unitGraphs.length > 0) {
          const firstGraph = unitGraphs[0];
          // Load the first graph's data
          setUnitGraphs(unitGraphs);
          await loadUnitGraphData(firstGraph.id);
        }
      }

      // Trigger question generation in background (non-blocking)
      // Learn page has a safety-net call, but this ensures questions available sooner
      fetch(`/api/study-plans/${planId}/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": getUserId() },
        body: JSON.stringify({ userId: getUserId() }),
      }).catch(() => {
        // Non-blocking: proceed even if generation fails
      });

      // Extract learner profile from conversation (fire-and-forget)
      const conversationText = chatMessages.map((m) => `${m.role}: ${m.content}`).join("\n");
      fetch("/api/users/profile/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationText, userId: getUserId() }),
      }).catch(() => {
        // Non-blocking: proceed even if extraction fails
      });

      // Store lesson plan for display (in Zustand so it survives tab switches)
      if (structData.lessonPlan) {
        setChatLessonPlan(structData.lessonPlan);
      }

      // Clear proposal and transition to done
      setProposedLessonPlan(null);
      setChatPhase("done");

      const reusedCount = structData.lessonPlan?.reusedConceptCount ?? 0;
      const totalCount = structData.lessonPlan?.totalConcepts ?? 0;
      const reusedMsg = reusedCount > 0 ? ` (${reusedCount} already mastered)` : "";
      addChatMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Perfect! I've created your study plan with ${totalCount} concepts${reusedMsg}. You can now explore your concept graph or start practicing!`,
      });
    } catch (err) {
      console.error("Approval error:", err);
      setChatPhase("proposing");
      addChatMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I had trouble processing your lesson plan. Could you try adjusting it?",
      });
    } finally {
      setChatIsGenerating(false);
    }
  }

  async function handleAdjust() {
    setChatPhase("gathering");
    setProposedLessonPlan(null);
    addChatMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: "No problem! Tell me what you'd like to change — more concepts, different depth, or a specific focus area?",
    });
  }

  // ── Advisor quick-action ──────────────────────────────────────────────────
  async function handleAdvisor() {
    if (isLoading) return;
    setIsLoading(true);
    // Add user message
    addChatMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: "What should I learn next?",
    });
    try {
      const res = await fetch("/api/advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": getUserId(),
        },
        body: JSON.stringify({
          chatContext: useAppStore.getState().chatContext, // direct store access — avoids stale closure
        }),
      });
      const data = (await res.json()) as {
        recommendations: AdvisorCard[];
        error?: string;
      };
      if (data.error) throw new Error(data.error);
      addChatMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Here are my recommendations for what to learn next:",
        messageType: "advisor_cards",
        advisorCards: data.recommendations,
      });
    } catch {
      addChatMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Sorry, I couldn't generate recommendations right now. Try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Auto-expand textarea height based on content
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }

  // ── Proposed lesson plan card ────────────────────────────────────────────
  function ProposedPlanCard({ plan }: { plan: string }) {
    return (
      <div
        className="rounded-2xl border p-4 my-2 text-sm leading-relaxed"
        style={{ borderColor: "var(--accent)", backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}
      >
        {renderMarkdown(plan)}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleApprove}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            style={{
              backgroundColor: "var(--accent)",
              color: "#fff",
            }}
          >
            {isLoading ? "Generating..." : "Looks good →"}
          </button>
          <button
            onClick={handleAdjust}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm border transition-colors disabled:opacity-50"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-tertiary)",
            }}
          >
            <RefreshCw size={14} />
            Adjust
          </button>
        </div>
      </div>
    );
  }

  // ── Lesson plan notification card ─────────────────────────────────────────
  function LessonPlanCard({ plan }: { plan: LessonPlan }) {
    const tierData = [
      { tier: 1, label: "Tier 1: Fundamentals", concepts: plan.tier1, color: "var(--success)" },
      { tier: 2, label: "Tier 2: Intermediate", concepts: plan.tier2, color: "var(--accent)" },
      { tier: 3, label: "Tier 3: Advanced", concepts: plan.tier3, color: "var(--warning, #f59e0b)" },
    ].filter((t) => t.concepts.length > 0);

    return (
      <div
        className="rounded-2xl border p-4 my-2"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-card)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} style={{ color: "var(--accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Lesson Plan — {plan.totalConcepts} concepts
          </span>
        </div>

        {plan.reusedConceptCount > 0 && (
          <div
            className="px-3 py-2 rounded-lg text-xs mb-3 border"
            style={{
              borderColor: "var(--success)",
              backgroundColor: "rgba(0, 210, 160, 0.08)",
              color: "var(--success)",
            }}
          >
            ✓ {plan.reusedConceptCount} already in your knowledge base — you're {plan.percentageKnown}% through!
          </div>
        )}

        <div className="space-y-3">
          {tierData.map(({ tier, label, concepts, color }) => (
            <div key={tier}>
              <div
                className="text-xs font-semibold mb-1.5"
                style={{ color }}
              >
                {label} ({concepts.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {concepts.map((name) => (
                  <span
                    key={name}
                    className="px-2 py-0.5 rounded-full text-xs border"
                    style={{
                      borderColor: color + "60",
                      color,
                      backgroundColor: color + "15",
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Done state actions ───────────────────────────────────────────────────
  function DoneActions() {
    return (
      <div className="flex gap-2 my-2">
        <button
          onClick={() => router.push("/graph")}
          className="px-5 py-3 rounded-xl text-sm font-medium transition-colors"
          style={{ backgroundColor: "var(--accent)", color: "#fff" }}
        >
          Switch to Web tab
        </button>
        <button
          onClick={() => router.push("/learn")}
          className="px-5 py-3 rounded-xl text-sm border transition-colors"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-tertiary)",
          }}
        >
          Start learning
        </button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Profile indicator banner */}
      {hasProfileData && (
        <div
          className="px-4 py-2 flex items-center gap-2 text-xs border-b"
          style={{
            backgroundColor: "rgba(34, 197, 94, 0.05)",
            borderColor: "var(--border)",
            color: "#22c55e",
          }}
        >
          <span>✓</span>
          <span>
            Your learning profile is active and helps personalize our conversation
          </span>
        </div>
      )}

      {/* Active Learn session banner */}
      {activeSession && (
        <div
          className="px-4 py-2 text-xs border-b"
          style={{
            backgroundColor: 'var(--color-surface-secondary, #1e293b)',
            color: 'var(--color-text-secondary, #94a3b8)',
            borderColor: 'var(--color-border, #334155)',
          }}
        >
          Practice session active — your questions are personalized to your current learning context.
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-80">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{
                background: "#0e1117",
                border: "1.5px solid rgba(0, 210, 160, 0.5)",
                boxShadow: "0 0 16px rgba(0, 210, 160, 0.25)",
              }}
            >
              <WebLogo size={48} style={{ filter: "none" }} />
            </div>
            <h2
              className="text-xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              What do you want to learn?
            </h2>
            <p
              className="text-sm text-center max-w-md leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Describe a subject, paste a syllabus, or tell me about an exam
              you're preparing for. I'll create a personalized study plan and
              help you master every concept.
            </p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center">
              {[
                "I need to learn linear algebra for ML",
                "Help me prepare for AP Chemistry",
                "I want to understand transformer architectures",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="px-4 py-2.5 rounded-full text-xs cursor-pointer border"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-secondary)",
                    backgroundColor: "var(--bg-card)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--accent-soft)";
                    e.currentTarget.style.borderColor = "var(--accent-glow)";
                    e.currentTarget.style.color = "var(--accent)";
                    e.currentTarget.style.transform = "scale(1.03)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-card)";
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                style={{ animation: "message-in 0.3s ease-out both" }}
              >
                <div
                  className="max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                  style={{
                    backgroundColor:
                      msg.role === "user"
                        ? "var(--accent)"
                        : "var(--bg-card)",
                    color:
                      msg.role === "user" ? "#fff" : "var(--text-primary)",
                    borderBottomRightRadius:
                      msg.role === "user" ? "6px" : undefined,
                    borderBottomLeftRadius:
                      msg.role === "assistant" ? "6px" : undefined,
                    border: msg.role === "assistant" ? "1px solid var(--border)" : undefined,
                    borderLeft: msg.role === "assistant" ? "2.5px solid var(--accent)" : undefined,
                  }}
                >
                  {msg.messageType === "advisor_cards" && msg.advisorCards && msg.advisorCards.length > 0 ? (
                    <div>
                      <p className="text-sm mb-1">{msg.content}</p>
                      <AdvisorCards cards={msg.advisorCards} />
                    </div>
                  ) : msg.role === "assistant" && msg.sources && msg.sources.length > 0 ? (
                    <div>{renderWithCitations(msg.content, msg.sources)}</div>
                  ) : (
                    renderMarkdown(msg.content)
                  )}
                </div>
              </div>
            ))}

            {/* Proposed lesson plan card */}
            {proposedLessonPlan && (
              <div className="flex justify-start">
                <div className="max-w-[90%] w-full">
                  <ProposedPlanCard plan={proposedLessonPlan} />
                </div>
              </div>
            )}

            {/* Lesson plan notification with actions (shown in done state) */}
            {chatPhase === "done" && chatLessonPlan && (
              <div className="flex justify-start">
                <div className="max-w-[90%] w-full space-y-3">
                  <LessonPlanCard plan={chatLessonPlan} />
                  <DoneActions />
                </div>
              </div>
            )}

            {/* Persistent graph-building progress banner (survives tab switches via Zustand) */}
            {chatPhase === "structuring" && (
              <div
                className="rounded-2xl border p-4 flex flex-col gap-3"
                style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin flex-shrink-0" style={{ color: "var(--accent)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Building your concept web
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  Generating your study plan, structuring concepts, and laying out the graph. This takes about 30–60 seconds.
                </p>
                {/* Indeterminate animated bar */}
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--bg-tertiary)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: "var(--accent)",
                      width: "40%",
                      animation: "indeterminate-progress 1.5s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>
            )}

            {isLoading && chatPhase !== "structuring" && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={{ backgroundColor: "var(--bg-tertiary)" }}
                >
                  <Loader2
                    size={18}
                    className="animate-spin"
                    style={{ color: "var(--text-muted)" }}
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div
        className="px-4 py-3 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        {/* Uploaded file chips */}
        {uploadedFiles.length > 0 && (
          <div className="max-w-2xl mx-auto flex flex-wrap gap-1.5 mb-2">
            {uploadedFiles.map((filename) => (
              <span
                key={filename}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border"
                style={{
                  borderColor: "var(--accent)",
                  color: "var(--accent)",
                  backgroundColor: "var(--accent-soft, rgba(99,102,241,0.1))",
                }}
              >
                {filename}
                <button
                  onClick={() => removeFile(filename)}
                  className="ml-0.5 opacity-60 hover:opacity-100"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Advisor quick-action — only show when a study plan is active */}
        {activeStudyPlanId && (
          <div className="max-w-2xl mx-auto mb-2">
            <button
              type="button"
              onClick={handleAdvisor}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-medium transition-opacity"
              style={{
                backgroundColor: "var(--accent-soft)",
                color: "var(--accent)",
                border: "1px solid var(--accent-glow)",
                opacity: isLoading ? 0.5 : 1,
              }}
            >
              What should I learn next?
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="max-w-2xl mx-auto flex items-end gap-2"
        >
          {/* File upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={chatPhase === "structuring" || chatPhase === "done"}
            className="rounded-xl transition-all disabled:opacity-30 flex-shrink-0 self-stretch flex items-center justify-center"
            title="Upload .txt or .md file"
            style={{
              width: "52px",
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            <Paperclip size={20} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.text"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div
            className="flex-1 rounded-2xl border px-4 py-2.5"
            style={{
              backgroundColor: "var(--bg-tertiary)",
              borderColor: "var(--border)",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            }}
            onFocusCapture={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent-soft)";
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                chatPhase === "done"
                  ? "Your study plan is ready!"
                  : chatPhase === "proposing"
                  ? "Review the lesson plan above..."
                  : "Describe what you want to learn..."
              }
              disabled={chatPhase === "structuring"}
              className="w-full resize-none bg-transparent text-sm placeholder:opacity-50 disabled:opacity-50"
              style={{
                color: "var(--text-primary)",
                minHeight: "20px",
                maxHeight: "120px",
                height: "40px",
                overflow: "hidden",
                border: "none",
                outline: "none",
                boxShadow: "none",
                appearance: "none",
                WebkitAppearance: "none",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading || chatPhase === "structuring"}
            className="rounded-xl transition-all disabled:opacity-30 flex-shrink-0 self-stretch flex items-center justify-center"
            style={{
              width: "52px",
              backgroundColor: "var(--accent)",
              color: "#fff",
            }}
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
