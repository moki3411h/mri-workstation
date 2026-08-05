import React, { useRef, useCallback, useEffect } from 'react';
import { useWorkstationStore, type PlanningObject } from '@/store/workstationStore';
import { type Plane } from '@/lib/geometry';
import { getPlanningRotationMatrix, localToGlobal3D, globalToScreen2D, type Point2D } from '@/lib/planningMath';

interface Props {
  plane: Plane;
  size: { w: number; h: number };
}

export default function ProjectedSlab({ plane, size }: Props) {
  const planning = useWorkstationStore((s) => s.planning);
  const setPlanning = useWorkstationStore((s) => s.setPlanning);
  const pxPerMm = size.w / 250; // Replace with VIEW_FOV_MM
  
  const dragState = useRef<{ type: string; startX: number; startY: number; initPlan: PlanningObject } | null>(null);

  const hwX = planning.fovRead / 2;
  const hwY = planning.fovPhase / 2;
  const count = planning.sliceCount;
  const stepZ = planning.sliceThickness + planning.sliceGap;
  const totalThickness = count * stepZ;
  const startZ = -totalThickness / 2 + stepZ / 2;

  const matrix = getPlanningRotationMatrix(planning);

  // Determine which local axis to draw as the line
  const px1 = globalToScreen2D(localToGlobal3D({ x: -hwX, y: 0, z: 0 }, planning, matrix), plane, pxPerMm, size.w, size.h);
  const px2 = globalToScreen2D(localToGlobal3D({ x: hwX, y: 0, z: 0 }, planning, matrix), plane, pxPerMm, size.w, size.h);
  const py1 = globalToScreen2D(localToGlobal3D({ x: 0, y: -hwY, z: 0 }, planning, matrix), plane, pxPerMm, size.w, size.h);
  const py2 = globalToScreen2D(localToGlobal3D({ x: 0, y: hwY, z: 0 }, planning, matrix), plane, pxPerMm, size.w, size.h);

  const lenX = Math.hypot(px2.x - px1.x, px2.y - px1.y);
  const lenY = Math.hypot(py2.x - py1.x, py2.y - py1.y);
  
  const lines: { p1: Point2D; p2: Point2D }[] = [];
  for (let i = 0; i < count; i++) {
    const z = startZ + i * stepZ;
    let p1, p2;
    if (lenX > lenY) {
      p1 = globalToScreen2D(localToGlobal3D({ x: -hwX, y: 0, z }, planning, matrix), plane, pxPerMm, size.w, size.h);
      p2 = globalToScreen2D(localToGlobal3D({ x: hwX, y: 0, z }, planning, matrix), plane, pxPerMm, size.w, size.h);
    } else {
      p1 = globalToScreen2D(localToGlobal3D({ x: 0, y: -hwY, z }, planning, matrix), plane, pxPerMm, size.w, size.h);
      p2 = globalToScreen2D(localToGlobal3D({ x: 0, y: hwY, z }, planning, matrix), plane, pxPerMm, size.w, size.h);
    }
    lines.push({ p1, p2 });
  }

  // Also project the center normal for rotation reference
  const centerScreen = globalToScreen2D(localToGlobal3D({ x: 0, y: 0, z: 0 }, planning, matrix), plane, pxPerMm, size.w, size.h);

  const handlePointerDown = (e: React.PointerEvent<SVGElement>) => {
    e.stopPropagation();
    (e.target as SVGElement).setPointerCapture(e.pointerId);
    // If shift key or near edge, maybe rotate, otherwise translate
    const type = e.shiftKey ? 'rotate' : 'translate';
    dragState.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      initPlan: { ...planning },
    };
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.current) return;
    const { type, startX, startY, initPlan } = dragState.current;
    
    const dxPx = e.clientX - startX;
    const dyPx = e.clientY - startY;
    const dxMm = dxPx / pxPerMm;
    const dyMm = dyPx / pxPerMm;

    if (type === 'translate') {
      let dX = 0, dY = 0, dZ = 0;
      if (plane === 'axial') { dX = dxMm; dY = dyMm; }
      else if (plane === 'coronal') { dX = dxMm; dZ = dyMm; }
      else if (plane === 'sagittal') { dY = dxMm; dZ = dyMm; }
      
      setPlanning({
        centerX: initPlan.centerX + dX,
        centerY: initPlan.centerY + dY,
        centerZ: initPlan.centerZ + dZ,
      });
    } else if (type === 'rotate') {
       // Oblique rotation logic
       const startAngle = Math.atan2(startY - centerScreen.y, startX - centerScreen.x);
       const currAngle = Math.atan2(e.clientY - centerScreen.y, e.clientX - centerScreen.x);
       const dTheta = (currAngle - startAngle) * (180 / Math.PI);
       
       if (plane === 'axial') setPlanning({ rotZ: initPlan.rotZ + dTheta });
       else if (plane === 'coronal') setPlanning({ rotY: initPlan.rotY + dTheta });
       else if (plane === 'sagittal') setPlanning({ rotX: initPlan.rotX + dTheta });
    }
  }, [plane, pxPerMm, centerScreen.x, centerScreen.y, setPlanning]);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    dragState.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 15 }}>
      {/* Invisible hit target for the whole slab */}
      <polygon 
        points={
          lines.length > 0 
            ? `${lines[0].p1.x},${lines[0].p1.y} ${lines[0].p2.x},${lines[0].p2.y} ${lines[lines.length-1].p2.x},${lines[lines.length-1].p2.y} ${lines[lines.length-1].p1.x},${lines[lines.length-1].p1.y}`
            : ""
        }
        fill="transparent"
        cursor="move"
        onPointerDown={handlePointerDown}
      />
      {/* Slice Lines */}
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.p1.x} y1={l.p1.y}
          x2={l.p2.x} y2={l.p2.y}
          stroke="#FFFF00"
          strokeWidth={1}
          strokeDasharray="4 2"
          pointerEvents="none"
        />
      ))}
    </svg>
  );
}
