import type { Meta, StoryObj } from "@storybook/react";
import PredictiveModule from "./PredictiveModule";

const meta: Meta<typeof PredictiveModule> = {
  title: "Modules / Predictive",
  component: PredictiveModule,
  parameters: { layout: "centered" },
  args: { idx: 0, focused: false, anyFocused: false, accent: "#7C7CF2", onFocus: () => {} },
};
export default meta;
type Story = StoryObj<typeof PredictiveModule>;
export const Default: Story = {};
export const Focused: Story = { args: { focused: true } };
export const Dimmed: Story = { args: { anyFocused: true } };
