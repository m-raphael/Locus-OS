import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { invoke } from "@tauri-apps/api/core";
import {
  TransitionTimeline as TransitionTimelinePanel,
  type TransitionEvent,
  type TransitionKind,
} from "../design";
import { useLocusStore } from "../store";

interface AuditLog {
  id: string;
  event_type: string;
  actor: string | null;
  resource_id: string | null;
  details: string | null;
  created_at: number;
}

const EVENT_KIND: Record<string, TransitionKind> = {
  space_created:        "created",
  mode_changed:         "mode",
  space_dismissed:      "dismissed",
  legacy_app_launched:  "launched",
  legacy_app_quit:      "launched",
  memory_stored:        "memory",
  memory_forgotten:     "memory",
  plugin_installed:     "plugin",
  plugin_uninstalled:   "plugin",
  plugin_toggled:       "plugin",
  focus_goal_created:   "focus",
  focus_goal_activated: "focus",
  focus_goal_cleared:   "focus",
};

function modeFromDetails(details: string | null): string | null {
  if (!details) return null;
  const m = details.match(/mode=(\w+)/);
  return m ? m[1].toLowerCase() : null;
}

const panelVariants = {
  hidden: { opacity: 0, scale: 0.96, x: -16 },
  show: { opacity: 1, scale: 1, x: 0, transition: { type: "spring" as const, stiffness: 380, damping: 28 } },
  exit: { opacity: 0, scale: 0.96, x: -16, transition: { duration: 0.18 } },
};

export default function TransitionTimeline() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<TransitionEvent[]>([]);
  const { spaces } = useLocusStore();

  const fetchAudit = useCallback(async () => {
    try {
      const logs = await invoke<AuditLog[]>("list_audit_logs", { eventType: null, limit: 40 });
      const mapped = logs
        .filter((log) => EVENT_KIND[log.event_type])
        .map<TransitionEvent>((log) => {
          const kind = EVENT_KIND[log.event_type];
          const space = log.resource_id ? spaces.find((s) => s.id === log.resource_id) : null;
          const label = space?.description ?? log.details ?? log.event_type;

          let sublabel: string | undefined;
          if (log.event_type === "mode_changed") {
            const m = modeFromDetails(log.details);
            sublabel = m ? `mode → ${m}` : "mode change";
          } else if (log.event_type === "space_created") {
            sublabel = log.details ?? undefined;
          } else if (log.event_type.startsWith("plugin_")) {
            sublabel = `${log.event_type.replace("plugin_", "")} · ${log.details ?? ""}`.trim();
          } else if (log.event_type.startsWith("focus_goal_")) {
            sublabel = log.event_type.replace("focus_goal_", "goal ").replace("_", " ");
          } else if (log.event_type.startsWith("legacy_app_")) {
            sublabel = log.event_type.replace("legacy_app_", "app ");
          } else if (log.event_type.startsWith("memory_")) {
            sublabel = log.event_type.replace("memory_", "memory ");
          }

          return { id: log.id, kind, label, sublabel, timestamp: log.created_at };
        });
      setEvents(mapped);
    } catch {
      setEvents([]);
    }
  }, [spaces]);

  useEffect(() => {
    if (open) fetchAudit();
  }, [open, fetchAudit]);

  // Refresh every 15s while open
  useEffect(() => {
    if (!open) return;
    const t = setInterval(fetchAudit, 15000);
    return () => clearInterval(t);
  }, [open, fetchAudit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "t") {
        // Avoid clashing with browser-style "new tab" only if we're inside the app
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          style={{ position: "fixed", top: 56, left: 20, zIndex: 40 }}
        >
          <TransitionTimelinePanel events={events} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
