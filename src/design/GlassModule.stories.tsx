import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { GlassModule } from "./GlassModule";
import { LotusCanvas } from "./LotusCanvas";
import { EntityChip } from "./EntityChip";

const meta: Meta<typeof GlassModule> = {
  title: "Design system / GlassModule",
  component: GlassModule,
  parameters: { layout: "fullscreen" },
  argTypes: {
    cascadeIndex: { control: { type: "number", min: 0, max: 8, step: 1 } },
    focused:      { control: "boolean" },
    anyFocused:   { control: "boolean" },
    noAnimate:    { control: "boolean" },
  },
  args: {
    cascadeIndex: 0,
    focused: false,
    anyFocused: false,
    noAnimate: false,
  },
};
export default meta;

type Story = StoryObj<typeof GlassModule>;

const Backdrop: React.FC<{ children: React.ReactNode; height?: number | string }> = ({
  children, height = "calc(100vh - 48px)",
}) => (
  <div style={{ position: "relative", width: "100%", minHeight: height, padding: 32 }}>
    <LotusCanvas />
    <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
  </div>
);

export const Default: Story = {
  render: (args) => (
    <Backdrop>
      <GlassModule
        {...args}
        subtitle="NLP · Entities"
        title="Smart suggestions"
      >
        <p style={{ margin: 0, fontSize: 13, color: "var(--lotus-text)" }}>
          Draft response to <EntityChip kind="Person" label="Naomi" /> about{" "}
          <EntityChip kind="Topic" label="Q3 launch" /> by{" "}
          <EntityChip kind="Date" label="tomorrow 3pm" />.
        </p>
        <div style={{
          marginTop: 16, fontFamily: "var(--lotus-font-mono)", fontSize: 11,
          color: "var(--lotus-text-muted)",
        }}>
          5 entities · NER ms: 14
        </div>
      </GlassModule>
    </Backdrop>
  ),
};

export const FocusedVsDimmed: Story = {
  parameters: { controls: { exclude: ["focused", "anyFocused", "cascadeIndex"] } },
  render: (args) => (
    <Backdrop>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <GlassModule {...args} focused subtitle="state" title="Focused">
          <p style={{ margin: 0, fontSize: 13 }}>
            The active module reads at full opacity, sits on the brighter
            surface, and casts a deeper accent-tinted shadow. A subtle
            scale-up (1.015) pushes it forward.
          </p>
        </GlassModule>
        <GlassModule {...args} anyFocused subtitle="state" title="Dimmed">
          <p style={{ margin: 0, fontSize: 13 }}>
            Sibling cards drop to 0.42 opacity, gain a 2px blur, and
            scale down slightly (0.985) — focus pulls the eye to the
            active card without removing context.
          </p>
        </GlassModule>
      </div>
    </Backdrop>
  ),
};

export const Cascade: Story = {
  parameters: { controls: { exclude: ["focused", "anyFocused", "cascadeIndex", "noAnimate"] } },
  render: () => {
    const [tick, setTick] = useState(0);
    return (
      <Backdrop>
        <div style={{
          display: "flex", justifyContent: "space-between", marginBottom: 16,
        }}>
          <div style={{ color: "var(--lotus-text-muted)", fontSize: 13 }}>
            Five modules entering with 90 ms stagger between them.
          </div>
          <button onClick={() => setTick((t) => t + 1)}
            style={{
              padding: "8px 14px",
              borderRadius: "var(--lotus-radius-pill)",
              background: "var(--lotus-accent)",
              color: "var(--lotus-text-on-accent)",
              border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
            }}>Replay cascade</button>
        </div>
        <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <GlassModule
              key={i + tick * 10}
              cascadeIndex={i}
              width={300}
              minHeight={300}
              subtitle={`module · ${i + 1}`}
              title={["Mail", "Calendar", "Live", "Doc", "Predictive"][i]}
            >
              <div style={{ fontSize: 13, color: "var(--lotus-text-muted)" }}>
                Cascade index {i} → animation-delay {i * 90}ms
              </div>
            </GlassModule>
          ))}
        </div>
      </Backdrop>
    );
  },
};
