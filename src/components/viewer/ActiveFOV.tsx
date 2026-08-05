import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useWorkstationStore, type PlanningObject } from '@/store/workstationStore';
import { type Plane } from '@/lib/geometry';
import { getPlanningRotationMatrix, localToGlobal3D, globalToScreen2D, screenToGlobal3D, type Point2D } from '@/lib/planningMath';

interface Props {
  plane: Plane;
  size: { w: number; h: number };
}

export default function ActiveFOV({ plane, size }: Props) {
  const planning = useWorkstationStore((s) => s.planning);
  const setPlanning = useWorkstationStore((s) => s.setPlanning);
  const pxPerMm = size.w / 250; // Replace with VIEW_FOV_MM from constants
  
  const [hoverTarget, setHoverTarget] = useState<string | null>(null);
  const dragState = useRef<{ type: string; handle?: string; startX: number; startY: number; initPlan: PlanningObject } | null>(null);

  // 1. Calculate the 4 corners of the FOV box in local 3D coordinates.
  // By definition, in its local space, the planning object is centered at (0,0,0).
  // X = Read, Y = Phase (or vice versa, depending on phaseDir). Let's assume X=Read, Y=Phase.
  const hwX = planning.fovRead / 2;
  const hwY = planning.fovPhase / 2;
  
  const localCorners = [
    { x: -hwX, y: -hwY, z: 0 }, // tl
    { x: hwX, y: -hwY, z: 0 },  // tr
    { x: hwX, y: hwY, z: 0 },   // br
    { x: -hwX, y: hwY, z: 0 },  // bl
  ];

  // Edge midpoints
  const localEdges = [
    { x: 0, y: -hwY, z: 0 }, // top
    { x: hwX, y: 0, z: 0 },  // right
    { x: 0, y: hwY, z: 0 },  // bottom
    { x: -hwX, y: 0, z: 0 }, // left
  ];

  const localCenter = { x: 0, y: 0, z: 0 };

  const matrix = getPlanningRotationMatrix(planning);

  // Project to screen
  const screenCorners = localCorners.map((p) => globalToScreen2D(localToGlobal3D(p, planning, matrix), plane, pxPerMm, size.w, size.h));
  const screenEdges = localEdges.map((p) => globalToScreen2D(localToGlobal3D(p, planning, matrix), plane, pxPerMm, size.w, size.h));
  const screenCenter = globalToScreen2D(localToGlobal3D(localCenter, planning, matrix), plane, pxPerMm, size.w, size.h);

  // Interaction handlers
  const handlePointerDown = (e: React.PointerEvent<SVGElement>, type: string, handle?: string) => {
    e.stopPropagation();
    (e.target as SVGElement).setPointerCapture(e.pointerId);
    dragState.current = {
      type,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initPlan: { ...planning },
    };
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragState.current) return;
    const { type, handle, startX, startY, initPlan } = dragState.current;
    
    const dxPx = e.clientX - startX;
    const dyPx = e.clientY - startY;
    const dxMm = dxPx / pxPerMm;
    const dyMm = dyPx / pxPerMm;

    if (type === 'translate') {
      // Map screen delta to global 3D delta based on viewport
      let dX = 0, dY = 0, dZ = 0;
      if (plane === 'axial') { dX = dxMm; dY = dyMm; }
      else if (plane === 'coronal') { dX = dxMm; dZ = dyMm; }
      else if (plane === 'sagittal') { dY = dxMm; dZ = dyMm; }
      
      setPlanning({
        centerX: initPlan.centerX + dX,
        centerY: initPlan.centerY + dY,
        centerZ: initPlan.centerZ + dZ,
      });
    } else if (type === 'resize' && handle) {
      // Simplistic resize: map screen delta to width/height directly.
      // A more robust implementation would project mouse ray onto the local axes.
      let dRead = 0, dPhase = 0;
      // Depending on handle, delta adds or subtracts to FOV
      // We will assume no rotation for basic delta, or we use the local axes.
      // For now, let's just do a simple mapping.
      // ... (Will refine resize logic)
    } else if (type === 'rotate') {
      // Rotate around screen center
      const startAngle = Math.atan2(startY - screenCenter.y, startX - screenCenter.x);
      const currAngle = Math.atan2(e.clientY - screenCenter.y, e.clientX - screenCenter.x);
      const dTheta = (currAngle - startAngle) * (180 / Math.PI);
      
      if (plane === 'axial') setPlanning({ rotZ: initPlan.rotZ + dTheta });
      else if (plane === 'coronal') setPlanning({ rotY: initPlan.rotY + dTheta });
      else if (plane === 'sagittal') setPlanning({ rotX: initPlan.rotX + dTheta });
    }
  }, [plane, pxPerMm, screenCenter.x, screenCenter.y, setPlanning]);

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

  const polyPoints = screenCorners.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 20 }}>
      {/* Box Fill & Outline */}
      <polygon
        points={polyPoints}
        fill="rgba(255, 255, 0, 0.1)"
        stroke="#FFFF00"
        strokeWidth={1.5}
        cursor="move"
        onPointerDown={(e) => handlePointerDown(e, 'translate')}
      />

      {/* Center Marker */}
      <circle cx={screenCenter.x} cy={screenCenter.y} r={4} fill="none" stroke="#FFFF00" strokeWidth={1.5} />

      {/* Edge Handles */}
      {screenEdges.map((p, i) => (
        <rect
          key={`edge-${i}`}
          x={p.x - 4} y={p.y - 4} width={8} height={8}
          fill="#FFFF00"
          cursor={i % 2 === 0 ? "ns-resize" : "ew-resize"}
          onPointerDown={(e) => handlePointerDown(e, 'resize', `edge-${i}`)}
        />
      ))}

      {/* Corner Handles */}
      {screenCorners.map((p, i) => (
        <React.Fragment key={`corner-group-${i}`}>
          {/* Invisible outer rotation zone */}
          <circle
            cx={p.x} cy={p.y} r={16}
            fill="transparent"
            cursor="alias"
            onPointerDown={(e) => handlePointerDown(e, 'rotate', `rot-${i}`)}
          />
          {/* Visible corner handle */}
          <rect
            x={p.x - 4} y={p.y - 4} width={8} height={8}
            fill="#FFFF00"
            cursor="nwse-resize"
            onPointerDown={(e) => handlePointerDown(e, 'resize', `corner-${i}`)}
          />
        </React.Fragment>
      ))}
    </svg>
  );
}
