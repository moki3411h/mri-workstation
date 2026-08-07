'use client';
import { useEffect, useRef, useState, useCallback, memo } from 'react';
import Image from 'next/image';
import { useWorkstationStore } from '@/store/workstationStore';
import type { Sequence } from '@/lib/scanEngine';
import { formatTime } from '@/lib/scanEngine';
import { getProtocolSeries, PROTOCOL_SERIES_MIME } from '@/lib/protocolSeries';
import { toast } from '@/lib/toast';

const STATUS_CONFIG = {
  done:     { color:'#22c55e', icon:'✓', label:'DONE' },
  active:   { color:'#f59e0b', icon:'◉', label:'ACTIVE' },
  scanning: { color:'#22d3ee', icon:'▶', label:'SCAN' },
  pending:  { color:'#334155', icon:'○', label:'WAIT' },
} as const;

// ─── Context menu ──────────────────────────────────────────────────────────
interface CtxMenu { x: number; y: number; seqId: number }

const ContextMenu = memo(function ContextMenu({
  menu, onClose, onDelete, onDuplicate, onMoveUp, onMoveDown,
}: {
  menu: CtxMenu;
  onClose: () => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
  onMoveUp: (id: number) => void;
  onMoveDown: (id: number) => void;
}) {
  const items = [
    { label:'▲ Move Up',        fn: () => { onMoveUp(menu.seqId);    onClose(); } },
    { label:'▼ Move Down',      fn: () => { onMoveDown(menu.seqId);  onClose(); } },
    { label:'⧉ Duplicate',      fn: () => { onDuplicate(menu.seqId); onClose(); } },
    null, // separator
    { label:'✕ Delete',         fn: () => { onDelete(menu.seqId);    onClose(); }, color:'#ef4444' },
  ];

  return (
    <>
      <div style={{ position:'fixed', inset:0, zIndex:200 }} onClick={onClose} />
      <div style={{
        position:'fixed', left: menu.x, top: menu.y, zIndex:201,
        background:'#0d1626', border:'1px solid #263040', borderRadius:'3px',
        boxShadow:'0 4px 20px rgba(0,0,0,0.6)', minWidth:'140px', overflow:'hidden',
      }}>
        {items.map((item, i) =>
          item === null
            ? <div key={i} style={{ height:'1px', background:'#1e293b', margin:'2px 0' }} />
            : (
              <button
                key={item.label}
                onClick={item.fn}
                style={{
                  width:'100%', display:'block', textAlign:'left', padding:'5px 12px',
                  fontSize:'9.5px', background:'transparent', border:'none',
                  color: item.color ?? '#64748b', cursor:'pointer', whiteSpace:'nowrap',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#1e293b'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}
              >
                {item.label}
              </button>
            )
        )}
      </div>
    </>
  );
});

// ─── Single sequence row ───────────────────────────────────────────────────
interface RowProps {
  seq: Sequence;
  idx: number;
  isSelected: boolean;
  scanProgress: number;
  onSelect: (id: number) => void;
  onContextMenu: (e: React.MouseEvent, id: number) => void;
  onDragStart: (e: React.DragEvent, id: number) => void;
  onDragOver: (e: React.DragEvent, id: number) => void;
  onDrop: (e: React.DragEvent, id: number) => void;
  onOpenSeries: (id: number) => void;
  dragOverId: number | null;
}

const QueueRow = memo(function QueueRow({
  seq, idx, isSelected, scanProgress, onSelect, onContextMenu,
  onDragStart, onDragOver, onDrop, onOpenSeries, dragOverId,
}: RowProps) {
  const cfg = STATUS_CONFIG[seq.status];
  const series = getProtocolSeries(seq.id);
  const isScanning = seq.status === 'scanning';
  const sarColor = seq.sarPct >= 90 ? '#ef4444' : seq.sarPct >= 70 ? '#f59e0b' : '#22c55e';
  const isDragOver = dragOverId === seq.id;

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, seq.id)}
      onDragOver={e => onDragOver(e, seq.id)}
      onDrop={e => onDrop(e, seq.id)}
      onClick={() => onSelect(seq.id)}
      onDoubleClick={() => series && onOpenSeries(seq.id)}
      onContextMenu={e => onContextMenu(e, seq.id)}
      data-sequence-id={seq.id}
      data-series-count={series?.frameCount ?? 0}
      title={series
        ? `${seq.name} — ${series.frameCount} DICOM images. Drag into a viewport or double-click to open.`
        : `${seq.name} — Right-click for options, drag to reorder`}
      style={{
        display:'grid',
        gridTemplateColumns:'14px 24px 52px 28px minmax(100px,1fr) 44px 28px 52px 36px 80px 36px',
        padding:'0 4px 0 2px', height:'26px', alignItems:'center', gap:'4px',
        borderBottom: isDragOver ? '2px solid #22d3ee' : '1px solid #0d1520',
        cursor:'pointer',
        background: isSelected ? '#0f2d50' : isScanning ? 'rgba(34,211,238,0.04)' : 'transparent',
        borderLeft: isSelected ? '2px solid #22d3ee' : '2px solid transparent',
        animation: isScanning ? 'rowPulse 1.5s ease-in-out infinite' : 'none',
        transition:'background 0.1s, border-color 0.1s',
        userSelect:'none',
      }}
      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background='#0d1a2d'; }}
      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background=isScanning?'rgba(34,211,238,0.04)':'transparent'; }}
    >
      {/* Drag handle */}
      <span style={{ color:'#1e293b', fontSize:'10px', cursor:'grab', flexShrink:0, lineHeight:'1' }}>⠿</span>

      <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'8.5px', color:'#334155' }}>{idx+1}</span>

      <span style={{
        fontSize:'7.5px', fontWeight:700, letterSpacing:'0.3px',
        color:cfg.color, background:`${cfg.color}15`,
        border:`1px solid ${cfg.color}30`, borderRadius:'2px',
        padding:'1px 4px', textAlign:'center', fontFamily:'Roboto Mono,monospace',
      }}>
        {cfg.icon} {cfg.label}
      </span>

      {series ? (
        <button
          type="button"
          aria-label={`Open ${series.name} ${series.frameCount} image stack`}
          onClick={event => { event.stopPropagation(); onOpenSeries(seq.id); }}
          title={`Open ${series.name} image stack`}
          style={{
            width:'26px', height:'22px', padding:0, border:'1px solid #164e63',
            background:'#020617', overflow:'hidden', borderRadius:'2px', cursor:'pointer',
          }}
        >
          <Image src={series.thumbnail} alt="" draggable={false} width={26} height={22} unoptimized style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        </button>
      ) : <span />}

      <span style={{ display:'flex', alignItems:'center', minWidth:0, gap:'5px' }}>
        <span style={{
          fontSize:'9px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
          color: seq.status==='done' ? '#334155' : seq.status==='active' ? '#94a3b8' : '#64748b',
          textDecoration: seq.status==='done' ? 'line-through' : 'none',
        }}>{seq.name}</span>
        {series && (
          <span style={{
            flexShrink:0, fontFamily:'Roboto Mono,monospace', fontSize:'6.5px', fontWeight:700,
            color:'#22d3ee', background:'#083344', border:'1px solid #155e75', borderRadius:'2px', padding:'1px 3px',
          }}>{series.frameCount} IMG</span>
        )}
      </span>

      <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:'#22d3ee', textAlign:'right' }}>{seq.ta}</span>
      <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:'#475569', textAlign:'right' }}>{seq.sl}</span>
      <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:'#475569', textAlign:'right' }}>{seq.tr}</span>
      <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:'#475569', textAlign:'right' }}>{seq.te}</span>

      <div>
        {isScanning ? (
          <div style={{ height:'3px', background:'#1c2a3e', borderRadius:'2px', overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${scanProgress}%`, background:'#22d3ee', borderRadius:'2px', transition:'width 0.2s', boxShadow:'0 0 4px #22d3ee' }} />
          </div>
        ) : seq.status === 'done' ? (
          <div style={{ height:'3px', background:'#22c55e44', borderRadius:'2px' }}>
            <div style={{ height:'100%', width:'100%', background:'#22c55e55' }} />
          </div>
        ) : null}
      </div>

      <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:sarColor, textAlign:'right' }}>{seq.sarPct}%</span>
    </div>
  );
});

// ─── Main Queue Component ──────────────────────────────────────────────────
export default function ProtocolQueue() {
  const {
    sequences, selectedSeqId, scan, calcTA,
    selectSeq, startScan, pauseScan, stopScan,
    setScanProgress, finishScan, deleteSeq, duplicateSeq, moveSeq, reorderSeq, setImageSeries,
  } = useWorkstationStore();

  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const dragId    = useRef<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

  // ── Scan timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!scan.running || scan.paused) return;

    const seq = sequences.find(s => s.id === scan.seqId);
    if (!seq) return;
    const [m, sec] = seq.ta.split(':').map(Number);
    const totalMs = ((m ?? 0) * 60 + (sec ?? 0)) * 1000;
    const step = 200;
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
  }, [scan.running, scan.paused, scan.seqId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['INPUT','SELECT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'F5')     { e.preventDefault(); startScan(); }
      if (e.key === 'F6')     { e.preventDefault(); pauseScan(); }
      if (e.key === 'Escape') { stopScan(); }
      if (e.key === 'Delete' && selectedSeqId) {
        const seq = sequences.find(s => s.id === selectedSeqId);
        if (seq && seq.status !== 'scanning') { deleteSeq(selectedSeqId); toast(`Deleted: ${seq.name}`); }
      }
      if (e.key === 'd' && (e.ctrlKey || e.metaKey) && selectedSeqId) {
        e.preventDefault();
        duplicateSeq(selectedSeqId);
        toast('Sequence duplicated', 'success');
      }
      if (e.key === 'D' && e.shiftKey) {
        e.preventDefault();
        useWorkstationStore.getState().toggleDebug();
      }
      if (e.key === ' ') {
        e.preventDefault();
        const state = useWorkstationStore.getState();
        if (state.scan.running && !state.scan.paused) state.pauseScan();
        else state.startScan();
      }
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
  }, [sequences, selectedSeqId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Drag handlers ─────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, id: number) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'copyMove';
    e.dataTransfer.setData('text/plain', String(id));
    const series = getProtocolSeries(id);
    if (series) e.dataTransfer.setData(PROTOCOL_SERIES_MIME, String(id));
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: number) => {
    e.preventDefault();
    setDragOverId(id);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toId: number) => {
    e.preventDefault();
    setDragOverId(null);
    if (dragId.current !== null && dragId.current !== toId) {
      reorderSeq(dragId.current, toId);
      toast('Sequence reordered', 'success');
    }
    dragId.current = null;
  }, [reorderSeq]);

  const handleOpenSeries = useCallback((id: number) => {
    const series = getProtocolSeries(id);
    if (!series) return;
    setImageSeries(series);
    toast(`${series.name}: ${series.frameCount} images loaded into ${series.plane.toUpperCase()}`, 'success');
  }, [setImageSeries]);

  // ── Context menu ──────────────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent, seqId: number) => {
    e.preventDefault();
    selectSeq(seqId);
    setCtxMenu({ x: e.clientX, y: e.clientY, seqId });
  }, [selectSeq]);

  const totalSec = sequences.reduce((acc, s) => {
    const [m, sec] = s.ta.split(':').map(Number);
    return acc + (m ?? 0) * 60 + (sec ?? 0);
  }, 0);
  const doneCount = sequences.filter(s => s.status === 'done').length;

  return (
    <div
      style={{ display:'flex', flexDirection:'column', flex:'1 1 0', minWidth:0, height:'100%', overflow:'hidden', background:'#0d1626' }}
      onDragLeave={() => setDragOverId(null)}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:'4px', padding:'0 6px', height:'30px', borderBottom:'1px solid #1e293b', flexShrink:0, background:'#0a1220' }}>
        <span style={{ fontSize:'10px', fontWeight:700, color:'#475569', letterSpacing:'0.5px', marginRight:'4px', whiteSpace:'nowrap', flexShrink:0 }}>PROTOCOL QUEUE</span>

        {/* Scan control buttons */}
        {[
          { label:'▶ Run',   color:'#22d3ee', action: startScan,  disabled: scan.running && !scan.paused, title:'F5' },
          { label:'⏸ Pause', color:'#f59e0b', action: pauseScan, disabled: !scan.running || scan.paused,  title:'F6' },
          { label:'⏹ Abort', color:'#ef4444', action: stopScan,  disabled: !scan.running,                 title:'Esc' },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            disabled={btn.disabled}
            title={btn.title}
            style={{
              fontSize:'9px', padding:'2px 8px', border:`1px solid ${btn.disabled?'#1e293b':btn.color+'55'}`,
              background: btn.disabled ? 'transparent' : `${btn.color}15`,
              color: btn.disabled ? '#334155' : btn.color,
              cursor: btn.disabled ? 'not-allowed' : 'pointer', borderRadius:'2px',
              fontWeight:600, transition:'all 0.1s', flexShrink:0,
            }}
          >{btn.label}</button>
        ))}

        <div style={{ width:'1px', height:'14px', background:'#1e293b', margin:'0 2px', flexShrink:0 }} />

        {/* Queue management buttons */}
        {[
          { label:'⧉ Copy',  title:'Duplicate (Ctrl+D)',         fn: () => { if (selectedSeqId) { duplicateSeq(selectedSeqId); toast('Duplicated','success'); } } },
          { label:'▲',       title:'Move up',                    fn: () => { if (selectedSeqId) moveSeq(selectedSeqId, 'up'); } },
          { label:'▼',       title:'Move down',                  fn: () => { if (selectedSeqId) moveSeq(selectedSeqId, 'down'); } },
          { label:'✕ Del',   title:'Delete (Del key)',            fn: () => {
            if (!selectedSeqId) return;
            const seq = sequences.find(s => s.id === selectedSeqId);
            if (seq?.status === 'scanning') { toast('Cannot delete running sequence','warn'); return; }
            deleteSeq(selectedSeqId);
            toast('Sequence deleted');
          }, color:'#ef4444' },
        ].map(btn => (
          <button key={btn.label} onClick={btn.fn} title={btn.title}
            style={{
              fontSize:'9px', padding:'2px 7px', border:'1px solid #1e293b',
              background:'transparent', color: btn.color ?? '#64748b', cursor:'pointer', borderRadius:'2px', flexShrink:0,
            }}
          >{btn.label}</button>
        ))}

        <div style={{ flex:1 }} />

        {/* Progress info */}
        <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'8px', color:'#334155', flexShrink:0 }}>
          {doneCount}/{sequences.length}
        </span>
        <div style={{ fontFamily:'Roboto Mono,monospace', fontSize:'13px', color: scan.running?'#22d3ee':'#334155', letterSpacing:'1px', minWidth:'44px', flexShrink:0 }}>
          {scan.running ? formatTime(Math.round(scan.remainSec)) : '—'}
        </div>
        <div style={{ width:'80px', height:'4px', background:'#1c2a3e', borderRadius:'2px', overflow:'hidden', border:'1px solid #1e293b', flexShrink:0 }}>
          <div style={{ height:'100%', width:`${scan.progress}%`, background:'#22d3ee', borderRadius:'2px', transition:'width 0.2s', boxShadow:'0 0 4px #22d3ee' }} />
        </div>
        <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:'#475569', minWidth:'28px', flexShrink:0 }}>{Math.round(scan.progress)}%</span>
      </div>

      {/* ── Column headers ──────────────────────────────────────────────── */}
      <div style={{
        display:'grid',
        gridTemplateColumns:'14px 24px 52px 28px minmax(100px,1fr) 44px 28px 52px 36px 80px 36px',
        padding:'0 4px 0 2px', height:'20px', alignItems:'center',
        background:'#08101c', borderBottom:'1px solid #1e293b',
        position:'sticky', top:0, zIndex:5,
        color:'#334155', fontFamily:'Roboto Mono,monospace', fontSize:'8px', fontWeight:700, letterSpacing:'0.3px',
        gap:'4px', flexShrink:0,
      }}>
        <span />
        <span>#</span>
        <span>STATUS</span>
        <span>IMG</span>
        <span>SEQUENCE NAME</span>
        <span style={{ textAlign:'right' }}>TA</span>
        <span style={{ textAlign:'right' }}>SL</span>
        <span style={{ textAlign:'right' }}>TR</span>
        <span style={{ textAlign:'right' }}>TE</span>
        <span>PROGRESS</span>
        <span style={{ textAlign:'right' }}>SAR</span>
      </div>

      {/* ── Table rows ──────────────────────────────────────────────────── */}
      <div style={{ flex:1, overflowY:'auto', fontSize:'9.5px' }}>
        {sequences.map((seq, idx) => (
          <QueueRow
            key={seq.id}
            seq={seq}
            idx={idx}
            isSelected={seq.id === selectedSeqId}
            scanProgress={scan.progress}
            onSelect={selectSeq}
            onContextMenu={handleContextMenu}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onOpenSeries={handleOpenSeries}
            dragOverId={dragOverId}
          />
        ))}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'0 8px', height:'18px', borderTop:'1px solid #0d1520', background:'#08101c', flexShrink:0, fontSize:'8.5px' }}>
        <span style={{ color:'#334155', fontFamily:'Roboto Mono,monospace' }}>Σ {formatTime(totalSec)}</span>
        <span style={{ color:'#1e293b' }}>|</span>
        <span style={{ color:'#334155' }}>{sequences.length} seq</span>
        <span style={{ color:'#1e293b' }}>|</span>
        <span style={{ color:'#334155' }}>F5=Run · F6=Pause · Esc=Abort · Drag series to viewer · Double-click=Open · Right-click=Menu</span>
        <div style={{ flex:1 }} />
        <span style={{ color:'#334155', fontFamily:'Roboto Mono,monospace' }}>Calc TA: {calcTA}</span>
      </div>

      {/* ── Context menu ────────────────────────────────────────────────── */}
      {ctxMenu && (
        <ContextMenu
          menu={ctxMenu}
          onClose={() => setCtxMenu(null)}
          onDelete={deleteSeq}
          onDuplicate={id => { duplicateSeq(id); toast('Duplicated','success'); }}
          onMoveUp={id => moveSeq(id, 'up')}
          onMoveDown={id => moveSeq(id, 'down')}
        />
      )}
    </div>
  );
}
