import { useState, useCallback } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { PluginFlightOverlay, type FlightStage } from "./PluginFlightOverlay";
import { LotusCanvas } from "../design/LotusCanvas";

const meta: Meta<typeof PluginFlightOverlay> = {
  title: "Components / PluginFlightOverlay",
  component: PluginFlightOverlay,
  parameters: { layout: "fullscreen" },
  argTypes: {
    stage: { control: { type: "select" }, options: ["idle", "lifted", "zoomed", "settled", "done"] },
  },
  args: {
    label: "Mail",
    fromX: 100,
    fromY: 120,
    stage: "idle",
    autoAdvance: false,
  },
};
export default meta;

type Story = StoryObj<typeof PluginFlightOverlay>;

const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "relative", width: "100%", height: "calc(100vh - 48px)" }}>
    <LotusCanvas />
    <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>{children}</div>
  </div>
);

export const Idle: Story = {
  render: () => (
    <Container>
      <p style={{
        position: "absolute", top: 100, left: 100,
        color: "var(--lotus-text-muted)", fontSize: 12, fontFamily: "var(--lotus-font-mono)",
      }}>
        Idle — nothing renders. Switch stage in controls.
      </p>
    </Container>
  ),
};

export const Lifted: Story = {
  render: (args) => (
    <Container>
      <PluginFlightOverlay {...args} stage="lifted" />
    </Container>
  ),
};

export const Zoomed: Story = {
  render: (args) => (
    <Container>
      <PluginFlightOverlay {...args} stage="zoomed" />
    </Container>
  ),
};

export const Settled: Story = {
  render: (args) => (
    <Container>
      <PluginFlightOverlay {...args} stage="settled" />
    </Container>
  ),
};

export const AnimatedSequence: Story = {
  parameters: { controls: { disable: true } },
  render: () => {
    const [stage, setStage] = useState<FlightStage>("idle");

    const advance = useCallback(() => {
      switch (stage) {
        case "idle": setStage("lifted"); break;
        case "lifted": setStage("zoomed"); break;
        case "zoomed": setStage("settled"); break;
        case "settled": setStage("done"); break;
        case "done": setStage("idle"); break;
      }
    }, [stage]);

    return (
      <Container>
        <PluginFlightOverlay
          label="Mail"
          fromX={80}
          fromY={120}
          stage={stage}
          autoAdvance={false}
          onDone={advance}
        />
        <div style={{ position: "absolute", bottom: 60, right: 40, zIndex: 50 }}>
          <button
            onClick={advance}
            style={{
              padding: "10px 24px", borderRadius: 999, border: "none", cursor: "pointer",
              background: "var(--lotus-accent)", color: "var(--lotus-text-on-accent)",
              fontSize: 14, fontWeight: 500,
              boxShadow: "var(--lotus-shadow-glass)",
            }}
          >
            {stage === "idle" ? "▶ Play" : `Stage: ${stage} →`}
          </button>
        </div>
      </Container>
    );
  },
};
