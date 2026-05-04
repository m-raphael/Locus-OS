import type { Meta, StoryObj } from "@storybook/react";
import { LongPressMenu, type LongPressAction } from "./LongPressMenu";

const meta: Meta<typeof LongPressMenu> = {
  title: "Design system / LongPressMenu",
  component: LongPressMenu,
  parameters: { layout: "fullscreen" },
  argTypes: {
    x: { control: { type: "number", min: 0, max: 800 } },
    y: { control: { type: "number", min: 0, max: 600 } },
  },
  args: {
    x: 300,
    y: 280,
  },
};
export default meta;

type Story = StoryObj<typeof LongPressMenu>;

const DEFAULT_ACTIONS: LongPressAction[] = [
  { id: "open",    label: "Open",       icon: "↗" },
  { id: "extract", label: "Extract",    icon: "✦" },
  { id: "share",   label: "Share",      icon: "↥" },
  { id: "snooze",  label: "Snooze",     icon: "◐" },
  { id: "archive", label: "Archive",    icon: "▢" },
  { id: "remix",   label: "Remix flow", icon: "↻" },
];

const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    position: "relative", width: "100%", height: "calc(100vh - 48px)",
    background: "var(--lotus-bg-base)",
  }}>
    {children}
  </div>
);

export const Default: Story = {
  render: (args) => (
    <Container>
      <LongPressMenu {...args} />
    </Container>
  ),
  args: {
    actions: DEFAULT_ACTIONS,
  },
};

export const FewActions: Story = {
  render: (args) => (
    <Container>
      <LongPressMenu {...args} />
    </Container>
  ),
  args: {
    actions: DEFAULT_ACTIONS.slice(0, 3),
    x: 300,
    y: 300,
  },
};

export const TopLeftCorner: Story = {
  render: (args) => (
    <Container>
      <LongPressMenu {...args} />
    </Container>
  ),
  args: {
    actions: DEFAULT_ACTIONS,
    x: 100,
    y: 80,
  },
};
