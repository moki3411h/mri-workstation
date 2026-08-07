"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { useWorkstationStore } from "@/store/workstationStore";
import { toast } from "@/lib/toast";
import {
  exportExam,
  downloadJSON,
  readJSONFile,
  validateSnapshot,
  saveExamToCloud,
  listCloudExams,
  loadExamFromCloud,
  type CloudExamMeta,
} from "@/lib/examPersistence";

const PROTOCOL_TREE = [
  {
    category: 'Brain',
    items: ['Routine Brain', 'Acute Stroke', 'Tumor Follow-up', 'MS Monitoring', 'Angiography']
  },
  {
    category: 'Spine',
    items: ['Cervical Routine', 'Thoracic Routine', 'Lumbar Routine', 'Whole Spine']
  },
  {
    category: 'Knee',
    items: ['Routine Knee', 'Meniscus Tear', 'Ligament Injury', 'Cartilage Assessment']
  },
  {
    category: 'Shoulder',
    items: ['Routine Shoulder', 'Rotator Cuff', 'Instability', 'MR Arthrogram']
  },
  {
    category: 'Abdomen',
    items: ['Routine Abdomen', 'Liver Lesion', 'MRCP', 'Kidneys']
  },
  {
    category: 'Pelvis',
    items: ['Routine Pelvis', 'Prostate', 'Rectum', 'Female Pelvis']
  }
];

function ProtocolSelectorPopup({ onClose, onSelect }: { onClose: () => void, onSelect: (val: string) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['Brain']));
  const [focusedIndex, setFocusedIndex] = useState(0);

  const visibleItems = useMemo(() => {
    const arr: { type: 'cat' | 'item'; id: string; label: string; cat?: string }[] = [];
    PROTOCOL_TREE.forEach(c => {
      arr.push({ type: 'cat', id: c.category, label: c.category });
      if (expanded.has(c.category)) {
        c.items.forEach(i => {
          arr.push({ type: 'item', id: i, label: i, cat: c.category });
        });
      }
    });
    return arr;
  }, [expanded]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(i => Math.min(i + 1, visibleItems.length - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(i => Math.max(i - 1, 0));
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const item = visibleItems[focusedIndex];
        if (item.type === 'cat' && !expanded.has(item.id)) {
          setExpanded(prev => new Set(prev).add(item.id));
        }
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const item = visibleItems[focusedIndex];
        if (item.type === 'cat' && expanded.has(item.id)) {
          const next = new Set(expanded);
          next.delete(item.id);
          setExpanded(next);
        } else if (item.type === 'item') {
          const pIdx = visibleItems.findIndex(v => v.id === item.cat);
          if (pIdx !== -1) setFocusedIndex(pIdx);
        }
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = visibleItems[focusedIndex];
        if (item.type === 'cat') {
          setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(item.id)) next.delete(item.id);
            else next.add(item.id);
            return next;
          });
        } else {
          onSelect(`${item.cat} Protocol — ${item.label}`);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visibleItems, focusedIndex, expanded, onClose, onSelect]);

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={onClose} />
      <div
        style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '6px',
          width: '240px',
          maxHeight: '300px',
          background: 'var(--c-bg-panel)',
          border: '1px solid var(--c-border)',
          borderRadius: '4px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.8)',
          zIndex: 999,
          overflowY: 'auto',
          padding: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {visibleItems.map((item, idx) => {
          const isFocused = idx === focusedIndex;
          if (item.type === 'cat') {
            const isExp = expanded.has(item.id);
            return (
              <div
                key={item.id}
                onMouseEnter={() => setFocusedIndex(idx)}
                onClick={() => {
                  setExpanded(prev => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  });
                }}
                style={{
                  padding: '4px 8px',
                  background: isFocused ? 'var(--c-border)' : 'transparent',
                  color: isFocused ? 'var(--c-text-bright)' : 'var(--c-text-base)',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '8px' }}>{isExp ? '▼' : '▶'}</span>
                {item.label}
              </div>
            );
          } else {
            return (
              <div
                key={item.id}
                onMouseEnter={() => setFocusedIndex(idx)}
                onClick={() => onSelect(`${item.cat} Protocol — ${item.label}`)}
                style={{
                  padding: '4px 8px 4px 22px',
                  background: isFocused ? 'var(--c-bg-selected)' : 'transparent',
                  color: isFocused ? 'var(--c-cyan)' : 'var(--c-text-mid)',
                  fontSize: '9.5px',
                  cursor: 'pointer',
                  borderRadius: '2px',
                  borderLeft: isFocused ? '2px solid var(--c-cyan)' : '2px solid transparent',
                }}
              >
                {item.label}
              </div>
            );
          }
        })}
      </div>
    </>
  );
}

export default function TopBar() {
  const {
    scan,
    patient,
    sequences,
    selectedSeqId,
    toggleHelp,
    togglePatient,
    togglePhysics,
    toggleLearning,
    toggleAI,
    toggleImageImport,
    setTheme,
    stopScan,
    statusMsg,
    loadExam,
    params,
    planning,
    planningActive,
    wl,
    show,
    safety,
    theme,
  } = useWorkstationStore();

  const loadFileRef = useRef<HTMLInputElement>(null);
  const [showCloudList, setShowCloudList] = useState(false);
  const [cloudExams, setCloudExams] = useState<CloudExamMeta[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);
  const [showProtocolSelector, setShowProtocolSelector] = useState(false);

  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => setTime(new Date().toTimeString().slice(0, 8));
    tick();
    const id = setInterval(tick, 1000);

    const onKey = (e: KeyboardEvent) => {
      if (['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSaveExam(); }
      if (e.key === 'o' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); openCloudList(); }
      if (e.key === 'n' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); window.location.reload(); } // New Patient
    };
    window.addEventListener('keydown', onKey);

    return () => {
      clearInterval(id);
      window.removeEventListener('keydown', onKey);
    };
  }, [patient, safety, sequences, params, planning, wl, show]);

  const selectedSeq = sequences.find((s) => s.id === selectedSeqId);
  const sarPct = selectedSeq?.sarPct ?? 0;
  const sarColor =
    sarPct >= 90 ? "var(--c-red)" : sarPct >= 70 ? "var(--c-amber)" : "var(--c-green)";

  const menuItems = [
    { label: "Patient", action: togglePatient },
    { label: "Images", action: toggleImageImport },
    { label: "Save Exam", action: handleSaveExam },
    { label: "Load Exam", action: openCloudList },
    { label: "Physics", action: togglePhysics },
    { label: "Learning", action: toggleLearning },
    { label: "AI Assist", action: toggleAI },
    { label: "Help", action: toggleHelp },
  ];

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      useWorkstationStore.getState().setImage("axial", url);
      toast(`Loaded: ${file.name}`, "success");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function handleSaveExam() {
    const snap = exportExam({
      patient,
      safety,
      sequences,
      params,
      planning,
      wl,
      show,
    });
    try {
      const id = await saveExamToCloud(snap);
      toast(`Exam saved to cloud: ${id}`, "success");
    } catch (err: any) {
      toast(`Failed to save to cloud: ${err.message}`, "error");
      // Fallback to local
      const name = `exam_${patient.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`;
      downloadJSON(snap, name);
    }
  }

  async function openCloudList() {
    setShowCloudList(true);
    setLoadingCloud(true);
    try {
      const exams = await listCloudExams();
      setCloudExams(exams);
    } catch (err: any) {
      toast(`Failed to load cloud exams: ${err.message}`, "error");
    } finally {
      setLoadingCloud(false);
    }
  }

  async function handleLoadCloud(id: string) {
    try {
      const snap = await loadExamFromCloud(id);
      loadExam(snap);
      toast(`Exam loaded: ${snap.patient.name}`, "success");
      setShowCloudList(false);
    } catch (err: any) {
      toast(`Failed to load exam: ${err.message}`, "error");
    }
  }

  async function handleLoadExam(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readJSONFile(file);
      if (!validateSnapshot(data)) {
        toast("Invalid exam file format", "error");
        return;
      }
      loadExam(data);
      toast(`Exam loaded: ${data.patient.name}`, "success");
    } catch (err) {
      toast("Failed to load exam file", "error");
    }
    e.target.value = "";
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: "36px",
        width: "100%",
        background: "linear-gradient(180deg, var(--c-topbar-start) 0%, var(--c-topbar-end) 100%)",
        borderBottom: "1px solid var(--c-border)",
        flexShrink: 0,
        padding: "0 6px",
        gap: "0",
        position: "relative",
        zIndex: 50,
      }}
    >
      <input
        type="file"
        ref={loadFileRef}
        style={{ display: "none" }}
        accept=".json"
        onChange={handleLoadExam}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "0 10px",
          flexShrink: 0,
        }}
      >
        <img
          src="/logo-icon.png"
          alt="MRI Pro Icon"
          style={{ height: "22px", width: "auto" }}
        />
        <span
          style={{
            fontWeight: 800,
            fontSize: "13px",
            letterSpacing: "2px",
            color: "var(--c-cyan)",
            fontFamily: "Inter,sans-serif",
          }}
        >
          MRI PRO
        </span>
      </div>

      <div
        style={{
          width: "1px",
          height: "20px",
          background: "var(--c-border)",
          flexShrink: 0,
        }}
      />

      {/* Nav menu */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          flexShrink: 0,
        }}
      >
        {menuItems.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            style={{
              height: "100%",
              padding: "0 10px",
              background: "transparent",
              border: "none",
              borderBottom: "2px solid transparent",
              color: "var(--c-text-mid)",
              fontSize: "10.5px",
              fontFamily: "Inter,sans-serif",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.1s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.color = "var(--c-text-bright)";
              (e.target as HTMLElement).style.borderBottomColor = "var(--c-cyan)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.color = "var(--c-text-mid)";
              (e.target as HTMLElement).style.borderBottomColor = "transparent";
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {/* Center — patient chip */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--c-border)",
            borderRadius: "2px",
            padding: "3px 12px",
            fontSize: "9.5px",
          }}
        >
          <span style={{ color: "var(--c-text-base)" }}>👤</span>
          <span style={{ color: "var(--c-text-bright)", fontWeight: 600 }}>
            {patient.name}
          </span>
          <span style={{ color: "var(--c-text-muted)" }}>|</span>
          <span
            style={{
              color: "var(--c-text-mid)",
              fontFamily: "Roboto Mono,monospace",
              fontSize: "9px",
            }}
          >
            {patient.dob}
          </span>
          <span style={{ color: "var(--c-text-muted)" }}>|</span>
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowProtocolSelector(!showProtocolSelector)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--c-text-mid)",
                fontSize: "9px",
                cursor: "pointer",
                fontFamily: "Inter,sans-serif",
                padding: "2px 4px",
                outline: "none",
                borderRadius: "2px",
                transition: "color 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-text-bright)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text-mid)")}
            >
              {patient.study.slice(0, 28)} ▾
            </button>
            {showProtocolSelector && (
              <ProtocolSelectorPopup
                onClose={() => setShowProtocolSelector(false)}
                onSelect={(study) => {
                  useWorkstationStore.getState().setPatient({ study });
                  setShowProtocolSelector(false);
                  toast(`Protocol switched to: ${study}`, "success");
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Right — scanner status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          flexShrink: 0,
          paddingRight: "4px",
        }}
      >
        {/* READY/SCANNING badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "var(--c-bg-elevated)",
            border: "1px solid var(--c-border-accent)",
            borderRadius: "2px",
            padding: "2px 8px",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              flexShrink: 0,
              background: scan.running ? "var(--c-cyan)" : "var(--c-green)",
              boxShadow: scan.running ? "0 0 6px var(--c-cyan)" : "0 0 5px var(--c-green)",
              animation: scan.running
                ? "pulseDot 1s ease-in-out infinite"
                : "none",
            }}
          />
          <span
            style={{
              fontFamily: "Roboto Mono,monospace",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.5px",
              color: scan.running ? "var(--c-cyan)" : "var(--c-green)",
              minWidth: "52px",
            }}
          >
            {scan.running && scan.paused
              ? "PAUSED"
              : scan.running
                ? "SCANNING"
                : "READY"}
          </span>
        </div>

        {/* SAR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "8.5px",
            color: "var(--c-text-mid)",
          }}
        >
          <span>SAR</span>
          <div
            style={{
              width: "50px",
              height: "3px",
              background: "var(--c-bg-elevated)",
              borderRadius: "2px",
              overflow: "hidden",
              border: "1px solid var(--c-border)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${sarPct}%`,
                background: sarColor,
                borderRadius: "2px",
                transition: "width 0.5s",
              }}
            />
          </div>
          <span
            style={{
              color: sarColor,
              fontFamily: "Roboto Mono,monospace",
              fontSize: "8px",
              minWidth: "24px",
            }}
          >
            {sarPct}%
          </span>
        </div>

        <div style={{ width: "1px", height: "16px", background: "var(--c-border)" }} />

        {/* RF */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "9px",
            color: "var(--c-text-subtle)",
            fontFamily: "Roboto Mono,monospace",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <span
              style={{
                width: "5px",
                height: "5px",
                borderRadius: "50%",
                background: "var(--c-green)",
                display: "inline-block",
              }}
            />
            RF
          </span>
        </div>

        <div style={{ width: "1px", height: "16px", background: "var(--c-border)" }} />

        {/* Time */}
        <div
          style={{
            fontFamily: "Roboto Mono,monospace",
            fontSize: "11px",
            color: "var(--c-cyan)",
            background: "var(--c-bg-deepest)",
            border: "1px solid var(--c-border)",
            borderRadius: "2px",
            padding: "2px 8px",
            minWidth: "62px",
            textAlign: "center",
            letterSpacing: "1px",
          }}
        >
          {time}
        </div>

        {/* Import MRI */}
        <label
          title="Import MRI Image"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "rgba(34,211,238,0.08)",
            border: "1px solid rgba(34,211,238,0.2)",
            color: "var(--c-cyan)",
            fontSize: "9.5px",
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: "2px",
            cursor: "pointer",
            fontFamily: "Inter,sans-serif",
            letterSpacing: "0.2px",
            transition: "all 0.1s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(34,211,238,0.16)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(34,211,238,0.08)";
          }}
        >
          🧠 Import MRI
          <input
            type="file"
            accept="image/*,video/mp4,application/pdf"
            style={{ display: "none" }}
            onChange={handleFileUpload}
            aria-label="Upload MRI image"
          />
        </label>

        {/* Scan (Start/Pause) */}
        <button
          onClick={() => {
            if (scan.running && !scan.paused) {
              useWorkstationStore.getState().pauseScan();
            } else {
              useWorkstationStore.getState().startScan();
            }
          }}
          title="Start / Pause Scan (Space)"
          style={{
            background: "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.4)",
            color: "var(--c-green)",
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "2px",
            cursor: "pointer",
            letterSpacing: "0.3px",
            fontFamily: "Inter,sans-serif",
          }}
        >
          ▶ SCAN
        </button>

        {/* Stop */}
        <button
          onClick={() => {
            stopScan();
            toast("⚠ Scan stopped", "error");
          }}
          title="Stop Scan"
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.4)",
            color: "var(--c-red)",
            fontSize: "9px",
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: "2px",
            cursor: "pointer",
            letterSpacing: "0.3px",
            fontFamily: "Inter,sans-serif",
          }}
        >
          ⏹ STOP
        </button>

        {/* Workstation appearance */}
        <div
          role="group"
          aria-label="Workstation appearance"
          style={{
            border: "1px solid var(--c-border)",
            background: "var(--c-bg-input)",
            borderRadius: "3px",
            display: "flex",
            alignItems: "center",
            padding: "1px",
            height: "24px",
            gap: "1px",
          }}
        >
          {([
            { value: 'dark' as const, label: 'DEFAULT', icon: '◐' },
            { value: 'light' as const, label: 'LIGHT', icon: '☀' },
          ]).map(option => {
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setTheme(option.value)}
                title={`${option.label[0]}${option.label.slice(1).toLowerCase()} workstation mode${option.value === 'dark' ? ' (default)' : ''}`}
                style={{
                  height: '20px',
                  padding: '0 6px',
                  border: active ? '1px solid rgba(34,211,238,0.38)' : '1px solid transparent',
                  borderRadius: '2px',
                  background: active ? 'var(--c-cyan-dim)' : 'transparent',
                  color: active ? 'var(--c-cyan)' : 'var(--c-text-muted)',
                  fontFamily: 'Roboto Mono,monospace',
                  fontSize: '7px',
                  fontWeight: 700,
                  letterSpacing: '0.35px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '9px' }}>{option.icon}</span>
                {option.label}
              </button>
            );
          })}
        </div>

      </div>
      {/* Cloud Load Modal */}
      {showCloudList && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
          }}
        >
          <div
            style={{
              background: "var(--c-bg-dark)",
              border: "1px solid var(--c-border)",
              borderRadius: "4px",
              width: "400px",
              padding: "16px",
              color: "var(--c-text-base)",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", color: "var(--c-cyan)" }}>
              Cloud Exams
            </h3>
            {loadingCloud ? (
              <div style={{ fontSize: "12px" }}>Loading...</div>
            ) : (
              <div
                style={{
                  maxHeight: "300px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {cloudExams.length === 0 && (
                  <div style={{ fontSize: "12px" }}>
                    No exams found in cloud.
                  </div>
                )}
                {cloudExams.map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => handleLoadCloud(ex.id)}
                    style={{
                      padding: "8px",
                      background: "var(--c-bg-card)",
                      border: "1px solid var(--c-border)",
                      borderRadius: "2px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "var(--c-cyan)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "var(--c-border)")
                    }
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--c-text-bright)",
                      }}
                    >
                      {ex.patientName}
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--c-text-mid)",
                        marginTop: "4px",
                      }}
                    >
                      {ex.patientId} • {ex.study} •{" "}
                      {new Date(ex.savedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div
              style={{
                marginTop: "16px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <button
                onClick={() => loadFileRef.current?.click()}
                style={{
                  padding: "4px 12px",
                  background: "transparent",
                  border: "1px solid var(--c-border)",
                  color: "var(--c-text-base)",
                  cursor: "pointer",
                  borderRadius: "2px",
                }}
              >
                Load from Local File
              </button>
              <button
                onClick={() => setShowCloudList(false)}
                style={{
                  padding: "4px 12px",
                  background: "var(--c-border)",
                  border: "none",
                  color: "var(--c-text-bright)",
                  cursor: "pointer",
                  borderRadius: "2px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
