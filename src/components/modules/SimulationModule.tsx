import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import ModuleShell, { ModuleHeader, ModuleAction, ModuleProps } from "./ModuleShell";

interface Simulation {
  id: string;
  name: string;
  description?: string;
  created_at: number;
  status: string;
}

interface SimulationResult {
  id: string;
  outcome_name: string;
  probability: number;
  confidence: number;
  created_at: number;
}

export default function SimulationModule(props: Omit<ModuleProps, "children">) {
  const { idx, accent, focused, anyFocused, onFocus } = props;
  const [sims, setSims] = useState<Simulation[]>([]);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  async function loadSims() {
    try {
      const list = await invoke<Simulation[]>("list_simulations", { limit: 20 });
      setSims(list);
      if (selectedId && !list.find((s) => s.id === selectedId)) {
        setSelectedId(null);
        setResults([]);
      }
    } catch (e) {
      console.error("list_simulations failed:", e);
    }
  }

  useEffect(() => { loadSims(); }, []);

  async function createSim() {
    if (!newName.trim()) return;
    setCreating(false);
    try {
      await invoke("create_simulation", { name: newName.trim(), description: newDesc.trim() || null });
      setNewName("");
      setNewDesc("");
      loadSims();
    } catch (e) {
      console.error("create_simulation failed:", e);
    }
  }

  async function runSim(id: string) {
    setLoading(true);
    setSelectedId(id);
    try {
      const res = await invoke<SimulationResult[]>("run_simulation", { id, hoursAhead: 0 });
      setResults(res);
      loadSims();
    } catch (e) {
      console.error("run_simulation failed:", e);
    } finally {
      setLoading(false);
    }
  }

  async function viewResults(id: string) {
    setSelectedId(id);
    try {
      const res = await invoke<SimulationResult[]>("get_simulation_results", { id });
      setResults(res);
    } catch (e) {
      console.error("get_simulation_results failed:", e);
    }
  }

  const selectedSim = sims.find((s) => s.id === selectedId);

  return (
    <ModuleShell idx={idx} accent={accent} focused={focused} anyFocused={anyFocused} onFocus={onFocus}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 440 }}>
        <ModuleHeader kind="ai" source="Simulations" time={`${sims.length} saved`} />

        {/* Create new */}
        <div style={{ padding: "16px 28px 0" }}>
          {!creating ? (
            <button
              onClick={(e) => { e.stopPropagation(); setCreating(true); }}
              style={{
                width: "100%", padding: "8px 0", fontSize: 12, fontFamily: "var(--font-mono)",
                color: accent, background: "transparent", border: `1.5px dashed ${accent}44`,
                borderRadius: 10, cursor: "pointer", transition: "all 200ms",
              }}
            >
              + New simulation
            </button>
          ) : (
            <div style={{
              padding: 12, borderRadius: 10, background: "var(--chip-bg)", border: "1px solid var(--border)",
            }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name…"
                style={{
                  width: "100%", background: "transparent", border: "none", outline: "none",
                  fontSize: 13, color: "var(--text)", marginBottom: 8,
                  fontFamily: "var(--font-sans)",
                }}
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description (optional)…"
                style={{
                  width: "100%", background: "transparent", border: "none", outline: "none",
                  fontSize: 12, color: "var(--muted)", marginBottom: 12,
                  fontFamily: "var(--font-sans)",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <ModuleAction accent={accent} primary onClick={createSim}>Create</ModuleAction>
                <ModuleAction accent={accent} onClick={() => { setCreating(false); setNewName(""); setNewDesc(""); }}>Cancel</ModuleAction>
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 28px" }}>
          {sims.map((s, i) => (
            <div key={s.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 0", borderBottom: i < sims.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999,
                background: s.status === "completed" ? `${accent}18` : "var(--chip-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 600, color: s.status === "completed" ? accent : "var(--muted)",
                fontFamily: "var(--font-mono)", flexShrink: 0,
              }}>
                {s.status === "completed" ? "✓" : "○"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>{s.name}</div>
                {s.description && (
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{s.description}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <ModuleAction accent={accent} onClick={() => runSim(s.id)}>
                  {loading && selectedId === s.id ? "…" : "Run"}
                </ModuleAction>
                {s.status === "completed" && (
                  <ModuleAction accent={accent} onClick={() => viewResults(s.id)}>View</ModuleAction>
                )}
              </div>
            </div>
          ))}
          {sims.length === 0 && !creating && (
            <div style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", padding: "24px 0" }}>
              No simulations yet.<br />Create one to model future scenarios.
            </div>
          )}
        </div>

        {/* Results panel */}
        {selectedSim && results.length > 0 && (
          <div style={{
            padding: "0 28px 20px", borderTop: "1px solid var(--border)", paddingTop: 14,
          }}>
            <div style={{
              fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em",
              color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 10,
            }}>
              Results · {selectedSim.name}
            </div>
            {results.map((r, _i) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 8,
              }}>
                <div style={{
                  width: 36, height: 22, borderRadius: 999,
                  background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 600, color: accent, fontFamily: "var(--font-mono)",
                }}>
                  {Math.round(r.probability * 100)}%
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{r.outcome_name}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                    confidence {Math.round(r.confidence * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
