import type { Meta, StoryObj } from "@storybook/react";
import LegacyAppModule from "./LegacyAppModule";

const meta: Meta<typeof LegacyAppModule> = {
  title: "Modules / LegacyApp",
  component: LegacyAppModule,
  parameters: { layout: "centered" },
  args: { idx: 0, focused: false, anyFocused: false, accent: "#7C7CF2", onFocus: () => {} },
};
export default meta;
type Story = StoryObj<typeof LegacyAppModule>;
export const Default: Story = {};
export const Focused: Story = { args: { focused: true } };
export const Dimmed: Story = { args: { anyFocused: true } };
