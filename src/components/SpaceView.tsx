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

const MODULE_MAP = { mail: MailModule, calendar: CalendarModule, live: LiveModule, doc: DocModule, predictive: PredictiveModule, marketplace: MarketplaceModule, simulation: SimulationModule, audit: AuditLogModule } as const;

interface SpaceViewProps { collab: ReturnType<typeof useCollabSession>; }

export default function SpaceView({ collab }: SpaceViewProps) {
  const { activeSpaceLabel, activeSpaceId, accent, legacyAppContext, flows, setFlows } = useLocusStore();
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [spaceMode, setSpaceMode] = useState<string>("open");
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
          scrollbarWidth: "thin",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)",
          maskImage: "linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--density-module-gap)", padding: "8px 48px 32px 48px", minWidth: "max-content" }}>
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
        </div>
      </div>
    </div>
  );
}
