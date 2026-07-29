'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useWorkstationStore, type Plane } from '@/store/workstationStore';
import { toast } from '@/lib/toast';

const ORIENT: Record<Plane, { top:string; bottom:string; left:string; right:string }> = {
  coronal:  { top:'S', bottom:'I', left:'R', right:'L' },
  sagittal: { top:'S', bottom:'I', left:'A', right:'P' },
  axial:    { top:'A', bottom:'P', left:'R', right:'L' },
};
const PLANE_COLOR: Record<Plane, string> = { coronal:'#ffe040', sagittal:'#60d0ff', axial:'#60ffa0' };
const PLANE_LABEL: Record<Plane, string> = { coronal:'COR', sagittal:'SAG', axial:'TRA' };
const HANDLE_R = 0.04;
const CURSOR_MAP: Record<string, string> = {
  move:'grab', rotate:'crosshair',
  top:'n-resize', bottom:'s-resize', left:'w-resize', right:'e-resize',
  tl:'nw-resize', tr:'ne-resize', bl:'sw-resize', br:'se-resize',
};

interface Props { plane: Plane; }

export default function MRIViewport({ plane }: Props) {
  const store    = useWorkstationStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const rafRef    = useRef<number>(0);
  const drag      = useRef<{ handle: string | null; startX: number; startY: number; initFov: typeof store.fov.axial } | null>(null);
  const panning   = useRef(false);
  const spacePressedRef = useRef(false);
  const zoom      = useRef(1);

  // Sync image
  useEffect(() => {
    const url = store.images[plane];
    if (!url) { imgRef.current = null; return; }
    const img = new Image();
    img.onload = () => { imgRef.current = img; };
    img.src = url;
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

  // Render loop
  const render = useCallback(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const W = c.width, H = c.height;
    const { fov, xhair, slice, scan, show, sequences, selectedSeqId, wl } = store;
    const f = fov[plane];
    const sl = slice[plane];
    const w = wl[plane];

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // Draw image
    const img = imgRef.current;
    if (img) {
      const t = sl.max > 1 ? (sl.cur - 1) / (sl.max - 1) : 0.5;
      const crop = (t - 0.5) * 0.15;
      const sx = Math.max(0, crop) * img.width;
      const sy = Math.max(0, crop) * img.height;
      const sw = (1 - Math.abs(crop)) * img.width;
      const sh = (1 - Math.abs(crop)) * img.height;
      const bri = (w.brightness * (0.85 + 0.3 * Math.sin(t * Math.PI))).toFixed(2);
      const con = w.contrast.toFixed(2);
      ctx.filter = `brightness(${bri}) contrast(${con})`;
      ctx.save();
      const zf = zoom.current;
      const cx = W / 2, cy = H / 2;
      ctx.translate(cx, cy); ctx.scale(zf, zf); ctx.translate(-cx, -cy);
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, W, H);
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

    // Orientation labels
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

    // Crosshair
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

    // FoV planning box
    if (show.fov) {
      const bx=f.x*W, by=f.y*H, bw=f.w*W, bh=f.h*H;
      const cx=bx+bw/2, cy=by+bh/2;
      const ang = f.rot * Math.PI / 180;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(ang);
      const hw=bw/2, hh=bh/2;
      ctx.fillStyle='rgba(255,224,64,0.05)'; ctx.fillRect(-hw,-hh,bw,bh);
      ctx.strokeStyle='#ffe040'; ctx.lineWidth=1.5; ctx.strokeRect(-hw,-hh,bw,bh);
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
      ctx.strokeStyle='rgba(255,224,64,0.5)'; ctx.lineWidth=1; ctx.setLineDash([2,4]);
      ctx.beginPath(); ctx.moveTo(0,-hh); ctx.lineTo(0,rhy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle='#ffe040'; ctx.strokeStyle='rgba(0,0,0,0.7)';
      ctx.beginPath(); ctx.arc(0,rhy,4,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.restore();
    }

    // Slice markers
    if (show.sliceMarkers && sl.max > 1) {
      const spacing = H / sl.max;
      ctx.strokeStyle = 'rgba(0,155,222,0.15)'; ctx.lineWidth = 0.5;
      for (let i=0;i<=sl.max;i++) { const y=i*spacing; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
      const curY = (sl.cur - 1) * spacing;
      ctx.fillStyle = 'rgba(0,155,222,0.1)'; ctx.fillRect(0,curY,W,spacing);
      ctx.strokeStyle = 'rgba(0,155,222,0.5)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(0,curY); ctx.lineTo(W,curY); ctx.stroke();
    }

    // Scan sweep
    if (scan.running && !scan.paused) {
      const sweepY = (scan.progress / 100) * H;
      const g = ctx.createLinearGradient(0,sweepY-8,0,sweepY+8);
      g.addColorStop(0,'transparent'); g.addColorStop(0.5,'rgba(34,197,94,0.8)'); g.addColorStop(1,'transparent');
      ctx.fillStyle = g; ctx.fillRect(0, sweepY-8, W, 16);
      // Progress overlay
      ctx.fillStyle = 'rgba(34,197,94,0.04)';
      ctx.fillRect(0,0,W,sweepY);
    }

    // Corner info labels
    const seq = sequences.find(s => s.id === selectedSeqId);
    ctx.font = 'bold 9.5px Roboto Mono, monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = PLANE_COLOR[plane];
    ctx.fillText(PLANE_LABEL[plane], 6, 5);
    if (seq) {
      ctx.fillStyle = 'rgba(100,116,139,0.6)'; ctx.font = '8px Roboto Mono, monospace';
      ctx.fillText(seq.name.slice(0,22), 34, 6);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(100,116,139,0.55)';
    ctx.fillText(`TR${seq?.tr??''} TE${seq?.te??''} ${store.params.thickness}mm`, W-5, 5);
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText(`${sl.cur}/${sl.max}`, 6, H-5);
    ctx.textAlign = 'right';
    ctx.fillText(store.params.position, W-5, H-5);
  }, [plane]);

  useEffect(() => {
    let running = true;
    const loop = () => { if (!running) return; render(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [render]);

  // Hit test FoV handle
  function hitHandle(px: number, py: number, f: typeof store.fov.axial): string | null {
    const cx=f.x+f.w/2, cy=f.y+f.h/2;
    const ang=f.rot*Math.PI/180;
    const dx=px-cx, dy=py-cy;
    const lx=dx*Math.cos(-ang)-dy*Math.sin(-ang);
    const ly=dx*Math.sin(-ang)+dy*Math.cos(-ang);
    const hw=f.w/2, hh=f.h/2;
    const handles=[
      {n:'tl',lx:-hw,ly:-hh},{n:'top',lx:0,ly:-hh},{n:'tr',lx:hw,ly:-hh},
      {n:'right',lx:hw,ly:0},{n:'br',lx:hw,ly:hh},{n:'bottom',lx:0,ly:hh},
      {n:'bl',lx:-hw,ly:hh},{n:'left',lx:-hw,ly:0},{n:'rotate',lx:0,ly:-hh-HANDLE_R*2.5},
    ];
    for (const h of handles) if (Math.hypot(lx-h.lx,ly-h.ly)<HANDLE_R*1.8) return h.n;
    if (Math.abs(lx)<hw && Math.abs(ly)<hh) return 'move';
    return null;
  }

  function getPos(e: React.MouseEvent): { x: number; y: number } {
    const c = canvasRef.current!; const r = c.getBoundingClientRect();
    return { x:(e.clientX-r.left)/r.width, y:(e.clientY-r.top)/r.height };
  }

  function onMouseDown(e: React.MouseEvent) {
    if (e.button === 2) return;
    store.setActiveVP(plane);
    const pos = getPos(e);
    const f = store.fov[plane];
    const h = hitHandle(pos.x, pos.y, f);
    if (h) {
      drag.current = { handle: h, startX: pos.x, startY: pos.y, initFov: { ...f } };
    } else {
      store.setXhair(plane, pos);
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    const c = canvasRef.current!;
    const pos = getPos(e);
    const f = store.fov[plane];

    if (drag.current) {
      const { handle, startX, startY, initFov } = drag.current;
      const dx = pos.x - startX, dy = pos.y - startY;
      const ang = initFov.rot * Math.PI / 180;
      const ldx = dx * Math.cos(-ang) - dy * Math.sin(-ang);
      const ldy = dx * Math.sin(-ang) + dy * Math.cos(-ang);
      const MIN = 0.05;
      const nf = { ...f };

      if (handle === 'move')   { 
        nf.x=Math.max(0,Math.min(1-f.w,initFov.x+dx)); 
        nf.y=Math.max(0,Math.min(1-f.h,initFov.y+dy)); 
      }
      else if (handle==='rotate') { 
        const a0=Math.atan2(startY-(initFov.y+initFov.h/2),startX-(initFov.x+initFov.w/2)); 
        const a1=Math.atan2(pos.y-(initFov.y+initFov.h/2),pos.x-(initFov.x+initFov.w/2)); 
        nf.rot=initFov.rot+(a1-a0)*180/Math.PI; 
      }
      else if (handle) {
        // Symmetric resize from center for MRI standard behavior
        let dw = 0; let dh = 0;
        if (handle.includes('right')) dw = ldx * 2;
        if (handle.includes('left'))  dw = -ldx * 2;
        if (handle.includes('bottom')) dh = ldy * 2;
        if (handle.includes('top') && handle !== 'top') dh = -ldy * 2; // 'top' is matched, but 'tl'/'tr' also include 't'
        if (handle === 'top') dh = -ldy * 2;

        const nw = Math.max(MIN, initFov.w + dw);
        const nh = Math.max(MIN, initFov.h + dh);
        
        // Keep center fixed
        const cx = initFov.x + initFov.w / 2;
        const cy = initFov.y + initFov.h / 2;
        
        nf.w = nw;
        nf.h = nh;
        nf.x = cx - nw / 2;
        nf.y = cy - nh / 2;
      }

      store.setFov(plane, nf);
      const posX=((nf.x+nf.w/2)-0.5)*300, posY=((nf.y+nf.h/2)-0.5)*300;
      store.setParam('position', `L${Math.abs(posX).toFixed(1)} P${Math.abs(posY).toFixed(1)} F2.2`);
      c.style.cursor = handle ? (CURSOR_MAP[handle] || 'default') : 'crosshair';
    } else {
      const h = hitHandle(pos.x, pos.y, f);
      c.style.cursor = h ? (CURSOR_MAP[h] || 'default') : 'crosshair';
    }
  }

  function onMouseUp() { drag.current = null; }

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
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => { store.setImage(plane, ev.target?.result as string); toast(`Loaded in ${PLANE_LABEL[plane]}`, 'success'); };
    reader.readAsDataURL(file);
  }

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
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onDoubleClick={onDblClick}
      />
    </div>
  );
}
