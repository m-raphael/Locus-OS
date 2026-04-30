import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLocusStore, Flow, modulesForSpace } from "../store";
import FlowRow from "./FlowRow";
import { useCollabSession } from "./CollabBar";

const MODES = ["open", "focus", "recovery", "mirror"] as const;
import MailModule from "./modules/MailModule";
import CalendarModule from "./modules/CalendarModule";
import LiveModule from "./modules/LiveModule";
import DocModule from "./modules/DocModule";
import PredictiveModule from "./modules/PredictiveModule";
import LegacyAppModule from "./modules/LegacyAppModule";
import MarketplaceModule from "./modules/MarketplaceModule";
import SimulationModule from "./modules/SimulationModule";
import AuditLogModule from "./modules/AuditLogModule";

const MODULE_MAP: Record<string, React.ComponentType<{ idx: number; accent: string; focused: boolean; anyFocused: boolean; onFocus: (e: React.MouseEvent) => void }>> = { mail: MailModule, calendar: CalendarModule, live: LiveModule, doc: DocModule, predictive: PredictiveModule, marketplace: MarketplaceModule, simulation: SimulationModule, audit: AuditLogModule, draft: () => null };

interface SpaceViewProps { collab: ReturnType<typeof useCollabSession>; }

export default function SpaceView({ collab }: SpaceViewProps) {
  const { activeSpaceLabel, activeSpaceId, accent, legacyAppContext, flows, setFlows } = useLocusStore();
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [spaceMode, setSpaceMode] = useState<string>("open");
  const [draftModules, setDraftModules] = useState<{ id: string; verb: string }[]>([]);
  // Record visit for predictive spaces
  useEffect(() => {
    if (!activeSpaceLabel) return;
    const now = new Date();
    invoke("record_visit", {
      description: activeSpaceLabel,
      visitedAt: Math.floor(now.getTime() / 1000),
      hourOfDay: now.getHours(),
    }).catch(() => {});
  }, [activeSpaceLabel]);

  // Load flows when space changes
  useEffect(() => {
    if (!activeSpaceId) return;
    invoke<Flow[]>("list_flows", { spaceId: activeSpaceId }).then((f) => {
      setFlows(activeSpaceId, f);
    }).catch(() => {});
  }, [activeSpaceId, setFlows]);

  if (!activeSpaceLabel) return null;

  const spaceFlows = activeSpaceId ? (flows[activeSpaceId] ?? []) : [];
  const kinds = modulesForSpace(activeSpaceLabel);

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", paddingTop: 110, paddingBottom: 120 }}>
      {/* Space header */}
      <div style={{ padding: "0 48px 32px", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Space · flow</div>
          <h1 style={{ marginTop: 8, fontSize: 64, lineHeight: 0.95, fontWeight: 600, letterSpacing: "-0.035em", color: "var(--text)", animation: "lotusFloatIn 500ms var(--motion-float)" }}>
            {activeSpaceLabel}.
          </h1>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            <span>{kinds.length} modules</span>
            <span>·</span>
            <span>{spaceFlows.length} flows</span>
            <span>·</span>
            <span>updated just now</span>
            <span>·</span>
            <span style={{ color: accent }}>● live</span>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
            <span>mode</span>
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => {
                  setSpaceMode(m);
                  if (activeSpaceId) invoke("set_space_mode", { spaceId: activeSpaceId, mode: m }).catch(() => {});
                }}
                style={{
                  fontSize: 11, fontFamily: "var(--font-mono)",
                  padding: "2px 8px", borderRadius: 999,
                  border: spaceMode === m ? `1px solid ${accent}55` : "1px solid var(--border)",
                  background: spaceMode === m ? `${accent}18` : "transparent",
                  color: spaceMode === m ? accent : "var(--muted)",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >{m}</button>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>click a module to focus</div>
        </div>
      </div>

      {/* Flows — DB-backed horizontal rows */}
      {spaceFlows.length > 0 && (
        <div style={{ padding: "0 48px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          {spaceFlows.map((flow) => (
            <FlowRow key={flow.id} flow={flow} />
          ))}
        </div>
      )}

      {/* Horizontal flow — module cards */}
      <div
        onClick={() => setFocusedIdx(null)}
        style={{
          flex: 1, overflowX: "auto", overflowY: "hidden",
          scrollbarWidth: "none", display: "flex", flexDirection: "column",
          padding: "0 24px",
          "--density-module-minh": "0px",
        } as React.CSSProperties}
      >
        <div style={{ display: "flex", alignItems: "stretch", gap: "var(--density-module-gap)", padding: "0 48px", minWidth: "max-content", flex: 1, minHeight: 0 }}>
          {/* Legacy app module takes slot 0 when present */}
          {legacyAppContext && (
            <LegacyAppModule
              idx={0}
              accent={accent}
              appName={legacyAppContext.name}
              appPath={legacyAppContext.path}
              bundleId={legacyAppContext.bundleId}
              focused={focusedIdx === -1}
              anyFocused={focusedIdx !== null}
              onFocus={(e) => { e.stopPropagation(); setFocusedIdx(-1); }}
            />
          )}
          {kinds.map((kind, i) => {
            const Mod = MODULE_MAP[kind];
            const idx = legacyAppContext ? i + 1 : i;
            const sharedProps = {
              idx, accent,
              focused: focusedIdx === idx,
              anyFocused: focusedIdx !== null,
              onFocus: (e: React.MouseEvent) => { e.stopPropagation(); setFocusedIdx(idx); },
            };
            if (kind === "live") {
              return <LiveModule key={i} {...sharedProps} collab={collab} />;
            }
            return <Mod key={i} {...sharedProps} />;
          })}
          {/* Draft modules created via + bubble */}
          {draftModules.map((d) => {
            return (
              <div
                key={d.id}
                style={{
                  width: "var(--density-module-width)", minHeight: "var(--density-module-minh)",
                  borderRadius: "var(--module-radius)", flexShrink: 0,
                  background: "var(--glass-bg)",
                  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  border: "1.5px dashed rgba(128,128,128,0.25)",
                  padding: "24px 28px",
                  display: "flex", flexDirection: "column",
                  animation: "lotusFloatIn 700ms var(--motion-float)",
                }}
              >
                <p style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
                  Draft
                </p>
                <p style={{ fontSize: 15, fontWeight: 500, color: "var(--text)", marginTop: 8 }}>
                  <span style={{ color: accent }}>{d.verb}</span>
                  <span style={{ color: "var(--muted)", marginLeft: 8 }}>…</span>
                </p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: "auto", fontFamily: "var(--font-mono)" }}>
                  Click Locus bar to set intent
                </p>
              </div>
            );
          })}
          {/* Plus bubble — create a new draft module */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Add module"
            style={{
              flexShrink: 0, alignSelf: "center",
              width: 44, height: 44, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--dropdown-bg)",
              backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
              border: `1px solid ${accent}44`,
              cursor: "pointer",
              color: accent,
              fontSize: 20, lineHeight: 1,
              transition: "all 400ms cubic-bezier(0.22, 0.9, 0.32, 1)",
              animation: "lotusModuleAppear 400ms cubic-bezier(0.22, 0.9, 0.32, 1) backwards",
            }}
            onClick={() => {
              const verb = ["Draft", "Find", "Review", "Plan", "Call", "Send"][Math.floor(Math.random() * 6)];
              const id = "draft-" + Date.now();
              setDraftModules((prev) => [...prev, { id, verb }]);
              // Also persist to DB if a flow exists
              const targetFlow = activeSpaceId ? (flows[activeSpaceId] ?? [])[0] : null;
              if (targetFlow) {
                const template = JSON.stringify({ verb, noun: "", modifier: null });
                invoke<string>("create_module", { flowId: targetFlow.id, componentType: "draft", propsJson: template })
                  .catch(() => {});
              }
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${accent}18`;
              e.currentTarget.style.borderColor = `${accent}66`;
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--dropdown-bg)";
              e.currentTarget.style.borderColor = `${accent}44`;
              e.currentTarget.style.transform = "scale(1)";
            }}
            title="Add module (Tab)"
          >+</div>
        </div>
      </div>
    </div>
  );
}
