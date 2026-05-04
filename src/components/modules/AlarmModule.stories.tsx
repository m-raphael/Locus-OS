import type { Meta, StoryObj } from "@storybook/react";
import AlarmModule from "./AlarmModule";

const meta: Meta<typeof AlarmModule> = {
  title: "Modules / Alarm",
  component: AlarmModule,
  parameters: { layout: "centered" },
  args: {
    idx: 0,
    focused: false,
    anyFocused: false,
    accent: "#7C7CF2",
    onFocus: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof AlarmModule>;

export const Default: Story = {};

export const Focused: Story = { args: { focused: true } };

export const Dimmed: Story = { args: { anyFocused: true } };
