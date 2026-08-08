'use client';
import { create } from 'zustand';
import { SEQUENCES, type Sequence, calculateTA, formatTime } from '@/lib/scanEngine';
import { calcSNR, getContrastType, calcResolution } from '@/lib/physics';
import { eulerToMatrix } from '@/lib/geometry';
import type { ProtocolImageSeries } from '@/lib/protocolSeries';
import { materializeProtocolSequences, type ProtocolPreset } from '@/lib/protocolCatalog';

// ── Types ──────────────────────────────────────────────────

export type Plane = 'coronal' | 'sagittal' | 'axial';
export type Theme = 'dark' | 'light';

/** Single 3D Planning Object — source of truth for all viewports */
export interface PlanningObject {
  /** Center of the slab in mm from isocenter */
  centerX: number;
  centerY: number;
  centerZ: number;
  /** Rotation angles in degrees (kept for UI bindings) */
  rotX: number;   // Pitch
  rotY: number;   // Yaw
  rotZ: number;   // Roll
  /** 3x3 Rotation Matrix as source of truth for 3D orientation */
  rotationMatrix: number[];
  /** Primary orientation plane */
  orientation: 'axial' | 'coronal' | 'sagittal';
  /** Field of View Read direction (mm) — controls width */
  fovRead: number;
  /** Field of View Phase direction (mm) — controls height */
  fovPhase: number;
  /** Number of slices */
  sliceCount: number;
  /** Thickness of each slice in mm */
  sliceThickness: number;
  /** Gap between slices in mm (negative = overlap) */
  sliceGap: number;
  /** Phase encoding direction */
  phaseDir: 'AP' | 'RL' | 'HF';
}

export interface XhairState { x: number; y: number; }
export interface WLState    { window: number; level: number; brightness: number; contrast: number; }

export interface ScanState {
  running:    boolean;
  paused:     boolean;
  seqId:      number | null;
  progress:   number;   // 0-100
  remainSec:  number;
}

export interface ParamsState {
  tr:             number;
  te:             number;
  ti:             number;
  flipAngle:      number;
  bandwidth:      number;
  etl:            number;
  turboFactor:    number;
  averages:       number;
  concatenations: number;
  matrix:         number;
  fatSat:         string;
  partialFourier: string;
  parallelImaging:string;
  position:       string;
  autoAlign:      string;
  coil:           string;
  filter:         string;
}

export interface PatientState {
  name:       string;
  dob:        string;
  sex:        string;
  weight:     number;
  height:     number;
  study:      string;
  accession:  string;
  patientId:  string;
}

export interface SafetyState {
  implant:          boolean;
  pacemaker:        boolean;
  pregnant:         boolean;
  contrastAllergy:  boolean;
  claustrophobia:   boolean;
  previousMRI:      boolean;
  emergencyContact: string;
}

export type ViewMode = 'normal' | 'linked' | 'compare';

export interface WorkstationStore {
  // Sequences
  sequences:    Sequence[];
  selectedSeqId: number;

  // Scan
  scan: ScanState;

  // Parameters (MRI protocol — NOT planning geometry)
  params: ParamsState;

  // Computed physics
  calcTA:       string;
  calcSNR:      number;
  calcContrast: string;
  calcRes:      [number, number, number];
  taSec:        number;

  // THE ONE PLANNING OBJECT
  planning: PlanningObject;
  planningActive: boolean;  // false until first image loaded

  // Viewport state
  xhair:    Record<Plane, XhairState>;
  wl:       Record<Plane, WLState>;
  activeVP: Plane;

  // Images (data URLs) — same image shown in all viewports for now
  images:   Record<Plane, string | null>;
  imageSeries: Record<Plane, ProtocolImageSeries | null>;

  // Overlay toggles
  show: {
    fov:            boolean;
    xhair:          boolean;
    labels:         boolean;
    ruler:          boolean;
    sliceMarkers:   boolean;
    referenceLines: boolean;
    measurements:   boolean;
    kspace:         boolean;
  };

  // Patient
  patient: PatientState;
  safety:  SafetyState;

  // UI state
  theme:         Theme;
  viewMode:      ViewMode;
  showHelp:        boolean;
  showPatient:     boolean;
  showPhysics:     boolean;
  showLearning:    boolean;
  showAI:          boolean;
  showImageImport: boolean;
  statusMsg:       string;
  leftCollapsed:   boolean;
  rightCollapsed:  boolean;
  cineMode:        boolean;
  debugMode:       boolean;

  // Actions
  selectSeq:        (id: number) => void;
  startScan:        () => void;
  pauseScan:        () => void;
  stopScan:         () => void;
  setScanProgress:  (progress: number, remainSec: number) => void;
  finishScan:       () => void;
  setParam:         (key: keyof ParamsState, value: number | string) => void;
  applyParams:      () => void;
  setPlanning:      (p: Partial<PlanningObject>) => void;
  setPlanningOrientation: (orientation: PlanningObject['orientation']) => void;
  setXhair:         (plane: Plane, pos: XhairState) => void;
  setWL:            (plane: Plane, wl: Partial<WLState>) => void;
  setActiveVP:      (plane: Plane) => void;
  setImage:         (plane: Plane, url: string | null) => void;
  setImageAll:      (url: string) => void;
  setImageSeries:   (series: ProtocolImageSeries) => void;
  setShow:          (key: keyof WorkstationStore['show'], value: boolean) => void;
  setPatient:       (patient: Partial<PatientState>) => void;
  setSafety:        (safety: Partial<SafetyState>) => void;
  setViewMode:      (mode: ViewMode) => void;
  setStatusMsg:     (msg: string) => void;
  setTheme:         (theme: Theme) => void;
  toggleLeft:       () => void;
  toggleRight:      () => void;
  toggleHelp:       () => void;
  togglePatient:    () => void;
  togglePhysics:    () => void;
  toggleDebug:      () => void;
  toggleLearning:   () => void;
  toggleAI:         () => void;
  toggleImageImport:() => void;
  toggleTheme:      () => void;
  reorderSeq:       (fromId: number, toId: number) => void;
  deleteSeq:        (id: number) => void;
  duplicateSeq:     (id: number) => void;
  moveSeq:          (id: number, dir: 'up' | 'down') => void;
  loadProtocol:     (protocol: ProtocolPreset) => void;
  loadExam:         (snap: import('@/lib/examPersistence').ExamSnapshot) => void;
  resetViewport:    (plane: Plane) => void;
  resetAll:         () => void;
  resetPlanning:    () => void;
  toggleCine:       () => void;
}

// ── Default values ─────────────────────────────────────────

export const defaultPlanning: PlanningObject = {
  centerX: 0, centerY: 0, centerZ: 0,
  rotX: 0, rotY: 0, rotZ: 0,
  rotationMatrix: [1, 0, 0,  0, 1, 0,  0, 0, 1],
  orientation: 'axial',
  fovRead: 220,
  fovPhase: 220,
  sliceCount: 24,
  sliceThickness: 4,
  sliceGap: 0.4,
  phaseDir: 'AP',
};

const defaultXhair: XhairState = { x: 0.5, y: 0.5 };
const defaultWL: WLState       = { window: 1200, level: 600, brightness: 1, contrast: 1.15 };

const defaultParams: ParamsState = {
  tr: 2000, te: 9, ti: 0, flipAngle: 150,
  bandwidth: 145, etl: 9, turboFactor: 9, averages: 1, concatenations: 2,
  matrix: 320,
  fatSat: 'None', partialFourier: 'Off', parallelImaging: 'GRAPPA ×2',
  position: 'L3.1 P21.5 F2.2',
  autoAlign: 'Head > Basis', coil: 'HE1-4; NE1,2; SP1', filter: 'Prescan Normalize',
};

const defaultPatient: PatientState = {
  name: 'ANONYMOUS', dob: '1975-03-12', sex: 'M', weight: 75, height: 175,
  study: 'Brain Protocol — Routine', accession: 'ACC20240723', patientId: 'MR-001',
};

const defaultSafety: SafetyState = {
  implant: false, pacemaker: false, pregnant: false,
  contrastAllergy: false, claustrophobia: false,
  previousMRI: true, emergencyContact: '',
};

function computePhysics(p: ParamsState, plan: PlanningObject) {
  const taSec = calculateTA({
    slices: plan.sliceCount, tr: p.tr, te: p.te, averages: p.averages,
    concatenations: p.concatenations, turboFactor: p.turboFactor,
    matrix: p.matrix, fovPhase: (plan.fovPhase / plan.fovRead) * 100,
    partialFourier: p.partialFourier,
    parallelImaging: p.parallelImaging, phaseEncoding: plan.phaseDir,
  });
  const snr = calcSNR({ tr: p.tr, te: p.te, sliceThickness: plan.sliceThickness, nex: p.averages, fov: plan.fovRead, matrix: p.matrix });
  const contrast = getContrastType(p.tr, p.te, p.ti, p.filter.includes('FLAIR') || false);
  const res = calcResolution(plan.fovRead, p.matrix, plan.sliceThickness);
  return { calcTA: formatTime(taSec), calcSNR: snr, calcContrast: contrast, calcRes: res, taSec };
}

function clampFinite(value: number, minimum: number, maximum: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(minimum, Math.min(maximum, value));
}

/** Keep direct inputs, sliders, wheel gestures, and viewport drags in sync. */
function sanitizePlanning(plan: PlanningObject, fallback: PlanningObject): PlanningObject {
  const sliceThickness = clampFinite(plan.sliceThickness, 0.5, 20, fallback.sliceThickness);
  return {
    ...plan,
    centerX: clampFinite(plan.centerX, -150, 150, fallback.centerX),
    centerY: clampFinite(plan.centerY, -150, 150, fallback.centerY),
    centerZ: clampFinite(plan.centerZ, -150, 150, fallback.centerZ),
    rotX: clampFinite(plan.rotX, -180, 180, fallback.rotX),
    rotY: clampFinite(plan.rotY, -180, 180, fallback.rotY),
    rotZ: clampFinite(plan.rotZ, -180, 180, fallback.rotZ),
    fovRead: clampFinite(plan.fovRead, 80, 500, fallback.fovRead),
    fovPhase: clampFinite(plan.fovPhase, 80, 500, fallback.fovPhase),
    sliceCount: Math.round(clampFinite(plan.sliceCount, 1, 200, fallback.sliceCount)),
    sliceThickness,
    // Prevent a negative gap from inverting the stack direction.
    sliceGap: clampFinite(plan.sliceGap, -sliceThickness + 0.1, 20, fallback.sliceGap),
  };
}

// ── Store ──────────────────────────────────────────────────

export const useWorkstationStore = create<WorkstationStore>((set, get) => ({
  sequences:     [...SEQUENCES],
  selectedSeqId: 1,
  scan:          { running: false, paused: false, seqId: null, progress: 0, remainSec: 0 },
  params:        defaultParams,
  ...computePhysics(defaultParams, defaultPlanning),

  planning:       { ...defaultPlanning },
  planningActive: false,

  xhair:    { coronal: { ...defaultXhair }, sagittal: { ...defaultXhair }, axial: { ...defaultXhair } },
  wl:       { coronal: { ...defaultWL }, sagittal: { ...defaultWL }, axial: { ...defaultWL } },
  activeVP: 'axial',
  images:   { coronal: null, sagittal: null, axial: null },
  imageSeries: { coronal: null, sagittal: null, axial: null },

  show: { fov: true, xhair: true, labels: true, ruler: false, sliceMarkers: false, referenceLines: true, measurements: true, kspace: false },

  patient: defaultPatient,
  safety:  defaultSafety,

  theme:         'dark',
  viewMode:      'normal',
  showHelp:        false,
  showPatient:     false,
  showPhysics:     false,
  showLearning:    false,
  showAI:          false,
  showImageImport: false,
  statusMsg:     'System Ready — Load an image or begin planning',
  leftCollapsed: false,
  rightCollapsed: false,
  cineMode: false,
  debugMode: false,

  // ── Actions ──

  selectSeq: (id) => {
    const seq = get().sequences.find(s => s.id === id);
    if (!seq) return;
    const p = get().params;
    const plan = get().planning;
    const newParams = { ...p, tr: seq.tr, te: seq.te, ti: seq.ti, flipAngle: seq.flipAngle };
    // Infer orientation from sequence name
    const lower = seq.name.toLowerCase();
    let orientation: PlanningObject['orientation'] = plan.orientation;
    if (lower.includes('tra') || lower.includes('axial')) orientation = 'axial';
    else if (lower.includes('cor')) orientation = 'coronal';
    else if (lower.includes('sag')) orientation = 'sagittal';
    const newPlan = { ...plan, sliceCount: seq.sl, orientation };
    const computed = computePhysics(newParams, newPlan);
    set({ selectedSeqId: id, params: newParams, planning: newPlan, statusMsg: `Selected: ${seq.name}`, ...computed });
  },

  startScan: () => {
    const { sequences, scan, selectedSeqId } = get();
    if (scan.running && !scan.paused) return;

    if (scan.paused && scan.seqId) {
      set({ scan: { ...scan, paused: false }, statusMsg: 'Scan resumed' });
      return;
    }

    const selected = sequences.find(
      s => s.id === selectedSeqId && (s.status === 'active' || s.status === 'pending'),
    );
    const seq = selected ?? sequences.find(s => s.status === 'active' || s.status === 'pending');
    if (!seq) { set({ statusMsg: 'All sequences completed!' }); return; }

    const newSeqs = sequences.map(s =>
      s.id === seq.id ? { ...s, status: 'scanning' as const } : s
    );
    const taSec = parseInt(seq.ta.split(':')[0]!) * 60 + parseInt(seq.ta.split(':')[1] ?? '0');
    set({
      sequences: newSeqs,
      scan: { running: true, paused: false, seqId: seq.id, progress: 0, remainSec: taSec },
      selectedSeqId: seq.id,
      statusMsg: `Scanning: ${seq.name}`,
    });
  },

  pauseScan: () => {
    const { scan } = get();
    if (!scan.running || scan.paused) return;
    set({ scan: { ...scan, paused: true }, statusMsg: 'Scan paused — press ▶ to resume' });
  },

  stopScan: () => {
    const { sequences, scan } = get();
    const newSeqs = sequences.map(s =>
      s.id === scan.seqId && s.status === 'scanning' ? { ...s, status: 'active' as const } : s
    );
    set({
      sequences: newSeqs,
      scan: { running: false, paused: false, seqId: null, progress: 0, remainSec: 0 },
      statusMsg: 'Scan aborted',
    });
  },

  setScanProgress: (progress, remainSec) => {
    set({ scan: { ...get().scan, progress, remainSec } });
  },

  finishScan: () => {
    const { sequences, scan } = get();
    const finishedSeqs = sequences.map(s =>
      s.id === scan.seqId ? { ...s, status: 'done' as const } : s
    );
    let advanced = false;
    const advancedSeqs = finishedSeqs.map(s => {
      if (!advanced && s.status === 'pending') { advanced = true; return { ...s, status: 'active' as const }; }
      return s;
    });
    const seq = sequences.find(s => s.id === scan.seqId);
    set({
      sequences: advancedSeqs,
      scan: { running: false, paused: false, seqId: null, progress: 0, remainSec: 0 },
      statusMsg: seq ? `Completed: ${seq.name}` : 'Sequence complete',
      cineMode: !advanced,
    });

    if (advanced) {
      setTimeout(() => { get().startScan(); }, 500);
    }
  },

  setParam: (key, value) => {
    const state = get();
    const newParams = { ...state.params, [key]: value };
    const computed = computePhysics(newParams, state.planning);
    const newSeqs = state.sequences.map(s =>
      s.id === state.selectedSeqId ? { ...s, ta: computed.calcTA, tr: newParams.tr, te: newParams.te } : s
    );
    set({ params: newParams, sequences: newSeqs, ...computed });
  },

  applyParams: () => {
    set({ statusMsg: 'Parameters applied ✓' });
  },

  setPlanning: (p) => {
    const oldPlan = get().planning;
    const newPlan = sanitizePlanning({ ...oldPlan, ...p }, oldPlan);
    
    if (p.rotX !== undefined || p.rotY !== undefined || p.rotZ !== undefined) {
      newPlan.rotationMatrix = eulerToMatrix(newPlan.rotX, newPlan.rotY, newPlan.rotZ);
    }
    
    const computed = computePhysics(get().params, newPlan);
    const newSeqs = get().sequences.map(s =>
      s.id === get().selectedSeqId ? { ...s, ta: computed.calcTA, sl: newPlan.sliceCount } : s
    );
    set({ planning: newPlan, sequences: newSeqs, ...computed });
  },

  setPlanningOrientation: (orientation) => {
    const newPlan = { 
      ...get().planning, 
      orientation, 
      rotX: 0, rotY: 0, rotZ: 0,
      rotationMatrix: [1, 0, 0,  0, 1, 0,  0, 0, 1]
    };
    const computed = computePhysics(get().params, newPlan);
    set({ planning: newPlan, ...computed, statusMsg: `Orientation: ${orientation.toUpperCase()}` });
  },

  setXhair:    (plane, pos)  => set(s => ({ xhair: { ...s.xhair, [plane]: pos } })),
  setWL:       (plane, wl)   => set(s => ({ wl: { ...s.wl, [plane]: { ...s.wl[plane], ...wl } } })),
  setActiveVP: (plane)       => set({ activeVP: plane }),

  setImage: (plane, url) => {
    set(s => {
      const newImages = { ...s.images, [plane]: url };
      const newSeries = { ...s.imageSeries, [plane]: null };
      const hasAny = Object.values(newImages).some(v => v !== null);
      return { images: newImages, imageSeries: newSeries, planningActive: hasAny };
    });
  },

  setImageAll: (url) => {
    set({
      images: { coronal: url, sagittal: url, axial: url },
      imageSeries: { coronal: null, sagittal: null, axial: null },
      planningActive: true,
      statusMsg: 'Image loaded — Planning active',
    });
  },

  setImageSeries: (series) => {
    const state = get();
    const sequence = state.sequences.find(item => item.id === series.sequenceId);
    const nextParams = sequence
      ? { ...state.params, tr: sequence.tr, te: sequence.te, ti: sequence.ti, flipAngle: sequence.flipAngle }
      : state.params;
    const nextPlanning = sanitizePlanning({
      ...state.planning,
      orientation: series.plane,
      sliceCount: series.frameCount,
      sliceThickness: series.sliceThickness || state.planning.sliceThickness,
    }, state.planning);
    const computed = computePhysics(nextParams, nextPlanning);
    set({
      selectedSeqId: series.sequenceId,
      params: nextParams,
      planning: nextPlanning,
      images: { ...state.images, [series.plane]: series.thumbnail },
      imageSeries: { ...state.imageSeries, [series.plane]: series },
      activeVP: series.plane,
      planningActive: true,
      statusMsg: `${series.name}: ${series.frameCount} DICOM images loaded into ${series.plane.toUpperCase()} planning`,
      ...computed,
    });
  },

  setShow:    (key, value) => set(s => ({ show: { ...s.show, [key]: value } })),
  setPatient: (patient)   => set(s => ({ patient: { ...s.patient, ...patient } })),
  setSafety:  (safety)    => set(s => ({ safety: { ...s.safety, ...safety } })),
  setViewMode: (mode)     => set({ viewMode: mode }),
  setStatusMsg: (msg)     => set({ statusMsg: msg }),
  setTheme: (theme)       => set({ theme }),

  toggleLeft:       () => set(s => ({ leftCollapsed: !s.leftCollapsed })),
  toggleRight:      () => set(s => ({ rightCollapsed: !s.rightCollapsed })),
  toggleHelp:       () => set(s => ({ showHelp: !s.showHelp })),
  togglePatient:    () => set(s => ({ showPatient: !s.showPatient })),
  togglePhysics:    () => set(s => ({ showPhysics: !s.showPhysics })),
  toggleDebug:      () => set(s => ({ debugMode: !s.debugMode })),
  toggleLearning:   () => set(s => ({ showLearning: !s.showLearning })),
  toggleAI:         () => set(s => ({ showAI: !s.showAI })),
  toggleImageImport:() => set(s => ({ showImageImport: !s.showImageImport })),
  toggleTheme:      () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  reorderSeq: (fromId, toId) => set(s => {
    const seqs = [...s.sequences];
    const fromIdx = seqs.findIndex(s => s.id === fromId);
    const toIdx   = seqs.findIndex(s => s.id === toId);
    if (fromIdx < 0 || toIdx < 0) return {};
    const [item] = seqs.splice(fromIdx, 1);
    seqs.splice(toIdx, 0, item!);
    return { sequences: seqs };
  }),

  deleteSeq: (id) => set(s => ({
    sequences: s.sequences.filter(seq => seq.id !== id),
    selectedSeqId: s.selectedSeqId === id
      ? (s.sequences.find(seq => seq.id !== id)?.id ?? s.selectedSeqId)
      : s.selectedSeqId,
  })),

  duplicateSeq: (id) => set(s => {
    const idx = s.sequences.findIndex(seq => seq.id === id);
    if (idx < 0) return {};
    const orig = s.sequences[idx]!;
    const newId = Math.max(...s.sequences.map(seq => seq.id)) + 1;
    const copy = { ...orig, id: newId, name: `${orig.name} (copy)`, status: 'pending' as const };
    const seqs = [...s.sequences];
    seqs.splice(idx + 1, 0, copy);
    return { sequences: seqs };
  }),

  moveSeq: (id, dir) => set(s => {
    const seqs = [...s.sequences];
    const idx = seqs.findIndex(seq => seq.id === id);
    if (idx < 0) return {};
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= seqs.length) return {};
    [seqs[idx], seqs[newIdx]] = [seqs[newIdx]!, seqs[idx]!];
    return { sequences: seqs };
  }),

  loadProtocol: (protocol) => {
    const sequences = materializeProtocolSequences(protocol);
    const firstDiagnostic = sequences.find(sequence => !sequence.name.toLowerCase().includes('localizer')) ?? sequences[0];
    if (!firstDiagnostic) return;

    const normalizedName = firstDiagnostic.name.toLowerCase();
    let orientation: PlanningObject['orientation'] = 'axial';
    if (normalizedName.includes(' sag')) orientation = 'sagittal';
    else if (normalizedName.includes(' cor')) orientation = 'coronal';

    const params = {
      ...get().params,
      tr: firstDiagnostic.tr,
      te: firstDiagnostic.te,
      ti: firstDiagnostic.ti,
      flipAngle: firstDiagnostic.flipAngle,
    };
    const planning = sanitizePlanning({
      ...get().planning,
      orientation,
      sliceCount: firstDiagnostic.sl,
      rotX: 0,
      rotY: 0,
      rotZ: 0,
      rotationMatrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    }, get().planning);

    set({
      sequences,
      selectedSeqId: sequences[0]!.id,
      scan: { running: false, paused: false, seqId: null, progress: 0, remainSec: 0 },
      params,
      planning,
      patient: { ...get().patient, study: `MRI Pro — ${protocol.name}` },
      cineMode: false,
      statusMsg: `Loaded ${protocol.name}: ${sequences.length} sequences · TA ${protocol.estimatedTime}`,
      ...computePhysics(params, planning),
    });
  },

  loadExam: (snap) => set({
    patient:   snap.patient,
    safety:    snap.safety,
    sequences: snap.sequences,
    params:    snap.params,
    planning:  snap.planning ?? { ...defaultPlanning },
    wl:        snap.wl,
    show:      snap.show,
    statusMsg: `Exam loaded: ${snap.patient.name} — ${new Date(snap.savedAt).toLocaleString()}`,
    ...computePhysics(snap.params, snap.planning ?? defaultPlanning),
  }),

  toggleCine: () => set(s => ({ cineMode: !s.cineMode, statusMsg: !s.cineMode ? 'Cine playback started' : 'Cine playback stopped' })),

  resetViewport: (plane) => {
    set(s => ({
      xhair: { ...s.xhair, [plane]: { ...defaultXhair } },
      wl: { ...s.wl, [plane]: { ...defaultWL } },
    }));
  },

  resetPlanning: () => {
    const computed = computePhysics(get().params, defaultPlanning);
    set({ planning: { ...defaultPlanning }, ...computed, statusMsg: 'Planning reset' });
  },

  resetAll: () => {
    const computed = computePhysics(get().params, defaultPlanning);
    set({
      planning: { ...defaultPlanning },
      xhair: { coronal: { ...defaultXhair }, sagittal: { ...defaultXhair }, axial: { ...defaultXhair } },
      wl:    { coronal: { ...defaultWL }, sagittal: { ...defaultWL }, axial: { ...defaultWL } },
      statusMsg: 'All viewports reset',
      ...computed,
    });
  },
}));
