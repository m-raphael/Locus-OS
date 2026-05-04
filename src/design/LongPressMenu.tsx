import "./long-press-menu.css";

export interface LongPressAction {
  id: string;
  label: string;
  /** Single-character glyph or emoji shown next to the label. */
  icon: string;
}

export interface LongPressMenuProps {
  /** Client X of the press point. */
  x?: number;
  /** Client Y of the press point. */
  y?: number;
  /** Actions arranged in a radial arc around the press point. */
  actions?: LongPressAction[];
  /** Called with the action id when the user taps a radial action. */
  onAction?: (id: string) => void;
  /** Called when the backdrop is clicked (dismiss). */
  onDismiss?: () => void;
}

/**
 * Radial contextual menu triggered on long-press, with arc-positioned actions.
 *
 * @summary radial action menu with backdrop dim, center pulse, and arc-laid buttons
 */
export function LongPressMenu({
  x = 0,
  y = 0,
  actions = [],
  onAction,
  onDismiss,
}: LongPressMenuProps) {
  const radius = 110;
  const N = actions.length;
  const startDeg = -130;
  const endDeg = 50;
  const stepDeg = N > 1 ? (endDeg - startDeg) / (N - 1) : 0;

  return (
    <>
      {/* Dim backdrop */}
      <div
        className="lotus-long-press-backdrop"
        onClick={onDismiss}
      />

      {/* Center pulse */}
      <div className="lotus-long-press-pulse" style={{ left: x, top: y }}>
        <div className="lotus-long-press-pulse__ring" />
      </div>

      {/* Radial actions */}
      {actions.map((a, i) => {
        const deg = startDeg + i * stepDeg;
        const rad = (deg * Math.PI) / 180;
        const dx = Math.cos(rad) * radius;
        const dy = Math.sin(rad) * radius;

        return (
          <button
            key={a.id}
            className="lotus-long-press-action"
            onClick={(e) => {
              e.stopPropagation();
              onAction?.(a.id);
            }}
            style={{
              left: x,
              top: y,
              transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`,
              animation: `lotusRadialIn 300ms cubic-bezier(.22,.9,.32,1) ${i * 30}ms backwards`,
            }}
          >
            <div className="lotus-long-press-action__inner">
              <span className="lotus-long-press-action__icon">{a.icon}</span>
              <span className="lotus-long-press-action__label">{a.label}</span>
            </div>
          </button>
        );
      })}

      {/* Hint */}
      <div className="lotus-long-press-hint">
        release to choose · click outside to dismiss
      </div>
    </>
  );
}
