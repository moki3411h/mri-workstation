import { useWorkstationStore } from '@/store/workstationStore';
import {
  type Plane,
  getFovHandles2D,
  getPlanningAngleStatus,
  getSlabDepth,
  projectSlicePolygons,
  PLANNING_COLOR,
  PLANNING_WARNING_COLOR,
} from '@/lib/geometry';

interface Props {
  plane: Plane;
  size: { w: number; h: number };
}

const MAX_VISIBLE_SLICE_LINES = 11;

function visibleSliceIndices(count: number): Set<number> {
  if (count <= MAX_VISIBLE_SLICE_LINES) return new Set(Array.from({ length: count }, (_, index) => index));

  const indices = new Set<number>();
  for (let index = 0; index < MAX_VISIBLE_SLICE_LINES; index += 1) {
    indices.add(Math.round((index / (MAX_VISIBLE_SLICE_LINES - 1)) * (count - 1)));
  }
  indices.add(Math.floor(count / 2));
  return indices;
}

/** Orthogonal slab projection with restrained Siemens-style reference lines. */
export default function ProjectedSlab({ plane, size }: Props) {
  const planning = useWorkstationStore((state) => state.planning);
  const angleStatus = getPlanningAngleStatus(planning);
  const color = angleStatus.isValid ? PLANNING_COLOR : PLANNING_WARNING_COLOR;
  const handles = getFovHandles2D(planning, plane, size.w, size.h, false);
  const slicePolygons = projectSlicePolygons(planning, plane, size.w, size.h);
  const visibleIndices = visibleSliceIndices(slicePolygons.length);
  const boundary = [handles.tl, handles.tr, handles.br, handles.bl]
    .map((point) => `${point.x},${point.y}`)
    .join(' ');

  const visibleLines = slicePolygons.flatMap((slice, index) => {
    if (!visibleIndices.has(index)) return [];
    const [c1, c2, c3, c4] = slice.corners;
    return [{
      index,
      isCenter: slice.isCenter,
      start: { x: (c1.x + c4.x) / 2, y: (c1.y + c4.y) / 2 },
      end: { x: (c2.x + c3.x) / 2, y: (c2.y + c3.y) / 2 },
    }];
  });

  return (
    <svg
      aria-hidden="true"
      data-planning-overlay="projected"
      data-plane={plane}
      data-angle-valid={angleStatus.isValid}
      data-fov-read={planning.fovRead}
      data-slice-count={planning.sliceCount}
      data-slice-thickness={planning.sliceThickness}
      data-slice-gap={planning.sliceGap}
      data-slab-depth={getSlabDepth(planning).toFixed(1)}
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 15, pointerEvents: 'none' }}
    >
      <polygon
        points={boundary}
        fill="none"
        stroke={color}
        strokeWidth="1"
        strokeDasharray="7 5"
        opacity="0.78"
        vectorEffect="non-scaling-stroke"
      />

      {visibleLines.map((line) => (
        <line
          key={line.index}
          x1={line.start.x}
          y1={line.start.y}
          x2={line.end.x}
          y2={line.end.y}
          stroke={color}
          strokeWidth={line.isCenter ? 1.35 : 0.8}
          strokeDasharray={line.isCenter ? undefined : '5 3'}
          opacity={line.isCenter ? 1 : 0.62}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      <circle cx={handles.center.x} cy={handles.center.y} r="3.7" fill="rgba(0,0,0,0.25)" stroke={color} strokeWidth="1.1" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
