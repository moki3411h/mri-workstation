'use client';
import { useState } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { toast } from '@/lib/toast';

const LESSONS = [
  {
    title: 'TR & T1 Weighting',
    icon: '⏱',
    content: 'Repetition Time (TR) determines T1 contrast. Short TR (400-600ms) allows tissue with fast T1 recovery (fat, post-Gd lesions) to recover more than slow T1 tissue (CSF). Result: T1-weighted image — fat/Gd bright, CSF dark. Long TR (>2000ms) allows all tissues to recover → less T1 weighting.',
    params: [['Short TR','400-600ms','T1-weighted'],['Long TR','≥2000ms','PD or T2-weighted'],['Tissue T1','Brain ~800ms','Fat ~300ms']],
    clinical: ['Anatomy delineation','Post-contrast tumor enhancement','White matter anatomy','Hemorrhage (subacute)'],
  },
  {
    title: 'TE & T2 Weighting',
    icon: '📡',
    content: 'Echo Time (TE) determines T2 contrast. Short TE (<30ms) measures signal before T2 decay begins — minimizes T2 differences. Long TE (>80ms) allows differential T2 decay — tissues with short T2 (bone, muscle) lose signal faster than long T2 tissues (CSF, edema).',
    params: [['Short TE','<30ms','Minimal T2 weight'],['Long TE','80-120ms','T2-weighted'],['Brain T2','CSF ~2000ms','WM ~80ms']],
    clinical: ['Edema detection (bright)','CSF visualization','Disc herniation','Demyelination'],
  },
  {
    title: 'FLAIR — Fluid Attenuated IR',
    icon: '🧠',
    content: 'FLAIR uses an inversion recovery pulse with TI ~2500ms at 1.5T to null CSF signal (TI = 0.693 × T1_CSF). This suppresses bright CSF, making periventricular and cortical lesions (MS plaques, stroke) visible where T2 TSE would hide them in bright CSF.',
    params: [['TI at 1.5T','~2500ms','Nulls CSF'],['TR','8000-10000ms','Full recovery'],['TE','90ms','T2-weighted']],
    clinical: ['Multiple Sclerosis plaques','Subarachnoid hemorrhage','Cortical infarcts','Meningeal disease'],
  },
  {
    title: 'DWI & Acute Stroke',
    icon: '⚡',
    content: 'Diffusion Weighted Imaging (DWI) detects restriction of water molecule Brownian motion. In acute ischemic stroke, cytotoxic edema (cell swelling) restricts diffusion → high signal on DWI, low signal on ADC map. DWI becomes positive within minutes of stroke onset — critical for triage.',
    params: [['b-value','1000 s/mm²','Standard DWI'],['ADC map','Derived','Low in acute stroke'],['TR/TE','4000/80ms','Typical EPI']],
    clinical: ['Acute ischemic stroke (<6h)','Abscess (restricted center)','Epidermoid cyst','Creutzfeldt-Jakob disease'],
  },
  {
    title: 'SWI & Hemorrhage',
    icon: '🔴',
    content: 'Susceptibility Weighted Imaging (SWI) exploits magnetic susceptibility differences between tissues. Hemosiderin, deoxyhemoglobin, calcium, and iron cause local field distortions → signal loss on T2* sequences. SWI combines magnitude and phase images to exquisitely detect microbleeds invisible on other sequences.',
    params: [['Flip angle','15°','Gradient echo'],['TE','20ms','Long for SWI'],['TR','27ms','Short GRE']],
    clinical: ['Cerebral microbleeds','Cavernous malformations','Traumatic axonal injury','Hemosiderin deposits'],
  },
  {
    title: 'MRA — Time of Flight',
    icon: '🩸',
    content: 'Time-of-Flight MRA uses inflow enhancement. Gradient echo with short TR partially saturates stationary tissue. Fresh (unsaturated) blood flowing into the slice has full magnetization → appears bright. No contrast needed. Excellent for circle of Willis, carotid arteries.',
    params: [['Flip angle','20-25°','Flow enhancement'],['TR','25ms','Saturates stationary tissue'],['TE','3-4ms','In-phase']],
    clinical: ['Circle of Willis aneurysm','Arteriovenous malformation','Carotid stenosis','Venous sinus thrombosis (MRV)'],
  },
  {
    title: 'Contrast Enhancement (Gd)',
    icon: '💉',
    content: 'Gadolinium-based contrast agents (GBCAs) shorten T1 relaxation time of adjacent water protons via dipole-dipole interactions. Enhancement occurs where blood-brain barrier (BBB) is disrupted. GBCAs distribute in extracellular space. Dose: 0.1 mmol/kg standard. Post-Gd T1 TSE acquired immediately and at 5-10 min.',
    params: [['Dose','0.1 mmol/kg','Standard'],['Peak','60-90s','First pass'],['TR/TE','400/11ms','Short TR T1']],
    clinical: ['Tumor enhancement (BBB break)','Active MS plaques','Abscess ring enhancement','Meningeal disease','Vascular malformations'],
  },
];

const QUIZ = [
  { q:'What TR produces T1 weighting at 1.5T?', opts:['100ms','500ms','2000ms','5000ms'], ans:1, exp:'TR ~500ms allows partial T1 recovery, giving good T1 contrast between tissues at 1.5T.' },
  { q:'FLAIR suppresses signal from which tissue?', opts:['Fat','CSF','Gray Matter','White Matter'], ans:1, exp:'FLAIR TI (~2500ms at 1.5T) = 0.693 × T1_CSF nulls the CSF signal.' },
  { q:'DWI detects what type of stroke?', opts:['Hemorrhagic','Chronic lacunar','Acute Ischemic','Watershed'], ans:2, exp:'Cytotoxic edema in acute ischemic stroke restricts water diffusion → DWI bright within minutes.' },
  { q:'SWI is sensitive to which substance?', opts:['Gadolinium','Hemosiderin/blood products','Fat','CSF'], ans:1, exp:'Hemosiderin and deoxyhemoglobin are paramagnetic → cause susceptibility artifacts visible on SWI.' },
  { q:'Aliasing artifact is caused by:', opts:['Long TE','Short TR','FOV smaller than patient anatomy','High bandwidth'], ans:2, exp:'When FOV is smaller than the imaged object, signal outside the FOV wraps into the image (aliasing).' },
];

const CASES = [
  { name:'Normal Brain',       seq:'T2 TSE',     color:'#1e3a5f' },
  { name:'Acute Stroke',       seq:'DWI b1000',  color:'#7f1d1d' },
  { name:'Glioblastoma',       seq:'T1+Gd TRA',  color:'#4c1d95' },
  { name:'Multiple Sclerosis', seq:'FLAIR TRA',  color:'#78350f' },
  { name:'SAH',                seq:'SWI TRA',    color:'#831843' },
  { name:'Hydrocephalus',      seq:'T2 COR',     color:'#0c4a6e' },
  { name:'Pituitary Adenoma',  seq:'T1+Gd SAG',  color:'#14532d' },
  { name:'Meningioma',         seq:'T1+Gd COR',  color:'#1e1b4b' },
  { name:'Cerebral Aneurysm',  seq:'MRA TOF',    color:'#713f12' },
];

export default function LearningPanel() {
  const { toggleLearning, setStatusMsg } = useWorkstationStore();
  const [tab, setTab] = useState(0);
  const [openLesson, setOpenLesson] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  function submit() {
    let s = 0;
    QUIZ.forEach((q, i) => { if (selected[i] === q.ans) s++; });
    setScore(s); setSubmitted(true);
  }

  return (
    <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'540px', background:'#0a1220', borderLeft:'1px solid #1e3a5f', zIndex:800, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'-4px 0 24px rgba(0,0,0,0.5)' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderBottom:'1px solid #1e293b', background:'rgba(14,165,233,0.05)', flexShrink:0 }}>
        <div>
          <div style={{ fontSize:'12px', fontWeight:700, color:'#e2e8f0' }}>📚 MRI Learning Center</div>
          <div style={{ fontSize:'8.5px', color:'#475569', marginTop:'1px' }}>Interactive MRI education for radiographers and students</div>
        </div>
        <button onClick={toggleLearning} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'#64748b', fontSize:'18px', cursor:'pointer' }}>✕</button>
      </div>

      <div className="tab-bar" style={{ flexShrink:0 }}>
        {['Lessons','Quiz','Cases'].map((t,i)=>(
          <button key={t} className={`tab-btn${i===tab?' active':''}`} onClick={()=>setTab(i)} style={{ fontSize:'10px', padding:'5px 16px' }}>{t}</button>
        ))}
      </div>

      <div style={{ flex:1, overflowY:'auto' }}>

        {/* LESSONS */}
        {tab===0 && (
          <div style={{ padding:'8px' }}>
            {LESSONS.map((lesson, i) => (
              <div key={i} style={{ marginBottom:'6px', border:'1px solid #1e293b', borderRadius:'2px', overflow:'hidden', background:'#0d1626' }}>
                <button
                  onClick={()=>setOpenLesson(openLesson===i?null:i)}
                  style={{ width:'100%', display:'flex', alignItems:'center', gap:'8px', padding:'8px 10px', background:'transparent', border:'none', cursor:'pointer', textAlign:'left' }}
                >
                  <span style={{ fontSize:'14px' }}>{lesson.icon}</span>
                  <span style={{ fontSize:'10px', fontWeight:600, color:'#94a3b8', flex:1 }}>{lesson.title}</span>
                  <span style={{ color:'#334155', fontSize:'10px' }}>{openLesson===i?'▼':'▶'}</span>
                </button>
                {openLesson===i && (
                  <div style={{ padding:'10px', borderTop:'1px solid #1e293b' }}>
                    <p style={{ fontSize:'9.5px', color:'#64748b', lineHeight:'1.6', marginBottom:'10px' }}>{lesson.content}</p>
                    <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'10px', fontSize:'9px' }}>
                      <thead><tr>
                        <th style={{ color:'#334155', padding:'3px 6px', textAlign:'left', borderBottom:'1px solid #1e293b' }}>Parameter</th>
                        <th style={{ color:'#334155', padding:'3px 6px', textAlign:'left', borderBottom:'1px solid #1e293b' }}>Value</th>
                        <th style={{ color:'#334155', padding:'3px 6px', textAlign:'left', borderBottom:'1px solid #1e293b' }}>Effect</th>
                      </tr></thead>
                      <tbody>{lesson.params.map(([p,v,e],j)=>(
                        <tr key={j} style={{ borderBottom:'1px solid #0d1520' }}>
                          <td style={{ padding:'3px 6px', color:'#22d3ee', fontFamily:'Roboto Mono,monospace' }}>{p}</td>
                          <td style={{ padding:'3px 6px', color:'#64748b', fontFamily:'Roboto Mono,monospace' }}>{v}</td>
                          <td style={{ padding:'3px 6px', color:'#475569' }}>{e}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                    <div style={{ fontSize:'8.5px', color:'#475569', fontWeight:600, marginBottom:'4px' }}>Clinical Applications:</div>
                    <ul style={{ margin:0, paddingLeft:'14px' }}>
                      {lesson.clinical.map((c,j)=><li key={j} style={{ fontSize:'9px', color:'#64748b', marginBottom:'2px' }}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* QUIZ */}
        {tab===1 && (
          <div style={{ padding:'12px' }}>
            {submitted && (
              <div style={{ marginBottom:'12px', padding:'10px', background: score>=4?'rgba(34,197,94,0.1)':'rgba(245,158,11,0.1)', border:`1px solid ${score>=4?'#22c55e':'#f59e0b'}`, borderRadius:'2px' }}>
                <div style={{ fontSize:'12px', fontWeight:700, color: score>=4?'#22c55e':'#f59e0b' }}>Score: {score}/{QUIZ.length}</div>
                <div style={{ fontSize:'9px', color:'#64748b', marginTop:'3px' }}>
                  {score===5?'Perfect! Excellent MRI physics knowledge.':score>=4?'Great work! Review the one you missed.':score>=3?'Good. Review the FLAIR and DWI lessons.':'Review the Lessons tab to strengthen your understanding.'}
                </div>
              </div>
            )}
            {QUIZ.map((q, qi) => (
              <div key={qi} style={{ marginBottom:'12px', padding:'10px', background:'#0d1626', border:'1px solid #1e293b', borderRadius:'2px' }}>
                <div style={{ fontSize:'10px', fontWeight:600, color:'#94a3b8', marginBottom:'8px' }}>{qi+1}. {q.q}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                  {q.opts.map((opt, oi) => {
                    const isSel = selected[qi]===oi;
                    const isCorr = submitted && oi===q.ans;
                    const isWrong = submitted && isSel && oi!==q.ans;
                    return (
                      <button key={oi} onClick={()=>{if(!submitted){const n=[...selected];n[qi]=oi;setSelected(n);}}}
                        style={{
                          textAlign:'left', padding:'5px 10px', fontSize:'9.5px',
                          background: isCorr?'rgba(34,197,94,0.15)':isWrong?'rgba(239,68,68,0.1)':isSel?'rgba(34,211,238,0.1)':'rgba(0,0,0,0.2)',
                          border: `1px solid ${isCorr?'#22c55e':isWrong?'#ef4444':isSel?'#22d3ee':'#1e293b'}`,
                          color: isCorr?'#22c55e':isWrong?'#ef4444':isSel?'#22d3ee':'#64748b',
                          cursor:submitted?'default':'pointer', borderRadius:'2px',
                        }}
                      >{opt}</button>
                    );
                  })}
                </div>
                {submitted && <div style={{ fontSize:'9px', color:'#64748b', marginTop:'6px', padding:'5px', background:'rgba(14,165,233,0.05)', borderRadius:'2px' }}>{q.exp}</div>}
              </div>
            ))}
            {!submitted && (
              <button onClick={submit}
                style={{ width:'100%', padding:'8px', fontSize:'10px', fontWeight:600, background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.3)', color:'#22d3ee', cursor:'pointer', borderRadius:'2px' }}>
                Submit Answers
              </button>
            )}
            {submitted && (
              <button onClick={()=>{setSelected([]);setSubmitted(false);setScore(0);}}
                style={{ width:'100%', padding:'8px', fontSize:'10px', background:'rgba(100,116,139,0.1)', border:'1px solid #263040', color:'#64748b', cursor:'pointer', borderRadius:'2px' }}>
                Retry Quiz
              </button>
            )}
          </div>
        )}

        {/* CASES */}
        {tab===2 && (
          <div style={{ padding:'10px', display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'8px' }}>
            {CASES.map((c, i) => (
              <div key={i}
                onClick={()=>{toast(`Loading case: ${c.name}`);setStatusMsg(`Case loaded: ${c.name}`);}}
                style={{ cursor:'pointer', border:'1px solid #1e293b', borderRadius:'2px', overflow:'hidden', transition:'border-color 0.15s' }}
                onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor='#22d3ee';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor='#1e293b';}}
              >
                <div style={{ height:'80px', background:c.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px' }}>🧠</div>
                <div style={{ padding:'6px', background:'#0d1626' }}>
                  <div style={{ fontSize:'9px', fontWeight:600, color:'#94a3b8', marginBottom:'2px' }}>{c.name}</div>
                  <div style={{ fontSize:'8px', color:'#22d3ee', fontFamily:'Roboto Mono,monospace' }}>{c.seq}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
