import React from "react";

export interface Point {
  x: number;
  y: number;
}

type Corner = "tl" | "tr" | "bl" | "br";

interface FOVPlanningBoxProps {
  /** 4 corners: top-left, top-right, bottom-left, bottom-right — any parallelogram (double oblique safe) */
  corners: [Point, Point, Point, Point];
  hasImage: boolean;
  /** dashed = actively planned in this view, solid = viewed edge-on from another plane */
  lineStyle?: "dashed" | "solid";
  /** show the single straight reference line cutting across the box */
  showReferenceLine?: boolean;
  /** 0 = along the top edge, 1 = along the bottom edge — where the reference line sits */
  referenceLineT?: number;
  /** small circle pivot marker on the reference line */
  showCircleMarker?: boolean;
  /** 0 = left end of the reference line, 1 = right end */
  circleMarkerT?: number;
  /** Slice stack rendering */
  sliceCount?: number;
  sliceTicks?: "top-bottom" | "left-right" | "none";
  /** Center isocenter cyan crosshair */
  showCrosshair?: boolean;
  /** Inner localizer boundary */
  showLocalizer?: boolean;
  /** rotation-handle arrow at one corner, or "none" */
  rotateHandleAt?: Corner | "none";
  color?: string;
  strokeWidth?: number;
  /** pointer handlers from useFOVBoxController — omit for a static, non-interactive box */
  onBodyPointerDown?: (e: React.PointerEvent<SVGElement>) => void;
  onRotateHandlePointerDown?: (e: React.PointerEvent<SVGElement>) => void;
  showCornerHitTargets?: boolean;
  onCornerPointerDown?: (corner: Corner) => (e: React.PointerEvent<SVGElement>) => void;
}

const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

const cornerMap = (corners: [Point, Point, Point, Point]) => {
  const [tl, tr, bl, br] = corners;
  return { tl, tr, bl, br };
};

/** small triangular arrow icon, oriented outward from the given corner */
function RotateArrow({ corner, at, color }: { corner: Corner; at: Point; color: string }) {
  const size = 9;
  const dir: Record<Corner, number> = { tl: 225, tr: -45, bl: 135, br: 45 };
  const rot = dir[corner];
  return (
    <g transform={`translate(${at.x}, ${at.y}) rotate(${rot})`} style={{ pointerEvents: "all", cursor: "grab" }}>
      <polygon
        points={`0,-${size} ${size},${size} -${size},${size}`}
        fill={color}
        stroke="#000"
        strokeWidth={0.5}
      />
    </g>
  );
}

export default function FOVPlanningBox({
  corners,
  hasImage,
  lineStyle = "dashed",
  showReferenceLine = true,
  referenceLineT = 0.5,
  showCircleMarker = false,
  circleMarkerT = 0.5,
  sliceCount = 0,
  sliceTicks = "none",
  showCrosshair = true,
  showLocalizer = false,
  rotateHandleAt = "br",
  color = "#FFFF00",
  strokeWidth = 1.25,
  onBodyPointerDown,
  onRotateHandlePointerDown,
  showCornerHitTargets = false,
  onCornerPointerDown,
}: FOVPlanningBoxProps) {
  if (!hasImage) return null;

  const { tl, tr, bl, br } = cornerMap(corners);
  const dashArray = lineStyle === "dashed" ? "6 4" : undefined;

  const polygonPoints = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;

  const lineLeft = lerp(tl, bl, referenceLineT);
  const lineRight = lerp(tr, br, referenceLineT);
  const circlePos = lerp(lineLeft, lineRight, circleMarkerT);

  const cornerPoint: Record<Corner, Point> = { tl, tr, bl, br };

  const center = lerp(lerp(tl, tr, 0.5), lerp(bl, br, 0.5), 0.5);

  // Crosshair points (local midpoints)
  const topMid = lerp(tl, tr, 0.5);
  const botMid = lerp(bl, br, 0.5);
  const leftMid = lerp(tl, bl, 0.5);
  const rightMid = lerp(tr, br, 0.5);

  // Helper to draw ticks
  const renderTicks = () => {
    if (sliceCount <= 1 || sliceTicks === "none") return null;
    const ticks = [];
    const tickLen = 6;
    
    for (let i = 0; i < sliceCount; i++) {
      const t = i / (sliceCount - 1);
      if (sliceTicks === "top-bottom") {
        // Ticks along top edge
        const pTop = lerp(tl, tr, t);
        // Ticks along bottom edge
        const pBot = lerp(bl, br, t);
        
        // Edge vectors to compute normal
        const dxTop = tr.x - tl.x; const dyTop = tr.y - tl.y;
        const magTop = Math.hypot(dxTop, dyTop) || 1;
        const nxTop = -dyTop / magTop; const nyTop = dxTop / magTop;

        const dxBot = br.x - bl.x; const dyBot = br.y - bl.y;
        const magBot = Math.hypot(dxBot, dyBot) || 1;
        const nxBot = dyBot / magBot; const nyBot = -dxBot / magBot;

        ticks.push(<line key={`t${i}`} x1={pTop.x} y1={pTop.y} x2={pTop.x + nxTop * tickLen} y2={pTop.y + nyTop * tickLen} stroke="#ff8a80" strokeWidth={1} />);
        ticks.push(<line key={`b${i}`} x1={pBot.x} y1={pBot.y} x2={pBot.x + nxBot * tickLen} y2={pBot.y + nyBot * tickLen} stroke="#ff8a80" strokeWidth={1} />);
      } else {
        // Ticks along left edge
        const pLeft = lerp(tl, bl, t);
        // Ticks along right edge
        const pRight = lerp(tr, br, t);

        const dxLeft = bl.x - tl.x; const dyLeft = bl.y - tl.y;
        const magLeft = Math.hypot(dxLeft, dyLeft) || 1;
        const nxLeft = dyLeft / magLeft; const nyLeft = -dxLeft / magLeft;

        const dxRight = br.x - tr.x; const dyRight = br.y - tr.y;
        const magRight = Math.hypot(dxRight, dyRight) || 1;
        const nxRight = -dyRight / magRight; const nyRight = dxRight / magRight;

        ticks.push(<line key={`l${i}`} x1={pLeft.x} y1={pLeft.y} x2={pLeft.x + nxLeft * tickLen} y2={pLeft.y + nyLeft * tickLen} stroke="#ff8a80" strokeWidth={1} />);
        ticks.push(<line key={`r${i}`} x1={pRight.x} y1={pRight.y} x2={pRight.x + nxRight * tickLen} y2={pRight.y + nyRight * tickLen} stroke="#ff8a80" strokeWidth={1} />);
      }
    }
    return <g>{ticks}</g>;
  };

  // Helper to inset polygon
  const renderLocalizer = () => {
    if (!showLocalizer) return null;
    const inset = 14;
    // Simple inset by moving corners towards center
    const iTl = lerp(tl, center, inset / Math.hypot(center.x - tl.x, center.y - tl.y));
    const iTr = lerp(tr, center, inset / Math.hypot(center.x - tr.x, center.y - tr.y));
    const iBl = lerp(bl, center, inset / Math.hypot(center.x - bl.x, center.y - bl.y));
    const iBr = lerp(br, center, inset / Math.hypot(center.x - br.x, center.y - br.y));
    return (
      <polygon
        points={`${iTl.x},${iTl.y} ${iTr.x},${iTr.y} ${iBr.x},${iBr.y} ${iBl.x},${iBl.y}`}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeDasharray="4 4"
      />
    );
  };

  return (
    <g style={{ pointerEvents: "none" }}>
      {renderLocalizer()}
      
      <polygon
        points={polygonPoints}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashArray}
        onPointerDown={onBodyPointerDown}
        style={{ pointerEvents: onBodyPointerDown ? "visibleStroke" : "none", cursor: onBodyPointerDown ? "move" : "default" }}
      />

      {showReferenceLine && (
        <line
          x1={lineLeft.x}
          y1={lineLeft.y}
          x2={lineRight.x}
          y2={lineRight.y}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={dashArray}
        />
      )}

      {renderTicks()}

      {showCrosshair && (
        <g>
          <line x1={topMid.x} y1={topMid.y} x2={botMid.x} y2={botMid.y} stroke="#00ffff" strokeWidth={1.25} strokeDasharray="4 4" />
          <line x1={leftMid.x} y1={leftMid.y} x2={rightMid.x} y2={rightMid.y} stroke="#00ffff" strokeWidth={1.25} strokeDasharray="4 4" />
          <circle cx={center.x} cy={center.y} r={3} fill="#00ffff" />
        </g>
      )}

      {showCircleMarker && (
        <circle
          cx={circlePos.x}
          cy={circlePos.y}
          r={4}
          fill="none"
          stroke={color}
          strokeWidth={1.25}
          style={{ pointerEvents: "all", cursor: "move" }}
        />
      )}

      {rotateHandleAt !== "none" && (
        <g onPointerDown={onRotateHandlePointerDown}>
          <RotateArrow corner={rotateHandleAt} at={cornerPoint[rotateHandleAt]} color={color} />
        </g>
      )}

      {showCornerHitTargets && onCornerPointerDown && (
        <g>
          {(["tl", "tr", "bl", "br"] as Corner[]).map((corner) => (
            <rect
              key={corner}
              x={cornerPoint[corner].x - 4}
              y={cornerPoint[corner].y - 4}
              width={8}
              height={8}
              fill="transparent"
              stroke={color}
              strokeWidth={1}
              style={{ pointerEvents: "all", cursor: "nwse-resize" }}
              onPointerDown={onCornerPointerDown(corner)}
            />
          ))}
        </g>
      )}
    </g>
  );
}
