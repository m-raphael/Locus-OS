import type { Meta, StoryObj } from "@storybook/react";
import { entityColors, fonts, motion, radii, space, themes } from "./tokens";

/**
 * Visual catalogue of the LOTUS-OS design tokens.
 *
 * The Storybook theme switcher (Vellum / Moonlight) toggles the
 * `theme-{name}` class on <html>; every swatch below reads from
 * the matching CSS custom properties so what you see changes with it.
 */

const meta: Meta = {
  title: "Design tokens / Catalogue",
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj;

const Section: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title, subtitle, children,
}) => (
  <section style={{ marginBottom: 48 }}>
    <header style={{ marginBottom: 16 }}>
      <div style={{
        fontFamily: "var(--lotus-font-mono)",
        fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase",
        color: "var(--lotus-text-muted)",
      }}>
        {subtitle ?? "tokens"}
      </div>
      <h2 style={{
        margin: "4px 0 0",
        fontFamily: "var(--lotus-font-display)",
        fontSize: 22, fontWeight: 600, letterSpacing: "-0.015em",
        color: "var(--lotus-text)",
      }}>
        {title}
      </h2>
    </header>
    {children}
  </section>
);

const Swatch: React.FC<{
  name: string; cssVar: string; sample?: string; label?: string;
}> = ({ name, cssVar, sample, label }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 12,
    padding: 12, borderRadius: 12,
    background: "var(--lotus-surface-base)",
    backdropFilter: "blur(28px) saturate(1.4)",
    boxShadow: "var(--lotus-shadow-glass)",
  }}>
    <div style={{
      width: 56, height: 56, borderRadius: 12,
      background: sample ?? `var(${cssVar})`,
      boxShadow: "inset 0 0 0 1px var(--lotus-border-soft)",
    }} />
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontFamily: "var(--lotus-font-display)",
        fontSize: 14, fontWeight: 500,
        color: "var(--lotus-text)",
      }}>{name}</div>
      <div style={{
        fontFamily: "var(--lotus-font-mono)",
        fontSize: 11, color: "var(--lotus-text-muted)",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>{label ?? cssVar}</div>
    </div>
  </div>
);

const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 12,
  }}>
    {children}
  </div>
);

export const Catalogue: Story = {
  render: () => (
    <div style={{
      minHeight: "100vh",
      padding: 32,
      background: "var(--lotus-bg-gradient)",
      fontFamily: "var(--lotus-font-display)",
    }}>
      <header style={{ marginBottom: 40 }}>
        <h1 style={{
          margin: 0, fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em",
          color: "var(--lotus-text)",
        }}>
          Locus-OS · Design tokens
        </h1>
        <p style={{
          marginTop: 8, fontSize: 14, color: "var(--lotus-text-muted)",
          maxWidth: 720,
        }}>
          Toggle the theme in the Storybook toolbar (top-right) to flip
          between Vellum and Moonlight. Every swatch below is driven by
          CSS custom properties from <code style={{ fontFamily: "var(--lotus-font-mono)" }}>
          src/design/tokens.css</code>.
        </p>
      </header>

      <Section title="Atmosphere" subtitle="canvas">
        <Grid>
          <Swatch name="Background base"  cssVar="--lotus-bg-base" />
          <Swatch name="Background mid"   cssVar="--lotus-bg-mid" />
          <Swatch name="Background deep"  cssVar="--lotus-bg-deep" />
          <Swatch name="Background gradient" cssVar="--lotus-bg-gradient"
            sample="var(--lotus-bg-gradient)" label="180deg base→mid→deep" />
          <Swatch name="Blob · warm" cssVar="--lotus-blob-warm" />
          <Swatch name="Blob · cool" cssVar="--lotus-blob-cool" />
        </Grid>
      </Section>

      <Section title="Glass surfaces" subtitle="modules">
        <Grid>
          <Swatch name="Surface base"     cssVar="--lotus-surface-base" />
          <Swatch name="Surface focused"  cssVar="--lotus-surface-focused" />
          <Swatch name="Hairline"         cssVar="--lotus-surface-hairline" />
        </Grid>
      </Section>

      <Section title="Text" subtitle="ink">
        <Grid>
          <Swatch name="Body"      cssVar="--lotus-text" />
          <Swatch name="Muted"     cssVar="--lotus-text-muted" />
          <Swatch name="Faint"     cssVar="--lotus-text-faint" />
          <Swatch name="On accent" cssVar="--lotus-text-on-accent" />
        </Grid>
      </Section>

      <Section title="Accent · periwinkle" subtitle="brand">
        <Grid>
          <Swatch name="Accent"        cssVar="--lotus-accent" />
          <Swatch name="Accent strong" cssVar="--lotus-accent-strong" />
          <Swatch name="Accent soft"   cssVar="--lotus-accent-soft" />
        </Grid>
      </Section>

      <Section title="Entities · NER chips" subtitle="nlp">
        <Grid>
          {Object.entries(entityColors).map(([kind, c]) => (
            <Swatch key={kind} name={kind} cssVar={`--lotus-entity-${kind.toLowerCase()}`}
              sample={c} label={c} />
          ))}
        </Grid>
      </Section>

      <Section title="Type" subtitle="font stack">
        <div style={{
          display: "grid", gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
        }}>
          <div style={{
            padding: 20, borderRadius: 16,
            background: "var(--lotus-surface-base)",
            backdropFilter: "blur(28px) saturate(1.4)",
            boxShadow: "var(--lotus-shadow-glass)",
          }}>
            <div style={{ color: "var(--lotus-text-muted)", fontFamily: fonts.mono, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>display</div>
            <div style={{ color: "var(--lotus-text)", fontFamily: fonts.display, fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>Plan trip to Lisbon</div>
            <div style={{ color: "var(--lotus-text-muted)", fontFamily: fonts.mono, fontSize: 11, marginTop: 6 }}>{fonts.display}</div>
          </div>
          <div style={{
            padding: 20, borderRadius: 16,
            background: "var(--lotus-surface-base)",
            backdropFilter: "blur(28px) saturate(1.4)",
            boxShadow: "var(--lotus-shadow-glass)",
          }}>
            <div style={{ color: "var(--lotus-text-muted)", fontFamily: fonts.mono, fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>mono</div>
            <div style={{ color: "var(--lotus-text)", fontFamily: fonts.mono, fontSize: 24, fontWeight: 500 }}>NER · 14ms · 5 entities</div>
            <div style={{ color: "var(--lotus-text-muted)", fontFamily: fonts.mono, fontSize: 11, marginTop: 6 }}>{fonts.mono}</div>
          </div>
        </div>
      </Section>

      <Section title="Radii / spacing" subtitle="layout">
        <Grid>
          {Object.entries(radii).map(([k, v]) => (
            <Swatch key={`r-${k}`} name={`Radius · ${k}`} cssVar={`--lotus-radius-${k}`}
              sample={`linear-gradient(135deg, var(--lotus-accent), var(--lotus-accent-strong))`}
              label={`${v}px`} />
          ))}
          {Object.entries(space).map(([k, v]) => (
            <div key={`s-${k}`} style={{
              padding: 12, borderRadius: 12,
              background: "var(--lotus-surface-base)",
              backdropFilter: "blur(28px) saturate(1.4)",
              boxShadow: "var(--lotus-shadow-glass)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ width: v, height: v, background: "var(--lotus-accent)", borderRadius: 4 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--lotus-text)" }}>Space · {k}</div>
                <div style={{ fontFamily: "var(--lotus-font-mono)", fontSize: 11, color: "var(--lotus-text-muted)" }}>{v}px</div>
              </div>
            </div>
          ))}
        </Grid>
      </Section>

      <Section title="Motion" subtitle="duration · easing">
        <Grid>
          {Object.entries(motion.duration).map(([k, v]) => (
            <Swatch key={`d-${k}`} name={`Duration · ${k}`}
              cssVar={`--lotus-motion-${k}`}
              sample={`linear-gradient(135deg, var(--lotus-accent), var(--lotus-accent-strong))`}
              label={`${v}ms`} />
          ))}
          <Swatch name="Ease (default)" cssVar="--lotus-motion-ease"
            sample={`linear-gradient(135deg, var(--lotus-accent), var(--lotus-accent-strong))`}
            label={motion.ease} />
          <Swatch name="Ease-out"       cssVar="--lotus-motion-ease-out"
            sample={`linear-gradient(135deg, var(--lotus-accent), var(--lotus-accent-strong))`}
            label={motion.easeOut} />
          <Swatch name="Stagger"        cssVar="--lotus-motion-stagger"
            sample={`linear-gradient(135deg, var(--lotus-accent), var(--lotus-accent-strong))`}
            label={`${motion.stagger}ms`} />
        </Grid>
      </Section>

      <Section title="Theme JSON (typed mirror)" subtitle="src/design/tokens.ts">
        <pre style={{
          margin: 0, padding: 16, borderRadius: 12,
          background: "var(--lotus-surface-base)", backdropFilter: "blur(28px) saturate(1.4)",
          boxShadow: "var(--lotus-shadow-glass)",
          color: "var(--lotus-text)", fontFamily: "var(--lotus-font-mono)",
          fontSize: 11, lineHeight: 1.5, overflow: "auto",
        }}>
{JSON.stringify({ vellum: themes.vellum, moonlight: themes.moonlight }, null, 2)}
        </pre>
      </Section>
    </div>
  ),
};
