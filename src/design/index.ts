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
export { GraphExplorerPanel, type GraphExplorerPanelProps, type GraphNode } from "./GraphExplorerPanel";
export {
  TransitionTimeline,
  type TransitionTimelineProps,
  type TransitionEvent,
  type TransitionKind,
} from "./TransitionTimeline";
export {
  PredictionBoard,
  type PredictionBoardProps,
  type PredictionItem,
  type PredictionSource,
} from "./PredictionBoard";

export { LandingHero, type LandingHeroProps, type IntentChip } from "./LandingHero";
export {
  SimulationBoard,
  type SimulationBoardProps,
  type Simulation,
  type SimulationOutcome,
  type SimulationStats,
  type SimulationStatus,
} from "./SimulationBoard";
export { LongPressMenu, type LongPressMenuProps, type LongPressAction } from "./LongPressMenu";
export { PluginCard, type PluginCardProps } from "./PluginCard";

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
