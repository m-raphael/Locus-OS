import { useEffect } from "react";
import { useLocusStore } from "./store";
import LotusCanvas from "./components/LotusCanvas";
import TopChrome from "./components/TopChrome";
import SpaceRail from "./components/SpaceRail";
import IdleView from "./components/IdleView";
import SpaceView from "./components/SpaceView";
import LocusBar from "./components/LocusBar";

export default function App() {
  const { isDark, accent, activeSpaceLabel } = useLocusStore();

  // Sync dark mode to root data attribute for CSS vars
  useEffect(() => {
    document.getElementById("root")?.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", fontFamily: "var(--font-sans)" }}>
      <LotusCanvas accent={accent} />
      <TopChrome />
      <SpaceRail />
      {activeSpaceLabel ? <SpaceView /> : <IdleView />}
      <LocusBar />
    </div>
  );
}
