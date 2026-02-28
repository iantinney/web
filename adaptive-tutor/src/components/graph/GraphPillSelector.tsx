"use client";

import React from "react";
import type { UnitGraph } from "@/lib/types";

interface GraphPillSelectorProps {
  graphs: UnitGraph[];
  activeGraphId: string | null;
  onSelectGraph: (graphId: string) => void;
}

/**
 * Horizontal pill selector for switching between unit graphs.
 * Shows concept count and average mastery % for each graph.
 */
export function GraphPillSelector({
  graphs,
  activeGraphId,
  onSelectGraph,
}: GraphPillSelectorProps) {
  if (graphs.length === 0) {
    return null;
  }

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto px-3 py-2"
      style={{
        scrollBehavior: "smooth",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {graphs.map((graph) => {
        const isActive = graph.id === activeGraphId;
        const conceptCount = (graph as any).conceptCount ?? 0;
        const avgProficiency = (graph as any).avgProficiency ?? 0;

        return (
          <button
            key={graph.id}
            onClick={() => onSelectGraph(graph.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border whitespace-nowrap`}
            style={{
              backgroundColor: isActive ? "var(--accent)" : "var(--bg-card)",
              color: isActive ? "#fff" : "var(--text-primary)",
              borderColor: isActive ? "var(--accent)" : "var(--border)",
              borderWidth: "1px",
              opacity: isActive ? 1 : 0.7,
              cursor: "pointer",
            }}
            title={graph.description || graph.title}
          >
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-xs opacity-75">{(graph as any).studyPlanTitle || "Curriculum"}</span>
              <span className="font-medium text-sm">{graph.title}</span>
              <span
                className="text-xs opacity-70"
                style={{ color: isActive ? "rgba(255,255,255,0.7)" : "var(--text-secondary)" }}
              >
                {conceptCount} concepts · {Math.round(avgProficiency * 100)}% mastered
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
