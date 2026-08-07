'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useWorkstationStore, type Plane } from '@/store/workstationStore';

const MRIViewport   = dynamic(() => import('./MRIViewport'),   { ssr: false });
const ViewerToolbar = dynamic(() => import('./ViewerToolbar'), { ssr: false });

const PLANES: Plane[] = ['coronal', 'sagittal', 'axial'];

const VPWrapper = ({ 
  plane, 
  children,
  activeVP,
  setActiveVP,
  maximized,
  setMaximized
}: { 
  plane: Plane; 
  children: React.ReactNode;
  activeVP: string;
  setActiveVP: (p: Plane) => void;
  maximized: Plane | 'blank' | null;
  setMaximized: (p: Plane | 'blank' | null) => void;
}) => {
  const isActive = activeVP === plane;
  const isMax = maximized === plane;
  if (maximized !== null && !isMax) return null;

  return (
    <div
      onClick={() => setActiveVP(plane)}
      onDoubleClick={() => setMaximized(isMax ? null : plane)}
      style={{
        position: 'relative',
        flex: maximized ? '1 1 100%' : '1 1 33.333%',
        height: '100%',
        border: `1px solid ${isActive ? 'rgba(34,211,238,0.5)' : 'var(--c-border)'}`,
        boxSizing: 'border-box',
        overflow: 'hidden',
        cursor: 'default',
        transition: 'border-color 0.15s',
        boxShadow: isActive ? 'inset 0 0 20px rgba(34,211,238,0.04)' : 'none',
      }}
    >
      {children}
      {isMax && (
        <button
          onClick={e => { e.stopPropagation(); setMaximized(null); }}
          title="Restore (double-click)"
          style={{
            position:'absolute', top:'5px', right:'5px', zIndex:30,
            background:'rgba(0,0,0,0.7)', border:'1px solid var(--c-border-bright)',
            color:'var(--c-text-mid)', fontSize:'9px', padding:'2px 6px', cursor:'pointer', borderRadius:'2px',
          }}
        >
          ⤡ Restore
        </button>
      )}
    </div>
  );
};

export default function ViewportGrid() {
  const { activeVP, setActiveVP } = useWorkstationStore();
  const [maximized, setMaximized] = useState<Plane | 'blank' | null>(null);

  return (
    <div style={{ display:'flex', flexDirection:'column', width:'100%', height:'100%', background:'var(--c-bg-deepest)' }}>
      {/* ── Viewer Toolbar ─────────────────────────────────────────────── */}
      <ViewerToolbar />

      {/* ── 3 Column Viewport Grid ──────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexDirection:'row', overflow:'hidden' }}>
        {maximized === null ? (
          <>
            <VPWrapper plane="coronal" activeVP={activeVP} setActiveVP={setActiveVP} maximized={maximized} setMaximized={setMaximized}>   <MRIViewport plane="coronal" />  </VPWrapper>
            <VPWrapper plane="sagittal" activeVP={activeVP} setActiveVP={setActiveVP} maximized={maximized} setMaximized={setMaximized}>  <MRIViewport plane="sagittal" /> </VPWrapper>
            <VPWrapper plane="axial" activeVP={activeVP} setActiveVP={setActiveVP} maximized={maximized} setMaximized={setMaximized}>     <MRIViewport plane="axial" />    </VPWrapper>
          </>
        ) : (
          <VPWrapper plane={maximized as Plane} activeVP={activeVP} setActiveVP={setActiveVP} maximized={maximized} setMaximized={setMaximized}>
            <MRIViewport plane={maximized as Plane} />
          </VPWrapper>
        )}
      </div>
    </div>
  );
}
