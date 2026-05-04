import type { Meta, StoryObj } from "@storybook/react";
import { SpaceflowView, type SpaceflowApartment } from "./SpaceflowView";

const meta: Meta<typeof SpaceflowView> = {
  title: "Components / SpaceflowView",
  component: SpaceflowView,
  parameters: { layout: "fullscreen" },
  args: {
    spaceLabel: "Plan Move to SF",
    flowTitle: "Find 4 bedroom apartments in San Francisco",
    variant: "apartments",
    animate: true,
  },
};
export default meta;

type Story = StoryObj<typeof SpaceflowView>;

const DEMO_APARTMENTS: SpaceflowApartment[] = [
  { rooms: "4br, 2b", name: "1025 Solar St.",   price: "$15,000/month", img: "linear-gradient(135deg, #4a5878, #2a3858)", popped: false, avatar: undefined },
  { rooms: "4br, 2b", name: "777 Expense Way.", price: "$19,000/month", img: "linear-gradient(135deg, #d4d8dd, #b0b8c0)", popped: true,  avatar: "M" },
  { rooms: "4br, 2b", name: "629 Venus St.",    price: "$25,000/month", img: "linear-gradient(135deg, #b89878, #9a7858)", popped: false, avatar: undefined },
  { rooms: "4br, 2b", name: "99 Mars Landing.",  price: "$12,000/month", img: "linear-gradient(135deg, #c8c0b0, #a89888)", popped: false, avatar: undefined },
];

export const Apartments: Story = {
  render: (args) => (
    <div style={{ position: "relative", height: "calc(100vh - 48px)" }}>
      <SpaceflowView {...args} apartments={DEMO_APARTMENTS} />
    </div>
  ),
};

export const Email: Story = {
  render: (args) => (
    <div style={{ position: "relative", height: "calc(100vh - 48px)" }}>
      <SpaceflowView
        {...args}
        variant="email"
        spaceLabel="Review Inbox"
        email={{
          from: "Marisa Lu",
          subject: "Coffee?",
          body: "Hey Jason,\n\nWas wondering if you'd be interested in meeting my team at Philz Coffee at 11 AM today. No pressure if you can't make it, although I think you guys would really get along!\n\nMarisa",
          time: "Just Now",
        }}
      />
    </div>
  ),
};
