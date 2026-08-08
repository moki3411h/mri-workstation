'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useWorkstationStore } from '@/store/workstationStore';
import { toast } from '@/lib/toast';
import { findProtocol } from '@/lib/protocolCatalog';

const ProtocolLibrary = dynamic(() => import('@/components/protocols/ProtocolLibrary'), { ssr: false });

const MOCK_PATIENTS = [{
  id: 'MR-001', name: 'ANONYMOUS', dob: '1975-03-12', sex: 'M', studies: [
    { id: 's1', date: '2024-07-23', desc: 'Brain Protocol — Routine', series: ['Scout 3-plane', 'T1 SAG DF', 'T2 COR', 'T2 TRA 512'] },
    { id: 's2', date: '2024-06-10', desc: 'Brain — Follow-up', series: ['Scout', 'FLAIR TRA', 'T1+Gd TRA', 'T1+Gd SAG'] },
    { id: 's3', date: '2024-01-08', desc: 'Brain — Baseline', series: ['Scout', 'T2 TRA', 'DWI', 'SWI'] },
  ],
}];

const PRESETS = [
  { label: 'Routine Brain — Standard', id: 'neuro-head-routine-brain' },
  { label: 'Acute Stroke', id: 'neuro-head-acute-stroke' },
  { label: 'Primary Brain Tumor', id: 'neuro-head-primary-brain-tumor' },
  { label: 'Demyelinating Disease', id: 'neuro-head-demyelinating-disease' },
  { label: 'Intracranial Arterial Survey', id: 'neuro-head-intracranial-arterial-survey' },
];

export default function LeftSidebar() {
  const { sequences, selectedSeqId, selectSeq, loadProtocol } = useWorkstationStore();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');
  const [openStudy, setOpenStudy] = useState<string | null>('s1');

  const tabs = ['Patient', 'Protocols', 'Queue', 'Presets'];
  const ROW = { display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px', fontSize: '9.5px', cursor: 'pointer', color: 'var(--c-text-mid)', borderBottom: '1px solid var(--c-border-faint)' } as const;
  const SEL = { ...ROW, background: 'var(--c-bg-selected)', color: 'var(--c-text-base)', borderLeft: '2px solid var(--c-cyan)' } as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--c-bg-dark)', overflow: 'hidden' }}>
      {/* Tabs */}
      <div className="tab-bar" style={{ flexShrink: 0 }}>
        {tabs.map((t, i) => (
          <button key={t} className={`tab-btn ${i === tab ? 'active' : ''}`} onClick={() => setTab(i)}>{t}</button>
        ))}
      </div>

      {/* Search */}
      {tab !== 1 && <div style={{ padding: '5px 6px', flexShrink: 0, borderBottom: '1px solid var(--c-border)' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          style={{ width: '100%', fontSize: '10px', padding: '3px 6px', background: 'var(--c-bg-deepest)', border: '1px solid var(--c-border)', color: 'var(--c-text-base)', borderRadius: '2px', outline: 'none' }}
        />
      </div>}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* PATIENT TAB */}
        {tab === 0 && (
          <div>
            {MOCK_PATIENTS.map(pt => (
              <div key={pt.id}>
                <div style={{ padding: '6px 8px', background: 'var(--c-bg-card)', borderBottom: '1px solid var(--c-border)' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--c-text-base)' }}>{pt.name}</div>
                  <div style={{ fontSize: '8.5px', color: 'var(--c-text-subtle)', fontFamily: 'Roboto Mono, monospace' }}>ID: {pt.id} | {pt.sex} | {pt.dob}</div>
                </div>
                {pt.studies.map(st => (
                  <div key={st.id}>
                    <div
                      onClick={() => setOpenStudy(openStudy === st.id ? null : st.id)}
                      style={{ ...ROW, padding: '4px 8px', fontSize: '9px', background: 'var(--c-bg-panel)', color: 'var(--c-text-subtle)', cursor: 'pointer' }}
                    >
                      <span style={{ color: 'var(--c-text-muted)', fontSize: '8px' }}>{openStudy === st.id ? '▼' : '▶'}</span>
                      <span style={{ fontSize: '8.5px', color: 'var(--c-text-mid)' }}>{st.date}</span>
                      <span style={{ color: 'var(--c-text-subtle)', fontSize: '8px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{st.desc}</span>
                    </div>
                    {openStudy === st.id && st.series.filter(s => !search || s.toLowerCase().includes(search.toLowerCase())).map((ser, si) => (
                      <div
                        key={si}
                        onClick={() => toast(`Loading: ${ser}`)}
                        style={ROW}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--c-bg-hover)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: ['var(--c-cyan)','var(--c-yellow)','#60ffa0','#c084fc'][si % 4], flexShrink: 0 }} />
                        <span style={{ fontSize: '9px', color: 'var(--c-text-mid)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ser}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* PROTOCOLS TAB — Full Library */}
        {tab === 1 && (
          <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <ProtocolLibrary />
          </div>
        )}

        {/* QUEUE TAB */}
        {tab === 2 && (
          <div>
            {sequences.map(seq => {
              const statusColors: Record<string, string> = { done: 'var(--c-green)', active: 'var(--c-amber)', scanning: 'var(--c-cyan)', pending: 'var(--c-text-muted)' };
              const statusIcons: Record<string, string> = { done: '✓', active: '◉', scanning: '▶', pending: '○' };
              const isSelected = seq.id === selectedSeqId;
              return (
                <div
                  key={seq.id}
                  onClick={() => selectSeq(seq.id)}
                  style={isSelected ? SEL : ROW}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--c-bg-hover)'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <span style={{ color: statusColors[seq.status], fontSize: '9px', minWidth: '10px' }}>{statusIcons[seq.status]}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '9px', color: seq.status === 'done' ? 'var(--c-text-muted)' : 'var(--c-text-mid)' }}>{seq.name}</span>
                  <span style={{ fontFamily: 'Roboto Mono, monospace', fontSize: '8px', color: 'var(--c-text-muted)', flexShrink: 0 }}>{seq.ta}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* PRESETS TAB */}
        {tab === 3 && (
          <div>
            {PRESETS.filter(p => !search || p.label.toLowerCase().includes(search.toLowerCase())).map((preset) => (
              <div key={preset.id} style={{ ...ROW, justifyContent: 'space-between', padding: '5px 8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px' }}>
                  <span style={{ color: 'var(--c-amber)' }}>★</span>
                  <span style={{ color: 'var(--c-text-mid)' }}>{preset.label}</span>
                </span>
                <button
                  onClick={() => {
                    const protocol = findProtocol(preset.id);
                    if (!protocol) return;
                    loadProtocol(protocol);
                    toast(`Preset loaded: ${protocol.name}`, 'success');
                  }}
                  style={{ fontSize: '8px', background: 'var(--c-bg-elevated)', border: '1px solid var(--c-border-bright)', color: 'var(--c-text-mid)', padding: '1px 6px', borderRadius: '2px', cursor: 'pointer' }}
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
