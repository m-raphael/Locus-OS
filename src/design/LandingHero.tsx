import { type HTMLAttributes } from "react";
import "./landing-hero.css";

export interface IntentChip {
  label: string;
  ago: string;
  count: number;
  /** Percentage left position inside container. Default "50%". */
  x?: string;
  /** Percentage top position inside container. Default "50%". */
  y?: string;
  /** Visual scale. Default 1. */
  scale?: number;
  /** Animation entry delay in ms. Default 0. */
  delay?: number;
  /** Drift animation duration in seconds. Default 12. */
  driftDuration?: number;
}

export interface LandingHeroProps extends HTMLAttributes<HTMLDivElement> {
  /** Floating intent chips orbiting the hero text. */
  intents?: IntentChip[];
  /** Name displayed in the greeting line, e.g. "alex". */
  name?: string;
  /** Override greeting (auto-computed from hour if omitted). */
  greeting?: string;
  /** Called when a user clicks/taps an intent chip. */
  onPickIntent?: (label: string) => void;
}

function computeGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "still up";
  if (h < 12) return "good morning";
  if (h < 18) return "good afternoon";
  return "good evening";
}

/**
 * Landing page hero with floating recent-intent chips and centered prompt.
 *
 * @summary animated landing screen with drifting intent chips around a "What's on your mind?" hero
 */
export function LandingHero({
  intents = [],
  name = "alex",
  greeting: greetingOverride,
  onPickIntent,
  className,
  style,
  ...rest
}: LandingHeroProps) {
  const greeting = greetingOverride ?? computeGreeting();

  return (
    <div className={["lotus-landing-hero", className].filter(Boolean).join(" ")} style={style} {...rest}>
      {/* Floating intent chips */}
      {intents.map((r, i) => {
        const driftDur = r.driftDuration ?? 10 + i * 1.3;
        return (
          <button
            key={i}
            className="lotus-landing-hero__intent-chip"
            onClick={() => onPickIntent?.(r.label)}
            style={{
              left: r.x ?? "50%",
              top: r.y ?? "50%",
              transform: `translate(-50%, -50%) scale(${r.scale ?? 1})`,
              animation: `lotusHeroFloatIn 900ms cubic-bezier(.22,.9,.32,1) ${r.delay ?? 0}ms backwards, lotusDrift ${driftDur}s ease-in-out ${(i * 0.4).toFixed(1)}s infinite`,
            }}
            aria-label={`Open "${r.label}" flow`}
          >
            <div className="lotus-landing-hero__chip-inner">
              <div className="lotus-landing-hero__chip-meta">
                <span className="lotus-landing-hero__chip-dot" />
                <span>{r.ago}</span>
                <span>·</span>
                <span>{r.count} modules</span>
              </div>
              <div className="lotus-landing-hero__chip-label">{r.label}</div>
            </div>
          </button>
        );
      })}

      {/* Centered hero prompt */}
      <div className="lotus-landing-hero__center">
        <div style={{ maxWidth: 640, padding: "0 32px" }}>
          <div className="lotus-landing-hero__greeting">
            {greeting}, {name}
          </div>
          <h1 className="lotus-landing-hero__headline">
            What's on
            <br />
            your mind?
          </h1>
          <p className="lotus-landing-hero__subtitle">
            Type below — or pick a flow you've been working on.
          </p>
        </div>
      </div>
    </div>
  );
}
