'use client';
import { useEffect, useRef } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { formatTime, totalProtocolTime } from '@/lib/scanEngine';
import { toast } from '@/lib/toast';

const STATUS_CONFIG = {
  done:     { color:'#22c55e', icon:'✓', label:'DONE' },
  active:   { color:'#f59e0b', icon:'◉', label:'ACTIVE' },
  scanning: { color:'#22d3ee', icon:'▶', label:'SCAN' },
  pending:  { color:'#334155', icon:'○', label:'WAIT' },
} as const;

export default function ProtocolQueue() {
  const { sequences, selectedSeqId, scan, calcTA, selectSeq, startScan, pauseScan, stopScan, applyParams, setScanProgress, finishScan } = useWorkstationStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scan timer logic
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!scan.running || scan.paused) return;

    const seq = sequences.find(s => s.id === scan.seqId);
    if (!seq) return;
    const [m, sec] = seq.ta.split(':').map(Number);
    const totalMs = ((m ?? 0) * 60 + (sec ?? 0)) * 1000;
    const step = 200; // 200ms tick
    const progressStep = (step / totalMs) * 100;

    timerRef.current = setInterval(() => {
      const { scan: s } = useWorkstationStore.getState();
      if (!s.running || s.paused) { clearInterval(timerRef.current!); return; }
      const newProgress = Math.min(100, s.progress + progressStep);
      const newRemain   = Math.max(0, s.remainSec - step / 1000);
      setScanProgress(newProgress, newRemain);
      if (newProgress >= 100) {
        clearInterval(timerRef.current!);
        finishScan();
        toast(`✓ Completed: ${seq.name}`, 'success');
      }
    }, step);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [scan.running, scan.paused, scan.seqId]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT','SELECT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'F5')     { e.preventDefault(); startScan(); }
      if (e.key === 'F6')     { e.preventDefault(); pauseScan(); }
      if (e.key === 'Escape') { stopScan(); }
      if (e.key === 'ArrowUp') {
        const i = sequences.findIndex(s => s.id === selectedSeqId);
        if (i > 0) selectSeq(sequences[i-1]!.id);
      }
      if (e.key === 'ArrowDown') {
        const i = sequences.findIndex(s => s.id === selectedSeqId);
        if (i < sequences.length - 1) selectSeq(sequences[i+1]!.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sequences, selectedSeqId]);

  const totalSec = totalProtocolTime();

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:'1 1 0', minWidth:0, height:'100%', overflow:'hidden', background:'#0d1626' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'0 8px', height:'30px', borderBottom:'1px solid #1e293b', flexShrink:0, background:'#0a1220' }}>
        <span style={{ fontSize:'10px', fontWeight:700, color:'#475569', letterSpacing:'0.5px', marginRight:'4px', whiteSpace:'nowrap' }}>PROTOCOL QUEUE</span>

        {[
          { label:'▶ Run',  color:'#22d3ee', action: startScan,  disabled: scan.running && !scan.paused },
          { label:'⏸ Pause', color:'#f59e0b', action: pauseScan, disabled: !scan.running || scan.paused },
          { label:'⏹ Abort', color:'#ef4444', action: stopScan,  disabled: !scan.running },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            disabled={btn.disabled}
            style={{
              fontSize:'9px', padding:'2px 10px', border:`1px solid ${btn.disabled?'#1e293b':btn.color+'55'}`,
              background: btn.disabled ? 'transparent' : `${btn.color}15`,
              color: btn.disabled ? '#334155' : btn.color,
              cursor: btn.disabled ? 'not-allowed' : 'pointer', borderRadius:'2px',
              fontWeight:600, fontFamily:'Inter,sans-serif',
              transition:'all 0.1s',
            }}
          >{btn.label}</button>
        ))}

        <div style={{ width:'1px', height:'14px', background:'#1e293b', marginLeft:'4px' }} />

        <button onClick={()=>{applyParams();toast('Parameters applied ✓','success');}}
          style={{ fontSize:'9px', padding:'2px 10px', border:'1px solid #26374a', background:'transparent', color:'#64748b', cursor:'pointer', borderRadius:'2px' }}>
          ✓ Apply
        </button>
        <button onClick={()=>toast('Sequence copied')}
          style={{ fontSize:'9px', padding:'2px 8px', border:'1px solid #1e293b', background:'transparent', color:'#475569', cursor:'pointer', borderRadius:'2px' }}>
          Copy
        </button>
        <button onClick={()=>toast('Sequence locked','warn')}
          style={{ fontSize:'9px', padding:'2px 8px', border:'1px solid #1e293b', background:'transparent', color:'#475569', cursor:'pointer', borderRadius:'2px' }}>
          Delete
        </button>

        <div style={{ flex:1 }} />

        {/* Countdown */}
        <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'12px', color: scan.running?'#22d3ee':'#334155', letterSpacing:'1px', minWidth:'44px' }}>
          {scan.running ? formatTime(Math.round(scan.remainSec)) : '—'}
        </div>

        {/* Mini global progress */}
        <div style={{ width:'80px', height:'4px', background:'#1c2a3e', borderRadius:'2px', overflow:'hidden', border:'1px solid #1e293b' }}>
          <div style={{ height:'100%', width:`${scan.progress}%`, background:'#22d3ee', borderRadius:'2px', transition:'width 0.2s', boxShadow:'0 0 4px #22d3ee' }} />
        </div>
        <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:'#475569', minWidth:'28px' }}>{Math.round(scan.progress)}%</span>
      </div>

      {/* Table */}
      <div style={{ flex:1, overflowY:'auto', fontSize:'9.5px' }}>
        {/* Column headers */}
        <div style={{
          display:'grid', gridTemplateColumns:'24px 52px 1fr 44px 28px 52px 36px 80px 36px',
          padding:'0 6px', height:'20px', alignItems:'center',
          background:'#08101c', borderBottom:'1px solid #1e293b', position:'sticky', top:0, zIndex:5,
          color:'#334155', fontFamily:'Roboto Mono,monospace', fontSize:'8px', fontWeight:700, letterSpacing:'0.3px',
          gap:'4px',
        }}>
          <span>#</span>
          <span>STATUS</span>
          <span>SEQUENCE NAME</span>
          <span style={{ textAlign:'right' }}>TA</span>
          <span style={{ textAlign:'right' }}>SL</span>
          <span style={{ textAlign:'right' }}>TR</span>
          <span style={{ textAlign:'right' }}>TE</span>
          <span>PROGRESS</span>
          <span style={{ textAlign:'right' }}>SAR</span>
        </div>

        {sequences.map(seq => {
          const cfg = STATUS_CONFIG[seq.status];
          const isSelected = seq.id === selectedSeqId;
          const isScanning = seq.status === 'scanning';
          const sarColor = seq.sarPct >= 90 ? '#ef4444' : seq.sarPct >= 70 ? '#f59e0b' : '#22c55e';

          return (
            <div
              key={seq.id}
              onClick={() => selectSeq(seq.id)}
              style={{
                display:'grid', gridTemplateColumns:'24px 52px 1fr 44px 28px 52px 36px 80px 36px',
                padding:'0 6px', height:'22px', alignItems:'center', gap:'4px',
                borderBottom:'1px solid #0d1520', cursor:'pointer',
                background: isSelected ? '#0f2d50' : isScanning ? 'rgba(34,211,238,0.04)' : 'transparent',
                borderLeft: isSelected ? '2px solid #22d3ee' : '2px solid transparent',
                animation: isScanning ? 'rowPulse 1.5s ease-in-out infinite' : 'none',
                transition:'background 0.1s',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background='#0d1a2d'; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background=isScanning?'rgba(34,211,238,0.04)':'transparent'; }}
            >
              <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'8.5px', color:'#334155' }}>{seq.id}</span>

              <span style={{
                fontSize:'7.5px', fontWeight:700, letterSpacing:'0.3px',
                color:cfg.color, background:`${cfg.color}15`,
                border:`1px solid ${cfg.color}30`, borderRadius:'2px',
                padding:'1px 4px', textAlign:'center', fontFamily:'Roboto Mono,monospace',
              }}>
                {cfg.icon} {cfg.label}
              </span>

              <span style={{
                fontSize:'9px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                color: seq.status==='done' ? '#334155' : seq.status==='active' ? '#94a3b8' : '#64748b',
                textDecoration: seq.status==='done' ? 'line-through' : 'none',
              }} title={seq.name}>{seq.name}</span>

              <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:'#22d3ee', textAlign:'right' }}>{seq.ta}</span>
              <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:'#475569', textAlign:'right' }}>{seq.sl}</span>
              <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:'#475569', textAlign:'right' }}>{seq.tr}</span>
              <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:'#475569', textAlign:'right' }}>{seq.te}</span>

              {/* Progress */}
              <div>
                {isScanning ? (
                  <div style={{ height:'3px', background:'#1c2a3e', borderRadius:'2px', overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${scan.progress}%`, background:'#22d3ee', borderRadius:'2px', transition:'width 0.2s', boxShadow:'0 0 4px #22d3ee' }} />
                  </div>
                ) : null}
              </div>

              <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:sarColor, textAlign:'right' }}>{seq.sarPct}%</span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'0 8px', height:'18px', borderTop:'1px solid #0d1520', background:'#08101c', flexShrink:0, fontSize:'8.5px' }}>
        <span style={{ color:'#334155', fontFamily:'Roboto Mono,monospace' }}>Σ {formatTime(totalSec)}</span>
        <span style={{ color:'#1e293b' }}>|</span>
        <span style={{ color:'#334155' }}>{sequences.length} sequences</span>
        <span style={{ color:'#1e293b' }}>|</span>
        <span style={{ color:'#334155' }}>F5=Run  F6=Pause  Esc=Abort  ↑↓=Navigate</span>
        <div style={{ flex:1 }} />
        <span style={{ color:'#334155', fontFamily:'Roboto Mono,monospace' }}>Calc TA: {calcTA}</span>
      </div>
    </div>
  );
}
