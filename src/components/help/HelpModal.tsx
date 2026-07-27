'use client';
import { useWorkstationStore } from '@/store/workstationStore';

const SHORTCUTS = [
  ['F5',       'Start Scan'],
  ['F6',       'Pause Scan'],
  ['Esc',      'Abort Scan'],
  ['↑ / ↓',    'Navigate Sequences'],
  ['Scroll',   'Navigate Slices'],
  ['Dbl-click','Reset FoV / Maximize VP'],
  ['H',        'Help Modal'],
  ['P',        'Physics Simulator'],
  ['L',        'Learning Center'],
  ['Delete',   'Reset Active Viewport'],
  ['Ctrl+Scroll','Zoom In/Out'],
  ['Space+Drag', 'Pan Viewport'],
];

const INTERACTIONS = [
  ['Drag FoV center',   'Move planning frame'],
  ['Drag handles',      'Resize FoV (8 handles)'],
  ['Rotation arc',      'Rotate planning frame'],
  ['Left click',        'Move crosshair'],
  ['Right drag (horiz)','Adjust Window Width'],
  ['Right drag (vert)', 'Adjust Window Center (Level)'],
  ['Drop image',        'Load MRI into viewport'],
];

export default function HelpModal() {
  const { toggleHelp } = useWorkstationStore();

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) toggleHelp(); }}>
      <div className="modal-box" style={{ width: '680px', maxWidth: '95vw' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid #1e3a5f', flexShrink:0, background:'rgba(14,165,233,0.05)' }}>
          <div>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#e2e8f0', letterSpacing:'0.3px' }}>MRI Pro Workstation — Help & Keyboard Reference</div>
            <div style={{ fontSize:'9px', color:'#475569', marginTop:'2px' }}>Educational simulator — not for clinical use</div>
          </div>
          <button onClick={toggleHelp} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'#64748b', fontSize:'18px', cursor:'pointer', padding:'0 4px' }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ overflowY:'auto', padding:'14px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', maxHeight:'75vh' }}>

          {/* Viewport Controls */}
          <div>
            <h3 style={{ fontSize:'9.5px', fontWeight:700, color:'#22d3ee', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'8px', borderBottom:'1px solid #1e293b', paddingBottom:'4px' }}>Viewport Controls</h3>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'9.5px' }}>
              <tbody>
                {INTERACTIONS.map(([key, desc]) => (
                  <tr key={key} style={{ borderBottom:'1px solid #0d1520' }}>
                    <td style={{ padding:'4px 0', color:'#22d3ee', fontFamily:'Roboto Mono,monospace', fontSize:'9px', width:'45%' }}>{key}</td>
                    <td style={{ padding:'4px 0', color:'#64748b' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 style={{ fontSize:'9.5px', fontWeight:700, color:'#22d3ee', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'8px', borderBottom:'1px solid #1e293b', paddingBottom:'4px' }}>Keyboard Shortcuts</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px' }}>
              {SHORTCUTS.map(([key, desc]) => (
                <div key={key} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'9.5px', padding:'2px 0' }}>
                  <kbd>{key}</kbd>
                  <span style={{ color:'#64748b' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Scan Controls */}
          <div>
            <h3 style={{ fontSize:'9.5px', fontWeight:700, color:'#22d3ee', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'8px', borderBottom:'1px solid #1e293b', paddingBottom:'4px' }}>Scan Controls</h3>
            {[
              ['▶ Run', 'Start scan simulation (also F5)'],
              ['⏸ Pause', 'Pause current scan (also F6)'],
              ['⏹ Abort', 'Stop and reset scan (also Esc)'],
              ['✓ Apply', 'Commit parameter changes to sequence'],
              ['Copy', 'Duplicate selected sequence'],
              ['↑/↓ arrows', 'Navigate protocol queue'],
            ].map(([k,v])=>(
              <div key={k} style={{ display:'flex', gap:'8px', padding:'3px 0', borderBottom:'1px solid #0d1520', fontSize:'9.5px' }}>
                <span style={{ color:'#22d3ee', fontFamily:'Roboto Mono,monospace', minWidth:'80px', fontSize:'9px' }}>{k}</span>
                <span style={{ color:'#64748b' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Parameter Panel */}
          <div>
            <h3 style={{ fontSize:'9.5px', fontWeight:700, color:'#22d3ee', letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:'8px', borderBottom:'1px solid #1e293b', paddingBottom:'4px' }}>Parameter Panel</h3>
            {[
              ['8 Tabs', 'Routine · Contrast · Resolution · Geometry · Sequence · System · Physio · Inline'],
              ['TR / TE / SL', 'Auto-recalculates TA and SNR'],
              ['Calc TA', 'Live estimated acquisition time'],
              ['SNR', 'Estimated signal-to-noise ratio'],
              ['Contrast', 'Auto-detected weighting (T1/T2/PD/FLAIR)'],
              ['Resolution', 'Voxel size (X×Y×Z mm)'],
            ].map(([k,v])=>(
              <div key={k} style={{ display:'flex', gap:'8px', padding:'3px 0', borderBottom:'1px solid #0d1520', fontSize:'9.5px' }}>
                <span style={{ color:'#475569', fontFamily:'Roboto Mono,monospace', minWidth:'80px', fontSize:'8.5px', flexShrink:0 }}>{k}</span>
                <span style={{ color:'#64748b' }}>{v}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding:'10px 16px', borderTop:'1px solid #1e293b', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <span style={{ fontSize:'8.5px', color:'#334155', fontStyle:'italic' }}>⚕ Educational simulator only — not for clinical diagnosis</span>
          <button onClick={toggleHelp}
            style={{ fontSize:'10px', fontWeight:600, background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.3)', color:'#22d3ee', padding:'5px 18px', cursor:'pointer', borderRadius:'2px' }}
          >Got it!</button>
        </div>
      </div>
    </div>
  );
}
