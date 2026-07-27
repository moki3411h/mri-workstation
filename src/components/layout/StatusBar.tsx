'use client';
import { useEffect, useState } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';

export default function StatusBar() {
  const { statusMsg } = useWorkstationStore();
  const [time, setTime] = useState('');

  useEffect(() => {
    const tick = () => setTime(new Date().toTimeString().slice(0, 8));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const segments = [
    'WS: MRI-PRO-001',
    'syngo MR v2.0',
    'DICOM 3.0',
    '1.5T | 33 mT/m | 200 T/m/s',
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: '20px', width: '100%',
      background: '#060a14', borderTop: '1px solid #1e293b',
      padding: '0 8px', gap: 0, fontSize: '8.5px',
    }}>
      {/* Status message */}
      <div style={{ flex: 1, color: '#64748b', fontFamily: 'Roboto Mono, monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {statusMsg}
      </div>

      {/* Segments */}
      {segments.map((seg, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '1px', height: '12px', background: '#1e293b' }} />
          <span style={{ padding: '0 8px', color: '#334155', fontFamily: 'Roboto Mono, monospace' }}>{seg}</span>
        </div>
      ))}

      <div style={{ width: '1px', height: '12px', background: '#1e293b' }} />
      <div style={{
        padding: '0 8px', fontFamily: 'Roboto Mono, monospace', color: '#22d3ee', letterSpacing: '1px',
      }}>
        {time}
      </div>
    </div>
  );
}
