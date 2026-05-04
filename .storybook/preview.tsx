import React from "react";
import type { Preview } from "@storybook/react";
import { withThemeByClassName } from "@storybook/addon-themes";

import "../src/design/global.css";

/**
 * Locus-OS Storybook preview.
 *
 * - Theme is switched by toggling `theme-vellum` / `theme-moonlight` on the
 *   document root; design tokens read off CSS custom properties scoped to
 *   those classes (see `src/design/tokens.css`).
 * - Backgrounds addon is disabled — every story should compose the
 *   `LotusCanvas` itself (or live inside a `GlassModule`) so what you see
 *   in the workshop matches what ships.
 */
const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    controls: {
      matchers: {
        color: /(background|color|accent)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [
    withThemeByClassName({
      themes: {
        vellum: "theme-vellum",
        moonlight: "theme-moonlight",
      },
      defaultTheme: "vellum",
      parentSelector: "html",
    }),
    (Story) => (
      <div style={{ minWidth: 360, padding: 24 }}>
        <Story />
      </div>
    ),
  ],
};

export default preview;
