'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useWorkstationStore, type Plane } from '@/store/workstationStore';

const MRIViewport  = dynamic(() => import('./MRIViewport'),  { ssr: false });
const ThreeDViewer = dynamic(() => import('./ThreeDViewer'), { ssr: false });

const PLANES: Plane[] = ['coronal', 'sagittal', 'axial'];
const PLANE_COLORS: Record<Plane, string> = { coronal:'#ffe040', sagittal:'#60d0ff', axial:'#60ffa0' };

export default function ViewportGrid() {
  const { activeVP, setActiveVP } = useWorkstationStore();
  const [maximized, setMaximized] = useState<Plane | 'threed' | null>(null);

  const VPWrapper = ({ plane, children }: { plane: Plane | 'threed'; children: React.ReactNode }) => {
    const isActive = plane !== 'threed' ? activeVP === plane : false;
    const isMax = maximized === plane;
    if (maximized !== null && !isMax) return null;

    return (
      <div
        onClick={() => { if (plane !== 'threed') setActiveVP(plane as Plane); }}
        onDoubleClick={() => setMaximized(isMax ? null : plane)}
        style={{
          position: 'relative',
          width: maximized ? '100%' : '50%',
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
        {/* Maximize hint */}
        {isMax && (
          <button
            onClick={e => { e.stopPropagation(); setMaximized(null); }}
            title="Restore"
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
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      width: '100%',
      height: '100%',
      background: '#04060a',
    }}>
      {maximized === null ? (
        <>
          <VPWrapper plane="coronal">   <MRIViewport plane="coronal" /> </VPWrapper>
          <VPWrapper plane="sagittal">  <MRIViewport plane="sagittal" /> </VPWrapper>
          <VPWrapper plane="axial">     <MRIViewport plane="axial" /> </VPWrapper>
          <VPWrapper plane="threed">    <ThreeDViewer /> </VPWrapper>
        </>
      ) : (
        <VPWrapper plane={maximized}>
          {maximized === 'threed'
            ? <ThreeDViewer />
            : <MRIViewport plane={maximized as Plane} />}
        </VPWrapper>
      )}
    </div>
  );
}
