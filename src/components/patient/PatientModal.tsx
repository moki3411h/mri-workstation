'use client';
import { useState } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { toast } from '@/lib/toast';

export default function PatientModal() {
  const { patient, safety, setPatient, setSafety, togglePatient } = useWorkstationStore();
  const [form, setForm] = useState({ ...patient });
  const [safe, setSafeLocal] = useState({ ...safety });
  const isUnsafe = safe.implant || safe.pacemaker;

  function save() {
    setPatient(form);
    setSafety(safe);
    togglePatient();
    toast('Patient data saved ✓', 'success');
  }

  const F = ({ label, fid, type='text' }: { label:string; fid: keyof typeof form; type?:string }) => (
    <div style={{ display:'flex', flexDirection:'column', marginBottom:'8px' }}>
      <label style={{ fontSize:'8.5px', color:'#475569', marginBottom:'3px', letterSpacing:'0.3px' }}>{label}</label>
      <input
        type={type} value={String(form[fid])}
        onChange={e => setForm({ ...form, [fid]: type === 'number' ? +e.target.value : e.target.value })}
        style={{ background:'#060b14', border:'1px solid #263040', color:'#94a3b8', fontFamily:'Roboto Mono,monospace', fontSize:'10px', padding:'4px 8px', borderRadius:'2px', outline:'none' }}
      />
    </div>
  );

  const Check = ({ label, cid, color='#ef4444' }: { label:string; cid:keyof typeof safe; color?:string }) => (
    <label style={{ display:'flex', alignItems:'center', gap:'8px', padding:'5px 0', borderBottom:'1px solid #0d1520', cursor:'pointer', fontSize:'9.5px' }}>
      <input type="checkbox" checked={!!safe[cid]} onChange={e=>setSafeLocal({...safe,[cid]:e.target.checked})}
        style={{ width:'13px', height:'13px', accentColor: color, cursor:'pointer' }} />
      <span style={{ color: (safe[cid] && cid !== 'previousMRI') ? color : '#64748b' }}>{label}</span>
      {safe[cid] && cid !== 'previousMRI' && <span style={{ marginLeft:'auto', fontSize:'8px', fontWeight:700, color, background:`${color}15`, border:`1px solid ${color}30`, borderRadius:'2px', padding:'1px 5px' }}>YES</span>}
    </label>
  );

  return (
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)togglePatient();}}>
      <div className="modal-box" style={{ width:'680px', maxWidth:'95vw' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', padding:'12px 16px', borderBottom:'1px solid #1e3a5f', flexShrink:0, background:'rgba(14,165,233,0.04)' }}>
          <div>
            <div style={{ fontSize:'13px', fontWeight:700, color:'#e2e8f0' }}>Patient Registration & MRI Safety</div>
            <div style={{ fontSize:'9px', color:'#475569', marginTop:'2px' }}>Complete all fields before scanning</div>
          </div>
          <button onClick={togglePatient} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'#64748b', fontSize:'18px', cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', padding:'16px', overflowY:'auto', maxHeight:'65vh' }}>
          {/* Patient Info */}
          <div>
            <h3 style={{ fontSize:'9.5px', fontWeight:700, color:'#22d3ee', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'12px', paddingBottom:'4px', borderBottom:'1px solid #1e293b' }}>Patient Information</h3>
            <F label="Full Name"          fid="name" />
            <F label="Date of Birth"      fid="dob"  type="date" />
            <div style={{ display:'flex', flexDirection:'column', marginBottom:'8px' }}>
              <label style={{ fontSize:'8.5px', color:'#475569', marginBottom:'3px' }}>Sex</label>
              <select value={form.sex} onChange={e=>setForm({...form,sex:e.target.value})}
                style={{ background:'#060b14', border:'1px solid #263040', color:'#94a3b8', fontFamily:'Roboto Mono,monospace', fontSize:'10px', padding:'4px 8px', borderRadius:'2px', outline:'none' }}>
                {['M','F','Other'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              <F label="Weight (kg)"   fid="weight"  type="number" />
              <F label="Height (cm)"   fid="height"  type="number" />
            </div>
            <F label="Study Description" fid="study" />
            <F label="Accession Number"  fid="accession" />
            <F label="Patient ID"        fid="patientId" />
          </div>

          {/* Safety */}
          <div>
            <h3 style={{ fontSize:'9.5px', fontWeight:700, color:'#22d3ee', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'12px', paddingBottom:'4px', borderBottom:'1px solid #1e293b' }}>MRI Safety Checklist</h3>
            <Check label="Metallic Implant (any device, plate, stent)" cid="implant" />
            <Check label="Pacemaker / ICD / Neurostimulator"          cid="pacemaker" />
            <Check label="Pregnancy (or suspected)"                   cid="pregnant" />
            <Check label="Contrast Media Allergy (gadolinium)"        cid="contrastAllergy" color="#f59e0b" />
            <Check label="Claustrophobia"                             cid="claustrophobia"  color="#f59e0b" />
            <Check label="Previous MRI (no adverse events)"           cid="previousMRI"     color="#22c55e" />

            <div style={{ marginTop:'12px' }}>
              <label style={{ fontSize:'8.5px', color:'#475569', display:'block', marginBottom:'3px' }}>Emergency Contact</label>
              <input
                value={safe.emergencyContact}
                onChange={e=>setSafeLocal({...safe,emergencyContact:e.target.value})}
                placeholder="Name & phone number"
                style={{ width:'100%', background:'#060b14', border:'1px solid #263040', color:'#94a3b8', fontFamily:'Roboto Mono,monospace', fontSize:'10px', padding:'4px 8px', borderRadius:'2px', outline:'none' }}
              />
            </div>
          </div>
        </div>

        {/* Warning banner */}
        {isUnsafe && (
          <div style={{ margin:'0 16px', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'2px', padding:'8px 12px' }}>
            <div style={{ fontSize:'10px', fontWeight:700, color:'#ef4444' }}>⚠ MRI SAFETY ALERT</div>
            <div style={{ fontSize:'9px', color:'#fca5a5', marginTop:'4px' }}>
              Patient has reported a metallic implant or cardiac device. Scanning may be CONTRAINDICATED. Consult a radiologist and verify implant MR-compatibility before proceeding.
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ padding:'12px 16px', borderTop:'1px solid #1e293b', display:'flex', gap:'8px', justifyContent:'flex-end', flexShrink:0 }}>
          <button onClick={togglePatient}
            style={{ fontSize:'10px', background:'transparent', border:'1px solid #263040', color:'#64748b', padding:'5px 16px', cursor:'pointer', borderRadius:'2px' }}>
            Cancel
          </button>
          <button onClick={save}
            style={{ fontSize:'10px', fontWeight:600, background:'rgba(34,211,238,0.15)', border:'1px solid rgba(34,211,238,0.4)', color:'#22d3ee', padding:'5px 20px', cursor:'pointer', borderRadius:'2px' }}>
            Save Patient
          </button>
        </div>
      </div>
    </div>
  );
}
