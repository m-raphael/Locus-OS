import type { Meta, StoryObj } from "@storybook/react";
import LiveModule from "./LiveModule";

const meta: Meta<typeof LiveModule> = {
  title: "Modules / Live",
  component: LiveModule,
  parameters: { layout: "centered" },
  args: { idx: 0, focused: false, anyFocused: false, accent: "#7C7CF2", onFocus: () => {} },
};
export default meta;
type Story = StoryObj<typeof LiveModule>;
export const Default: Story = {};
export const Focused: Story = { args: { focused: true } };
export const Dimmed: Story = { args: { anyFocused: true } };
