---
phase: 10-fix-graph-edge-visibility-and-pulse-animation
plan: 01
status: complete
started: 2026-02-27
completed: 2026-02-27
---

# Plan 10-01 Summary: Fix Edge Visibility and Neon Pulse Styling

## What Was Built

Fixed edge visibility bug and refined ParticleEdge visual style to match IntroAnimation neon green aesthetic.

## Key Changes

### Task 1: zIndex fix on edge objects (5b49212)
- Added `zIndex: 1` to every edge object in `flowEdges` useMemo in `graph/page.tsx`
- Root cause: React Flow renders edges and nodes at zIndex 0 by default; nodes paint over edges due to DOM order
- Fix elevates edges above unselected nodes (zIndex 0) but below selected/dragged nodes (zIndex 1000+)

### Task 2: ParticleEdge neon styling (f0107c7)
- Base line stroke: `rgba(0, 210, 160, 0.3)` (was 0.35) — exact IntroAnimation match
- Base line strokeWidth: `2` (was 1.5) — IntroAnimation match
- Added `strokeLinecap: "round"` — IntroAnimation match
- Pulse glow: `drop-shadow(0 0 6px rgba(0, 210, 160, 0.7))` (was 4px/0.6) — stronger neon glow

### Task 3: Style prop ordering fix (6aa5d82)
- Destructured `style` from EdgeProps separately to prevent `...rest` from clobbering inline stroke/width/linecap
- Spread `style` first then override with neon green values — preserves hover opacity/transition while keeping edge color correct

## Key Files

### Created
_(none)_

### Modified
- `adaptive-tutor/src/app/(tabs)/graph/page.tsx` — zIndex: 1 on all edge objects
- `adaptive-tutor/src/components/graph/ParticleEdge.tsx` — neon green styling + style prop fix

## Decisions
| Decision | Rationale |
|----------|-----------|
| Style prop destructured separately from rest | Prevents React Flow's style prop (set by hover effect) from overwriting our green stroke styles |
| zIndex: 1 as top-level edge property, not style.zIndex | React Flow only reads top-level zIndex for SVG wrapper positioning |

## Self-Check: PASSED
- [x] Edges visible above unselected nodes
- [x] Neon green color matching IntroAnimation
- [x] Pulse dots animated with proficiency-scaled speed
- [x] Hover focus dims unrelated edges, highlights connected
- [x] User visually verified and approved
