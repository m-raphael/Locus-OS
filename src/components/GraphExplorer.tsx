import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { invoke } from "@tauri-apps/api/core";
import { GraphExplorerPanel, type GraphNode } from "../design";
import { useLocusStore, SpaceSummary } from "../store";

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, x: 16 },
  show: { opacity: 1, scale: 1, x: 0, transition: { type: "spring" as const, stiffness: 380, damping: 28 } },
  exit: { opacity: 0, scale: 0.95, x: 16, transition: { duration: 0.18 } },
};

function truncate(s: string, n = 22) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function spaceToNode(s: SpaceSummary): GraphNode {
  return { id: s.id, label: s.description };
}

export default function GraphExplorer() {
  const [open, setOpen] = useState(false);
  const [related, setRelated] = useState<GraphNode[]>([]);
  const [pathLabels, setPathLabels] = useState<string[]>([]);
  const { activeSpaceId, spaces, setActiveSpace } = useLocusStore();

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) ?? null;

  const fetchGraph = useCallback(async () => {
    if (!activeSpaceId || !activeSpace) { setRelated([]); setPathLabels([]); return; }
    try {
      const [relatedIds, pathIds] = await Promise.all([
        invoke<string[]>("graph_related_spaces", { spaceId: activeSpaceId, limit: 6 }),
        invoke<string[]>("graph_attention_path", { spaceId: activeSpaceId, mode: activeSpace.attention_mode }),
      ]);
      const relatedSpaces = relatedIds
        .map((id) => spaces.find((s) => s.id === id))
        .filter((s): s is SpaceSummary => s !== undefined)
        .map(spaceToNode);
      setRelated(relatedSpaces);
      setPathLabels(
        pathIds
          .map((id) => spaces.find((s) => s.id === id)?.description ?? id.slice(0, 8))
          .map((l) => truncate(l, 18))
      );
    } catch {
      setRelated([]);
      setPathLabels([]);
    }
  }, [activeSpaceId, activeSpace, spaces]);

  useEffect(() => {
    if (open) fetchGraph();
  }, [open, fetchGraph]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSelect = (node: GraphNode) => {
    setActiveSpace(node.id, node.label);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={panelVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          style={{ position: "fixed", top: 56, right: 20, zIndex: 40 }}
        >
          <GraphExplorerPanel
            center={activeSpace ? spaceToNode(activeSpace) : undefined}
            related={related}
            pathLabels={pathLabels}
            onSelect={handleSelect}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
