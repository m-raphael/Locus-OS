import { type HTMLAttributes } from "react";
import { motion, AnimatePresence } from "motion/react";

export interface GraphNode {
  id: string;
  label: string;
}

export interface GraphExplorerPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  /** Central (active) space. If absent the panel shows `emptyMessage`. */
  center?: GraphNode;
  /** Related spaces that orbit the center. */
  related?: GraphNode[];
  /** Breadcrumb labels from the attention-path query. */
  pathLabels?: string[];
  /** Shown when there is no center node. */
  emptyMessage?: string;
  /** Called when the user clicks a related node. */
  onSelect?: (node: GraphNode) => void;
}

// ── Layout constants ──────────────────────────────────────────────────────────
const W = 400;
const H = 260;
const CX = W / 2;
const CY = H / 2 - 8;
const R = 98;

function positions(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / Math.max(count, 1)) * 2 * Math.PI - Math.PI / 2;
    return { x: CX + Math.cos(a) * R, y: CY + Math.sin(a) * R };
  });
}

function clamp(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ── Animation variants ────────────────────────────────────────────────────────
const nodeV = {
  hidden: { opacity: 0, scale: 0.55 },
  show: (i: number) => ({
    opacity: 1, scale: 1,
    transition: { type: "spring" as const, stiffness: 440, damping: 24, delay: i * 0.06 },
  }),
  exit: { opacity: 0, scale: 0.55, transition: { duration: 0.14 } },
};

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * SVG-based space graph visualization with orbiting related nodes and attention-path breadcrumbs.
 *
 * @summary interactive graph panel showing space relationships with spring-animated nodes
 */
export function GraphExplorerPanel({
  center,
  related = [],
  pathLabels = [],
  emptyMessage = "Open a space first.",
  onSelect,
  style,
  ...rest
}: GraphExplorerPanelProps) {
  const pts = positions(related.length);

  return (
    <div
      style={{
        width: W + 32,
        padding: "20px 16px 16px",
        borderRadius: "var(--lotus-radius-card)",
        background: "var(--lotus-surface-base)",
        backdropFilter: `blur(var(--lotus-surface-blur)) saturate(var(--lotus-surface-saturate))`,
        WebkitBackdropFilter: `blur(var(--lotus-surface-blur)) saturate(var(--lotus-surface-saturate))`,
        boxShadow: "var(--lotus-shadow-glass-focused)",
        ...style,
      }}
      {...rest}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingLeft: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--lotus-accent)" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="5" r="3" />
            <circle cx="4" cy="19" r="3" />
            <circle cx="20" cy="19" r="3" />
            <line x1="12" y1="8" x2="4" y2="16" />
            <line x1="12" y1="8" x2="20" y2="16" />
          </svg>
          <span style={{
            fontSize: 11, textTransform: "uppercase" as const, letterSpacing: "0.16em",
            color: "var(--lotus-text-muted)", fontFamily: "var(--lotus-font-mono)",
          }}>
            Space Graph
          </span>
        </div>
        <kbd style={{
          fontSize: 10, fontFamily: "var(--lotus-font-mono)", color: "var(--lotus-text-muted)",
          background: "color-mix(in oklab, var(--lotus-accent) 10%, transparent)",
          padding: "2px 7px", borderRadius: "var(--lotus-radius-chip)",
          boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--lotus-accent) 25%, transparent)",
        }}>⌘G</kbd>
      </div>

      {/* Attention path breadcrumb */}
      {pathLabels.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 12, flexWrap: "wrap" as const, paddingLeft: 4 }}>
          {pathLabels.map((label, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {i > 0 && <span style={{ color: "var(--lotus-text-faint)", fontSize: 10 }}>›</span>}
              <span style={{
                fontSize: 10, padding: "3px 9px", borderRadius: "var(--lotus-radius-pill)",
                background: i === pathLabels.length - 1
                  ? "color-mix(in oklab, var(--lotus-accent) 16%, transparent)"
                  : "color-mix(in oklab, var(--lotus-text-muted) 10%, transparent)",
                color: i === pathLabels.length - 1 ? "var(--lotus-accent)" : "var(--lotus-text-muted)",
                boxShadow: i === pathLabels.length - 1
                  ? "inset 0 0 0 1px color-mix(in oklab, var(--lotus-accent) 35%, transparent)"
                  : "none",
                fontFamily: "var(--lotus-font-mono)",
              }}>{label}</span>
            </span>
          ))}
        </div>
      )}

      {/* Graph */}
      {!center ? (
        <div style={{
          height: H, display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--lotus-text-muted)", fontSize: 12, fontFamily: "var(--lotus-font-display)",
        }}>
          {emptyMessage}
        </div>
      ) : (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
          <defs>
            <radialGradient id="gep-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--lotus-accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--lotus-accent)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Edges */}
          {pts.map((p, i) => (
            <line
              key={`e-${related[i]?.id}`}
              x1={CX} y1={CY} x2={p.x} y2={p.y}
              stroke="var(--lotus-accent)" strokeOpacity={0.16}
              strokeWidth={1.2} strokeDasharray="3 4"
            />
          ))}

          <AnimatePresence>
            {/* Center node */}
            <motion.g key={`c-${center.id}`} custom={0} variants={nodeV} initial="hidden" animate="show" exit="exit">
              <circle cx={CX} cy={CY} r={38} fill="url(#gep-glow)" />
              <circle
                cx={CX} cy={CY} r={22}
                fill="color-mix(in oklab, var(--lotus-accent) 18%, transparent)"
                stroke="var(--lotus-accent)" strokeWidth={1.5}
              />
              <foreignObject x={CX - 38} y={CY + 26} width={76} height={34}>
                <div style={{
                  fontSize: 10, color: "var(--lotus-accent)", textAlign: "center",
                  lineHeight: 1.25, fontFamily: "var(--lotus-font-display)",
                  overflow: "hidden", display: "-webkit-box",
                  WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                }}>
                  {clamp(center.label, 18)}
                </div>
              </foreignObject>
            </motion.g>

            {/* Related nodes */}
            {related.map((node, i) => (
              <motion.g
                key={node.id}
                custom={i + 1}
                variants={nodeV}
                initial="hidden"
                animate="show"
                exit="exit"
                onClick={() => onSelect?.(node)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={pts[i].x} cy={pts[i].y} r={16}
                  fill="color-mix(in oklab, var(--lotus-surface-base) 80%, transparent)"
                  stroke="color-mix(in oklab, var(--lotus-accent) 45%, transparent)"
                  strokeWidth={1}
                />
                <foreignObject x={pts[i].x - 28} y={pts[i].y + 19} width={56} height={30}>
                  <div style={{
                    fontSize: 9, color: "var(--lotus-text-muted)", textAlign: "center",
                    lineHeight: 1.25, fontFamily: "var(--lotus-font-display)",
                    overflow: "hidden", display: "-webkit-box",
                    WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const,
                  }}>
                    {clamp(node.label, 14)}
                  </div>
                </foreignObject>
              </motion.g>
            ))}
          </AnimatePresence>
        </svg>
      )}

      {/* Footer */}
      <div style={{
        paddingTop: 10, paddingLeft: 4,
        fontSize: 10, color: "var(--lotus-text-faint)", fontFamily: "var(--lotus-font-mono)",
      }}>
        click a node to navigate · esc to close
      </div>
    </div>
  );
}
