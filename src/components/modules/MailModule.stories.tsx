import type { Meta, StoryObj } from "@storybook/react";
import MailModule from "./MailModule";

const meta: Meta<typeof MailModule> = {
  title: "Modules / Mail",
  component: MailModule,
  parameters: { layout: "centered" },
  args: { idx: 0, focused: false, anyFocused: false, accent: "#7C7CF2", onFocus: () => {} },
};
export default meta;
type Story = StoryObj<typeof MailModule>;
export const Default: Story = {};
export const Focused: Story = { args: { focused: true } };
export const Dimmed: Story = { args: { anyFocused: true } };
