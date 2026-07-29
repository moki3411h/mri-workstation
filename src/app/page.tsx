'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import StatusBar from '@/components/layout/StatusBar';
import { preloadDefaultImages } from '@/lib/imageLoader';

// Dynamic imports to avoid SSR issues with Canvas/Three.js
const TopBar        = dynamic(() => import('@/components/layout/TopBar'),        { ssr: false });
const LeftSidebar   = dynamic(() => import('@/components/layout/LeftSidebar'),   { ssr: false });
const ViewportGrid  = dynamic(() => import('@/components/viewer/ViewportGrid'),  { ssr: false });
const RightSidebar  = dynamic(() => import('@/components/layout/RightSidebar'),  { ssr: false });
const ProtocolQueue = dynamic(() => import('@/components/queue/ProtocolQueue'),  { ssr: false });
const ParameterPanel= dynamic(() => import('@/components/params/ParameterPanel'),{ ssr: false });
const HelpModal     = dynamic(() => import('@/components/help/HelpModal'),       { ssr: false });
const PatientModal  = dynamic(() => import('@/components/patient/PatientModal'), { ssr: false });
const PhysicsPanel  = dynamic(() => import('@/components/simulation/PhysicsPanel'),{ ssr: false });
const LearningPanel = dynamic(() => import('@/components/learning/LearningPanel'),{ ssr: false });
const AIAssistant   = dynamic(() => import('@/components/ai/AIAssistant'),       { ssr: false });
const ImageImport   = dynamic(() => import('@/components/viewer/ImageImport'),   { ssr: false });
const SplashScreen  = dynamic(() => import('@/components/layout/SplashScreen'),  { ssr: false });

export default function WorkstationPage() {
  const {
    leftCollapsed, rightCollapsed,
    showHelp, showPatient, showPhysics, showLearning, showAI,
    setImage, setStatusMsg, setSlice, showImageImport,
  } = useWorkstationStore();

  // ── Cine Loop Simulation ───────────────────────────────────────────────────
  useEffect(() => {
    const unsub = useWorkstationStore.subscribe((state, prevState) => {
      if (state.cineMode && !prevState.cineMode) {
        // Start cine loop interval on the active viewport
        const interval = setInterval(() => {
          const s = useWorkstationStore.getState();
          if (!s.cineMode) { clearInterval(interval); return; }
          const plane = s.activeVP;
          const { cur, max } = s.slice[plane];
          let next = cur + 1;
          if (next > max) next = 1;
          s.setSlice(plane, next);
        }, 100);
        return () => clearInterval(interval);
      }
    });
    return unsub;
  }, []);

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const { togglePatient, togglePhysics, toggleLearning, toggleAI, toggleHelp } = useWorkstationStore.getState();

    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT','SELECT','TEXTAREA'].includes(tag)) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); togglePatient(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); document.getElementById('global-file-input')?.click(); }
      if (e.key === 'h' || e.key === 'H') toggleHelp();
      if (e.key === 'p' || e.key === 'P') togglePhysics();
      if (e.key === 'l' || e.key === 'L') toggleLearning();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
    <SplashScreen />
    <div id="workstation" style={{
      display: 'grid',
      gridTemplateRows: '36px 1fr 260px 20px',
      gridTemplateColumns: leftCollapsed ? '0px 1fr 212px' : '220px 1fr 212px',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#04060a',
      transition: 'grid-template-columns 0.2s ease',
    }}>
      {/* Top bar — full width */}
      <div id="topbar" style={{ gridColumn: '1 / -1', gridRow: '1', borderBottom: '1px solid #1e293b', zIndex: 50 }}>
        <TopBar />
      </div>

      {/* Left sidebar */}
      {!leftCollapsed && (
        <div id="leftsb" style={{ gridColumn: '1', gridRow: '2', borderRight: '1px solid #1e293b', overflow: 'hidden' }}>
          <LeftSidebar />
        </div>
      )}

      {/* Main viewport area */}
      <div id="mainvp" style={{
        gridColumn: leftCollapsed ? '1 / 3' : '2',
        gridRow: '2',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <ViewportGrid />
      </div>

      {/* Right sidebar */}
      {!rightCollapsed && (
        <div id="rightsb" style={{ gridColumn: '3', gridRow: '2', borderLeft: '1px solid #1e293b', overflow: 'hidden' }}>
          <RightSidebar />
        </div>
      )}

      {/* Protocol Queue + Parameters — bottom strip */}
      <div id="queue" style={{
        gridColumn: '1 / -1',
        gridRow: '3',
        borderTop: '2px solid #1e293b',
        display: 'flex',
        background: '#111827',
        overflow: 'hidden',
      }}>
        <ProtocolQueue />
        <div style={{ width: '1px', background: '#1e293b', flexShrink: 0 }} />
        <ParameterPanel />
      </div>

      {/* Status bar */}
      <div id="statusbar" style={{ gridColumn: '1 / -1', gridRow: '4', borderTop: '1px solid #1e293b', zIndex: 40 }}>
        <StatusBar />
      </div>

      {/* Modals and panels */}
      {showHelp     && <HelpModal />}
      {showPatient  && <PatientModal />}
      {showPhysics  && <PhysicsPanel />}
      {showLearning && <LearningPanel />}
      {showAI       && <AIAssistant />}
      {showImageImport && <ImageImport />}

      {/* Hidden global file input for Ctrl+O */}
      <input
        id="global-file-input"
        type="file"
        accept=".jpg,.jpeg,.png,.bmp,.tif,.tiff,.webp"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          const files = Array.from(e.target.files ?? []);
          const { setImage, setStatusMsg } = useWorkstationStore.getState();
          const planes: ('axial' | 'coronal' | 'sagittal')[] = ['axial', 'coronal', 'sagittal'];
          files.slice(0, 3).forEach((file, i) => {
            const reader = new FileReader();
            reader.onload = ev => {
              setImage(planes[i]!, ev.target?.result as string);
              setStatusMsg(`Loaded: ${file.name}`);
            };
            reader.readAsDataURL(file);
          });
          e.target.value = '';
        }}
      />
    </div>
    </>
  );
}
