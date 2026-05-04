import type { Meta, StoryObj } from "@storybook/react";
import SimulationModule from "./SimulationModule";

const meta: Meta<typeof SimulationModule> = {
  title: "Modules / Simulation",
  component: SimulationModule,
  parameters: { layout: "centered" },
  args: { idx: 0, focused: false, anyFocused: false, accent: "#7C7CF2", onFocus: () => {} },
};
export default meta;
type Story = StoryObj<typeof SimulationModule>;
export const Default: Story = {};
export const Focused: Story = { args: { focused: true } };
export const Dimmed: Story = { args: { anyFocused: true } };
