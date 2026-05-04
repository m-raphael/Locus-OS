import { type HTMLAttributes } from "react";
import "./spaceflow-view.css";

export interface SpaceflowSidebarItem {
  title: string;
  subtitle?: string;
  icon?: string;
  active?: boolean;
}

export interface SpaceflowApartment {
  rooms: string;
  name: string;
  price: string;
  img: string;
  popped?: boolean;
  avatar?: string;
}

export interface SpaceflowViewProps extends HTMLAttributes<HTMLDivElement> {
  /** Big dimmed title behind the card stack. */
  spaceLabel?: string;
  /** Prompt bar text shown at the top of the center card. */
  flowTitle?: string;
  /** Flow items shown in the left sidebar. */
  flows?: SpaceflowSidebarItem[];
  /** Apartments shown in the center card (variant="apartments"). */
  apartments?: SpaceflowApartment[];
  /** Variant: "apartments" (default) or "email". */
  variant?: "apartments" | "email";
  /** Email data for the email variant. */
  email?: { from: string; subject: string; body: string; time: string };
  /** Animate the entry. */
  animate?: boolean;
  onBack?: () => void;
  onNewFlow?: () => void;
  onAddModule?: () => void;
}

/**
 * Spaceflow detail page with left sidebar, glass stacked card, and add-module button.
 *
 * @summary spaceflow detail view with sidebar, card stack, and 3D entry animation
 */
export function SpaceflowView({
  spaceLabel = "Plan Move to SF",
  flowTitle = "Find 4 bedroom apartments in San Francisco",
  flows: flowItems,
  apartments,
  variant = "apartments",
  email,
  animate = false,
  onBack,
  onNewFlow,
  onAddModule,
  className,
  style,
  ...rest
}: SpaceflowViewProps) {
  const defaultFlows: SpaceflowSidebarItem[] = variant === "email"
    ? [
        { title: "Coffee?", subtitle: "Marisa Lu", icon: "✉", active: true },
        { title: "Feedback", subtitle: "Lindsey Webb", icon: "✉" },
        { title: "Post-grad plans", subtitle: "Evelyn Ma", icon: "📄" },
        { title: "Launch plan", subtitle: "Demetri Im", icon: "📄" },
      ]
    : [
        { title: flowTitle, icon: "🏠", active: true },
        { title: "Devin, Victoria, Marisa", icon: "○" },
        { title: "Live Playlist", subtitle: "🔊", icon: "♪" },
      ];

  const flows = flowItems ?? defaultFlows;

  return (
    <div
      className={["lotus-spaceflow", className].filter(Boolean).join(" ")}
      style={style}
      {...rest}
    >
      {/* Big dimmed Space title */}
      <div className="lotus-spaceflow__bg-title">
        <h1>{spaceLabel}</h1>
      </div>

      {/* Top chrome */}
      <div className="lotus-spaceflow__chrome">
        <button className="lotus-spaceflow__back" onClick={onBack}>←</button>
        <span className="lotus-spaceflow__time">9:41</span>
      </div>

      {/* Left flow sidebar */}
      <div className="lotus-spaceflow__sidebar">
        <button className="lotus-spaceflow__new-flow" onClick={onNewFlow}>
          <span>+</span>
          <span>New flow</span>
        </button>
        {flows.map((f, i) => (
          <button
            key={i}
            className={[
              "lotus-spaceflow__flow-item",
              f.active ? "lotus-spaceflow__flow-item--active" : null,
            ].filter(Boolean).join(" ")}
            style={{ opacity: f.active ? 1 : 0.55 }}
          >
            <span className="lotus-spaceflow__flow-icon">{f.icon}</span>
            <span className="lotus-spaceflow__flow-label">
              {f.title}
              {f.subtitle && <span className="lotus-spaceflow__flow-sub"> · {f.subtitle}</span>}
            </span>
          </button>
        ))}
      </div>

      {/* Center card */}
      <div
        className="lotus-spaceflow__card"
        style={{
          animation: animate ? "lotusStackIn 900ms cubic-bezier(.22,.9,.32,1)" : "none",
          width: variant === "email" ? 460 : 540,
        }}
      >
        <div className="lotus-spaceflow__card-inner">
          {/* Prompt bar */}
          <div className="lotus-spaceflow__prompt">
            <span className="lotus-spaceflow__prompt-icon">
              {variant === "email" ? "✉" : "🏠"}
            </span>
            <span className="lotus-spaceflow__prompt-text">
              {variant === "email" ? `${email?.subject ?? "Coffee?"} · Mail from ${email?.from ?? "Marisa Lu"}` : flowTitle}
            </span>
            <span className="lotus-spaceflow__prompt-mic">🎤</span>
          </div>

          {variant === "apartments" && apartments ? (
            <>
              <div className="lotus-spaceflow__apartments">
                {apartments.map((ap, i) => (
                  <div
                    key={i}
                    style={{
                      animation: animate
                        ? `lotusRowIn 600ms cubic-bezier(.22,.9,.32,1) ${200 + i * 120}ms backwards`
                        : "none",
                    }}
                  >
                    <div
                      className={[
                        "lotus-spaceflow__ap-row",
                        ap.popped ? "lotus-spaceflow__ap-row--popped" : null,
                      ].filter(Boolean).join(" ")}
                    >
                      {ap.popped && ap.avatar && (
                        <div className="lotus-spaceflow__ap-avatar">{ap.avatar}</div>
                      )}
                      <div className="lotus-spaceflow__ap-info">
                        <div className="lotus-spaceflow__ap-rooms">{ap.rooms}</div>
                        <div className="lotus-spaceflow__ap-name">{ap.name}</div>
                        <div className="lotus-spaceflow__ap-price">{ap.price}</div>
                      </div>
                      <div className="lotus-spaceflow__ap-img" style={{ background: ap.img }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="lotus-spaceflow__actions">
                <button className="lotus-spaceflow__chip">Add all to flow</button>
                <button className="lotus-spaceflow__chip">Find some more</button>
              </div>
            </>
          ) : variant === "email" && email ? (
            <>
              <div className="lotus-spaceflow__email">
                <div className="lotus-spaceflow__email-header">
                  <div className="lotus-spaceflow__email-from">{email.from}</div>
                  <div className="lotus-spaceflow__email-time">{email.time}</div>
                </div>
                <div className="lotus-spaceflow__email-subject">{email.subject}</div>
                <div className="lotus-spaceflow__email-body">{email.body}</div>
              </div>
              <div className="lotus-spaceflow__actions">
                <button className="lotus-spaceflow__chip">Reply</button>
                <button className="lotus-spaceflow__chip">Forward</button>
                <button className="lotus-spaceflow__chip">Delete</button>
              </div>
            </>
          ) : null}

          <button className="lotus-spaceflow__more">× More actions</button>
        </div>
      </div>

      {/* + add module button */}
      <button className="lotus-spaceflow__add-btn" onClick={onAddModule} aria-label="Add module">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
