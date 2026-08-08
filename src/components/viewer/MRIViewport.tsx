'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useWorkstationStore, type PlanningObject } from '@/store/workstationStore';
import {
  type Plane, type Point3D, type Matrix3x3,
  unproject2Dto3D,
  getFovHandles2D, hitTestFov,
  getPlanningTargetPlane, getPlanningAngleStatus, getSlabDepth, CURSOR_MAP,
  VIEW_FOV_MM,
  axisAngleToMatrix, multiplyMatrices, matrixToEuler,
} from '@/lib/geometry';
import { toast } from '@/lib/toast';
import { getProtocolSeries, PROTOCOL_SERIES_MIME } from '@/lib/protocolSeries';
import ActiveFOV from './ActiveFOV';
import ProjectedSlab from './ProjectedSlab';

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

// ── Overlay Wrapper Component ─────────────────────────────────

function PlanningOverlay({ plane, size }: { plane: Plane, size: { w: number, h: number } }) {
  const images = useWorkstationStore(s => s.images);
  const planning = useWorkstationStore(s => s.planning);
  const hasImage = !!images[plane];

  if (!hasImage || size.w === 0 || size.h === 0) return null;

  if (plane === planning.orientation) {
    return <ActiveFOV plane={plane} size={size} />;
  }

  return <ProjectedSlab plane={plane} size={size} />;
}

// ── Component ─────────────────────────────────────────────

export default function MRIViewport({ plane }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);
  const imgRef    = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const cineFramesRef = useRef<HTMLImageElement[]>([]);
  const cineFrameRef = useRef(0);
  const cineLastAtRef = useRef(0);
  const rafRef    = useRef<number>(0);
  const drag      = useRef<DragState | null>(null);
  const pan       = useRef({ x: 0, y: 0 });
  const zoom      = useRef(1);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const imageUrl = useWorkstationStore(state => state.images[plane]);
  const attachedSeries = useWorkstationStore(state => state.imageSeries[plane]);

  // ── Image loading ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    cineFramesRef.current = [];
    cineLastAtRef.current = 0;

    if (attachedSeries) {
      const initialFrame = Math.floor(attachedSeries.frames.length / 2);
      cineFrameRef.current = initialFrame;
      const frames = new Array<HTMLImageElement>(attachedSeries.frames.length);
      attachedSeries.frames.forEach((url, index) => {
        const image = new Image();
        image.onload = () => {
          if (cancelled) return;
          frames[index] = image;
          cineFramesRef.current = frames;
          if (index === initialFrame) imgRef.current = image;
        };
        image.src = url;
      });
      return () => { cancelled = true; };
    }

    const url = imageUrl;
    if (!url) { imgRef.current = null; return; }

    const isVideo =
      (url.startsWith('blob:') && url.includes('video')) ||
      url.startsWith('data:video/') ||
      url.endsWith('.mp4');

    if (isVideo) {
      const vid = document.createElement('video');
      vid.muted = true; vid.playsInline = true;
      vid.onloadedmetadata = () => { if (!cancelled) imgRef.current = vid; };
      vid.src = url; vid.load();
    } else {
      const img = new Image();
      img.onload = () => { if (!cancelled) imgRef.current = img; };
      img.src = url;
    }
    return () => { cancelled = true; };
  }, [attachedSeries, imageUrl]);

  // ── Canvas sizing ──────────────────────────────────────────

  useEffect(() => {
    const wrap = wrapRef.current; const c = canvasRef.current;
    if (!wrap || !c) return;
    const ro = new ResizeObserver(() => {
      const r = wrap.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width));
      const h = Math.max(1, Math.round(r.height));
      c.width = w; c.height = h;
      setSize({ w, h });
    });
    ro.observe(wrap);
    const r = wrap.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    c.width = w; c.height = h;
    setSize({ w, h });
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
    try { c.setPointerCapture(e.pointerId); } catch {}
    
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
    if (!store.planningOverlayVisible) return;

    const targetPlane = getPlanningTargetPlane(store.planning);
    const isTarget = targetPlane === plane;

    // We can drag the box from ANY viewport!
    const handles = getFovHandles2D(store.planning, plane, c.width, c.height, isTarget);
    const hitResult = hitTestFov(pos.x * c.width, pos.y * c.height, handles);

    if (hitResult) {
      drag.current = { type: 'fov', handle: hitResult, startX: pos.x, startY: pos.y, initPlan: { ...store.planning } };
      c.style.cursor = hitResult === 'rotate' ? 'grabbing' : (CURSOR_MAP[hitResult] || 'move');
    } else {
      // Click outside box → reposition center of FOV
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
          // Rotate/tilt around the prescription center. The same interaction
          // works from all three viewports and updates the single 3D object.
          const initialHandles = getFovHandles2D(
            initPlan,
            plane,
            c.width,
            c.height,
            getPlanningTargetPlane(initPlan) === plane,
          );
          const startPointerX = startX * c.width;
          const startPointerY = startY * c.height;
          const currentPointerX = pos.x * c.width;
          const currentPointerY = pos.y * c.height;
          const startAngle = Math.atan2(startPointerY - initialHandles.center.y, startPointerX - initialHandles.center.x);
          const currentAngle = Math.atan2(currentPointerY - initialHandles.center.y, currentPointerX - initialHandles.center.x);
          let deltaAngle = (currentAngle - startAngle) * 180 / Math.PI;
          if (deltaAngle > 180) deltaAngle -= 360;
          if (deltaAngle < -180) deltaAngle += 360;
          
          let axis: Point3D = { x: 0, y: 0, z: 1 };
          if (plane === 'axial') axis = { x: 0, y: 0, z: 1 };
          else if (plane === 'coronal') axis = { x: 0, y: 1, z: 0 };
          else if (plane === 'sagittal') axis = { x: 1, y: 0, z: 0 };
          
          const deltaMatrix = axisAngleToMatrix(axis, deltaAngle);
          const newMatrix = multiplyMatrices(deltaMatrix, initPlan.rotationMatrix as Matrix3x3);
          const euler = matrixToEuler(newMatrix);
          
          store.setPlanning({
            rotationMatrix: newMatrix,
            rotX: euler.rotX,
            rotY: euler.rotY,
            rotZ: euler.rotZ
          });
        } else {
          // Resize using the projected read/phase axes. Corner drags preserve
          // the prescription proportions, so every linked viewport grows or
          // shrinks together from the single planning object.
          const scaleMm = VIEW_FOV_MM / Math.min(c.width, c.height);
          const targetPlane = getPlanningTargetPlane(initPlan);
          const isTarget = targetPlane === plane;
          const initialHandles = getFovHandles2D(initPlan, plane, c.width, c.height, isTarget);
          const readAxisLength = Math.hypot(
            initialHandles.right.x - initialHandles.left.x,
            initialHandles.right.y - initialHandles.left.y,
          ) || 1;
          const phaseAxisLength = Math.hypot(
            initialHandles.bottom.x - initialHandles.top.x,
            initialHandles.bottom.y - initialHandles.top.y,
          ) || 1;
          const readAxis = {
            x: (initialHandles.right.x - initialHandles.left.x) / readAxisLength,
            y: (initialHandles.right.y - initialHandles.left.y) / readAxisLength,
          };
          const phaseAxis = {
            x: (initialHandles.bottom.x - initialHandles.top.x) / phaseAxisLength,
            y: (initialHandles.bottom.y - initialHandles.top.y) / phaseAxisLength,
          };
          const readDeltaMm = (dxPx * readAxis.x + dyPx * readAxis.y) * scaleMm / zoom.current;
          const phaseDeltaMm = (dxPx * phaseAxis.x + dyPx * phaseAxis.y) * scaleMm / zoom.current;

          let newFovRead = initPlan.fovRead;
          let newFovPhase = initPlan.fovPhase;
          let newThickness = initPlan.sliceThickness;

          const isLeft   = handle === 'left'   || handle === 'tl' || handle === 'bl';
          const isRight  = handle === 'right'  || handle === 'tr' || handle === 'br';
          const isTop    = handle === 'top'    || handle === 'tl' || handle === 'tr';
          const isBottom = handle === 'bottom' || handle === 'bl' || handle === 'br';

          const isCorner = (isLeft || isRight) && (isTop || isBottom);
          if (isCorner) {
            const startDistance = Math.hypot(
              startX * c.width - initialHandles.center.x,
              startY * c.height - initialHandles.center.y,
            ) || 1;
            const currentDistance = Math.hypot(
              pos.x * c.width - initialHandles.center.x,
              pos.y * c.height - initialHandles.center.y,
            );
            const ratio = Math.max(0.35, Math.min(2.5, currentDistance / startDistance));
            newFovRead = initPlan.fovRead * ratio;
            if (isTarget) {
              newFovPhase = initPlan.fovPhase * ratio;
            } else {
              const newDepth = getSlabDepth(initPlan) * ratio;
              newThickness = (newDepth - (initPlan.sliceCount - 1) * initPlan.sliceGap) / initPlan.sliceCount;
            }
          } else if (isTarget) {
            if (isLeft) newFovRead = initPlan.fovRead - readDeltaMm * 2;
            if (isRight) newFovRead = initPlan.fovRead + readDeltaMm * 2;
            if (isTop) newFovPhase = initPlan.fovPhase - phaseDeltaMm * 2;
            if (isBottom) newFovPhase = initPlan.fovPhase + phaseDeltaMm * 2;
          } else {
            if (isLeft) newFovRead = initPlan.fovRead - readDeltaMm * 2;
            if (isRight) newFovRead = initPlan.fovRead + readDeltaMm * 2;
            if (isTop || isBottom) {
              const newDepth = getSlabDepth(initPlan) + (isTop ? -phaseDeltaMm * 2 : phaseDeltaMm * 2);
              newThickness = (newDepth - (initPlan.sliceCount - 1) * initPlan.sliceGap) / initPlan.sliceCount;
            }
          }

          // Clamp to reasonable MRI FOV range
          newFovRead = Math.max(80, Math.min(500, newFovRead));
          newFovPhase = Math.max(80, Math.min(500, newFovPhase));
          newThickness = Math.max(0.5, Math.min(20, newThickness));

          store.setPlanning({ fovRead: newFovRead, fovPhase: newFovPhase, sliceThickness: newThickness });
        }
      }
    } else {
      // Hover: update cursor
      if (!state.planningActive || !state.planningOverlayVisible) { c.style.cursor = 'default'; return; }
      
      const handles = getFovHandles2D(state.planning, plane, c.width, c.height, getPlanningTargetPlane(state.planning) === plane);
      const hitResult = hitTestFov(pos.x * c.width, pos.y * c.height, handles);
      
      if (hitResult) {
        c.style.cursor = hitResult === 'rotate' ? 'grab' : (CURSOR_MAP[hitResult] || 'move');
      } else {
        c.style.cursor = 'default';
      }
    }
  }, [plane, getPos]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const completedDrag = drag.current;
    drag.current = null;
    try { canvasRef.current?.releasePointerCapture(e.pointerId); } catch {}
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
    if (completedDrag?.type === 'fov') {
      const store = useWorkstationStore.getState();
      const angleStatus = getPlanningAngleStatus(store.planning);
      store.setStatusMsg(
        angleStatus.isValid
          ? `Planning updated — angle ${angleStatus.deviation.toFixed(1)}° within tolerance`
          : `Planning warning — angle ${angleStatus.deviation.toFixed(1)}° exceeds ${angleStatus.tolerance}°`,
      );
    }
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const d = e.deltaY > 0 ? -1 : 1;
    const state = useWorkstationStore.getState();
    if (!state.planningActive) return;

    const planningModifier = e.ctrlKey || e.metaKey || e.shiftKey || e.altKey;
    if (planningModifier && !state.planningOverlayVisible) return;

    if (e.ctrlKey || e.metaKey) {
      // FOV Read
      state.setPlanning({ fovRead: Math.max(20, Math.min(500, state.planning.fovRead + d * 5)) });
    } else if (e.shiftKey) {
      // Slice Count
      state.setPlanning({ sliceCount: Math.max(1, Math.min(200, state.planning.sliceCount + d)) });
    } else if (e.altKey) {
      // Slice Thickness
      state.setPlanning({ sliceThickness: Math.max(0.5, Math.min(20, state.planning.sliceThickness + d * 0.5)) });
    } else if (state.imageSeries[plane]) {
      // Unmodified wheel scrolls through the attached DICOM stack.
      const count = state.imageSeries[plane]!.frameCount;
      const direction = e.deltaY > 0 ? 1 : -1;
      cineFrameRef.current = (cineFrameRef.current + direction + count) % count;
    } else {
      // Zoom
      zoom.current = Math.max(0.3, Math.min(8, zoom.current * (e.deltaY > 0 ? 0.9 : 1.1)));
    }
  }, [plane]);

  const onDblClick = useCallback(() => {
    zoom.current = 1;
    pan.current = { x: 0, y: 0 };
    toast(`${PLANE_LABEL[plane]} — Fit to screen`);
  }, [plane]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const sequenceId = Number(e.dataTransfer.getData(PROTOCOL_SERIES_MIME));
    const store = useWorkstationStore.getState();
    const sequence = store.sequences.find(item => item.id === sequenceId);
    const protocolSeries = Number.isFinite(sequenceId) && sequenceId > 0
      ? getProtocolSeries(sequence ?? sequenceId)
      : undefined;
    if (protocolSeries) {
      store.setImageSeries(protocolSeries);
      toast(
        `${protocolSeries.name}: ${protocolSeries.frameCount} images loaded into ${PLANE_LABEL[protocolSeries.plane]}`,
        'success',
      );
      return;
    }

    const file = e.dataTransfer.files[0];
    if (!file) return;

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
          if (!store.planningOverlayVisible) break;
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

  const showFov = useWorkstationStore(
    s => s.show.fov && s.planningOverlayVisible && !s.scan.running,
  );

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



  const renderCanvas = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const W = c.width, H = c.height;

    const state = useWorkstationStore.getState();
    const { planning, planningActive, wl, show, scan, sequences, selectedSeqId, debugMode, theme, imageSeries } = state;
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
    const viewportSeries = imageSeries[plane];
    let img = imgRef.current;
    let cinePlaying = false;
    if (viewportSeries && cineFramesRef.current.length) {
      cinePlaying = scan.running && !scan.paused && scan.seqId === viewportSeries.sequenceId;
      const now = performance.now();
      if (cinePlaying) {
        const frameInterval = 1000 / viewportSeries.fps;
        if (!cineLastAtRef.current) cineLastAtRef.current = now;
        const elapsed = now - cineLastAtRef.current;
        if (elapsed >= frameInterval) {
          const advance = Math.max(1, Math.floor(elapsed / frameInterval));
          cineFrameRef.current = (cineFrameRef.current + advance) % viewportSeries.frameCount;
          cineLastAtRef.current = now;
        }
      } else {
        cineLastAtRef.current = now;
      }
      img = cineFramesRef.current[cineFrameRef.current] ?? imgRef.current;
      c.dataset.seriesId = viewportSeries.id;
      c.dataset.cineFrame = String(cineFrameRef.current + 1);
      c.dataset.cinePlaying = String(cinePlaying);
    } else {
      delete c.dataset.seriesId;
      delete c.dataset.cineFrame;
      c.dataset.cinePlaying = 'false';
    }

    // Background
    ctx.fillStyle = isDark ? '#06090f' : '#e8ecf2';
    ctx.fillRect(0, 0, W, H);

    // Draw image with pan/zoom and W/L
    if (img) {
      let imgW = 0, imgH = 0;
      if (img instanceof HTMLVideoElement) {
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
    const seq = sequences.find(s => s.id === (viewportSeries?.sequenceId ?? selectedSeqId));
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
    if (viewportSeries) {
      ctx.textAlign = 'center';
      ctx.fillStyle = cinePlaying ? '#22d3ee' : 'rgba(148,163,184,0.85)';
      ctx.fillText(
        `IMG ${String(cineFrameRef.current + 1).padStart(2, '0')}/${viewportSeries.frameCount}${cinePlaying ? '  ▶ CINE' : '  · wheel to scroll'}`,
        W / 2, H - 5,
      );
    }
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
  }, [plane, renderEmptyState, renderGrid]);

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
      data-mri-viewport={plane}
      data-loaded-series={attachedSeries?.id ?? ''}
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#06090f' }}
      onContextMenu={e => e.preventDefault()}
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = e.dataTransfer.types.includes(PROTOCOL_SERIES_MIME) ? 'copy' : 'move';
        (e.currentTarget as HTMLElement).classList.add('drag-over');
      }}
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
      
      {showFov && (
        <PlanningOverlay plane={plane} size={size} />
      )}
    </div>
  );
}
