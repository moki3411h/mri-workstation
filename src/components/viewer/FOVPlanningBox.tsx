import React from 'react';
import type { Point2D } from '@/lib/geometry';

export interface FOVPlanningBoxProps {
  corners: [Point2D, Point2D, Point2D, Point2D];
  sliceCount: number;
  sliceOrientation: 'horizontal' | 'vertical'; // which edges get the ticks
  showLocalizer?: boolean;
}

function midpoint(p1: Point2D, p2: Point2D): Point2D {
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
}

function edgeNormal(p1: Point2D, p2: Point2D, length: number): Point2D {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: (-dy / mag) * length, y: (dx / mag) * length };
}

function offsetLine(p1: Point2D, p2: Point2D, distance: number) {
  const norm = edgeNormal(p1, p2, distance);
  // the line equation is A*x + B*y = C
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const A = -dy;
  const B = dx;
  
  // offset points
  const op1 = { x: p1.x + norm.x, y: p1.y + norm.y };
  // const op2 = { x: p2.x + norm.x, y: p2.y + norm.y };
  
  const C = A * op1.x + B * op1.y;
  return { A, B, C };
}

function intersectLines(l1: ReturnType<typeof offsetLine>, l2: ReturnType<typeof offsetLine>): Point2D {
  const det = l1.A * l2.B - l2.A * l1.B;
  if (Math.abs(det) < 1e-6) return { x: 0, y: 0 }; // parallel fallback
  const x = (l2.B * l1.C - l1.B * l2.C) / det;
  const y = (l1.A * l2.C - l2.A * l1.C) / det;
  return { x, y };
}

export function FOVPlanningBox({ corners, sliceCount, sliceOrientation, showLocalizer }: FOVPlanningBoxProps) {
  const [tl, tr, br, bl] = corners;

  // ── Layer 1: Main Box & Handles ──
  const points = corners.map(c => `${c.x},${c.y}`).join(' ');
  const topMid = midpoint(tl, tr);
  const botMid = midpoint(bl, br);
  const leftMid = midpoint(tl, bl);
  const rightMid = midpoint(tr, br);

  const handles = [
    tl, tr, br, bl,
    topMid, botMid, leftMid, rightMid
  ];

  // Rotation handle (extends from top edge)
  const cx = (tl.x + tr.x + br.x + bl.x) / 4;
  const cy = (tl.y + tr.y + br.y + bl.y) / 4;
  const dx = topMid.x - cx;
  const dy = topMid.y - cy;
  const len = Math.hypot(dx, dy);
  const rotHandle = len > 1 
    ? { x: topMid.x + (dx / len) * 38, y: topMid.y + (dy / len) * 38 }
    : { x: topMid.x, y: topMid.y - 38 };

  // ── Layer 2: Ticks ──
  const ticks: React.ReactNode[] = [];
  const TICK_LEN = 8;
  const addTicks = (pStart: Point2D, pEnd: Point2D) => {
    // We want the normal pointing OUT of the box. 
    // To ensure consistency, we check against the centroid.
    let n = edgeNormal(pStart, pEnd, TICK_LEN);
    const mid = midpoint(pStart, pEnd);
    const dot = (mid.x - cx) * n.x + (mid.y - cy) * n.y;
    if (dot < 0) {
      n = { x: -n.x, y: -n.y }; // flip outward
    }
    
    const count = Math.max(1, sliceCount);
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const px = pStart.x + (pEnd.x - pStart.x) * t;
      const py = pStart.y + (pEnd.y - pStart.y) * t;
      ticks.push(
        <line
          key={`${px}-${py}`}
          x1={px} y1={py}
          x2={px + n.x} y2={py + n.y}
          stroke="#fa8072"
          strokeWidth={1.5}
        />
      );
    }
  };

  if (sliceOrientation === 'horizontal') {
    // ticks on top and bottom edges
    addTicks(tl, tr);
    addTicks(bl, br);
  } else {
    // ticks on left and right edges
    addTicks(tl, bl);
    addTicks(tr, br);
  }

  // ── Layer 4: Inner Localizer ──
  let innerPoly = null;
  if (showLocalizer) {
    // INSET by 14px. We need outward normals, but negate the distance.
    const INSET = -14;
    // Edges defined in order: top, right, bottom, left
    // Normal calculation inside `offsetLine` relies on winding order.
    // Assuming tl -> tr -> br -> bl is clockwise:
    const lTop = offsetLine(tl, tr, INSET);
    const lRight = offsetLine(tr, br, INSET);
    const lBot = offsetLine(br, bl, INSET);
    const lLeft = offsetLine(bl, tl, INSET);

    const iTL = intersectLines(lLeft, lTop);
    const iTR = intersectLines(lTop, lRight);
    const iBR = intersectLines(lRight, lBot);
    const iBL = intersectLines(lBot, lLeft);

    innerPoly = `${iTL.x},${iTL.y} ${iTR.x},${iTR.y} ${iBR.x},${iBR.y} ${iBL.x},${iBL.y}`;
  }

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
      {/* Layer 1: Main bounding polygon */}
      <polygon
        points={points}
        fill="none"
        stroke="#ffff00"
        strokeWidth={1.5}
      />
      
      {/* 8 Drag Handles */}
      {handles.map((h, i) => (
        <rect
          key={i}
          x={h.x - 3}
          y={h.y - 3}
          width={6}
          height={6}
          fill="none"
          stroke="#ffff00"
          strokeWidth={1.5}
        />
      ))}

      {/* Rotation Handle */}
      <line
        x1={topMid.x} y1={topMid.y}
        x2={rotHandle.x} y2={rotHandle.y}
        stroke="#ffff00" strokeWidth={1.5} strokeDasharray="3,3"
      />
      <circle cx={rotHandle.x} cy={rotHandle.y} r={4} fill="none" stroke="#ffff00" strokeWidth={1.5} />

      {/* Layer 2: Ticks */}
      {ticks}

      {/* Layer 3: Dashed Cyan Crosshair */}
      <line
        x1={topMid.x} y1={topMid.y}
        x2={botMid.x} y2={botMid.y}
        stroke="#00ffff" strokeWidth={1} strokeDasharray="5,5"
      />
      <line
        x1={leftMid.x} y1={leftMid.y}
        x2={rightMid.x} y2={rightMid.y}
        stroke="#00ffff" strokeWidth={1} strokeDasharray="5,5"
      />
      <circle cx={cx} cy={cy} r={2} fill="#00ffff" />

      {/* Layer 4: Inner Localizer (Optional) */}
      {showLocalizer && innerPoly && (
        <polygon
          points={innerPoly}
          fill="none"
          stroke="#ffff00"
          strokeWidth={1}
          strokeDasharray="4,4"
        />
      )}
    </svg>
  );
}
