import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  // Stories live next to the components they document.
  // MDX is supported for prose-heavy pages (token catalogues, theme overviews).
  stories: [
    "../src/design/**/*.mdx",
    "../src/design/**/*.stories.@(ts|tsx)",
    "../src/components/**/*.stories.@(ts|tsx)",
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-themes",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: { autodocs: "tag" },
  typescript: {
    reactDocgen: "react-docgen-typescript",
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      shouldRemoveUndefinedFromOptional: true,
      propFilter: (prop) =>
        prop.parent ? !/node_modules\/(?!@types\/react)/.test(prop.parent.fileName) : true,
    },
  },
  // Public dir is opt-in — no static assets shipped with the design system yet.
};

export default config;
