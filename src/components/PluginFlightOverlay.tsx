import { type HTMLAttributes, useRef, useEffect } from "react";

export type FlightStage = "idle" | "lifted" | "zoomed" | "settled" | "done";

export interface PluginFlightOverlayProps extends HTMLAttributes<HTMLDivElement> {
  /** Label of the plugin being added. */
  label?: string;
  /** X position of the origin card in px. */
  fromX?: number;
  /** Y position of the origin card in px. */
  fromY?: number;
  /** Current animation stage. */
  stage?: FlightStage;
  /** Set to false to suppress auto-advance. Default true. */
  autoAdvance?: boolean;
  /** Called when the sequence finishes (stage "done" reaches opacity 0). */
  onDone?: () => void;
}

function stageConfig(stage: FlightStage) {
  switch (stage) {
    case "lifted":
      return { width: 220, height: 220, rotX: -14, rotY: 18, scale: 1.06, opacity: 1, centered: false };
    case "zoomed":
      return { width: 540, height: 440, rotX: -6, rotY: 6, scale: 1, opacity: 1, centered: true };
    case "settled":
      return { width: 360, height: 440, rotX: 0, rotY: 0, scale: 1, opacity: 1, centered: true };
    case "done":
      return { width: 360, height: 440, rotX: 0, rotY: 0, scale: 0.96, opacity: 0, centered: true };
    default:
      return null;
  }
}

function stageLabel(s: FlightStage): string {
  return s === "lifted" ? "lift" : s === "zoomed" ? "zoom" : s === "settled" ? "settle" : "done";
}

/**
 * 3D card-flight overlay: lift → tilt → zoom → settle → fade.
 *
 * @summary animated 3D card that lifts, zooms, and settles onto the canvas when adding a plugin
 */
export function PluginFlightOverlay({
  label = "Mail",
  fromX = 0,
  fromY = 0,
  stage = "idle",
  autoAdvance = true,
  onDone,
  style,
  ...rest
}: PluginFlightOverlayProps) {
  const cfg = stageConfig(stage);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!autoAdvance) return;
    if (stage === "lifted") {
      timerRef.current = setTimeout(() => onDone?.(), 700);
    } else if (stage === "zoomed") {
      timerRef.current = setTimeout(() => onDone?.(), 800);
    } else if (stage === "settled") {
      timerRef.current = setTimeout(() => onDone?.(), 700);
    } else if (stage === "done") {
      timerRef.current = setTimeout(() => onDone?.(), 700);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [stage, autoAdvance, onDone]);

  if (!cfg) return null;

  const showGlow = stage === "lifted" || stage === "zoomed";

  return (
    <div
      style={{ position: "absolute", inset: 0, zIndex: 40, pointerEvents: "none", perspective: "1800px", ...style }}
      {...rest}
    >
      {/* Trail glow */}
      {showGlow && (
        <div style={{
          position: "absolute",
          left: "50%", top: "50%",
          width: 700, height: 500,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle, color-mix(in oklab, var(--lotus-accent) 20%, transparent), transparent 60%)",
          filter: "blur(40px)",
          opacity: stage === "zoomed" ? 0.9 : 0.4,
          transition: "opacity 700ms ease-out",
        }} />
      )}

      <div style={{
        position: "absolute",
        left: cfg.centered ? "50%" : fromX,
        top: cfg.centered ? "50%" : fromY,
        width: cfg.width, height: cfg.height,
        transform: cfg.centered
          ? `translate(-50%, -50%) rotateX(${cfg.rotX}deg) rotateY(${cfg.rotY}deg) scale(${cfg.scale})`
          : `rotateX(${cfg.rotX}deg) rotateY(${cfg.rotY}deg) scale(${cfg.scale})`,
        opacity: cfg.opacity,
        borderRadius: 28,
        background: "var(--lotus-surface-focused)",
        backdropFilter: "blur(28px) saturate(1.4)",
        WebkitBackdropFilter: "blur(28px) saturate(1.4)",
        boxShadow: "var(--lotus-shadow-glass-focused)",
        transformStyle: "preserve-3d",
        transition: "all 700ms cubic-bezier(.22,.9,.32,1)",
      }}>
        <div style={{ position: "absolute", inset: 0, padding: 28, display: "flex", flexDirection: "column" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            fontSize: 12, letterSpacing: "0.02em",
            color: "var(--lotus-text-muted)", fontFamily: "var(--lotus-font-mono)",
          }}>
            <span style={{
              display: "inline-flex", width: 20, height: 20, alignItems: "center", justifyContent: "center",
              borderRadius: 6, background: "var(--lotus-accent-soft)",
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>
            </span>
            <span>{label} · landing in space</span>
          </div>
          <div style={{
            marginTop: 24, fontSize: 34, lineHeight: 1.05, fontWeight: 600,
            letterSpacing: "-0.025em", color: "var(--lotus-text)",
          }}>
            New module<br/>materializing.
          </div>
          <div style={{
            marginTop: "auto", display: "flex", alignItems: "center", gap: 8,
            fontSize: 11, color: "var(--lotus-text-muted)", fontFamily: "var(--lotus-font-mono)",
          }}>
            <div style={{ flex: 1, height: 1, background: "var(--lotus-border-soft)" }} />
            <span>{stageLabel(stage)}</span>
            <div style={{ flex: 1, height: 1, background: "var(--lotus-border-soft)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
