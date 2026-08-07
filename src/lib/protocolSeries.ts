import type { Plane } from '@/lib/geometry';

export const PROTOCOL_SERIES_MIME = 'application/x-mri-protocol-series';

export interface ProtocolImageSeries {
  id: string;
  sequenceId: number;
  name: string;
  plane: Plane;
  frameCount: number;
  fps: number;
  thumbnail: string;
  frames: string[];
  sliceThickness: number;
  spacingBetweenSlices: number;
}

function frameUrls(id: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `/protocol-series/${id}/frame-${String(index + 1).padStart(3, '0')}.webp`,
  );
}

const SERIES: ProtocolImageSeries[] = [
  {
    id: 't1-sag',
    sequenceId: 2,
    name: 'T1 SAG DFP',
    plane: 'sagittal',
    frameCount: 23,
    fps: 8,
    thumbnail: '/protocol-series/t1-sag/frame-012.webp',
    frames: frameUrls('t1-sag', 23),
    sliceThickness: 5,
    spacingBetweenSlices: 6.5,
  },
  {
    id: 't2-cor',
    sequenceId: 3,
    name: 'T2 COR',
    plane: 'coronal',
    frameCount: 28,
    fps: 8,
    thumbnail: '/protocol-series/t2-cor/frame-015.webp',
    frames: frameUrls('t2-cor', 28),
    sliceThickness: 5,
    spacingBetweenSlices: 6.5,
  },
  {
    id: 't2-tra',
    sequenceId: 4,
    name: 'T2 TRA 512',
    plane: 'axial',
    frameCount: 23,
    fps: 8,
    thumbnail: '/protocol-series/t2-tra/frame-012.webp',
    frames: frameUrls('t2-tra', 23),
    sliceThickness: 5,
    spacingBetweenSlices: 6.5,
  },
  {
    id: 'flair-tra',
    sequenceId: 5,
    name: 'FLAIR TRA',
    plane: 'axial',
    frameCount: 21,
    fps: 8,
    thumbnail: '/protocol-series/flair-tra/frame-011.webp',
    frames: frameUrls('flair-tra', 21),
    sliceThickness: 5,
    spacingBetweenSlices: 7.5,
  },
];

export const PROTOCOL_SERIES = SERIES;

export function getProtocolSeries(sequenceId: number): ProtocolImageSeries | undefined {
  return SERIES.find(series => series.sequenceId === sequenceId);
}
