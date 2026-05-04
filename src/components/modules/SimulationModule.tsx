import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import ModuleShell, { ModuleHeader, ModuleProps } from "./ModuleShell";
import {
  SimulationBoard,
  type Simulation as SimDS,
  type SimulationOutcome,
  type SimulationStats,
  type SimulationStatus,
} from "../../design";

interface BackendSimulation {
  id: string;
  name: string;
  description?: string;
  created_at: number;
  status: string;
}

interface BackendSimulationResult {
  id: string;
  outcome_name: string;
  probability: number;
  confidence: number;
  created_at: number;
}

function normalizeStatus(s: string): SimulationStatus {
  if (s === "completed") return "completed";
  if (s === "running") return "running";
  return "idle";
}

function computeStats(results: SimulationOutcome[]): SimulationStats | undefined {
  if (results.length === 0) return undefined;
  const probs = [...results.map((r) => r.probability)].sort((a, b) => a - b);
  const pct = (q: number) => probs[Math.min(probs.length - 1, Math.floor(q * (probs.length - 1)))];
  return { median: pct(0.5), p10: pct(0.1), p90: pct(0.9) };
}

export default function SimulationModule(props: Omit<ModuleProps, "children">) {
  const { idx, accent, focused, anyFocused, onFocus } = props;
  const [sims, setSims] = useState<SimDS[]>([]);
  const [results, setResults] = useState<SimulationOutcome[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSims = useCallback(async () => {
    try {
      const list = await invoke<BackendSimulation[]>("list_simulations", { limit: 20 });
      const mapped: SimDS[] = list.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        status: normalizeStatus(s.status),
      }));
      setSims(mapped);
      if (selectedId && !mapped.find((s) => s.id === selectedId)) {
        setSelectedId(null);
        setResults([]);
      }
    } catch (e) {
      console.error("list_simulations failed:", e);
    }
  }, [selectedId]);

  useEffect(() => { loadSims(); }, [loadSims]);

  async function handleCreate(name: string, description?: string) {
    try {
      await invoke("create_simulation", { name, description: description ?? null });
      loadSims();
    } catch (e) {
      console.error("create_simulation failed:", e);
    }
  }

  async function handleRun(id: string) {
    setLoading(true);
    setSelectedId(id);
    try {
      const res = await invoke<BackendSimulationResult[]>("run_simulation", { id, hoursAhead: 0 });
      setResults(res.map((r) => ({
        id: r.id,
        label: r.outcome_name,
        probability: r.probability,
        confidence: r.confidence,
      })));
      loadSims();
    } catch (e) {
      console.error("run_simulation failed:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleView(id: string) {
    setSelectedId(id);
    try {
      const res = await invoke<BackendSimulationResult[]>("get_simulation_results", { id });
      setResults(res.map((r) => ({
        id: r.id,
        label: r.outcome_name,
        probability: r.probability,
        confidence: r.confidence,
      })));
    } catch (e) {
      console.error("get_simulation_results failed:", e);
    }
  }

  return (
    <ModuleShell idx={idx} accent={accent} focused={focused} anyFocused={anyFocused} onFocus={onFocus}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 440 }}>
        <ModuleHeader kind="ai" source="Simulations" time={`${sims.length} saved`} />
        <div style={{ padding: "20px 28px 24px", flex: 1, overflowY: "auto" }}>
          <SimulationBoard
            simulations={sims}
            selectedSimulationId={selectedId}
            results={results}
            stats={computeStats(results)}
            loading={loading}
            onCreate={handleCreate}
            onRun={handleRun}
            onView={handleView}
          />
        </div>
      </div>
    </ModuleShell>
  );
}
