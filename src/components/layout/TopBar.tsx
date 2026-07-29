'use client';

import { useEffect, useRef, useState } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { toast } from '@/lib/toast';
import { exportExam, downloadJSON, readJSONFile, validateSnapshot, saveExamToCloud, listCloudExams, loadExamFromCloud, type CloudExamMeta } from '@/lib/examPersistence';

export default function TopBar() {
  const {
    scan, patient, sequences, selectedSeqId,
    toggleHelp, togglePatient, togglePhysics, toggleLearning, toggleAI, toggleImageImport,
    stopScan, statusMsg, loadExam,
    params, fov, slice, wl, show, safety,
  } = useWorkstationStore();

  const loadFileRef = useRef<HTMLInputElement>(null);
  const [showCloudList, setShowCloudList] = useState(false);
  const [cloudExams, setCloudExams] = useState<CloudExamMeta[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);

  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date().toTimeString().slice(0, 8));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const selectedSeq = sequences.find(s => s.id === selectedSeqId);
  const sarPct = selectedSeq?.sarPct ?? 0;
  const sarColor = sarPct >= 90 ? '#ef4444' : sarPct >= 70 ? '#f59e0b' : '#22c55e';

  const menuItems = [
    { label: 'Patient',      action: togglePatient },
    { label: 'Images',       action: toggleImageImport },
    { label: 'Save Exam',    action: handleSaveExam },
    { label: 'Load Exam',    action: openCloudList },
    { label: 'Physics',      action: togglePhysics },
    { label: 'Learning',     action: toggleLearning },
    { label: 'AI Assist',    action: toggleAI },
    { label: 'Help',         action: toggleHelp },
  ];

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      useWorkstationStore.getState().setImage('axial', url);
      toast(`Loaded: ${file.name}`, 'success');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSaveExam() {
    const snap = exportExam({ patient, safety, sequences, params, fov, slice, wl, show });
    try {
      const id = await saveExamToCloud(snap);
      toast(`Exam saved to cloud: ${id}`, 'success');
    } catch (err: any) {
      toast(`Failed to save to cloud: ${err.message}`, 'error');
      // Fallback to local
      const name = `exam_${patient.name.replace(/[^a-zA-Z0-9]/g,'_')}_${new Date().toISOString().slice(0,10)}.json`;
      downloadJSON(snap, name);
    }
  }

  async function openCloudList() {
    setShowCloudList(true);
    setLoadingCloud(true);
    try {
      const exams = await listCloudExams();
      setCloudExams(exams);
    } catch (err: any) {
      toast(`Failed to load cloud exams: ${err.message}`, 'error');
    } finally {
      setLoadingCloud(false);
    }
  }

  async function handleLoadCloud(id: string) {
    try {
      const snap = await loadExamFromCloud(id);
      loadExam(snap);
      toast(`Exam loaded: ${snap.patient.name}`, 'success');
      setShowCloudList(false);
    } catch (err: any) {
      toast(`Failed to load exam: ${err.message}`, 'error');
    }
  }

  async function handleLoadExam(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readJSONFile(file);
      if (!validateSnapshot(data)) { toast('Invalid exam file format', 'error'); return; }
      loadExam(data);
      toast(`Exam loaded: ${data.patient.name}`, 'success');
    } catch (err) {
      toast('Failed to load exam file', 'error');
    }
    e.target.value = '';
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: '36px', width: '100%',
      background: 'linear-gradient(180deg, #0a1020 0%, #070d1a 100%)',
      borderBottom: '1px solid #1e293b', flexShrink: 0, padding: '0 6px',
      gap: '0', position: 'relative', zIndex: 50,
    }}>
      <input type="file" ref={loadFileRef} style={{ display:'none' }} accept=".json" onChange={handleLoadExam} />

      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'0 10px', flexShrink:0 }}>
        <img src="/logo-icon.png" alt="MRI Pro Icon" style={{ height: '22px', width: 'auto' }} />
        <span style={{ fontWeight:800, fontSize:'13px', letterSpacing:'2px', color:'#22d3ee', fontFamily:'Inter,sans-serif' }}>MRI PRO</span>
      </div>

      <div style={{ width:'1px', height:'20px', background:'#1e293b', flexShrink:0 }} />

      {/* Nav menu */}
      <nav style={{ display:'flex', alignItems:'center', height:'100%', flexShrink:0 }}>
        {menuItems.map(item => (
          <button
            key={item.label}
            onClick={item.action}
            style={{
              height:'100%', padding:'0 10px', background:'transparent', border:'none',
              borderBottom:'2px solid transparent', color:'#64748b', fontSize:'10.5px',
              fontFamily:'Inter,sans-serif', cursor:'pointer', whiteSpace:'nowrap',
              transition:'all 0.1s',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.color='#e2e8f0'; (e.target as HTMLElement).style.borderBottomColor='#22d3ee'; }}
            onMouseLeave={e => { (e.target as HTMLElement).style.color='#64748b'; (e.target as HTMLElement).style.borderBottomColor='transparent'; }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Center — patient chip */}
      <div style={{ flex:1, display:'flex', justifyContent:'center', alignItems:'center' }}>
        <div style={{
          display:'flex', alignItems:'center', gap:'8px',
          background:'rgba(255,255,255,0.04)', border:'1px solid #1e293b',
          borderRadius:'2px', padding:'3px 12px', fontSize:'9.5px',
        }}>
          <span style={{ color:'#94a3b8' }}>👤</span>
          <span style={{ color:'#e2e8f0', fontWeight:600 }}>{patient.name}</span>
          <span style={{ color:'#334155' }}>|</span>
          <span style={{ color:'#64748b', fontFamily:'Roboto Mono,monospace', fontSize:'9px' }}>{patient.dob}</span>
          <span style={{ color:'#334155' }}>|</span>
          <span style={{ color:'#64748b', fontSize:'9px' }}>{patient.study.slice(0,28)}</span>
        </div>
      </div>

      {/* Right — scanner status */}
      <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0, paddingRight:'4px' }}>

        {/* READY/SCANNING badge */}
        <div style={{
          display:'flex', alignItems:'center', gap:'4px',
          background:'#1c2a3e', border:'1px solid #1e3a5f',
          borderRadius:'2px', padding:'2px 8px',
        }}>
          <div style={{
            width:'6px', height:'6px', borderRadius:'50%', flexShrink:0,
            background: scan.running ? '#22d3ee' : '#22c55e',
            boxShadow: scan.running ? '0 0 6px #22d3ee' : '0 0 5px #22c55e',
            animation: scan.running ? 'pulseDot 1s ease-in-out infinite' : 'none',
          }} />
          <span style={{
            fontFamily:'Roboto Mono,monospace', fontSize:'9px', fontWeight:700, letterSpacing:'0.5px',
            color: scan.running ? '#22d3ee' : '#22c55e', minWidth:'52px',
          }}>
            {scan.running && scan.paused ? 'PAUSED' : scan.running ? 'SCANNING' : 'READY'}
          </span>
        </div>

        {/* SAR */}
        <div style={{ display:'flex', alignItems:'center', gap:'4px', fontSize:'8.5px', color:'#64748b' }}>
          <span>SAR</span>
          <div style={{ width:'50px', height:'3px', background:'#1c2a3e', borderRadius:'2px', overflow:'hidden', border:'1px solid #1e293b' }}>
            <div style={{ height:'100%', width:`${sarPct}%`, background:sarColor, borderRadius:'2px', transition:'width 0.5s' }} />
          </div>
          <span style={{ color:sarColor, fontFamily:'Roboto Mono,monospace', fontSize:'8px', minWidth:'24px' }}>{sarPct}%</span>
        </div>

        <div style={{ width:'1px', height:'16px', background:'#1e293b' }} />

        {/* RF + Gradient + Temp */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px', fontSize:'9px', color:'#475569', fontFamily:'Roboto Mono,monospace' }}>
          <span style={{ display:'flex', alignItems:'center', gap:'2px' }}>
            <span style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#22c55e', display:'inline-block' }} />RF
          </span>
          <span>GRAD 98%</span>
          <span style={{ color:'#f59e0b' }}>T:20.4°C</span>
        </div>

        <div style={{ width:'1px', height:'16px', background:'#1e293b' }} />

        {/* Emergency Stop */}
        <button
          onClick={() => { stopScan(); toast('⚠ Emergency stop activated', 'error'); }}
          title="Emergency Stop"
          style={{
            background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.4)',
            color:'#ef4444', fontSize:'9px', fontWeight:700, padding:'2px 8px',
            borderRadius:'2px', cursor:'pointer', letterSpacing:'0.3px',
            fontFamily:'Inter,sans-serif',
          }}
        >
          ⏹ STOP
        </button>

        {/* Upload */}
        <label
          title="Load Brain MRI Image"
          style={{
            display:'flex', alignItems:'center', gap:'4px',
            background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)',
            color:'#22d3ee', fontSize:'9.5px', fontWeight:600,
            padding:'2px 8px', borderRadius:'2px', cursor:'pointer',
            fontFamily:'Inter,sans-serif', letterSpacing:'0.2px',
            transition:'all 0.1s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background='rgba(34,211,238,0.16)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background='rgba(34,211,238,0.08)'; }}
        >
          🧠 Load MRI
          <input type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileUpload} aria-label="Upload MRI image" />
        </label>

        {/* Physics */}
        <button onClick={togglePhysics} title="Physics Simulator" style={{ background:'transparent', border:'none', color:'#64748b', fontSize:'11px', cursor:'pointer', padding:'0 3px' }}>🔬</button>
        {/* Learning */}
        <button onClick={toggleLearning} title="Learning Center" style={{ background:'transparent', border:'none', color:'#64748b', fontSize:'11px', cursor:'pointer', padding:'0 3px' }}>📚</button>
        {/* AI */}
        <button onClick={toggleAI} title="AI Assistant" style={{ background:'transparent', border:'none', color:'#64748b', fontSize:'11px', cursor:'pointer', padding:'0 3px' }}>🤖</button>
        {/* Help */}
        <button onClick={toggleHelp} title="Help (H)" style={{ background:'transparent', border:'none', color:'#22d3ee', fontSize:'13px', cursor:'pointer', padding:'0 3px' }}>❓</button>

        {/* Clock */}
        <div style={{
          fontFamily:'Roboto Mono,monospace', fontSize:'11px', color:'#22d3ee',
          background:'#04060a', border:'1px solid #1e293b', borderRadius:'2px',
          padding:'2px 8px', minWidth:'62px', textAlign:'center', letterSpacing:'1px',
        }}>
          {time}
        </div>
      </div>
      {/* Cloud Load Modal */}
      {showCloudList && (
        <div style={{ position:'fixed', inset:0, zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.7)' }}>
          <div style={{ background:'#08101c', border:'1px solid #1e293b', borderRadius:'4px', width:'400px', padding:'16px', color:'#94a3b8' }}>
            <h3 style={{ margin:'0 0 16px 0', color:'#22d3ee' }}>Cloud Exams</h3>
            {loadingCloud ? <div style={{ fontSize:'12px' }}>Loading...</div> : (
              <div style={{ maxHeight:'300px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'8px' }}>
                {cloudExams.length === 0 && <div style={{ fontSize:'12px' }}>No exams found in cloud.</div>}
                {cloudExams.map(ex => (
                  <div key={ex.id} onClick={() => handleLoadCloud(ex.id)} style={{ padding:'8px', background:'#0d1626', border:'1px solid #1e293b', borderRadius:'2px', cursor:'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#22d3ee')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#1e293b')}>
                    <div style={{ fontSize:'12px', fontWeight:600, color:'#e2e8f0' }}>{ex.patientName}</div>
                    <div style={{ fontSize:'10px', color:'#64748b', marginTop:'4px' }}>{ex.patientId} • {ex.study} • {new Date(ex.savedAt).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop:'16px', display:'flex', justifyContent:'space-between' }}>
              <button onClick={() => loadFileRef.current?.click()} style={{ padding:'4px 12px', background:'transparent', border:'1px solid #1e293b', color:'#94a3b8', cursor:'pointer', borderRadius:'2px' }}>
                Load from Local File
              </button>
              <button onClick={() => setShowCloudList(false)} style={{ padding:'4px 12px', background:'#1e293b', border:'none', color:'#e2e8f0', cursor:'pointer', borderRadius:'2px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
