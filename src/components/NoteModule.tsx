import { Module } from "../store";

interface Props {
  module: Module;
}

const CARD: React.CSSProperties = {
  minWidth: 240,
  maxWidth: 320,
  background: "var(--fog-bg)",
  backdropFilter: "var(--fog-blur)",
  WebkitBackdropFilter: "var(--fog-blur)",
  border: "var(--fog-border)",
  borderRadius: "var(--fog-radius-module)",
  boxShadow: "var(--fog-shadow)",
  padding: "18px 20px",
  flexShrink: 0,
  transition: `all var(--motion-duration) var(--motion-ease)`,
};

const LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  color: "rgba(255,255,255,0.3)",
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  marginBottom: 8,
};

const CONTENT: React.CSSProperties = {
  fontSize: 14,
  color: "rgba(255,255,255,0.75)",
  lineHeight: 1.5,
};

export default function NoteModule({ module }: Props) {
  let content = "Empty note";
  try {
    const props = JSON.parse(module.props_json) as { content?: string };
    if (props.content) content = props.content;
  } catch {}

  return (
    <div style={CARD}>
      <p style={LABEL}>Note</p>
      <p style={CONTENT}>{content}</p>
    </div>
  );
}
