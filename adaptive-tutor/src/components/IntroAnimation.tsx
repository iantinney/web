"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ---------------------------------------------------------------------------
// IntroAnimation — "Learn · Infinitely · Your Way"
//
// Fullscreen neon graph splash. Pure SVG so edges connect to nodes perfectly.
// Plays once on first visit (before auth), stored in localStorage.
// ---------------------------------------------------------------------------

interface IntroAnimationProps {
  onComplete: () => void;
}

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// SVG viewBox coordinates — 1000×600 virtual canvas, centered
const VB_W = 1000;
const VB_H = 600;

// Node rectangles: { cx, cy, w, h, label, rx, fontSize }
const NODES = [
  { cx: 230, cy: 260, w: 180, h: 64, label: "Learn", rx: 14, fontSize: 28 },
  { cx: 500, cy: 220, w: 220, h: 64, label: "Infinitely", rx: 14, fontSize: 28 },
  { cx: 770, cy: 270, w: 200, h: 64, label: "Your Way", rx: 14, fontSize: 28 },
  { cx: 500, cy: 480, w: 160, h: 72, label: "Web", rx: 16, fontSize: 34 },
];

// Edge lines: from right edge of source → left edge of target
const EDGES = [
  {
    x1: NODES[0].cx + NODES[0].w / 2,
    y1: NODES[0].cy,
    x2: NODES[1].cx - NODES[1].w / 2,
    y2: NODES[1].cy,
  },
  {
    x1: NODES[1].cx + NODES[1].w / 2,
    y1: NODES[1].cy,
    x2: NODES[2].cx - NODES[2].w / 2,
    y2: NODES[2].cy,
  },
];

// Convergence edges: each of the 3 top nodes → "Web" node
// Middle edge uses a quadratic bezier curve (perfectly vertical lines render poorly)
const CONVERGE_EDGES = [
  {
    x1: NODES[0].cx,
    y1: NODES[0].cy + NODES[0].h / 2,
    x2: NODES[3].cx - 40,
    y2: NODES[3].cy - NODES[3].h / 2,
    path: `M ${NODES[0].cx} ${NODES[0].cy + NODES[0].h / 2} L ${NODES[3].cx - 40} ${NODES[3].cy - NODES[3].h / 2}`,
  },
  {
    x1: NODES[1].cx,
    y1: NODES[1].cy + NODES[1].h / 2,
    x2: NODES[3].cx,
    y2: NODES[3].cy - NODES[3].h / 2,
    // Slight S-curve so it's not a zero-width vertical line
    path: `M ${NODES[1].cx} ${NODES[1].cy + NODES[1].h / 2} C ${NODES[1].cx + 30} ${NODES[1].cy + NODES[1].h / 2 + 60}, ${NODES[3].cx - 30} ${NODES[3].cy - NODES[3].h / 2 - 60}, ${NODES[3].cx} ${NODES[3].cy - NODES[3].h / 2}`,
  },
  {
    x1: NODES[2].cx,
    y1: NODES[2].cy + NODES[2].h / 2,
    x2: NODES[3].cx + 40,
    y2: NODES[3].cy - NODES[3].h / 2,
    path: `M ${NODES[2].cx} ${NODES[2].cy + NODES[2].h / 2} L ${NODES[3].cx + 40} ${NODES[3].cy - NODES[3].h / 2}`,
  },
];

// Neon glow filter ID
const GLOW_ID = "intro-neon-glow";
const PULSE_GLOW_ID = "intro-pulse-glow";

export function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const [phase, setPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const completedRef = useRef(false);

  const doComplete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      doComplete();
    }
  }, [doComplete]);

  // Dramatic timeline with convergence finale
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),     // Node 1 fades in
      setTimeout(() => setPhase(2), 2200),    // Edge 1 extends
      setTimeout(() => setPhase(3), 3400),    // Pulse 1 travels + Node 2 appears
      setTimeout(() => setPhase(4), 5000),    // Edge 2 extends
      setTimeout(() => setPhase(5), 6200),    // Pulse 2 travels + Node 3 appears
      setTimeout(() => setPhase(6), 7800),    // Pan down + 3 convergence edges grow
      setTimeout(() => setPhase(7), 9400),    // 3 pulses travel + "Web" node appears
      setTimeout(() => setIsVisible(false), 11800), // Fade out
      setTimeout(() => doComplete(), 13000),  // Done
    ];
    return () => timers.forEach(clearTimeout);
  }, [doComplete]);

  const handleSkip = useCallback(() => {
    setIsVisible(false);
    setTimeout(doComplete, 600);
  }, [doComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "#060610",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            preserveAspectRatio="xMidYMid meet"
            style={{
              width: "100vw",
              height: "100vh",
              overflow: "visible",
            }}
          >
            {/* Glow filters */}
            <defs>
              <filter id={GLOW_ID} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id={PULSE_GLOW_ID} x="-200%" y="-200%" width="500%" height="500%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Pan group — shifts up when convergence phase starts */}
            <motion.g
              animate={{ translateY: phase >= 6 ? -60 : 0 }}
              transition={{ duration: 1.4, ease: EASE }}
            >

            {/* ---- EDGE 1: line draws itself, then pulse travels ---- */}
            {phase >= 2 && (
              <motion.path
                d={`M ${EDGES[0].x1} ${EDGES[0].y1} L ${EDGES[0].x2} ${EDGES[0].y2}`}
                fill="none"
                stroke="rgba(0, 210, 160, 0.3)"
                strokeWidth={2}
                strokeLinecap="round"
                filter={`url(#${GLOW_ID})`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            )}
            {phase >= 3 && (
              <motion.circle
                r={5}
                fill="#00d2a0"
                filter={`url(#${PULSE_GLOW_ID})`}
                initial={{ cx: EDGES[0].x1, cy: EDGES[0].y1, opacity: 1 }}
                animate={{
                  cx: EDGES[0].x2,
                  cy: EDGES[0].y2,
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
              />
            )}

            {/* ---- EDGE 2: line draws itself, then pulse travels ---- */}
            {phase >= 4 && (
              <motion.path
                d={`M ${EDGES[1].x1} ${EDGES[1].y1} L ${EDGES[1].x2} ${EDGES[1].y2}`}
                fill="none"
                stroke="rgba(0, 210, 160, 0.3)"
                strokeWidth={2}
                strokeLinecap="round"
                filter={`url(#${GLOW_ID})`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />
            )}
            {phase >= 5 && (
              <motion.circle
                r={5}
                fill="#00d2a0"
                filter={`url(#${PULSE_GLOW_ID})`}
                initial={{ cx: EDGES[1].x1, cy: EDGES[1].y1, opacity: 1 }}
                animate={{
                  cx: EDGES[1].x2,
                  cy: EDGES[1].y2,
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 1.4, ease: "easeInOut" }}
              />
            )}

            {/* ---- NODE 1: "Learn" ---- */}
            {phase >= 1 && (
              <motion.g
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.0, ease: EASE }}
                style={{ transformOrigin: `${NODES[0].cx}px ${NODES[0].cy}px` }}
              >
                <rect
                  x={NODES[0].cx - NODES[0].w / 2}
                  y={NODES[0].cy - NODES[0].h / 2}
                  width={NODES[0].w}
                  height={NODES[0].h}
                  rx={NODES[0].rx}
                  fill="#0e1117"
                  stroke="rgba(0, 210, 160, 0.5)"
                  strokeWidth={1.5}
                  filter={`url(#${GLOW_ID})`}
                />
                <text
                  x={NODES[0].cx}
                  y={NODES[0].cy + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#00d2a0"
                  fontSize={28}
                  fontWeight={600}
                  fontFamily="'DM Sans', sans-serif"
                  style={{ textShadow: "0 0 20px rgba(0, 210, 160, 0.6)" }}
                >
                  {NODES[0].label}
                </text>
              </motion.g>
            )}

            {/* ---- NODE 2: "Infinitely" ---- */}
            {phase >= 3 && (
              <motion.g
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.0, ease: EASE }}
                style={{ transformOrigin: `${NODES[1].cx}px ${NODES[1].cy}px` }}
              >
                <rect
                  x={NODES[1].cx - NODES[1].w / 2}
                  y={NODES[1].cy - NODES[1].h / 2}
                  width={NODES[1].w}
                  height={NODES[1].h}
                  rx={NODES[1].rx}
                  fill="#0e1117"
                  stroke="rgba(0, 210, 160, 0.5)"
                  strokeWidth={1.5}
                  filter={`url(#${GLOW_ID})`}
                />
                <text
                  x={NODES[1].cx}
                  y={NODES[1].cy + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#00d2a0"
                  fontSize={28}
                  fontWeight={600}
                  fontFamily="'DM Sans', sans-serif"
                  style={{ textShadow: "0 0 20px rgba(0, 210, 160, 0.6)" }}
                >
                  {NODES[1].label}
                </text>
              </motion.g>
            )}

            {/* ---- NODE 3: "Your Way" ---- */}
            {phase >= 5 && (
              <motion.g
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.0, ease: EASE }}
                style={{ transformOrigin: `${NODES[2].cx}px ${NODES[2].cy}px` }}
              >
                <rect
                  x={NODES[2].cx - NODES[2].w / 2}
                  y={NODES[2].cy - NODES[2].h / 2}
                  width={NODES[2].w}
                  height={NODES[2].h}
                  rx={NODES[2].rx}
                  fill="#0e1117"
                  stroke="rgba(0, 210, 160, 0.5)"
                  strokeWidth={1.5}
                  filter={`url(#${GLOW_ID})`}
                />
                <text
                  x={NODES[2].cx}
                  y={NODES[2].cy + 1}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#00d2a0"
                  fontSize={28}
                  fontWeight={600}
                  fontFamily="'DM Sans', sans-serif"
                  style={{ textShadow: "0 0 20px rgba(0, 210, 160, 0.6)" }}
                >
                  {NODES[2].label}
                </text>
              </motion.g>
            )}

            {/* ---- CONVERGENCE: 3 edges grow simultaneously ---- */}
            {phase >= 6 && CONVERGE_EDGES.map((edge, i) => (
              <motion.path
                key={`conv-edge-${i}`}
                d={edge.path}
                fill="none"
                stroke="rgba(0, 210, 160, 0.5)"
                strokeWidth={2.5}
                strokeLinecap="round"
                filter={`url(#${GLOW_ID})`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.4, ease: "easeInOut", delay: i * 0.1 }}
              />
            ))}

            {/* ---- CONVERGENCE: 3 pulses travel to "Web" ---- */}
            {phase >= 7 && CONVERGE_EDGES.map((edge, i) => (
              <motion.circle
                key={`conv-pulse-${i}`}
                r={5}
                fill="#00d2a0"
                filter={`url(#${PULSE_GLOW_ID})`}
                initial={{ cx: edge.x1, cy: edge.y1, opacity: 1 }}
                animate={{
                  cx: edge.x2,
                  cy: edge.y2,
                  opacity: [1, 1, 0],
                }}
                transition={{ duration: 1.4, ease: "easeInOut", delay: i * 0.08 }}
              />
            ))}

            {/* ---- NODE 4: "Web" — logo reveal ---- */}
            {phase >= 7 && (
              <motion.g
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: EASE }}
                style={{ transformOrigin: `${NODES[3].cx}px ${NODES[3].cy}px` }}
              >
                <rect
                  x={NODES[3].cx - NODES[3].w / 2}
                  y={NODES[3].cy - NODES[3].h / 2}
                  width={NODES[3].w}
                  height={NODES[3].h}
                  rx={NODES[3].rx}
                  fill="#0e1117"
                  stroke="rgba(0, 210, 160, 0.7)"
                  strokeWidth={2}
                  filter={`url(#${GLOW_ID})`}
                />
                <text
                  x={NODES[3].cx}
                  y={NODES[3].cy + 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#00d2a0"
                  fontSize={NODES[3].fontSize}
                  fontWeight={700}
                  fontFamily="'DM Sans', sans-serif"
                  letterSpacing="0.08em"
                  style={{ textShadow: "0 0 24px rgba(0, 210, 160, 0.8)" }}
                >
                  {NODES[3].label}
                </text>
              </motion.g>
            )}

            </motion.g>
          </svg>

          {/* Skip button */}
          <motion.button
            onClick={handleSkip}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            whileHover={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
            style={{
              position: "absolute",
              bottom: 32,
              right: 32,
              color: "rgba(255,255,255,0.4)",
              fontSize: 13,
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            Skip
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
