import { type HTMLAttributes } from "react";
import { motion, AnimatePresence } from "motion/react";

export type TransitionKind =
  | "created"
  | "mode"
  | "dismissed"
  | "launched"
  | "memory"
  | "plugin"
  | "focus"
  | "transition"
  | "other";

export interface TransitionEvent {
  id: string;
  kind: TransitionKind;
  /** Primary line — e.g. "Plan Q3 launch". */
  label: string;
  /** Secondary line — e.g. "mode → focus". Optional. */
  sublabel?: string;
  /** Unix-second timestamp. */
  timestamp: number;
}

export interface TransitionTimelineProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  events?: TransitionEvent[];
  emptyMessage?: string;
  /** Optional title row override. Pass null to hide. */
  title?: React.ReactNode;
  /** Maximum height before scrolling. Default 420. */
  maxHeight?: number | string;
}

// ── Visual mapping ───────────────────────────────────────────────────────────
const KIND_META: Record<TransitionKind, { glyph: string; tone: string }> = {
  created:    { glyph: "+", tone: "var(--lotus-entity-organization)" },
  mode:       { glyph: "◐", tone: "var(--lotus-accent)" },
  dismissed:  { glyph: "×", tone: "var(--lotus-text-faint)" },
  launched:   { glyph: "↗", tone: "var(--lotus-entity-place)" },
  memory:     { glyph: "·", tone: "var(--lotus-entity-topic)" },
  plugin:     { glyph: "▣", tone: "var(--lotus-entity-date)" },
  focus:      { glyph: "◎", tone: "var(--lotus-entity-person)" },
  transition: { glyph: "→", tone: "var(--lotus-accent)" },
  other:      { glyph: "·", tone: "var(--lotus-text-faint)" },
};

function relTime(now: number, ts: number): string {
  const s = Math.max(0, now - ts);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const itemV = {
  hidden: { opacity: 0, x: -10 },
  show: (i: number) => ({
    opacity: 1, x: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 28, delay: i * 0.04 },
  }),
  exit: { opacity: 0, x: -10, transition: { duration: 0.12 } },
};

// ── Component ────────────────────────────────────────────────────────────────
/**
 * Vertical timeline of system transition events with kind-specific glyphs and colors.
 *
 * @summary chronologically-sorted audit-log feed for space lifecycle events
 */
export function TransitionTimeline({
  events = [],
  emptyMessage = "No transitions yet.",
  title,
  maxHeight = 420,
  style,
  ...rest
}: TransitionTimelineProps) {
  const now = Math.floor(Date.now() / 1000);

  return (
    <div
      style={{
        width: 380,
        padding: "20px 8px 16px 16px",
        borderRadius: "var(--lotus-radius-card)",
        background: "var(--lotus-surface-base)",
        backdropFilter: `blur(var(--lotus-surface-blur)) saturate(var(--lotus-surface-saturate))`,
        WebkitBackdropFilter: `blur(var(--lotus-surface-blur)) saturate(var(--lotus-surface-saturate))`,
        boxShadow: "var(--lotus-shadow-glass-focused)",
        ...style,
      }}
      {...rest}
    >
      {/* Header */}
      {title !== null && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingRight: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lotus-accent)" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{
              fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.16em",
              color: "var(--lotus-text-muted)", fontFamily: "var(--lotus-font-mono)",
            }}>
              {title ?? "Transition Timeline"}
            </span>
          </div>
          <kbd style={{
            fontSize: 10, fontFamily: "var(--lotus-font-mono)", color: "var(--lotus-text-muted)",
            background: "color-mix(in oklab, var(--lotus-accent) 10%, transparent)",
            padding: "2px 7px", borderRadius: "var(--lotus-radius-chip)",
            boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--lotus-accent) 25%, transparent)",
          }}>⌘T</kbd>
        </div>
      )}

      {/* Empty state */}
      {events.length === 0 ? (
        <div style={{
          padding: "32px 8px", textAlign: "center" as const,
          color: "var(--lotus-text-muted)", fontSize: 12,
          fontFamily: "var(--lotus-font-display)",
        }}>
          {emptyMessage}
        </div>
      ) : (
        <div style={{ position: "relative", maxHeight, overflowY: "auto", paddingRight: 8 }}>
          {/* Vertical rail */}
          <div style={{
            position: "absolute" as const, left: 11, top: 4, bottom: 4, width: 1,
            background: "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--lotus-accent) 35%, transparent), transparent)",
          }} />

          <AnimatePresence>
            {events.map((e, i) => {
              const meta = KIND_META[e.kind];
              return (
                <motion.div
                  key={e.id}
                  custom={i}
                  variants={itemV}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "24px 1fr auto",
                    columnGap: 10, rowGap: 0,
                    padding: "8px 0",
                    alignItems: "start",
                  }}
                >
                  {/* Dot */}
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: `color-mix(in oklab, ${meta.tone} 18%, var(--lotus-surface-base))`,
                    boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${meta.tone} 45%, transparent), 0 0 12px -2px ${meta.tone}`,
                    color: meta.tone,
                    fontFamily: "var(--lotus-font-mono)",
                    fontSize: 11,
                    fontWeight: 600,
                    lineHeight: 1,
                  }}>
                    {meta.glyph}
                  </div>

                  {/* Body */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, color: "var(--lotus-text)",
                      fontFamily: "var(--lotus-font-display)",
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap" as const,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}>
                      {e.label}
                    </div>
                    {e.sublabel && (
                      <div style={{
                        fontSize: 10, color: "var(--lotus-text-muted)",
                        fontFamily: "var(--lotus-font-mono)",
                        letterSpacing: "0.04em",
                        marginTop: 2,
                      }}>
                        {e.sublabel}
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div style={{
                    fontSize: 10, color: "var(--lotus-text-faint)",
                    fontFamily: "var(--lotus-font-mono)",
                    paddingTop: 4, flexShrink: 0,
                  }}>
                    {relTime(now, e.timestamp)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
