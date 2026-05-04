import { type HTMLAttributes } from "react";
import { motion, AnimatePresence } from "motion/react";

export type PredictionSource = "temporal" | "graph";

export interface PredictionItem {
  /** Unique key — usually `description` for temporal, `space_id` for graph. */
  id: string;
  label: string;
  reason: string;
  /** 0..1 — only meaningful for `temporal`; graph items omit it. */
  confidence?: number;
  source: PredictionSource;
}

export interface PredictionBoardProps extends HTMLAttributes<HTMLDivElement> {
  /** Hero prediction shown at the top in display type. */
  headline?: PredictionItem;
  /** The remainder of the temporal prediction list. */
  predictions?: PredictionItem[];
  /** Graph-based recommendations (rendered in a separate section). */
  related?: PredictionItem[];
  /** Current hour string for the header chip, e.g. "14:00". */
  time?: string;
  /** Loading flag — replaces the hero copy with a soft skeleton message. */
  loading?: boolean;
  /** Empty-state copy when nothing is loading and no items are present. */
  emptyMessage?: string;
  onActivate?: (item: PredictionItem) => void;
}

const rowV = {
  hidden: { opacity: 0, y: 6 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 28, delay: i * 0.045 },
  }),
  exit: { opacity: 0, y: 6, transition: { duration: 0.12 } },
};

function ActivateButton({
  primary, onClick, children,
}: { primary?: boolean; onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        appearance: "none" as const, border: "none", cursor: "pointer",
        padding: primary ? "10px 18px" : "5px 11px",
        borderRadius: "var(--lotus-radius-pill)",
        fontFamily: "var(--lotus-font-mono)",
        fontSize: primary ? 12 : 10,
        letterSpacing: primary ? "0.04em" : "0.08em",
        textTransform: primary ? "none" as const : "uppercase" as const,
        background: primary
          ? "var(--lotus-accent)"
          : "color-mix(in oklab, var(--lotus-accent) 14%, transparent)",
        color: primary ? "var(--lotus-text-on-accent)" : "var(--lotus-accent)",
        boxShadow: primary
          ? "var(--lotus-shadow-glass)"
          : "inset 0 0 0 1px color-mix(in oklab, var(--lotus-accent) 32%, transparent)",
        whiteSpace: "nowrap" as const, flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

function ConfidenceDot({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div
      style={{
        width: 32, height: 32, borderRadius: "50%",
        background: "color-mix(in oklab, var(--lotus-accent) 14%, transparent)",
        boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--lotus-accent) 30%, transparent)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--lotus-accent)",
        fontFamily: "var(--lotus-font-mono)", fontSize: 10, fontWeight: 600,
        flexShrink: 0,
      }}
      aria-label={`confidence ${pct}%`}
    >
      {pct}%
    </div>
  );
}

function GraphGlyph() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%",
      background: "color-mix(in oklab, var(--lotus-entity-topic) 14%, transparent)",
      boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--lotus-entity-topic) 35%, transparent)",
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--lotus-entity-topic)" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="12" cy="5" r="3" />
        <circle cx="4" cy="19" r="3" />
        <circle cx="20" cy="19" r="3" />
        <line x1="12" y1="8" x2="4" y2="16" />
        <line x1="12" y1="8" x2="20" y2="16" />
      </svg>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.16em",
      color: "var(--lotus-text-muted)", fontFamily: "var(--lotus-font-mono)",
      marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

function Row({
  item, onActivate, index,
}: { item: PredictionItem; onActivate?: (i: PredictionItem) => void; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={rowV}
      initial="hidden"
      animate="show"
      exit="exit"
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 0",
        borderBottom: "1px solid var(--lotus-border-soft)",
      }}
    >
      {item.source === "temporal" && typeof item.confidence === "number" ? (
        <ConfidenceDot value={item.confidence} />
      ) : (
        <GraphGlyph />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: "var(--lotus-text)",
          letterSpacing: "-0.01em",
          whiteSpace: "nowrap" as const, overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {item.label}
        </div>
        <div style={{
          fontSize: 11, color: "var(--lotus-text-muted)",
          fontFamily: "var(--lotus-font-display)",
          marginTop: 2,
        }}>
          {item.reason}
        </div>
      </div>
      <ActivateButton onClick={() => onActivate?.(item)}>Open</ActivateButton>
    </motion.div>
  );
}

/**
 * Predictive suggestions panel showing temporal patterns and graph-based recommendations.
 *
 * @summary AI-driven prediction feed with hero card, temporal list, and graph-related items
 */
export function PredictionBoard({
  headline,
  predictions = [],
  related = [],
  time,
  loading = false,
  emptyMessage = "Keep using Spaces — predictions will appear here.",
  onActivate,
  style,
  ...rest
}: PredictionBoardProps) {
  const isEmpty = !loading && !headline && predictions.length === 0 && related.length === 0;

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", gap: 18,
        fontFamily: "var(--lotus-font-display)",
        ...style,
      }}
      {...rest}
    >
      {/* Hero */}
      <div>
        <div style={{
          display: "flex", alignItems: "baseline", justifyContent: "space-between",
          marginBottom: 6,
        }}>
          <span style={{
            fontSize: 10, textTransform: "uppercase" as const, letterSpacing: "0.16em",
            color: "var(--lotus-text-muted)", fontFamily: "var(--lotus-font-mono)",
          }}>
            Next Space
          </span>
          {time && (
            <span style={{
              fontSize: 10, color: "var(--lotus-text-faint)",
              fontFamily: "var(--lotus-font-mono)", letterSpacing: "0.08em",
            }}>
              {time}
            </span>
          )}
        </div>

        <div style={{
          fontSize: 22, fontWeight: 600, color: "var(--lotus-text)",
          letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 4, minHeight: 28,
        }}>
          {loading
            ? "Loading predictions…"
            : headline
              ? `You usually "${headline.label}" around now`
              : "No pattern yet"}
        </div>
        <div style={{
          fontSize: 12, color: "var(--lotus-text-muted)",
          lineHeight: 1.5, minHeight: 18,
        }}>
          {loading ? "" : headline ? headline.reason : isEmpty ? emptyMessage : ""}
        </div>
      </div>

      {/* Temporal predictions */}
      {predictions.length > 0 && (
        <div>
          <SectionLabel>Pattern</SectionLabel>
          <AnimatePresence>
            {predictions.map((p, i) => (
              <Row key={p.id} item={p} onActivate={onActivate} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Graph-based related */}
      {related.length > 0 && (
        <div>
          <SectionLabel>Related via graph</SectionLabel>
          <AnimatePresence>
            {related.map((r, i) => (
              <Row key={r.id} item={r} onActivate={onActivate} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Primary CTA */}
      {headline && (
        <div style={{ paddingTop: 4 }}>
          <ActivateButton primary onClick={() => onActivate?.(headline)}>
            Start predicted Space
          </ActivateButton>
        </div>
      )}
    </div>
  );
}
