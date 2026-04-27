import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import ModuleShell, { ModuleHeader, ModuleAction, ModuleProps } from "./ModuleShell";

interface PredictedSpace {
  description: string;
  confidence: number;
  reason: string;
}

export default function PredictiveModule(props: Omit<ModuleProps, "children">) {
  const { idx, accent, focused, anyFocused, onFocus } = props;
  const [predictions, setPredictions] = useState<PredictedSpace[]>([]);
  const [hour, setHour] = useState(new Date().getHours());
  const [loading, setLoading] = useState(true);

  async function loadPredictions() {
    setLoading(true);
    try {
      const now = new Date();
      setHour(now.getHours());
      const result = await invoke<PredictedSpace[]>("predict_next_spaces", {
        currentHour: now.getHours(),
        limit: 5,
      });
      setPredictions(result);
    } catch (e) {
      console.error("predict_next_spaces failed:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPredictions();
    const interval = setInterval(loadPredictions, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  async function activatePrediction(description: string) {
    try {
      await invoke("create_space", {
        description,
        mode: "open",
        ephemeral: false,
      });
      // Record visit immediately
      const now = new Date();
      await invoke("record_visit", {
        description,
        visitedAt: Math.floor(now.getTime() / 1000),
        hourOfDay: now.getHours(),
      });
      loadPredictions();
    } catch (e) {
      console.error("activatePrediction failed:", e);
    }
  }

  return (
    <ModuleShell idx={idx} accent={accent} focused={focused} anyFocused={anyFocused} onFocus={onFocus}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 440 }}>
        <ModuleHeader kind="ai" source="Predictive" time={`${hour.toString().padStart(2, "0")}:00`} />

        <div style={{ padding: "20px 28px 0" }}>
          <div style={{
            fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em",
            color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 12,
          }}>
            Next Space
          </div>
          <div style={{
            fontSize: 22, fontWeight: 600, color: "var(--text)",
            letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 4,
          }}>
            {loading ? "Loading predictions…" : predictions.length > 0
              ? `You usually "${predictions[0].description}" around now`
              : "No pattern yet"}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
            {loading ? "" : predictions.length > 0 ? predictions[0].reason : "Keep using Spaces to build predictions."}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 28px" }}>
          {predictions.slice(1).map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 0", borderBottom: i < predictions.slice(1).length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 999,
                background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 600, color: accent, fontFamily: "var(--font-mono)",
              }}>
                {Math.round(p.confidence * 100)}%
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", letterSpacing: "-0.01em" }}>{p.description}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{p.reason}</div>
              </div>
              <ModuleAction accent={accent} onClick={() => activatePrediction(p.description)}>
                Start
              </ModuleAction>
            </div>
          ))}
        </div>

        {predictions.length > 0 && (
          <div style={{ padding: "0 28px 20px" }}>
            <ModuleAction accent={accent} primary onClick={() => activatePrediction(predictions[0].description)}>
              Start predicted Space
            </ModuleAction>
          </div>
        )}
      </div>
    </ModuleShell>
  );
}
