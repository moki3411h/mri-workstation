'use client';
import React, { useState, useCallback, useEffect } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { toast } from '@/lib/toast';

const styles = {
  window: {
    background: '#c0c0c0',
    border: '2px solid',
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#808080',
    borderBottomColor: '#808080',
    boxShadow: '1px 1px 0 #000',
    fontFamily: 'Tahoma, Arial, sans-serif',
    fontSize: '11px',
    color: '#000',
    width: '740px',
  },
  titleBar: {
    background: 'linear-gradient(90deg, #000080, #1084d0)',
    color: '#fff',
    padding: '2px 4px',
    fontWeight: 'bold',
    fontSize: '11px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  closeBtn: {
    background: '#c0c0c0',
    color: '#000',
    border: '1px solid',
    borderTopColor: '#fff',
    borderLeftColor: '#fff',
    borderRightColor: '#808080',
    borderBottomColor: '#808080',
    width: '14px',
    height: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'default',
    fontWeight: 'bold',
    fontSize: '9px',
    padding: 0,
    lineHeight: 1,
  },
  panel: {
    display: 'flex',
    border: '2px solid',
    borderTopColor: '#808080',
    borderLeftColor: '#808080',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    marginBottom: '4px',
    background: '#c0c0c0',
  },
  tab: {
    background: '#9ca9b5', // slightly blue-ish gray
    color: '#000',
    width: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    paddingTop: '6px',
    fontWeight: 'bold',
    fontSize: '12px',
    letterSpacing: '2px',
    borderRight: '1px solid #808080',
  },
  tabChar: {
    transform: 'rotate(90deg)',
    display: 'inline-block',
    marginBottom: '4px'
  },
  formContent: {
    padding: '8px 12px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
  },
  label: {
    width: '130px',
    textAlign: 'right' as const,
    paddingRight: '10px',
    color: '#000',
  },
  input: {
    border: '1px solid',
    borderTopColor: '#808080',
    borderLeftColor: '#808080',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    background: '#fff',
    padding: '2px 4px',
    fontSize: '11px',
    color: '#000',
    fontFamily: 'Tahoma, Arial, sans-serif',
    outline: 'none',
  },
  inputReadonly: {
    background: '#d4d0c8',
    color: '#808080',
  },
  button: {
    background: '#c0c0c0',
    border: '1px solid',
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#808080',
    borderBottomColor: '#808080',
    padding: '2px 12px',
    fontSize: '11px',
    color: '#000',
    fontFamily: 'Tahoma, Arial, sans-serif',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '70px',
  },
  buttonActive: {
    borderTopColor: '#808080',
    borderLeftColor: '#808080',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    paddingTop: '3px',
    paddingLeft: '13px',
    paddingRight: '11px',
    paddingBottom: '1px',
    background: '#d4d0c8',
  }
};

const VerticalText = ({ text }: { text: string }) => (
  <div style={styles.tab}>
    {text.split('').map((char, i) => (
      <span key={i} style={{ display: 'block', lineHeight: 1.1 }}>{char}</span>
    ))}
  </div>
);

export default function PatientModal() {
  const { patient, setPatient, togglePatient, setStatusMsg } = useWorkstationStore();

  const [form, setForm] = useState({
    lastName: patient.name.split(' ')[0] ?? '',
    firstName: patient.name.split(' ')[1] ?? '',
    title: '',
    patientId: patient.patientId,
    dob: patient.dob,
    age: String(new Date().getFullYear() - new Date(patient.dob).getFullYear()),
    sex: patient.sex,
    height: String(patient.height),
    weight: String(patient.weight),
    institution: 'City General Hospital',
    referringMD: 'Dr. Smith',
    requestingMD: '',
    admissionID: '',
    procedure: patient.study,
    accession: patient.accession,
    requestID: '',
    position: 'Head First — Supine',
    additionalInfo: '',
  });

  const F = useCallback((key: keyof typeof form) => (v: string) => {
    setForm(prev => ({ ...prev, [key]: v }));
    if (key === 'dob') {
      const yr = new Date(v).getFullYear();
      if (!isNaN(yr)) {
        const age = new Date().getFullYear() - yr;
        setForm(prev => ({ ...prev, dob: v, age: String(age > 0 ? age : 0) }));
      }
    }
  }, []);

  const handleSave = useCallback(() => {
    const fullName = `${form.lastName.toUpperCase()}, ${form.firstName}`;
    setPatient({
      name: fullName.trim() || 'ANONYMOUS',
      dob: form.dob,
      sex: form.sex,
      weight: Number(form.weight) || 0,
      height: Number(form.height) || 0,
      study: form.procedure,
      accession: form.accession,
      patientId: form.patientId,
    });
    togglePatient();
    setStatusMsg(`Patient registered: ${fullName.trim() || 'ANONYMOUS'}`);
    toast(`Patient registered: ${fullName.trim() || 'ANONYMOUS'}`, 'success');
  }, [form, setPatient, togglePatient, setStatusMsg]);

  // Trap focus / Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') togglePatient();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePatient]);

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) togglePatient(); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={styles.window} onClick={e => e.stopPropagation()}>
        
        {/* Title Bar */}
        <div style={styles.titleBar}>
          <span>Patient Registration</span>
          <button style={styles.closeBtn} onClick={togglePatient}>x</button>
        </div>

        <div style={{ padding: '2px 4px 6px 4px', display: 'flex', gap: '4px' }}>
          
          {/* Left Column */}
          <div style={{ flex: 1.1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            
            {/* PATIENT */}
            <div style={styles.panel}>
              <VerticalText text="PATIENT" />
              <div style={styles.formContent}>
                <div style={styles.row}>
                  <div style={styles.label}>Last name</div>
                  <input style={{ ...styles.input, flex: 1 }} value={form.lastName} onChange={e => F('lastName')(e.target.value)} />
                </div>
                <div style={styles.row}>
                  <div style={styles.label}>First name</div>
                  <input style={{ ...styles.input, flex: 1 }} value={form.firstName} onChange={e => F('firstName')(e.target.value)} />
                </div>
                <div style={styles.row}>
                  <div style={styles.label}>Title</div>
                  <input style={{ ...styles.input, width: '60px' }} value={form.title} onChange={e => F('title')(e.target.value)} />
                </div>
                <div style={styles.row}>
                  <div style={styles.label}>Patient ID</div>
                  <input style={{ ...styles.input, flex: 1 }} value={form.patientId} onChange={e => F('patientId')(e.target.value)} />
                </div>
                <div style={styles.row}>
                  <div style={styles.label}>Date of birth</div>
                  <div style={{ display: 'flex', flex: 1, gap: '4px', alignItems: 'center' }}>
                    <input style={{ ...styles.input, width: '90px' }} type="date" value={form.dob} onChange={e => F('dob')(e.target.value)} />
                    <span style={{ color: '#808080' }}>[dd-MMM-yy]</span>
                  </div>
                </div>
                <div style={styles.row}>
                  <div style={styles.label}>Sex</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label><input type="radio" name="sex" checked={form.sex === 'M'} onChange={() => F('sex')('M')} /> Male</label>
                    <label><input type="radio" name="sex" checked={form.sex === 'F'} onChange={() => F('sex')('F')} /> Female</label>
                    <label><input type="radio" name="sex" checked={form.sex === 'Other'} onChange={() => F('sex')('Other')} /> Other</label>
                  </div>
                </div>
                <div style={styles.row}>
                  <div style={styles.label}>Age</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input style={{ ...styles.input, width: '40px' }} value={form.age} onChange={e => F('age')(e.target.value)} />
                    <select style={styles.input}>
                      <option>Years</option>
                      <option>Months</option>
                      <option>Days</option>
                    </select>
                  </div>
                </div>
                <div style={styles.row}>
                  <div style={styles.label}>Height</div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <input style={{ ...styles.input, width: '40px' }} value={form.height} onChange={e => F('height')(e.target.value)} />
                    <span>cm</span>
                  </div>
                </div>
                <div style={styles.row}>
                  <div style={styles.label}>Weight</div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flex: 1 }}>
                    <input style={{ ...styles.input, width: '40px' }} value={form.weight} onChange={e => F('weight')(e.target.value)} />
                    <span>kg</span>
                    <label style={{ marginLeft: '16px' }}><input type="checkbox" defaultChecked /> Metric</label>
                  </div>
                </div>
                <div style={{ ...styles.row, alignItems: 'flex-start', marginTop: '4px' }}>
                  <div style={styles.label}>Additional info</div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <textarea style={{ ...styles.input, height: '40px', resize: 'none' }} value={form.additionalInfo} onChange={e => F('additionalInfo')(e.target.value)} />
                    <button style={{ ...styles.button, width: '60px', alignSelf: 'center', marginTop: '4px' }}>Details</button>
                  </div>
                </div>
              </div>
            </div>

            {/* HOSPITAL */}
            <div style={styles.panel}>
              <VerticalText text="HOSPITAL" />
              <div style={styles.formContent}>
                <div style={styles.row}>
                  <div style={styles.label}>Referring physician</div>
                  <select style={{ ...styles.input, flex: 1 }} value={form.referringMD} onChange={e => F('referringMD')(e.target.value)}>
                    <option>{form.referringMD}</option>
                  </select>
                </div>
                <div style={styles.row}>
                  <div style={styles.label}>Requesting physician</div>
                  <select style={{ ...styles.input, flex: 1 }} value={form.requestingMD} onChange={e => F('requestingMD')(e.target.value)}>
                    <option></option>
                  </select>
                </div>
                <div style={styles.row}>
                  <div style={styles.label}>Admission ID</div>
                  <input style={{ ...styles.input, flex: 1 }} value={form.admissionID} onChange={e => F('admissionID')(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Action Buttons Left */}
            <div style={{ display: 'flex', gap: '6px', paddingLeft: '8px', marginTop: '4px' }}>
              <button style={styles.button}>Preregister</button>
              <button style={{ ...styles.button, ...styles.buttonActive }} onClick={handleSave}>Exam</button>
              <button style={styles.button}>Search</button>
              <button style={styles.button} onClick={togglePatient}>Cancel</button>
            </div>

          </div>

          {/* Right Column */}
          <div style={{ flex: 0.9, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            
            {/* PROCEDURE */}
            <div style={{ ...styles.panel, flex: 0.65 }}>
              <VerticalText text="PROCEDURE" />
              <div style={styles.formContent}>
                <div style={styles.row}>
                  <div style={{ ...styles.label, width: '100px' }}>Accession No</div>
                  <input style={{ ...styles.input, flex: 1 }} value={form.accession} onChange={e => F('accession')(e.target.value)} />
                </div>
                <div style={styles.row}>
                  <div style={{ ...styles.label, width: '100px' }}>Request ID</div>
                  <input style={{ ...styles.input, flex: 1 }} value={form.requestID} onChange={e => F('requestID')(e.target.value)} />
                </div>
                <div style={{ ...styles.row, alignItems: 'flex-start' }}>
                  <div style={{ ...styles.label, width: '100px' }}>Requested<br/>procedure(s)</div>
                  <textarea style={{ ...styles.input, flex: 1, height: '40px', resize: 'none' }} value={form.procedure} onChange={e => F('procedure')(e.target.value)} />
                </div>
                <div style={styles.row}>
                  <div style={{ ...styles.label, width: '100px' }}>Patient position</div>
                  <select style={{ ...styles.input, flex: 1 }} value={form.position} onChange={e => F('position')(e.target.value)}>
                    <option>Head First — Supine</option>
                    <option>Head First — Prone</option>
                    <option>Feet First — Supine</option>
                    <option>Feet First — Prone</option>
                  </select>
                </div>
              </div>
            </div>

            {/* INSTITUTION */}
            <div style={{ ...styles.panel, flex: 0.35 }}>
              <VerticalText text="INSTITUTION" />
              <div style={styles.formContent}>
                <div style={styles.row}>
                  <div style={{ ...styles.label, width: '120px' }}>Institution name</div>
                  <select style={{ ...styles.input, flex: 1 }} value={form.institution} onChange={e => F('institution')(e.target.value)}>
                    <option>{form.institution}</option>
                  </select>
                </div>
                <div style={styles.row}>
                  <div style={{ ...styles.label, width: '120px' }}>1. Performing physician</div>
                  <select style={{ ...styles.input, flex: 1 }}><option></option></select>
                </div>
                <div style={styles.row}>
                  <div style={{ ...styles.label, width: '120px' }}>1. Operator</div>
                  <select style={{ ...styles.input, flex: 1 }}><option></option></select>
                </div>
              </div>
            </div>

            <div style={{ flex: 1 }} /> {/* Empty space bottom right */}

            {/* Action Buttons Right */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: '4px', marginTop: '4px' }}>
              <button style={styles.button}>Help</button>
            </div>
            
          </div>
        </div>

        {/* Status Bar */}
        <div style={{ borderTop: '1px solid #808080', background: '#c0c0c0', padding: '2px 4px', fontSize: '10px', color: '#808080', display: 'flex', justifyContent: 'space-between' }}>
          <span>Patient Registration</span>
          <span>ISO_IR 100</span>
        </div>
      </div>
    </div>
  );
}
