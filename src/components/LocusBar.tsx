import { useEffect, useRef, useState, KeyboardEvent, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useLocusStore, buildSuggestions, Suggestion, SpaceSummary } from "../store";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

interface AgentResult {
  action: { action: string; mode?: string };
  message: string;
  new_space_id: string | null;
  suggested_next: string | null;
}

export default function LocusBar() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(false);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { activeSpaceLabel, activeSpaceId, accent, setSpaces, setActiveSpace, setBarFocused, updateSpaceMode, setSuggestedNext, setLegacyAppContext } = useLocusStore();

  const suggestions = buildSuggestions(query);

  // Voice: final speech result → submit as raw text intent
  const runText = useCallback(async (text: string) => {
    setQuery("");
    setActive(false);
    inputRef.current?.blur();
    try {
      const result = await invoke<AgentResult>("run_agent", { input: text, activeSpaceId });
      const updated = await invoke<SpaceSummary[]>("list_spaces");
      setSpaces(updated);
      if (result.new_space_id) setActiveSpace(result.new_space_id, text);
      setSuggestedNext(result.suggested_next);
      if (result.action.action === "set_mode" && activeSpaceId && result.action.mode)
        updateSpaceMode(activeSpaceId, result.action.mode as never);
    } catch {
      setActiveSpace("preview-" + Date.now(), text);
    }
  }, [activeSpaceId, setSpaces, setActiveSpace, setSuggestedNext, updateSpaceMode]);

  const { state: micState, isSupported: micSupported, toggle: toggleMic } = useSpeechRecognition({
    onFinalResult: runText,
    onInterimResult: (t) => { setQuery(t); setActive(false); },
  });

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setActive(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const execute = async (s: Suggestion) => {
    const label = `${s.verb} ${s.noun}`;
    setQuery("");
    setActive(false);
    inputRef.current?.blur();

    try {
      const result = await invoke<AgentResult>("run_agent", {
        input: label,
        activeSpaceId,
      });
      const updated = await invoke<SpaceSummary[]>("list_spaces");
      setSpaces(updated);
      if (result.new_space_id) {
        setActiveSpace(result.new_space_id, label);
      }
      setSuggestedNext(result.suggested_next);
      if (result.action.action === "set_mode" && activeSpaceId && result.action.mode) {
        updateSpaceMode(activeSpaceId, result.action.mode as never);
      }
      if (result.action.action === "launch_legacy_app") {
        const a = result.action as { action: string; name: string; path: string };
        setLegacyAppContext({ name: a.name, path: a.path });
      } else {
        setLegacyAppContext(null);
      }
    } catch (e) {
      // Backend unavailable in dev — still navigate to the space visually
      setActiveSpace("preview-" + Date.now(), label);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(Math.min(sel + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(Math.max(sel - 1, 0)); }
    else if (e.key === "Enter" && suggestions[sel]) { e.preventDefault(); execute(suggestions[sel]); }
  };

  return (
    <div style={{
      position: "fixed", bottom: 38, left: "50%", transform: "translateX(-50%)",
      width: "min(680px, 92%)", zIndex: 30,
    }}>
      {/* Autocomplete dropdown */}
      {active && suggestions.length > 0 && (
        <div style={{
          marginBottom: 12, borderRadius: 24, overflow: "hidden",
          background: "var(--dropdown-bg)",
          backdropFilter: "blur(28px) saturate(1.4)", WebkitBackdropFilter: "blur(28px) saturate(1.4)",
          boxShadow: `0 0 0 1px var(--glass-border), 0 30px 80px -20px ${accent}55, 0 12px 40px -10px rgba(0,0,0,0.15)`,
          animation: "lotusFloatIn 280ms var(--motion-float)",
        }}>
          <div style={{ padding: "16px 20px 8px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>Intents</div>
          {suggestions.map((s, i) => (
            <div key={i}
              onMouseEnter={() => setSel(i)}
              onMouseDown={(e) => { e.preventDefault(); execute(s); }}
              style={{
                padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                cursor: "pointer",
                background: i === sel ? "var(--dropdown-row-active)" : "transparent",
                transition: `background 150ms`,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--text)" }}>{s.verb}</span>
                <span style={{ fontSize: 16, color: "var(--muted)" }}>{s.noun}</span>
              </div>
              <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                {s.match === "verb" ? "intent" : s.match === "noun" ? "object" : "fuzzy"}
              </span>
            </div>
          ))}
          <div style={{
            padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)",
            borderTop: "1px solid var(--dropdown-divider)",
          }}>
            <span>↑↓ navigate · ↵ execute · esc close</span>
            <span>LOTUS · intent v0.1</span>
          </div>
        </div>
      )}

      {/* Locus pill */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "16px 24px",
        borderRadius: "var(--locus-radius)",
        background: "var(--locus-bg)",
        backdropFilter: "blur(28px) saturate(1.4)", WebkitBackdropFilter: "blur(28px) saturate(1.4)",
        boxShadow: active ? "var(--locus-shadow-active)" : "var(--locus-shadow)",
        transform: active ? "translateY(-2px)" : "translateY(0)",
        transition: `box-shadow 500ms var(--motion-ui), transform 500ms var(--motion-ui)`,
      }}>
        {/* Space indicator */}
        <div style={{ display: "flex", height: 28, alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ height: 6, width: 6, borderRadius: "50%", background: accent, boxShadow: `0 0 10px ${accent}` }}/>
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            {activeSpaceLabel || "Locus"}
          </span>
        </div>
        {/* Divider */}
        <div style={{ height: 20, width: 1, background: "rgba(128,128,128,0.15)", flexShrink: 0 }}/>
        {/* Input */}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSel(0); setBarFocused(true); }}
          onFocus={() => { setActive(true); setBarFocused(true); }}
          onBlur={() => setTimeout(() => { setActive(false); setBarFocused(false); }, 150)}
          onKeyDown={onKeyDown}
          placeholder="Type an intention or press ⌘…"
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            fontSize: 16, letterSpacing: "-0.01em", color: "var(--text)",
            caretColor: accent, fontFamily: "var(--font-sans)",
          }}
        />
        {/* Mic button */}
        {micSupported && (
          <button
            onClick={toggleMic}
            title={micState === "listening" ? "Stop listening" : "Voice input"}
            style={{
              height: 28, width: 28, borderRadius: "50%", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              background: micState === "listening" ? accent : "var(--chip-bg)",
              color: micState === "listening" ? "#fff" : "var(--muted)",
              boxShadow: micState === "listening" ? `0 0 12px ${accent}88` : "none",
              transition: `all 300ms var(--motion-ui)`,
            }}
          >
            {micState === "listening" ? (
              // Animated bars when listening
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <rect x="0" y="3" width="2" height="6" rx="1" opacity="0.6">
                  <animate attributeName="height" values="6;10;6" dur="0.6s" repeatCount="indefinite"/>
                  <animate attributeName="y" values="3;1;3" dur="0.6s" repeatCount="indefinite"/>
                </rect>
                <rect x="5" y="1" width="2" height="10" rx="1">
                  <animate attributeName="height" values="10;5;10" dur="0.6s" begin="0.15s" repeatCount="indefinite"/>
                  <animate attributeName="y" values="1;3.5;1" dur="0.6s" begin="0.15s" repeatCount="indefinite"/>
                </rect>
                <rect x="10" y="3" width="2" height="6" rx="1" opacity="0.6">
                  <animate attributeName="height" values="6;10;6" dur="0.6s" begin="0.3s" repeatCount="indefinite"/>
                  <animate attributeName="y" values="3;1;3" dur="0.6s" begin="0.3s" repeatCount="indefinite"/>
                </rect>
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/>
                <path d="M5 10a7 7 0 0 0 14 0M12 19v3M9 22h6"/>
              </svg>
            )}
          </button>
        )}
        {/* Hint */}
        <kbd style={{
          padding: "2px 6px", borderRadius: 6, fontSize: 10,
          background: "var(--chip-bg)", color: "var(--muted)",
          fontFamily: "var(--font-mono)", flexShrink: 0,
        }}>⌘ K</kbd>
      </div>
    </div>
  );
}
