import { useWorkstationStore } from '@/store/workstationStore';
import {
  type Plane,
  type Point2D,
  getFovHandles2D,
  getPlanningAngleStatus,
  PLANNING_COLOR,
  PLANNING_WARNING_COLOR,
} from '@/lib/geometry';

interface Props {
  plane: Plane;
  size: { w: number; h: number };
}

function toward(from: Point2D, to: Point2D, distance: number): Point2D {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: from.x + (dx / length) * distance, y: from.y + (dy / length) * distance };
}

/** Thin, low-obstruction planning frame modelled after a Siemens prescription box. */
export default function ActiveFOV({ plane, size }: Props) {
  const planning = useWorkstationStore((state) => state.planning);
  const handles = getFovHandles2D(planning, plane, size.w, size.h, true);
  const angleStatus = getPlanningAngleStatus(planning);
  const color = angleStatus.isValid ? PLANNING_COLOR : PLANNING_WARNING_COLOR;
  const corners = [handles.tl, handles.tr, handles.br, handles.bl];
  const polygon = corners.map((point) => `${point.x},${point.y}`).join(' ');
  const labelX = Math.max(8, Math.min(...corners.map((point) => point.x)) + 7);
  const labelY = Math.max(16, Math.min(...corners.map((point) => point.y)) + 15);

  return (
    <svg
      aria-hidden="true"
      data-planning-overlay="active"
      data-plane={plane}
      data-angle-valid={angleStatus.isValid}
      data-fov-read={planning.fovRead}
      data-fov-phase={planning.fovPhase}
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 20, pointerEvents: 'none' }}
    >
      <polygon
        points={polygon}
        fill={angleStatus.isValid ? 'rgba(216,223,49,0.018)' : 'rgba(255,77,87,0.035)'}
        stroke={color}
        strokeWidth="1.15"
        vectorEffect="non-scaling-stroke"
      />

      {/* Short corner brackets replace the oversized square handles. */}
      {corners.flatMap((corner, index) => {
        const previous = corners[(index + corners.length - 1) % corners.length]!;
        const next = corners[(index + 1) % corners.length]!;
        const towardPrevious = toward(corner, previous, 8);
        const towardNext = toward(corner, next, 8);
        return [
          <line key={`${index}-previous`} x1={corner.x} y1={corner.y} x2={towardPrevious.x} y2={towardPrevious.y} stroke={color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />,
          <line key={`${index}-next`} x1={corner.x} y1={corner.y} x2={towardNext.x} y2={towardNext.y} stroke={color} strokeWidth="2.2" vectorEffect="non-scaling-stroke" />,
        ];
      })}

      {/* Edge points remain easy to acquire without obscuring anatomy. */}
      {[handles.top, handles.right, handles.bottom, handles.left].map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="2.15" fill={color} />
      ))}

      <circle cx={handles.center.x} cy={handles.center.y} r="4.2" fill="rgba(0,0,0,0.28)" stroke={color} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      <circle cx={handles.center.x} cy={handles.center.y} r="0.9" fill={color} />

      {!angleStatus.isValid ? (
        <text x={labelX} y={labelY} fill={color} fontFamily="Roboto Mono, monospace" fontSize="8" fontWeight="700" letterSpacing="0.5">
          ANGLE {angleStatus.deviation.toFixed(1)}° — CORRECT REQUIRED
        </text>
      ) : null}
    </svg>
  );
}
