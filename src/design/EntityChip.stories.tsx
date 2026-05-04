import type { Meta, StoryObj } from "@storybook/react";
import { EntityChip } from "./EntityChip";
import { entityColors, type EntityKind } from "./tokens";
import { GlassModule } from "./GlassModule";
import { LotusCanvas } from "./LotusCanvas";

const meta: Meta<typeof EntityChip> = {
  title: "Design system / EntityChip",
  component: EntityChip,
  parameters: { layout: "centered" },
  argTypes: {
    kind: {
      control: "select",
      options: Object.keys(entityColors) as EntityKind[],
    },
    label: { control: "text" },
  },
  args: {
    kind: "Person",
    label: "Naomi K.",
  },
};
export default meta;

type Story = StoryObj<typeof EntityChip>;

export const Default: Story = {};

export const AllKinds: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ position: "relative", padding: 48, minHeight: "100vh" }}>
      <LotusCanvas />
      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center" }}>
        <GlassModule
          subtitle="NER kinds"
          title="All five entity colours"
          width={520}
          minHeight={260}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {(Object.keys(entityColors) as EntityKind[]).map((k) => (
              <EntityChip key={k} kind={k} label={
                k === "Person"       ? "Naomi K." :
                k === "Organization" ? "Anthropic" :
                k === "Date"         ? "tomorrow 3pm" :
                k === "Topic"        ? "Q3 launch" :
                "Lisbon"
              } />
            ))}
          </div>
          <div style={{
            marginTop: 16, fontFamily: "var(--lotus-font-mono)", fontSize: 11,
            color: "var(--lotus-text-muted)",
          }}>
            colours tuned in oklch — identical hue/chroma across themes
          </div>
        </GlassModule>
      </div>
    </div>
  ),
};

export const InSentence: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ position: "relative", padding: 48, minHeight: "100vh" }}>
      <LotusCanvas />
      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center" }}>
        <GlassModule subtitle="usage · inline" title="Highlighting NER spans" width={560} minHeight={220}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
            Draft response to <EntityChip kind="Person" label="Naomi" /> about{" "}
            <EntityChip kind="Topic" label="Q3 launch" /> by{" "}
            <EntityChip kind="Date" label="tomorrow 3pm" />, then forward
            it to <EntityChip kind="Organization" label="Anthropic" /> with the{" "}
            <EntityChip kind="Place" label="Lisbon" /> trip notes attached.
          </p>
        </GlassModule>
      </div>
    </div>
  ),
};
