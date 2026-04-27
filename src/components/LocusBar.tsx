import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLocusStore, AttentionMode, SpaceSummary } from "../store";

const BAR: React.CSSProperties = {
  position: "fixed",
  bottom: 32,
  left: "50%",
  transform: "translateX(-50%)",
  width: "min(680px, 80vw)",
  background: "var(--fog-bg)",
  backdropFilter: "var(--fog-blur)",
  WebkitBackdropFilter: "var(--fog-blur)",
  border: "var(--fog-border)",
  borderRadius: "var(--fog-radius-bar)",
  boxShadow: "var(--fog-shadow)",
  padding: "12px 20px",
  display: "flex",
  alignItems: "center",
  gap: 12,
  transition: `all var(--motion-duration) var(--motion-ease)`,
  zIndex: 1000,
};

const INPUT: React.CSSProperties = {
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  fontSize: 15,
  color: "rgba(255,255,255,0.9)",
  caretColor: "rgba(255,255,255,0.7)",
  fontFamily: "inherit",
  letterSpacing: "0.01em",
};

const HINT: React.CSSProperties = {
  fontSize: 11,
  color: "rgba(255,255,255,0.35)",
  whiteSpace: "nowrap",
  userSelect: "none",
};

function applyModeToRoot(mode: AttentionMode) {
  document.getElementById("root")?.setAttribute("data-mode", mode);
}

export default function LocusBar() {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { spaces, setSpaces, setActiveSpace, setBarFocused, isBarFocused, updateSpaceMode } =
    useLocusStore();

  // Sync active-space mode to root data-mode attribute
  const activeId = useLocusStore((s) => s.activeSpaceId);
  useEffect(() => {
    const active = spaces.find((sp) => sp.id === activeId);
    applyModeToRoot(active?.attention_mode ?? "open");
  }, [activeId, spaces]);

  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setBarFocused(true);
      }
      if (e.key === "Escape" && isBarFocused) {
        inputRef.current?.blur();
        setValue("");
        setBarFocused(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isBarFocused, setBarFocused]);

  const dispatch = async () => {
    const raw = value.trim();
    if (!raw) return;

    const intent = await invoke<{
      verb: string;
      subject: string | null;
      confidence: number;
    }>("parse_intent", { input: raw });

    if (intent.verb === "open" || intent.verb === "unknown") {
      const description = intent.subject ?? raw;
      const spaceId = await invoke<string>("create_space", {
        description,
        mode: "open",
        ephemeral: false,
      });
      // Auto-create default flow so Flows render immediately
      await invoke("create_flow", { spaceId, orderIndex: 0 });
      const updated = await invoke<SpaceSummary[]>("list_spaces");
      setSpaces(updated);
      setActiveSpace(spaceId);
    }

    if (intent.verb === "mode" && intent.subject) {
      const { activeSpaceId } = useLocusStore.getState();
      if (activeSpaceId) {
        const mode = intent.subject as AttentionMode;
        await invoke("set_space_mode", { spaceId: activeSpaceId, mode });
        updateSpaceMode(activeSpaceId, mode);
        applyModeToRoot(mode);
      }
    }

    setValue("");
    inputRef.current?.blur();
    setBarFocused(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") dispatch();
  };

  return (
    <div style={BAR}>
      <input
        ref={inputRef}
        style={INPUT}
        placeholder="What would you like to do?"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setBarFocused(true)}
        onBlur={() => setBarFocused(false)}
        spellCheck={false}
        autoComplete="off"
      />
      <span style={HINT}>⌘K</span>
    </div>
  );
}
