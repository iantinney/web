"use client";

import React, { useMemo } from "react";
import type { UnitGraph, StudyPlan } from "@/lib/types";
import { ChevronDown, BookOpen } from "lucide-react";

interface MultiGraphSelectorProps {
  graphs: (UnitGraph & {
    studyPlanTitle?: string;
    conceptCount?: number;
    avgProficiency?: number;
  })[];
  studyPlans: StudyPlan[];
  activeGraphId: string | null;
  onSelectGraph: (graphId: string) => void;
}

/**
 * Sidebar component showing all graphs grouped by curriculum
 * Allows easy navigation between different study paths
 */
export function MultiGraphSelector({
  graphs,
  studyPlans,
  activeGraphId,
  onSelectGraph,
}: MultiGraphSelectorProps) {
  // Group graphs by studyPlanId
  const grouped = useMemo(() => {
    const map = new Map<string, typeof graphs>();

    graphs.forEach((g) => {
      if (!map.has(g.studyPlanId)) {
        map.set(g.studyPlanId, []);
      }
      map.get(g.studyPlanId)!.push(g);
    });

    return map;
  }, [graphs]);

  return (
    <div
      className="flex flex-col h-full w-64 border-r overflow-hidden"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={18} style={{ color: "var(--accent)" }} />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Learning Paths
          </h2>
        </div>
        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {graphs.length} {graphs.length === 1 ? "path" : "paths"}
        </p>
      </div>

      {/* Scrollable groups */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(grouped.entries()).map(([planId, planGraphs]) => {
          const plan = studyPlans.find((p) => p.id === planId);
          if (!plan) return null;

          return (
            <div key={planId}>
              {/* Curriculum header */}
              <div
                className="px-4 py-3 text-xs font-semibold sticky top-0"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  color: "var(--accent)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {plan.title}
              </div>

              {/* Graphs in this curriculum */}
              <div className="space-y-1 px-2 py-2">
                {planGraphs.map((graph) => {
                  const isActive = graph.id === activeGraphId;
                  const conceptCount = (graph as any).conceptCount ?? 0;
                  const avgProf = (graph as any).avgProficiency ?? 0;

                  return (
                    <button
                      key={graph.id}
                      onClick={() => onSelectGraph(graph.id)}
                      className="w-full text-left px-3 py-2.5 rounded-lg transition-all"
                      style={{
                        backgroundColor: isActive ? "var(--accent)" : "var(--bg-tertiary)",
                        color: isActive ? "#fff" : "var(--text-primary)",
                      }}
                    >
                      <div className="font-medium text-sm">{graph.title}</div>
                      <div
                        className="text-xs mt-1"
                        style={{
                          color: isActive ? "rgba(255,255,255,0.8)" : "var(--text-secondary)",
                        }}
                      >
                        {conceptCount} concepts · {Math.round(avgProf * 100)}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {graphs.length === 0 && (
        <div className="flex-1 flex items-center justify-center px-4 text-center">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            No learning paths yet. Create a lesson plan in Chat to get started.
          </p>
        </div>
      )}
    </div>
  );
}
