import type { Meta, StoryObj } from "@storybook/react";
import { PluginCard } from "./PluginCard";
import { LotusCanvas } from "./LotusCanvas";

const meta: Meta<typeof PluginCard> = {
  title: "Design system / PluginCard",
  component: PluginCard,
  parameters: { layout: "fullscreen" },
  argTypes: {
    x: { control: { type: "number", min: 0, max: 600 } },
    y: { control: { type: "number", min: 0, max: 400 } },
  },
  args: {
    label: "Mail",
    x: 80,
    y: 80,
  },
};
export default meta;

type Story = StoryObj<typeof PluginCard>;

const Backdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "relative", width: "100%", height: "calc(100vh - 48px)" }}>
    <LotusCanvas />
    <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>{children}</div>
  </div>
);

export const Default: Story = {
  render: (args) => (
    <Backdrop>
      <PluginCard {...args} />
    </Backdrop>
  ),
};

export const CustomLabel: Story = {
  render: (args) => (
    <Backdrop>
      <PluginCard {...args} />
    </Backdrop>
  ),
  args: {
    label: "Calendar",
    x: 120,
    y: 120,
  },
};

export const MultipleCards: Story = {
  render: () => (
    <Backdrop>
      <PluginCard label="Mail"     x={60}  y={60} />
      <PluginCard label="Calendar" x={320} y={60} />
      <PluginCard label="Live"     x={60}  y={320} />
      <PluginCard label="Docs"     x={320} y={320} />
    </Backdrop>
  ),
  parameters: { controls: { disable: true } },
};
