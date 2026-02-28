"use client";

import React from "react";

// ---------------------------------------------------------------------------
// WebLogo — SVG network-graph icon representing "Web" brand
//
// Small rounded rectangles connected by edges forming a web.
// Dangling edge stubs extend beyond the viewBox — the parent container's
// border-radius + overflow:hidden clips them into a circle, filling the shape.
// ---------------------------------------------------------------------------

interface WebLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// 32×32 viewBox — nodes kept safely inside, edges extend beyond
const NODES: readonly { cx: number; cy: number; w: number; h: number; hub: boolean }[] = [
  // Hub
  { cx: 16, cy: 16, w: 5.5, h: 3.5, hub: true },
  // Ring — slightly irregular for organic feel
  { cx: 16, cy: 6.5, w: 4.5, h: 3, hub: false },   // 1: top
  { cx: 25, cy: 10, w: 4.5, h: 3, hub: false },     // 2: top-right
  { cx: 25, cy: 22, w: 4.5, h: 3, hub: false },     // 3: bottom-right
  { cx: 16, cy: 25.5, w: 4.5, h: 3, hub: false },   // 4: bottom
  { cx: 7, cy: 22, w: 4.5, h: 3, hub: false },      // 5: bottom-left
  { cx: 7, cy: 10, w: 4.5, h: 3, hub: false },      // 6: top-left
];

// Dangling edge endpoints — extend past viewBox, clipped by parent circle
const DANGLES = [
  { from: 1, x: 16, y: -2 },    // top → up
  { from: 2, x: 34, y: 4 },     // top-right → out
  { from: 3, x: 34, y: 28 },    // bottom-right → out
  { from: 4, x: 16, y: 34 },    // bottom → down
  { from: 5, x: -2, y: 28 },    // bottom-left → out
  { from: 6, x: -2, y: 4 },     // top-left → out
] as const;

// [from, to, type] — "hub" | "ring" | "cross"
type EdgeType = "hub" | "ring" | "cross";
const EDGES: [number, number, EdgeType][] = [
  // Hub spokes
  [0, 1, "hub"], [0, 2, "hub"], [0, 3, "hub"],
  [0, 4, "hub"], [0, 5, "hub"], [0, 6, "hub"],
  // Ring perimeter
  [1, 2, "ring"], [2, 3, "ring"], [3, 4, "ring"],
  [4, 5, "ring"], [5, 6, "ring"], [6, 1, "ring"],
  // Cross-connections for density
  [1, 3, "cross"], [4, 6, "cross"],
];

const EDGE_STYLE: Record<EdgeType, { width: number; opacity: number }> = {
  hub: { width: 0.9, opacity: 0.45 },
  ring: { width: 0.7, opacity: 0.3 },
  cross: { width: 0.5, opacity: 0.2 },
};

export function WebLogo({ size = 20, className, style }: WebLogoProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      overflow="visible"
      className={className}
      style={{
        filter: "drop-shadow(0 0 4px rgba(0, 210, 160, 0.4))",
        ...style,
      }}
    >
      {/* Dangling edge stubs — extend beyond viewBox, clipped by parent */}
      {DANGLES.map((d, i) => (
        <line
          key={`d${i}`}
          x1={NODES[d.from].cx}
          y1={NODES[d.from].cy}
          x2={d.x}
          y2={d.y}
          stroke="#00d2a0"
          strokeWidth={0.6}
          opacity={0.2}
          strokeLinecap="round"
        />
      ))}

      {/* Internal edges */}
      {EDGES.map(([from, to, type], i) => {
        const s = EDGE_STYLE[type];
        return (
          <line
            key={`e${i}`}
            x1={NODES[from].cx}
            y1={NODES[from].cy}
            x2={NODES[to].cx}
            y2={NODES[to].cy}
            stroke="#00d2a0"
            strokeWidth={s.width}
            opacity={s.opacity}
            strokeLinecap="round"
          />
        );
      })}

      {/* Nodes — small rounded rectangles */}
      {NODES.map((n, i) => (
        <rect
          key={`n${i}`}
          x={n.cx - n.w / 2}
          y={n.cy - n.h / 2}
          width={n.w}
          height={n.h}
          rx={1.2}
          fill={n.hub ? "#00d2a0" : "#0e1117"}
          stroke="#00d2a0"
          strokeWidth={n.hub ? 0 : 0.7}
          opacity={n.hub ? 1 : 0.9}
        />
      ))}
    </svg>
  );
}
