'use client';
import React, { useState, useCallback, useMemo, memo } from 'react';
import { useWorkstationStore } from '@/store/workstationStore';
import { toast } from '@/lib/toast';

// ─── Protocol tree data ────────────────────────────────────────────────────
const PROTOCOL_TREE = [
  {
    region: 'Brain', icon: '🧠',
    protocols: [
      { name:'Brain Routine',    seqs:['Scout','T1 SAG','T2 TRA','FLAIR TRA','DWI'],       ta:'22:00' },
      { name:'Brain T1',         seqs:['Scout','T1 TSE SAG','T1 TSE TRA'],                  ta:'08:00' },
      { name:'Brain T2',         seqs:['Scout','T2 TSE TRA 512','T2 TSE COR'],              ta:'12:00' },
      { name:'Brain FLAIR',      seqs:['T2 FLAIR TRA','T2 FLAIR SAG'],                      ta:'12:00' },
      { name:'Brain DWI',        seqs:['DWI TRA b0/b1000','ADC Map','FLAIR TRA'],           ta:'10:00' },
      { name:'Brain SWI',        seqs:['SWI TRA','T2* GRE TRA'],                            ta:'08:00' },
      { name:'Brain MRA TOF',    seqs:['MRA TOF 3D SAG','MIP Recon'],                       ta:'06:00' },
      { name:'Brain MRV',        seqs:['MRV SAG','MRV TRA'],                                ta:'07:00' },
      { name:'Brain Tumor',      seqs:['T1 SAG','T2 TRA','FLAIR TRA','DWI','T1+Gd TRA/COR/SAG'], ta:'35:00' },
      { name:'Brain MS Protocol',seqs:['T2 FLAIR TRA 3D','T2 SAG','T1+Gd TRA'],            ta:'28:00' },
      { name:'Pituitary',        seqs:['T1 SAG 2mm','T1 COR 2mm','T1+Gd Dyn COR','T2 COR'],ta:'25:00' },
      { name:'Stroke Protocol',  seqs:['DWI b1000','ADC','FLAIR TRA','GRE/SWI','MRA TOF'],  ta:'18:00' },
      { name:'Post-Contrast',    seqs:['T1+Gd TRA','T1+Gd SAG','T1+Gd COR'],               ta:'12:00' },
      { name:'MPRAGE 3D',        seqs:['T1 MPRAGE SAG 1mm ISO'],                            ta:'08:00' },
    ],
  },
  {
    region: 'Spine', icon: '🦴',
    protocols: [
      { name:'C-Spine Routine',  seqs:['Scout','T2 SAG','T1 SAG','T2 TRA per level','STIR SAG'], ta:'28:00' },
      { name:'T-Spine Routine',  seqs:['Scout','T2 SAG','T1 SAG','T2 TRA','STIR'],         ta:'30:00' },
      { name:'L-Spine Routine',  seqs:['Scout','T2 SAG','T1 SAG','T2 TRA per disc','STIR SAG'], ta:'28:00' },
      { name:'Whole Spine',      seqs:['Scout','T2 SAG Cx','T2 SAG Tx','T2 SAG Lx','T1 SAG'], ta:'50:00' },
      { name:'Spine Post-Gd',    seqs:['T1+Gd SAG','T1+Gd TRA'],                           ta:'15:00' },
      { name:'Cord Compression', seqs:['T2 SAG STIR','T1 SAG','T2 TRA'],                   ta:'25:00' },
    ],
  },
  {
    region: 'Abdomen', icon: '🫁',
    protocols: [
      { name:'MRCP',             seqs:['T2 HASTE COR','MRCP 3D','T2 TRA','T1 VIBE'],       ta:'20:00' },
      { name:'Liver',            seqs:['T2 TRA','DWI','T1 VIBE pre/post-Gd dynamic'],      ta:'25:00' },
      { name:'Pancreas',         seqs:['T2 TRA','T1 VIBE','MRCP','DWI'],                   ta:'22:00' },
      { name:'Kidney / Adrenal', seqs:['T2 TRA','DWI','T1 VIBE','Chemical Shift'],         ta:'20:00' },
    ],
  },
  {
    region: 'Pelvis', icon: '🩻',
    protocols: [
      { name:'Pelvis Routine',   seqs:['T2 SAG','T2 COR','T2 TRA','T1 TRA','DWI'],         ta:'25:00' },
      { name:'Prostate',         seqs:['T2 TRA 3mm','DWI','DCE T1+Gd','MRSI'],             ta:'40:00' },
      { name:'Female Pelvis',    seqs:['T2 SAG','T2 TRA','T2 COR','T1+Gd'],               ta:'28:00' },
    ],
  },
  {
    region: 'Musculoskeletal', icon: '💪',
    protocols: [
      { name:'Shoulder',         seqs:['PD COR','PD SAG','T2 TRA','PD+FS COR'],            ta:'22:00' },
      { name:'Knee',             seqs:['PD SAG','T2 COR','PD TRA','PD+FS SAG'],            ta:'20:00' },
      { name:'Hip',              seqs:['T1 COR','PD+FS COR','T2 SAG','T2 TRA'],            ta:'22:00' },
      { name:'Wrist / Hand',     seqs:['PD COR','T1 COR','T2 SAG','PD+FS COR'],            ta:'18:00' },
      { name:'Ankle / Foot',     seqs:['PD COR','T2 SAG','T1 TRA','STIR COR'],             ta:'20:00' },
    ],
  },
  {
    region: 'Neck', icon: '🔵',
    protocols: [
      { name:'Neck Soft Tissue', seqs:['T2 COR','T1 TRA','STIR COR','T1+Gd TRA'],         ta:'25:00' },
      { name:'Orbit',            seqs:['T2 PROPELLER','T1 COR','T2 SAG','T1+Gd Fat Sat'],  ta:'22:00' },
    ],
  },
  {
    region: 'Cardiac', icon: '❤️',
    protocols: [
      { name:'Cardiac Function', seqs:['CINE SAX','CINE LAX 2CH','CINE 4CH','LGE'],        ta:'45:00' },
      { name:'Cardiac Viability',seqs:['CINE','T2 STIR','Early Gd','Late Gd 10-15min'],    ta:'55:00' },
    ],
  },
];

// ─── Protocol item ─────────────────────────────────────────────────────────
const ProtocolItem = memo(function ProtocolItem({
  proto, onLoad, onFavorite, isFavorite,
}: {
  proto: typeof PROTOCOL_TREE[0]['protocols'][0];
  onLoad: (name: string, seqs: string[], ta: string) => void;
  onFavorite: (name: string) => void;
  isFavorite: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div
        style={{
          display:'flex', alignItems:'center', gap:'4px', padding:'3px 8px 3px 20px',
          cursor:'pointer', borderBottom:'1px solid #080d18',
          transition:'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#0d1a2d'}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}
        onClick={() => setExpanded(v => !v)}
        onDoubleClick={() => onLoad(proto.name, proto.seqs, proto.ta)}
      >
        <span style={{ color:'#334155', fontSize:'8px', width:'8px', flexShrink:0 }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ flex:1, fontSize:'9.5px', color:'#64748b', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{proto.name}</span>
        <span style={{ fontFamily:'Roboto Mono,monospace', fontSize:'8px', color:'#334155', flexShrink:0 }}>{proto.ta}</span>
        <button
          onClick={e => { e.stopPropagation(); onFavorite(proto.name); }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          style={{ background:'transparent', border:'none', cursor:'pointer', fontSize:'10px', color: isFavorite ? '#f59e0b' : '#1e293b', padding:'0 2px', flexShrink:0, transition:'color 0.1s' }}
          onMouseEnter={e => (e.target as HTMLElement).style.color='#f59e0b'}
          onMouseLeave={e => (e.target as HTMLElement).style.color=isFavorite?'#f59e0b':'#1e293b'}
        >★</button>
        <button
          onClick={e => { e.stopPropagation(); onLoad(proto.name, proto.seqs, proto.ta); }}
          style={{ background:'rgba(34,211,238,0.1)', border:'1px solid rgba(34,211,238,0.2)', borderRadius:'2px', cursor:'pointer', fontSize:'7.5px', color:'#22d3ee', padding:'1px 5px', flexShrink:0, marginLeft:'2px' }}
        >Load</button>
      </div>
      {expanded && (
        <div style={{ paddingLeft:'30px', background:'rgba(0,0,0,0.15)', borderBottom:'1px solid #0d1520' }}>
          {proto.seqs.map((seq, i) => (
            <div key={i} style={{ fontSize:'8.5px', color:'#334155', padding:'2px 0', borderBottom:'1px solid #080e1a', display:'flex', alignItems:'center', gap:'4px' }}>
              <span style={{ color:'#1e3a5f', fontFamily:'Roboto Mono,monospace', fontSize:'7.5px', minWidth:'12px' }}>{i+1}</span>
              <span style={{ color:'#475569' }}>{seq}</span>
            </div>
          ))}
          <div style={{ padding:'4px 0', display:'flex', justifyContent:'flex-end' }}>
            <button onClick={() => onLoad(proto.name, proto.seqs, proto.ta)}
              style={{ fontSize:'8px', padding:'2px 10px', background:'rgba(34,211,238,0.12)', border:'1px solid rgba(34,211,238,0.3)', color:'#22d3ee', cursor:'pointer', borderRadius:'2px' }}>
              Load Protocol ▶
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Region accordion ─────────────────────────────────────────────────────
const RegionSection = memo(function RegionSection({
  region, icon, protocols, favorites, onLoad, onFavorite, searchTerm,
}: {
  region: string; icon: string;
  protocols: typeof PROTOCOL_TREE[0]['protocols'];
  favorites: Set<string>;
  onLoad: (name: string, seqs: string[], ta: string) => void;
  onFavorite: (name: string) => void;
  searchTerm: string;
}) {
  const [open, setOpen] = useState(region === 'Brain');

  const filtered = useMemo(() =>
    searchTerm
      ? protocols.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : protocols,
    [protocols, searchTerm]
  );

  if (searchTerm && filtered.length === 0) return null;

  return (
    <div style={{ borderBottom:'1px solid #0d1520' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width:'100%', display:'flex', alignItems:'center', gap:'6px',
          padding:'5px 8px', background: open ? 'rgba(34,211,238,0.05)' : 'transparent',
          border:'none', cursor:'pointer', borderBottom: open ? '1px solid #1e293b' : 'none',
          transition:'background 0.1s',
        }}
      >
        <span style={{ fontSize:'11px' }}>{icon}</span>
        <span style={{ fontSize:'9.5px', fontWeight:600, color: open ? '#94a3b8' : '#475569', flex:1, textAlign:'left' }}>{region}</span>
        <span style={{ fontSize:'8px', color:'#334155' }}>{filtered.length}</span>
        <span style={{ color:'#334155', fontSize:'10px' }}>{open ? '▾' : '▸'}</span>
      </button>

      {(open || searchTerm) && filtered.map(proto => (
        <ProtocolItem
          key={proto.name} proto={proto}
          onLoad={onLoad}
          onFavorite={onFavorite}
          isFavorite={favorites.has(proto.name)}
        />
      ))}
    </div>
  );
});

// ─── Main Protocol Library ─────────────────────────────────────────────────
export default function ProtocolLibrary() {
  const { setStatusMsg } = useWorkstationStore();
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set(['Brain Routine','Stroke Protocol']));
  const [showFavs, setShowFavs] = useState(false);
  const [recentLoaded, setRecentLoaded] = useState<string[]>([]);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const handleLoad = useCallback((name: string, seqs: string[], ta: string) => {
    setStatusMsg(`Protocol loaded: ${name} (${seqs.length} seq, TA ${ta})`);
    toast(`Protocol loaded: ${name}`, 'success');
    setRecentLoaded(prev => [name, ...prev.filter(n => n !== name)].slice(0, 5));
  }, [setStatusMsg]);

  const handleFavorite = useCallback((name: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); toast(`Removed from favorites`); }
      else { next.add(name); toast(`Added to favorites ★`, 'success'); }
      return next;
    });
  }, []);

  const allFavProtos = useMemo(() =>
    PROTOCOL_TREE.flatMap(r => r.protocols).filter(p => favorites.has(p.name)),
    [favorites]
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Search */}
      <div style={{ padding:'6px', borderBottom:'1px solid #1e293b', flexShrink:0 }}>
        <div style={{ position:'relative' }}>
          <span style={{ position:'absolute', left:'8px', top:'50%', transform:'translateY(-50%)', fontSize:'10px', color:'#334155', pointerEvents:'none' }}>🔍</span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search protocols…"
            style={{ width:'100%', background:'#060b14', border:'1px solid #263040', color:'#94a3b8', fontFamily:'Roboto Mono,monospace', fontSize:'9.5px', padding:'4px 8px 4px 24px', borderRadius:'2px', outline:'none' }}
            onFocus={e => (e.target.style.borderColor='#22d3ee')}
            onBlur={e => (e.target.style.borderColor='#263040')}
          />
          {search && <button onClick={() => setSearch('')} style={{ position:'absolute', right:'6px', top:'50%', transform:'translateY(-50%)', background:'transparent', border:'none', color:'#334155', cursor:'pointer', fontSize:'12px' }}>✕</button>}
        </div>
      </div>

      {/* Tabs: All / Favorites / Recent */}
      <div style={{ display:'flex', borderBottom:'1px solid #1e293b', flexShrink:0 }}>
        {[
          { label:'All',       active: !showFavs, fn: () => setShowFavs(false) },
          { label:`★ Favorites (${favorites.size})`, active: showFavs, fn: () => setShowFavs(true) },
        ].map(t => (
          <button key={t.label} onClick={t.fn} style={{
            flex:1, padding:'4px 0', fontSize:'8.5px', background: t.active ? 'rgba(34,211,238,0.08)' : 'transparent',
            border:'none', borderBottom: t.active ? '2px solid #22d3ee' : '2px solid transparent',
            color: t.active ? '#22d3ee' : '#475569', cursor:'pointer', transition:'all 0.1s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Tree */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {/* Recent */}
        {!showFavs && !search && recentLoaded.length > 0 && (
          <div style={{ borderBottom:'1px solid #0d1520' }}>
            <div style={{ padding:'4px 8px', fontSize:'7.5px', fontWeight:700, color:'#334155', textTransform:'uppercase', letterSpacing:'0.5px', background:'#08101c' }}>Recent</div>
            {recentLoaded.map(name => {
              const proto = PROTOCOL_TREE.flatMap(r => r.protocols).find(p => p.name === name);
              if (!proto) return null;
              return (
                <div key={name} style={{ display:'flex', alignItems:'center', padding:'3px 8px', gap:'6px', borderBottom:'1px solid #080d18', cursor:'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='#0d1a2d'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='transparent'}
                  onDoubleClick={() => handleLoad(proto.name, proto.seqs, proto.ta)}
                >
                  <span style={{ fontSize:'8px', color:'#22d3ee' }}>↩</span>
                  <span style={{ fontSize:'9px', color:'#475569', flex:1 }}>{name}</span>
                  <button onClick={() => handleLoad(proto.name, proto.seqs, proto.ta)}
                    style={{ fontSize:'7.5px', padding:'1px 6px', background:'rgba(34,211,238,0.08)', border:'1px solid rgba(34,211,238,0.2)', color:'#22d3ee', cursor:'pointer', borderRadius:'2px' }}>
                    Load
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {showFavs ? (
          allFavProtos.length === 0
            ? <div style={{ padding:'16px', textAlign:'center', color:'#334155', fontSize:'9.5px' }}>No favorites yet<br/><span style={{ fontSize:'8.5px', color:'#1e293b' }}>Click ★ next to a protocol to add it</span></div>
            : allFavProtos.map(proto => (
                <ProtocolItem key={proto.name} proto={proto} onLoad={handleLoad} onFavorite={handleFavorite} isFavorite />
              ))
        ) : (
          PROTOCOL_TREE.map(region => (
            <RegionSection
              key={region.region}
              region={region.region}
              icon={region.icon}
              protocols={region.protocols}
              favorites={favorites}
              onLoad={handleLoad}
              onFavorite={handleFavorite}
              searchTerm={search}
            />
          ))
        )}
      </div>
    </div>
  );
}
