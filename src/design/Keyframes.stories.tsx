import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

const ANIMATIONS: { name: string; description: string; demo: string }[] = [
  { name: "lotusFloatIn",   description: "Module entry: float up + soft blur lift.", demo: "1 lotusFloatIn 700ms cubic-bezier(.22,.9,.32,1)" },
  { name: "lotusBob",       description: "Idle bob for the centre prompt; centred translate.", demo: "infinite alternate lotusBob 4s ease-in-out" },
  { name: "lotusBlobA",     description: "Atmosphere blob drift A.", demo: "infinite lotusBlobA 22s ease-in-out" },
  { name: "lotusBlobB",     description: "Atmosphere blob drift B.", demo: "infinite lotusBlobB 28s ease-in-out" },
  { name: "lotusBlobC",     description: "Atmosphere blob drift C.", demo: "infinite lotusBlobC 32s ease-in-out" },
  { name: "lotusFadeIn",    description: "Vanilla opacity fade.", demo: "1 lotusFadeIn 600ms ease-out" },
  { name: "lotusPulse",     description: "Status indicator pulse (NPU/NIM badges).", demo: "infinite lotusPulse 2s ease-in-out" },
  { name: "lotusDrift",     description: "Subtle vertical drift used for ambient hints.", demo: "infinite lotusDrift 6s ease-in-out" },
  { name: "lotusSpaceRise", description: "Spaceflow → Flow transition (z-axis push back).", demo: "1 lotusSpaceRise 900ms cubic-bezier(.22,.9,.32,1)" },
  { name: "lotusStackIn",   description: "Apartment-stack card entrance (3D tilt).", demo: "1 lotusStackIn 800ms cubic-bezier(.22,.9,.32,1)" },
  { name: "lotusRowIn",     description: "Row entry inside a stacked card.", demo: "1 lotusRowIn 500ms cubic-bezier(.22,.9,.32,1)" },
  { name: "lotusBarUp",     description: "Locus command bar entry (scaleY from bottom).", demo: "1 lotusBarUp 400ms cubic-bezier(.22,.9,.32,1)" },
];

const meta: Meta = {
  title: "Design tokens / Motion · keyframes",
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj;

export const Catalogue: Story = {
  render: () => {
    const [tick, setTick] = useState(0);
    return (
      <div style={{
        minHeight: "100vh", padding: 32,
        background: "var(--lotus-bg-gradient)",
        fontFamily: "var(--lotus-font-display)", color: "var(--lotus-text)",
      }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>
              Motion · keyframes
            </h1>
            <p style={{ margin: "4px 0 0", color: "var(--lotus-text-muted)", fontSize: 13 }}>
              Click a card to replay its animation. Sources of truth live in <code style={{ fontFamily: "var(--lotus-font-mono)" }}>src/design/keyframes.css</code>.
            </p>
          </div>
          <button onClick={() => setTick(t => t + 1)}
            style={{
              padding: "10px 16px", borderRadius: "var(--lotus-radius-pill)",
              background: "var(--lotus-accent)", color: "var(--lotus-text-on-accent)",
              border: "none", cursor: "pointer", fontWeight: 500, fontSize: 13,
            }}>
            Replay all
          </button>
        </header>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}>
          {ANIMATIONS.map(a => (
            <button key={a.name + tick}
              onClick={() => setTick(t => t + 1)}
              style={{
                position: "relative", textAlign: "left", border: "none", cursor: "pointer",
                padding: 18, borderRadius: 18, minHeight: 180,
                background: "var(--lotus-surface-base)",
                backdropFilter: "blur(28px) saturate(1.4)",
                boxShadow: "var(--lotus-shadow-glass)",
                color: "var(--lotus-text)",
                overflow: "hidden",
              }}>
              <div style={{
                position: "absolute", inset: "auto 16px 16px auto",
                width: 56, height: 56, borderRadius: 14,
                background: "linear-gradient(135deg, var(--lotus-accent), var(--lotus-accent-strong))",
                animation: a.demo,
              }} />
              <div style={{
                fontFamily: "var(--lotus-font-mono)",
                fontSize: 11, letterSpacing: "0.12em",
                color: "var(--lotus-text-muted)", textTransform: "uppercase",
              }}>keyframe</div>
              <div style={{ fontFamily: "var(--lotus-font-mono)", fontSize: 14, fontWeight: 500, marginTop: 4 }}>
                {a.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--lotus-text-muted)", marginTop: 6, maxWidth: "70%" }}>
                {a.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  },
};
