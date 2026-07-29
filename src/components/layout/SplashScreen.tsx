'use client';
import { useState, useEffect } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);
  
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#04060a',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <img 
        src="/logo-full.png" 
        alt="MRI Pro Workstation" 
        style={{
          width: '400px',
          maxWidth: '80vw',
          height: 'auto',
          objectFit: 'contain',
          marginBottom: '40px'
        }} 
      />
      
      <button 
        onClick={() => setVisible(false)}
        style={{
          background: 'rgba(34,211,238,0.1)',
          border: '1px solid rgba(34,211,238,0.3)',
          color: '#22d3ee',
          padding: '12px 32px',
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '1px',
          cursor: 'pointer',
          borderRadius: '2px',
          transition: 'all 0.2s',
          fontFamily: 'Inter, sans-serif'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(34,211,238,0.2)';
          e.currentTarget.style.boxShadow = '0 0 12px rgba(34,211,238,0.2)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(34,211,238,0.1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        START WORKSTATION
      </button>
    </div>
  );
}
