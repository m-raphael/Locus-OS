import type { Meta, StoryObj } from "@storybook/react";
import { PredictionBoard, type PredictionItem } from "./PredictionBoard";
import { GlassModule } from "./GlassModule";
import { LotusCanvas } from "./LotusCanvas";

const HEADLINE: PredictionItem = {
  id: "review-inbox",
  label: "Review Inbox",
  reason: "Visited 12 times, usually around 09:00",
  confidence: 0.92,
  source: "temporal",
};

const TEMPORAL: PredictionItem[] = [
  { id: "plan-q3", label: "Plan Q3 launch",   reason: "Visited 8 times, often around 10:00",  confidence: 0.74, source: "temporal" },
  { id: "draft",   label: "Draft memo",        reason: "Visited 5 times, often around 11:00",  confidence: 0.51, source: "temporal" },
  { id: "find",    label: "Find apartments",   reason: "Visited 3 times, often around 13:00",  confidence: 0.32, source: "temporal" },
];

const RELATED: PredictionItem[] = [
  { id: "g1", label: "Sprint planning",        reason: "1 hop · LEADS_TO from current",      source: "graph" },
  { id: "g2", label: "Call Naomi",             reason: "2 hops via Plan Q3 launch",          source: "graph" },
  { id: "g3", label: "Watch standup recording",reason: "2 hops · same attention mode",       source: "graph" },
];

const meta: Meta<typeof PredictionBoard> = {
  title: "Design system / PredictionBoard",
  component: PredictionBoard,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof PredictionBoard>;

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
    <GlassModule subtitle={subtitle} title={title} width={420} minHeight={520}>
      {children}
    </GlassModule>
  );
}

export const FullPattern: Story = {
  render: () => (
    <Scene>
      <Inside subtitle="ai · predictive" title="What's next">
        <PredictionBoard
          time="09:00"
          headline={HEADLINE}
          predictions={TEMPORAL}
          related={RELATED}
          onActivate={(item) => alert(`Open: ${item.label} (${item.source})`)}
        />
      </Inside>
    </Scene>
  ),
};

export const TemporalOnly: Story = {
  render: () => (
    <Scene>
      <Inside subtitle="ai · predictive" title="What's next">
        <PredictionBoard
          time="14:00"
          headline={HEADLINE}
          predictions={TEMPORAL}
        />
      </Inside>
    </Scene>
  ),
};

export const GraphOnly: Story = {
  name: "Graph-only (no temporal pattern yet)",
  render: () => (
    <Scene>
      <Inside subtitle="ai · predictive" title="Related spaces">
        <PredictionBoard
          time="14:00"
          related={RELATED}
        />
      </Inside>
    </Scene>
  ),
};

export const Loading: Story = {
  render: () => (
    <Scene>
      <Inside subtitle="ai · predictive" title="What's next">
        <PredictionBoard time="14:00" loading />
      </Inside>
    </Scene>
  ),
};

export const Empty: Story = {
  render: () => (
    <Scene>
      <Inside subtitle="ai · predictive" title="What's next">
        <PredictionBoard time="14:00" emptyMessage="Open a few Spaces — patterns will appear here." />
      </Inside>
    </Scene>
  ),
};
