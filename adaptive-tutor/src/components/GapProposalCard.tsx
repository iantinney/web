"use client";

import React from "react";
import { Loader2, Lightbulb } from "lucide-react";

// ---------------------------------------------------------------------------
// GapProposalCard
// Shown in the Learn tab when 2+ gap detections fire for the same prerequisite.
// ---------------------------------------------------------------------------

interface GapProposalCardProps {
  originalConceptName: string;
  missingConceptName: string;
  explanation: string;
  onConfirm: () => void;
  onDecline: () => void;
  isLoading?: boolean;
}

export const GapProposalCard: React.FC<GapProposalCardProps> = ({
  originalConceptName,
  missingConceptName,
  explanation,
  onConfirm,
  onDecline,
  isLoading = false,
}) => {
  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "rgba(255, 197, 61, 0.06)",
        borderColor: "var(--warning)",
        borderWidth: 1,
      }}
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Lightbulb size={16} style={{ color: "var(--warning)", flexShrink: 0 }} />
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            I think something&apos;s missing
          </span>
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          I noticed you struggled with{" "}
          <strong>{originalConceptName}</strong> more than once.
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
          You might be missing:{" "}
          <strong style={{ color: "var(--accent)" }}>
            {missingConceptName}
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
          style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
        >
          {isLoading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Adding...
            </>
          ) : (
            "Add to learning path"
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
        Once you master{" "}
        <strong>{missingConceptName}</strong>, we&apos;ll come back to{" "}
        <strong>{originalConceptName}</strong>.
      </p>
    </div>
  );
};
