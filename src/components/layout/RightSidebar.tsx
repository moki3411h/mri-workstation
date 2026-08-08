'use client';
import { useState } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { toast } from '@/lib/toast';

const WL_PRESETS: Record<string, { window: number; level: number }> = {
  'Brain':       { window: 1200, level: 600 },
  'Bone':        { window: 2800, level: 1000 },
  'Soft Tissue': { window: 400,  level: 200 },
  'MRA':         { window: 600,  level: 300 },
};

const COILS = ['HE1','HE2','HE3','HE4','NE1','NE2','NE3','NE4','SP1','SP2','SP3','SP4'];
const _3D_MODES = ['MPR','MIP','MinIP','VRT','SSD'];

export default function RightSidebar() {
  const {
    scan, patient, safety, sequences, selectedSeqId,
    show, setShow, wl, setWL, stopScan, planningOverlayVisible,
  } = useWorkstationStore();

  const [tab, setTab] = useState(0);
  const [onCoils, setOnCoils] = useState<Set<string>>(new Set(['HE1','HE2','HE3','HE4','NE1','NE2']));
  const [mode3d, setMode3d] = useState('MPR');
  const [threshold, setThreshold] = useState(45);
  const [opacity, setOpacity] = useState(80);
  const [filmLayout, setFilmLayout] = useState('3x3');

  const tabs = ['Exam','Viewing','Filming','3D','Safety'];
  const selectedSeq = sequences.find(s => s.id === selectedSeqId);
  const axWL = wl.axial;

  const S = (k: string, v: string) => (
    <div style={{ display:'flex', padding:'3px 8px', borderBottom:'1px solid var(--c-border-faint)', fontSize:'9px' }}>
      <span style={{ color:'var(--c-text-muted)', flex:'0 0 75px', fontFamily:'Roboto Mono,monospace' }}>{k}</span>
      <span style={{ color:'var(--c-text-mid)' }}>{v}</span>
    </div>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'var(--c-bg-dark)', overflow:'hidden' }}>
      {/* Tabs */}
      <div className="tab-bar" style={{ flexShrink:0 }}>
        {tabs.map((t,i) => (
          <button key={t} className={`tab-btn${i===tab?' active':''}`} onClick={()=>setTab(i)} style={{ padding:'5px 7px', fontSize:'9px' }}>{t}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto', fontSize:'9.5px' }}>

        {/* EXAM TAB */}
        {tab===0 && (
          <div>
            <div className="pgroup-title" style={{ fontSize:'7.5px', padding:'3px 8px' }}>PATIENT INFO</div>
            {S('Name',    patient.name)}
            {S('DOB',     patient.dob)}
            {S('Sex',     patient.sex)}
            {S('Weight',  `${patient.weight} kg`)}
            {S('Study',   patient.study.slice(0,22))}

            <div className="pgroup-title" style={{ fontSize:'7.5px', padding:'3px 8px', marginTop:'4px' }}>SCANNER STATUS</div>
            {[['Magnet','Ready','var(--c-green)'],['Gradient','OK','var(--c-green)'],['RF Amp','Calibrated','var(--c-green)'],['Table','OK','var(--c-green)'],['SAR',`${selectedSeq?.sarPct??0}%`, selectedSeq && selectedSeq.sarPct>80?'var(--c-red)':'var(--c-green)']].map(([k,v,c])=>
              <div key={k} style={{ display:'flex', alignItems:'center', padding:'3px 8px', borderBottom:'1px solid var(--c-border-faint)', gap:'6px' }}>
                <span style={{ color:'var(--c-text-muted)', flex:'0 0 60px', fontSize:'8.5px', fontFamily:'Roboto Mono,monospace' }}>{k}</span>
                <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:c as string, boxShadow:`0 0 4px ${c}` }} />
                <span style={{ color:c as string, fontSize:'8.5px' }}>{v}</span>
              </div>
            )}

            <div className="pgroup-title" style={{ fontSize:'7.5px', padding:'3px 8px', marginTop:'4px' }}>COIL ELEMENTS</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'2px', padding:'4px 6px' }}>
              {COILS.map(c => (
                <button key={c} className={`coil-btn${onCoils.has(c)?' on':''}`}
                  onClick={()=>{ const n=new Set(onCoils); n.has(c)?n.delete(c):n.add(c); setOnCoils(n); }}
                  style={{ fontSize:'8px', padding:'2px 1px', fontFamily:'Roboto Mono,monospace' }}
                >{c}</button>
              ))}
            </div>

            <div className="pgroup-title" style={{ fontSize:'7.5px', padding:'3px 8px', marginTop:'4px' }}>QUICK ACTIONS</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3px', padding:'5px 6px' }}>
              {[
                ['Prescan',      ()=>toast('Prescan running…')],
                ['Adjust Shim',  ()=>toast('Shim adjusted ✓','success')],
                ['AutoAlign',    ()=>toast('AutoAlign complete ✓','success')],
                ['⚠ Abort',      ()=>{stopScan();toast('Scan aborted','error');}],
              ].map(([label,action])=>(
                <button key={label as string} onClick={action as ()=>void}
                  style={{ fontSize:'8.5px', background:'var(--c-bg-elevated)', border:'1px solid var(--c-border-bright)', color:'var(--c-text-mid)', padding:'3px 6px', cursor:'pointer', borderRadius:'2px' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color='var(--c-text-base)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color='var(--c-text-mid)';}}
                >{label as string}</button>
              ))}
            </div>
          </div>
        )}

        {/* VIEWING TAB */}
        {tab===1 && (
          <div style={{ padding:'6px' }}>
            {[
              ['Window', axWL.window, 0, 4000, (v:number)=>setWL('axial',{window:v})],
              ['Level',  axWL.level,  0, 2000, (v:number)=>setWL('axial',{level:v})],
              ['Zoom',   100,         50, 400, (_v:number)=>{}],
            ].map(([label,val,min,max,fn])=>(
              <div key={label as string} style={{ marginBottom:'6px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px', fontSize:'9px' }}>
                  <span style={{ color:'var(--c-text-subtle)' }}>{label as string}</span>
                  <span style={{ color:'var(--c-cyan)', fontFamily:'Roboto Mono,monospace', fontSize:'9px' }}>{val as number}</span>
                </div>
                <input type="range" min={min as number} max={max as number} value={val as number} onChange={e=>(fn as (v:number)=>void)(+e.target.value)} style={{ width:'100%' }} />
              </div>
            ))}

            <div style={{ fontSize:'8.5px', color:'var(--c-text-subtle)', marginBottom:'3px', marginTop:'6px' }}>WL Presets</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'3px', marginBottom:'8px' }}>
              {Object.entries(WL_PRESETS).map(([name, preset])=>(
                <button key={name} onClick={()=>{setWL('axial',preset);setWL('coronal',preset);setWL('sagittal',preset);toast(`WL: ${name}`);}}
                  style={{ fontSize:'8px', background:'var(--c-bg-elevated)', border:'1px solid var(--c-border-bright)', color:'var(--c-text-mid)', padding:'2px', cursor:'pointer', borderRadius:'2px' }}
                >{name}</button>
              ))}
            </div>

            <div style={{ fontSize:'8.5px', color:'var(--c-text-subtle)', marginBottom:'3px' }}>Overlays</div>
            {([
              ['FoV Box',       'fov'],
              ['Crosshair',     'xhair'],
              ['Labels',        'labels'],
              ['Ruler',         'ruler'],
              ['Slice Markers', 'sliceMarkers'],
              ['Ref Lines',     'referenceLines'],
            ] as [string, keyof typeof show][]).map(([label, key])=>(
              <label key={key} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'2px 0', cursor:key === 'fov' && !planningOverlayVisible ? 'not-allowed' : 'pointer', fontSize:'9px', color:'var(--c-text-mid)', opacity:key === 'fov' && !planningOverlayVisible ? 0.45 : 1 }}>
                <input
                  type="checkbox"
                  checked={key === 'fov' ? planningOverlayVisible && show.fov : show[key]}
                  disabled={key === 'fov' && !planningOverlayVisible}
                  onChange={e=>setShow(key, e.target.checked)}
                  style={{ accentColor:'var(--c-cyan)' }}
                />
                {label}
              </label>
            ))}
          </div>
        )}

        {/* FILMING TAB */}
        {tab===2 && (
          <div style={{ padding:'6px' }}>
            <div style={{ fontSize:'8.5px', color:'var(--c-text-subtle)', marginBottom:'4px' }}>Layout</div>
            <div style={{ display:'flex', gap:'4px', marginBottom:'8px' }}>
              {['3x3','4x4','5x5'].map(l=>(
                <button key={l} onClick={()=>setFilmLayout(l)}
                  style={{ flex:1, padding:'3px', fontSize:'9px', background:filmLayout===l?'var(--c-bg-selected)':'var(--c-bg-elevated)', border:`1px solid ${filmLayout===l?'var(--c-cyan)':'var(--c-border-bright)'}`, color:filmLayout===l?'var(--c-cyan)':'var(--c-text-mid)', cursor:'pointer', borderRadius:'2px' }}
                >{l}</button>
              ))}
            </div>
            <div style={{ fontSize:'8.5px', color:'var(--c-text-subtle)', marginBottom:'4px' }}>Format</div>
            <div style={{ display:'flex', gap:'4px', marginBottom:'8px' }}>
              {['DICOM','PDF','JPEG'].map(f=>(
                <button key={f}
                  style={{ flex:1, padding:'3px', fontSize:'9px', background:'var(--c-bg-elevated)', border:'1px solid var(--c-border-bright)', color:'var(--c-text-mid)', cursor:'pointer', borderRadius:'2px' }}
                  onClick={()=>toast(`Export as ${f}`)}>
                  {f}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'4px', marginTop:'8px' }}>
              {[['🖨 Print Film',()=>toast('Print sent to film printer')],['📤 Export',()=>toast('Export queued')],['📡 Send to PACS',()=>toast('Sending to PACS…')]].map(([l,fn])=>(
                <button key={l as string} onClick={fn as ()=>void}
                  style={{ fontSize:'9.5px', background:'var(--c-bg-elevated)', border:'1px solid var(--c-border-bright)', color:'var(--c-text-mid)', padding:'5px', cursor:'pointer', borderRadius:'2px' }}
                >{l as string}</button>
              ))}
            </div>
          </div>
        )}

        {/* 3D TAB */}
        {tab===3 && (
          <div style={{ padding:'6px' }}>
            <div style={{ fontSize:'8.5px', color:'var(--c-text-subtle)', marginBottom:'4px' }}>Render Mode</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'3px', marginBottom:'8px' }}>
              {_3D_MODES.map(m=>(
                <button key={m} onClick={()=>setMode3d(m)}
                  style={{ padding:'3px', fontSize:'8px', background:mode3d===m?'var(--c-bg-selected)':'var(--c-bg-elevated)', border:`1px solid ${mode3d===m?'var(--c-cyan)':'var(--c-border-bright)'}`, color:mode3d===m?'var(--c-cyan)':'var(--c-text-mid)', cursor:'pointer', borderRadius:'2px' }}
                >{m}</button>
              ))}
            </div>
            {[['Threshold', threshold, 0, 100, setThreshold],['Opacity', opacity, 0, 100, setOpacity]].map(([label,val,min,max,fn])=>(
              <div key={label as string} style={{ marginBottom:'6px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', marginBottom:'2px' }}>
                  <span style={{ color:'var(--c-text-subtle)' }}>{label as string}</span>
                  <span style={{ color:'var(--c-cyan)', fontFamily:'Roboto Mono,monospace' }}>{val as number}%</span>
                </div>
                <input type="range" min={min as number} max={max as number} value={val as number} onChange={e=>(fn as (v:number)=>void)(+e.target.value)} style={{ width:'100%' }} />
              </div>
            ))}
            <div style={{ display:'flex', flexDirection:'column', gap:'3px', marginTop:'8px' }}>
              {[['🔭 Generate 3D',()=>toast('Generating 3D…')],['🔄 Auto Rotate',()=>toast('Auto rotate on')],['↺ Reset View',()=>toast('3D view reset')]].map(([l,fn])=>(
                <button key={l as string} onClick={fn as ()=>void}
                  style={{ fontSize:'9px', background:'var(--c-bg-elevated)', border:'1px solid var(--c-border-bright)', color:'var(--c-text-mid)', padding:'4px', cursor:'pointer', borderRadius:'2px' }}
                >{l as string}</button>
              ))}
            </div>
          </div>
        )}

        {/* SAFETY TAB */}
        {tab===4 && (
          <div style={{ padding:'6px' }}>
            <div className="pgroup-title" style={{ fontSize:'7.5px', marginBottom:'4px' }}>SAFETY CHECKLIST</div>
            {[
              ['Metal Implant',    safety.implant,         'var(--c-red)'],
              ['Pacemaker/ICD',    safety.pacemaker,       'var(--c-red)'],
              ['Pregnancy',        safety.pregnant,        'var(--c-red)'],
              ['Contrast Allergy', safety.contrastAllergy, 'var(--c-amber)'],
              ['Claustrophobia',   safety.claustrophobia,  'var(--c-amber)'],
              ['Previous MRI',     safety.previousMRI,     'var(--c-green)'],
            ].map(([label, val, color])=>(
              <div key={label as string} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'3px 0', borderBottom:'1px solid var(--c-border-faint)' }}>
                <span style={{ fontSize:'9px', color: (val as boolean) ? (color as string) : 'var(--c-green)' }}>{(val as boolean) ? '⚠' : '✓'}</span>
                <span style={{ fontSize:'9px', color:'var(--c-text-mid)' }}>{label as string}</span>
                <span style={{ marginLeft:'auto', fontSize:'8px', color: (val as boolean) ? (color as string) : 'var(--c-green)' }}>{(val as boolean) ? 'YES' : 'NO'}</span>
              </div>
            ))}

            <div style={{ marginTop:'8px' }}>
              <div style={{ fontSize:'8.5px', color:'var(--c-text-subtle)', marginBottom:'3px' }}>SAR Level</div>
              <div style={{ background:'var(--c-bg-card)', border:'1px solid var(--c-border)', borderRadius:'2px', padding:'4px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px', fontSize:'9px' }}>
                  <span style={{ color:'var(--c-text-mid)' }}>SAR Usage</span>
                  <span style={{ color: (selectedSeq?.sarPct ?? 0)>=90?'var(--c-red)':(selectedSeq?.sarPct??0)>=70?'var(--c-amber)':'var(--c-green)', fontFamily:'Roboto Mono,monospace' }}>{selectedSeq?.sarPct ?? 0}%</span>
                </div>
                <div style={{ height:'6px', background:'var(--c-bg-elevated)', borderRadius:'2px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${selectedSeq?.sarPct??0}%`, background: (selectedSeq?.sarPct??0)>=90?'var(--c-red)':(selectedSeq?.sarPct??0)>=70?'var(--c-amber)':'var(--c-green)', transition:'width 0.5s' }} />
                </div>
              </div>
            </div>

            {(safety.implant || safety.pacemaker) && (
              <div style={{ marginTop:'8px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'2px', padding:'6px 8px' }}>
                <div style={{ fontSize:'9px', fontWeight:700, color:'var(--c-red)' }}>⚠ SAFETY ALERT</div>
                <div style={{ fontSize:'8.5px', color:'#fca5a5', marginTop:'3px' }}>Patient may not be cleared for MRI. Consult radiologist before proceeding.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
