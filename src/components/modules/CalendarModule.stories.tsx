import type { Meta, StoryObj } from "@storybook/react";
import CalendarModule from "./CalendarModule";

const meta: Meta<typeof CalendarModule> = {
  title: "Modules / Calendar",
  component: CalendarModule,
  parameters: { layout: "centered" },
  args: { idx: 0, focused: false, anyFocused: false, accent: "#7C7CF2", onFocus: () => {} },
};
export default meta;
type Story = StoryObj<typeof CalendarModule>;
export const Default: Story = {};
export const Focused: Story = { args: { focused: true } };
export const Dimmed: Story = { args: { anyFocused: true } };
