import type { Meta, StoryObj } from "@storybook/react";
import { LandingHero, type IntentChip } from "./LandingHero";
import { LotusCanvas } from "./LotusCanvas";

const meta: Meta<typeof LandingHero> = {
  title: "Design system / LandingHero",
  component: LandingHero,
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof LandingHero>;

const DEMO_INTENTS: IntentChip[] = [
  { label: "Review Inbox",                     ago: "2m ago",     count: 5, x: "12%", y: "22%", scale: 1.0,  delay: 0   },
  { label: "Draft response to Naomi",          ago: "8m ago",     count: 3, x: "78%", y: "18%", scale: 0.92, delay: 120 },
  { label: "Plan trip to Lisbon",              ago: "yesterday",  count: 4, x: "82%", y: "62%", scale: 1.0,  delay: 240 },
  { label: "Find apartments in Brooklyn",      ago: "Mon",        count: 3, x: "15%", y: "70%", scale: 0.88, delay: 360 },
  { label: "Standup update",                   ago: "Fri",        count: 2, x: "70%", y: "82%", scale: 0.78, delay: 480 },
  { label: "Q3 launch memo",                   ago: "last wk",    count: 6, x: "8%",  y: "48%", scale: 0.82, delay: 600 },
];

const Backdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "relative", width: "100%", height: "calc(100vh - 48px)" }}>
    <LotusCanvas />
    <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>{children}</div>
  </div>
);

export const Default: Story = {
  render: (args) => (
    <Backdrop>
      <LandingHero {...args} />
    </Backdrop>
  ),
  args: {
    intents: DEMO_INTENTS,
    name: "alex",
  },
};

export const Empty: Story = {
  render: (args) => (
    <Backdrop>
      <LandingHero {...args} />
    </Backdrop>
  ),
  args: {
    intents: [],
    name: "alex",
  },
};

export const CustomName: Story = {
  render: (args) => (
    <Backdrop>
      <LandingHero {...args} />
    </Backdrop>
  ),
  args: {
    intents: DEMO_INTENTS,
    name: "morgan",
    greeting: "good morning",
  },
};
