import type { Meta, StoryObj } from "@storybook/react";
import { SimulationBoard, type Simulation, type SimulationOutcome, type SimulationStats } from "./SimulationBoard";

const noop = () => {};
import { GlassModule } from "./GlassModule";
import { LotusCanvas } from "./LotusCanvas";

const SIMS: Simulation[] = [
  { id: "s1", name: "Q3 launch timeline",  description: "Ship-vs-slip distribution",       status: "completed" },
  { id: "s2", name: "Hiring runway",       description: "30-90 day capacity model",        status: "running" },
  { id: "s3", name: "Server cost scenarios",description: "AWS spend across load profiles", status: "idle" },
];

const RESULTS: SimulationOutcome[] = [
  { id: "r1", label: "On time",          probability: 0.62, confidence: 0.08 },
  { id: "r2", label: "1-week slip",      probability: 0.21, confidence: 0.06 },
  { id: "r3", label: "2-3 week slip",    probability: 0.12, confidence: 0.05 },
  { id: "r4", label: "Major delay",      probability: 0.05, confidence: 0.04 },
];

const STATS: SimulationStats = { median: 0.62, p10: 0.41, p90: 0.78 };

const meta: Meta<typeof SimulationBoard> = {
  title: "Design system / SimulationBoard",
  component: SimulationBoard,
  parameters: { layout: "fullscreen" },
  args: {
    onCreate: noop,
    onRun: noop,
    onView: noop,
  },
};
export default meta;

type Story = StoryObj<typeof SimulationBoard>;

function Scene({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", padding: 32 }}>
      <LotusCanvas />
      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center" }}>
        {children}
      </div>
    </div>
  );
}

function Inside({ children, subtitle, title }: { children: React.ReactNode; subtitle: string; title: string }) {
  return (
    <GlassModule subtitle={subtitle} title={title} width={460} minHeight={620}>
      {children}
    </GlassModule>
  );
}

export const FullBoard: Story = {
  render: (args) => (
    <Scene>
      <Inside subtitle="ai · monte carlo" title="Simulations">
        <SimulationBoard
          {...args}
          simulations={SIMS}
          selectedSimulationId="s1"
          results={RESULTS}
          stats={STATS}
        />
      </Inside>
    </Scene>
  ),
};

export const ListOnly: Story = {
  render: (args) => (
    <Scene>
      <Inside subtitle="ai · monte carlo" title="Simulations">
        <SimulationBoard {...args} simulations={SIMS} />
      </Inside>
    </Scene>
  ),
};

export const Running: Story = {
  render: (args) => (
    <Scene>
      <Inside subtitle="ai · monte carlo" title="Simulations">
        <SimulationBoard
          {...args}
          simulations={SIMS}
          selectedSimulationId="s2"
          loading
        />
      </Inside>
    </Scene>
  ),
};

export const Empty: Story = {
  render: (args) => (
    <Scene>
      <Inside subtitle="ai · monte carlo" title="Simulations">
        <SimulationBoard {...args} simulations={[]} />
      </Inside>
    </Scene>
  ),
};

export const SkewedDistribution: Story = {
  name: "Tight skew (one dominant outcome)",
  render: (args) => (
    <Scene>
      <Inside subtitle="ai · monte carlo" title="Simulations">
        <SimulationBoard
          {...args}
          simulations={SIMS.slice(0, 1)}
          selectedSimulationId="s1"
          results={[
            { id: "x1", label: "Within budget",  probability: 0.91, confidence: 0.04 },
            { id: "x2", label: "5-10% over",     probability: 0.07, confidence: 0.03 },
            { id: "x3", label: "10%+ over",      probability: 0.02, confidence: 0.02 },
          ]}
          stats={{ median: 0.91, p10: 0.86, p90: 0.95 }}
        />
      </Inside>
    </Scene>
  ),
};
