'use client';
import { create } from 'zustand';
import { SEQUENCES, type Sequence, calculateTA, formatTime } from '@/lib/scanEngine';
import { calcSNR, getContrastType, calcResolution } from '@/lib/physics';

// ── Types ──────────────────────────────────────────────────

export type Plane = 'coronal' | 'sagittal' | 'axial';

export interface FovState  { x: number; y: number; w: number; h: number; rot: number; }
export interface XhairState { x: number; y: number; }
export interface SliceState { cur: number; max: number; }
export interface WLState    { window: number; level: number; brightness: number; contrast: number; }

export interface ScanState {
  running:    boolean;
  paused:     boolean;
  seqId:      number | null;
  progress:   number;   // 0-100
  remainSec:  number;
}

export interface ParamsState {
  slices:         number;
  thickness:      number;
  tr:             number;
  te:             number;
  ti:             number;
  flipAngle:      number;
  bandwidth:      number;
  etl:            number;   // echo train length
  turboFactor:    number;
  averages:       number;
  concatenations: number;
  fovRead:        number;   // mm
  fovPhase:       number;   // %
  matrix:         number;
  phaseEncoding:  string;
  fatSat:         string;
  parallelImaging:string;
  position:       string;
  orientation:    string;
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
export type ActiveTool = 'crosshair' | 'pan' | 'zoom' | 'wl' | 'measure-dist' | 'measure-angle' | 'roi' | 'annotate';

export interface WorkstationStore {
  // Sequences
  sequences:    Sequence[];
  selectedSeqId: number;

  // Scan
  scan: ScanState;

  // Parameters
  params: ParamsState;

  // Computed physics
  calcTA:       string;
  calcSNR:      number;
  calcContrast: string;
  calcRes:      [number, number, number];

  // Viewport
  fov:      Record<Plane, FovState>;
  xhair:    Record<Plane, XhairState>;
  slice:    Record<Plane, SliceState>;
  wl:       Record<Plane, WLState>;
  activeVP: Plane;

  // Images (data URLs)
  images:   Record<Plane, string | null>;

  // Overlay toggles
  show: {
    fov:           boolean;
    xhair:         boolean;
    labels:        boolean;
    ruler:         boolean;
    sliceMarkers:  boolean;
    referenceLines:boolean;
    measurements:  boolean;
    kspace:        boolean;
  };

  // Patient
  patient: PatientState;
  safety:  SafetyState;

  // UI state
  viewMode:      ViewMode;
  activeTool:    ActiveTool;
  showHelp:        boolean;
  showPatient:     boolean;
  showPhysics:     boolean;
  showLearning:    boolean;
  showAI:          boolean;
  showImageImport: boolean;
  statusMsg:       string;
  leftCollapsed: boolean;
  rightCollapsed:boolean;

  // Actions
  selectSeq:     (id: number) => void;
  startScan:     () => void;
  pauseScan:     () => void;
  stopScan:      () => void;
  setScanProgress: (progress: number, remainSec: number) => void;
  finishScan:    () => void;
  setParam:      (key: keyof ParamsState, value: number | string) => void;
  applyParams:   () => void;
  setFov:        (plane: Plane, fov: Partial<FovState>) => void;
  setXhair:      (plane: Plane, pos: XhairState) => void;
  setSlice:      (plane: Plane, cur: number) => void;
  setWL:         (plane: Plane, wl: Partial<WLState>) => void;
  setActiveVP:   (plane: Plane) => void;
  setImage:      (plane: Plane, url: string | null) => void;
  setShow:       (key: keyof WorkstationStore['show'], value: boolean) => void;
  setPatient:    (patient: Partial<PatientState>) => void;
  setSafety:     (safety: Partial<SafetyState>) => void;
  setViewMode:   (mode: ViewMode) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setStatusMsg:  (msg: string) => void;
  toggleLeft:    () => void;
  toggleRight:   () => void;
  toggleHelp:    () => void;
  togglePatient: () => void;
  togglePhysics: () => void;
  toggleLearning:   () => void;
  toggleAI:         () => void;
  toggleImageImport:() => void;
  reorderSeq:       (fromId: number, toId: number) => void;
  deleteSeq:        (id: number) => void;
  duplicateSeq:     (id: number) => void;
  moveSeq:          (id: number, dir: 'up' | 'down') => void;
  loadExam:         (snap: import('@/lib/examPersistence').ExamSnapshot) => void;
  resetViewport: (plane: Plane) => void;
  resetAll:      () => void;
}

// ── Default values ─────────────────────────────────────────

const defaultFov: FovState   = { x:0.15, y:0.15, w:0.70, h:0.70, rot:0 };
const defaultXhair: XhairState = { x:0.5,  y:0.5  };
const defaultWL: WLState       = { window:1200, level:600, brightness:1, contrast:1.15 };

const defaultParams: ParamsState = {
  slices:24, thickness:4, tr:2000, te:9, ti:0, flipAngle:150,
  bandwidth:145, etl:9, turboFactor:9, averages:1, concatenations:2,
  fovRead:220, fovPhase:100, matrix:320,
  phaseEncoding:'AP', fatSat:'None', parallelImaging:'GRAPPA ×2',
  position:'L3.1 P21.5 F2.2', orientation:'S > C3.8 > T1.4',
  autoAlign:'Head > Basis', coil:'HE1-4; NE1,2; SP1', filter:'Prescan Normalize',
};

const defaultPatient: PatientState = {
  name:'ANONYMOUS', dob:'1975-03-12', sex:'M', weight:75, height:175,
  study:'Brain Protocol — Routine', accession:'ACC20240723', patientId:'MR-001',
};

const defaultSafety: SafetyState = {
  implant:false, pacemaker:false, pregnant:false,
  contrastAllergy:false, claustrophobia:false,
  previousMRI:true, emergencyContact:'',
};

function computePhysics(p: ParamsState) {
  const taSec = calculateTA({ slices:p.slices, tr:p.tr, te:p.te, averages:p.averages, concatenations:p.concatenations, turboFactor:p.turboFactor, matrix:p.matrix });
  const snr = calcSNR({ tr:p.tr, te:p.te, sliceThickness:p.thickness, nex:p.averages, fov:p.fovRead, matrix:p.matrix });
  const contrast = getContrastType(p.tr, p.te, p.ti, p.filter.includes('FLAIR') || false);
  const res = calcResolution(p.fovRead, p.matrix, p.thickness);
  return { calcTA: formatTime(taSec), calcSNR: snr, calcContrast: contrast, calcRes: res };
}

// ── Store ──────────────────────────────────────────────────

export const useWorkstationStore = create<WorkstationStore>((set, get) => ({
  sequences:    [...SEQUENCES],
  selectedSeqId: 3,
  scan:         { running:false, paused:false, seqId:null, progress:0, remainSec:0 },
  params:       defaultParams,
  ...computePhysics(defaultParams),

  fov:   { coronal:{...defaultFov}, sagittal:{...defaultFov, x:0.20, y:0.20, w:0.60, h:0.60}, axial:{...defaultFov} },
  xhair: { coronal:{...defaultXhair}, sagittal:{...defaultXhair}, axial:{...defaultXhair} },
  slice: { coronal:{cur:1,max:24}, sagittal:{cur:1,max:22}, axial:{cur:12,max:30} },
  wl:    { coronal:{...defaultWL}, sagittal:{...defaultWL}, axial:{...defaultWL} },
  activeVP: 'axial',
  images: { coronal:null, sagittal:null, axial:null },

  show: { fov:true, xhair:true, labels:true, ruler:false, sliceMarkers:true, referenceLines:true, measurements:true, kspace:false },

  patient: defaultPatient,
  safety:  defaultSafety,

  viewMode:      'normal',
  activeTool:    'crosshair',
  showHelp:        false,
  showPatient:     false,
  showPhysics:     false,
  showLearning:    false,
  showAI:          false,
  showImageImport: false,
  statusMsg:     'System Ready — Sequence selected: t2_tse_cor',
  leftCollapsed: false,
  rightCollapsed:false,

  // ── Actions ──

  selectSeq: (id) => {
    const seq = get().sequences.find(s => s.id === id);
    if (!seq) return;
    const p = get().params;
    const newParams = { ...p, slices:seq.sl, tr:seq.tr, te:seq.te, ti:seq.ti, flipAngle:seq.flipAngle };
    set({ selectedSeqId: id, params: newParams, statusMsg: `Selected: ${seq.name}`, ...computePhysics(newParams) });
  },

  startScan: () => {
    const { sequences, scan } = get();
    if (scan.running && !scan.paused) return;

    if (scan.paused && scan.seqId) {
      set({ scan: { ...scan, paused: false }, statusMsg: 'Scan resumed' });
      return;
    }

    const seq = sequences.find(s => s.status === 'active' || s.status === 'pending');
    if (!seq) { set({ statusMsg: 'All sequences completed!' }); return; }

    const newSeqs = sequences.map(s =>
      s.id === seq.id ? { ...s, status: 'scanning' as const } : s
    );
    const taSec = parseInt(seq.ta.split(':')[0]!) * 60 + parseInt(seq.ta.split(':')[1] ?? '0');
    set({
      sequences: newSeqs,
      scan: { running:true, paused:false, seqId:seq.id, progress:0, remainSec:taSec },
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
      scan: { running:false, paused:false, seqId:null, progress:0, remainSec:0 },
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
    // Advance next pending → active
    let advanced = false;
    const advancedSeqs = finishedSeqs.map(s => {
      if (!advanced && s.status === 'pending') { advanced = true; return { ...s, status: 'active' as const }; }
      return s;
    });
    const seq = sequences.find(s => s.id === scan.seqId);
    set({
      sequences: advancedSeqs,
      scan: { running:false, paused:false, seqId:null, progress:0, remainSec:0 },
      statusMsg: seq ? `Completed: ${seq.name}` : 'Sequence complete',
    });
  },

  setParam: (key, value) => {
    const newParams = { ...get().params, [key]: value };
    set({ params: newParams, ...computePhysics(newParams) });
  },

  applyParams: () => {
    const { params, selectedSeqId, sequences } = get();
    const newParams = { ...params };
    const computed = computePhysics(newParams);
    const newSeqs = sequences.map(s =>
      s.id === selectedSeqId ? { ...s, ta: computed.calcTA, sl: params.slices, tr: params.tr, te: params.te } : s
    );
    set({ params: newParams, sequences: newSeqs, ...computed, statusMsg: 'Parameters applied ✓' });
  },

  setFov:    (plane, fov)    => set(s => ({ fov:   { ...s.fov,   [plane]: { ...s.fov[plane],   ...fov  } } })),
  setXhair:  (plane, pos)    => set(s => ({ xhair: { ...s.xhair, [plane]: pos } })),
  setSlice:  (plane, cur)    => set(s => ({ slice: { ...s.slice, [plane]: { ...s.slice[plane], cur: Math.max(1, Math.min(s.slice[plane].max, cur)) } } })),
  setWL:     (plane, wl)     => set(s => ({ wl:    { ...s.wl,    [plane]: { ...s.wl[plane],    ...wl   } } })),
  setActiveVP: (plane)       => set({ activeVP: plane }),
  setImage:  (plane, url)    => set(s => ({ images: { ...s.images, [plane]: url } })),
  setShow:   (key, value)    => set(s => ({ show:   { ...s.show,   [key]: value } })),
  setPatient: (patient)      => set(s => ({ patient: { ...s.patient, ...patient } })),
  setSafety:  (safety)       => set(s => ({ safety: { ...s.safety, ...safety } })),
  setViewMode: (mode)        => set({ viewMode: mode }),
  setActiveTool: (tool)      => set({ activeTool: tool }),
  setStatusMsg: (msg)        => set({ statusMsg: msg }),
  toggleLeft:    ()          => set(s => ({ leftCollapsed:  !s.leftCollapsed })),
  toggleRight:   ()          => set(s => ({ rightCollapsed: !s.rightCollapsed })),
  toggleHelp:    ()          => set(s => ({ showHelp:    !s.showHelp })),
  togglePatient: ()          => set(s => ({ showPatient: !s.showPatient })),
  togglePhysics: ()          => set(s => ({ showPhysics: !s.showPhysics })),
  toggleLearning:   () => set(s => ({ showLearning:    !s.showLearning })),
  toggleAI:         () => set(s => ({ showAI:           !s.showAI })),
  toggleImageImport:() => set(s => ({ showImageImport: !s.showImageImport })),

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

  loadExam: (snap) => set({
    patient:   snap.patient,
    safety:    snap.safety,
    sequences: snap.sequences,
    params:    snap.params,
    fov:       snap.fov,
    slice:     snap.slice,
    wl:        snap.wl,
    show:      snap.show,
    statusMsg: `Exam loaded: ${snap.patient.name} — ${new Date(snap.savedAt).toLocaleString()}`,
    ...computePhysics(snap.params),
  }),

  resetViewport: (plane) => {
    set(s => ({
      fov:   { ...s.fov,   [plane]: { ...defaultFov } },
      xhair: { ...s.xhair, [plane]: { ...defaultXhair } },
    }));
  },

  resetAll: () => {
    set({
      fov:   { coronal:{...defaultFov}, sagittal:{...defaultFov,x:0.20,y:0.20,w:0.60,h:0.60}, axial:{...defaultFov} },
      xhair: { coronal:{...defaultXhair}, sagittal:{...defaultXhair}, axial:{...defaultXhair} },
      wl:    { coronal:{...defaultWL}, sagittal:{...defaultWL}, axial:{...defaultWL} },
      statusMsg: 'All viewports reset',
    });
  },
}));
