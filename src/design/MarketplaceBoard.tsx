import { type HTMLAttributes, type ReactNode, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import "./marketplace-board.css";

export type PermissionRisk = "low" | "med" | "high";

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  /** Backend module type — used by the parent to pick an icon. */
  moduleType?: string;
  permissions?: string[];
  isInstalled?: boolean;
  isEnabled?: boolean;
  /** 0..5 user rating, optional. */
  rating?: number;
  /** Total install count, optional. */
  installCount?: number;
  /** Unix-second timestamp of last update, optional. */
  updatedAt?: number;
  homepage?: string | null;
}

export type MarketplaceFilter = "all" | "installed" | "available";

export interface MarketplaceBoardProps extends HTMLAttributes<HTMLDivElement> {
  plugins?: Plugin[];
  /** Map a plugin to its rendered icon node. */
  iconFor?: (plugin: Plugin) => ReactNode;
  /** Map a permission key to its risk tier. Default: see DEFAULT_RISK. */
  riskFor?: (permission: string) => PermissionRisk;
  /** Map a permission key to a human description. */
  descriptionFor?: (permission: string) => string;
  /** ID of a plugin that was just installed (for the pulse animation). */
  justInstalledId?: string | null;
  /** Plugin ID currently busy (install/uninstall in flight). */
  busyId?: string | null;
  onInstall?: (plugin: Plugin) => void;
  onUninstall?: (plugin: Plugin) => void;
  onToggleEnabled?: (plugin: Plugin) => void;
}

const DEFAULT_RISK = (perm: string): PermissionRisk => {
  if (perm === "file_system" || perm === "clipboard") return "high";
  if (perm === "network" || perm === "native_app") return "med";
  return "low";
};

const DEFAULT_DESC: Record<string, string> = {
  network:       "Makes outbound HTTP/WebSocket requests",
  microphone:    "Captures audio from your microphone",
  file_system:   "Reads and writes files on your device",
  clipboard:     "Reads and writes clipboard contents",
  native_app:    "Launches native macOS applications",
  ai_inference:  "Runs AI inference via local NPU or cloud NIM",
};

function formatCount(n?: number): string | null {
  if (n === undefined) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function formatRating(r?: number): string | null {
  if (r === undefined) return null;
  return `★ ${r.toFixed(1)}`;
}

function formatUpdated(ts?: number): string | null {
  if (ts === undefined) return null;
  const s = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (s < 86400) return "today";
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  if (s < 2592000) return `${Math.floor(s / 604800)}w ago`;
  return `${Math.floor(s / 2592000)}mo ago`;
}

function aggregateRisk(perms: string[], risk: (p: string) => PermissionRisk): PermissionRisk {
  if (perms.some((p) => risk(p) === "high")) return "high";
  if (perms.some((p) => risk(p) === "med")) return "med";
  return "low";
}

const rowV = {
  hidden: { opacity: 0, y: 6 },
  show:   { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 380, damping: 28 } },
  exit:   { opacity: 0, y: 6, transition: { duration: 0.14 } },
};

const detailV = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  show:   { opacity: 1, height: "auto", marginTop: 12, transition: { duration: 0.22, ease: [0.22, 0.9, 0.32, 1] as const } },
  exit:   { opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.18 } },
};

// ── Component ────────────────────────────────────────────────────────────────
/**
 * Marketplace board with search, filter chips, expandable rich plugin rows.
 *
 * @summary searchable plugin marketplace — install/uninstall/enable, permission risk meter, governance score
 */
export function MarketplaceBoard({
  plugins = [],
  iconFor,
  riskFor = DEFAULT_RISK,
  descriptionFor,
  justInstalledId = null,
  busyId = null,
  onInstall,
  onUninstall,
  onToggleEnabled,
  className,
  style,
  ...rest
}: MarketplaceBoardProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MarketplaceFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const installedCount = plugins.filter((p) => p.isInstalled).length;
  const availableCount = plugins.length - installedCount;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return plugins.filter((p) => {
      if (filter === "installed" && !p.isInstalled) return false;
      if (filter === "available" && p.isInstalled) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        (p.author?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [plugins, query, filter]);

  const desc = (perm: string) =>
    descriptionFor?.(perm) ?? DEFAULT_DESC[perm] ?? "Unknown permission";

  return (
    <div className={["lotus-mkt", className].filter(Boolean).join(" ")} style={style} {...rest}>
      {/* Header */}
      <div className="lotus-mkt__header">
        <div className="lotus-mkt__title-row">
          <span style={{
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em",
            color: "var(--lotus-text-muted)", fontFamily: "var(--lotus-font-mono)",
          }}>
            Marketplace
          </span>
          <span className="lotus-mkt__count">{installedCount}/{plugins.length}</span>
        </div>
        <div className="lotus-mkt__title">Plugins</div>

        {/* Search */}
        <div className="lotus-mkt__search">
          <svg className="lotus-mkt__search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="lotus-mkt__search-input"
            placeholder="Search plugins…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="lotus-mkt__search-clear" onClick={() => setQuery("")} aria-label="Clear">
              ×
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="lotus-mkt__filters">
          <button
            className={`lotus-mkt__filter ${filter === "all" ? "lotus-mkt__filter--active" : ""}`}
            onClick={() => setFilter("all")}
          >
            All <span className="lotus-mkt__filter-count">{plugins.length}</span>
          </button>
          <button
            className={`lotus-mkt__filter ${filter === "installed" ? "lotus-mkt__filter--active" : ""}`}
            onClick={() => setFilter("installed")}
          >
            Installed <span className="lotus-mkt__filter-count">{installedCount}</span>
          </button>
          <button
            className={`lotus-mkt__filter ${filter === "available" ? "lotus-mkt__filter--active" : ""}`}
            onClick={() => setFilter("available")}
          >
            Available <span className="lotus-mkt__filter-count">{availableCount}</span>
          </button>
        </div>
      </div>

      {/* List */}
      <div className="lotus-mkt__list">
        {filtered.length === 0 ? (
          <div className="lotus-mkt__empty">
            {plugins.length === 0
              ? "No plugins yet. Check back soon."
              : query
                ? `No plugins match "${query}".`
                : "Nothing in this filter."}
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((p) => {
              const isExpanded = expandedId === p.id;
              const isBusy = busyId === p.id;
              const justInstalled = justInstalledId === p.id;
              const ratingLabel = formatRating(p.rating);
              const installs = formatCount(p.installCount);
              const updatedLabel = formatUpdated(p.updatedAt);
              const aggRisk = p.permissions && p.permissions.length > 0
                ? aggregateRisk(p.permissions, riskFor)
                : null;

              return (
                <motion.div
                  key={p.id}
                  className={[
                    "lotus-mkt__row",
                    justInstalled ? "lotus-mkt__row--just-installed" : "",
                  ].filter(Boolean).join(" ")}
                  layout
                  variants={rowV}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  style={{ opacity: isBusy ? 0.55 : 1 }}
                >
                  <div className="lotus-mkt__row-top">
                    {/* Icon */}
                    <div className={[
                      "lotus-mkt__row-icon",
                      p.isInstalled ? "lotus-mkt__row-icon--installed" : "",
                    ].filter(Boolean).join(" ")}>
                      {iconFor?.(p) ?? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="3" />
                        </svg>
                      )}
                    </div>

                    {/* Body */}
                    <div style={{ minWidth: 0 }}>
                      <div className="lotus-mkt__row-name">
                        <span className="lotus-mkt__row-title">{p.name}</span>
                        <span className="lotus-mkt__row-version">v{p.version}</span>
                        {p.isInstalled && (
                          <span className="lotus-mkt__row-installed-badge">Installed</span>
                        )}
                      </div>

                      {(p.author || ratingLabel || installs || updatedLabel) && (
                        <div className="lotus-mkt__row-meta">
                          {p.author && <span className="lotus-mkt__row-meta-item">{p.author}</span>}
                          {ratingLabel && <span className="lotus-mkt__row-meta-item">{ratingLabel}</span>}
                          {installs && <span className="lotus-mkt__row-meta-item">{installs} installs</span>}
                          {updatedLabel && <span className="lotus-mkt__row-meta-item">updated {updatedLabel}</span>}
                        </div>
                      )}

                      <div className="lotus-mkt__row-desc">{p.description}</div>

                      {p.permissions && p.permissions.length > 0 && (
                        <div className="lotus-mkt__perms">
                          {p.permissions.map((perm) => (
                            <span key={perm} className={`lotus-mkt__perm lotus-mkt__perm--${riskFor(perm)}`}>
                              {perm.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="lotus-mkt__row-actions" onClick={(e) => e.stopPropagation()}>
                      {p.isInstalled ? (
                        <>
                          <button
                            className="lotus-mkt__btn lotus-mkt__btn--ghost"
                            disabled={isBusy}
                            onClick={() => onToggleEnabled?.(p)}
                            title={p.isEnabled ? "Disable" : "Enable"}
                          >
                            {p.isEnabled ? "Enabled" : "Disabled"}
                          </button>
                          <button
                            className="lotus-mkt__btn lotus-mkt__btn--ghost"
                            disabled={isBusy}
                            onClick={() => onUninstall?.(p)}
                          >
                            {isBusy ? "…" : "Remove"}
                          </button>
                        </>
                      ) : (
                        <button
                          className="lotus-mkt__btn"
                          disabled={isBusy}
                          onClick={() => onInstall?.(p)}
                        >
                          {isBusy ? "…" : "Install"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && p.permissions && p.permissions.length > 0 && (
                      <motion.div
                        key="detail"
                        className="lotus-mkt__detail"
                        variants={detailV}
                        initial="hidden"
                        animate="show"
                        exit="exit"
                      >
                        <div className="lotus-mkt__detail-label">Permissions requested</div>
                        {p.permissions.map((perm) => {
                          const r = riskFor(perm);
                          return (
                            <div key={perm} className="lotus-mkt__perm-detail">
                              <span className={`lotus-mkt__perm-dot lotus-mkt__perm-dot--${r}`} />
                              <div>
                                <div className="lotus-mkt__perm-name">{perm.replace(/_/g, " ")}</div>
                                <div className="lotus-mkt__perm-desc">{desc(perm)}</div>
                              </div>
                              <span className={`lotus-mkt__perm lotus-mkt__perm--${r}`}>{r}</span>
                            </div>
                          );
                        })}

                        {aggRisk && (
                          <div className="lotus-mkt__risk-row">
                            <span className="lotus-mkt__risk-label">Governance risk</span>
                            <div className="lotus-mkt__risk-meter">
                              <div className={`lotus-mkt__risk-pip lotus-mkt__risk-pip--low`} />
                              <div className={`lotus-mkt__risk-pip ${aggRisk !== "low" ? `lotus-mkt__risk-pip--${aggRisk}` : ""}`} />
                              <div className={`lotus-mkt__risk-pip ${aggRisk === "high" ? "lotus-mkt__risk-pip--high" : ""}`} />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="lotus-mkt__footer">
        <span>LOTUS plugins · built-in catalog</span>
        <span>{filtered.length} shown</span>
      </div>
    </div>
  );
}
