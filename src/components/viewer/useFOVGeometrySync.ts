import { useCallback, useMemo, useEffect } from "react";
import type { Point } from "./FOVPlanningBox";

interface GeometryValues {
  fovReadMm: number;
  fovPhaseMm: number;
  rotationDeg: number;
}

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const len = (a: Point): number => Math.hypot(a.x, a.y);
const centroid = (c: [Point, Point, Point, Point]): Point => ({
  x: (c[0].x + c[1].x + c[2].x + c[3].x) / 4,
  y: (c[0].y + c[1].y + c[2].y + c[3].y) / 4,
});

/**
 * `pxPerMm` converts between screen pixels (what the box is drawn in) and mm
 * (what the Geometry panel inputs show). Pass the same scout image's known
 * pixel-per-mm scale used elsewhere in your viewport.
 */
export function useFOVGeometrySync(
  corners: [Point, Point, Point, Point],
  setCorners: (c: [Point, Point, Point, Point]) => void,
  pxPerMm: number,
  storeGeometry: GeometryValues,
  updateStore: (geo: Partial<GeometryValues>) => void
) {
  // Sync local corners -> global store (when dragged)
  useEffect(() => {
    // Only update if corners represent a valid box
    if (!corners || corners.length !== 4) return;
    
    // Width (read) is length of top edge: tl to tr
    const readPx = len(sub(corners[1], corners[0]));
    // Height (phase) is length of left edge: tl to bl
    const phasePx = len(sub(corners[2], corners[0]));
    
    const readMm = Math.round(readPx / pxPerMm);
    const phaseMm = Math.round(phasePx / pxPerMm);
    
    // Rotation is angle of top edge
    const dx = corners[1].x - corners[0].x;
    const dy = corners[1].y - corners[0].y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    const rotDeg = Math.round(angle);
    
    // Only update if changed
    if (
      readMm !== storeGeometry.fovReadMm ||
      phaseMm !== storeGeometry.fovPhaseMm ||
      Math.abs(rotDeg - storeGeometry.rotationDeg) > 1 // allow 1 degree tolerance
    ) {
      // Avoid circular updates by debouncing or checking source
      updateStore({ fovReadMm: readMm, fovPhaseMm: phaseMm, rotationDeg: rotDeg });
    }
  }, [corners, pxPerMm, storeGeometry.fovReadMm, storeGeometry.fovPhaseMm, storeGeometry.rotationDeg, updateStore]);

  // We could also do store -> corners, but that requires knowing the center point.
  // For now, assume corner dragging is the primary driver for rotation/size in the UI.
}
