import type { Meta, StoryObj } from "@storybook/react";
import MarketplaceModule from "./MarketplaceModule";

const meta: Meta<typeof MarketplaceModule> = {
  title: "Modules / Marketplace",
  component: MarketplaceModule,
  parameters: { layout: "centered" },
  args: { idx: 0, focused: false, anyFocused: false, accent: "#7C7CF2", onFocus: () => {} },
};
export default meta;
type Story = StoryObj<typeof MarketplaceModule>;
export const Default: Story = {};
export const Focused: Story = { args: { focused: true } };
export const Dimmed: Story = { args: { anyFocused: true } };
