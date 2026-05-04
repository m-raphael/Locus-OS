import { motion } from "motion/react";

const CHIPS = ["Review Inbox", "Draft response", "Plan trip", "Find apartments"];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.2 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function IdleView() {
  return (
    <div style={{
      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      paddingBottom: 200,
    }}>
      <motion.div
        initial="hidden"
        animate="show"
        variants={container}
        style={{ textAlign: "center", maxWidth: 640, padding: "0 32px" }}
      >
        <motion.div
          variants={item}
          style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--muted)", fontFamily: "var(--font-mono)", marginBottom: 24 }}
        >
          good afternoon
        </motion.div>

        <motion.h1
          variants={item}
          style={{
            fontSize: 88, lineHeight: 0.95, fontWeight: 600,
            letterSpacing: "-0.04em", color: "var(--text)",
          }}
        >
          What's on<br/>your mind?
        </motion.h1>

        <motion.p
          variants={item}
          style={{ marginTop: 28, fontSize: 15, lineHeight: 1.6, color: "var(--muted)" }}
        >
          Type an intention below. LOTUS will assemble the modules
          you need into a Space — no apps, no hunting.
        </motion.p>

        <motion.div
          variants={item}
          style={{ marginTop: 40, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {CHIPS.map((s) => (
            <motion.span
              key={s}
              whileHover={{ scale: 1.08, y: -3, backgroundColor: "rgba(128,128,128,0.12)" }}
              style={{
                padding: "8px 16px", fontSize: 12, borderRadius: 999,
                background: "var(--chip-bg)", color: "var(--muted)",
                fontFamily: "var(--font-mono)", cursor: "default",
              }}
            >{s}</motion.span>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
