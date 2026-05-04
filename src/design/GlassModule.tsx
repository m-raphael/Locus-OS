import { type CSSProperties, type HTMLAttributes, forwardRef } from "react";
import "./glass-module.css";

export interface GlassModuleProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** Position in a cascading list — index * --lotus-motion-stagger
   *  becomes the float-in `animation-delay`. Default 0. */
  cascadeIndex?: number;
  /** Whether this module is the focused one in its flow. */
  focused?: boolean;
  /** Whether *another* module is focused, so this one should dim+blur. */
  anyFocused?: boolean;
  /** Skip the entry animation entirely. */
  noAnimate?: boolean;
  /** Width override. Default 380. */
  width?: number | string;
  /** Min-height override. Default 480. */
  minHeight?: number | string;
  /** Small uppercase mono label above the title. */
  subtitle?: React.ReactNode;
  /** Display title (Inter 20 / 600). */
  title?: React.ReactNode;
}

/**
 * The backlit glass surface that every Locus module sits inside.
 *
 * Visual state is parent-driven: pass `focused` to the active card and
 * `anyFocused` to its siblings (those will dim + blur). The cascade
 * delay is just `cascadeIndex * --lotus-motion-stagger`, so a row of
 * modules can simply enumerate.
 */
export const GlassModule = forwardRef<HTMLDivElement, GlassModuleProps>(
  function GlassModule(
    {
      cascadeIndex = 0,
      focused,
      anyFocused,
      noAnimate,
      width = 380,
      minHeight = 480,
      subtitle,
      title,
      className,
      style,
      children,
      ...rest
    },
    ref
  ) {
    const isDimmed = anyFocused && !focused;

    const cls = [
      "lotus-glass",
      focused ? "lotus-glass--focused" : null,
      isDimmed ? "lotus-glass--dimmed" : null,
      noAnimate ? "lotus-glass--no-anim" : null,
      className ?? null,
    ]
      .filter(Boolean)
      .join(" ");

    const composedStyle: CSSProperties = {
      width,
      minHeight,
      animationDelay: noAnimate
        ? undefined
        : `calc(${cascadeIndex} * var(--lotus-motion-stagger))`,
      ...style,
    };

    return (
      <div ref={ref} className={cls} style={composedStyle} {...rest}>
        {subtitle || title ? (
          <header className="lotus-glass__header">
            {subtitle ? <div className="lotus-glass__subtitle">{subtitle}</div> : null}
            {title ? <div className="lotus-glass__title">{title}</div> : null}
          </header>
        ) : null}
        <div className="lotus-glass__body">{children}</div>
      </div>
    );
  }
);
