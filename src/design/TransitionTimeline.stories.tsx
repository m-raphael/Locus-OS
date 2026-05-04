import type { Meta, StoryObj } from "@storybook/react";
import { TransitionTimeline, type TransitionEvent } from "./TransitionTimeline";
import { LotusCanvas } from "./LotusCanvas";

const NOW = Math.floor(Date.now() / 1000);

const SAMPLE: TransitionEvent[] = [
  { id: "1", kind: "created",   label: "Plan Q3 launch",          sublabel: "ephemeral · open mode",        timestamp: NOW - 30 },
  { id: "2", kind: "transition",label: "Review Inbox → Plan Q3",  sublabel: "user · keyboard",              timestamp: NOW - 120 },
  { id: "3", kind: "mode",      label: "Plan Q3 launch",          sublabel: "open → focus",                 timestamp: NOW - 600 },
  { id: "4", kind: "memory",    label: "Stored chat with Naomi",  sublabel: "context · 412 tokens",         timestamp: NOW - 900 },
  { id: "5", kind: "launched",  label: "Linear",                  sublabel: "legacy app · com.linear.linear",timestamp: NOW - 1800 },
  { id: "6", kind: "plugin",    label: "Installed Calendar",      sublabel: "marketplace · v0.4.1",         timestamp: NOW - 3600 },
  { id: "7", kind: "focus",     label: "Activated focus goal",    sublabel: "Ship Q3 release",              timestamp: NOW - 7200 },
  { id: "8", kind: "dismissed", label: "Find apartments NYC",     sublabel: "ephemeral cleanup",            timestamp: NOW - 86400 },
];

const meta: Meta<typeof TransitionTimeline> = {
  title: "Design system / TransitionTimeline",
  component: TransitionTimeline,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof TransitionTimeline>;

function Scene({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", padding: 32 }}>
      <LotusCanvas />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

export const FullFeed: Story = {
  render: () => (
    <Scene>
      <TransitionTimeline events={SAMPLE} />
    </Scene>
  ),
};

export const RecentOnly: Story = {
  render: () => (
    <Scene>
      <TransitionTimeline events={SAMPLE.slice(0, 3)} />
    </Scene>
  ),
};

export const Empty: Story = {
  render: () => (
    <Scene>
      <TransitionTimeline events={[]} emptyMessage="Begin browsing — your timeline starts here." />
    </Scene>
  ),
};

export const SingleKind: Story = {
  name: "Single kind (mode changes)",
  render: () => (
    <Scene>
      <TransitionTimeline
        title="Mode History"
        events={[
          { id: "a", kind: "mode", label: "Plan Q3 launch",   sublabel: "open → focus",     timestamp: NOW - 60 },
          { id: "b", kind: "mode", label: "Review Inbox",     sublabel: "open → recovery",  timestamp: NOW - 240 },
          { id: "c", kind: "mode", label: "Draft memo",       sublabel: "focus → mirror",   timestamp: NOW - 900 },
        ]}
      />
    </Scene>
  ),
};
