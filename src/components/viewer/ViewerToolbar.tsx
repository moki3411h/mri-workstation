"use client";
import React, { memo, useCallback } from "react";
import { useWorkstationStore } from "@/store/workstationStore";
import { toast } from "@/lib/toast";

interface ToolBtn {
  id: string;
  icon: string;
  label: string;
  action?: () => void;
  disabled?: boolean;
  separator?: false;
}
interface Sep {
  separator: true;
}

type Item = ToolBtn | Sep;

const BtnStyle = (active: boolean, color = "var(--c-cyan)") => ({
  display: "flex",
  alignItems: "center",
  gap: "4px",
  padding: "3px 8px",
  background: active ? `${color}18` : "transparent",
  border: active ? `1px solid ${color}40` : "1px solid transparent",
  color: active ? color : "var(--c-text-subtle)",
  cursor: "pointer",
  borderRadius: "2px",
  fontSize: "9px",
  fontWeight: active ? 600 : 400,
  transition: "all 0.1s",
  flexShrink: 0,
  whiteSpace: "nowrap" as const,
});

export default function ViewerToolbar() {
  const { resetAll, setShow, show, setWL, activeVP, wl, planningOverlayVisible } =
    useWorkstationStore();

  const handleReset = useCallback(() => {
    resetAll();
    toast("Viewports reset", "success");
  }, [resetAll]);

  const handleInvert = useCallback(() => {
    const current = wl[activeVP];
    setWL(activeVP, { level: 1024 - current.level });
    toast("Invert toggled");
  }, [activeVP, wl, setWL]);

  const handlePreset = useCallback(
    (preset: "brain" | "bone" | "soft") => {
      const presets = {
        brain: { window: 1200, level: 600 },
        bone: { window: 2000, level: 400 },
        soft: { window: 400, level: 200 },
      };
      setWL(activeVP, presets[preset]);
      toast(`W/L preset: ${preset}`, "success");
    },
    [activeVP, setWL],
  );

  const TOOLS: Item[] = [
    {
      id: "dist",
      icon: "⟷",
      label: "Distance",
      action: () => toast("Distance tool"),
    },
    {
      id: "angle",
      icon: "∠",
      label: "Angle",
      action: () => toast("Angle tool"),
    },
    { id: "roi", icon: "⬭", label: "ROI", action: () => toast("ROI tool") },
    { separator: true },
    { id: "invert", icon: "◑", label: "Invert", action: handleInvert },
    { separator: true },
    {
      id: "brain-wl",
      icon: "🧠",
      label: "Brain W/L",
      action: () => handlePreset("brain"),
    },
    {
      id: "bone-wl",
      icon: "🦴",
      label: "Bone W/L",
      action: () => handlePreset("bone"),
    },
    {
      id: "soft-wl",
      icon: "💧",
      label: "Soft Tissue",
      action: () => handlePreset("soft"),
    },
    { separator: true },
    {
      id: "labels",
      icon: "Aa",
      label: "Labels",
      action: () => setShow("labels", !show.labels),
    },
    {
      id: "xhair-ov",
      icon: "⊕",
      label: "Crosshairs",
      action: () => setShow("xhair", !show.xhair),
    },
    {
      id: "fovbox",
      icon: "⬜",
      label: "FoV Box",
      action: () => setShow("fov", !show.fov),
      disabled: !planningOverlayVisible,
    },
    {
      id: "reflines",
      icon: "⊞",
      label: "Ref Lines",
      action: () => setShow("referenceLines", !show.referenceLines),
    },
    { separator: true },
    { id: "reset", icon: "↺", label: "Reset All", action: handleReset },
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "0 6px",
        height: "28px",
        background: "var(--c-bg-dark)",
        borderBottom: "1px solid var(--c-border)",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {TOOLS.map((item, i) => {
        if ("separator" in item && item.separator) {
          return (
            <div
              key={i}
              style={{
                width: "1px",
                height: "14px",
                background: "var(--c-border)",
                margin: "0 2px",
                flexShrink: 0,
              }}
            />
          );
        }
        const btn = item as ToolBtn;
        const isActiveOverlay =
          (btn.id === "labels" && show.labels) ||
          (btn.id === "xhair-ov" && show.xhair) ||
          (btn.id === "fovbox" && planningOverlayVisible && show.fov) ||
          (btn.id === "reflines" && show.referenceLines);
        const isActive = isActiveOverlay;

        return (
          <button
            key={btn.id}
            disabled={btn.disabled}
            onClick={() => {
              if (btn.action) btn.action();
            }}
            title={btn.disabled ? `${btn.label} — place an image into planning first` : btn.label}
            style={{
              ...BtnStyle(isActive),
              cursor: btn.disabled ? "not-allowed" : "pointer",
              opacity: btn.disabled ? 0.35 : 1,
            }}
          >
            <span style={{ fontSize: "10px" }}>{btn.icon}</span>
            <span style={{ fontSize: "8.5px" }}>{btn.label}</span>
          </button>
        );
      })}

      {/* Active tool indicator */}
      <div
        style={{
          marginLeft: "auto",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <span
          style={{
            fontSize: "8px",
            color: "var(--c-text-muted)",
            fontFamily: "Roboto Mono,monospace",
          }}
        >
          VP: <span style={{ color: "var(--c-cyan)" }}>{activeVP.toUpperCase()}</span>
        </span>
        <span
          style={{
            fontSize: "8px",
            color: "var(--c-text-muted)",
            fontFamily: "Roboto Mono,monospace",
          }}
        >
          W:{wl[activeVP].window} L:{wl[activeVP].level}
        </span>
      </div>
    </div>
  );
}
