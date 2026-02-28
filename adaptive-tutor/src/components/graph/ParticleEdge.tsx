"use client";

import React, { useMemo } from "react";
import {
  BaseEdge,
  getStraightPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";

// ---------------------------------------------------------------------------
// ParticleEdge — neon green base line + animated pulse dots traveling along it
// ---------------------------------------------------------------------------

type ParticleEdgeData = {
  sourceProficiency: number;
  isLocked: boolean;
  [key: string]: unknown;
};

type ParticleEdgeType = Edge<ParticleEdgeData, "particle">;

function ParticleEdgeComponent({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style,
  // Destructure React Flow props that shouldn't reach the DOM
  selectable: _selectable,
  deletable: _deletable,
  sourcePosition: _sourcePosition,
  targetPosition: _targetPosition,
  sourceHandleId: _sourceHandleId,
  targetHandleId: _targetHandleId,
  pathOptions: _pathOptions,
  ...rest
}: EdgeProps<ParticleEdgeType>) {
  const proficiency = data?.sourceProficiency ?? 0;
  const isLocked = data?.isLocked ?? false;

  const [edgePath] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  // Merge hover opacity/transition from React Flow with our color styles.
  // `style` comes from the edge object (set by hover focus effect in graph/page).
  // Our stroke/width/linecap must always win — spread `style` first, then override.

  // Stable random duration per edge (seeded from source/target coordinates)
  const lockedDur = useMemo(() => {
    const seed = Math.abs(sourceX * 7 + sourceY * 13 + targetX * 19 + targetY * 23);
    return 10 + (seed % 6); // 10s to 15s
  }, [sourceX, sourceY, targetX, targetY]);

  if (isLocked) {
    return (
      <>
        <BaseEdge
          {...rest}
          path={edgePath}
          style={{
            ...style,
            stroke: "rgba(100, 100, 140, 0.35)",
            strokeWidth: 1.5,
            strokeDasharray: "4 6",
          }}
        />
        {/* Single slow pulse dot traveling along locked edge */}
        <circle
          r={2.5}
          fill="rgba(0, 210, 160, 0.7)"
          style={{ filter: "drop-shadow(0 0 4px rgba(0, 210, 160, 0.5))" }}
        >
          <animateMotion dur={`${lockedDur}s`} repeatCount="indefinite" path={edgePath} keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="linear" />
        </circle>
      </>
    );
  }

  // Pulse speed scales with proficiency: 3s at 0% → 1.2s at 100%
  const duration = 3 - proficiency * 1.8;

  return (
    <>
      {/* Base line — subtle neon green */}
      <BaseEdge
        {...rest}
        path={edgePath}
        style={{
          ...style,
          stroke: "rgba(0, 210, 160, 0.3)",
          strokeWidth: 2,
          strokeLinecap: "round",
        }}
      />
      {/* Pulse dots — animated green dots traveling along the edge */}
      <path
        d={edgePath}
        fill="none"
        stroke="rgba(0, 210, 160, 0.9)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeDasharray="4 22"
        style={{
          ...style,
          animation: `particle-flow ${duration}s linear infinite`,
          filter: "drop-shadow(0 0 6px rgba(0, 210, 160, 0.7))",
        }}
      />
    </>
  );
}

export const ParticleEdge = React.memo(ParticleEdgeComponent);

export const edgeTypes = { particle: ParticleEdge };
