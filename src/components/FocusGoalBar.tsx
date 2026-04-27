import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLocusStore } from "../store";

interface FocusGoal {
  id: string;
  name: string;
  description?: string;
  created_at: number;
  active: boolean;
}

export default function FocusGoalBar() {
  const { accent, focusGoal, setFocusGoal } = useLocusStore();
  const [goals, setGoals] = useState<FocusGoal[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  async function loadGoals() {
    try {
      const list = await invoke<FocusGoal[]>("list_focus_goals");
      setGoals(list);
      const active = list.find((g) => g.active);
      setFocusGoal(active ? { id: active.id, name: active.name, description: active.description } : null);
    } catch (e) {
      console.error("list_focus_goals failed:", e);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  async function createGoal() {
    if (!newName.trim()) return;
    try {
      await invoke("create_focus_goal", { name: newName.trim(), description: newDesc.trim() || null });
      setNewName("");
      setNewDesc("");
      loadGoals();
    } catch (e) {
      console.error("create_focus_goal failed:", e);
    }
  }

  async function activateGoal(id: string) {
    try {
      await invoke("set_active_focus_goal", { id });
      loadGoals();
    } catch (e) {
      console.error("set_active_focus_goal failed:", e);
    }
  }

  async function clearGoal() {
    try {
      await invoke("clear_active_focus_goal");
      loadGoals();
    } catch (e) {
      console.error("clear_active_focus_goal failed:", e);
    }
  }

  return (
    <>
      {/* Status pill */}
      <div
        onClick={() => setShowPanel((s) => !s)}
        style={{
          position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)",
          zIndex: 35, cursor: "pointer",
          padding: "6px 14px", borderRadius: 999,
          fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: "0.04em",
          background: focusGoal ? `${accent}22` : "var(--chip-bg)",
          border: focusGoal ? `1px solid ${accent}55` : "1px solid var(--border)",
          color: focusGoal ? accent : "var(--muted)",
          backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
          transition: "all 200ms var(--motion-ui)",
        }}
      >
        {focusGoal ? `Focus: ${focusGoal.name}` : "Set focus goal"}
      </div>

      {/* Panel */}
      {showPanel && (
        <div style={{
          position: "fixed", top: 106, left: "50%", transform: "translateX(-50%)",
          zIndex: 36, width: 320,
          background: "var(--glass-bg)", backdropFilter: "blur(20px)",
          borderRadius: 14, border: "1px solid var(--border)",
          boxShadow: "var(--glass-shadow)", padding: 16,
        }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 10 }}>Focus Goals</div>

          {goals.map((g) => (
            <div key={g.id} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 0", borderBottom: "1px solid var(--border)",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{g.name}</div>
                {g.description && <div style={{ fontSize: 11, color: "var(--muted)" }}>{g.description}</div>}
              </div>
              {g.active ? (
                <button onClick={clearGoal} style={{
                  fontSize: 10, fontFamily: "var(--font-mono)", padding: "4px 10px", borderRadius: 999,
                  border: "1px solid var(--border)", background: "transparent", color: "var(--muted)", cursor: "pointer",
                }}>Active</button>
              ) : (
                <button onClick={() => activateGoal(g.id)} style={{
                  fontSize: 10, fontFamily: "var(--font-mono)", padding: "4px 10px", borderRadius: 999,
                  border: `1px solid ${accent}55`, background: `${accent}18`, color: accent, cursor: "pointer",
                }}>Activate</button>
              )}
            </div>
          ))}

          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New goal name…"
              style={{
                fontSize: 12, padding: "6px 10px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--chip-bg)", color: "var(--text)", outline: "none",
              }}
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              style={{
                fontSize: 12, padding: "6px 10px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--chip-bg)", color: "var(--text)", outline: "none",
              }}
            />
            <button onClick={createGoal} style={{
              fontSize: 11, fontFamily: "var(--font-mono)", padding: "6px 12px", borderRadius: 999,
              border: `1px solid ${accent}55`, background: `${accent}18`, color: accent, cursor: "pointer",
            }}>Create Goal</button>
          </div>
        </div>
      )}
    </>
  );
}
