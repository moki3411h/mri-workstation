'use client';
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import type { ParamsState } from '@/store/workstationStore';

// ─── Stable input component (NEVER remounts on parent re-render) ───────────────
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
  // LOCAL state — never loses focus because parent re-render doesn't touch this
  const [local, setLocal] = useState(String(storeValue));
  const inputRef = useRef<HTMLInputElement>(null);

  // Only sync from store when not focused (e.g. external change like selectSeq)
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocal(String(storeValue));
    }
  }, [storeValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocal(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    const val = type === 'number' ? Number(local) : local;
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
    if (e.key === 'Enter') { inputRef.current?.blur(); }
    // Arrow up/down for number fields
    if (type === 'number') {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const n = Math.min((max ?? Infinity), Number(local) + step);
        setLocal(String(n)); onCommit(paramKey, n);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const n = Math.max((min ?? -Infinity), Number(local) - step);
        setLocal(String(n)); onCommit(paramKey, n);
      }
    }
  }, [local, type, min, max, step, paramKey, onCommit]);

  return (
    <div className="prow">
      <span className="plbl">{label}</span>
      <input
        ref={inputRef}
        type={type === 'number' ? 'text' : 'text'}
        inputMode={type === 'number' ? 'decimal' : 'text'}
        value={local}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="pinput"
        autoComplete="off"
        spellCheck={false}
      />
      {unit && <span className="punit">{unit}</span>}
    </div>
  );
});

// ─── Stable select component ──────────────────────────────────────────────────
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
      <select
        value={storeValue}
        onChange={e => onCommit(paramKey, e.target.value)}
        style={{ flex:1, background:'#060b14', border:'1px solid #263040', color:'#94a3b8', fontFamily:'Roboto Mono,monospace', fontSize:'9.5px', padding:'1px 4px', borderRadius:'2px', outline:'none' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
});

// ─── Group title ──────────────────────────────────────────────────────────────
const GROUP = memo(function GROUP({ title }: { title: string }) {
  return <div className="pgroup-title">{title}</div>;
});

// ─── Result strip (memoized separately) ──────────────────────────────────────
const ResultStrip = memo(function ResultStrip() {
  const calcTA = useWorkstationStore(s => s.calcTA);
  const calcSNR = useWorkstationStore(s => s.calcSNR);
  const calcContrast = useWorkstationStore(s => s.calcContrast);
  const calcRes = useWorkstationStore(s => s.calcRes);
  const snrColor = calcSNR >= 60 ? '#22c55e' : calcSNR >= 30 ? '#f59e0b' : '#ef4444';
  const snrLabel = calcSNR >= 60 ? 'High' : calcSNR >= 30 ? 'Med' : 'Low';
  return (
    <div style={{ padding:'5px 8px', borderTop:'2px solid #1e293b', background:'#08101c', flexShrink:0 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'4px', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:'7px', color:'#334155', marginBottom:'1px' }}>CALC TA</div>
          <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'14px', fontWeight:700, color:'#22c55e', letterSpacing:'1px' }}>{calcTA}</div>
        </div>
        <div>
          <div style={{ fontSize:'7px', color:'#334155', marginBottom:'1px' }}>SNR</div>
          <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'12px', fontWeight:700, color:snrColor }}>{calcSNR} <span style={{ fontSize:'7px' }}>{snrLabel}</span></div>
        </div>
        <div>
          <div style={{ fontSize:'7px', color:'#334155', marginBottom:'1px' }}>CONTRAST</div>
          <div style={{ fontSize:'8px', fontWeight:700, color:'#22d3ee', background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', borderRadius:'2px', padding:'1px 3px', display:'inline-block', lineHeight:'1.3' }}>{calcContrast}</div>
        </div>
        <div>
          <div style={{ fontSize:'7px', color:'#334155', marginBottom:'1px' }}>RES mm</div>
          <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'8.5px', color:'#64748b' }}>{calcRes[0].toFixed(1)}×{calcRes[1].toFixed(1)}×{calcRes[2]}</div>
        </div>
      </div>
    </div>
  );
});

// ─── Slider row (local state) ─────────────────────────────────────────────────
interface SliderRowProps {
  label: string;
  paramKey: keyof ParamsState;
  min: number; max: number; step?: number; unit?: string;
  onCommit: (key: keyof ParamsState, value: number) => void;
  storeValue: number;
}

const SliderRow = memo(function SliderRow({ label, paramKey, min, max, step=1, unit, onCommit, storeValue }: SliderRowProps) {
  const [local, setLocal] = useState(storeValue);
  useEffect(() => { setLocal(storeValue); }, [storeValue]);

  return (
    <div style={{ padding:'3px 8px 4px', borderBottom:'1px solid #0d1520' }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', marginBottom:'2px' }}>
        <span className="plbl" style={{ flex:'unset' }}>{label}</span>
        <span style={{ color:'#22d3ee', fontFamily:'Roboto Mono,monospace', fontSize:'9px' }}>{local}{unit}</span>
      </div>
      <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
        <input type="range" min={min} max={max} step={step} value={local}
          onChange={e => { const v = Number(e.target.value); setLocal(v); onCommit(paramKey, v); }}
          style={{ flex:1 }} />
        <input type="text" inputMode="decimal" value={String(local)}
          onChange={e => { const v = Number(e.target.value); if (!isNaN(v)) { setLocal(v); onCommit(paramKey, v); } }}
          style={{ width:'44px', background:'#060b14', border:'1px solid #263040', color:'#94a3b8', fontFamily:'Roboto Mono,monospace', fontSize:'9px', padding:'1px 4px', borderRadius:'2px', outline:'none' }}
        />
      </div>
    </div>
  );
});

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function ParameterPanel() {
  const [tab, setTab] = useState(0);
  const tabs = ['Routine','Contrast','Resolution','Geometry','Sequence','System','Physio','Inline'];

  // Pull params + action from store (stable selector avoids re-renders on non-param changes)
  const params = useWorkstationStore(s => s.params);
  const setParam = useWorkstationStore(s => s.setParam);
  const applyParams = useWorkstationStore(s => s.applyParams);

  // Stable commit callback — never changes identity
  const commit = useCallback((key: keyof ParamsState, value: number | string) => {
    setParam(key, value);
  }, [setParam]);

  const P = (label: string, pid: keyof ParamsState, unit?: string, type: 'number'|'text' = 'number', min?: number, max?: number) => (
    <ParamInput key={pid} label={label} paramKey={pid} unit={unit} type={type}
      storeValue={params[pid]} onCommit={commit} min={min} max={max} />
  );

  const SEL = (label: string, pid: keyof ParamsState, opts: string[]) => (
    <ParamSelect key={`${pid}-sel`} label={label} paramKey={pid} options={opts}
      storeValue={String(params[pid])} onCommit={commit} />
  );

  const SL = (label: string, pid: keyof ParamsState, min: number, max: number, unit?: string, step?: number) => (
    <SliderRow key={`${pid}-sl`} label={label} paramKey={pid} min={min} max={max} step={step}
      unit={unit} storeValue={Number(params[pid])} onCommit={commit} />
  );

  return (
    <div style={{ width:'380px', display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'#0a1220', flexShrink:0, borderLeft:'1px solid #1e293b' }}>
      {/* Tabs */}
      <div className="tab-bar" style={{ flexShrink:0, flexWrap:'wrap' }}>
        {tabs.map((t,i) => (
          <button key={t} className={`tab-btn${i===tab?' active':''}`} onClick={() => setTab(i)}
            style={{ padding:'4px 8px', fontSize:'8.5px' }}>{t}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>
        {tab === 0 && (<>
          <GROUP title="SLICE GROUP" />
          {P('Slices',         'slices',         'slices', 'number', 1, 256)}
          {SL('Slice Thickness','thickness', 0.5, 10, 'mm', 0.5)}
          <GROUP title="TIMING" />
          {P('TR',             'tr',             'ms', 'number', 20, 15000)}
          {P('TE',             'te',             'ms', 'number', 1, 500)}
          {P('Averages',       'averages',       '', 'number', 1, 16)}
          {P('Concatenations', 'concatenations', '', 'number', 1, 4)}
          <GROUP title="GEOMETRY" />
          {P('FoV Read',       'fovRead',        'mm', 'number', 100, 500)}
          {P('FoV Phase',      'fovPhase',       '%', 'number', 50, 100)}
          {P('Matrix',         'matrix',         '', 'number', 64, 1024)}
          <GROUP title="ENCODING" />
          {SEL('Phase Enc',    'phaseEncoding',  ['AP','PA','RL','LR','HF','FH'])}
          {SEL('AutoAlign',    'autoAlign',      ['Head > Basis','Head > AC-PC','Spine','Off'])}
          {SEL('Filter',       'filter',         ['Prescan Normalize','None','Elliptical','Raw'])}
          {P('Position',       'position',       '', 'text')}
        </>)}

        {tab === 1 && (<>
          <GROUP title="PULSE PARAMETERS" />
          {P('Flip Angle',     'flipAngle',      '°', 'number', 1, 180)}
          {SEL('Fat Suppression','fatSat',       ['None','Fat Sat','SPAIR','STIR','Water Exc'])}
          {P('Inversion TI',   'ti',             'ms', 'number', 0, 5000)}
          {P('Bandwidth',      'bandwidth',      'Hz/Px', 'number', 20, 1000)}
          <GROUP title="MAGNETIZATION" />
          {SEL('Magn. Transfer','filter',        ['Off','On'])}
        </>)}

        {tab === 2 && (<>
          <GROUP title="MATRIX / RESOLUTION" />
          {P('Base Resolution','matrix',         '', 'number', 64, 1024)}
          {SEL('Phase P. Fourier','etl',         ['6/8','7/8','5/8','Off'])}
          {SEL('Interpolation','filter',         ['On','Off'])}
          <GROUP title="BANDWIDTH / iPAT" />
          {P('Pixel Bandwidth', 'bandwidth',     'Hz/Px', 'number', 20, 1000)}
          {SEL('iPAT / GRAPPA','parallelImaging',['None','GRAPPA ×2','GRAPPA ×3','SENSE ×2'])}
        </>)}

        {tab === 3 && (<>
          <GROUP title="DISTORTION" />
          {SEL('Dist Correction','filter',       ['3D','2D','Off'])}
          {P('Phase Oversampling','fovPhase',    '%', 'number', 0, 100)}
          {P('Slice Oversampling','thickness',   'mm', 'number', 0, 10)}
          {SEL('Readout Mode', 'phaseEncoding',  ['Symmetric','Asymmetric'])}
        </>)}

        {tab === 4 && (<>
          <GROUP title="SEQUENCE" />
          <div className="prow">
            <span className="plbl">Seq Type</span>
            <span style={{ color:'#475569', fontSize:'9px', fontFamily:'Roboto Mono,monospace' }}>TSE — Turbo Spin Echo</span>
          </div>
          {P('Turbo Factor',   'turboFactor',    '', 'number', 1, 64)}
          {P('Echo Train Len', 'etl',            '', 'number', 1, 64)}
          {SEL('k-space Fill', 'filter',         ['Linear','Centric','Elliptical Centric'])}
          {SEL('PAT Mode',     'parallelImaging',['GRAPPA','SENSE','None'])}
        </>)}

        {tab === 5 && (<>
          <GROUP title="SYSTEM" />
          {SEL('Shim Mode',    'autoAlign',      ['Standard','Advanced','Tune Up','Body'])}
          {SEL('RF Spoiling',  'filter',         ['On','Off'])}
          {SEL('Gradient Mode','phaseEncoding',  ['Normal','Fast','Ultra-Fast','Whisper'])}
          {P('Table Position', 'fovRead',        'mm', 'number', -200, 200)}
        </>)}

        {tab === 6 && (<>
          <GROUP title="GATING" />
          {SEL('Cardiac Gating','filter',        ['None','ECG Trigger','PPU','VCG'])}
          {SEL('Resp. Gating', 'autoAlign',      ['Off','Navigator Echo','Bellows'])}
          {P('Trigger Delay',  'ti',             'ms', 'number', 0, 2000)}
          {SEL('Seq Trigger',  'phaseEncoding',  ['Every TR','Every 2nd TR'])}
        </>)}

        {tab === 7 && (<>
          <GROUP title="INLINE PROCESSING" />
          {SEL('DWI Calc',     'filter',         ['None','Trace','ADC','All'])}
          {SEL('MIP Recon',    'autoAlign',      ['Off','On'])}
          {SEL('Normalize',    'phaseEncoding',  ['Prescan Norm','None'])}
          {SEL('Diffusion Mode','parallelImaging',['None','3 Scan Trace','RESOLVE'])}
        </>)}
      </div>

      <ResultStrip />
    </div>
  );
}
