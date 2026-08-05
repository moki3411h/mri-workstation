import { useCallback, useRef, useState } from "react";
import type { Point } from "./FOVPlanningBox";

type Corner = "tl" | "tr" | "bl" | "br";
type DragMode = { type: "move" } | { type: "rotate" } | { type: "corner"; corner: Corner } | null;

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const centroid = (c: [Point, Point, Point, Point]): Point => ({
  x: (c[0].x + c[1].x + c[2].x + c[3].x) / 4,
  y: (c[0].y + c[1].y + c[2].y + c[3].y) / 4,
});
const rotatePoint = (p: Point, center: Point, angle: number): Point => {
  const s = Math.sin(angle), cx = Math.cos(angle);
  const d = sub(p, center);
  return { x: center.x + d.x * cx - d.y * s, y: center.y + d.x * s + d.y * cx };
};

export function useFOVBoxController(
  initialCorners: [Point, Point, Point, Point],
  rotateHandleCorner: Corner | "none" = "br"
) {
  const [corners, setCorners] = useState<[Point, Point, Point, Point]>(initialCorners);
  const dragMode = useRef<DragMode>(null);
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  const cornersAtDragStart = useRef<[Point, Point, Point, Point]>(initialCorners);

  const toLocalPoint = (e: React.PointerEvent<SVGElement>): Point => {
    const svg = (e.target as SVGElement).ownerSVGElement || (e.currentTarget as unknown as SVGSVGElement);
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startMove = useCallback((e: React.PointerEvent<SVGElement>) => {
    e.stopPropagation();
    dragMode.current = { type: "move" };
    dragStart.current = toLocalPoint(e);
    cornersAtDragStart.current = corners;
  }, [corners]);

  const startRotate = useCallback((e: React.PointerEvent<SVGElement>) => {
    e.stopPropagation();
    dragMode.current = { type: "rotate" };
    dragStart.current = toLocalPoint(e);
    cornersAtDragStart.current = corners;
  }, [corners]);

  const startCornerDrag = useCallback((corner: Corner) => (e: React.PointerEvent<SVGElement>) => {
    e.stopPropagation();
    dragMode.current = { type: "corner", corner };
    dragStart.current = toLocalPoint(e);
    cornersAtDragStart.current = corners;
  }, [corners]);

  const onPointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragMode.current) return;
    const current = toLocalPoint(e as unknown as React.PointerEvent<SVGElement>);
    const start = cornersAtDragStart.current;

    if (dragMode.current.type === "move") {
      const delta = sub(current, dragStart.current);
      setCorners(start.map((p) => add(p, delta)) as [Point, Point, Point, Point]);
      return;
    }

    if (dragMode.current.type === "rotate") {
      const center = centroid(start);
      const startAngle = Math.atan2(dragStart.current.y - center.y, dragStart.current.x - center.x);
      const currentAngle = Math.atan2(current.y - center.y, current.x - center.x);
      const delta = currentAngle - startAngle;
      setCorners(start.map((p) => rotatePoint(p, center, delta)) as [Point, Point, Point, Point]);
      return;
    }

    if (dragMode.current.type === "corner") {
      const idx: Record<Corner, number> = { tl: 0, tr: 1, bl: 2, br: 3 };
      const i = idx[dragMode.current.corner];
      const next = [...start] as [Point, Point, Point, Point];
      next[i] = current;
      setCorners(next);
    }
  }, []);

  const onPointerUp = useCallback(() => {
    dragMode.current = null;
  }, []);

  return {
    corners,
    setCorners,
    handlers: {
      onBodyPointerDown: startMove,
      onRotateHandlePointerDown: startRotate,
      onCornerPointerDown: startCornerDrag,
    },
    svgRootProps: {
      onPointerMove,
      onPointerUp,
      onPointerLeave: onPointerUp,
    },
    rotateHandleCorner,
  };
}
