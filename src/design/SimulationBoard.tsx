import { type HTMLAttributes, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import gsap from "gsap";
import "./simulation-board.css";

export type SimulationStatus = "idle" | "running" | "completed";

export interface Simulation {
  id: string;
  name: string;
  description?: string;
  status: SimulationStatus;
}

export interface SimulationOutcome {
  id: string;
  /** Outcome label, e.g. "On time" / "1-week slip". */
  label: string;
  /** 0..1 probability. */
  probability: number;
  /** 0..1 confidence interval width. */
  confidence: number;
}

export interface SimulationStats {
  /** Median outcome probability (0..1). */
  median: number;
  /** 10th percentile (0..1). */
  p10: number;
  /** 90th percentile (0..1). */
  p90: number;
}

export interface SimulationBoardProps extends Omit<HTMLAttributes<HTMLDivElement>, "results"> {
  simulations?: Simulation[];
  /** When set, the results panel is shown for this simulation. */
  selectedSimulationId?: string | null;
  /** Outcome rows for the selected simulation. */
  results?: SimulationOutcome[];
  /** Aggregate statistics for the selected simulation. */
  stats?: SimulationStats;
  /** Whether the parent is currently running a simulation. */
  loading?: boolean;
  emptyMessage?: string;
  onCreate?: (name: string, description?: string) => void;
  onRun?: (id: string) => void;
  onView?: (id: string) => void;
}

// ── GSAP-tweened percentage label ────────────────────────────────────────────
function AnimatedPercent({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { v: prev.current };
    const target = Math.round(value * 100);
    gsap.to(obj, {
      v: target,
      duration: 0.85,
      ease: "power2.out",
      onUpdate() { el.textContent = `${Math.round(obj.v)}%`; },
      onComplete() { prev.current = target; },
    });
  }, [value]);

  return <span ref={ref} className="lotus-sim-board__bar-pct">0%</span>;
}

// ── Bar row ──────────────────────────────────────────────────────────────────
function BarRow({ outcome, index }: { outcome: SimulationOutcome; index: number }) {
  const [filled, setFilled] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setFilled(outcome.probability), 60 + index * 90);
    return () => clearTimeout(t);
  }, [outcome.probability, index]);

  return (
    <motion.div
      className="lotus-sim-board__bar-row"
      style={{ ["--p" as keyof React.CSSProperties]: filled } as React.CSSProperties}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 380, damping: 28 }}
    >
      <span className="lotus-sim-board__bar-label">{outcome.label}</span>
      <AnimatedPercent value={outcome.probability} />
      <div className="lotus-sim-board__bar-track">
        <div className="lotus-sim-board__bar-fill" />
      </div>
      <span className="lotus-sim-board__bar-confidence">
        confidence ±{Math.round(outcome.confidence * 100)}%
      </span>
    </motion.div>
  );
}

// ── Simulation list row ──────────────────────────────────────────────────────
function SimRow({
  sim, loading, onRun, onView,
}: {
  sim: Simulation;
  loading?: boolean;
  onRun?: (id: string) => void;
  onView?: (id: string) => void;
}) {
  const statusGlyph = sim.status === "completed" ? "✓" : sim.status === "running" ? "·" : "○";
  return (
    <motion.div
      className="lotus-sim-board__sim-row"
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
    >
      <div className={`lotus-sim-board__sim-status lotus-sim-board__sim-status--${sim.status}`}>
        {statusGlyph}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="lotus-sim-board__sim-name">{sim.name}</div>
        {sim.description && <div className="lotus-sim-board__sim-desc">{sim.description}</div>}
      </div>
      <div className="lotus-sim-board__btn-row">
        <button
          className="lotus-sim-board__btn"
          onClick={() => onRun?.(sim.id)}
          disabled={loading}
        >
          {loading ? "…" : "Run"}
        </button>
        {sim.status === "completed" && (
          <button className="lotus-sim-board__btn" onClick={() => onView?.(sim.id)}>View</button>
        )}
      </div>
    </motion.div>
  );
}

// ── Create form ──────────────────────────────────────────────────────────────
function CreateForm({ onCreate }: { onCreate?: (n: string, d?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  if (!open) {
    return (
      <button className="lotus-sim-board__create-trigger" onClick={() => setOpen(true)}>
        + New simulation
      </button>
    );
  }

  return (
    <motion.div
      className="lotus-sim-board__create"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <input
        autoFocus
        className="lotus-sim-board__create-input"
        placeholder="Name…"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="lotus-sim-board__create-input lotus-sim-board__create-input--small"
        placeholder="Description (optional)…"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="lotus-sim-board__btn lotus-sim-board__btn--primary"
          onClick={() => {
            if (!name.trim()) return;
            onCreate?.(name.trim(), desc.trim() || undefined);
            setName(""); setDesc(""); setOpen(false);
          }}
        >
          Create
        </button>
        <button
          className="lotus-sim-board__btn"
          onClick={() => { setOpen(false); setName(""); setDesc(""); }}
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
/**
 * Monte Carlo simulation board with animated probability bars and stat strip.
 *
 * @summary list of simulations, inline create form, GSAP-tweened result bars with median/P10/P90
 */
export function SimulationBoard({
  simulations = [],
  selectedSimulationId = null,
  results = [],
  stats,
  loading = false,
  emptyMessage = "No simulations yet. Create one to model future scenarios.",
  onCreate,
  onRun,
  onView,
  className,
  style,
  ...rest
}: SimulationBoardProps) {
  const selected = simulations.find((s) => s.id === selectedSimulationId);
  const sortedResults = [...results].sort((a, b) => b.probability - a.probability);

  return (
    <div
      className={["lotus-sim-board", className].filter(Boolean).join(" ")}
      style={style}
      {...rest}
    >
      {/* Hero header */}
      <div>
        <div className="lotus-sim-board__title-row">
          <span style={{
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em",
            color: "var(--lotus-text-muted)", fontFamily: "var(--lotus-font-mono)",
          }}>
            Monte Carlo
          </span>
          <span style={{
            fontSize: 10, color: "var(--lotus-text-faint)",
            fontFamily: "var(--lotus-font-mono)", letterSpacing: "0.08em",
          }}>
            {simulations.length} saved
          </span>
        </div>
        <div className="lotus-sim-board__title">
          {selected ? selected.name : "Future scenarios"}
        </div>
        <div className="lotus-sim-board__subtitle">
          {selected
            ? selected.description ?? "Probability distribution across outcomes."
            : "Model future scenarios from your usage patterns."}
        </div>
      </div>

      {/* Create */}
      <CreateForm onCreate={onCreate} />

      {/* Sim list */}
      {simulations.length === 0 ? (
        <div className="lotus-sim-board__empty">{emptyMessage}</div>
      ) : (
        <div>
          <div className="lotus-sim-board__section-label">Saved</div>
          <AnimatePresence>
            {simulations.map((s) => (
              <SimRow
                key={s.id}
                sim={s}
                loading={loading && s.id === selectedSimulationId}
                onRun={onRun}
                onView={onView}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Results */}
      {selected && (sortedResults.length > 0 || stats) && (
        <div className="lotus-sim-board__results">
          <div className="lotus-sim-board__section-label">
            Results · {selected.name}
          </div>

          {stats && (
            <div className="lotus-sim-board__stats">
              <div className="lotus-sim-board__stat">
                <div className="lotus-sim-board__stat-value">{Math.round(stats.p10 * 100)}%</div>
                <div className="lotus-sim-board__stat-label">P10</div>
              </div>
              <div className="lotus-sim-board__stat">
                <div className="lotus-sim-board__stat-value">{Math.round(stats.median * 100)}%</div>
                <div className="lotus-sim-board__stat-label">Median</div>
              </div>
              <div className="lotus-sim-board__stat">
                <div className="lotus-sim-board__stat-value">{Math.round(stats.p90 * 100)}%</div>
                <div className="lotus-sim-board__stat-label">P90</div>
              </div>
            </div>
          )}

          {sortedResults.map((r, i) => (
            <BarRow key={r.id} outcome={r} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
