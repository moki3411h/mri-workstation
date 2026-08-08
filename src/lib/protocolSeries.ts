import type { Plane } from '@/lib/geometry';
import type { Sequence } from '@/lib/scanEngine';

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

function imageSeries(
  id: string,
  sequenceId: number,
  name: string,
  plane: Plane,
  frameCount: number,
  sliceThickness: number,
  spacingBetweenSlices: number,
  fps = 8,
): ProtocolImageSeries {
  const frames = frameUrls(id, frameCount);
  return {
    id,
    sequenceId,
    name,
    plane,
    frameCount,
    fps,
    thumbnail: frames[Math.floor(frames.length / 2)]!,
    frames,
    sliceThickness,
    spacingBetweenSlices,
  };
}

const SERIES: ProtocolImageSeries[] = [
  imageSeries('scout-brain', 1, 'SCOUT 3-PLANE', 'axial', 3, 8, 9.6, 3),
  imageSeries('t1-sag', 2, 'T1 SAG DFP', 'sagittal', 23, 5, 6.5),
  imageSeries('t2-cor', 3, 'T2 COR', 'coronal', 28, 5, 6.5),
  imageSeries('t2-tra', 4, 'T2 TRA 512', 'axial', 23, 5, 6.5),
  imageSeries('flair-tra', 5, 'FLAIR TRA', 'axial', 21, 5, 7.5),
  imageSeries('dwi-ax', 7, 'DWI AX + ADC SOURCE', 'axial', 69, 5, 6.5),
  imageSeries('swi-ax', 8, 'SWI AX', 'axial', 60, 2.49, 2.49),
  imageSeries('t1-pre-fs-ax', 9, 'T1 PRE-CONTRAST FS AX', 'axial', 27, 4, 5.2),
  imageSeries('adc-ax', 10, 'ADC MAP AX', 'axial', 23, 5, 6.5),
  imageSeries('t1-tse-ax', 11, 'T1 TSE AX', 'axial', 21, 5, 7.5),
  imageSeries('t1-3d-sag', 12, 'T1 MPRAGE SAG 3D', 'sagittal', 37, 1, 1),
  imageSeries('t1-post-fs-cor', 13, 'T1 POST-CONTRAST FS COR', 'coronal', 29, 3.5, 4.55),
  imageSeries('t1-post-fs-sag', 14, 'T1 POST-CONTRAST FS SAG', 'sagittal', 96, 1.5, 1.5),
];

export const PROTOCOL_SERIES = SERIES;

/** Resolve by queue ID or by a stable series ID carried by catalog sequences. */
export function getProtocolSeries(
  sequenceOrId: number | Pick<Sequence, 'id' | 'name' | 'seriesId'>,
): ProtocolImageSeries | undefined {
  const sequenceId = typeof sequenceOrId === 'number' ? sequenceOrId : sequenceOrId.id;
  const seriesId = typeof sequenceOrId === 'number' ? undefined : sequenceOrId.seriesId;
  const baseSeries = seriesId
    ? SERIES.find(series => series.id === seriesId)
    : SERIES.find(series => series.sequenceId === sequenceId);
  if (!baseSeries) return undefined;
  if (typeof sequenceOrId === 'number') return baseSeries;
  return {
    ...baseSeries,
    sequenceId: sequenceOrId.id,
    name: sequenceOrId.name,
  };
}
