import type { Meta, StoryObj } from "@storybook/react";
import { LotusCanvas } from "./LotusCanvas";

const ACCENT_PRESETS = [
  { name: "Vellum (default)", accent: undefined },
  { name: "Periwinkle",       accent: "#7C7CF2" },
  { name: "Moonlight",        accent: "#9B8CFF" },
  { name: "Warm chrome",      accent: "#F2A37C" },
  { name: "Quiet teal",       accent: "#5CC9C0" },
  { name: "Spotify green",    accent: "#1DB954" },
];

const meta: Meta<typeof LotusCanvas> = {
  title: "Design system / LotusCanvas",
  component: LotusCanvas,
  parameters: { layout: "fullscreen" },
  argTypes: {
    intensity: { control: { type: "range", min: 0, max: 1, step: 0.05 } },
    grain:     { control: "boolean" },
    ambient:   { control: "boolean" },
    accent:    { control: "color" },
  },
  args: {
    intensity: 1,
    grain: false,
    ambient: true,
    accent: undefined,
  },
};
export default meta;

type Story = StoryObj<typeof LotusCanvas>;

const Frame: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label }) => (
  <div style={{
    position: "relative",
    width: "100%",
    height: "calc(100vh - 48px)",
    minHeight: 480,
    overflow: "hidden",
    borderRadius: 16,
  }}>
    {children}
    {label ? (
      <div style={{
        position: "absolute", left: 24, bottom: 20,
        fontFamily: "var(--lotus-font-mono)", fontSize: 11,
        color: "var(--lotus-text-muted)",
        letterSpacing: "0.16em", textTransform: "uppercase",
      }}>{label}</div>
    ) : null}
  </div>
);

export const Default: Story = {
  render: (args) => (
    <Frame label="default · move the controls panel ↘">
      <LotusCanvas {...args} />
    </Frame>
  ),
};

export const FilmGrain: Story = {
  args: { grain: true },
  render: (args) => (
    <Frame label="film grain on">
      <LotusCanvas {...args} />
    </Frame>
  ),
};

export const Static: Story = {
  args: { ambient: false },
  render: (args) => (
    <Frame label="ambient drift off (frozen)">
      <LotusCanvas {...args} />
    </Frame>
  ),
};

export const LowIntensity: Story = {
  args: { intensity: 0.3 },
  render: (args) => (
    <Frame label="intensity = 0.3 · subtle bias">
      <LotusCanvas {...args} />
    </Frame>
  ),
};

export const AccentPresets: Story = {
  parameters: { controls: { exclude: ["accent"] } },
  render: (args) => (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 16,
      padding: 0,
      minHeight: "calc(100vh - 48px)",
    }}>
      {ACCENT_PRESETS.map((p) => (
        <div key={p.name} style={{
          position: "relative",
          minHeight: 280,
          borderRadius: 16,
          overflow: "hidden",
        }}>
          <LotusCanvas {...args} accent={p.accent} />
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "flex-end",
            padding: 20,
            color: "var(--lotus-text)",
            fontFamily: "var(--lotus-font-display)",
          }}>
            <div>
              <div style={{
                fontFamily: "var(--lotus-font-mono)", fontSize: 11,
                color: "var(--lotus-text-muted)",
                letterSpacing: "0.16em", textTransform: "uppercase",
              }}>preset</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{p.name}</div>
              <div style={{
                fontFamily: "var(--lotus-font-mono)", fontSize: 11,
                color: "var(--lotus-text-muted)", marginTop: 2,
              }}>{p.accent ?? "uses theme accent"}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  ),
};
