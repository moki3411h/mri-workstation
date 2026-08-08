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

/** MRI Pro planning colours and protocol angle tolerance. */
export const PLANNING_COLOR = '#d8df31';
export const PLANNING_WARNING_COLOR = '#ff4d57';
export const MAX_PLANNING_ANGLE_DEG = 12;

export interface PlanningAngleStatus {
  isValid: boolean;
  deviation: number;
  tolerance: number;
  label: string;
}

function normalizeAngle(angle: number): number {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

/**
 * Checks whether the prescription remains inside the teaching protocol's
 * allowable obliquity. All three rotation controls participate so the same
 * warning is shown no matter which viewport was used to tilt the slab.
 */
export function getPlanningAngleStatus(plan: PlanningObject): PlanningAngleStatus {
  const deviation = Math.max(
    Math.abs(normalizeAngle(plan.rotX)),
    Math.abs(normalizeAngle(plan.rotY)),
    Math.abs(normalizeAngle(plan.rotZ)),
  );
  const isValid = deviation <= MAX_PLANNING_ANGLE_DEG;

  return {
    isValid,
    deviation,
    tolerance: MAX_PLANNING_ANGLE_DEG,
    label: isValid ? 'ANGLE OK' : 'ANGLE OUT OF RANGE',
  };
}

// ── 3x3 Matrix Math ────────────────────────────────────────────────────────
export type Matrix3x3 = [
  number, number, number,
  number, number, number,
  number, number, number
];

export const IDENTITY_MATRIX: Matrix3x3 = [
  1, 0, 0,
  0, 1, 0,
  0, 0, 1
];

export function multiplyMatrixAndPoint(m: Matrix3x3, p: Point3D): Point3D {
  return {
    x: m[0]*p.x + m[1]*p.y + m[2]*p.z,
    y: m[3]*p.x + m[4]*p.y + m[5]*p.z,
    z: m[6]*p.x + m[7]*p.y + m[8]*p.z,
  };
}

export function multiplyMatrices(a: Matrix3x3, b: Matrix3x3): Matrix3x3 {
  return [
    a[0]*b[0] + a[1]*b[3] + a[2]*b[6],  a[0]*b[1] + a[1]*b[4] + a[2]*b[7],  a[0]*b[2] + a[1]*b[5] + a[2]*b[8],
    a[3]*b[0] + a[4]*b[3] + a[5]*b[6],  a[3]*b[1] + a[4]*b[4] + a[5]*b[7],  a[3]*b[2] + a[4]*b[5] + a[5]*b[8],
    a[6]*b[0] + a[7]*b[3] + a[8]*b[6],  a[6]*b[1] + a[7]*b[4] + a[8]*b[7],  a[6]*b[2] + a[7]*b[5] + a[8]*b[8],
  ];
}

/** Create rotation matrix from axis and angle (in degrees) */
export function axisAngleToMatrix(axis: Point3D, angleDeg: number): Matrix3x3 {
  const rad = angleDeg * Math.PI / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const t = 1 - c;
  const x = axis.x, y = axis.y, z = axis.z;
  
  return [
    t*x*x + c,    t*x*y - z*s,  t*x*z + y*s,
    t*x*y + z*s,  t*y*y + c,    t*y*z - x*s,
    t*x*z - y*s,  t*y*z + x*s,  t*z*z + c
  ];
}

export function eulerToMatrix(rotX: number, rotY: number, rotZ: number): Matrix3x3 {
  const cx = Math.cos(rotX * Math.PI / 180), sx = Math.sin(rotX * Math.PI / 180);
  const cy = Math.cos(rotY * Math.PI / 180), sy = Math.sin(rotY * Math.PI / 180);
  const cz = Math.cos(rotZ * Math.PI / 180), sz = Math.sin(rotZ * Math.PI / 180);
  return [
    cy*cz, cz*sx*sy - cx*sz, cx*cz*sy + sx*sz,
    cy*sz, cx*cz + sx*sy*sz, cx*sy*sz - cz*sx,
    -sy,   cy*sx,            cx*cy
  ];
}

export function matrixToEuler(m: Matrix3x3): { rotX: number; rotY: number; rotZ: number } {
  let rotX, rotY, rotZ;
  if (m[6] < 1) {
    if (m[6] > -1) {
      rotY = Math.asin(-m[6]);
      rotZ = Math.atan2(m[3], m[0]);
      rotX = Math.atan2(m[7], m[8]);
    } else {
      rotY = Math.PI / 2;
      rotZ = -Math.atan2(-m[5], m[4]);
      rotX = 0;
    }
  } else {
    rotY = -Math.PI / 2;
    rotZ = Math.atan2(-m[5], m[4]);
    rotX = 0;
  }
  return {
    rotX: rotX * 180 / Math.PI,
    rotY: rotY * 180 / Math.PI,
    rotZ: rotZ * 180 / Math.PI
  };
}

/** Apply planning object rotation matrix */
export function applyPlanningRotation(p: Point3D, plan: PlanningObject): Point3D {
  return multiplyMatrixAndPoint(plan.rotationMatrix as Matrix3x3, p);
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

function getInPlaneAxes(plan: PlanningObject): {
  read: Point3D;
  phase: Point3D;
} {
  if (plan.orientation === 'axial') {
    return { read: { x: 1, y: 0, z: 0 }, phase: { x: 0, y: 1, z: 0 } };
  }
  if (plan.orientation === 'coronal') {
    return { read: { x: 1, y: 0, z: 0 }, phase: { x: 0, y: 0, z: 1 } };
  }
  return { read: { x: 0, y: 1, z: 0 }, phase: { x: 0, y: 0, z: 1 } };
}

/** Select the FoV axis that is visible edge-on in an orthogonal viewport. */
function getProjectedInPlaneAxis(plan: PlanningObject, plane: Plane, W: number, H: number): {
  direction: Point3D;
  span: number;
} {
  const axes = getInPlaneAxes(plan);
  const read = applyPlanningRotation(axes.read, plan);
  const phase = applyPlanningRotation(axes.phase, plan);
  const origin = project3Dto2D({ x: 0, y: 0, z: 0 }, plane, W, H);
  const projectedRead = project3Dto2D(read, plane, W, H);
  const projectedPhase = project3Dto2D(phase, plane, W, H);
  const readLength = Math.hypot(projectedRead.x - origin.x, projectedRead.y - origin.y) * plan.fovRead;
  const phaseLength = Math.hypot(projectedPhase.x - origin.x, projectedPhase.y - origin.y) * plan.fovPhase;

  return readLength >= phaseLength
    ? { direction: read, span: plan.fovRead }
    : { direction: phase, span: plan.fovPhase };
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
 * For the active view, projects the FoV Read x Phase plane.
 * For projected views, projects the FoV Read x Slab Depth profile.
 */
export function getFovHandles2D(plan: PlanningObject, plane: Plane, W: number, H: number, isActive: boolean): Handles2D {
  if (isActive) {
    const corners3D = getFovCorners3D(plan);
    const [tl, tr, br, bl] = corners3D.map(c => project3Dto2D(c, plane, W, H)) as [Point2D, Point2D, Point2D, Point2D];
    return computeHandlesFromQuad([tl, tr, br, bl]);
  } else {
    const center = { x: plan.centerX, y: plan.centerY, z: plan.centerZ };
    const projectedAxis = getProjectedInPlaneAxis(plan, plane, W, H);
    const readDir = projectedAxis.direction;
    const normalDir = getSliceNormal(plan);

    const hw = projectedAxis.span / 2;
    const hd = getSlabDepth(plan) / 2;
    
    // Top-left is positive normal, negative read
    const c1 = { x: center.x - readDir.x*hw + normalDir.x*hd, y: center.y - readDir.y*hw + normalDir.y*hd, z: center.z - readDir.z*hw + normalDir.z*hd };
    const c2 = { x: center.x + readDir.x*hw + normalDir.x*hd, y: center.y + readDir.y*hw + normalDir.y*hd, z: center.z + readDir.z*hw + normalDir.z*hd };
    const c3 = { x: center.x + readDir.x*hw - normalDir.x*hd, y: center.y + readDir.y*hw - normalDir.y*hd, z: center.z + readDir.z*hw - normalDir.z*hd };
    const c4 = { x: center.x - readDir.x*hw - normalDir.x*hd, y: center.y - readDir.y*hw - normalDir.y*hd, z: center.z - readDir.z*hw - normalDir.z*hd };
    
    const [tl, tr, br, bl] = [c1, c2, c3, c4].map(c => project3Dto2D(c, plane, W, H)) as [Point2D, Point2D, Point2D, Point2D];
    return computeHandlesFromQuad([tl, tr, br, bl]);
  }
}

function computeHandlesFromQuad(corners: [Point2D, Point2D, Point2D, Point2D]): Handles2D {
  const [tl, tr, br, bl] = corners;
  const top    = { x: (tl.x + tr.x) / 2, y: (tl.y + tr.y) / 2 };
  const bottom = { x: (bl.x + br.x) / 2, y: (bl.y + br.y) / 2 };
  const left   = { x: (tl.x + bl.x) / 2, y: (tl.y + bl.y) / 2 };
  const right  = { x: (tr.x + br.x) / 2, y: (tr.y + br.y) / 2 };
  const center = { x: (tl.x + br.x) / 2, y: (tl.y + br.y) / 2 };

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

export function hitTestFov(px: number, py: number, handles: Handles2D): string | null {
  // MRI Pro rotation affordance: hover just outside any corner. The
  // zone stays invisible so the prescription is not covered by UI chrome.
  const corners = [handles.tl, handles.tr, handles.br, handles.bl];
  for (const corner of corners) {
    const distance = Math.hypot(px - corner.x, py - corner.y);
    if (distance > HANDLE_RADIUS && distance < HANDLE_RADIUS + 15) return 'rotate';
  }

  if (Math.hypot(px - handles.tl.x, py - handles.tl.y) < HANDLE_RADIUS) return 'tl';
  if (Math.hypot(px - handles.tr.x, py - handles.tr.y) < HANDLE_RADIUS) return 'tr';
  if (Math.hypot(px - handles.br.x, py - handles.br.y) < HANDLE_RADIUS) return 'br';
  if (Math.hypot(px - handles.bl.x, py - handles.bl.y) < HANDLE_RADIUS) return 'bl';

  if (Math.hypot(px - handles.top.x, py - handles.top.y) < HANDLE_RADIUS) return 'top';
  if (Math.hypot(px - handles.bottom.x, py - handles.bottom.y) < HANDLE_RADIUS) return 'bottom';
  if (Math.hypot(px - handles.left.x, py - handles.left.y) < HANDLE_RADIUS) return 'left';
  if (Math.hypot(px - handles.right.x, py - handles.right.y) < HANDLE_RADIUS) return 'right';

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

  const projectedAxis = getProjectedInPlaneAxis(plan, plane, W, H);
  const fovWidth = projectedAxis.span;
  const hw = fovWidth / 2;
  const ht = plan.sliceThickness / 2; // half thickness
  const rotatedReadDir = projectedAxis.direction;
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
