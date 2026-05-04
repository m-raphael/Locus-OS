import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

interface Props { accent: string; }

const GRAIN_SVG = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

function parseAccent(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

const blobVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const blobFragmentShader = `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vPosition;

  // Simplex-like noise
  float hash(vec3 p) {
    float h = dot(p, vec3(127.1, 311.7, 74.7));
    return fract(sin(h) * 43758.5453);
  }

  float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }

  void main() {
    vec3 pos = vPosition * 2.5 + uTime * uSpeed * 0.3;
    float n = noise(pos) * 0.5 + noise(pos * 2.0) * 0.3 + noise(pos * 4.0) * 0.2;

    // Radial gradient toward edges
    float dist = length(vUv - 0.5) * 2.0;
    float alpha = smoothstep(1.0, 0.0, dist) * uOpacity * (0.6 + 0.4 * n);

    // Edge glow
    float glow = smoothstep(0.5, 1.0, dist) * uOpacity * 0.5;
    vec3 color = mix(uColor, uColor * 1.5, glow);

    gl_FragColor = vec4(color, alpha);
  }
`;

function BlobSphere({ color, speed, opacity, scale, position }: {
  color: [number, number, number];
  speed: number; opacity: number;
  scale: number; position: [number, number, number];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(color[0], color[1], color[2]) },
    uTime: { value: 0 },
    uSpeed: { value: speed },
    uOpacity: { value: opacity },
  }), [color, speed, opacity]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      uniforms.uTime.value += delta;
      // Gentle orbital motion
      meshRef.current.position.x = position[0] + Math.sin(uniforms.uTime.value * 0.15) * 1.2;
      meshRef.current.position.y = position[1] + Math.cos(uniforms.uTime.value * 0.2) * 0.8;
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial
        vertexShader={blobVertexShader}
        fragmentShader={blobFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function Scene({ accent }: { accent: string }) {
  const [r, g, b] = parseAccent(accent);

  return (
    <>
      <color attach="background" args={["#0a0a0f"]} />

      <BlobSphere
        color={[r, g, b]}
        speed={0.8}
        opacity={0.35}
        scale={6}
        position={[-5, 3, -4]}
      />
      <BlobSphere
        color={[0.95, 0.72, 0.45]}
        speed={0.5}
        opacity={0.28}
        scale={5.5}
        position={[6, 1, -3]}
      />
      <BlobSphere
        color={[0.35, 0.68, 0.92]}
        speed={0.65}
        opacity={0.3}
        scale={6.5}
        position={[1, -4, -5]}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.6}
          radius={0.5}
        />
      </EffectComposer>
    </>
  );
}

export default function LotusCanvas({ accent }: Props) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0a0a0f" }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, alpha: false }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Scene accent={accent} />
      </Canvas>

      {/* Film grain overlay — kept in CSS for performance */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        opacity: "var(--grain-opacity)",
        mixBlendMode: "var(--grain-blend)" as React.CSSProperties["mixBlendMode"],
        backgroundImage: GRAIN_SVG,
        backgroundSize: "200px 200px",
      }}/>
      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "var(--vignette)" }}/>
    </div>
  );
}
