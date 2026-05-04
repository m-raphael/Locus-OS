import { useEffect, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import ModuleShell, { ModuleHeader, ModuleProps } from "./ModuleShell";
import { PredictionBoard, type PredictionItem } from "../../design";
import { useLocusStore, SpaceSummary } from "../../store";

interface BackendPredictedSpace {
  description: string;
  confidence: number;
  reason: string;
}

export default function PredictiveModule(props: Omit<ModuleProps, "children">) {
  const { idx, accent, focused, anyFocused, onFocus } = props;
  const { spaces, activeSpaceId, setSpaces, setActiveSpace } = useLocusStore();

  const [headline, setHeadline] = useState<PredictionItem | undefined>(undefined);
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [related, setRelated] = useState<PredictionItem[]>([]);
  const [hour, setHour] = useState(new Date().getHours());
  const [loading, setLoading] = useState(true);

  const loadPredictions = useCallback(async () => {
    setLoading(true);
    const now = new Date();
    setHour(now.getHours());

    // Temporal predictions
    let temporal: BackendPredictedSpace[] = [];
    try {
      temporal = await invoke<BackendPredictedSpace[]>("predict_next_spaces", {
        currentHour: now.getHours(),
        limit: 5,
      });
    } catch (e) {
      console.error("predict_next_spaces failed:", e);
    }

    const temporalItems: PredictionItem[] = temporal.map((p) => ({
      id: `t-${p.description}`,
      label: p.description,
      reason: p.reason,
      confidence: p.confidence,
      source: "temporal",
    }));

    setHeadline(temporalItems[0]);
    setPredictions(temporalItems.slice(1));

    // Graph-based recommendations (active space → related)
    if (activeSpaceId) {
      try {
        const ids = await invoke<string[]>("graph_related_spaces", {
          spaceId: activeSpaceId,
          limit: 5,
        });
        const items: PredictionItem[] = ids
          .map((id) => spaces.find((s) => s.id === id))
          .filter((s): s is SpaceSummary => s !== undefined)
          .map((s) => ({
            id: `g-${s.id}`,
            label: s.description,
            reason: `Related via graph · ${s.attention_mode} mode`,
            source: "graph",
          }));
        setRelated(items);
      } catch (e) {
        console.error("graph_related_spaces failed:", e);
        setRelated([]);
      }
    } else {
      setRelated([]);
    }

    setLoading(false);
  }, [activeSpaceId, spaces]);

  useEffect(() => {
    loadPredictions();
    const interval = setInterval(loadPredictions, 60_000);
    return () => clearInterval(interval);
  }, [loadPredictions]);

  const handleActivate = async (item: PredictionItem) => {
    if (item.source === "graph") {
      // Existing space — just navigate
      const realId = item.id.replace(/^g-/, "");
      setActiveSpace(realId, item.label);
      return;
    }

    // Temporal — create a fresh space and record the visit
    try {
      const spaceId = await invoke<string>("create_space", {
        description: item.label,
        mode: "open",
        ephemeral: false,
      });
      const now = new Date();
      await invoke("record_visit", {
        description: item.label,
        visitedAt: Math.floor(now.getTime() / 1000),
        hourOfDay: now.getHours(),
      });
      const updated = await invoke<SpaceSummary[]>("list_spaces");
      setSpaces(updated);
      setActiveSpace(spaceId, item.label);
      loadPredictions();
    } catch (e) {
      console.error("activatePrediction failed:", e);
    }
  };

  return (
    <ModuleShell idx={idx} accent={accent} focused={focused} anyFocused={anyFocused} onFocus={onFocus}>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 440 }}>
        <ModuleHeader kind="ai" source="Predictive" time={`${hour.toString().padStart(2, "0")}:00`} />
        <div style={{ padding: "20px 28px 24px", flex: 1, overflowY: "auto" }}>
          <PredictionBoard
            time={`${hour.toString().padStart(2, "0")}:00`}
            headline={headline}
            predictions={predictions}
            related={related}
            loading={loading}
            onActivate={handleActivate}
          />
        </div>
      </div>
    </ModuleShell>
  );
}
