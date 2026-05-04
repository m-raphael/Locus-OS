import { useEffect, useRef, useState, KeyboardEvent, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { invoke } from "@tauri-apps/api/core";
import { useLocusStore, buildSuggestions, Suggestion, SpaceSummary } from "../store";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

interface Memory { id: string; content: string; created_at: number; }

interface AgentResult {
  action: { action: string; mode?: string };
  message: string;
  new_space_id: string | null;
  suggested_next: string | null;
}

interface OrchestratorResult {
  tasks: { id: string; prompt: string; result: { message: string; new_space_id: string | null } | null; error: string | null }[];
  primary_space_id: string | null;
  summary: string;
}

const COMPOUND_SEPS = [" and ", " then ", " also ", "; ", " + "];
function compoundTaskCount(q: string): number {
  let parts = [q.toLowerCase()];
  for (const sep of COMPOUND_SEPS) parts = parts.flatMap((p) => p.split(sep)).filter(Boolean);
  return Math.max(parts.length, 1);
}

const dropdownVariants = {
  hidden: { opacity: 0, scaleY: 0.92, originY: 1 },
  show: {
    opacity: 1, scaleY: 1, originY: 1,
    transition: { duration: 0.22, ease: [0.22, 0.9, 0.32, 1] as const },
  },
  exit: {
    opacity: 0, scaleY: 0.92, originY: 1,
    transition: { duration: 0.16 },
  },
};

const hintVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.14 } },
};

const orchContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const orchItem = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 400, damping: 25 } },
};

export default function LocusBar() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(false);
  const [sel, setSel] = useState(0);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [orchestrating, setOrchestrating] = useState(false);
  const [orchTasks, setOrchTasks] = useState<OrchestratorResult["tasks"]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { activeSpaceLabel, activeSpaceId, accent, setSpaces, setActiveSpace, setBarFocused, updateSpaceMode, setSuggestedNext, setLegacyAppContext } = useLocusStore();

  const suggestions = buildSuggestions(query);

  // Recall memories on focus, or search when typing
  useEffect(() => {
    if (!active) return;
    const load = async () => {
      try {
        const results: Memory[] = query.trim()
          ? await invoke("search_memories", { query, limit: 4 })
          : await invoke("list_memories", { limit: 4 });
        setMemories(results);
      } catch { setMemories([]); }
    };
    load();
  }, [query, active]);

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

  const runOrchestrate = useCallback(async (text: string) => {
    setQuery("");
    setActive(false);
    setOrchestrating(true);
    inputRef.current?.blur();
    try {
      const result = await invoke<OrchestratorResult>("run_orchestrator", { input: text, activeSpaceId });
      setOrchTasks(result.tasks);
      const updated = await invoke<SpaceSummary[]>("list_spaces");
      setSpaces(updated);
      if (result.primary_space_id) setActiveSpace(result.primary_space_id, text);
      setSuggestedNext(null);
      setTimeout(() => { setOrchTasks([]); setOrchestrating(false); }, 4000);
    } catch {
      setActiveSpace("preview-" + Date.now(), text);
      setOrchestrating(false);
    }
  }, [activeSpaceId, setSpaces, setActiveSpace, setSuggestedNext]);

  const { state: micState, isSupported: micSupported, toggle: toggleMic } = useSpeechRecognition({
    onFinalResult: runText,
    onInterimResult: (t) => { setQuery(t); setActive(false); },
  });

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      // Cmd+K / Ctrl+K — focus Locus bar (works on macOS)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setActive(true);
        inputRef.current?.focus();
      }
      // Cmd+/ / Ctrl+/ — toggle Locus bar focus
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        if (document.activeElement === inputRef.current) {
          inputRef.current?.blur();
          setActive(false);
          setQuery("");
        } else {
          setActive(true);
          inputRef.current?.focus();
        }
      }
      // Alt+Space — toggle Locus bar focus (macOS-safe fallback)
      if (e.altKey && e.key === " ") {
        e.preventDefault();
        if (document.activeElement === inputRef.current) {
          inputRef.current?.blur();
          setActive(false);
          setQuery("");
        } else {
          setActive(true);
          inputRef.current?.focus();
        }
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
        const a = result.action as { action: string; name: string; path: string; bundle_id: string };
        setLegacyAppContext({ name: a.name, path: a.path, bundleId: a.bundle_id ?? "" });
      } else {
        setLegacyAppContext(null);
      }
    } catch (e) {
      // Backend unavailable in dev — still navigate to the space visually
      setActiveSpace("preview-" + Date.now(), label);
    }
  };

  const taskCount = compoundTaskCount(query);
  const isCompound = query.trim().length > 0 && taskCount > 1;

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(Math.min(sel + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(Math.max(sel - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[sel]) { execute(suggestions[sel]); }
      else if (query.trim()) {
        isCompound ? runOrchestrate(query.trim()) : runText(query.trim());
      }
    }
  };

  return (
    <div style={{
      position: "fixed", bottom: 38, left: "50%", transform: "translateX(-50%)",
      width: "min(680px, 92%)", zIndex: 30,
    }}>
      {/* Autocomplete dropdown */}
      <AnimatePresence>
        {active && suggestions.length > 0 && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{
              marginBottom: 12, borderRadius: 24, overflow: "hidden",
              background: "var(--dropdown-bg)",
              backdropFilter: "blur(28px) saturate(1.4)", WebkitBackdropFilter: "blur(28px) saturate(1.4)",
              boxShadow: `0 0 0 1px var(--glass-border), 0 30px 80px -20px ${accent}55, 0 12px 40px -10px rgba(0,0,0,0.15)`,
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
          {memories.length > 0 && (
            <>
              <div style={{ padding: "10px 20px 4px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", fontFamily: "var(--font-mono)", borderTop: "1px solid var(--dropdown-divider)" }}>
                Recent
              </div>
              {memories.map((m) => (
                <div key={m.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setQuery(m.content);
                    setSel(0);
                  }}
                  style={{
                    padding: "8px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                    cursor: "pointer", fontSize: 13, color: "var(--muted)",
                    transition: "background 150ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--dropdown-row-active)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "85%" }}>{m.content}</span>
                  <button
                    onMouseDown={(e) => { e.stopPropagation(); invoke("forget_memory", { id: m.id }).then(() => setMemories(p => p.filter(x => x.id !== m.id))); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: 14, padding: "0 4px", flexShrink: 0 }}
                    title="Forget"
                  >×</button>
                </div>
              ))}
            </>
          )}
          <div style={{
            padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)",
            borderTop: "1px solid var(--dropdown-divider)",
          }}>
            <span>⌘K · ⌘/ · ↑↓ navigate · ↵ execute · esc close</span>
            <span>LOTUS · intent v0.1</span>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Compound-intent orchestrator hint */}
      <AnimatePresence>
        {isCompound && !orchestrating && (
          <motion.div
            variants={hintVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            style={{
              marginBottom: 8,
              padding: "9px 18px",
              borderRadius: 16,
              background: "var(--dropdown-bg)",
              backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              boxShadow: `0 0 0 1px var(--glass-border), 0 12px 40px -10px ${accent}33`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <span style={{ color: "var(--text)" }}>{taskCount} intents detected</span>
            <span>·</span>
            <span>orchestrator will run them in sequence</span>
          </div>
          <span
            onMouseDown={(e) => { e.preventDefault(); runOrchestrate(query.trim()); }}
            style={{ fontSize: 11, color: accent, fontFamily: "var(--font-mono)", cursor: "pointer", padding: "2px 8px", borderRadius: 999, background: `${accent}18`, border: `1px solid ${accent}33` }}
          >↵ run</span>
          </motion.div>
        )}
        </AnimatePresence>

      {/* Orchestrator task results */}
      <AnimatePresence>
        {orchTasks.length > 0 && (
          <motion.div
            variants={orchContainer}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: -8 }}
            style={{
          marginBottom: 8, borderRadius: 18, overflow: "hidden",
          background: "var(--dropdown-bg)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          boxShadow: `0 0 0 1px var(--glass-border), 0 16px 50px -12px ${accent}44`,
        }}>
          <div style={{ padding: "12px 18px 6px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            Orchestrator · {orchTasks.length} tasks
          </div>
          {orchTasks.map((t) => (
            <motion.div key={t.id} variants={orchItem} style={{
              padding: "8px 18px", display: "flex", alignItems: "center", gap: 10,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                background: t.error ? "#e05c5c" : t.result?.new_space_id ? accent : "var(--muted)",
                boxShadow: t.result?.new_space_id ? `0 0 8px ${accent}88` : "none",
              }}/>
              <span style={{ fontSize: 12, color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.prompt}</span>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: t.error ? "#e05c5c" : "var(--muted)", flexShrink: 0 }}>
                {t.error ? "err" : t.result ? "✓" : "…"}
              </span>
            </motion.div>
          ))}
        </motion.div>
      )}
      </AnimatePresence>

      {/* Locus pill */}
      <motion.div
        animate={{
          y: active ? -2 : 0,
          scale: active ? 1.01 : 1,
          boxShadow: active ? "var(--locus-shadow-active)" : "var(--locus-shadow)",
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "16px 24px",
          borderRadius: "var(--locus-radius)",
          background: "var(--locus-bg)",
          backdropFilter: "blur(28px) saturate(1.4)", WebkitBackdropFilter: "blur(28px) saturate(1.4)",
          boxShadow: "var(--locus-shadow)",
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
          placeholder="Type an intention or press ⌘K / ⌘/…"
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
      </motion.div>
    </div>
  );
}
