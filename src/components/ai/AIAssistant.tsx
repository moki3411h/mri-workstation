'use client';
import { useState } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { toast } from '@/lib/toast';

const SUGGESTIONS: Record<string, string> = {
  'stroke':   'Acute Stroke Protocol: DWI b1000, ADC Map, T2 FLAIR TRA, T2* GRE/SWI, MRA Circle of Willis',
  'dwi':      'DWI Protocol: DWI b0/b1000, ADC Map, FLAIR TRA, GRE TRA',
  'tumor':    'Brain Tumor Protocol: T1 SAG, T2 TRA, FLAIR TRA, DWI, T1+Gd TRA/COR/SAG',
  'mass':     'Brain Mass Protocol: T2 TRA 512, FLAIR, T1+Gd multi-plane, SWI, MRS',
  'ms':       'MS Monitoring Protocol: FLAIR TRA/SAG (3D), T1+Gd TRA (if active), DWI',
  'sclerosis':'MS Protocol: T2 FLAIR TRA (3D), T2 SAG, T1 after Gd if active lesions suspected',
  'routine':  'Routine Brain: T1 SAG, T2 TRA, FLAIR TRA, DWI, SWI, T1+Gd (if indicated)',
  'brain':    'Standard Brain Protocol: Scout, T1 SAG DF, T2 TSE TRA, FLAIR TRA, DWI',
  'spine':    'Cervical Spine: Scout, T2 SAG, T1 SAG, T2 TRA per disc level, STIR SAG (if trauma)',
  'pituitary':'Pituitary Protocol: T1 SAG thin 2mm, T1 COR 2mm, T1+Gd dynamic COR, T2 COR',
  'aneurysm': 'Aneurysm protocol: 3D time-of-flight MRA, 3D T1 gradient echo, susceptibility imaging, and T2 fast spin echo.',
};

const PROTOCOLS = [
  { label:'Stroke',   keys:['stroke','DWI','diffusion','acute'] },
  { label:'Tumor',    keys:['tumor','mass','glioma','metastasis'] },
  { label:'MS',       keys:['ms','sclerosis','demyelination','white matter'] },
  { label:'Routine',  keys:['routine','standard','brain','general'] },
  { label:'Spine',    keys:['spine','cervical','lumbar','disc'] },
];

function getSuggestion(input: string): string {
  const lower = input.toLowerCase();
  for (const [key, text] of Object.entries(SUGGESTIONS)) {
    if (lower.includes(key)) return text;
  }
  return 'Routine Brain Protocol recommended for unspecified brain MRI indication. Include: Scout, T1 SAG, T2 TRA, FLAIR TRA, DWI.';
}

export default function AIAssistant() {
  const { toggleAI, params, planning, calcTA, calcSNR, setStatusMsg, sequences, selectedSeqId } = useWorkstationStore();
  const [input, setInput] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const selectedSeq = sequences.find(s => s.id === selectedSeqId);

  const paramHints: string[] = [];
  if ((selectedSeq?.sarPct ?? 0) > 85) paramHints.push('⚠ High SAR — consider reducing flip angle or TR to protect patient.');
  if (calcTA > '04:00') paramHints.push('⏱ Long scan time — consider generic parallel-imaging acceleration ×2 in the Resolution tab.');
  if (params.te > 100) paramHints.push('📡 Very long TE — significant signal loss expected. Consider reducing TE for SNR.');
  if (planning.sliceCount > 50 && params.concatenations < 2) paramHints.push('📐 Many slices — increase Concatenations to avoid geometry issues.');
  if (params.averages >= 3) paramHints.push('🔁 High averages — scan time increases linearly. Consider reducing if tolerable.');
  if (calcSNR < 20) paramHints.push('📉 Low SNR estimate — increase FOV, thickness, or averages for acceptable image quality.');

  return (
    <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'360px', background:'var(--c-bg-panel)', borderLeft:'1px solid var(--c-border-accent)', zIndex:800, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'-4px 0 24px rgba(0,0,0,0.5)' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderBottom:'1px solid var(--c-border)', background:'rgba(14,165,233,0.05)', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:'12px', fontWeight:700, color:'var(--c-text-bright)' }}>🤖 AI Protocol Assistant</div>
          <div style={{ fontSize:'8.5px', color:'var(--c-text-subtle)', marginTop:'1px' }}>Educational suggestions — not clinical advice</div>
        </div>
        <button onClick={toggleAI} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'var(--c-text-mid)', fontSize:'18px', cursor:'pointer' }}>✕</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px', display:'flex', flexDirection:'column', gap:'12px' }}>

        {/* Notice */}
        <div style={{ padding:'6px 10px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'2px', fontSize:'8.5px', color:'#d97706' }}>
          ⚕ Educational AI only. Suggestions are for training purposes and must never be used for patient diagnosis or clinical decisions.
        </div>

        {/* Protocol Suggestion */}
        <div style={{ padding:'10px', background:'var(--c-bg-card)', border:'1px solid var(--c-border)', borderRadius:'2px' }}>
          <div style={{ fontSize:'9px', fontWeight:700, color:'var(--c-cyan)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Protocol Suggestion</div>
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            placeholder="Describe clinical indication... (e.g., 'acute stroke', 'suspected glioma', 'MS follow-up')"
            style={{ width:'100%', height:'56px', background:'var(--c-bg-input)', border:'1px solid var(--c-border-bright)', color:'var(--c-text-base)', fontFamily:'Roboto Mono,monospace', fontSize:'9px', padding:'5px 8px', borderRadius:'2px', outline:'none', resize:'none' }}
          />
          <button
            onClick={()=>{ if (input.trim()) { setSuggestion(getSuggestion(input)); toast('Protocol suggestion generated','success'); } }}
            style={{ marginTop:'6px', width:'100%', padding:'5px', fontSize:'9.5px', fontWeight:600, background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.3)', color:'var(--c-cyan)', cursor:'pointer', borderRadius:'2px' }}
          >
            Generate Suggestion ▶
          </button>
          {suggestion && (
            <div style={{ marginTop:'8px', padding:'8px', background:'rgba(34,211,238,0.05)', border:'1px solid rgba(34,211,238,0.15)', borderRadius:'2px' }}>
              <div style={{ fontSize:'8px', color:'var(--c-cyan)', fontWeight:700, marginBottom:'4px' }}>SUGGESTED PROTOCOL:</div>
              <div style={{ fontSize:'9.5px', color:'var(--c-text-base)', lineHeight:'1.55' }}>{suggestion}</div>
            </div>
          )}
        </div>

        {/* Current parameter hints */}
        {paramHints.length > 0 && (
          <div style={{ padding:'10px', background:'var(--c-bg-card)', border:'1px solid var(--c-border)', borderRadius:'2px' }}>
            <div style={{ fontSize:'9px', fontWeight:700, color:'var(--c-amber)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>⚡ Parameter Hints</div>
            {paramHints.map((h,i) => (
              <div key={i} style={{ fontSize:'9.5px', color:'var(--c-text-base)', padding:'5px 0', borderBottom:'1px solid var(--c-border-faint)', lineHeight:'1.4' }}>{h}</div>
            ))}
          </div>
        )}

        {/* Quick protocol buttons */}
        <div style={{ padding:'10px', background:'var(--c-bg-card)', border:'1px solid var(--c-border)', borderRadius:'2px' }}>
          <div style={{ fontSize:'9px', fontWeight:700, color:'var(--c-cyan)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Quick Protocols</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
            {PROTOCOLS.map(p => (
              <button key={p.label}
                onClick={()=>{ const s = getSuggestion(p.keys[0]!); setSuggestion(s); setInput(p.label); setStatusMsg(`AI protocol: ${p.label}`); toast(`${p.label} protocol loaded`,'success'); }}
                style={{ fontSize:'9px', padding:'4px 10px', background:'var(--c-bg-elevated)', border:'1px solid var(--c-border-bright)', color:'var(--c-text-mid)', cursor:'pointer', borderRadius:'2px', transition:'all 0.1s' }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='var(--c-cyan)';(e.currentTarget as HTMLElement).style.borderColor='var(--c-cyan)';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='var(--c-text-mid)';(e.currentTarget as HTMLElement).style.borderColor='var(--c-border-bright)';}}
              >{p.label}</button>
            ))}
          </div>
        </div>

        {/* Current session summary */}
        <div style={{ padding:'10px', background:'var(--c-bg-card)', border:'1px solid var(--c-border)', borderRadius:'2px' }}>
          <div style={{ fontSize:'9px', fontWeight:700, color:'var(--c-cyan)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Current Session</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px', fontSize:'8.5px' }}>
            <div style={{ color:'var(--c-text-subtle)' }}>Active Seq:</div><div style={{ color:'var(--c-text-mid)', fontFamily:'Roboto Mono,monospace' }}>{selectedSeq?.name?.slice(0,18) ?? '—'}</div>
            <div style={{ color:'var(--c-text-subtle)' }}>Calc TA:</div><div style={{ color:'var(--c-green)', fontFamily:'Roboto Mono,monospace' }}>{calcTA}</div>
            <div style={{ color:'var(--c-text-subtle)' }}>SNR Estimate:</div><div style={{ color: calcSNR>=60?'var(--c-green)':calcSNR>=30?'var(--c-amber)':'var(--c-red)', fontFamily:'Roboto Mono,monospace' }}>{calcSNR}</div>
            <div style={{ color:'var(--c-text-subtle)' }}>TR / TE:</div><div style={{ color:'var(--c-text-mid)', fontFamily:'Roboto Mono,monospace' }}>{params.tr} / {params.te}ms</div>
          </div>
        </div>
      </div>
    </div>
  );
}
