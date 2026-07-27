'use client';
import { useState } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';

type Row = [string, string, keyof ReturnType<typeof useWorkstationStore>, string?, string?];

export default function ParameterPanel() {
  const store = useWorkstationStore();
  const { params, calcTA, calcSNR, calcContrast, calcRes, setParam, applyParams } = store;
  const [tab, setTab] = useState(0);
  const tabs = ['Routine','Contrast','Resolution','Geometry','Sequence','System','Physio','Inline'];

  const snrColor = calcSNR >= 60 ? '#22c55e' : calcSNR >= 30 ? '#f59e0b' : '#ef4444';
  const snrLabel = calcSNR >= 60 ? 'High' : calcSNR >= 30 ? 'Medium' : 'Low';

  const P = ({ label, pid, unit, type='number', opts }: { label:string; pid:keyof typeof params; unit?:string; type?:string; opts?:string[] }) => (
    <div className="prow">
      <span className="plbl">{label}</span>
      {opts ? (
        <select className="pinput wide" value={String(params[pid])} onChange={e=>setParam(pid, e.target.value)}
          style={{ flex:1, background:'#080d18', border:'1px solid #263040', color:'#94a3b8', fontFamily:'Roboto Mono,monospace', fontSize:'10px', padding:'1px 4px', borderRadius:'2px', outline:'none' }}>
          {opts.map(o=><option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type} value={String(params[pid])} className="pinput"
          onChange={e => setParam(pid, type==='number' ? +e.target.value : e.target.value)}
        />
      )}
      {unit && <span className="punit">{unit}</span>}
    </div>
  );

  const Slider = ({ label, pid, min, max, unit }: { label:string; pid:keyof typeof params; min:number; max:number; unit?:string }) => (
    <div className="prow" style={{ flexDirection:'column', alignItems:'stretch', padding:'4px 8px', gap:'2px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px' }}>
        <span className="plbl">{label}</span>
        <span style={{ color:'#22d3ee', fontFamily:'Roboto Mono,monospace', fontSize:'9px' }}>{params[pid]}{unit}</span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
        <input type="range" min={min} max={max} value={Number(params[pid])} onChange={e=>setParam(pid,+e.target.value)} style={{ flex:1 }} />
        <input type="number" value={Number(params[pid])} onChange={e=>setParam(pid,+e.target.value)} className="pinput" style={{ width:'48px' }} />
      </div>
    </div>
  );

  const GROUP = ({ title }: { title: string }) => <div className="pgroup-title">{title}</div>;

  return (
    <div style={{ width:'380px', display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', background:'#0a1220', flexShrink:0, borderLeft:'1px solid #1e293b' }}>
      {/* Tabs */}
      <div className="tab-bar" style={{ flexShrink:0, flexWrap:'wrap' }}>
        {tabs.map((t,i)=>(
          <button key={t} className={`tab-btn${i===tab?' active':''}`} onClick={()=>setTab(i)} style={{ padding:'4px 8px', fontSize:'8.5px' }}>{t}</button>
        ))}
      </div>

      {/* Param content */}
      <div style={{ flex:1, overflowY:'auto' }}>

        {tab===0 && (<>
          <GROUP title="SLICE GROUP" />
          <P label="Slice Group"   pid="slices"       type="number" unit="slices" />
          <P label="Slices"        pid="slices"       type="number" />
          <Slider label="Dist Factor" pid="concatenations" min={0} max={800} />
          <P label="Thickness"     pid="thickness"    unit="mm" />
          <GROUP title="TIMING" />
          <P label="TR"            pid="tr"           unit="ms" />
          <P label="TE"            pid="te"           unit="ms" />
          <P label="Averages"      pid="averages" />
          <P label="Concatenations"pid="concatenations" />
          <GROUP title="GEOMETRY" />
          <P label="FoV Read"      pid="fovRead"      unit="mm" />
          <P label="FoV Phase"     pid="fovPhase"     unit="%" />
          <P label="Position"      pid="position"     type="text" />
          <P label="Orientation"   pid="orientation"  type="text" />
          <GROUP title="ENCODING" />
          <P label="Phase Enc Dir" pid="phaseEncoding" opts={['AP','PA','RL','LR','HF','FH']} />
          <P label="AutoAlign"     pid="autoAlign"    opts={['Head > Basis','Head > AC-PC','Spine','Off']} />
          <P label="Filter"        pid="filter"       opts={['Prescan Normalize','None','Elliptical','Raw']} />
          <P label="Coil"          pid="coil"         type="text" />
        </>)}

        {tab===1 && (<>
          <GROUP title="PULSE PARAMETERS" />
          <P label="Flip Angle"    pid="flipAngle"    unit="°" />
          <P label="Fat Suppression" pid="fatSat"     opts={['None','Fat Sat','SPAIR','STIR','Water Exc']} />
          <P label="Inversion TI"  pid="ti"           unit="ms" />
          <P label="Bandwidth"     pid="bandwidth"    unit="Hz/Px" />
          <GROUP title="MAGNETIZATION" />
          <P label="Magn. Transfer" pid="filter"      opts={['Off','On']} />
          <P label="Presaturation" pid="phaseEncoding" opts={['Off','Superior','Inferior','Anterior','Posterior']} />
        </>)}

        {tab===2 && (<>
          <GROUP title="MATRIX" />
          <P label="Base Resolution" pid="matrix" />
          <P label="Phase P. Fourier" pid="etl"   opts={['6/8','7/8','5/8','Off']} />
          <P label="Interpolation"   pid="filter"  opts={['On','Off']} />
          <GROUP title="BANDWIDTH" />
          <P label="Pixel Bandwidth" pid="bandwidth" unit="Hz/Px" />
          <P label="iPAT / GRAPPA"   pid="parallelImaging" opts={['None','GRAPPA ×2','GRAPPA ×3','SENSE ×2']} />
        </>)}

        {tab===3 && (<>
          <GROUP title="DISTORTION" />
          <P label="Dist Correction" pid="filter"     opts={['3D','2D','Off']} />
          <P label="Phase Oversampling" pid="fovPhase" unit="%" />
          <P label="Slice Oversampling" pid="thickness" unit="%" />
          <P label="Readout Mode"    pid="phaseEncoding" opts={['Symmetric','Asymmetric']} />
        </>)}

        {tab===4 && (<>
          <GROUP title="SEQUENCE" />
          <div className="prow"><span className="plbl">Seq Type</span><span style={{ color:'#475569', fontSize:'9px', fontFamily:'Roboto Mono,monospace' }}>TSE</span></div>
          <P label="Turbo Factor"    pid="turboFactor" />
          <P label="Echo Train Len"  pid="etl" />
          <P label="k-space Fill"    pid="filter"      opts={['Linear','Centric','Elliptical Centric']} />
          <P label="PAT Mode"        pid="parallelImaging" opts={['GRAPPA','SENSE','None']} />
        </>)}

        {tab===5 && (<>
          <GROUP title="SYSTEM" />
          <P label="Shim Mode"       pid="autoAlign"   opts={['Standard','Advanced','Tune Up','Body']} />
          <P label="RF Spoiling"     pid="filter"      opts={['On','Off']} />
          <P label="Gradient Mode"   pid="phaseEncoding" opts={['Normal','Fast','Ultra-Fast','Whisper']} />
          <P label="Table Position"  pid="fovRead"     unit="mm" />
          <P label="Coil Combine"    pid="coil"        type="text" />
        </>)}

        {tab===6 && (<>
          <GROUP title="GATING" />
          <P label="Cardiac Gating"  pid="filter"      opts={['None','ECG Trigger','PPU','VCG']} />
          <P label="Resp. Gating"    pid="autoAlign"   opts={['Off','Navigator Echo','Bellows']} />
          <P label="Trigger Delay"   pid="ti"          unit="ms" />
          <P label="Seq Trigger"     pid="phaseEncoding" opts={['Every TR','Every 2nd TR']} />
        </>)}

        {tab===7 && (<>
          <GROUP title="INLINE PROCESSING" />
          <P label="DWI Calc"        pid="filter"      opts={['None','Trace','ADC','All']} />
          <P label="MIP Recon"       pid="autoAlign"   opts={['Off','On']} />
          <P label="Normalize"       pid="coil"        type="text" />
          <P label="Diffusion Mode"  pid="parallelImaging" opts={['None','3 Scan Trace','RESOLVE']} />
        </>)}
      </div>

      {/* Result strip */}
      <div style={{ padding:'6px 8px', borderTop:'2px solid #1e293b', background:'#08101c', flexShrink:0 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'6px', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:'7px', color:'#334155', marginBottom:'2px' }}>CALC TA</div>
            <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'14px', fontWeight:700, color:'#22c55e', letterSpacing:'1px' }}>{calcTA}</div>
          </div>
          <div>
            <div style={{ fontSize:'7px', color:'#334155', marginBottom:'2px' }}>SNR</div>
            <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'12px', fontWeight:700, color:snrColor }}>{calcSNR} <span style={{ fontSize:'8px' }}>{snrLabel}</span></div>
          </div>
          <div>
            <div style={{ fontSize:'7px', color:'#334155', marginBottom:'2px' }}>CONTRAST</div>
            <div style={{
              fontSize:'8px', fontWeight:700, color:'#22d3ee',
              background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.25)',
              borderRadius:'2px', padding:'1px 4px', display:'inline-block',
            }}>{calcContrast}</div>
          </div>
          <div>
            <div style={{ fontSize:'7px', color:'#334155', marginBottom:'2px' }}>RES (mm)</div>
            <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:'#64748b' }}>{calcRes[0].toFixed(1)}×{calcRes[1].toFixed(1)}×{calcRes[2].toFixed(1)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
