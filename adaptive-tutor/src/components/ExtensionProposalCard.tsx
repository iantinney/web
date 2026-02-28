"use client";

import React from "react";
import { Loader2 } from "lucide-react";

// ---------------------------------------------------------------------------
// ExtensionProposalCard
// Shown in the Learn tab when the user triggers on-demand extension analysis
// after answering correctly. Blue/teal counterpart to the amber GapProposalCard.
// ---------------------------------------------------------------------------

interface ExtensionProposalCardProps {
  currentConceptName: string; // The concept user just answered correctly
  suggestedConceptName: string; // The suggested extension topic
  explanation: string; // Why this extension makes sense
  onConfirm: () => void;
  onDecline: () => void;
  isLoading?: boolean;
}

export const ExtensionProposalCard: React.FC<ExtensionProposalCardProps> = ({
  currentConceptName,
  suggestedConceptName,
  explanation,
  onConfirm,
  onDecline,
  isLoading = false,
}) => {
  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "rgba(56, 189, 248, 0.08)",
        borderColor: "rgba(56, 189, 248, 0.4)",
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-base">&#x1F680;</span>
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Ready for more?
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          You&apos;re doing great with{" "}
          <strong>{currentConceptName}</strong>!
        </p>
      </div>

      {/* Suggestion box */}
      <div
        className="rounded-xl p-3"
        style={{
          backgroundColor: "var(--bg-secondary)",
          border: "1px solid var(--border)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>
          Next topic to explore:{" "}
          <strong style={{ color: "rgb(56, 189, 248)" }}>
            {suggestedConceptName}
          </strong>
        </p>
        {explanation && (
          <p
            className="text-xs mt-1.5 leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            {explanation}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 py-2 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-1.5"
          style={{ backgroundColor: "rgb(56, 189, 248)", color: "#ffffff" }}
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Adding...
            </>
          ) : (
            "Explore this topic"
          )}
        </button>
        <button
          onClick={onDecline}
          disabled={isLoading}
          className="flex-1 py-2 rounded-xl text-sm font-medium border transition-opacity hover:opacity-75 disabled:opacity-50"
          style={{
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-card)",
          }}
        >
          Not now
        </button>
      </div>

      {/* Footer note */}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Once added, you can start practicing{" "}
        <strong>{suggestedConceptName}</strong> right away.
      </p>
    </div>
  );
};
