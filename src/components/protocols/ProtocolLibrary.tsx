'use client';

import { useMemo, useState } from 'react';
import {
  PROTOCOL_CATEGORIES,
  PROTOCOL_CATEGORY_COUNT,
  PROTOCOL_COUNT,
  protocolMatches,
  type ProtocolPreset,
} from '@/lib/protocolCatalog';
import { toast } from '@/lib/toast';
import { useWorkstationStore } from '@/store/workstationStore';

function ProtocolRow({
  protocol,
  expanded,
  favorite,
  onExpand,
  onFavorite,
  onLoad,
}: {
  protocol: ProtocolPreset;
  expanded: boolean;
  favorite: boolean;
  onExpand: () => void;
  onFavorite: () => void;
  onLoad: () => void;
}) {
  return (
    <div style={{ borderBottom: '1px solid var(--c-border-faint)' }}>
      <div
        role="button"
        tabIndex={0}
        onClick={onExpand}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onExpand(); }}
        style={{
          display: 'grid', gridTemplateColumns: '10px minmax(0,1fr) auto auto', alignItems: 'center', gap: '5px',
          padding: '5px 7px 5px 17px', cursor: 'pointer', background: expanded ? 'var(--c-bg-hover)' : 'transparent',
        }}
      >
        <span style={{ color: 'var(--c-text-muted)', fontSize: '7px' }}>{expanded ? '▼' : '▶'}</span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: '9px', color: 'var(--c-text-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{protocol.name}</span>
          <span style={{ display: 'block', marginTop: '1px', fontSize: '7px', color: 'var(--c-text-muted)' }}>{protocol.group} · {protocol.sequences.length} seq · {protocol.estimatedTime}</span>
        </span>
        <button
          type="button"
          title={favorite ? 'Remove favorite' : 'Add favorite'}
          onClick={event => { event.stopPropagation(); onFavorite(); }}
          style={{ padding: '1px 3px', background: 'transparent', border: 0, color: favorite ? 'var(--c-amber)' : 'var(--c-text-muted)', cursor: 'pointer', fontSize: '10px' }}
        >★</button>
        <button
          type="button"
          onClick={event => { event.stopPropagation(); onLoad(); }}
          style={{ padding: '2px 6px', borderRadius: '2px', border: '1px solid var(--c-border-accent)', background: 'var(--c-bg-elevated)', color: 'var(--c-cyan)', cursor: 'pointer', fontSize: '7.5px', fontWeight: 700 }}
        >LOAD</button>
      </div>

      {expanded && (
        <div style={{ padding: '5px 8px 7px 29px', background: 'var(--c-bg-deepest)' }}>
          <div style={{ marginBottom: '5px', fontSize: '7.5px', lineHeight: 1.45, color: 'var(--c-text-subtle)' }}>{protocol.description}</div>
          {protocol.sequences.map((sequence, index) => (
            <div key={`${protocol.id}-${sequence.name}`} style={{ display: 'grid', gridTemplateColumns: '15px minmax(0,1fr) auto', gap: '4px', padding: '2px 0', fontSize: '7.5px' }}>
              <span style={{ color: 'var(--c-cyan)', fontFamily: 'Roboto Mono,monospace' }}>{String(index + 1).padStart(2, '0')}</span>
              <span style={{ color: 'var(--c-text-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sequence.name}</span>
              <span style={{ color: 'var(--c-text-muted)', fontFamily: 'Roboto Mono,monospace' }}>{sequence.ta}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
            {[protocol.population, protocol.contrast].map(label => (
              <span key={label} style={{ padding: '1px 4px', border: '1px solid var(--c-border)', color: 'var(--c-text-muted)', fontSize: '6.5px', borderRadius: '2px' }}>{label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProtocolLibrary() {
  const loadProtocol = useWorkstationStore(state => state.loadProtocol);
  const [search, setSearch] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set([
    'neuro-head-routine-brain',
    'neuro-head-acute-stroke',
    'spine-lumbar-routine',
  ]));
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set(['neuro-head']));
  const [expandedProtocol, setExpandedProtocol] = useState<string | null>(null);

  const visibleCategories = useMemo(() => {
    return PROTOCOL_CATEGORIES.map(category => ({
      ...category,
      protocols: category.protocols.filter(protocol => {
        if (showFavorites && !favorites.has(protocol.id)) return false;
        return protocolMatches(protocol, search);
      }),
    })).filter(category => category.protocols.length > 0);
  }, [favorites, search, showFavorites]);

  const resultCount = visibleCategories.reduce((sum, category) => sum + category.protocols.length, 0);

  function handleLoad(protocol: ProtocolPreset) {
    loadProtocol(protocol);
    toast(`${protocol.name} loaded · ${protocol.sequences.length} sequences`, 'success');
  }

  function toggleCategory(categoryId: string) {
    setOpenCategories(current => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  function toggleFavorite(protocolId: string) {
    setFavorites(current => {
      const next = new Set(current);
      if (next.has(protocolId)) next.delete(protocolId);
      else next.add(protocolId);
      return next;
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '7px', borderBottom: '1px solid var(--c-border)', background: 'var(--c-bg-panel)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '6px', marginBottom: '5px' }}>
          <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.7px', color: 'var(--c-text-bright)' }}>MRI PRO CLINICAL LIBRARY</span>
          <span style={{ fontSize: '7px', color: 'var(--c-cyan)', fontFamily: 'Roboto Mono,monospace' }}>{PROTOCOL_COUNT} EXAMS</span>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search anatomy, indication, or sequence…"
            aria-label="Search MRI protocols"
            style={{ width: '100%', padding: '5px 22px 5px 7px', background: 'var(--c-bg-input)', border: '1px solid var(--c-border-bright)', borderRadius: '2px', outline: 'none', color: 'var(--c-text-base)', fontSize: '8.5px' }}
          />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear protocol search" style={{ position: 'absolute', right: '5px', top: '4px', background: 'transparent', border: 0, color: 'var(--c-text-muted)', cursor: 'pointer' }}>×</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--c-border)', flexShrink: 0 }}>
        <button type="button" onClick={() => setShowFavorites(false)} style={{ padding: '4px', border: 0, borderBottom: !showFavorites ? '2px solid var(--c-cyan)' : '2px solid transparent', background: !showFavorites ? 'var(--c-bg-elevated)' : 'transparent', color: !showFavorites ? 'var(--c-cyan)' : 'var(--c-text-muted)', fontSize: '7.5px', cursor: 'pointer' }}>ALL {PROTOCOL_COUNT}</button>
        <button type="button" onClick={() => setShowFavorites(true)} style={{ padding: '4px', border: 0, borderBottom: showFavorites ? '2px solid var(--c-amber)' : '2px solid transparent', background: showFavorites ? 'var(--c-bg-elevated)' : 'transparent', color: showFavorites ? 'var(--c-amber)' : 'var(--c-text-muted)', fontSize: '7.5px', cursor: 'pointer' }}>★ FAVORITES {favorites.size}</button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ padding: '4px 7px', background: 'var(--c-bg-deepest)', borderBottom: '1px solid var(--c-border-faint)', fontSize: '6.8px', color: 'var(--c-text-muted)' }}>
          {search ? `${resultCount} matches` : `${PROTOCOL_CATEGORY_COUNT} categories`} · independent educational presets
        </div>
        {visibleCategories.map(category => {
          const isOpen = search.length > 0 || showFavorites || openCategories.has(category.id);
          return (
            <section key={category.id}>
              <button
                type="button"
                onClick={() => toggleCategory(category.id)}
                style={{ width: '100%', display: 'grid', gridTemplateColumns: '15px minmax(0,1fr) auto 10px', alignItems: 'center', gap: '4px', padding: '6px 7px', border: 0, borderBottom: '1px solid var(--c-border-faint)', background: isOpen ? 'var(--c-bg-card)' : 'var(--c-bg-panel)', color: 'var(--c-text-base)', cursor: 'pointer', textAlign: 'left' }}
              >
                <span style={{ color: 'var(--c-cyan)', fontSize: '10px', textAlign: 'center' }}>{category.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '8.5px', fontWeight: 700 }}>{category.name}</span>
                  <span style={{ display: 'block', fontSize: '6.5px', color: 'var(--c-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{category.description}</span>
                </span>
                <span style={{ color: 'var(--c-text-muted)', fontSize: '7px', fontFamily: 'Roboto Mono,monospace' }}>{category.protocols.length}</span>
                <span style={{ color: 'var(--c-text-muted)', fontSize: '7px' }}>{isOpen ? '▼' : '▶'}</span>
              </button>
              {isOpen && category.protocols.map(protocol => (
                <ProtocolRow
                  key={protocol.id}
                  protocol={protocol}
                  expanded={expandedProtocol === protocol.id}
                  favorite={favorites.has(protocol.id)}
                  onExpand={() => setExpandedProtocol(current => current === protocol.id ? null : protocol.id)}
                  onFavorite={() => toggleFavorite(protocol.id)}
                  onLoad={() => handleLoad(protocol)}
                />
              ))}
            </section>
          );
        })}
        {resultCount === 0 && (
          <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--c-text-muted)', fontSize: '8.5px' }}>
            No matching MRI Pro protocols.
          </div>
        )}
      </div>

      <div style={{ padding: '5px 7px', borderTop: '1px solid var(--c-border)', background: 'var(--c-bg-deepest)', color: 'var(--c-text-muted)', fontSize: '6.3px', lineHeight: 1.35, flexShrink: 0 }}>
        EDUCATION / SIMULATION ONLY · Review safety, contrast, anatomy coverage, and local policy before any clinical use.
      </div>
    </div>
  );
}
