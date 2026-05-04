/**
 * Locus-OS design-system barrel.
 *
 * The runtime app and tests import from here so we can track usage in
 * one place. Storybook stories import from each file directly to keep
 * the dependency graph honest.
 */

export { LotusCanvas, type LotusCanvasProps } from "./LotusCanvas";
export { GlassModule, type GlassModuleProps } from "./GlassModule";
export { EntityChip, type EntityChipProps } from "./EntityChip";

export {
  fonts,
  radii,
  space,
  motion,
  entityColors,
  themes,
  type EntityKind,
  type ThemeName,
  type ThemeTokens,
} from "./tokens";
