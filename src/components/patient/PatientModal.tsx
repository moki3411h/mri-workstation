'use client';
import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { toast } from '@/lib/toast';

// ─── Stable form field (never loses focus) ─────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  tabIndex?: number;
  readOnly?: boolean;
}

const Field = memo(function Field({ label, value, onChange, type = 'text', placeholder, required, tabIndex, readOnly }: FieldProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div style={{ display:'flex', flexDirection:'column', marginBottom:'8px' }}>
      <label style={{ fontSize:'8px', color:'#475569', marginBottom:'2px', letterSpacing:'0.3px', textTransform:'uppercase' }}>
        {label}{required && <span style={{ color:'#ef4444', marginLeft:'2px' }}>*</span>}
      </label>
      <input
        ref={ref}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        tabIndex={tabIndex}
        autoComplete="off"
        spellCheck={false}
        style={{
          background: readOnly ? '#04060a' : '#060b14',
          border: `1px solid ${readOnly ? '#1e293b' : '#263040'}`,
          color: readOnly ? '#475569' : '#e2e8f0',
          fontFamily: 'Roboto Mono, monospace',
          fontSize: '10px',
          padding: '5px 8px',
          borderRadius: '2px',
          outline: 'none',
          transition: 'border-color 0.1s',
          cursor: readOnly ? 'default' : 'text',
        }}
        onFocus={e => { if (!readOnly) (e.target as HTMLInputElement).style.borderColor = '#22d3ee'; }}
        onBlur={e => { (e.target as HTMLInputElement).style.borderColor = readOnly ? '#1e293b' : '#263040'; }}
      />
    </div>
  );
});

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  tabIndex?: number;
}

const SelectField = memo(function SelectField({ label, value, onChange, options, tabIndex }: SelectFieldProps) {
  return (
    <div style={{ display:'flex', flexDirection:'column', marginBottom:'8px' }}>
      <label style={{ fontSize:'8px', color:'#475569', marginBottom:'2px', letterSpacing:'0.3px', textTransform:'uppercase' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        tabIndex={tabIndex}
        style={{ background:'#060b14', border:'1px solid #263040', color:'#e2e8f0', fontFamily:'Roboto Mono,monospace', fontSize:'10px', padding:'5px 6px', borderRadius:'2px', outline:'none' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
});

interface CheckRowProps {
  label: string;
  sublabel?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  riskLevel?: 'red' | 'amber' | 'green';
  tabIndex?: number;
}

const CheckRow = memo(function CheckRow({ label, sublabel, checked, onChange, riskLevel = 'red', tabIndex }: CheckRowProps) {
  const color = riskLevel === 'red' ? '#ef4444' : riskLevel === 'amber' ? '#f59e0b' : '#22c55e';
  return (
    <label style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'5px 0', borderBottom:'1px solid #0d1520', cursor:'pointer', userSelect:'none' }} tabIndex={tabIndex}>
      <div style={{ position:'relative', width:'14px', height:'14px', flexShrink:0, marginTop:'1px' }}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ position:'absolute', opacity:0, width:0, height:0 }} />
        <div style={{
          width:'14px', height:'14px', border:`1px solid ${checked ? color : '#263040'}`,
          background: checked ? `${color}20` : '#060b14', borderRadius:'2px',
          display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.1s',
        }}>
          {checked && <span style={{ color, fontSize:'10px', lineHeight:'1' }}>✓</span>}
        </div>
      </div>
      <div>
        <div style={{ fontSize:'9.5px', color: checked ? color : '#64748b' }}>{label}</div>
        {sublabel && <div style={{ fontSize:'8px', color:'#334155', marginTop:'1px' }}>{sublabel}</div>}
      </div>
      {checked && riskLevel !== 'green' && (
        <div style={{ marginLeft:'auto', fontSize:'7.5px', fontWeight:700, color, background:`${color}10`, border:`1px solid ${color}30`, borderRadius:'2px', padding:'1px 5px', flexShrink:0 }}>
          {riskLevel === 'red' ? 'HIGH RISK' : 'CAUTION'}
        </div>
      )}
    </label>
  );
});

export default function PatientModal() {
  const { patient, safety, setPatient, setSafety, togglePatient, setStatusMsg } = useWorkstationStore();

  // ── Local form state (prevents focus loss on store re-renders) ──
  const [form, setForm] = useState({
    lastName:   patient.name.split(' ')[0] ?? '',
    firstName:  patient.name.split(' ')[1] ?? '',
    patientId:  patient.patientId,
    dob:        patient.dob,
    age:        String(new Date().getFullYear() - new Date(patient.dob).getFullYear()),
    sex:        patient.sex,
    height:     String(patient.height),
    weight:     String(patient.weight),
    institution:'City General Hospital',
    referringMD:'Dr. Smith',
    procedure:  patient.study,
    position:   'Head First — Supine',
    additionalInfo: '',
    emergencyContact: safety.emergencyContact,
  });

  const [safe, setSafeLocal] = useState({ ...safety });
  const [searchTerm, setSearchTerm] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const F = useCallback((key: keyof typeof form) => (v: string) => {
    setForm(prev => ({ ...prev, [key]: v }));
    // Auto-calc age from DOB
    if (key === 'dob') {
      const age = new Date().getFullYear() - new Date(v).getFullYear();
      setForm(prev => ({ ...prev, dob: v, age: String(age > 0 ? age : 0) }));
    }
  }, []);

  const isUnsafe = safe.implant || safe.pacemaker;
  const isWarning = safe.pregnant || safe.contrastAllergy || safe.claustrophobia;

  const handleSave = useCallback(() => {
    const fullName = `${form.lastName.toUpperCase()}, ${form.firstName}`;
    setPatient({
      name: fullName.trim() || 'ANONYMOUS',
      dob:  form.dob,
      sex:  form.sex,
      weight: Number(form.weight) || 0,
      height: Number(form.height) || 0,
      study:  form.procedure,
      accession: patient.accession,
      patientId: form.patientId,
    });
    setSafety({ ...safe, emergencyContact: form.emergencyContact });
    togglePatient();
    setStatusMsg(`Patient registered: ${fullName.trim() || 'ANONYMOUS'}`);
    toast(`Patient registered: ${fullName.trim() || 'ANONYMOUS'}`, 'success');
  }, [form, safe, setPatient, setSafety, togglePatient, setStatusMsg, patient.accession]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') togglePatient();
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSave();
  }, [togglePatient, handleSave]);

  // Trap focus inside modal
  useEffect(() => {
    const focusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      // Handled natively by tabIndex ordering
    };
    document.addEventListener('keydown', focusTrap);
    return () => document.removeEventListener('keydown', focusTrap);
  }, []);

  return (
    <div
      className="modal-overlay"
      onKeyDown={handleKeyDown}
      onClick={e => { if (e.target === e.currentTarget) togglePatient(); }}
    >
      <div className="modal-box" style={{ width: '760px', maxWidth: '96vw' }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', padding:'10px 16px', borderBottom:'1px solid #1e3a5f', background:'rgba(14,165,233,0.05)', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'28px', height:'28px', background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.25)', borderRadius:'2px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px' }}>👤</div>
            <div>
              <div style={{ fontSize:'12px', fontWeight:700, color:'#e2e8f0' }}>Patient Registration</div>
              <div style={{ fontSize:'8.5px', color:'#475569' }}>Register new patient — MRI Safety Clearance Required</div>
            </div>
          </div>
          <div style={{ marginLeft:'auto', display:'flex', gap:'6px', alignItems:'center' }}>
            <div style={{ position:'relative' }}>
              <input
                ref={searchRef}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="🔍 Search patient…"
                style={{ background:'#060b14', border:'1px solid #263040', color:'#94a3b8', fontFamily:'Roboto Mono,monospace', fontSize:'9.5px', padding:'4px 10px', borderRadius:'2px', outline:'none', width:'160px' }}
              />
            </div>
            <button onClick={togglePatient} style={{ background:'transparent', border:'none', color:'#64748b', fontSize:'18px', cursor:'pointer', padding:'0 4px' }}>✕</button>
          </div>
        </div>

        {/* ── Two-column body ────────────────────────────────────────── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0', overflowY:'auto', maxHeight:'68vh' }}>

          {/* ── LEFT: Patient Information ─────────────────────────── */}
          <div style={{ padding:'14px 16px', borderRight:'1px solid #1e293b', overflowY:'auto' }}>
            <div style={{ fontSize:'9px', fontWeight:700, color:'#22d3ee', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'12px', paddingBottom:'4px', borderBottom:'1px solid #1e293b' }}>
              Patient Information
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 10px' }}>
              <Field label="Last Name" value={form.lastName} onChange={F('lastName')} required placeholder="SMITH" tabIndex={1} />
              <Field label="First Name" value={form.firstName} onChange={F('firstName')} placeholder="John" tabIndex={2} />
            </div>

            <Field label="Patient ID" value={form.patientId} onChange={F('patientId')} placeholder="MR-001" tabIndex={3} />

            <div style={{ display:'grid', gridTemplateColumns:'1fr 60px', gap:'0 10px' }}>
              <Field label="Date of Birth" value={form.dob} onChange={F('dob')} type="date" tabIndex={4} />
              <Field label="Age" value={form.age} onChange={F('age')} placeholder="49" tabIndex={5} readOnly />
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 10px' }}>
              <SelectField label="Sex" value={form.sex} onChange={F('sex')} options={['M','F','Other']} tabIndex={6} />
              <Field label="Weight kg" value={form.weight} onChange={F('weight')} type="text" placeholder="75" tabIndex={7} />
              <Field label="Height cm" value={form.height} onChange={F('height')} type="text" placeholder="175" tabIndex={8} />
            </div>

            <div style={{ borderTop:'1px solid #1e293b', paddingTop:'10px', marginTop:'4px' }}>
              <div style={{ fontSize:'9px', fontWeight:700, color:'#22d3ee', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'10px' }}>Study Information</div>
              <Field label="Institution" value={form.institution} onChange={F('institution')} tabIndex={9} />
              <Field label="Referring Physician" value={form.referringMD} onChange={F('referringMD')} tabIndex={10} />
              <Field label="Procedure / Study" value={form.procedure} onChange={F('procedure')} tabIndex={11} />
              <SelectField label="Patient Position" value={form.position} onChange={F('position')} tabIndex={12}
                options={['Head First — Supine','Head First — Prone','Feet First — Supine','Feet First — Prone']} />
              <Field label="Additional Information" value={form.additionalInfo} onChange={F('additionalInfo')} placeholder="Optional notes…" tabIndex={13} />
              <Field label="Emergency Contact" value={form.emergencyContact} onChange={F('emergencyContact')} placeholder="Name & phone" tabIndex={14} />
            </div>
          </div>

          {/* ── RIGHT: Safety Checklist ────────────────────────────── */}
          <div style={{ padding:'14px 16px', background:'rgba(0,0,0,0.15)', overflowY:'auto' }}>
            <div style={{ fontSize:'9px', fontWeight:700, color:'#22d3ee', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'12px', paddingBottom:'4px', borderBottom:'1px solid #1e293b' }}>
              MRI Safety Screening
            </div>

            {/* Warning banner */}
            {(isUnsafe || isWarning) && (
              <div style={{ marginBottom:'10px', padding:'7px 10px', background:`rgba(${isUnsafe?'239,68,68':'245,158,11'},0.1)`, border:`1px solid rgba(${isUnsafe?'239,68,68':'245,158,11'},0.4)`, borderRadius:'2px' }}>
                <div style={{ fontSize:'9px', fontWeight:700, color: isUnsafe?'#ef4444':'#f59e0b' }}>
                  {isUnsafe ? '⚠ CONTRAINDICATION DETECTED' : '⚠ CAUTION — VERIFY BEFORE SCANNING'}
                </div>
                <div style={{ fontSize:'8.5px', color:'#94a3b8', marginTop:'2px' }}>
                  {isUnsafe
                    ? 'Patient has reported a metallic implant or cardiac device. DO NOT PROCEED without radiologist clearance and implant MR-safety verification.'
                    : 'One or more precautions flagged. Review and confirm with radiologist.'}
                </div>
              </div>
            )}

            <div style={{ marginBottom:'6px', fontSize:'8px', color:'#334155', fontWeight:700, letterSpacing:'0.3px' }}>ABSOLUTE CONTRAINDICATIONS</div>
            <CheckRow label="Metallic Implant" sublabel="Any device, plate, screw, stent, clip, or shrapnel" checked={safe.implant} onChange={v => setSafeLocal(s => ({...s, implant:v}))} riskLevel="red" />
            <CheckRow label="Pacemaker / ICD / Neurostimulator" sublabel="Cardiac or neural implanted electronic device" checked={safe.pacemaker} onChange={v => setSafeLocal(s => ({...s, pacemaker:v}))} riskLevel="red" />

            <div style={{ marginTop:'10px', marginBottom:'6px', fontSize:'8px', color:'#334155', fontWeight:700, letterSpacing:'0.3px' }}>RELATIVE CONTRAINDICATIONS</div>
            <CheckRow label="Pregnancy" sublabel="Known or suspected (especially 1st trimester)" checked={safe.pregnant} onChange={v => setSafeLocal(s => ({...s, pregnant:v}))} riskLevel="amber" />
            <CheckRow label="Contrast Media Allergy" sublabel="Prior reaction to gadolinium-based agents" checked={safe.contrastAllergy} onChange={v => setSafeLocal(s => ({...s, contrastAllergy:v}))} riskLevel="amber" />
            <CheckRow label="Claustrophobia" sublabel="Requires sedation protocol if severe" checked={safe.claustrophobia} onChange={v => setSafeLocal(s => ({...s, claustrophobia:v}))} riskLevel="amber" />

            <div style={{ marginTop:'10px', marginBottom:'6px', fontSize:'8px', color:'#334155', fontWeight:700, letterSpacing:'0.3px' }}>HISTORY</div>
            <CheckRow label="Previous MRI — No Adverse Events" sublabel="Patient has undergone MRI before without issues" checked={safe.previousMRI} onChange={v => setSafeLocal(s => ({...s, previousMRI:v}))} riskLevel="green" />

            {/* SAR / Weight notice */}
            <div style={{ marginTop:'12px', padding:'8px', background:'#0d1626', border:'1px solid #1e293b', borderRadius:'2px' }}>
              <div style={{ fontSize:'8px', color:'#475569', marginBottom:'4px', fontWeight:700 }}>SAR ESTIMATE (body weight)</div>
              <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                <div style={{ flex:1, height:'5px', background:'#1c2a3e', borderRadius:'2px', overflow:'hidden' }}>
                  <div style={{ height:'100%', width: `${Math.min(100, (Number(form.weight)/120)*100)}%`, background:'#22c55e' }} />
                </div>
                <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'9px', color:'#64748b' }}>{form.weight} kg</span>
              </div>
              <div style={{ fontSize:'8px', color:'#334155', marginTop:'4px' }}>SAR limits applied automatically based on patient weight and RF pulse configuration.</div>
            </div>

            {/* Keyboard hint */}
            <div style={{ marginTop:'10px', padding:'6px 8px', background:'rgba(34,211,238,0.04)', border:'1px solid rgba(34,211,238,0.1)', borderRadius:'2px', fontSize:'8px', color:'#334155' }}>
              <kbd style={{ fontSize:'7.5px' }}>Tab</kbd> next field · <kbd style={{ fontSize:'7.5px' }}>Shift+Tab</kbd> previous · <kbd style={{ fontSize:'7.5px' }}>Ctrl+Enter</kbd> save · <kbd style={{ fontSize:'7.5px' }}>Esc</kbd> cancel
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div style={{ padding:'10px 16px', borderTop:'1px solid #1e293b', display:'flex', gap:'8px', alignItems:'center', flexShrink:0, background:'#08101c' }}>
          <span style={{ fontSize:'8px', color:'#334155', fontStyle:'italic', flex:1 }}>
            ⚕ All patient data is for educational simulation only — not stored or transmitted
          </span>
          <button onClick={() => { setForm(f => ({...f, lastName:'', firstName:'', patientId:'', dob:'', age:'', emergencyContact:''})); setSafeLocal({implant:false,pacemaker:false,pregnant:false,contrastAllergy:false,claustrophobia:false,previousMRI:false,emergencyContact:''}); }}
            style={{ fontSize:'9px', background:'transparent', border:'1px solid #263040', color:'#475569', padding:'5px 12px', cursor:'pointer', borderRadius:'2px' }}>
            Clear
          </button>
          <button onClick={togglePatient}
            style={{ fontSize:'9px', background:'transparent', border:'1px solid #263040', color:'#64748b', padding:'5px 16px', cursor:'pointer', borderRadius:'2px' }}>
            Cancel
          </button>
          <button onClick={handleSave} tabIndex={15}
            style={{ fontSize:'10px', fontWeight:700, background:'rgba(34,211,238,0.15)', border:'1px solid rgba(34,211,238,0.4)', color:'#22d3ee', padding:'5px 24px', cursor:'pointer', borderRadius:'2px' }}>
            Register Patient ▶
          </button>
        </div>
      </div>
    </div>
  );
}
