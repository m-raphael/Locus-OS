/**
 * Locus-OS · typed design token mirror.
 *
 * Values are duplicated from `tokens.css` so JS/TS code can read them
 * without parsing CSS custom properties at runtime. Keep both files in
 * lockstep — the DTCG export script (`scripts/export-design-tokens.mjs`,
 * task #9) treats this module as the single source of truth and emits
 * `tokens/locus.tokens.json` from it.
 */

export type ThemeName = "vellum" | "moonlight";

export interface ThemeTokens {
  bg: { base: string; mid: string; deep: string; gradient: string };
  surface: { base: string; focused: string; hairline: string };
  text: { base: string; muted: string; faint: string; onAccent: string };
  shadow: { glass: string; glassFocused: string };
  accent: { base: string; strong: string; soft: string };
}

export const fonts = {
  display: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono:    '"JetBrains Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
} as const;

export const radii = {
  pill: 999,
  card: 28,
  control: 12,
  chip: 8,
} as const;

export const space = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64,
} as const;

export const motion = {
  duration: { fast: 180, base: 320, slow: 700, ambient: 22000 },
  ease:     "cubic-bezier(0.22, 0.9, 0.32, 1)",
  easeOut:  "cubic-bezier(0.16, 1, 0.3, 1)",
  stagger:  90, // ms — used by GlassModule cascade
} as const;

/** Entity-kind palette for the NLP NER chips. Tuned in oklch so the
 *  hues hold up against both Vellum and Moonlight backgrounds without
 *  re-tinting per theme. */
export const entityColors = {
  Person:       "oklch(70% 0.13 250)",
  Organization: "oklch(70% 0.14 150)",
  Date:         "oklch(72% 0.12 60)",
  Topic:        "oklch(70% 0.14 320)",
  Place:        "oklch(70% 0.13 30)",
} as const;

export type EntityKind = keyof typeof entityColors;

const vellum: ThemeTokens = {
  bg: {
    base: "#f4f1ee", mid: "#ebe9e6", deep: "#e2dfdb",
    gradient: "linear-gradient(180deg, #f4f1ee 0%, #ebe9e6 60%, #e2dfdb 100%)",
  },
  surface: {
    base:     "rgba(255, 255, 255, 0.62)",
    focused:  "rgba(255, 255, 255, 0.86)",
    hairline: "rgba(20, 22, 30, 0.04)",
  },
  text: {
    base:     "rgba(20, 22, 30, 0.94)",
    muted:    "rgba(40, 44, 55, 0.55)",
    faint:    "rgba(40, 44, 55, 0.35)",
    onAccent: "#ffffff",
  },
  shadow: {
    glass:
      "0 0 0 1px rgba(20, 22, 30, 0.04), 0 24px 60px -24px rgba(20, 22, 30, 0.18)",
    glassFocused:
      "0 0 0 1px rgba(20, 22, 30, 0.04), 0 30px 80px -20px rgba(124, 124, 242, 0.32), 0 12px 40px -16px rgba(20, 22, 30, 0.22)",
  },
  accent: {
    base:   "#7C7CF2",
    strong: "#5C5CDF",
    soft:   "rgba(124, 124, 242, 0.12)",
  },
};

const moonlight: ThemeTokens = {
  bg: {
    base: "#0c0d11", mid: "#0a0b0f", deep: "#06070a",
    gradient: "linear-gradient(180deg, #0c0d11 0%, #0a0b0f 60%, #06070a 100%)",
  },
  surface: {
    base:     "rgba(22, 24, 30, 0.55)",
    focused:  "rgba(28, 30, 38, 0.78)",
    hairline: "rgba(255, 255, 255, 0.06)",
  },
  text: {
    base:     "rgba(235, 238, 245, 0.94)",
    muted:    "rgba(220, 224, 235, 0.55)",
    faint:    "rgba(220, 224, 235, 0.32)",
    onAccent: "#0c0d11",
  },
  shadow: {
    glass:
      "0 0 0 1px rgba(255, 255, 255, 0.06), 0 30px 80px -20px rgba(155, 140, 255, 0.32), 0 8px 30px -8px rgba(0, 0, 0, 0.6)",
    glassFocused:
      "0 0 0 1px rgba(255, 255, 255, 0.10), 0 36px 96px -16px rgba(155, 140, 255, 0.45), 0 12px 40px -8px rgba(0, 0, 0, 0.7)",
  },
  accent: {
    base:   "#9B8CFF",
    strong: "#BCA8FF",
    soft:   "rgba(155, 140, 255, 0.18)",
  },
};

export const themes: Record<ThemeName, ThemeTokens> = { vellum, moonlight };
