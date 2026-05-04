import { type HTMLAttributes } from "react";
import "./plugin-card.css";

export interface PluginCardProps extends Omit<HTMLAttributes<HTMLDivElement>, "label"> {
  /** Display label shown inside the card. */
  label?: string;
  /** X position in px (absolute placement). */
  x?: number;
  /** Y position in px (absolute placement). */
  y?: number;
  /** Fired when the card or + button is clicked. */
  onTrigger?: () => void;
}

/**
 * Floating glass plugin card with a companion circular + button.
 *
 * @summary draggable plugin card with + affordance for adding to a Space
 */
export function PluginCard({
  label = "Mail",
  x = 80,
  y = 80,
  onTrigger,
  className,
  style,
  ...rest
}: PluginCardProps) {
  return (
    <div
      className={["lotus-plugin-card", className].filter(Boolean).join(" ")}
      style={{ left: x, top: y, ...style }}
      {...rest}
    >
      {/* Card */}
      <button
        className="lotus-plugin-card__card"
        onClick={() => onTrigger?.()}
        aria-label={`Add ${label} plugin to space`}
      >
        <div className="lotus-plugin-card__card-inner">
          <div className="lotus-plugin-card__label">{label}</div>
          <div className="lotus-plugin-card__kind">plugin</div>
          <div className="lotus-plugin-card__footer">
            <span>drag · or click +</span>
            <span className="lotus-plugin-card__footer-dot">●</span>
          </div>
        </div>
      </button>

      {/* + button */}
      <button
        className="lotus-plugin-card__plus"
        onClick={() => onTrigger?.()}
        aria-label="Add to space"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
