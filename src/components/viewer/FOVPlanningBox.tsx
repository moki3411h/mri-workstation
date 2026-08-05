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
  /** rotation-handle arrow at one corner, or "none" */
  rotateHandleAt?: Corner | "none";
  color?: string;
  strokeWidth?: number;
  /** pointer handlers from useFOVBoxController — omit for a static, non-interactive box */
  onBodyPointerDown?: (e: React.PointerEvent<SVGElement>) => void;
  onRotateHandlePointerDown?: (e: React.PointerEvent<SVGElement>) => void;
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
  showCircleMarker = true,
  circleMarkerT = 0.15,
  rotateHandleAt = "br",
  color = "#e8e13a",
  strokeWidth = 1.25,
  onBodyPointerDown,
  onRotateHandlePointerDown,
}: FOVPlanningBoxProps) {
  if (!hasImage) return null;

  const { tl, tr, bl, br } = cornerMap(corners);
  const dashArray = lineStyle === "dashed" ? "6 4" : undefined;

  const polygonPoints = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;

  const lineLeft = lerp(tl, bl, referenceLineT);
  const lineRight = lerp(tr, br, referenceLineT);
  const circlePos = lerp(lineLeft, lineRight, circleMarkerT);

  const cornerPoint: Record<Corner, Point> = { tl, tr, bl, br };

  return (
    <g style={{ pointerEvents: "none" }}>
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
    </g>
  );
}
