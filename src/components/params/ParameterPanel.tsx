'use client';
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import type { ParamsState, PlanningObject } from '@/store/workstationStore';
import {
  getPlanningAngleStatus,
  PLANNING_COLOR,
  PLANNING_WARNING_COLOR,
} from '@/lib/geometry';

// ─── Stable input for params (protocol params) ──────────────────────────────

interface ParamInputProps {
  label: string;
  paramKey: keyof ParamsState;
  unit?: string;
  type?: 'number' | 'text';
  min?: number;
  max?: number;
  step?: number;
  onCommit: (key: keyof ParamsState, value: number | string) => void;
  storeValue: number | string;
}

const ParamInput = memo(function ParamInput({
  label, paramKey, unit, type = 'number', min, max, step = 1, onCommit, storeValue,
}: ParamInputProps) {
  const [local, setLocal] = useState(String(storeValue));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocal(String(storeValue));
    }
  }, [storeValue]);

  const handleBlur = useCallback(() => {
    if (type === 'number') {
      const n = Number(local);
      const clamped = min !== undefined && max !== undefined
        ? Math.max(min, Math.min(max, isNaN(n) ? Number(storeValue) : n))
        : isNaN(n) ? Number(storeValue) : n;
      setLocal(String(clamped));
      onCommit(paramKey, clamped);
    } else {
      onCommit(paramKey, String(local));
    }
  }, [local, type, min, max, storeValue, paramKey, onCommit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') inputRef.current?.blur();
    if (type === 'number') {
      if (e.key === 'ArrowUp')   { e.preventDefault(); const n = Math.min((max ?? Infinity), Number(local) + (step ?? 1)); setLocal(String(n)); onCommit(paramKey, n); }
      if (e.key === 'ArrowDown') { e.preventDefault(); const n = Math.max((min ?? -Infinity), Number(local) - (step ?? 1)); setLocal(String(n)); onCommit(paramKey, n); }
    }
  }, [local, type, min, max, step, paramKey, onCommit]);

  return (
    <div className="prow">
      <span className="plbl">{label}</span>
      <input
        ref={inputRef}
        type="text" inputMode={type === 'number' ? 'decimal' : 'text'}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="pinput"
        autoComplete="off" spellCheck={false}
      />
      {unit && <span className="punit">{unit}</span>}
    </div>
  );
});

// ─── Stable input for planning geometry ─────────────────────────────────────

interface PlanInputProps {
  label: string;
  planKey: keyof PlanningObject;
  unit?: string;
  type?: 'number' | 'text';
  min?: number;
  max?: number;
  step?: number;
  onCommit: (key: keyof PlanningObject, value: number | string) => void;
  storeValue: number | string;
}

const PlanInput = memo(function PlanInput({
  label, planKey, unit, type = 'number', min, max, step = 1, onCommit, storeValue,
}: PlanInputProps) {
  const [local, setLocal] = useState(String(storeValue));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocal(String(storeValue));
    }
  }, [storeValue]);

  const handleBlur = useCallback(() => {
    if (type === 'number') {
      const n = Number(local);
      const clamped = min !== undefined && max !== undefined
        ? Math.max(min, Math.min(max, isNaN(n) ? Number(storeValue) : n))
        : isNaN(n) ? Number(storeValue) : n;
      setLocal(String(clamped));
      onCommit(planKey, clamped);
    } else {
      onCommit(planKey, String(local));
    }
  }, [local, type, min, max, storeValue, planKey, onCommit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') inputRef.current?.blur();
    if (type === 'number') {
      if (e.key === 'ArrowUp')   { e.preventDefault(); const n = Math.min((max ?? Infinity), Number(local) + (step ?? 1)); setLocal(String(n)); onCommit(planKey, n); }
      if (e.key === 'ArrowDown') { e.preventDefault(); const n = Math.max((min ?? -Infinity), Number(local) - (step ?? 1)); setLocal(String(n)); onCommit(planKey, n); }
    }
  }, [local, type, min, max, step, planKey, onCommit]);

  return (
    <div className="prow">
      <span className="plbl">{label}</span>
      <input
        ref={inputRef}
        type="text" inputMode={type === 'number' ? 'decimal' : 'text'}
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="pinput"
        autoComplete="off" spellCheck={false}
      />
      {unit && <span className="punit">{unit}</span>}
    </div>
  );
});

// ─── Stable select (params) ──────────────────────────────────────────────────

interface ParamSelectProps {
  label: string;
  paramKey: keyof ParamsState;
  options: string[];
  onCommit: (key: keyof ParamsState, value: string) => void;
  storeValue: string;
}

const ParamSelect = memo(function ParamSelect({ label, paramKey, options, onCommit, storeValue }: ParamSelectProps) {
  return (
    <div className="prow">
      <span className="plbl">{label}</span>
      <select value={storeValue} onChange={e => onCommit(paramKey, e.target.value)}
        style={{ flex:1, background:'var(--c-bg-input)', border:'1px solid var(--c-border-bright)', color:'var(--c-text-base)', fontFamily:'Roboto Mono,monospace', fontSize:'9.5px', padding:'1px 4px', borderRadius:'2px', outline:'none' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
});

// ─── Stable select (planning) ────────────────────────────────────────────────

interface PlanSelectProps {
  label: string;
  planKey: keyof PlanningObject;
  options: string[];
  onCommit: (key: keyof PlanningObject, value: string) => void;
  storeValue: string;
}

const PlanSelect = memo(function PlanSelect({ label, planKey, options, onCommit, storeValue }: PlanSelectProps) {
  return (
    <div className="prow">
      <span className="plbl">{label}</span>
      <select value={storeValue} onChange={e => onCommit(planKey, e.target.value)}
        style={{ flex:1, background:'var(--c-bg-input)', border:'1px solid var(--c-border-bright)', color:'var(--c-text-base)', fontFamily:'Roboto Mono,monospace', fontSize:'9.5px', padding:'1px 4px', borderRadius:'2px', outline:'none' }}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
});

// ─── Group title ─────────────────────────────────────────────────────────────

const GROUP = memo(function GROUP({ title }: { title: string }) {
  return <div className="pgroup-title">{title}</div>;
});

const AngleCheck = memo(function AngleCheck({
  isValid,
  deviation,
  tolerance,
  onCorrect,
}: {
  isValid: boolean;
  deviation: number;
  tolerance: number;
  onCorrect: () => void;
}) {
  const color = isValid ? PLANNING_COLOR : PLANNING_WARNING_COLOR;
  return (
    <div
      role="status"
      aria-live="polite"
      data-planning-angle-status={isValid ? 'valid' : 'warning'}
      style={{
        display: 'flex', alignItems: 'center', gap: '7px', margin: '5px 8px 7px', padding: '6px 7px',
        border: `1px solid ${isValid ? 'rgba(216,223,49,0.28)' : 'rgba(255,77,87,0.48)'}`,
        background: isValid ? 'rgba(216,223,49,0.035)' : 'rgba(255,77,87,0.07)', borderRadius: '2px',
      }}
    >
      <span aria-hidden="true" style={{ color, fontSize: '11px', lineHeight: 1 }}>{isValid ? '●' : '▲'}</span>
      <span style={{ flex: 1, minWidth: 0, fontFamily: 'Roboto Mono, monospace' }}>
        <strong style={{ display: 'block', color, fontSize: '8.5px', letterSpacing: '0.45px' }}>
          {isValid ? 'ANGLE OK' : 'ANGLE OUT OF RANGE'}
        </strong>
        <span style={{ color: 'var(--c-text-mid)', fontSize: '7.5px' }}>{deviation.toFixed(1)}° / ±{tolerance}° protocol tolerance</span>
      </span>
      {!isValid ? (
        <button
          type="button"
          onClick={onCorrect}
          style={{
            border: `1px solid ${color}`, background: 'rgba(255,77,87,0.08)', color,
            fontFamily: 'Roboto Mono, monospace', fontSize: '7.5px', padding: '3px 5px', cursor: 'pointer', borderRadius: '2px',
          }}
        >
          CORRECT ANGLE
        </button>
      ) : null}
    </div>
  );
});

// ─── Slider (planning) ───────────────────────────────────────────────────────

interface PlanSliderProps {
  label: string;
  planKey: keyof PlanningObject;
  min: number; max: number; step?: number; unit?: string;
  onCommit: (key: keyof PlanningObject, value: number) => void;
  storeValue: number;
}

const PlanSlider = memo(function PlanSlider({ label, planKey, min, max, step = 1, unit, onCommit, storeValue }: PlanSliderProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const displayValue = draft ?? String(storeValue);

  const commitDraft = useCallback(() => {
    const parsed = Number(draft);
    if (draft !== null && Number.isFinite(parsed)) {
      onCommit(planKey, Math.max(min, Math.min(max, parsed)));
    }
    setDraft(null);
  }, [draft, max, min, onCommit, planKey]);

  const updateDraft = useCallback((value: string) => {
    setDraft(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      onCommit(planKey, Math.max(min, Math.min(max, parsed)));
    }
  }, [max, min, onCommit, planKey]);

  return (
    <div style={{ padding:'3px 8px 4px', borderBottom:'1px solid var(--c-border-faint)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', marginBottom:'2px' }}>
        <span className="plbl" style={{ flex:'unset' }}>{label}</span>
        <span style={{ color:'var(--c-cyan)', fontFamily:'Roboto Mono,monospace', fontSize:'9px' }}>{storeValue.toFixed(step < 1 ? 1 : 0)}{unit}</span>
      </div>
      <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
        <input type="range" min={min} max={max} step={step} value={storeValue}
          aria-label={label}
          onChange={e => onCommit(planKey, Number(e.target.value))}
          style={{ flex:1 }} />
        <input type="text" inputMode="decimal" value={displayValue}
          aria-label={`${label} value`}
          onFocus={() => setDraft(String(storeValue))}
          onChange={e => updateDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setDraft(null); }}
          style={{ width:'44px', background:'var(--c-bg-input)', border:'1px solid var(--c-border-bright)', color:'var(--c-text-base)', fontFamily:'Roboto Mono,monospace', fontSize:'9px', padding:'1px 4px', borderRadius:'2px', outline:'none' }}
        />
      </div>
    </div>
  );
});

// ─── Result strip ─────────────────────────────────────────────────────────────

const ResultStrip = memo(function ResultStrip() {
  const calcTA = useWorkstationStore(s => s.calcTA);
  const calcSNR = useWorkstationStore(s => s.calcSNR);
  const calcContrast = useWorkstationStore(s => s.calcContrast);
  const calcRes = useWorkstationStore(s => s.calcRes);
  const snrColor = calcSNR >= 60 ? 'var(--c-green)' : calcSNR >= 30 ? 'var(--c-amber)' : 'var(--c-red)';
  const snrLabel = calcSNR >= 60 ? 'High' : calcSNR >= 30 ? 'Med' : 'Low';
  return (
    <div style={{ padding:'5px 8px', borderTop:'2px solid var(--c-border)', background:'var(--c-bg-dark)', flexShrink:0 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'4px', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:'7px', color:'var(--c-text-muted)', marginBottom:'1px' }}>CALC TA</div>
          <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'14px', fontWeight:700, color:'var(--c-green)', letterSpacing:'1px' }}>{calcTA}</div>
        </div>
        <div>
          <div style={{ fontSize:'7px', color:'var(--c-text-muted)', marginBottom:'1px' }}>SNR</div>
          <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'12px', fontWeight:700, color:snrColor }}>{calcSNR} <span style={{ fontSize:'7px' }}>{snrLabel}</span></div>
        </div>
        <div>
          <div style={{ fontSize:'7px', color:'var(--c-text-muted)', marginBottom:'1px' }}>CONTRAST</div>
          <div style={{ fontSize:'8px', fontWeight:700, color:'var(--c-cyan)', background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', borderRadius:'2px', padding:'1px 3px', display:'inline-block', lineHeight:'1.3' }}>{calcContrast}</div>
        </div>
        <div>
          <div style={{ fontSize:'7px', color:'var(--c-text-muted)', marginBottom:'1px' }}>RES mm</div>
          <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'8.5px', color:'var(--c-text-mid)' }}>{calcRes[0].toFixed(1)}×{calcRes[1].toFixed(1)}×{calcRes[2]}</div>
        </div>
      </div>
    </div>
  );
});

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function ParameterPanel() {
  const [tab, setTab] = useState(0);
  const tabs = ['Routine', 'Contrast', 'Resolution', 'Geometry', 'Sequence', 'System', 'Physio', 'Inline'];

  const params = useWorkstationStore(s => s.params);
  const planning = useWorkstationStore(s => s.planning);
  const setParam = useWorkstationStore(s => s.setParam);
  const setPlanning = useWorkstationStore(s => s.setPlanning);
  const setPlanningOrientation = useWorkstationStore(s => s.setPlanningOrientation);
  const setStatusMsg = useWorkstationStore(s => s.setStatusMsg);
  const angleStatus = getPlanningAngleStatus(planning);

  const commitParam = useCallback((key: keyof ParamsState, value: number | string) => {
    setParam(key, value);
  }, [setParam]);

  const commitPlan = useCallback((key: keyof PlanningObject, value: number | string) => {
    if (key === 'orientation') {
      setPlanningOrientation(value as PlanningObject['orientation']);
    } else {
      setPlanning({ [key]: value } as Partial<PlanningObject>);
    }
  }, [setPlanning, setPlanningOrientation]);

  const correctPlanningAngle = useCallback(() => {
    setPlanning({ rotX: 0, rotY: 0, rotZ: 0 });
    setStatusMsg('Planning angle corrected to protocol orientation');
  }, [setPlanning, setStatusMsg]);

  // Shorthand helpers
  const P = (label: string, pid: keyof ParamsState, unit?: string, type: 'number' | 'text' = 'number', min?: number, max?: number) => (
    <ParamInput key={pid} label={label} paramKey={pid} unit={unit} type={type}
      storeValue={params[pid]} onCommit={commitParam} min={min} max={max} />
  );

  const SEL = (label: string, pid: keyof ParamsState, opts: string[]) => (
    <ParamSelect key={`${pid}-sel`} label={label} paramKey={pid} options={opts}
      storeValue={String(params[pid])} onCommit={commitParam} />
  );

  // Planning-object shortcuts
  const PL = (label: string, pk: keyof PlanningObject, unit?: string, type: 'number' | 'text' = 'number', min?: number, max?: number) => (
    <PlanInput key={pk} label={label} planKey={pk} unit={unit} type={type}
      storeValue={planning[pk] as number | string} onCommit={commitPlan} min={min} max={max} />
  );

  const PSL = (label: string, pk: keyof PlanningObject, min: number, max: number, unit?: string, step?: number) => (
    <PlanSlider key={`${pk}-sl`} label={label} planKey={pk} min={min} max={max} step={step}
      unit={unit} storeValue={Number(planning[pk])} onCommit={commitPlan} />
  );

  const PSEL = (label: string, pk: keyof PlanningObject, opts: string[]) => (
    <PlanSelect key={`${pk}-psel`} label={label} planKey={pk} options={opts}
      storeValue={String(planning[pk])} onCommit={commitPlan} />
  );

  return (
    <div style={{ width:'380px', display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'var(--c-bg-panel)', flexShrink:0, borderLeft:'1px solid var(--c-border)' }}>
      {/* Tabs */}
      <div className="tab-bar" style={{ flexShrink:0, flexWrap:'wrap' }}>
        {tabs.map((t, i) => (
          <button key={t} className={`tab-btn${i === tab ? ' active' : ''}`} onClick={() => setTab(i)}
            style={{ padding:'4px 8px', fontSize:'8.5px' }}>{t}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        {/* ── Tab 0: Routine (slice geometry + timing) ── */}
        {tab === 0 && (<>
          <GROUP title="GEOMETRY" />
          <AngleCheck {...angleStatus} onCorrect={correctPlanningAngle} />
          {PSL('FoV read',       'fovRead',     100, 500, ' mm', 1)}
          {PSL('FoV phase',      'fovPhase',    100, 500, ' mm', 1)}
          {PSL('Slice Count',    'sliceCount',     1, 200,  ' sl', 1)}
          {PSL('Thickness',      'sliceThickness', 0.5, 20, ' mm', 0.5)}
          {PSL('Slice Gap',      'sliceGap',       -5, 20,  ' mm', 0.1)}
          {PSEL('Phase enc. dir','phaseDir', ['AP','RL','HF'])}
          {P('Matrix',           'matrix',           '',      'number', 64, 1024)}
          {PSEL('Orientation',   'orientation',   ['axial','coronal','sagittal'])}
          <GROUP title="TIMING" />
          {P('TR',               'tr',             'ms', 'number', 20, 15000)}
          {P('TE',               'te',             'ms', 'number', 1, 500)}
          {P('Averages',         'averages',       '',   'number', 1, 16)}
          {P('Concatenations',   'concatenations', '',   'number', 1, 4)}
        </>)}

        {/* ── Tab 1: Contrast (RF params) ── */}
        {tab === 1 && (<>
          <GROUP title="PULSE PARAMETERS" />
          {P('Flip Angle',       'flipAngle',      '°',    'number', 1, 180)}
          {SEL('Fat Suppression','fatSat',         ['None','Fat Sat','SPAIR','STIR','Water Exc'])}
          {P('Inversion TI',     'ti',             'ms',   'number', 0, 5000)}
          {P('Bandwidth',        'bandwidth',      'Hz/Px','number', 20, 1000)}
          <GROUP title="MAGNETIZATION" />
          {SEL('Mag. Transfer',  'filter',         ['Off','On'])}
        </>)}

        {/* ── Tab 2: Resolution (matrix, k-space) ── */}
        {tab === 2 && (<>
          <GROUP title="MATRIX / RESOLUTION" />
          {P('Base Resolution',  'matrix',           '',      'number', 64, 1024)}
          {SEL('Phase P. Fourier','partialFourier',  ['Off','7/8','6/8','5/8','Half'])}
          {SEL('Interpolation',  'filter',           ['On','Off'])}
          <GROUP title="BANDWIDTH / ACCELERATION" />
          {P('Pixel Bandwidth',  'bandwidth',        'Hz/Px', 'number', 20, 1000)}
          {SEL('Parallel Imaging', 'parallelImaging', ['None','Acceleration ×2','Acceleration ×3','Acceleration ×4'])}
        </>)}

        {/* ── Tab 3: Geometry (FOV, orientation, rotation) ── */}
        {tab === 3 && (<>
          <GROUP title="FIELD OF VIEW" />
          <AngleCheck {...angleStatus} onCorrect={correctPlanningAngle} />
          {PSL('FoV Read',       'fovRead',     100, 500, ' mm', 1)}
          {PSL('FoV Phase',      'fovPhase',    100, 500, ' mm', 1)}
          <GROUP title="ORIENTATION" />
          {PSEL('Orientation',   'orientation',   ['axial','coronal','sagittal'])}
          {PSEL('Phase Dir',     'phaseDir',      ['AP','RL','HF'])}
          <GROUP title="ROTATION" />
          {PSL('Rotation X (Pitch)', 'rotX',   -45, 45, '°', 0.5)}
          {PSL('Rotation Y (Yaw)',   'rotY',   -45, 45, '°', 0.5)}
          {PSL('Rotation Z (Roll)',  'rotZ',   -45, 45, '°', 0.5)}
          <GROUP title="POSITION (mm from iso)" />
          {PL('Center X (R/L)',  'centerX',     'mm', 'number', -150, 150)}
          {PL('Center Y (A/P)',  'centerY',     'mm', 'number', -150, 150)}
          {PL('Center Z (H/F)',  'centerZ',     'mm', 'number', -150, 150)}
          <GROUP title="SLICE DETAILS" />
          {PSL('Slice Count',    'sliceCount',  1, 200,  ' sl', 1)}
          {PSL('Thickness',      'sliceThickness', 0.5, 20, ' mm', 0.5)}
          {PSL('Slice Gap',      'sliceGap',    -5, 20,   ' mm', 0.1)}
        </>)}

        {/* ── Tab 4: Sequence (TSE/GRE settings) ── */}
        {tab === 4 && (<>
          <GROUP title="SEQUENCE" />
          <div className="prow">
            <span className="plbl">Seq Type</span>
            <span style={{ color:'var(--c-text-subtle)', fontSize:'9px', fontFamily:'Roboto Mono,monospace' }}>TSE — Turbo Spin Echo</span>
          </div>
          {P('Turbo Factor',     'turboFactor',    '',   'number', 1, 64)}
          {P('Echo Train Len',   'etl',            '',   'number', 1, 64)}
          {SEL('k-space Fill',   'filter',         ['Linear','Centric','Elliptical Centric'])}
          {SEL('Acceleration',   'parallelImaging',['None','Acceleration ×2','Acceleration ×3','Acceleration ×4'])}
        </>)}

        {/* ── Tab 5: System ── */}
        {tab === 5 && (<>
          <GROUP title="SYSTEM" />
          {SEL('Shim Mode',      'autoAlign',      ['Standard','Advanced','Tune Up','Body'])}
          {SEL('RF Spoiling',    'filter',         ['On','Off'])}
          {SEL('Gradient Mode',  'filter',         ['Normal','Fast','Ultra-Fast','Whisper'])}
          {P('Coil Selection',   'coil',           '', 'text')}
        </>)}

        {/* ── Tab 6: Physio gating ── */}
        {tab === 6 && (<>
          <GROUP title="GATING" />
          {SEL('Cardiac Gating', 'filter',         ['None','ECG Trigger','PPU','VCG'])}
          {SEL('Resp. Gating',   'autoAlign',      ['Off','Navigator Echo','Bellows'])}
          {P('Trigger Delay',    'ti',             'ms', 'number', 0, 2000)}
        </>)}

        {/* ── Tab 7: Inline Processing ── */}
        {tab === 7 && (<>
          <GROUP title="INLINE PROCESSING" />
          {SEL('DWI Calc',       'filter',         ['None','Trace','ADC','All'])}
          {SEL('MIP Recon',      'autoAlign',      ['Off','On'])}
          {SEL('Normalize',      'parallelImaging',['Prescan Norm','None'])}
          {SEL('Diffusion Mode', 'parallelImaging',['None','3 Scan Trace','RESOLVE'])}
        </>)}
      </div>

      <ResultStrip />
    </div>
  );
}
