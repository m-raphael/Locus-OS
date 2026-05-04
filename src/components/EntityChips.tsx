import { motion, AnimatePresence } from "motion/react";
import type { NlpEntity, EntityLabel } from "./LocusBar";

const LABEL_COLORS: Record<EntityLabel, { bg: string; text: string }> = {
  Person:  { bg: "rgba(107, 172, 232, 0.18)", text: "#6BACE8" },
  Org:     { bg: "rgba(98, 195, 125, 0.18)",  text: "#62C37D" },
  Loc:     { bg: "rgba(232, 180, 107, 0.18)", text: "#E8B46B" },
  Date:    { bg: "rgba(178, 107, 232, 0.18)", text: "#B26BE8" },
  Time:    { bg: "rgba(178, 107, 232, 0.18)", text: "#B26BE8" },
  Money:   { bg: "rgba(232, 107, 107, 0.18)", text: "#E86B6B" },
  Product: { bg: "rgba(107, 200, 232, 0.18)", text: "#6BC8E8" },
  Misc:    { bg: "rgba(128, 128, 128, 0.12)", text: "var(--muted)" },
};

const chipVariants = {
  hidden: { opacity: 0, y: 6, scale: 0.92 },
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
  const visible = entities.filter((e) => e.label !== "Misc");
  if (visible.length === 0) return null;

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6,
      marginBottom: 8, paddingLeft: 4,
    }}>
      <AnimatePresence mode="popLayout">
        {visible.map((entity, i) => {
          const color = LABEL_COLORS[entity.label] ?? LABEL_COLORS.Misc;
          return (
            <motion.div
              key={`${entity.text}-${entity.label}`}
              custom={i}
              variants={chipVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              layout
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px 4px 8px",
                borderRadius: 999,
                background: color.bg,
                border: `1px solid ${color.text}28`,
                backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
                cursor: "default",
                userSelect: "none",
              }}
              title={`${entity.label} · score ${Math.round(entity.score * 100)}%`}
            >
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: color.text, flexShrink: 0,
                boxShadow: `0 0 6px ${color.text}88`,
              }} />
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: color.text, letterSpacing: "-0.01em",
                fontFamily: "var(--font-sans)",
              }}>{entity.text}</span>
              <span style={{
                fontSize: 9, textTransform: "uppercase", letterSpacing: "0.12em",
                color: color.text, opacity: 0.65,
                fontFamily: "var(--font-mono)",
              }}>{entity.label}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
