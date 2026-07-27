// MRI Physics Calculations — Educational model

export interface SNRParams {
  tr: number;          // ms
  te: number;          // ms
  sliceThickness: number; // mm
  nex: number;         // averages
  fov: number;         // mm
  matrix: number;      // base resolution
}

export interface ArtifactWarning {
  type:        string;
  description: string;
  severity:    'high' | 'medium' | 'low';
}

export function calcSNR(p: SNRParams): number {
  // Educational SNR estimation based on Ernst angle / signal model
  const T1_brain = 900; // ms at 1.5T
  const T2_brain = 90;  // ms at 1.5T
  const B0_factor = 1.0; // 1.5T baseline

  const recovery = 1 - Math.exp(-p.tr / T1_brain);
  const decay    = Math.exp(-p.te / T2_brain);
  const voxelVol = (p.fov / p.matrix) * (p.fov / p.matrix) * p.sliceThickness;
  const nexBonus = Math.sqrt(p.nex);

  const raw = B0_factor * recovery * decay * voxelVol * nexBonus;
  const snr = Math.round(raw * 1.8); // scale to realistic range
  return Math.max(1, Math.min(150, snr));
}

export function snrLabel(snr: number): string {
  if (snr >= 60) return 'High — Diagnostic Quality';
  if (snr >= 30) return 'Medium — Acceptable';
  if (snr >= 15) return 'Low — Suboptimal';
  return 'Very Low — Non-diagnostic';
}

export function getContrastType(tr: number, te: number, ti = 0, isFlair = false): string {
  if (isFlair || (tr > 7000 && te > 80 && ti > 1000)) return 'T2 FLAIR';
  if (tr < 800  && te < 30)  return 'T1-weighted';
  if (tr > 2000 && te > 80)  return 'T2-weighted';
  if (tr > 2000 && te < 40)  return 'PD-weighted';
  if (tr < 50   && te < 5)   return 'TOF / GRE';
  if (tr < 800  && te > 40)  return 'T2* GRE';
  return 'Mixed';
}

export function calcResolution(fov: number, matrix: number, thickness: number): [number, number, number] {
  const inplane = parseFloat((fov / matrix).toFixed(2));
  return [inplane, inplane, thickness];
}

// Re-export from scanEngine for use in PhysicsPanel
export { calculateTA, formatTime } from '@/lib/scanEngine';

export interface ArtifactParams {
  fov:            number;
  matrix:         number;
  tr:             number;
  te:             number;
  bandwidth:      number;
  phaseEncoding:  string;
  sliceThickness: number;
}

export function getArtifactWarnings(p: ArtifactParams): ArtifactWarning[] {
  const warnings: ArtifactWarning[] = [];

  if (p.fov < 180)
    warnings.push({ type:'Aliasing (Wrap)', description:'FOV may be smaller than patient anatomy → wrap-around artifact in phase direction.', severity:'high' });

  if (p.bandwidth < 80)
    warnings.push({ type:'Chemical Shift', description:'Low bandwidth increases chemical shift artifact at fat-water interfaces. Consider fat saturation.', severity:'medium' });

  if (p.te > 120)
    warnings.push({ type:'T2 Signal Loss', description:'Very long TE causes significant T2 decay and SNR loss, especially in tissues with short T2.', severity:'medium' });

  if (p.tr < 300 && p.tr > 0)
    warnings.push({ type:'T1 Saturation', description:'Very short TR may cause saturation effects in tissues with long T1 (CSF, edema).', severity:'medium' });

  if (p.matrix > 384 && p.bandwidth < 100)
    warnings.push({ type:'Bandwidth / SNR Tradeoff', description:'High matrix with low bandwidth increases scan time. Consider parallel imaging.', severity:'low' });

  if (p.sliceThickness < 2)
    warnings.push({ type:'Partial Volume', description:'Very thin slices reduce SNR. Adjacent slice interference may also occur.', severity:'low' });

  if (p.phaseEncoding === 'RL' || p.phaseEncoding === 'LR')
    warnings.push({ type:'Motion Sensitivity', description:'RL phase encoding may increase motion artifact from CSF pulsatility in posterior fossa.', severity:'low' });

  return warnings;
}

const EXPLANATIONS: Record<string, string> = {
  tr: 'Repetition Time (TR) is the time between successive RF excitation pulses. Short TR (≤600ms) produces T1-weighted contrast — tissues with short T1 (fat, Gd-enhancing lesions) recover faster and appear brighter. Long TR (≥2000ms) minimizes T1 weighting and is required for T2 or PD weighting. TR also determines scan time — longer TR = slower acquisition.',

  te: 'Echo Time (TE) is the time between the RF pulse and signal readout. Short TE (<30ms) captures signal before T2 decay begins → minimizes T2 weighting. Long TE (80-130ms) allows differential T2 decay between tissues → T2-weighted images where fluids (CSF, edema) appear bright. Choosing TE is a balance between T2 contrast and SNR loss.',

  flipAngle: 'Flip Angle (FA) is the angle of magnetization tipping from the longitudinal axis by the RF pulse. 90° maximizes transverse magnetization (spin echo). In gradient echo, lower angles (15-30°) are used to allow faster repetition without full saturation. The Ernst Angle = arccos(e^{-TR/T1}) gives the optimal FA for maximum SNR at a given TR.',

  matrix: 'Matrix Size (base resolution) determines in-plane spatial resolution: pixel size = FOV / matrix. Larger matrix = better resolution but: more phase-encoding steps → longer scan time, and smaller voxels → lower SNR (SNR ∝ voxel volume). Typical values: 256-512 for clinical brain imaging.',

  bandwidth: 'Receiver Bandwidth (Hz/Px) is the range of frequencies sampled per pixel. High BW: shorter readout, less chemical shift, less susceptibility artifact, but lower SNR. Low BW: higher SNR, but more chemical shift artifact and longer readout window (more T2* decay). Trade-off between SNR, chemical shift, and geometric accuracy.',

  fov: 'Field of View (FOV) determines spatial coverage and resolution. Larger FOV covers more anatomy but reduces spatial resolution for a fixed matrix. Smaller FOV improves resolution but risks aliasing if patient anatomy extends beyond FOV. Standard brain FOV: 200-240mm.',

  thickness: 'Slice Thickness determines through-plane resolution. Thicker slices: higher SNR (more protons), less geometric distortion, but poorer through-plane resolution and more partial volume effect. Thin slices: better spatial resolution but significantly lower SNR. 3D acquisitions avoid inter-slice gaps.',

  averages: 'Averages (NEX) — the number of times each k-space line is measured and averaged. Increasing averages improves SNR (∝ √NEX) but increases scan time proportionally. Doubling averages gives √2 ≈ 1.4× SNR improvement but doubles scan time. Useful for SNR-limited sequences or when motion artifact needs reduction.',
};

export function getExplanation(paramName: string): string {
  return EXPLANATIONS[paramName] ?? 'Select any parameter slider to see an educational explanation about its role in MRI physics and image quality.';
}
