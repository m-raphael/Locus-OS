import { type CSSProperties, type HTMLAttributes, useMemo } from "react";
import "./canvas.css";

export interface LotusCanvasProps extends HTMLAttributes<HTMLDivElement> {
  /** Multiplier on blob-layer opacity, clamped to [0, 1]. Default 1. */
  intensity?: number;
  /** Render the SVG turbulence film grain. Default false. */
  grain?: boolean;
  /** Animate the blob drift. Default true. */
  ambient?: boolean;
  /** Override `--lotus-accent` (and the accent-tinted blob) inside the
   *  canvas subtree only. Use to preview accent variants without
   *  switching the whole theme — e.g. the "Motivational Bops" Spotify
   *  green flow. */
  accent?: string;
}

/**
 * Atmospheric background that sits behind every Locus screen.
 *
 * Pure structural component: the actual colours come from CSS custom
 * properties scoped to `.theme-vellum` and `.theme-moonlight`. The
 * component reads neither — switch themes by toggling the class on
 * `<html>` (Storybook does this via the toolbar).
 *
 * @summary animated gradient-mesh background with blobs, grain, and vignette
 */
export function LotusCanvas({
  intensity = 1,
  grain = false,
  ambient = true,
  accent,
  className,
  style,
  ...rest
}: LotusCanvasProps) {
  const op = Math.max(0, Math.min(1, intensity));

  const composedStyle: CSSProperties = useMemo(() => {
    const overrides: Record<string, string> = {};
    if (accent) overrides["--lotus-accent"] = accent;
    return { ...style, ...(overrides as CSSProperties) };
  }, [accent, style]);

  const cls = [
    "lotus-canvas",
    ambient ? "lotus-canvas--ambient" : null,
    className ?? null,
  ].filter(Boolean).join(" ");

  return (
    <div className={cls} style={composedStyle} aria-hidden {...rest}>
      <div className="lotus-canvas__blobs" style={{ opacity: op }}>
        <div className="lotus-canvas__blob lotus-canvas__blob--a" />
        <div className="lotus-canvas__blob lotus-canvas__blob--b" />
        <div className="lotus-canvas__blob lotus-canvas__blob--c" />
      </div>
      {grain ? <div className="lotus-canvas__grain" /> : null}
      <div className="lotus-canvas__vignette" />
    </div>
  );
}
