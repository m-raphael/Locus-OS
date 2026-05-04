import { motion, AnimatePresence } from "motion/react";
import { EntityChip } from "../design";
import type { EntityKind } from "../design";
import type { NlpEntity, EntityLabel } from "./LocusBar";

// Map NLP backend labels → design-system EntityKind
const LABEL_MAP: Partial<Record<EntityLabel, EntityKind>> = {
  Person:  "Person",
  Org:     "Organization",
  Loc:     "Place",
  Date:    "Date",
  Time:    "Date",
  Product: "Topic",
};

const chipVariants = {
  hidden: { opacity: 0, y: 6, scale: 0.9 },
  show: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring" as const, stiffness: 420, damping: 26, delay: i * 0.045 },
  }),
  exit: { opacity: 0, scale: 0.88, transition: { duration: 0.12 } },
};

interface Props {
  entities: NlpEntity[];
}

export default function EntityChips({ entities }: Props) {
  const chips = entities
    .map((e) => ({ entity: e, kind: LABEL_MAP[e.label] }))
    .filter((c): c is { entity: NlpEntity; kind: EntityKind } => c.kind !== undefined);

  if (chips.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, paddingLeft: 4 }}>
      <AnimatePresence mode="popLayout">
        {chips.map(({ entity, kind }, i) => (
          <motion.span
            key={`${entity.text}-${entity.label}`}
            custom={i}
            variants={chipVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            layout
          >
            <EntityChip kind={kind} label={entity.text} title={`score ${Math.round(entity.score * 100)}%`} />
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
