'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useWorkstationStore, type Plane, type FovState } from '@/store/workstationStore';
import { toast } from '@/lib/toast';

const ORIENT: Record<Plane, { top:string; bottom:string; left:string; right:string }> = {
  coronal:  { top:'S', bottom:'I', left:'R', right:'L' },
  sagittal: { top:'S', bottom:'I', left:'A', right:'P' },
  axial:    { top:'A', bottom:'P', left:'R', right:'L' },
};
const PLANE_COLOR: Record<Plane, string> = { coronal:'#ffe040', sagittal:'#60d0ff', axial:'#60ffa0' };
const PLANE_LABEL: Record<Plane, string> = { coronal:'COR', sagittal:'SAG', axial:'TRA' };
const HANDLE_R = 0.04;
const MIN_SIZE = 0.1;

const CURSOR_MAP: Record<string, string> = {
  move: 'move',
  rotate: 'grab',
  top: 'ns-resize', bottom: 'ns-resize', 
  left: 'ew-resize', right: 'ew-resize',
  tl: 'nwse-resize', br: 'nwse-resize', 
  tr: 'nesw-resize', bl: 'nesw-resize',
};

interface Props { plane: Plane; }

export default function MRIViewport({ plane }: Props) {
  const store    = useWorkstationStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const imgRef    = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const rafRef    = useRef<number>(0);
  
  // Drag State
  const drag = useRef<{ 
    handle: string; 
    startX: number; 
    startY: number; 
    initFov: FovState;
  } | null>(null);
  
  const spacePressedRef = useRef(false);
  const zoom      = useRef(1);

  // Sync image or video
  useEffect(() => {
    const url = store.images[plane];
    if (!url) { imgRef.current = null; return; }
    
    // Check if it's a video based on blob URL or string prefix
    const isVideo = url.startsWith('blob:') && url.includes('video') || url.startsWith('data:video/') || url.endsWith('.mp4');
    
    if (isVideo) {
      const vid = document.createElement('video');
      vid.muted = true;
      vid.playsInline = true;
      vid.onloadedmetadata = () => { imgRef.current = vid; };
      vid.src = url;
      vid.load();
    } else {
      const img = new Image();
      img.onload = () => { imgRef.current = img; };
      img.src = url;
    }
  }, [store.images[plane]]);

  // Canvas sizing
  useEffect(() => {
    const wrap = wrapRef.current; const c = canvasRef.current;
    if (!wrap || !c) return;
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      c.width  = Math.max(1, Math.round(r.width));
      c.height = Math.max(1, Math.round(r.height));
    });
    ro.observe(wrap);
    const r = wrap.getBoundingClientRect();
    c.width = Math.max(1, Math.round(r.width));
    c.height = Math.max(1, Math.round(r.height));
    return () => ro.disconnect();
  }, []);

  // ─── INTERACTION LOGIC ──────────────────────────────────────────────────

  const getPos = useCallback((e: React.PointerEvent): { x: number; y: number } => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height };
  }, []);

  const hitHandle = useCallback((px: number, py: number, f: FovState, W: number, H: number): string | null => {
    const cx = (f.x + f.w/2) * W;
    const cy = (f.y + f.h/2) * H;
    const ang = f.rot * Math.PI / 180;
    
    const pxx = px * W;
    const pyy = py * H;
    
    const dx = pxx - cx;
    const dy = pyy - cy;
    
    // Local coords (unrotated, in pixels)
    const lx = dx * Math.cos(-ang) - dy * Math.sin(-ang);
    const ly = dx * Math.sin(-ang) + dy * Math.cos(-ang);
    
    const hw = (f.w/2) * W;
    const hh = (f.h/2) * H;
    
    // Handles in pixels
    const handles = [
      {n:'tl',lx:-hw,ly:-hh},{n:'top',lx:0,ly:-hh},{n:'tr',lx:hw,ly:-hh},
      {n:'right',lx:hw,ly:0},{n:'br',lx:hw,ly:hh},{n:'bottom',lx:0,ly:hh},
      {n:'bl',lx:-hw,ly:hh},{n:'left',lx:-hw,ly:0},
      {n:'rotate',lx:0,ly:-hh-18}, // matching render (-hh-18)
    ];
    
    const HIT_R = 12; // 12 pixels hit radius
    for (const h of handles) {
      if (Math.hypot(lx - h.lx, ly - h.ly) < HIT_R) return h.n;
    }
    
    if (Math.abs(lx) < hw && Math.abs(ly) < hh) return 'move';
    return null;
  }, []);

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    if (e.button !== 0) return;
    const c = canvasRef.current!;
    try { c.setPointerCapture(e.pointerId); } catch(err) {}
    
    store.setActiveVP(plane);
    const pos = getPos(e);
    const currentState = useWorkstationStore.getState();
    const f = currentState.fov[plane];
    const h = hitHandle(pos.x, pos.y, f, c.width, c.height);
    
    if (h && currentState.activeTool === 'crosshair') {
      // Allow dragging handles even if crosshair is active
      drag.current = { handle: h, startX: pos.x, startY: pos.y, initFov: { ...f } };
      c.style.cursor = h === 'rotate' ? 'grabbing' : (CURSOR_MAP[h] || 'default');
    } else if (h) {
      drag.current = { handle: h, startX: pos.x, startY: pos.y, initFov: { ...f } };
      c.style.cursor = h === 'rotate' ? 'grabbing' : (CURSOR_MAP[h] || 'default');
    } else if (currentState.activeTool === 'crosshair') {
      store.setXhair(plane, pos);
    }
  };

  const handleDragMove = (dx: number, dy: number, initFov: FovState): FovState => {
    return { ...initFov, x: initFov.x + dx, y: initFov.y + dy };
  };

  const handleRotate = (pos: {x:number, y:number}, startX: number, startY: number, initFov: FovState, W: number, H: number): FovState => {
    const cx = (initFov.x + initFov.w / 2) * W;
    const cy = (initFov.y + initFov.h / 2) * H;
    const pxx = pos.x * W; const pyy = pos.y * H;
    const sxx = startX * W; const syy = startY * H;
    
    const a0 = Math.atan2(syy - cy, sxx - cx); 
    const a1 = Math.atan2(pyy - cy, pxx - cx); 
    return { ...initFov, rot: initFov.rot + (a1 - a0) * 180 / Math.PI };
  };

  const handleResize = (handle: string, ldx: number, ldy: number, initFov: FovState, W: number, H: number): FovState => {
    const nf = { ...initFov };
    let { x, y, w, h } = initFov;
    const ang = initFov.rot * Math.PI / 180;
    
    // ldx, ldy are in pixels. convert to normalized for w/h
    const ndx = ldx / W;
    const ndy = ldy / H;

    // Expand based on handle, adjusting local origin
    if (handle.includes('right'))  w = Math.max(MIN_SIZE, initFov.w + ndx);
    if (handle.includes('left')) { const nw = Math.max(MIN_SIZE, initFov.w - ndx); const dw = initFov.w - nw; x += dw * Math.cos(ang); y += dw * Math.sin(ang * (W/H)); w = nw; }
    if (handle.includes('bottom')) h = Math.max(MIN_SIZE, initFov.h + ndy);
    if (handle.includes('top'))  { const nh = Math.max(MIN_SIZE, initFov.h - ndy); const dh = initFov.h - nh; x -= dh * Math.sin(ang * (H/W)); y += dh * Math.cos(ang); h = nh; }
    
    nf.x = x; nf.y = y; nf.w = w; nf.h = h;
    return nf;
  };

  const updateOrthogonalViews = (nf: FovState) => {
    store.setFov(plane, nf);
    // Real-time parameter sync
    const posX = ((nf.x + nf.w/2) - 0.5) * 300;
    const posY = ((nf.y + nf.h/2) - 0.5) * 300;
    store.setParam('position', `L${Math.abs(posX).toFixed(1)} P${Math.abs(posY).toFixed(1)} F2.2`);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    e.preventDefault();
    const c = canvasRef.current!;
    const pos = getPos(e);
    
    if (drag.current) {
      const { handle, startX, startY, initFov } = drag.current;
      const dx = pos.x - startX;
      const dy = pos.y - startY;
      let nf: FovState;

      if (handle === 'move') {
        nf = handleDragMove(dx, dy, initFov);
      } else if (handle === 'rotate') {
        nf = handleRotate(pos, startX, startY, initFov, c.width, c.height);
      } else {
        const ang = initFov.rot * Math.PI / 180;
        const pdx = dx * c.width;
        const pdy = dy * c.height;
        const ldx = pdx * Math.cos(-ang) - pdy * Math.sin(-ang);
        const ldy = pdx * Math.sin(-ang) + pdy * Math.cos(-ang);
        nf = handleResize(handle, ldx, ldy, initFov, c.width, c.height);
      }
      
      updateOrthogonalViews(nf);
    } else {
      // Hover cursors
      const currentState = useWorkstationStore.getState();
      const h = hitHandle(pos.x, pos.y, currentState.fov[plane], c.width, c.height);
      c.style.cursor = h ? (CURSOR_MAP[h] || 'default') : 'crosshair';
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    drag.current = null;
    try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch(err) {}
  };

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    if (e.ctrlKey) { zoom.current = Math.max(0.5, Math.min(4, zoom.current + (e.deltaY > 0 ? -0.1 : 0.1))); return; }
    const d = e.deltaY > 0 ? 1 : -1;
    store.setSlice(plane, store.slice[plane].cur + d);
  }

  function onDblClick() {
    store.resetViewport(plane);
    zoom.current = 1;
    toast(`${PLANE_LABEL[plane]} reset`, 'success');
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    
    if (file.type.startsWith('video/')) {
      // For video, use ObjectURL for performance
      const url = URL.createObjectURL(file) + '#video';
      store.setImage(plane, url);
      toast(`Video loaded in ${PLANE_LABEL[plane]}`, 'success');
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => { store.setImage(plane, ev.target?.result as string); toast(`Loaded in ${PLANE_LABEL[plane]}`, 'success'); };
      reader.readAsDataURL(file);
    }
  }

  // ─── RENDERING ──────────────────────────────────────────────────────────
  
  const renderPlanningBox = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number, f: FovState) => {
    const bx=f.x*W, by=f.y*H, bw=f.w*W, bh=f.h*H;
    const cx=bx+bw/2, cy=by+bh/2;
    const ang = f.rot * Math.PI / 180;
    
    ctx.save(); 
    ctx.translate(cx, cy); 
    ctx.rotate(ang);
    
    const hw=bw/2, hh=bh/2;
    // Box
    ctx.fillStyle='rgba(255,224,64,0.05)'; ctx.fillRect(-hw,-hh,bw,bh);
    ctx.strokeStyle='#ffe040'; ctx.lineWidth=1.5; ctx.strokeRect(-hw,-hh,bw,bh);
    
    // Cross center lines
    ctx.strokeStyle='rgba(255,224,64,0.4)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,-hh); ctx.lineTo(0,hh); ctx.moveTo(-hw,0); ctx.lineTo(hw,0); ctx.stroke();
    
    // Corner ticks
    ctx.strokeStyle='#ffe040'; ctx.lineWidth=2;
    [[-hw,-hh],[hw,-hh],[-hw,hh],[hw,hh]].forEach(([px,py])=>{
      const sx=px<0?1:-1, sy=py<0?1:-1, t=8;
      ctx.beginPath(); ctx.moveTo(px,py+sy*t); ctx.lineTo(px,py); ctx.lineTo(px+sx*t,py); ctx.stroke();
    });
    
    // Handles
    const handles:[number,number][]=[[-hw,-hh],[0,-hh],[hw,-hh],[hw,0],[hw,hh],[0,hh],[-hw,hh],[-hw,0]];
    handles.forEach(([hx,hy])=>{
      ctx.fillStyle='#ffe040'; ctx.strokeStyle='rgba(0,0,0,0.7)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.rect(hx-4,hy-4,8,8); ctx.fill(); ctx.stroke();
    });
    
    // Rotation handle
    const rhy=-hh-18;
    ctx.strokeStyle='rgba(255,224,64,0.5)'; ctx.lineWidth=1.5; ctx.setLineDash([2,3]);
    ctx.beginPath(); ctx.moveTo(0,-hh); ctx.lineTo(0,rhy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#ffe040'; ctx.strokeStyle='rgba(0,0,0,0.7)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(0,rhy,4.5,0,Math.PI*2); ctx.fill(); ctx.stroke();
    
    ctx.restore();
  }, []);

  const renderCanvas = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const W = c.width, H = c.height;
    
    // Always get the latest state directly from the store to avoid stale closures in the RAF loop
    const state = useWorkstationStore.getState();
    const { fov, xhair, slice, scan, show, sequences, selectedSeqId, wl } = state;
    
    const f = fov[plane];
    const sl = slice[plane];
    const w = wl[plane];

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

    // Draw image
    const img = imgRef.current;
    if (img) {
      const t = sl.max > 1 ? (sl.cur - 1) / (sl.max - 1) : 0.5;
      
      let imgW = 0, imgH = 0;
      if (img instanceof HTMLVideoElement) {
        if (!isNaN(img.duration) && img.duration > 0) img.currentTime = t * img.duration;
        imgW = img.videoWidth; imgH = img.videoHeight;
      } else {
        imgW = img.width; imgH = img.height;
      }
      
      const bri = w.brightness.toFixed(2);
      const con = w.contrast.toFixed(2);
      ctx.filter = `brightness(${bri}) contrast(${con})`;
      ctx.save();
      const zf = zoom.current;
      const cx = W / 2, cy = H / 2;
      ctx.translate(cx, cy); ctx.scale(zf, zf); ctx.translate(-cx, -cy);
      if (imgW > 0 && imgH > 0) ctx.drawImage(img, 0, 0, imgW, imgH, 0, 0, W, H);
      ctx.restore();
      ctx.filter = 'none';
      // Vignette
      const grad = ctx.createRadialGradient(W/2,H/2,H*0.3,W/2,H/2,H*0.8);
      grad.addColorStop(0,'transparent'); grad.addColorStop(1,'rgba(0,0,0,0.4)');
      ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);
    } else {
      // Placeholder grid
      ctx.strokeStyle = '#0f1e30'; ctx.lineWidth = 1;
      for (let x=0;x<=W;x+=30) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
      for (let y=0;y<=H;y+=30) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
      ctx.fillStyle = '#1e3a5f'; ctx.font = 'bold 14px Roboto Mono, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(PLANE_LABEL[plane], W/2, H/2 - 12);
      ctx.font = '10px Roboto Mono, monospace'; ctx.fillStyle = '#1e293b';
      ctx.fillText('Drop an MRI image here', W/2, H/2 + 10);
    }

    if (show.labels) {
      const o = ORIENT[plane];
      ctx.font = 'bold 11px Roboto Mono, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.shadowColor = '#000'; ctx.shadowBlur = 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';    ctx.fillText(o.top, W/2, 6);
      ctx.textBaseline = 'bottom'; ctx.fillText(o.bottom, W/2, H-6);
      ctx.textAlign = 'left';      ctx.textBaseline = 'middle'; ctx.fillText(o.left, 5, H/2);
      ctx.textAlign = 'right';     ctx.fillText(o.right, W-5, H/2);
      ctx.shadowBlur = 0;
    }

    if (show.xhair) {
      const ch = xhair[plane];
      const cx = ch.x * W, cy = ch.y * H;
      ctx.save(); ctx.strokeStyle = 'rgba(0,212,255,0.65)'; ctx.lineWidth = 1; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(0,cy); ctx.lineTo(W,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,0); ctx.lineTo(cx,H); ctx.stroke();
      ctx.setLineDash([]); ctx.strokeStyle = 'rgba(0,220,255,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    if (show.fov) {
      renderPlanningBox(ctx, W, H, f);
    }

    if (show.sliceMarkers && sl.max > 1) {
      const spacing = H / sl.max;
      ctx.strokeStyle = 'rgba(0,155,222,0.15)'; ctx.lineWidth = 0.5;
      for (let i=0;i<=sl.max;i++) { const y=i*spacing; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
      const curY = (sl.cur - 1) * spacing;
      ctx.fillStyle = 'rgba(0,155,222,0.1)'; ctx.fillRect(0,curY,W,spacing);
      ctx.strokeStyle = 'rgba(0,155,222,0.5)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(0,curY); ctx.lineTo(W,curY); ctx.stroke();
    }

    if (scan.running && !scan.paused) {
      const sweepY = (scan.progress / 100) * H;
      const g = ctx.createLinearGradient(0,sweepY-8,0,sweepY+8);
      g.addColorStop(0,'transparent'); g.addColorStop(0.5,'rgba(34,197,94,0.8)'); g.addColorStop(1,'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, sweepY-8, W, 16);
      ctx.fillStyle = 'rgba(34,197,94,0.04)';
      ctx.fillRect(0,0,W,sweepY);
    }

    const seq = state.sequences.find(s => s.id === state.selectedSeqId);
    ctx.font = 'bold 9.5px Roboto Mono, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = PLANE_COLOR[plane];
    ctx.fillText(PLANE_LABEL[plane], 6, 5);
    if (seq) {
      ctx.fillStyle = 'rgba(100,116,139,0.6)'; ctx.font = '8px Roboto Mono, monospace';
      ctx.fillText(seq.name.slice(0,22), 34, 6);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(100,116,139,0.55)';
    ctx.fillText(`TR${seq?.tr??''} TE${seq?.te??''} ${state.params.thickness}mm`, W-5, 5);
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText(`${sl.cur}/${sl.max}`, 6, H-5);
    ctx.textAlign = 'right';
    ctx.fillText(state.params.position, W-5, H-5);
  }, [plane, renderPlanningBox]);

  useEffect(() => {
    let running = true;
    const loop = () => { if (!running) return; renderCanvas(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [renderCanvas]);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (['INPUT','SELECT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.code === 'Space') { spacePressedRef.current = true; }
      if (e.key === 'Delete' && store.activeVP === plane) store.resetViewport(plane);
    };
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') spacePressedRef.current = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [plane]);

  return (
    <div
      ref={wrapRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}
      onContextMenu={e => e.preventDefault()}
      onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add('drag-over'); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) (e.currentTarget as HTMLElement).classList.remove('drag-over'); }}
      onDrop={onDrop}
    >
      <canvas
        ref={canvasRef}
        className="vp-canvas"
        onPointerDown={startDrag}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDblClick}
        style={{ width:'100%', height:'100%', display:'block', touchAction:'none' }}
      />
    </div>
  );
}
