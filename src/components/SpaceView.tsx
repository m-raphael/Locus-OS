import { useState } from "react";
import { useLocusStore, modulesForSpace } from "../store";
import { useCollabSession } from "./CollabBar";
import MailModule from "./modules/MailModule";
import CalendarModule from "./modules/CalendarModule";
import LiveModule from "./modules/LiveModule";
import DocModule from "./modules/DocModule";
import PredictiveModule from "./modules/PredictiveModule";
import LegacyAppModule from "./modules/LegacyAppModule";
import MarketplaceModule from "./modules/MarketplaceModule";

const MODULE_MAP = { mail: MailModule, calendar: CalendarModule, live: LiveModule, doc: DocModule, predictive: PredictiveModule, marketplace: MarketplaceModule } as const;

interface SpaceViewProps { collab: ReturnType<typeof useCollabSession>; }

export default function SpaceView({ collab }: SpaceViewProps) {
  const { activeSpaceLabel, accent, legacyAppContext } = useLocusStore();
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  if (!activeSpaceLabel) return null;

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
            <span>updated just now</span>
            <span>·</span>
            <span style={{ color: accent }}>● live</span>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
          <div>scroll horizontally →</div>
          <div style={{ marginTop: 4 }}>click a module to focus</div>
        </div>
      </div>

      {/* Horizontal flow */}
      <div
        onClick={() => setFocusedIdx(null)}
        style={{
          flex: 1, overflowX: "auto", overflowY: "hidden",
          scrollbarWidth: "thin",
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)",
          maskImage: "linear-gradient(to right, transparent 0%, black 3%, black 97%, transparent 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 24, padding: "8px 48px 32px 48px", minWidth: "max-content" }}>
          {/* Legacy app module takes slot 0 when present */}
          {legacyAppContext && (
            <LegacyAppModule
              idx={0}
              accent={accent}
              appName={legacyAppContext.name}
              appPath={legacyAppContext.path}
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
