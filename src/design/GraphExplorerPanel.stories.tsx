import type { Meta, StoryObj } from "@storybook/react";
import { GraphExplorerPanel } from "./GraphExplorerPanel";
import { LotusCanvas } from "./LotusCanvas";

const RELATED_NODES = [
  { id: "s1", label: "Review Inbox" },
  { id: "s2", label: "Plan Q3 launch" },
  { id: "s3", label: "Draft memo to Naomi" },
  { id: "s4", label: "Find flights NYC" },
  { id: "s5", label: "Call the dentist" },
];

const meta: Meta<typeof GraphExplorerPanel> = {
  title: "Design system / GraphExplorerPanel",
  component: GraphExplorerPanel,
  parameters: { layout: "fullscreen" },
  argTypes: {
    emptyMessage: { control: "text" },
  },
};
export default meta;

type Story = StoryObj<typeof GraphExplorerPanel>;

// ── Wrapper that always shows the canvas behind the panel ────────────────────
function Scene({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", padding: 32 }}>
      <LotusCanvas />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

export const WithRelatedSpaces: Story = {
  render: (args) => (
    <Scene>
      <GraphExplorerPanel
        {...args}
        center={{ id: "c0", label: "Sprint planning" }}
        related={RELATED_NODES}
        pathLabels={["Review Inbox", "Sprint planning"]}
        onSelect={(n) => alert(`Navigate → ${n.label}`)}
      />
    </Scene>
  ),
};

export const SingleRelated: Story = {
  render: (args) => (
    <Scene>
      <GraphExplorerPanel
        {...args}
        center={{ id: "c0", label: "Draft memo to Naomi" }}
        related={[{ id: "s1", label: "Review Inbox" }]}
        pathLabels={["Review Inbox", "Draft memo to Naomi"]}
      />
    </Scene>
  ),
};

export const NoRelated: Story = {
  render: (args) => (
    <Scene>
      <GraphExplorerPanel
        {...args}
        center={{ id: "c0", label: "Brand new space" }}
        related={[]}
        pathLabels={[]}
      />
    </Scene>
  ),
};

export const NoCenter: Story = {
  render: (args) => (
    <Scene>
      <GraphExplorerPanel {...args} />
    </Scene>
  ),
};

export const LongAttentionPath: Story = {
  render: (args) => (
    <Scene>
      <GraphExplorerPanel
        {...args}
        center={{ id: "c0", label: "Find apartments in Brooklyn" }}
        related={RELATED_NODES.slice(0, 3)}
        pathLabels={["Review Inbox", "Plan Q3 launch", "Draft memo to Naomi", "Find apartments in Brooklyn"]}
      />
    </Scene>
  ),
};
