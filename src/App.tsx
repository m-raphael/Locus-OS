import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLocusStore } from "./store";
import LotusCanvas from "./components/LotusCanvas";
import TopChrome from "./components/TopChrome";
import SpaceRail from "./components/SpaceRail";
import IdleView from "./components/IdleView";
import SpaceView from "./components/SpaceView";
import LocusBar from "./components/LocusBar";
import CollabBar, { useCollabSession } from "./components/CollabBar";
import GovernanceChip from "./components/GovernanceChip";
import FocusGoalBar from "./components/FocusGoalBar";

export default function App() {
  const { isDark, accent, activeSpaceLabel, setBackendLabel } = useLocusStore();
  const collab = useCollabSession();

  useEffect(() => {
    document.getElementById("root")?.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Poll backend status once on mount (light — just a status read)
  useEffect(() => {
    invoke<{ selected: string }>("backend_status")
      .then((s) => setBackendLabel(s.selected.toUpperCase() as "NPU" | "NIM" | "KEY"))
      .catch(() => setBackendLabel("KEY"));
  }, [setBackendLabel]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", fontFamily: "var(--font-sans)" }}>
      <LotusCanvas accent={accent} />
      <TopChrome />
      <SpaceRail />
      {activeSpaceLabel ? <SpaceView collab={collab} /> : <IdleView />}
      <CollabBar session={collab} />
      <GovernanceChip />
      <FocusGoalBar />
      <LocusBar />
    </div>
  );
}
