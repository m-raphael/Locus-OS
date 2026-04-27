import LocusBar from "./components/LocusBar";
import SpaceView from "./components/SpaceView";

export default function App() {
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <SpaceView />
      <LocusBar />
    </div>
  );
}
