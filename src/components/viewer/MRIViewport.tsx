'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useWorkstationStore, type PlanningObject } from '@/store/workstationStore';
import {
  type Plane,
  project3Dto2D, unproject2Dto3D,
  getFovHandles2D, hitTestFov, projectSlicePolygons,
  getPlanningTargetPlane, CURSOR_MAP,
  VIEW_FOV_MM,
} from '@/lib/geometry';
import { toast } from '@/lib/toast';

// ── Constants ──────────────────────────────────────────────

const ORIENT: Record<Plane, { top: string; bottom: string; left: string; right: string }> = {
  coronal:  { top: 'S', bottom: 'I', left: 'L', right: 'R' },
  sagittal: { top: 'S', bottom: 'I', left: 'A', right: 'P' },
  axial:    { top: 'A', bottom: 'P', left: 'R', right: 'L' },
};

const PLANE_COLOR: Record<Plane, string> = {
  coronal:  '#ffe040',
  sagittal: '#60d0ff',
  axial:    '#60ffa0',
};

const PLANE_LABEL: Record<Plane, string> = {
  coronal:  'COR',
  sagittal: 'SAG',
  axial:    'TRA',
};

// ── Types ──────────────────────────────────────────────────

interface DragState {
  type: 'fov' | 'pan' | 'wl';
  handle?: string;
  startX: number; startY: number;
  initPlan?: PlanningObject;
  initPanX?: number; initPanY?: number;
  initW?: number; initL?: number;
}

interface Props { plane: Plane; }

// ── Component ─────────────────────────────────────────────

export default function MRIViewport({ plane }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const imgRef    = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const rafRef    = useRef<number>(0);
  const drag      = useRef<DragState | null>(null);
  const pan       = useRef({ x: 0, y: 0 });
  const zoom      = useRef(1);

  // ── Image loading ─────────────────────────────────────────

  useEffect(() => {
    const store = useWorkstationStore.getState();
    const url = store.images[plane];
    if (!url) { imgRef.current = null; return; }

    const isVideo =
      (url.startsWith('blob:') && url.includes('video')) ||
      url.startsWith('data:video/') ||
      url.endsWith('.mp4');

    if (isVideo) {
      const vid = document.createElement('video');
      vid.muted = true; vid.playsInline = true;
      vid.onloadedmetadata = () => { imgRef.current = vid; };
      vid.src = url; vid.load();
    } else {
      const img = new Image();
      img.onload = () => { imgRef.current = img; };
      img.src = url;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useWorkstationStore(s => s.images[plane])]);

  // ── Canvas sizing ──────────────────────────────────────────

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
    c.width  = Math.max(1, Math.round(r.width));
    c.height = Math.max(1, Math.round(r.height));
    return () => ro.disconnect();
  }, []);

  // ── Position utility ──────────────────────────────────────

  const getPos = useCallback((e: PointerEvent | React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }, []);

  // ── Interaction ──────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const c = canvasRef.current!;
    try { c.setPointerCapture(e.pointerId); } catch (_) {}
    
    const store = useWorkstationStore.getState();
    store.setActiveVP(plane);
    const pos = getPos(e);
    
    // Check if planning is active
    if (!store.planningActive) return;

    // ── Right Click / Ctrl+Left → Window/Level ──
    if (e.button === 2 || (e.button === 0 && e.ctrlKey)) {
      drag.current = {
        type: 'wl', startX: pos.x, startY: pos.y,
        initW: store.wl[plane].window, initL: store.wl[plane].level,
      };
      c.style.cursor = 'ew-resize';
      return;
    }

    // ── Middle Click / Shift+Left → Pan ──
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      drag.current = {
        type: 'pan', startX: pos.x, startY: pos.y,
        initPanX: pan.current.x, initPanY: pan.current.y,
      };
      c.style.cursor = 'grabbing';
      return;
    }

    // ── Left Click → FOV or blank ──
    if (e.button !== 0) return;

    const targetPlane = getPlanningTargetPlane(store.planning);
    const isTarget = targetPlane === plane;

    if (isTarget) {
      // On the active planning view: full FOV interaction
      const handles = getFovHandles2D(store.planning, plane, c.width, c.height);
      const hitResult = hitTestFov(pos.x * c.width, pos.y * c.height, handles);

      if (hitResult) {
        drag.current = { type: 'fov', handle: hitResult, startX: pos.x, startY: pos.y, initPlan: { ...store.planning } };
        c.style.cursor = hitResult === 'rotate' ? 'grabbing' : (CURSOR_MAP[hitResult] || 'move');
      } else {
        // Click anywhere on image → reposition center of FOV there
        const dxPx = (pos.x - 0.5) * c.width;
        const dyPx = (pos.y - 0.5) * c.height;
        const d3 = unproject2Dto3D(dxPx / zoom.current, dyPx / zoom.current, plane, c.width, c.height);
        const newPlan = {
          ...store.planning,
          centerX: d3.x, centerY: d3.y, centerZ: d3.z,
        };
        store.setPlanning(newPlan);
        drag.current = {
          type: 'fov', handle: 'move', startX: pos.x, startY: pos.y,
          initPlan: newPlan,
        };
        c.style.cursor = 'move';
      }
    } else {
      // On projected views: drag the slab (move along normal direction)
      drag.current = { type: 'fov', handle: 'move', startX: pos.x, startY: pos.y, initPlan: { ...store.planning } };
      c.style.cursor = 'move';
    }
  }, [plane, getPos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const c = canvasRef.current!;
    const pos = getPos(e);
    const state = useWorkstationStore.getState();

    if (drag.current) {
      const { type, startX, startY } = drag.current;
      const dxPx = (pos.x - startX) * c.width;
      const dyPx = (pos.y - startY) * c.height;

      if (type === 'wl') {
        state.setWL(plane, {
          window: Math.max(1, drag.current.initW! + dxPx * 4),
          level: drag.current.initL! - dyPx * 4,
        });
      } else if (type === 'pan') {
        pan.current = { x: drag.current.initPanX! + dxPx, y: drag.current.initPanY! + dyPx };
      } else if (type === 'fov') {
        const { handle, initPlan } = drag.current;
        if (!initPlan) return;
        const store = useWorkstationStore.getState();

        if (handle === 'move') {
          // Move the 3D center
          const d3 = unproject2Dto3D(dxPx / zoom.current, dyPx / zoom.current, plane, c.width, c.height);
          store.setPlanning({
            centerX: initPlan.centerX + d3.x,
            centerY: initPlan.centerY + d3.y,
            centerZ: initPlan.centerZ + d3.z,
          });
        } else if (handle === 'rotate') {
          // Rotation: horizontal drag → rotation around the normal axis of the slice
          const degPerPx = 180 / c.width;
          const delta = dxPx * degPerPx;
          if (plane === 'axial') {
            store.setPlanning({ rotZ: (initPlan.rotZ + delta) % 360 });
          } else if (plane === 'coronal') {
            store.setPlanning({ rotY: (initPlan.rotY + delta) % 360 });
          } else {
            store.setPlanning({ rotX: (initPlan.rotX + delta) % 360 });
          }
        } else {
          // Resize — handle specific edges/corners
          const scaleMm = VIEW_FOV_MM / Math.min(c.width, c.height);
          const dxMm = dxPx * scaleMm / zoom.current;
          const dyMm = dyPx * scaleMm / zoom.current;
          let newFovRead = initPlan.fovRead;
          let newFovPhase = initPlan.fovPhase;

          const isLeft   = handle === 'left'   || handle === 'tl' || handle === 'bl';
          const isRight  = handle === 'right'  || handle === 'tr' || handle === 'br';
          const isTop    = handle === 'top'    || handle === 'tl' || handle === 'tr';
          const isBottom = handle === 'bottom' || handle === 'bl' || handle === 'br';

          // For FOV read: left edge dragged left increases width, right increases right
          if (isLeft)   newFovRead = Math.max(20, initPlan.fovRead - dxMm * 2);
          if (isRight)  newFovRead = Math.max(20, initPlan.fovRead + dxMm * 2);
          if (isTop)    newFovPhase = Math.max(20, initPlan.fovPhase - dyMm * 2);
          if (isBottom) newFovPhase = Math.max(20, initPlan.fovPhase + dyMm * 2);

          // Clamp to reasonable MRI FOV range
          newFovRead  = Math.min(500, newFovRead);
          newFovPhase = Math.min(500, newFovPhase);

          store.setPlanning({ fovRead: newFovRead, fovPhase: newFovPhase });
        }
      }
    } else {
      // Hover: update cursor
      if (!state.planningActive) { c.style.cursor = 'default'; return; }
      
      const targetPlane = getPlanningTargetPlane(state.planning);
      if (targetPlane === plane) {
        const handles = getFovHandles2D(state.planning, plane, c.width, c.height);
        const hit = hitTestFov(pos.x * c.width, pos.y * c.height, handles);
        c.style.cursor = hit ? (CURSOR_MAP[hit] || 'default') : 'default';
      } else {
        c.style.cursor = 'default';
      }
    }
  }, [plane, getPos]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    drag.current = null;
    try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch (_) {}
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const d = e.deltaY > 0 ? -1 : 1;
    const state = useWorkstationStore.getState();
    if (!state.planningActive) return;

    if (e.ctrlKey || e.metaKey) {
      // FOV Read
      state.setPlanning({ fovRead: Math.max(20, Math.min(500, state.planning.fovRead + d * 5)) });
    } else if (e.shiftKey) {
      // Slice Count
      state.setPlanning({ sliceCount: Math.max(1, Math.min(200, state.planning.sliceCount + d)) });
    } else if (e.altKey) {
      // Slice Thickness
      state.setPlanning({ sliceThickness: Math.max(0.5, Math.min(20, state.planning.sliceThickness + d * 0.5)) });
    } else {
      // Zoom
      zoom.current = Math.max(0.3, Math.min(8, zoom.current * (e.deltaY > 0 ? 0.9 : 1.1)));
    }
  }, []);

  const onDblClick = useCallback(() => {
    zoom.current = 1;
    pan.current = { x: 0, y: 0 };
    toast(`${PLANE_LABEL[plane]} — Fit to screen`);
  }, [plane]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const store = useWorkstationStore.getState();

    const loadImage = (url: string) => {
      store.setImageAll(url);
      toast(`Loaded: ${file.name}`, 'success');
    };

    if (file.type.startsWith('video/')) {
      loadImage(URL.createObjectURL(file));
    } else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = ev => loadImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }, []);

  // ── Keyboard Shortcuts ────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useWorkstationStore.getState().activeVP !== plane) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      const store = useWorkstationStore.getState();

      switch (e.key) {
        case 'r': case 'R':
          store.resetPlanning();
          break;
        case 'f': case 'F':
          zoom.current = 1; pan.current = { x: 0, y: 0 };
          toast('Fit to screen');
          break;
        case '0':
          zoom.current = 1; toast('Zoom reset');
          break;
        case 'Delete':
          zoom.current = 1; pan.current = { x: 0, y: 0 };
          store.resetViewport(plane);
          break;
        case 'ArrowUp':
        case 'ArrowDown':
        case 'ArrowLeft':
        case 'ArrowRight': {
          e.preventDefault();
          const c = canvasRef.current!;
          const step = e.shiftKey ? 10 : 1;
          let dx = 0, dy = 0;
          if (e.key === 'ArrowLeft')  dx = -step;
          if (e.key === 'ArrowRight') dx =  step;
          if (e.key === 'ArrowUp')    dy = -step;
          if (e.key === 'ArrowDown')  dy =  step;
          const d3 = unproject2Dto3D(dx, dy, plane, c.width, c.height);
          const p = store.planning;
          store.setPlanning({ centerX: p.centerX + d3.x, centerY: p.centerY + d3.y, centerZ: p.centerZ + d3.z });
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [plane]);

  // ── Rendering ─────────────────────────────────────────────

  const renderGrid = useCallback((ctx: CanvasRenderingContext2D, W: number, H: number, isDark: boolean) => {
    const gridColor = isDark ? '#0d1e30' : '#d0dae8';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    const gridSize = 30;
    for (let x = 0; x <= W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y <= H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }, []);

  const renderEmptyState = useCallback((
    ctx: CanvasRenderingContext2D, W: number, H: number, isDark: boolean
  ) => {
    // Background
    ctx.fillStyle = isDark ? '#06090f' : '#f0f4fa';
    ctx.fillRect(0, 0, W, H);

    // Planning grid
    renderGrid(ctx, W, H, isDark);

    // Plane label (large, centered)
    ctx.font = 'bold 13px Roboto Mono, monospace';
    ctx.fillStyle = PLANE_COLOR[plane];
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(PLANE_LABEL[plane], 6, 5);
  }, [plane, renderGrid]);

  const renderFovBox = useCallback((
    ctx: CanvasRenderingContext2D,
    W: number, H: number,
    plan: PlanningObject,
    isActive: boolean,
  ) => {
    if (isActive) {
      // ── Active planning viewport: full FOV rectangle + handles ──
      const handles = getFovHandles2D(plan, plane, W, H);

      // Outline and Semi-transparent fill
      ctx.beginPath();
      ctx.moveTo(handles.tl.x, handles.tl.y);
      ctx.lineTo(handles.tr.x, handles.tr.y);
      ctx.lineTo(handles.br.x, handles.br.y);
      ctx.lineTo(handles.bl.x, handles.bl.y);
      ctx.closePath();
      
      // Semi-transparent fill
      ctx.fillStyle = 'rgba(255, 224, 64, 0.1)';
      ctx.fill();

      // Outline
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.stroke();

      // Rotation handle: dashed line + circle
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(handles.top.x, handles.top.y);
      ctx.lineTo(handles.rot.x, handles.rot.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(handles.rot.x, handles.rot.y, 4, 0, Math.PI * 2);
      ctx.stroke();

      // Crosshair at center
      const cx = handles.center.x, cy = handles.center.y;
      const cSize = 4;
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - cSize, cy); ctx.lineTo(cx + cSize, cy);
      ctx.moveTo(cx, cy - cSize); ctx.lineTo(cx, cy + cSize);
      ctx.stroke();

      // 8 Handles (Hollow squares)
      const hs = 3; // Half-size (so 6x6 total)
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 1;
      const allHandles = [
        handles.tl, handles.tr, handles.br, handles.bl,
        handles.top, handles.bottom, handles.left, handles.right
      ];
      allHandles.forEach(h => {
        // We draw hollow squares. Using clearRect to ensure background image shows through isn't strictly necessary 
        // since we just stroke it, but strokeRect is perfect.
        ctx.strokeRect(h.x - hs, h.y - hs, hs * 2, hs * 2);
      });

      // Phase Arrow (indicating Phase Encoding Direction)
      // Reference image has an arrow on the right edge pointing in Phase direction (typically A->P which is down)
      // Vector from top to bottom handle represents phase direction.
      const dx = handles.bottom.x - handles.top.x;
      const dy = handles.bottom.y - handles.top.y;
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        const nx = dx / len;
        const ny = dy / len;
        
        // Arrow starts from the right handle, pointing "down" along the phase vector
        const startX = handles.right.x;
        const startY = handles.right.y;
        const arrowLen = 18;
        const endX = startX + nx * arrowLen;
        const endY = startY + ny * arrowLen;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        // Arrow head (V shape)
        const headLen = 5;
        const angle = Math.atan2(ny, nx);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI/6), endY - headLen * Math.sin(angle - Math.PI/6));
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI/6), endY - headLen * Math.sin(angle + Math.PI/6));
        ctx.stroke();
      }

    } else {
      // ── Projected viewport: true slice thickness via polygons ──
      const polygons = projectSlicePolygons(plan, plane, W, H);
      
      for (const poly of polygons) {
        ctx.beginPath();
        ctx.moveTo(poly.corners[0].x, poly.corners[0].y);
        ctx.lineTo(poly.corners[1].x, poly.corners[1].y);
        ctx.lineTo(poly.corners[2].x, poly.corners[2].y);
        ctx.lineTo(poly.corners[3].x, poly.corners[3].y);
        ctx.closePath();

        // Stroke
        ctx.strokeStyle = '#ffff00'; // All slice lines are yellow in Siemens reference
        ctx.lineWidth = 1;
        if (poly.isCenter) {
          ctx.setLineDash([5, 5]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();

        // Fill with slight green tint for slice volume representation
        ctx.fillStyle = 'rgba(34, 197, 94, 0.05)';
        ctx.fill();
        
        // Draw the center cross on the middle slice
        if (poly.isCenter) {
          const cx = (poly.corners[0].x + poly.corners[1].x + poly.corners[2].x + poly.corners[3].x) / 4;
          const cy = (poly.corners[0].y + poly.corners[1].y + poly.corners[2].y + poly.corners[3].y) / 4;
          const cSize = 4;
          ctx.beginPath();
          ctx.moveTo(cx - cSize, cy); ctx.lineTo(cx + cSize, cy);
          ctx.moveTo(cx, cy - cSize); ctx.lineTo(cx, cy + cSize);
          ctx.stroke();
          
          // Draw the small diamond/circle marker in the center
          ctx.beginPath();
          ctx.arc(cx, cy, 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      ctx.setLineDash([]); // Reset
    }
  }, [plane]);

  const renderCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width, H = c.height;

    const state = useWorkstationStore.getState();
    const { planning, planningActive, wl, show, scan, sequences, selectedSeqId, debugMode, theme } = state;
    const isDark = theme !== 'light';

    ctx.clearRect(0, 0, W, H);

    // ── Empty state (no image loaded) ──
    if (!planningActive) {
      renderEmptyState(ctx, W, H, isDark);

      if (show.labels) {
        const o = ORIENT[plane];
        ctx.font = 'bold 11px Roboto Mono, monospace';
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(o.top, W / 2, 6);
        ctx.textBaseline = 'bottom';
        ctx.fillText(o.bottom, W / 2, H - 6);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(o.left, 5, H / 2);
        ctx.textAlign = 'right';
        ctx.fillText(o.right, W - 5, H / 2);
      }

      // "Load image" hint
      ctx.font = '10px Roboto Mono, monospace';
      ctx.fillStyle = isDark ? '#1e3a5f' : '#8ba4c0';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Drop an MRI image here or use Import MRI', W / 2, H / 2 + 28);
      return;
    }

    // ── Active state (image loaded) ──
    const w = wl[plane];
    const img = imgRef.current;

    // Background
    ctx.fillStyle = isDark ? '#06090f' : '#e8ecf2';
    ctx.fillRect(0, 0, W, H);

    // Draw image with pan/zoom and W/L
    if (img) {
      let imgW = 0, imgH = 0;
      if (img instanceof HTMLVideoElement) {
        const sl = state.wl[plane]; // use wl as proxy for slice
        if (!isNaN(img.duration) && img.duration > 0) img.currentTime = 0.5 * img.duration;
        imgW = img.videoWidth; imgH = img.videoHeight;
      } else {
        imgW = img.width; imgH = img.height;
      }

      if (imgW > 0 && imgH > 0) {
        const bri = w.brightness.toFixed(2);
        const con = w.contrast.toFixed(2);
        ctx.filter = `brightness(${bri}) contrast(${con})`;
        ctx.save();
        const zf = zoom.current;
        const pcx = W / 2 + pan.current.x;
        const pcy = H / 2 + pan.current.y;
        ctx.translate(pcx, pcy);
        ctx.scale(zf, zf);
        ctx.translate(-pcx, -pcy);

        // Fit image to viewport maintaining aspect ratio
        const scale = Math.min(W / imgW, H / imgH);
        const dw = imgW * scale;
        const dh = imgH * scale;
        const dx = (W - dw) / 2;
        const dy = (H - dh) / 2;
        ctx.drawImage(img, dx, dy, dw, dh);

        ctx.restore();
        ctx.filter = 'none';

        // Subtle vignette
        const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, isDark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.08)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      // Image still loading: show grid
      renderGrid(ctx, W, H, isDark);
    }

    // ── Orientation labels ──
    if (show.labels) {
      const o = ORIENT[plane];
      ctx.font = 'bold 11px Roboto Mono, monospace';
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)';
      ctx.shadowColor = isDark ? '#000' : '#fff'; ctx.shadowBlur = 3;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(o.top, W / 2, 6);
      ctx.textBaseline = 'bottom';
      ctx.fillText(o.bottom, W / 2, H - 6);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(o.left, 5, H / 2);
      ctx.textAlign = 'right';
      ctx.fillText(o.right, W - 5, H / 2);
      ctx.shadowBlur = 0;
    }

    // ── FOV and Slice Projection ──
    if (show.fov) {
      const targetPlane = getPlanningTargetPlane(planning);
      const isTarget = targetPlane === plane;
      renderFovBox(ctx, W, H, planning, isTarget);
    }

    // ── Scan progress sweep line ──
    if (scan.running && !scan.paused) {
      const sweepY = (scan.progress / 100) * H;
      const g = ctx.createLinearGradient(0, sweepY - 8, 0, sweepY + 8);
      g.addColorStop(0, 'transparent');
      g.addColorStop(0.5, 'rgba(34,197,94,0.8)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, sweepY - 8, W, 16);
      ctx.fillStyle = 'rgba(34,197,94,0.04)';
      ctx.fillRect(0, 0, W, sweepY);
    }

    // ── Plane ID label + Sequence info ──
    const seq = sequences.find(s => s.id === selectedSeqId);
    ctx.font = 'bold 9.5px Roboto Mono, monospace';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = PLANE_COLOR[plane];
    ctx.fillText(PLANE_LABEL[plane], 6, 5);
    if (seq) {
      ctx.fillStyle = 'rgba(100,116,139,0.7)';
      ctx.font = '8px Roboto Mono, monospace';
      ctx.fillText(seq.name.slice(0, 22), 34, 6);
    }
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(100,116,139,0.6)';
    ctx.fillText(
      `TR${seq?.tr ?? '—'} TE${seq?.te ?? '—'} | ${planning.sliceThickness}mm × ${planning.sliceCount}sl`,
      W - 5, 5
    );

    // Bottom-left: Slice info
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.fillText(
      `FOV ${Math.round(planning.fovRead)}×${Math.round(planning.fovPhase)} mm`,
      6, H - 5
    );
    ctx.textAlign = 'right';
    ctx.fillText(
      `R${planning.rotX.toFixed(0)}° / ${planning.rotY.toFixed(0)}° / ${planning.rotZ.toFixed(0)}°`,
      W - 5, H - 5
    );

    // ── Debug overlay ──
    if (debugMode) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(5, 20, 200, 130);
      ctx.fillStyle = '#00ff88';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      const dl = [
        `Target: ${getPlanningTargetPlane(planning)}  VP: ${plane}`,
        `Center: X${planning.centerX.toFixed(1)} Y${planning.centerY.toFixed(1)} Z${planning.centerZ.toFixed(1)}`,
        `Rot:  P${planning.rotX.toFixed(1)} Y${planning.rotY.toFixed(1)} R${planning.rotZ.toFixed(1)}`,
        `FOV:  ${planning.fovRead.toFixed(0)}×${planning.fovPhase.toFixed(0)} mm`,
        `Slices: ${planning.sliceCount} × ${planning.sliceThickness}mm`,
        `Gap:  ${planning.sliceGap}mm`,
        `Zoom: ${zoom.current.toFixed(2)}x  Pan: ${pan.current.x.toFixed(0)},${pan.current.y.toFixed(0)}`,
      ];
      dl.forEach((l, i) => ctx.fillText(l, 10, 25 + i * 14));
    }
  }, [plane, renderEmptyState, renderGrid, renderFovBox]);

  // ── RAF loop ──────────────────────────────────────────────

  useEffect(() => {
    let alive = true;
    const loop = () => { if (!alive) return; renderCanvas(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => { alive = false; cancelAnimationFrame(rafRef.current); };
  }, [renderCanvas]);

  // ── Render ────────────────────────────────────────────────

  return (
    <div
      ref={wrapRef}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#06090f' }}
      onContextMenu={e => e.preventDefault()}
      onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add('drag-over'); }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) (e.currentTarget as HTMLElement).classList.remove('drag-over'); }}
      onDrop={onDrop}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDblClick}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      />
    </div>
  );
}
