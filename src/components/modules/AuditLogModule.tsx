import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import ModuleShell, { ModuleHeader, ModuleProps } from "./ModuleShell";

interface AuditLog {
  id: string;
  event_type: string;
  actor: string | null;
  resource_id: string | null;
  details: string | null;
  created_at: number;
}

const EVENT_COLORS: Record<string, string> = {
  space_created: "#5cb87a",
  space_deleted: "#e05c5c",
  mode_changed: "#d4924a",
  plugin_installed: "#7c7cf2",
  simulation_run: "#34d399",
  focus_goal_set: "#e05c5c",
};

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function AuditLogModule(props: Omit<ModuleProps, "children">) {
  const { idx, accent, focused, anyFocused, onFocus } = props;
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filter, setFilter] = useState<string | null>(null);

  async function loadLogs() {
    try {
      const result = await invoke<AuditLog[]>("list_audit_logs", {
        eventType: filter,
        limit: 50,
      });
      setLogs(result);
    } catch (e) {
      console.error("list_audit_logs failed:", e);
    }
  }

  useEffect(() => { loadLogs(); }, [filter]);

  const eventTypes = Array.from(new Set(logs.map((l) => l.event_type)));

  return (
    <ModuleShell idx={idx} accent={accent} focused={focused} anyFocused={anyFocused} onFocus={onFocus}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 440 }}>
        <ModuleHeader kind="ai" source="Audit Log" time={`${logs.length} events`} />

        {/* Filters */}
        <div style={{ padding: "12px 28px 0", display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={(e) => { e.stopPropagation(); setFilter(null); }}
            style={{
              fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em",
              padding: "3px 8px", borderRadius: 999, border: "none", cursor: "pointer",
              background: filter === null ? accent : "var(--chip-bg)",
              color: filter === null ? "#fff" : "var(--muted)",
              transition: "all 200ms",
            }}
          >all</button>
          {eventTypes.map((et) => (
            <button
              key={et}
              onClick={(e) => { e.stopPropagation(); setFilter(et); }}
              style={{
                fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.1em",
                padding: "3px 8px", borderRadius: 999, border: "none", cursor: "pointer",
                background: filter === et ? accent : "var(--chip-bg)",
                color: filter === et ? "#fff" : "var(--muted)",
                transition: "all 200ms",
              }}
            >{et.replace(/_/g, " ")}</button>
          ))}
        </div>

        {/* Log list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 28px" }}>
          {logs.map((log, i) => {
            const color = EVENT_COLORS[log.event_type] || accent;
            return (
              <div key={log.id} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "8px 0", borderBottom: i < logs.length - 1 ? "1px solid var(--border)" : "none",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: 999, flexShrink: 0, marginTop: 5,
                  background: color,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{
                      fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em",
                      color, fontWeight: 600,
                    }}>{log.event_type.replace(/_/g, " ")}</span>
                    <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                      {formatTime(log.created_at)}
                    </span>
                  </div>
                  {log.details && (
                    <div style={{ fontSize: 11.5, color: "var(--text)", lineHeight: 1.4 }}>{log.details}</div>
                  )}
                  {log.resource_id && (
                    <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)", marginTop: 1 }}>
                      res: {log.resource_id}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {logs.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "32px 0" }}>
              No audit events yet.<br />Create a space or run a simulation to generate logs.
            </div>
          )}
        </div>
      </div>
    </ModuleShell>
  );
}
