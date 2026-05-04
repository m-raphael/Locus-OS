import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { invoke } from "@tauri-apps/api/core";

interface GovernanceSummary {
  max_input_len: number;
  max_intents_per_minute: number;
  intents_this_minute: number;
  allow_ai_inference: boolean;
  allow_native_apps: boolean;
}

export default function GovernanceChip() {
  const [summary, setSummary] = useState<GovernanceSummary | null>(null);

  useEffect(() => {
    const load = () => invoke<GovernanceSummary>("governance_summary")
      .then(setSummary).catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  if (!summary) return null;

  const used = summary.intents_this_minute;
  const max = summary.max_intents_per_minute;
  const pct = Math.min(used / max, 1);
  const nearLimit = pct > 0.75;
  const aiOn = summary.allow_ai_inference;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      title={`${used}/${max} intents this minute · AI inference ${aiOn ? "on" : "off"}`}
      style={{
        position: "fixed", top: 20, right: 24, zIndex: 40,
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 10px 5px 8px",
        borderRadius: 999,
        background: "var(--locus-bg)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        boxShadow: "var(--locus-shadow)",
        fontSize: 10, fontFamily: "var(--font-mono)",
        color: "var(--muted)",
      }}
    >
      {/* Shield icon */}
      <motion.svg
        width="11" height="11" viewBox="0 0 24 24" fill="none"
        stroke={nearLimit ? "#e05c5c" : aiOn ? "#5cb87a" : "var(--muted)"}
        strokeWidth="2.2"
        animate={nearLimit ? { scale: [1, 1.15, 1], opacity: [1, 0.7, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </motion.svg>

      {/* Rate bar */}
      <div style={{
        width: 28, height: 3, borderRadius: 2,
        background: "var(--chip-bg)", overflow: "hidden",
      }}>
        <motion.div
          animate={{ width: `${pct * 100}%`, backgroundColor: nearLimit ? "#e05c5c" : "#5cb87a" }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          style={{ height: "100%", borderRadius: 2 }}
        />
      </div>

      {/* AI indicator */}
      <motion.span
        animate={{
          backgroundColor: aiOn ? "#5cb87a" : "#e05c5c",
          boxShadow: aiOn ? "0 0 6px #5cb87a88" : "none",
        }}
        transition={{ duration: 0.3 }}
        style={{
          height: 5, width: 5, borderRadius: "50%", flexShrink: 0,
        }}
      />
    </motion.div>
  );
}
