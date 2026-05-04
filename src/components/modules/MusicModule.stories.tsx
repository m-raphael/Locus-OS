import type { Meta, StoryObj } from "@storybook/react";
import MusicModule from "./MusicModule";

const meta: Meta<typeof MusicModule> = {
  title: "Modules / Music",
  component: MusicModule,
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

type Story = StoryObj<typeof MusicModule>;

export const Default: Story = {};

export const Focused: Story = { args: { focused: true } };

export const Dimmed: Story = { args: { anyFocused: true } };
