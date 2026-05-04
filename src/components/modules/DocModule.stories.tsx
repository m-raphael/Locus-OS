import type { Meta, StoryObj } from "@storybook/react";
import DocModule from "./DocModule";

const meta: Meta<typeof DocModule> = {
  title: "Modules / Doc",
  component: DocModule,
  parameters: { layout: "centered" },
  args: { idx: 0, focused: false, anyFocused: false, accent: "#7C7CF2", onFocus: () => {} },
};
export default meta;
type Story = StoryObj<typeof DocModule>;
export const Default: Story = {};
export const Focused: Story = { args: { focused: true } };
export const Dimmed: Story = { args: { anyFocused: true } };
