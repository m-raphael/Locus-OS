import { type CSSProperties, type HTMLAttributes } from "react";
import { type EntityKind, entityColors } from "./tokens";
import "./entity-chip.css";

export interface EntityChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  kind: EntityKind;
  label: string;
}

/**
 * NER entity chip.
 *
 * Reads its dot/background/hairline colour from `--lotus-entity-{kind}`
 * (with the typed `entityColors` map as a literal fallback). Body text
 * stays themed so the chip works in both Vellum and Moonlight.
 *
 * @summary colored chip for NLP named-entity recognition output
 */
export function EntityChip({ kind, label, className, style, ...rest }: EntityChipProps) {
  const fallback = entityColors[kind];
  const composedStyle = {
    ...style,
    ["--c" as keyof CSSProperties]: `var(--lotus-entity-${kind.toLowerCase()}, ${fallback})`,
  } as CSSProperties;

  return (
    <span
      className={["lotus-entity-chip", className].filter(Boolean).join(" ")}
      style={composedStyle}
      {...rest}
    >
      <span className="lotus-entity-chip__dot" aria-hidden />
      <span className="lotus-entity-chip__kind">{kind.toLowerCase()}</span>
      <span className="lotus-entity-chip__label">{label}</span>
    </span>
  );
}
