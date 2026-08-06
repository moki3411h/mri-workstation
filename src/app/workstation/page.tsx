'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import StatusBar from '@/components/layout/StatusBar';

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
    showImageImport, theme,
  } = useWorkstationStore();

  // ── Apply theme class to document root ─────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // ── Global keyboard shortcuts ──────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
      const state = useWorkstationStore.getState();

      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); state.togglePatient(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); document.getElementById('global-file-input')?.click(); }
      if (e.key === 'h' || e.key === 'H') state.toggleHelp();
      if (e.key === 'p' || e.key === 'P') state.togglePhysics();
      if (e.key === 'l' || e.key === 'L') state.toggleLearning();
      if (e.key === 't' || e.key === 'T') state.toggleTheme();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isDark = theme !== 'light';
  const bg = isDark ? '#04060a' : '#e8ecf5';
  const border = isDark ? '#1e293b' : '#c5d0e0';
  const queueBg = isDark ? '#111827' : '#dde4ef';

  return (
    <>
    <SplashScreen />
    <div id="workstation" data-theme={theme} style={{
      display: 'grid',
      gridTemplateRows: '36px 1fr 260px 20px',
      gridTemplateColumns: leftCollapsed ? '0px 1fr 212px' : '220px 1fr 212px',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: bg,
      transition: 'grid-template-columns 0.2s ease',
    }}>
      {/* Top bar — full width */}
      <div id="topbar" style={{ gridColumn: '1 / -1', gridRow: '1', borderBottom: `1px solid ${border}`, zIndex: 50 }}>
        <TopBar />
      </div>

      {/* Left sidebar */}
      {!leftCollapsed && (
        <div id="leftsb" style={{ gridColumn: '1', gridRow: '2', borderRight: `1px solid ${border}`, overflow: 'hidden' }}>
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
        <div id="rightsb" style={{ gridColumn: '3', gridRow: '2', borderLeft: `1px solid ${border}`, overflow: 'hidden' }}>
          <RightSidebar />
        </div>
      )}

      {/* Protocol Queue + Parameters — bottom strip */}
      <div id="queue" style={{
        gridColumn: '1 / -1',
        gridRow: '3',
        borderTop: `2px solid ${border}`,
        display: 'flex',
        background: queueBg,
        overflow: 'hidden',
      }}>
        <ProtocolQueue />
        <div style={{ width: '1px', background: border, flexShrink: 0 }} />
        <ParameterPanel />
      </div>

      {/* Status bar */}
      <div id="statusbar" style={{ gridColumn: '1 / -1', gridRow: '4', borderTop: `1px solid ${border}`, zIndex: 40 }}>
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
        accept=".jpg,.jpeg,.png,.bmp,.tif,.tiff,.webp,.mp4,video/mp4"
        multiple
        style={{ display: 'none' }}
        onChange={async e => {
          const files = Array.from(e.target.files ?? []);
          if (files.length === 0) return;
          const store = useWorkstationStore.getState();

          // Single file → load into all 3 viewports
          if (files.length === 1) {
            const file = files[0]!;
            const reader = new FileReader();
            reader.onload = ev => {
              store.setImageAll(ev.target?.result as string);
              store.setStatusMsg(`Loaded: ${file.name}`);
            };
            reader.readAsDataURL(file);
          } else {
            // Multiple files → assign to planes
            const planes: ('axial' | 'coronal' | 'sagittal')[] = ['axial', 'coronal', 'sagittal'];
            files.slice(0, 3).forEach((file, i) => {
              const reader = new FileReader();
              reader.onload = ev => {
                store.setImage(planes[i]!, ev.target?.result as string);
                store.setStatusMsg(`Loaded: ${file.name}`);
              };
              reader.readAsDataURL(file);
            });
          }
          e.target.value = '';
        }}
      />
    </div>
    </>
  );
}
