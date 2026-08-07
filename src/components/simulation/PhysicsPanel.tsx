'use client';
import { useState, useRef, useEffect } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { calcSNR, snrLabel, getContrastType, calcResolution, getArtifactWarnings, getExplanation, calculateTA, formatTime } from '@/lib/physics';

// Re-export calculateTA from scanEngine for physics panel usage
import { calculateTA as calcTA2 } from '@/lib/scanEngine';

export default function PhysicsPanel() {
  const { togglePhysics } = useWorkstationStore();
  const [p, setP] = useState({ tr:2000, te:90, flipAngle:90, matrix:256, bandwidth:145, fov:220, thickness:4, averages:1 });
  const [lastChanged, setLastChanged] = useState<string>('tr');
  const curveRef = useRef<HTMLCanvasElement>(null);

  const S = (key: keyof typeof p, v: number) => { setP(prev => ({...prev,[key]:v})); setLastChanged(key); };

  const snr = calcSNR({ tr:p.tr, te:p.te, sliceThickness:p.thickness, nex:p.averages, fov:p.fov, matrix:p.matrix });
  const contrast = getContrastType(p.tr, p.te);
  const res = calcResolution(p.fov, p.matrix, p.thickness);
  const taSec = calcTA2({ 
    slices:24, tr:p.tr, te:p.te, averages:p.averages, concatenations:2, 
    turboFactor:9, matrix:p.matrix, fovPhase:100, partialFourier:'Off', 
    parallelImaging:'None', phaseEncoding:'AP' 
  });
  const artifacts = getArtifactWarnings({ fov:p.fov, matrix:p.matrix, tr:p.tr, te:p.te, bandwidth:p.bandwidth, phaseEncoding:'AP', sliceThickness:p.thickness });
  const explanation = getExplanation(lastChanged);
  const snrLbl = snrLabel(snr);
  const snrColor = snr >= 60 ? '#22c55e' : snr >= 30 ? '#f59e0b' : '#ef4444';

  // Draw signal curves
  useEffect(() => {
    const c = curveRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const W=c.width, H=c.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#060b14'; ctx.fillRect(0,0,W,H);
    ctx.strokeStyle='#1e293b'; ctx.lineWidth=0.5;
    for(let x=0;x<W;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=0;y<H;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

    // T1 recovery curve (TR axis)
    const T1=800;
    ctx.strokeStyle='#22c55e'; ctx.lineWidth=2; ctx.beginPath();
    for(let i=0;i<W;i++){const tr=i/W*10000; const y=H-(1-Math.exp(-tr/T1))*(H-10)-5; if(i===0)ctx.moveTo(i,y);else ctx.lineTo(i,y);}
    ctx.stroke();
    // Current TR marker
    const trX = (p.tr/10000)*W;
    ctx.strokeStyle='rgba(34,197,94,0.8)'; ctx.lineWidth=1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(trX,0); ctx.lineTo(trX,H); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='rgba(34,197,94,0.9)'; ctx.font='7px Roboto Mono,monospace';
    ctx.fillText(`TR=${p.tr}ms`, Math.min(trX+2,W-50), 10);

    // T2 decay curve (TE axis)
    const T2=100;
    ctx.strokeStyle='#22d3ee'; ctx.lineWidth=2; ctx.beginPath();
    for(let i=0;i<W;i++){const te=i/W*500; const y=H-Math.exp(-te/T2)*(H-10)-5; if(i===0)ctx.moveTo(i,y);else ctx.lineTo(i,y);}
    ctx.stroke();
    // Current TE marker
    const teX = (p.te/500)*W;
    ctx.strokeStyle='rgba(34,211,238,0.8)'; ctx.lineWidth=1; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(teX,0); ctx.lineTo(teX,H); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='rgba(34,211,238,0.9)'; ctx.font='7px Roboto Mono,monospace';
    ctx.fillText(`TE=${p.te}ms`, Math.min(teX+2,W-50), 20);

    // Labels
    ctx.fillStyle='rgba(34,197,94,0.6)'; ctx.font='8px Roboto Mono,monospace';
    ctx.fillText('T1 recovery (TR→)', 4, H-18);
    ctx.fillStyle='rgba(34,211,238,0.6)';
    ctx.fillText('T2 decay (TE→)', 4, H-8);
  }, [p.tr, p.te]);

  const Slider = ({ label, key, min, max, unit }: { label:string; key:keyof typeof p; min:number; max:number; unit?:string }) => (
    <div style={{ marginBottom:'8px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9px', marginBottom:'2px' }}>
        <span style={{ color:'var(--c-text-subtle)', cursor:'pointer' }} onClick={()=>setLastChanged(key)}>{label}</span>
        <span style={{ color: lastChanged===key?'#22d3ee':'var(--c-text-mid)', fontFamily:'Roboto Mono,monospace' }}>{p[key]}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={key==='thickness'?0.5:1} value={p[key]} onChange={e=>S(key,+e.target.value)} style={{ width:'100%' }} />
    </div>
  );

  const sevColor = (s: string) => s==='high'?'#ef4444':s==='medium'?'#f59e0b':'var(--c-text-mid)';

  return (
    <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'460px', background:'var(--c-bg-panel)', borderLeft:'1px solid var(--c-border-accent)', zIndex:800, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'-4px 0 24px rgba(0,0,0,0.22)' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderBottom:'1px solid var(--c-border)', background:'rgba(14,165,233,0.05)', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:'12px', fontWeight:700, color:'var(--c-text-bright)' }}>🔬 MRI Physics Simulator</div>
          <div style={{ fontSize:'8.5px', color:'var(--c-text-subtle)', marginTop:'1px' }}>Adjust parameters to explore MRI physics</div>
        </div>
        <button onClick={togglePhysics} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'var(--c-text-mid)', fontSize:'18px', cursor:'pointer' }}>✕</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px 14px' }}>
        {/* Sliders */}
        <div style={{ marginBottom:'12px', padding:'10px', background:'var(--c-bg-card)', border:'1px solid var(--c-border)', borderRadius:'2px' }}>
          <div style={{ fontSize:'8.5px', fontWeight:700, color:'#22d3ee', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'8px' }}>Parameter Controls</div>
          <Slider label="TR (Repetition Time)"  key="tr"         min={50}  max={10000} unit="ms" />
          <Slider label="TE (Echo Time)"        key="te"         min={1}   max={500}   unit="ms" />
          <Slider label="Flip Angle"            key="flipAngle"  min={1}   max={180}   unit="°" />
          <Slider label="Matrix Size"           key="matrix"     min={64}  max={512} />
          <Slider label="Bandwidth"             key="bandwidth"  min={20}  max={1000}  unit=" Hz/Px" />
          <Slider label="FOV"                   key="fov"        min={100} max={500}   unit="mm" />
          <Slider label="Slice Thickness"       key="thickness"  min={1}   max={10}    unit="mm" />
          <Slider label="Averages (NEX)"        key="averages"   min={1}   max={8} />
        </div>

        {/* Live output cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px', marginBottom:'12px' }}>
          <div style={{ background:'var(--c-bg-card)', border:'1px solid var(--c-border)', padding:'8px', borderRadius:'2px' }}>
            <div style={{ fontSize:'7.5px', color:'var(--c-text-subtle)', marginBottom:'4px' }}>SNR ESTIMATE</div>
            <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'20px', fontWeight:700, color:snrColor }}>{snr}</div>
            <div style={{ fontSize:'8px', color:snrColor, marginTop:'2px' }}>{snrLbl}</div>
          </div>
          <div style={{ background:'var(--c-bg-card)', border:'1px solid var(--c-border)', padding:'8px', borderRadius:'2px' }}>
            <div style={{ fontSize:'7.5px', color:'var(--c-text-subtle)', marginBottom:'4px' }}>CONTRAST</div>
            <div style={{ fontSize:'11px', fontWeight:700, color:'#22d3ee', marginTop:'4px' }}>{contrast}</div>
          </div>
          <div style={{ background:'var(--c-bg-card)', border:'1px solid var(--c-border)', padding:'8px', borderRadius:'2px' }}>
            <div style={{ fontSize:'7.5px', color:'var(--c-text-subtle)', marginBottom:'4px' }}>SCAN TIME</div>
            <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'18px', fontWeight:700, color:'#22c55e' }}>{formatTime(taSec)}</div>
          </div>
          <div style={{ background:'var(--c-bg-card)', border:'1px solid var(--c-border)', padding:'8px', borderRadius:'2px' }}>
            <div style={{ fontSize:'7.5px', color:'var(--c-text-subtle)', marginBottom:'4px' }}>RESOLUTION</div>
            <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'11px', color:'#f59e0b', marginTop:'4px' }}>{res[0].toFixed(1)}×{res[1].toFixed(1)}×{res[2]}mm</div>
          </div>
        </div>

        {/* Artifact warnings */}
        {artifacts.length > 0 && (
          <div style={{ marginBottom:'12px', padding:'8px', background:'var(--c-bg-card)', border:'1px solid var(--c-border)', borderRadius:'2px' }}>
            <div style={{ fontSize:'8.5px', fontWeight:700, color:'#f59e0b', marginBottom:'6px' }}>⚠ Potential Artifacts</div>
            {artifacts.map((a, i) => (
              <div key={i} style={{ display:'flex', gap:'6px', marginBottom:'4px', padding:'4px 6px', background:`color-mix(in srgb, ${sevColor(a.severity)} 6%, transparent)`, border:`1px solid color-mix(in srgb, ${sevColor(a.severity)} 20%, transparent)`, borderRadius:'2px' }}>
                <span style={{ fontSize:'8.5px', fontWeight:700, color:sevColor(a.severity), flexShrink:0 }}>{a.type}</span>
                <span style={{ fontSize:'8.5px', color:'var(--c-text-mid)' }}>{a.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Explanation */}
        <div style={{ marginBottom:'12px', padding:'10px', background:'rgba(14,165,233,0.05)', border:'1px solid rgba(14,165,233,0.15)', borderRadius:'2px' }}>
          <div style={{ fontSize:'8px', fontWeight:700, color:'#22d3ee', marginBottom:'5px', textTransform:'uppercase', letterSpacing:'0.5px' }}>📚 {lastChanged.toUpperCase()} — Education</div>
          <div style={{ fontSize:'9.5px', color:'var(--c-text-base)', lineHeight:'1.5' }}>{explanation}</div>
        </div>

        {/* Signal curves */}
        <div style={{ background:'var(--c-bg-card)', border:'1px solid var(--c-border)', borderRadius:'2px', overflow:'hidden' }}>
          <div style={{ fontSize:'8px', color:'var(--c-text-muted)', padding:'4px 8px', borderBottom:'1px solid var(--c-border-faint)' }}>Signal Curves — T1 Recovery (green) & T2 Decay (cyan)</div>
          <canvas ref={curveRef} width={432} height={130} style={{ display:'block', width:'100%' }} />
        </div>
      </div>
    </div>
  );
}
