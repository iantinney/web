"use client";

import { useState } from "react";
import { X, Pencil, BookOpen, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { safeJsonParse, formatDate, proficiencyColor } from "@/lib/utils";
import { getPrerequisites } from "@/lib/algorithms/prerequisiteChecker";
import type { Concept, ConceptEdge, GraphMembership } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const tierColors: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "rgba(0, 210, 160, 0.15)", text: "#00d2a0", label: "Intro" },
  2: { bg: "rgba(255, 197, 61, 0.15)", text: "#ffc53d", label: "Intermediate" },
  3: { bg: "rgba(255, 107, 107, 0.15)", text: "#ff6b6b", label: "Advanced" },
};

const proficiencyBgColor: Record<string, string> = {
  green: "#00d2a0",
  yellow: "#ffc53d",
  red: "#ff6b6b",
  gray: "#8888a8",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NodeDetailPanelProps {
  concept: Concept;
  edges: ConceptEdge[];
  nodes: Concept[];
  isShared?: boolean;
  membership?: GraphMembership;
  onClose: () => void;
  onConceptSelect: (id: string) => void;
}

// ---------------------------------------------------------------------------
// NodeDetailPanel component
// ---------------------------------------------------------------------------

export function NodeDetailPanel({
  concept,
  edges,
  nodes,
  isShared = false,
  membership,
  onClose,
  onConceptSelect,
}: NodeDetailPanelProps) {
  const router = useRouter();
  const { setConceptNodes, conceptNodes, graphMemberships } = useAppStore();

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(concept.name);
  const [editDescription, setEditDescription] = useState(concept.description);
  const [editKeyTerms, setEditKeyTerms] = useState(
    safeJsonParse<string[]>(concept.keyTermsJson, []).join(", ")
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Derived data
  const keyTerms = safeJsonParse<string[]>(concept.keyTermsJson, []);
  const color = proficiencyColor(concept.proficiency, concept.confidence);
  const proficiencyBg = proficiencyBgColor[color] ?? proficiencyBgColor.gray;
  const proficiencyPct = Math.round(concept.proficiency * 100);
  // Get depthTier from membership if available, otherwise fall back to searching store
  const tier = membership?.depthTier ?? graphMemberships.find((m) => m.conceptId === concept.id)?.depthTier ?? 1;
  const tierInfo = tierColors[tier] ?? tierColors[1];

  // Prerequisite and dependent concepts
  const prerequisites = edges
    .filter((e) => e.toNodeId === concept.id)
    .map((e) => nodes.find((n) => n.id === e.fromNodeId))
    .filter((n): n is Concept => !!n);

  const dependents = edges
    .filter((e) => e.fromNodeId === concept.id)
    .map((e) => nodes.find((n) => n.id === e.toNodeId))
    .filter((n): n is Concept => !!n);

  // Practice CTA handler
  function handlePractice() {
    const store = useAppStore.getState();
    // Update chatContext so chat tutor knows which concept is being targeted
    store.setChatContext({
      ...store.chatContext,
      activeConceptId: concept.id,
    });
    store.setTargetConceptId(concept.id);
    store.setActiveTab("learn");
    router.push("/learn");
  }

  // Edit save handler
  async function handleSave() {
    setIsSaving(true);
    setSaveError(null);

    // Parse key terms from comma-separated input
    const parsedKeyTerms = editKeyTerms
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      const res = await fetch(
        `/api/concepts/${concept.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName,
            description: editDescription,
            keyTermsJson: JSON.stringify(parsedKeyTerms),
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }

      const { concept: updatedConcept } = await res.json();

      // Optimistic store update
      setConceptNodes(
        conceptNodes.map((n) =>
          n.id === concept.id ? { ...n, ...updatedConcept } : n
        )
      );

      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditName(concept.name);
    setEditDescription(concept.description);
    setEditKeyTerms(safeJsonParse<string[]>(concept.keyTermsJson, []).join(", "));
    setSaveError(null);
    setIsEditing(false);
  }

  // Suppress clicks from propagating to ReactFlow canvas
  function stopPropagation(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className="absolute right-0 top-0 h-full w-80 z-20 overflow-y-auto flex flex-col"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border)",
        animation: "panel-slide-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
      onClick={stopPropagation}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="flex items-start gap-2 p-4 pb-3 sticky top-0 z-10"
        style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              className="w-full text-base font-semibold rounded-lg px-2 py-1 focus:outline-none"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          ) : (
            <h3
              className="text-base font-semibold leading-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {concept.name}
            </h3>
          )}

          {/* Concept badge */}
          <div className="flex gap-2 mt-1.5">
            <span
              className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: tierInfo.bg, color: tierInfo.text }}
            >
              {tierInfo.label}
            </span>
            {isShared && (
              <span
                className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: "rgba(0, 210, 160, 0.2)",
                  color: "var(--success)",
                }}
              >
                🔗 Shared
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-lg transition-colors hover:opacity-70"
              style={{ color: "var(--text-muted)" }}
              title="Edit concept"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:opacity-70"
            style={{ color: "var(--text-muted)" }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Content                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 p-4 space-y-5">

        {/* Proficiency section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              Proficiency
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: proficiencyBg }}
            >
              {concept.confidence > 0.1 ? `${proficiencyPct}%` : "—"}
            </span>
          </div>

          {/* Bar */}
          <div
            className="w-full h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--bg-card)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${concept.confidence > 0.1 ? proficiencyPct : 0}%`,
                background: `linear-gradient(90deg, ${proficiencyBg}88, ${proficiencyBg})`,
                animation: "bar-fill-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both",
                boxShadow: concept.confidence > 0.1 ? `0 0 8px ${proficiencyBg}40` : "none",
              }}
            />
          </div>

          <div
            className="flex items-center justify-between mt-1.5 text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <span>
              {concept.confidence >= 0.5 ? "Tested" : "Estimated"}
            </span>
            <span>
              {concept.attemptCount} attempt{concept.attemptCount !== 1 ? "s" : ""}
            </span>
          </div>

          {concept.lastPracticed && (
            <div
              className="text-xs mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              Last practiced: {formatDate(concept.lastPracticed)}
            </div>
          )}
        </div>

        {/* Prerequisites */}
        {prerequisites.length > 0 && (
          <div>
            <div
              className="text-xs font-medium uppercase tracking-wide mb-2"
              style={{ color: "var(--text-muted)" }}
            >
              Prerequisites
            </div>
            <div className="space-y-2">
              {prerequisites.map((prereq) => {
                const prereqPct = Math.round(prereq.proficiency * 100);
                const isMastered = prereq.proficiency >= 0.8;
                return (
                  <div
                    key={prereq.id}
                    className="text-sm p-2.5 rounded-lg transition-colors hover:opacity-80 cursor-pointer"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderLeft: `3px solid ${isMastered ? "#00d2a0" : "#ff6b6b"}`,
                    }}
                    onClick={() => onConceptSelect(prereq.id)}
                    title={`Click to view ${prereq.name}`}
                  >
                    <div className="flex items-center justify-between">
                      <span style={{ color: "var(--text-primary)" }}>
                        {prereq.name}
                      </span>
                      {isMastered ? (
                        <CheckCircle2 size={14} style={{ color: "#00d2a0" }} />
                      ) : (
                        <AlertCircle size={14} style={{ color: "#ff6b6b" }} />
                      )}
                    </div>
                    <div className="text-xs mt-1 flex items-center justify-between">
                      <span style={{ color: "var(--text-muted)" }}>
                        {isMastered ? "Mastered" : "Incomplete"}
                      </span>
                      <span
                        style={{
                          color: isMastered ? "#00d2a0" : "#ff6b6b",
                          fontWeight: 600,
                        }}
                      >
                        {prereq.confidence > 0.1 ? `${prereqPct}%` : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <div
            className="text-xs font-medium uppercase tracking-wide mb-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            Description
          </div>
          {isEditing ? (
            <textarea
              className="w-full text-sm rounded-lg px-3 py-2 resize-none focus:outline-none"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                minHeight: "80px",
              }}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          ) : (
            <p
              className="text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {concept.description || (
                <span style={{ color: "var(--text-muted)" }}>
                  No description
                </span>
              )}
            </p>
          )}
        </div>

        {/* Key Terms */}
        <div>
          <div
            className="text-xs font-medium uppercase tracking-wide mb-1.5"
            style={{ color: "var(--text-muted)" }}
          >
            Key Terms
          </div>
          {isEditing ? (
            <div>
              <input
                className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none"
                style={{
                  backgroundColor: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
                placeholder="term1, term2, term3"
                value={editKeyTerms}
                onChange={(e) => setEditKeyTerms(e.target.value)}
              />
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                Comma-separated list
              </p>
            </div>
          ) : keyTerms.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {keyTerms.map((term) => (
                <span
                  key={term}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {term}
                </span>
              ))}
            </div>
          ) : (
            <p
              className="text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              No key terms
            </p>
          )}
        </div>

        {/* Prerequisites */}
        {prerequisites.length > 0 && (
          <div>
            <div
              className="text-xs font-medium uppercase tracking-wide mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Prerequisites ({prerequisites.length})
            </div>
            <ul className="space-y-1">
              {prerequisites.map((prereq) => (
                <li key={prereq.id}>
                  <button
                    className="text-sm text-left w-full px-3 py-2 rounded-lg transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      color: "var(--accent)",
                      border: "1px solid var(--border)",
                    }}
                    onClick={() => onConceptSelect(prereq.id)}
                  >
                    {prereq.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dependents */}
        {dependents.length > 0 && (
          <div>
            <div
              className="text-xs font-medium uppercase tracking-wide mb-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              Unlocks ({dependents.length})
            </div>
            <ul className="space-y-1">
              {dependents.map((dep) => (
                <li key={dep.id}>
                  <button
                    className="text-sm text-left w-full px-3 py-2 rounded-lg transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border)",
                    }}
                    onClick={() => onConceptSelect(dep.id)}
                  >
                    {dep.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Edit mode save/cancel */}
        {isEditing && (
          <div className="space-y-2">
            {saveError && (
              <p
                className="text-xs px-2 py-1 rounded-lg"
                style={{
                  backgroundColor: "rgba(255, 107, 107, 0.12)",
                  color: "#ff6b6b",
                }}
              >
                {saveError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors hover:opacity-90 disabled:opacity-50"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--bg-primary)",
                }}
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
                style={{
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                }}
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Practice CTA (sticky at bottom)                                     */}
      {/* ------------------------------------------------------------------ */}
      {!isEditing && (
        <div
          className="p-4 sticky bottom-0"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderTop: "1px solid var(--border)",
          }}
        >
          <button
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--bg-primary)",
            }}
            onClick={handlePractice}
          >
            <BookOpen size={15} />
            Practice this concept
          </button>
        </div>
      )}
    </div>
  );
}
