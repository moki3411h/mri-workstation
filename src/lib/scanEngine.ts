// MRI Scan Engine — Protocol sequences and TA calculation

export type ScanStatus = 'done' | 'active' | 'scanning' | 'pending';

export interface Sequence {
  id:         number;
  name:       string;
  ta:         string;    // 'MM:SS' formatted
  sl:         number;    // slices
  tr:         number;    // ms
  te:         number;    // ms
  ti:         number;    // ms (Inversion Time, 0 if N/A)
  flipAngle:  number;    // degrees
  sarPct:     number;    // SAR percentage (simulated)
  description:string;
  status:     ScanStatus;
}

export interface TAParams {
  slices:       number;
  tr:           number;
  te:           number;
  averages:     number;
  concatenations:number;
  turboFactor:  number;
  matrix:       number;
  fovPhase:     number; // percentage
  partialFourier: string; // e.g., 'Off', '7/8', '6/8', '5/8', 'Half'
  parallelImaging:string; // e.g., 'Off', 'Acceleration ×2', 'Acceleration ×3'
  phaseEncoding:  string; // 'AP', 'RL', 'HF'
}

export function calculateTA(p: TAParams): number {
  // Phase matrix based on FOV Phase %
  let phaseMatrix = p.matrix * (p.fovPhase / 100);

  // Partial Fourier
  let pfFactor = 1.0;
  if (p.partialFourier === '7/8') pfFactor = 7/8;
  if (p.partialFourier === '6/8') pfFactor = 6/8;
  if (p.partialFourier === '5/8') pfFactor = 5/8;
  if (p.partialFourier === 'Half') pfFactor = 0.5;

  phaseMatrix *= pfFactor;

  // Parallel Imaging (Acceleration Factor)
  let accel = 1.0;
  if (p.parallelImaging.includes('×2')) accel = 2.0;
  if (p.parallelImaging.includes('×3')) accel = 3.0;
  if (p.parallelImaging.includes('×4')) accel = 4.0;

  phaseMatrix /= accel;

  // Simulated concatenations limit
  // A typical TR can only hold a certain number of slices depending on TE
  // E.g., Max Slices = TR / (TE + overhead)
  const overhead = 15; // ms
  const maxSlicesPerTR = Math.max(1, Math.floor(p.tr / (p.te + overhead)));
  const simConcatenations = Math.ceil(p.slices / maxSlicesPerTR);

  // Use the larger of user-defined concatenations or simulated limit
  const finalConcat = Math.max(p.concatenations || 1, simConcatenations);

  const phaseLines = Math.ceil(phaseMatrix / Math.max(1, p.turboFactor));
  
  // TA in seconds
  const taSeconds = (p.tr / 1000) * phaseLines * p.averages * finalConcat;
  
  return Math.ceil(taSeconds);
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}



export const SEQUENCES: Sequence[] = [
  {
    id:1, name:'Scout',
    ta:'00:18', sl:3,   tr:20,   te:5,   ti:0,  flipAngle:25, sarPct:12,
    description:'3-plane localizer for head orientation and FOV planning.',
    status:'active',
  },
  {
    id:2, name:'T1 SAG DFP',
    ta:'00:32', sl:23,  tr:542,  te:11,  ti:0,  flipAngle:150, sarPct:55,
    description:'T1-weighted sagittal — anatomy, midline structures, corpus callosum.',
    status:'pending',
  },
  {
    id:3, name:'T2 COR',
    ta:'00:42', sl:28,  tr:5500, te:99,  ti:0,  flipAngle:150, sarPct:48,
    description:'T2-weighted coronal — hippocampi, temporal lobes, cortex.',
    status:'pending',
  },
  {
    id:4, name:'T2 TRA 512',
    ta:'00:48', sl:23,  tr:5000, te:102, ti:0,  flipAngle:150, sarPct:62,
    description:'T2-weighted axial high-resolution 512 matrix — posterior fossa, brainstem.',
    status:'pending',
  },
  {
    id:5, name:'FLAIR TRA',
    ta:'00:55', sl:21,  tr:9000, te:90,  ti:2500, flipAngle:150, sarPct:71,
    description:'T2 FLAIR axial — CSF nulled, periventricular lesions, MS plaques.',
    status:'pending',
  },
  {
    id:6, name:'FLAIR SAG',
    ta:'00:58', sl:19,  tr:9000, te:90,  ti:2500, flipAngle:150, sarPct:69,
    description:'T2 FLAIR sagittal — juxtacortical and callosal lesions.',
    status:'pending',
  },
  {
    id:7, name:'DWI TRA',
    ta:'00:38', sl:30,  tr:4600, te:83,  ti:0,  flipAngle:90, sarPct:35,
    description:'Diffusion Weighted Imaging — b0/b1000, ADC map derived inline.',
    status:'pending',
  },
  {
    id:8, name:'SWI TRA',
    ta:'00:52', sl:64,  tr:27,   te:20,  ti:0,  flipAngle:15, sarPct:18,
    description:'Susceptibility Weighted Imaging — microbleeds, venous structures, iron.',
    status:'pending',
  },
  {
    id:9, name:'T1 POST CONTRAST TRA',
    ta:'00:45', sl:30,  tr:563,  te:11,  ti:0,  flipAngle:90, sarPct:58,
    description:'T1 post-Gd axial — blood-brain barrier enhancement, tumor margins.',
    status:'pending',
  },
];
