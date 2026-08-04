/**
 * MRI Planning Engine — Pure geometry calculations
 * 
 * Coordinate system:
 *   X = Right (patient Left→Right)
 *   Y = Anterior (patient Posterior→Anterior)
 *   Z = Superior (patient Inferior→Superior)
 * 
 * All distances in mm.
 */

import type { PlanningObject } from '@/store/workstationStore';
export type Plane = 'coronal' | 'sagittal' | 'axial';

export interface Point2D { x: number; y: number; }
export interface Point3D { x: number; y: number; z: number; }

/** Scale factor: how many mm fits across the viewport */
export const VIEW_FOV_MM = 300;

// ── 3D Math ────────────────────────────────────────────────────────────────

export function rotateX(p: Point3D, deg: number): Point3D {
  const r = deg * Math.PI / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

export function rotateY(p: Point3D, deg: number): Point3D {
  const r = deg * Math.PI / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

export function rotateZ(p: Point3D, deg: number): Point3D {
  const r = deg * Math.PI / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}

/** Apply planning object rotation (rotX=pitch, rotY=yaw, rotZ=roll) */
export function applyPlanningRotation(p: Point3D, plan: PlanningObject): Point3D {
  let q = { ...p };
  q = rotateX(q, plan.rotX);
  q = rotateY(q, plan.rotY);
  q = rotateZ(q, plan.rotZ);
  return q;
}

// ── Projection ─────────────────────────────────────────────────────────────

/**
 * Project a 3D point (in mm) to 2D canvas pixel coordinates.
 * 
 * Axial view    → XY plane (X=right, Y=up)
 * Coronal view  → XZ plane (X=right, Z=up)
 * Sagittal view → YZ plane (Y=right, Z=up... reversed Y for L→R convention)
 */
export function project3Dto2D(p: Point3D, plane: Plane, W: number, H: number): Point2D {
  let nx = 0, ny = 0;
  if (plane === 'axial') {
    nx = p.x; ny = -p.y;  // Y flipped so anterior is up
  } else if (plane === 'coronal') {
    nx = -p.x; ny = -p.z; // X flipped for proper L-R, Z up = Superior
  } else if (plane === 'sagittal') {
    nx = p.y; ny = -p.z;  // Y forward = right, Z up = Superior
  }
  return {
    x: (nx / VIEW_FOV_MM) * Math.min(W, H) + W / 2,
    y: (ny / VIEW_FOV_MM) * Math.min(W, H) + H / 2,
  };
}

/**
 * Unproject 2D pixel delta back to 3D mm delta for a given view plane.
 */
export function unproject2Dto3D(dxPx: number, dyPx: number, plane: Plane, W: number, H: number): Point3D {
  const scale = VIEW_FOV_MM / Math.min(W, H);
  const dxMm = dxPx * scale;
  const dyMm = dyPx * scale;

  if (plane === 'axial')    return { x: dxMm, y: -dyMm, z: 0 };
  if (plane === 'coronal')  return { x: -dxMm, y: 0, z: -dyMm };
  if (plane === 'sagittal') return { x: 0, y: dxMm, z: -dyMm };
  return { x: 0, y: 0, z: 0 };
}

// ── Planning Object Geometry ───────────────────────────────────────────────

/**
 * Get the 4 corners of the central FOV rectangle (slice 0 / center plane)
 * in 3D space.
 */
export function getFovCorners3D(plan: PlanningObject): Point3D[] {
  const hw = plan.fovRead / 2;
  const hh = plan.fovPhase / 2;
  const center = { x: plan.centerX, y: plan.centerY, z: plan.centerZ };

  // Local corners in the plane's own coordinate system
  let localCorners: Point3D[];
  if (plan.orientation === 'axial') {
    localCorners = [
      { x: -hw, y: -hh, z: 0 }, // TL
      { x:  hw, y: -hh, z: 0 }, // TR
      { x:  hw, y:  hh, z: 0 }, // BR
      { x: -hw, y:  hh, z: 0 }, // BL
    ];
  } else if (plan.orientation === 'coronal') {
    localCorners = [
      { x: -hw, y: 0, z:  hh }, // TL
      { x:  hw, y: 0, z:  hh }, // TR
      { x:  hw, y: 0, z: -hh }, // BR
      { x: -hw, y: 0, z: -hh }, // BL
    ];
  } else { // sagittal
    localCorners = [
      { x: 0, y: -hw, z:  hh }, // TL
      { x: 0, y:  hw, z:  hh }, // TR
      { x: 0, y:  hw, z: -hh }, // BR
      { x: 0, y: -hw, z: -hh }, // BL
    ];
  }

  return localCorners.map(lc => {
    const rotated = applyPlanningRotation(lc, plan);
    return { x: rotated.x + center.x, y: rotated.y + center.y, z: rotated.z + center.z };
  });
}

/**
 * Get the normal vector of the FOV plane (points "up" through the stack)
 */
export function getSliceNormal(plan: PlanningObject): Point3D {
  let localNormal: Point3D;
  if (plan.orientation === 'axial')    localNormal = { x: 0, y: 0, z: 1 };
  else if (plan.orientation === 'coronal')  localNormal = { x: 0, y: 1, z: 0 };
  else                                  localNormal = { x: 1, y: 0, z: 0 };

  return applyPlanningRotation(localNormal, plan);
}

/**
 * Total slab depth in mm
 */
export function getSlabDepth(plan: PlanningObject): number {
  const n = plan.sliceCount;
  if (n <= 1) return plan.sliceThickness;
  return n * plan.sliceThickness + (n - 1) * plan.sliceGap;
}

/**
 * Get the 3D center point of each slice.
 * Slices are stacked along the normal vector.
 */
export function getSliceCenters3D(plan: PlanningObject): Point3D[] {
  const n = plan.sliceCount;
  const normal = getSliceNormal(plan);
  const step = plan.sliceThickness + plan.sliceGap;
  const totalDepth = getSlabDepth(plan);
  const startOffset = -(totalDepth - plan.sliceThickness) / 2;

  const centers: Point3D[] = [];
  for (let i = 0; i < n; i++) {
    const offset = startOffset + i * step;
    centers.push({
      x: plan.centerX + normal.x * offset,
      y: plan.centerY + normal.y * offset,
      z: plan.centerZ + normal.z * offset,
    });
  }
  return centers;
}

// ── 2D Handle Calculation ──────────────────────────────────────────────────

export interface Handles2D {
  tl: Point2D; tr: Point2D; br: Point2D; bl: Point2D;
  top: Point2D; bottom: Point2D; left: Point2D; right: Point2D;
  center: Point2D;
  rot: Point2D;    // rotation handle above top-center
}

/**
 * Project the FOV rectangle to 2D handles for the given viewport.
 * Returns null if this viewport is not the "active planning" view.
 */
export function getFovHandles2D(plan: PlanningObject, plane: Plane, W: number, H: number): Handles2D {
  const corners3D = getFovCorners3D(plan);
  const [tl, tr, br, bl] = corners3D.map(c => project3Dto2D(c, plane, W, H)) as [Point2D, Point2D, Point2D, Point2D];

  const top    = { x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 };
  const bottom = { x: (bl.x + br.x) / 2, y: (bl.y + br.y) / 2 };
  const left   = { x: (tl.x + bl.x) / 2, y: (tl.y + bl.y) / 2 };
  const right  = { x: (tr.x + br.x) / 2, y: (tr.y + br.y) / 2 };
  const center = { x: (tl.x + br.x) / 2, y: (tl.y + br.y) / 2 };

  // Rotation handle: extend 40px beyond top-center, perpendicular to top edge
  const dx = top.x - center.x;
  const dy = top.y - center.y;
  const len = Math.hypot(dx, dy);
  const rot = len > 1
    ? { x: top.x + (dx / len) * 38, y: top.y + (dy / len) * 38 }
    : { x: top.x, y: top.y - 38 };

  return { tl, tr, br, bl, top, bottom, left, right, center, rot };
}

// ── Hit Testing ────────────────────────────────────────────────────────────

const HANDLE_RADIUS = 12;
const EDGE_TOLERANCE = 10;

export function hitTestFov(px: number, py: number, handles: Handles2D): string | null {
  // Check rotation handle first (smallest target, on top)
  if (Math.hypot(px - handles.rot.x, py - handles.rot.y) < HANDLE_RADIUS + 2) return 'rotate';

  // Corner handles
  if (Math.hypot(px - handles.tl.x, py - handles.tl.y) < HANDLE_RADIUS) return 'tl';
  if (Math.hypot(px - handles.tr.x, py - handles.tr.y) < HANDLE_RADIUS) return 'tr';
  if (Math.hypot(px - handles.br.x, py - handles.br.y) < HANDLE_RADIUS) return 'br';
  if (Math.hypot(px - handles.bl.x, py - handles.bl.y) < HANDLE_RADIUS) return 'bl';

  // Edge midpoint handles
  if (Math.hypot(px - handles.top.x, py - handles.top.y) < HANDLE_RADIUS) return 'top';
  if (Math.hypot(px - handles.bottom.x, py - handles.bottom.y) < HANDLE_RADIUS) return 'bottom';
  if (Math.hypot(px - handles.left.x, py - handles.left.y) < HANDLE_RADIUS) return 'left';
  if (Math.hypot(px - handles.right.x, py - handles.right.y) < HANDLE_RADIUS) return 'right';

  // Point-in-polygon test for body (move)
  const poly = [handles.tl, handles.tr, handles.br, handles.bl];
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i]!.x, yi = poly[i]!.y;
    const xj = poly[j]!.x, yj = poly[j]!.y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  if (inside) return 'move';

  return null;
}

export interface SlicePolygon {
  corners: [Point2D, Point2D, Point2D, Point2D];
  isCenter: boolean;
}

/**
 * Project all slice planes as 2D polygons representing true slice thickness.
 */
export function projectSlicePolygons(plan: PlanningObject, plane: Plane, W: number, H: number): SlicePolygon[] {
  const sliceCenters = getSliceCenters3D(plan);
  if (sliceCenters.length === 0) return [];

  const fovWidth = plan.fovRead;
  const hw = fovWidth / 2;
  const ht = plan.sliceThickness / 2; // half thickness

  let readDir: Point3D;
  if (plan.orientation === 'axial') {
    readDir = { x: 1, y: 0, z: 0 };
  } else if (plan.orientation === 'coronal') {
    readDir = { x: 1, y: 0, z: 0 };
  } else {
    readDir = { x: 0, y: 1, z: 0 };
  }
  const rotatedReadDir = applyPlanningRotation(readDir, plan);
  const normal = getSliceNormal(plan);

  const polygons: SlicePolygon[] = [];
  const centerIdx = Math.floor(sliceCenters.length / 2);

  for (let i = 0; i < sliceCenters.length; i++) {
    const sc = sliceCenters[i]!;
    
    // The 4 corners of the slice cross-section in 3D:
    const c1: Point3D = {
      x: sc.x - rotatedReadDir.x * hw - normal.x * ht,
      y: sc.y - rotatedReadDir.y * hw - normal.y * ht,
      z: sc.z - rotatedReadDir.z * hw - normal.z * ht,
    };
    const c2: Point3D = {
      x: sc.x + rotatedReadDir.x * hw - normal.x * ht,
      y: sc.y + rotatedReadDir.y * hw - normal.y * ht,
      z: sc.z + rotatedReadDir.z * hw - normal.z * ht,
    };
    const c3: Point3D = {
      x: sc.x + rotatedReadDir.x * hw + normal.x * ht,
      y: sc.y + rotatedReadDir.y * hw + normal.y * ht,
      z: sc.z + rotatedReadDir.z * hw + normal.z * ht,
    };
    const c4: Point3D = {
      x: sc.x - rotatedReadDir.x * hw + normal.x * ht,
      y: sc.y - rotatedReadDir.y * hw + normal.y * ht,
      z: sc.z - rotatedReadDir.z * hw + normal.z * ht,
    };

    polygons.push({
      corners: [
        project3Dto2D(c1, plane, W, H),
        project3Dto2D(c2, plane, W, H),
        project3Dto2D(c3, plane, W, H),
        project3Dto2D(c4, plane, W, H),
      ],
      isCenter: i === centerIdx,
    });
  }

  return polygons;
}

// ── Cursor Mapping ─────────────────────────────────────────────────────────

export const CURSOR_MAP: Record<string, string> = {
  move:   'move',
  rotate: 'grab',
  top:    'ns-resize',
  bottom: 'ns-resize',
  left:   'ew-resize',
  right:  'ew-resize',
  tl:     'nwse-resize',
  br:     'nwse-resize',
  tr:     'nesw-resize',
  bl:     'nesw-resize',
};

// ── Target plane detection ─────────────────────────────────────────────────

/**
 * Get which viewport plane should show the full interactive FOV box.
 * This is determined by the selected sequence's orientation.
 */
export function getPlanningTargetPlane(plan: PlanningObject): Plane {
  return plan.orientation as Plane;
}
