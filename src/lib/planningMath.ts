import type { PlanningObject } from '@/store/workstationStore';
import { type Plane } from './geometry';

export interface Point2D { x: number; y: number; }
export interface Point3D { x: number; y: number; z: number; }

/**
 * Gets the total 3D rotation matrix for a planning object.
 * Applies the base orientation rotation, then the user's XYZ rotations.
 */
export function getPlanningRotationMatrix(plan: PlanningObject): number[] {
  // Base orientation matrices align the local Z axis (slice normal)
  // to the corresponding global axis.
  // Global axes: X = Left/Right, Y = Anterior/Posterior, Z = Superior/Inferior
  let base = [1, 0, 0,  0, 1, 0,  0, 0, 1]; // Axial (Z normal)
  if (plan.orientation === 'coronal') {
    // Coronal (Y normal) - rotate 90 around X
    base = [
      1, 0, 0,
      0, 0, -1,
      0, 1, 0
    ];
  } else if (plan.orientation === 'sagittal') {
    // Sagittal (X normal) - rotate 90 around Y
    base = [
      0, 0, 1,
      0, 1, 0,
      -1, 0, 0
    ];
  }

  const rx = plan.rotX * Math.PI / 180;
  const ry = plan.rotY * Math.PI / 180;
  const rz = plan.rotZ * Math.PI / 180;

  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  // Rotation matrices (intrinsic Z-Y-X)
  const mX = [1, 0, 0,  0, cx, -sx,  0, sx, cx];
  const mY = [cy, 0, sy,  0, 1, 0,  -sy, 0, cy];
  const mZ = [cz, -sz, 0,  sz, cz, 0,  0, 0, 1];

  const multiply = (a: number[], b: number[]) => [
    a[0]*b[0]+a[1]*b[3]+a[2]*b[6], a[0]*b[1]+a[1]*b[4]+a[2]*b[7], a[0]*b[2]+a[1]*b[5]+a[2]*b[8],
    a[3]*b[0]+a[4]*b[3]+a[5]*b[6], a[3]*b[1]+a[4]*b[4]+a[5]*b[7], a[3]*b[2]+a[4]*b[5]+a[5]*b[8],
    a[6]*b[0]+a[7]*b[3]+a[8]*b[6], a[6]*b[1]+a[7]*b[4]+a[8]*b[7], a[6]*b[2]+a[7]*b[5]+a[8]*b[8],
  ];

  return multiply(mZ, multiply(mY, multiply(mX, base)));
}

/**
 * Transforms a local 3D coordinate (relative to the slab center) into a global 3D coordinate.
 */
export function localToGlobal3D(local: Point3D, plan: PlanningObject, matrix: number[]): Point3D {
  return {
    x: plan.centerX + matrix[0] * local.x + matrix[1] * local.y + matrix[2] * local.z,
    y: plan.centerY + matrix[3] * local.x + matrix[4] * local.y + matrix[5] * local.z,
    z: plan.centerZ + matrix[6] * local.x + matrix[7] * local.y + matrix[8] * local.z,
  };
}

/**
 * Projects a global 3D coordinate into a specific 2D viewport (screen coordinates).
 */
export function globalToScreen2D(global: Point3D, viewport: Plane, pxPerMm: number, screenW: number, screenH: number): Point2D {
  const cx = screenW / 2;
  const cy = screenH / 2;

  // Assuming standard radiologic view mappings:
  // Axial: X -> screenX, Y -> screenY
  // Coronal: X -> screenX, Z -> screenY
  // Sagittal: Y -> screenX, Z -> screenY
  if (viewport === 'axial') {
    return { x: cx + global.x * pxPerMm, y: cy + global.y * pxPerMm };
  }
  if (viewport === 'coronal') {
    return { x: cx + global.x * pxPerMm, y: cy + global.z * pxPerMm };
  }
  if (viewport === 'sagittal') {
    return { x: cx + global.y * pxPerMm, y: cy + global.z * pxPerMm };
  }
  return { x: cx, y: cy };
}

/**
 * Inverse transforms a 2D screen coordinate back into global 3D space, assuming a Z=0 depth for that viewport.
 */
export function screenToGlobal3D(screen: Point2D, viewport: Plane, pxPerMm: number, screenW: number, screenH: number): Point3D {
  const cx = screenW / 2;
  const cy = screenH / 2;
  const u = (screen.x - cx) / pxPerMm;
  const v = (screen.y - cy) / pxPerMm;

  if (viewport === 'axial') {
    return { x: u, y: v, z: 0 };
  }
  if (viewport === 'coronal') {
    return { x: u, y: 0, z: v };
  }
  if (viewport === 'sagittal') {
    return { x: 0, y: u, z: v };
  }
  return { x: 0, y: 0, z: 0 };
}
