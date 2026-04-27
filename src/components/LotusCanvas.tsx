interface Props { accent: string; }

const GRAIN_SVG = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

export default function LotusCanvas({ accent }: Props) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "var(--bg)" }}>
      {/* blob A */}
      <div style={{
        position: "absolute", left: "-12%", top: "-18%", width: "70%", height: "120%",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${accent}33, transparent 60%)`,
        filter: "blur(80px)",
        animation: "lotusBlobA 22s ease-in-out infinite",
      }}/>
      {/* blob B */}
      <div style={{
        position: "absolute", right: "-15%", top: "10%", width: "65%", height: "110%",
        borderRadius: "50%",
        background: "radial-gradient(circle, oklch(85% 0.05 30 / 0.55), transparent 60%)",
        filter: "blur(90px)",
        animation: "lotusBlobB 28s ease-in-out infinite",
      }}/>
      {/* blob C */}
      <div style={{
        position: "absolute", left: "20%", bottom: "-25%", width: "75%", height: "120%",
        borderRadius: "50%",
        background: "radial-gradient(circle, oklch(82% 0.04 220 / 0.6), transparent 60%)",
        filter: "blur(100px)",
        animation: "lotusBlobC 32s ease-in-out infinite",
      }}/>
      {/* film grain */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        opacity: "var(--grain-opacity)",
        mixBlendMode: "var(--grain-blend)" as React.CSSProperties["mixBlendMode"],
        backgroundImage: GRAIN_SVG,
        backgroundSize: "200px 200px",
      }}/>
      {/* vignette */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "var(--vignette)" }}/>
    </div>
  );
}
