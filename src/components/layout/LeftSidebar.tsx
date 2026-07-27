'use client';
import { useState } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { toast } from '@/lib/toast';
import { formatTime } from '@/lib/scanEngine';

const MOCK_PATIENTS = [{
  id: 'MR-001', name: 'ANONYMOUS', dob: '1975-03-12', sex: 'M', studies: [
    { id: 's1', date: '2024-07-23', desc: 'Brain Protocol — Routine', series: ['Scout 3-plane', 'T1 SAG DF', 'T2 COR', 'T2 TRA 512'] },
    { id: 's2', date: '2024-06-10', desc: 'Brain — Follow-up', series: ['Scout', 'FLAIR TRA', 'T1+Gd TRA', 'T1+Gd SAG'] },
    { id: 's3', date: '2024-01-08', desc: 'Brain — Baseline', series: ['Scout', 'T2 TRA', 'DWI', 'SWI'] },
  ],
}];

const PROTOCOLS = [
  { body: 'Brain', seqs: ['AAHead_Scout', 'T1 SAG', 'T2 COR', 'T2 TRA', 'FLAIR TRA', 'DWI', 'SWI', 'T1+Gd TRA'] },
  { body: 'Spine — Cervical', seqs: ['Scout', 'T2 SAG', 'T1 SAG', 'T2 TRA per disc'] },
  { body: 'Spine — Lumbar', seqs: ['Scout', 'T2 SAG', 'T1 SAG', 'T2 TRA per disc', 'STIR SAG'] },
  { body: 'Knee', seqs: ['Scout', 'PD COR', 'PD SAG', 'PD TRA', 'T1 COR', 'T2 SAG FS'] },
  { body: 'Abdomen', seqs: ['Scout', 'HASTE COR', 'T2 TRA', 'MRCP', 'T1 In/Out phase', 'DWI'] },
];

const PRESETS = [
  'Routine Brain — Standard',
  'Acute Stroke Protocol',
  'Tumor Follow-up',
  'MS Monitoring Protocol',
  'Angiography — MRA TOF',
];

export default function LeftSidebar() {
  const { sequences, selectedSeqId, selectSeq } = useWorkstationStore();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [openStudy, setOpenStudy] = useState<string | null>('s1');
  const [openBody, setOpenBody] = useState<string | null>('Brain');

  const tabs = ['Patient', 'Protocols', 'Queue', 'Presets'];
  const ROW = { display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px', fontSize: '9.5px', cursor: 'pointer', color: '#64748b', borderBottom: '1px solid #0d1520' } as const;
  const SEL = { ...ROW, background: '#0f2d50', color: '#94a3b8', borderLeft: '2px solid #22d3ee' } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#08101c', overflow: 'hidden' }}>
      {/* Tabs */}
      <div className="tab-bar" style={{ flexShrink: 0 }}>
        {tabs.map((t, i) => (
          <button key={t} className={`tab-btn ${i === tab ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {/* Search */}
      <div style={{ padding: '5px 6px', flexShrink: 0, borderBottom: '1px solid #1e293b' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          style={{ width: '100%', fontSize: '10px', padding: '3px 6px', background: '#04060a', border: '1px solid #1e293b', color: '#94a3b8', borderRadius: '2px', outline: 'none' }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* PATIENT TAB */}
        {tab === 0 && (
          <div>
            {MOCK_PATIENTS.map(pt => (
              <div key={pt.id}>
                <div style={{ padding: '6px 8px', background: '#0d1626', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8' }}>{pt.name}</div>
                  <div style={{ fontSize: '8.5px', color: '#475569', fontFamily: 'Roboto Mono, monospace' }}>ID: {pt.id} | {pt.sex} | {pt.dob}</div>
                </div>
                {pt.studies.map(st => (
                  <div key={st.id}>
                    <div
                      onClick={() => setOpenStudy(openStudy === st.id ? null : st.id)}
                      style={{ ...ROW, padding: '4px 8px', fontSize: '9px', background: '#0a1220', color: '#475569', cursor: 'pointer' }}
                    >
                      <span style={{ color: '#334155', fontSize: '8px' }}>{openStudy === st.id ? '▼' : '▶'}</span>
                      <span style={{ fontSize: '8.5px', color: '#64748b' }}>{st.date}</span>
                      <span style={{ color: '#475569', fontSize: '8px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.desc}</span>
                    </div>
                    {openStudy === st.id && st.series.filter(s => !search || s.toLowerCase().includes(search.toLowerCase())).map((ser, si) => (
                      <div
                        key={si}
                        onClick={() => toast(`Loading: ${ser}`)}
                        style={ROW}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0d1a2d'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: ['#22d3ee','#ffe040','#60ffa0','#c084fc'][si % 4], flexShrink: 0 }} />
                        <span style={{ fontSize: '9px', color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ser}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* PROTOCOLS TAB */}
        {tab === 1 && (
          <div>
            {PROTOCOLS.filter(p => !search || p.body.toLowerCase().includes(search.toLowerCase())).map(p => (
              <div key={p.body}>
                <div
                  onClick={() => setOpenBody(openBody === p.body ? null : p.body)}
                  style={{ ...ROW, background: '#0a1220', color: '#64748b', padding: '5px 8px', cursor: 'pointer' }}
                >
                  <span style={{ color: '#334155', fontSize: '8px' }}>{openBody === p.body ? '▼' : '▶'}</span>
                  <span style={{ fontSize: '9.5px', fontWeight: 600, color: '#475569' }}>{p.body}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '8px', color: '#334155' }}>{p.seqs.length}</span>
                </div>
                {openBody === p.body && p.seqs.map((seq, i) => (
                  <div
                    key={i}
                    onClick={() => toast(`Protocol: ${seq}`)}
                    style={ROW}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#0d1a2d'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <span style={{ color: '#22d3ee', fontSize: '8px' }}>▸</span>
                    <span style={{ fontSize: '9px' }}>{seq}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* QUEUE TAB */}
        {tab === 2 && (
          <div>
            {sequences.map(seq => {
              const statusColors: Record<string, string> = { done: '#22c55e', active: '#f59e0b', scanning: '#22d3ee', pending: '#334155' };
              const statusIcons: Record<string, string> = { done: '✓', active: '◉', scanning: '▶', pending: '○' };
              const isSelected = seq.id === selectedSeqId;
              return (
                <div
                  key={seq.id}
                  onClick={() => selectSeq(seq.id)}
                  style={isSelected ? SEL : ROW}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = '#0d1a2d'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ color: statusColors[seq.status], fontSize: '9px', minWidth: '10px' }}>{statusIcons[seq.status]}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '9px', color: seq.status === 'done' ? '#334155' : '#64748b' }}>{seq.name}</span>
                  <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '8px', color: '#334155', flexShrink: 0 }}>{seq.ta}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* PRESETS TAB */}
        {tab === 3 && (
          <div>
            {PRESETS.filter(p => !search || p.toLowerCase().includes(search.toLowerCase())).map((preset, i) => (
              <div key={i} style={{ ...ROW, justifyContent: 'space-between', padding: '5px 8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px' }}>
                  <span style={{ color: '#f59e0b' }}>★</span>
                  <span style={{ color: '#64748b' }}>{preset}</span>
                </span>
                <button
                  onClick={() => toast(`Preset loaded: ${preset}`, 'success')}
                  style={{ fontSize: '8px', background: '#1c2a3e', border: '1px solid #263040', color: '#64748b', padding: '1px 6px', borderRadius: '2px', cursor: 'pointer' }}
                >
                  Load
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
