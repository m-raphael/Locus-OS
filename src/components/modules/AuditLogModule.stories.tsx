import type { Meta, StoryObj } from "@storybook/react";
import AuditLogModule from "./AuditLogModule";

const meta: Meta<typeof AuditLogModule> = {
  title: "Modules / AuditLog",
  component: AuditLogModule,
  parameters: { layout: "centered" },
  args: { idx: 0, focused: false, anyFocused: false, accent: "#7C7CF2", onFocus: () => {} },
};
export default meta;
type Story = StoryObj<typeof AuditLogModule>;
export const Default: Story = {};
export const Focused: Story = { args: { focused: true } };
export const Dimmed: Story = { args: { anyFocused: true } };
