"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useAppStore } from "@/lib/store";
import { WebLogo } from "@/components/WebLogo";
import { getLockedConcepts } from "@/lib/algorithms/prerequisiteChecker";
import { nodeTypes } from "@/components/graph/ConceptNode";
import { edgeTypes } from "@/components/graph/ParticleEdge";
import { NodeDetailPanel } from "@/components/graph/NodeDetailPanel";
import { MultiGraphSelector } from "@/components/graph/MultiGraphSelector";
import { AddConceptFAB } from "@/components/graph/AddConceptFAB";
import type { Concept } from "@/lib/types";

// ---------------------------------------------------------------------------
// Graph page
// ---------------------------------------------------------------------------

export default function GraphPage() {
  const {
    activeStudyPlanId,
    activeUnitGraphId,
    studyPlans,
    unitGraphs,
    graphConcepts,
    graphMemberships,
    graphEdges,
    sharedConceptIds,
  } = useAppStore();
  const loadUnitGraphData = useAppStore((state) => state.loadUnitGraphData);
  const setActiveUnitGraphId = useAppStore((state) => state.setActiveUnitGraphId);
  const [showSidebar, setShowSidebar] = useState(true);

  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // On mount: if we have an active unit graph, load its data
  useEffect(() => {
    if (activeUnitGraphId && graphConcepts.length === 0) {
      loadUnitGraphData(activeUnitGraphId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUnitGraphId]);

  // Close panel on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedConcept(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Calculate locked concepts based on prerequisites
  const lockedConceptIds = useMemo(
    () => getLockedConcepts(graphConcepts, graphEdges),
    [graphConcepts, graphEdges]
  );

  // Convert concept data to React Flow nodes/edges
  const flowNodes: Node[] = useMemo(
    () =>
      graphMemberships
        .map((membership) => ({
          membership,
          concept: graphConcepts.find((c) => c.id === membership.conceptId),
        }))
        .filter(({ concept }) => concept != null && !concept.isDeprecated)
        .map(({ membership, concept }, index) => ({
          id: concept!.id,
          type: "concept",
          position: { x: membership.positionX, y: membership.positionY },
          data: {
            concept: concept!,
            isShared: sharedConceptIds.includes(concept!.id),
            isLocked: lockedConceptIds.has(concept!.id),
            nodeIndex: index,
          },
          style: {
            transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          },
        })),
    [graphMemberships, graphConcepts, sharedConceptIds, lockedConceptIds]
  );

  // ---------------------------------------------------------------------------
  // All API edges with explicit handle selection per relative node position.
  // zIndex: 1 renders edges above unselected nodes (default zIndex 0) but below
  // selected/dragged nodes (elevated to zIndex 1000+). See xyflow/xyflow#4729.
  // ---------------------------------------------------------------------------

  const flowEdges: Edge[] = useMemo(
    () =>
      graphEdges.map((edge) => {
        const sourceConcept = graphConcepts.find(
          (c) => c.id === edge.fromNodeId
        );
        const sourceProficiency = sourceConcept?.proficiency ?? 0;
        const targetLocked = lockedConceptIds.has(edge.toNodeId);

        const sNode = flowNodes.find((n) => n.id === edge.fromNodeId);
        const tNode = flowNodes.find((n) => n.id === edge.toNodeId);

        let sourceHandle: string | undefined;
        let targetHandle: string | undefined;

        if (sNode && tNode) {
          const dx = tNode.position.x - sNode.position.x;
          const dy = tNode.position.y - sNode.position.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            sourceHandle = dx > 0 ? "source-right" : "source-left";
            targetHandle = dx > 0 ? "target-left" : "target-right";
          } else {
            sourceHandle = dy > 0 ? "source-bottom" : "source-top";
            targetHandle = dy > 0 ? "target-top" : "target-bottom";
          }
        }

        return {
          id: edge.id,
          source: edge.fromNodeId,
          target: edge.toNodeId,
          type: "particle",
          zIndex: 1,
          sourceHandle,
          targetHandle,
          data: {
            sourceProficiency,
            isLocked: targetLocked,
          },
        };
      }),
    [graphEdges, graphConcepts, lockedConceptIds, flowNodes]
  );

  // Connected node IDs for hover focus effect
  const connectedIds = useMemo(() => {
    if (!hoveredNodeId) return null;
    const ids = new Set<string>([hoveredNodeId]);
    graphEdges.forEach((edge) => {
      if (edge.fromNodeId === hoveredNodeId) ids.add(edge.toNodeId);
      if (edge.toNodeId === hoveredNodeId) ids.add(edge.fromNodeId);
    });
    return ids;
  }, [hoveredNodeId, graphEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync when data changes
  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  // Hover focus: dim unrelated nodes + edges, highlight connected ones
  useEffect(() => {
    if (!connectedIds) {
      // Reset all to full visibility
      setNodes((prev) =>
        prev.map((node) => ({
          ...node,
          style: {
            opacity: 1,
            transition: "opacity 0.3s ease, filter 0.3s ease",
            filter: "none",
          },
        }))
      );
      setEdges(flowEdges);
      return;
    }
    setNodes((prev) =>
      prev.map((node) => {
        const isConnected = connectedIds.has(node.id);
        return {
          ...node,
          style: {
            opacity: isConnected ? 1 : 0.15,
            transition: "opacity 0.3s ease, filter 0.3s ease",
            filter: isConnected ? "none" : "blur(1.5px) saturate(0.3)",
          },
        };
      })
    );
    setEdges(
      flowEdges.map((edge) => ({
        ...edge,
        style: {
          opacity:
            connectedIds.has(edge.source) && connectedIds.has(edge.target)
              ? 1
              : 0.06,
          transition: "opacity 0.3s ease",
        },
      }))
    );
  }, [connectedIds, setNodes, setEdges, flowEdges]);

  const onNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: Node) => setHoveredNodeId(node.id),
    []
  );
  const onNodeMouseLeave = useCallback(() => setHoveredNodeId(null), []);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const concept = graphConcepts.find((c) => c.id === node.id);
      setSelectedConcept(concept ?? null);
      // Update chatContext so chat tab knows which concept was explored
      if (concept) {
        useAppStore.getState().setChatContext({
          ...useAppStore.getState().chatContext,
          activeConceptId: concept.id,
        });
      }
    },
    [graphConcepts]
  );

  // Refresh graph data after custom concept addition
  const handleConceptAdded = useCallback(() => {
    if (activeUnitGraphId) {
      loadUnitGraphData(activeUnitGraphId);
    }
  }, [activeUnitGraphId, loadUnitGraphData]);

  if (!activeUnitGraphId || flowNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-6">
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
          className="text-xl font-semibold text-center"
          style={{ color: "var(--text-primary)" }}
        >
          No concept web yet
        </h2>
        <p
          className="text-sm text-center max-w-sm leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          Create a study plan in the <strong>Chat</strong> tab and your concept
          web will be generated here. You&apos;ll see your knowledge map with
          colored nodes showing your progress.
        </p>

        {/* Legend */}
        <div
          className="flex items-center gap-4 mt-4 px-4 py-2.5 rounded-xl border"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-card)",
          }}
        >
          {[
            { color: "var(--node-mastered)", label: "Mastered" },
            { color: "var(--node-developing)", label: "Developing" },
            { color: "var(--node-gap)", label: "Gap" },
            { color: "var(--node-untested)", label: "Untested" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleGraphSelect = async (graphId: string) => {
    setActiveUnitGraphId(graphId);
    await loadUnitGraphData(graphId);
  };

  const sharedCount = sharedConceptIds.length;
  const otherGraphsWithShared = sharedCount > 0
    ? unitGraphs.filter((g) => g.id !== activeUnitGraphId).length
    : 0;

  return (
    <div className="h-full relative flex flex-col">
      {/* Info header */}
      <div
        className="flex items-center justify-between text-xs px-3 py-2 border-b"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
          color: "var(--text-secondary)",
        }}
      >
        <span className="font-medium">
          {flowNodes.length} concepts
          {sharedCount > 0 && (
            <span style={{ color: "var(--success)" }}>
              {" "}· 🔗 {sharedCount} shared with {otherGraphsWithShared > 0 ? `${otherGraphsWithShared} other graph${otherGraphsWithShared > 1 ? "s" : ""}` : "others"}
            </span>
          )}
        </span>
      </div>

      {/* Main content area with sidebar */}
      <div className="flex-1 relative flex">
        {/* Sidebar - Multi-graph selector */}
        {showSidebar && unitGraphs.length > 1 && (
          <MultiGraphSelector
            graphs={unitGraphs}
            studyPlans={studyPlans}
            activeGraphId={activeUnitGraphId}
            onSelectGraph={handleGraphSelect}
          />
        )}

        {/* React Flow canvas */}
        <div className="flex-1 relative graph-canvas-wrapper">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodeClick={onNodeClick}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            fitView
            fitViewOptions={{ padding: 0.02, minZoom: 0.8 }}
            proOptions={{ hideAttribution: true }}
            minZoom={0.5}
            maxZoom={2.5}
          >
          <Background gap={28} size={0.7} color="rgba(100, 100, 140, 0.12)" />
          <Controls
            style={{
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid var(--border)",
            }}
          />
          </ReactFlow>

          {/* Frosted glass legend */}
          <div
            className="absolute bottom-3 left-3 z-10 flex items-center gap-4 px-4 py-2.5 rounded-2xl"
            style={{
              background: "rgba(18, 18, 26, 0.65)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              boxShadow: "0 4px 24px rgba(0, 0, 0, 0.25)",
            }}
          >
            {[
              { color: "#00d2a0", glow: "rgba(0, 210, 160, 0.5)", label: "Mastered" },
              { color: "#ffc53d", glow: "rgba(255, 197, 61, 0.4)", label: "Developing" },
              { color: "#ff6b6b", glow: "rgba(255, 107, 107, 0.4)", label: "Gap" },
              { color: "#6a6a88", glow: "rgba(106, 106, 136, 0.3)", label: "Untested" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: item.color,
                    boxShadow: `0 0 6px ${item.glow}`,
                  }}
                />
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.45)",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Add custom concept FAB */}
          {activeStudyPlanId && activeUnitGraphId && (
            <AddConceptFAB
              studyPlanId={activeStudyPlanId}
              unitGraphId={activeUnitGraphId}
              onConceptAdded={handleConceptAdded}
            />
          )}
        </div>
      </div>

      {/* Node detail panel */}
      {selectedConcept && (
        <NodeDetailPanel
          concept={selectedConcept}
          edges={graphEdges}
          nodes={graphConcepts}
          isShared={sharedConceptIds.includes(selectedConcept.id)}
          onClose={() => setSelectedConcept(null)}
          onConceptSelect={(id: string) =>
            setSelectedConcept(graphConcepts.find((c) => c.id === id) ?? null)
          }
        />
      )}
    </div>
  );
}
