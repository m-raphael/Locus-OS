import type { Meta, StoryObj } from "@storybook/react";
import MapModule from "./MapModule";

const meta: Meta<typeof MapModule> = {
  title: "Modules / Map",
  component: MapModule,
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

type Story = StoryObj<typeof MapModule>;

export const Default: Story = {};

export const Focused: Story = { args: { focused: true } };

export const Dimmed: Story = { args: { anyFocused: true } };
