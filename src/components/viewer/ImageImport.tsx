'use client';
import React, { useState, useRef, useCallback, memo } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { readFileAsDataURL, grayscaleDataURL, ACCEPTED_EXT } from '@/lib/imageLoader';
import { toast } from '@/lib/toast';

type TargetPlane = 'axial' | 'coronal' | 'sagittal' | 'all3';

const DropZone = memo(function DropZone({
  onFiles, label, plane, active,
}: { onFiles: (files: File[], plane: TargetPlane) => void; label: string; plane: TargetPlane; active: boolean }) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setOver(false);
    onFiles(Array.from(e.dataTransfer.files), plane);
  }, [onFiles, plane]);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      style={{
        flex:1, border:`2px dashed ${over ? 'var(--c-cyan)' : active ? '#22c55e44' : 'var(--c-border)'}`,
        background: over ? 'rgba(34,211,238,0.08)' : active ? 'rgba(34,197,94,0.05)' : 'var(--c-bg-card)',
        borderRadius:'2px', padding:'12px 8px', cursor:'pointer', textAlign:'center',
        transition:'all 0.15s', minHeight:'90px', display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center', gap:'4px',
      }}
    >
      <div style={{ fontSize:'16px' }}>
        {active ? '✅' : '📂'}
      </div>
      <div style={{ fontSize:'9px', fontWeight:600, color: active ? 'var(--c-green)' : 'var(--c-text-mid)', letterSpacing:'0.3px' }}>{label}</div>
      <div style={{ fontSize:'8px', color:'var(--c-text-muted)' }}>{active ? 'Image loaded' : 'Click or drop'}</div>
      <input ref={inputRef} type="file" accept={ACCEPTED_EXT} style={{ display:'none' }}
        onChange={e => { if (e.target.files) onFiles(Array.from(e.target.files), plane); e.target.value = ''; }} />
    </div>
  );
});

export default function ImageImport() {
  const { toggleImageImport, setImage, setStatusMsg, images } = useWorkstationStore();
  const [processing, setProcessing] = useState(false);
  const [grayscale, setGrayscale] = useState(true);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback(async (file: File, plane: 'axial' | 'coronal' | 'sagittal') => {
    const store = useWorkstationStore.getState();
    const raw = await readFileAsDataURL(file);
    const final = grayscale ? await grayscaleDataURL(raw) : raw;
    store.setImage(plane, final);
    store.setStatusMsg(`Loaded ${plane}: ${file.name}`);
    toast(`${plane.toUpperCase()} viewport: ${file.name}`, 'success');
  }, [grayscale]);

  const handleFiles = useCallback(async (files: File[], plane: TargetPlane) => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      if (plane === 'all3') {
        const planes: ('axial' | 'coronal' | 'sagittal')[] = ['axial', 'coronal', 'sagittal'];
        await Promise.all(files.slice(0, 3).map((f, i) => processFile(f, planes[i]!)));
      } else {
        await processFile(files[0]!, plane);
      }
    } finally {
      setProcessing(false);
    }
  }, [processFile]);

  const handleGlobalDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    // Single file drop → load into all 3 viewports
    if (files.length === 1) {
      const store = useWorkstationStore.getState();
      const raw = await readFileAsDataURL(files[0]!);
      const final = grayscale ? await grayscaleDataURL(raw) : raw;
      store.setImageAll(final);
      toast('Image loaded into all viewports', 'success');
    } else {
      handleFiles(files, 'all3');
    }
  }, [grayscale, handleFiles]);

  const planes: { key: TargetPlane; label: string; color: string }[] = [
    { key:'coronal',  label:'CORONAL',  color:'var(--c-yellow)' },
    { key:'sagittal', label:'SAGITTAL', color:'#60d0ff' },
    { key:'axial',    label:'AXIAL',    color:'var(--c-green)' },
  ];

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) toggleImageImport(); }}>
      <div className="modal-box" style={{ width:'560px', maxWidth:'95vw' }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleGlobalDrop}
      >
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', padding:'10px 16px', borderBottom:'1px solid var(--c-border-accent)', background:'rgba(14,165,233,0.05)', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:'12px', fontWeight:700, color:'var(--c-text-bright)' }}>📂 Import MRI Images</div>
            <div style={{ fontSize:'8.5px', color:'var(--c-text-subtle)', marginTop:'1px' }}>Load JPG, PNG, BMP, TIFF or DICOM into viewports</div>
          </div>
          {processing && <div style={{ marginLeft:'12px', fontSize:'9px', color:'var(--c-cyan)', animation:'pulseDot 1s infinite' }}>⟳ Processing…</div>}
          <button onClick={toggleImageImport} style={{ marginLeft:'auto', background:'transparent', border:'none', color:'var(--c-text-mid)', fontSize:'18px', cursor:'pointer' }}>✕</button>
        </div>

        <div style={{ padding:'14px 16px', overflowY:'auto' }}>
          {/* Options */}
          <div style={{ display:'flex', gap:'12px', alignItems:'center', marginBottom:'12px', padding:'8px', background:'var(--c-bg-card)', border:'1px solid var(--c-border)', borderRadius:'2px' }}>
            <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'9.5px', color:'var(--c-text-mid)', cursor:'pointer' }}>
              <input type="checkbox" checked={grayscale} onChange={e => setGrayscale(e.target.checked)}
                style={{ accentColor:'var(--c-cyan)', width:'12px', height:'12px', cursor:'pointer' }} />
              Convert to grayscale (MRI simulation)
            </label>
            <span style={{ fontSize:'8px', color:'var(--c-text-muted)' }}>Recommended for color photos</span>
          </div>

          {/* Drop zones per viewport */}
          <div style={{ fontSize:'9px', fontWeight:700, color:'var(--c-text-subtle)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Drop image into specific viewport</div>
          <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
            {planes.map(p => (
              <DropZone key={p.key} plane={p.key} label={p.label} active={!!images[p.key as 'axial'|'coronal'|'sagittal']} onFiles={handleFiles} />
            ))}
          </div>

          {/* Global drop all 3 */}
          <div style={{ fontSize:'9px', fontWeight:700, color:'var(--c-text-subtle)', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Or drop 3 images at once → auto-assigns COR / SAG / TRA</div>
          <div
            onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); e.stopPropagation(); handleFiles(Array.from(e.dataTransfer.files), 'all3'); }}
            style={{
              border:`2px dashed ${dragOver ? 'var(--c-cyan)' : 'var(--c-border)'}`,
              background: dragOver ? 'rgba(34,211,238,0.08)' : 'var(--c-bg-card)',
              borderRadius:'2px', padding:'16px', textAlign:'center', cursor:'pointer',
              transition:'all 0.15s',
            }}
          >
            <div style={{ fontSize:'20px', marginBottom:'4px' }}>🗂</div>
            <div style={{ fontSize:'10px', color:'var(--c-text-subtle)' }}>Drop up to 3 images here for all viewports</div>
            <div style={{ fontSize:'8.5px', color:'var(--c-text-muted)', marginTop:'2px' }}>JPG · PNG · BMP · TIFF · WebP</div>
          </div>

          {/* Load defaults button */}
          <div style={{ marginTop:'12px', display:'flex', gap:'8px' }}>
            <button
            onClick={async () => {
                const store = useWorkstationStore.getState();
                // Load one representative image to all 3 viewports so planning activates
                store.setImage('axial',    '/mri_axial.png');
                store.setImage('coronal',  '/mri_coronal.jpg');
                store.setImage('sagittal', '/mri_sagittal.jpg');
                store.setStatusMsg('Default brain MRI images loaded — Planning active');
                toast('Default brain MRI images loaded ✓', 'success');
                store.toggleImageImport();
              }}
              style={{ flex:1, fontSize:'9.5px', padding:'7px', background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.3)', color:'var(--c-cyan)', cursor:'pointer', borderRadius:'2px', fontWeight:600 }}
            >
              ⚡ Load Default Brain MRI Images
            </button>
            <button onClick={toggleImageImport}
              style={{ fontSize:'9.5px', padding:'7px 16px', background:'transparent', border:'1px solid var(--c-border-bright)', color:'var(--c-text-mid)', cursor:'pointer', borderRadius:'2px' }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
