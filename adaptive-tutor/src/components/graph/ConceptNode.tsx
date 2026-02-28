"use client";

import React from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Lock } from "lucide-react";
import { proficiencyColor } from "@/lib/utils";
import type { Concept } from "@/lib/types";

// ---------------------------------------------------------------------------
// Rich color palette — each state gets gradient, glow, and intensity variants
// ---------------------------------------------------------------------------

const colorMap: Record<
  string,
  {
    bgGradient: string;
    border: string;
    text: string;
    glow: string;
    glowIntense: string;
  }
> = {
  green: {
    bgGradient:
      "linear-gradient(145deg, rgba(0, 210, 160, 0.28) 0%, rgba(0, 210, 160, 0.12) 100%), #141922",
    border: "rgba(0, 210, 160, 0.6)",
    text: "#2aedb8",
    glow: "rgba(0, 210, 160, 0.2)",
    glowIntense: "rgba(0, 210, 160, 0.45)",
  },
  yellow: {
    bgGradient:
      "linear-gradient(145deg, rgba(255, 197, 61, 0.28) 0%, rgba(255, 197, 61, 0.12) 100%), #141922",
    border: "rgba(255, 197, 61, 0.6)",
    text: "#ffd666",
    glow: "rgba(255, 197, 61, 0.18)",
    glowIntense: "rgba(255, 197, 61, 0.4)",
  },
  red: {
    bgGradient:
      "linear-gradient(145deg, rgba(255, 107, 107, 0.28) 0%, rgba(255, 107, 107, 0.12) 100%), #141922",
    border: "rgba(255, 107, 107, 0.6)",
    text: "#ff8585",
    glow: "rgba(255, 107, 107, 0.18)",
    glowIntense: "rgba(255, 107, 107, 0.4)",
  },
  gray: {
    bgGradient:
      "linear-gradient(145deg, rgba(140, 140, 180, 0.18) 0%, rgba(140, 140, 180, 0.06) 100%), #141922",
    border: "rgba(140, 140, 180, 0.35)",
    text: "#a0a0c0",
    glow: "rgba(140, 140, 180, 0.1)",
    glowIntense: "rgba(140, 140, 180, 0.22)",
  },
};

// ---------------------------------------------------------------------------
// ConceptNode — luminous knowledge orb with state-driven visuals
// ---------------------------------------------------------------------------

function ConceptNodeComponent({ data }: NodeProps) {
  const concept = data.concept as Concept | undefined;
  const isShared = (data.isShared ?? false) as boolean;
  const isLocked = (data.isLocked ?? false) as boolean;
  const nodeIndex = (data.nodeIndex ?? 0) as number;

  if (!concept) return null;

  const color = proficiencyColor(concept.proficiency, concept.confidence);
  const colors = isLocked ? colorMap.gray : (colorMap[color] ?? colorMap.gray);
  const pct =
    concept.confidence > 0.1 ? Math.round(concept.proficiency * 100) : 0;
  const isMastered = color === "green" && !isLocked;
  const isUntested = color === "gray" && !isLocked;

  // Staggered entrance — closer nodes appear first (capped at 1.5s)
  const entranceDelay = Math.min(nodeIndex * 60, 1500);

  // Hidden handle style — visually clean but functionally present
  // React Flow auto-selects the closest handle pair for each edge
  const hiddenHandleStyle = {
    background: "transparent",
    border: "none",
    width: 6,
    height: 6,
    opacity: 0,
  };

  // Multi-layer glow for depth
  const baseShadow = [
    "inset 0 1px 0 rgba(255, 255, 255, 0.04)",
    `0 0 12px 2px ${colors.glow}`,
    `0 0 30px 6px ${colors.glow}`,
    isShared ? "0 0 20px 4px rgba(0, 210, 160, 0.35)" : null,
  ]
    .filter(Boolean)
    .join(", ");

  const hoverShadow = [
    "inset 0 1px 0 rgba(255, 255, 255, 0.06)",
    `0 0 18px 4px ${colors.glowIntense}`,
    `0 0 48px 10px ${colors.glow}`,
    isShared ? "0 0 24px 6px rgba(0, 210, 160, 0.45)" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Handle type="target" position={Position.Top} id="target-top" style={hiddenHandleStyle} />
      <Handle type="target" position={Position.Right} id="target-right" style={hiddenHandleStyle} />
      <Handle type="target" position={Position.Bottom} id="target-bottom" style={hiddenHandleStyle} />
      <Handle type="target" position={Position.Left} id="target-left" style={hiddenHandleStyle} />

      {/* Entrance animation wrapper */}
      <div
        style={{
          animation: `node-entrance 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${entranceDelay}ms both`,
          position: "relative",
        }}
      >
        {/* Mastered — breathing glow aura */}
        {isMastered && (
          <div
            style={{
              position: "absolute",
              inset: -2,
              borderRadius: 16,
              boxShadow: `0 0 24px 8px ${colors.glowIntense}, 0 0 56px 16px ${colors.glow}`,
              animation: "glow-pulse 3.5s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}

        {/* Main node body */}
        <div
          style={{
            position: "relative",
            padding: "10px 18px 14px",
            borderRadius: 14,
            border: `1.5px ${isLocked ? "dashed" : "solid"} ${colors.border}`,
            background: colors.bgGradient,
            minWidth: 130,
            maxWidth: 200,
            textAlign: "center",
            cursor: "pointer",
            overflow: "hidden",
            boxShadow: baseShadow,
            transition:
              "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s ease",
            ...(isLocked
              ? { filter: "saturate(0.25) brightness(0.65)", opacity: 0.7 }
              : {}),
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.transform = "scale(1.08)";
            el.style.boxShadow = hoverShadow;
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.transform = "scale(1)";
            el.style.boxShadow = baseShadow;
          }}
        >
          {/* Untested — beckoning shimmer sweep */}
          {isUntested && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                borderRadius: "inherit",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  width: "50%",
                  height: "100%",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
                  animation: "node-shimmer 4s ease-in-out infinite",
                }}
              />
            </div>
          )}

          {/* Lock icon for locked nodes */}
          {isLocked && (
            <div
              style={{
                position: "absolute",
                top: 7,
                right: 9,
                color: colors.text,
                opacity: 0.5,
              }}
            >
              <Lock size={11} />
            </div>
          )}

          {/* Concept name */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: isLocked ? "var(--text-secondary)" : colors.text,
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
            }}
          >
            {concept.name}
          </div>

          {/* Proficiency percentage */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: isLocked ? "var(--text-secondary)" : colors.text,
              opacity: isLocked ? 0.55 : 0.5,
              marginTop: 2,
              fontFamily: "monospace",
              letterSpacing: "0.06em",
            }}
          >
            {pct > 0 ? `${pct}%` : "\u2014"}
          </div>

          {/* Progress bar — gradient fill at node bottom */}
          {!isLocked && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${colors.text}88, ${colors.text})`,
                  borderRadius: "0 2px 0 0",
                  transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  boxShadow: pct > 0 ? `0 0 8px ${colors.glow}` : "none",
                }}
              />
            </div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Top} id="source-top" style={hiddenHandleStyle} />
      <Handle type="source" position={Position.Right} id="source-right" style={hiddenHandleStyle} />
      <Handle type="source" position={Position.Bottom} id="source-bottom" style={hiddenHandleStyle} />
      <Handle type="source" position={Position.Left} id="source-left" style={hiddenHandleStyle} />
    </>
  );
}

export const ConceptNode = React.memo(ConceptNodeComponent);

// ---------------------------------------------------------------------------
// nodeTypes registration (outside component to prevent re-renders)
// ---------------------------------------------------------------------------

export const nodeTypes = { concept: ConceptNode };
