'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useWorkstationStore, type Plane } from '@/store/workstationStore';

const MRIViewport   = dynamic(() => import('./MRIViewport'),   { ssr: false });
const ViewerToolbar = dynamic(() => import('./ViewerToolbar'), { ssr: false });

const PLANES: Plane[] = ['coronal', 'sagittal', 'axial'];

export default function ViewportGrid() {
  const { activeVP, setActiveVP } = useWorkstationStore();
  const [maximized, setMaximized] = useState<Plane | 'blank' | null>(null);

  const VPWrapper = ({ plane, isFullWidth, children }: { plane: Plane; isFullWidth?: boolean; children: React.ReactNode }) => {
    const isActive = activeVP === plane;
    const isMax = maximized === plane;
    if (maximized !== null && !isMax) return null;

    return (
      <div
        onClick={() => setActiveVP(plane)}
        onDoubleClick={() => setMaximized(isMax ? null : plane)}
        style={{
          position: 'relative',
          width:  maximized ? '100%' : (isFullWidth ? '100%' : '50%'),
          height: maximized ? '100%' : '50%',
          border: `1px solid ${isActive ? 'rgba(34,211,238,0.5)' : '#1e293b'}`,
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
              background:'rgba(0,0,0,0.7)', border:'1px solid #263040',
              color:'#64748b', fontSize:'9px', padding:'2px 6px', cursor:'pointer', borderRadius:'2px',
            }}
          >
            ⤡ Restore
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', width:'100%', height:'100%', background:'#04060a' }}>
      {/* ── Viewer Toolbar ─────────────────────────────────────────────── */}
      <ViewerToolbar />

      {/* ── 2×2 Viewport Grid ──────────────────────────────────────────── */}
      <div style={{ flex:1, display:'flex', flexWrap:'wrap', overflow:'hidden' }}>
        {maximized === null ? (
          <>
            <VPWrapper plane="coronal">   <MRIViewport plane="coronal" />  </VPWrapper>
            <VPWrapper plane="sagittal">  <MRIViewport plane="sagittal" /> </VPWrapper>
            <VPWrapper plane="axial" isFullWidth> <MRIViewport plane="axial" />    </VPWrapper>
          </>
        ) : (
          <VPWrapper plane={maximized as Plane}>
            <MRIViewport plane={maximized as Plane} />
          </VPWrapper>
        )}
      </div>
    </div>
  );
}
