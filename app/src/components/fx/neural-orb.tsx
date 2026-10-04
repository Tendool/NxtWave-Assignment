"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * A slowly turning "neural" sphere: ink nodes and links, flame nodes that pulse, and small packets of light
 * travelling along the links. Colours come from the site's CSS variables, so it follows light/dark mode.
 */

const NODES = 150;
const RADIUS = 1.65;
const HOT = 14; // pulsing flame nodes
const PACKETS = 12;

function fibonacciSphere(n: number, r: number) {
  const pts: THREE.Vector3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const t = golden * i;
    // A little jitter so it reads as organic, not as a golf ball.
    const j = 1 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * 0.06;
    pts.push(new THREE.Vector3(Math.cos(t) * rad * r * j, y * r * j, Math.sin(t) * rad * r * j));
  }
  return pts;
}

/** Each node linked to its 3 nearest neighbours, without duplicates. */
function nearestEdges(pts: THREE.Vector3[], k = 3) {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  pts.forEach((p, i) => {
    pts
      .map((q, j) => ({ j, d: i === j ? Infinity : p.distanceToSquared(q) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, k)
      .forEach(({ j }) => {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([i, j]);
        }
      });
  });
  return edges;
}

function dotTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.55, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

type Palette = { ink: string; flame: string; marker: string };

function readPalette(): Palette {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;
  return { ink: v("--ink", "#16120e"), flame: v("--flame", "#ff4a1c"), marker: v("--marker", "#ffe14d") };
}

function Orb({ palette, pointer }: { palette: Palette; pointer: React.RefObject<{ x: number; y: number }> }) {
  const group = useRef<THREE.Group>(null);
  const hotMat = useRef<THREE.PointsMaterial>(null);
  const packetAttr = useRef<THREE.BufferAttribute>(null);

  const { nodes, edges, nodePos, linePos, hotPos } = useMemo(() => {
    const nodes = fibonacciSphere(NODES, RADIUS);
    const edges = nearestEdges(nodes);
    const nodePos = new Float32Array(nodes.flatMap((p) => [p.x, p.y, p.z]));
    const linePos = new Float32Array(edges.flatMap(([a, b]) => [nodes[a].x, nodes[a].y, nodes[a].z, nodes[b].x, nodes[b].y, nodes[b].z]));
    const hot = Array.from({ length: HOT }, (_, i) => nodes[Math.floor(((i * 7919) % NODES))]);
    const hotPos = new Float32Array(hot.flatMap((p) => [p.x, p.y, p.z]));
    return { nodes, edges, nodePos, linePos, hotPos };
  }, []);

  // Packets: each rides one edge from 0 → 1, then picks another.
  const packets = useMemo(
    () => Array.from({ length: PACKETS }, (_, i) => ({ edge: (i * 37) % edges.length, t: (i / PACKETS) % 1, speed: 0.35 + ((i * 13) % 7) / 20 })),
    [edges.length],
  );
  const packetPos = useMemo(() => new Float32Array(PACKETS * 3), []);
  const tex = useMemo(() => dotTexture(), []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += delta * 0.12;
    const p = pointer.current ?? { x: 0, y: 0 };
    g.rotation.x += (p.y * 0.35 - g.rotation.x) * 0.04;
    g.rotation.z += (-p.x * 0.15 - g.rotation.z) * 0.04;

    if (hotMat.current) hotMat.current.size = 0.13 + Math.sin(state.clock.elapsedTime * 2.2) * 0.035;

    packets.forEach((pk, i) => {
      pk.t += delta * pk.speed;
      if (pk.t >= 1) {
        pk.t = 0;
        pk.edge = Math.floor(Math.random() * edges.length);
      }
      const [a, b] = edges[pk.edge];
      const v = new THREE.Vector3().lerpVectors(nodes[a], nodes[b], pk.t);
      packetPos.set([v.x, v.y, v.z], i * 3);
    });
    if (packetAttr.current) packetAttr.current.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePos, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={palette.ink} transparent opacity={0.22} />
      </lineSegments>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nodePos, 3]} />
        </bufferGeometry>
        <pointsMaterial color={palette.ink} size={0.06} map={tex} transparent alphaTest={0.3} sizeAttenuation />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[hotPos, 3]} />
        </bufferGeometry>
        <pointsMaterial ref={hotMat} color={palette.flame} size={0.13} map={tex} transparent alphaTest={0.3} sizeAttenuation />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute ref={packetAttr} attach="attributes-position" args={[packetPos, 3]} />
        </bufferGeometry>
        <pointsMaterial color={palette.marker} size={0.09} map={tex} transparent alphaTest={0.3} sizeAttenuation />
      </points>
    </group>
  );
}

export default function NeuralOrb() {
  const wrap = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  // Client-only component (loaded with ssr: false), so the document is there on first render.
  const [palette, setPalette] = useState<Palette>(readPalette);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Follow the theme toggle.
    const mo = new MutationObserver(() => setPalette(readPalette()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    // The canvas sits behind the text, so track the pointer on the window instead.
    const move = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener("pointermove", move, { passive: true });
    // Don't spend GPU while scrolled away.
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (wrap.current) io.observe(wrap.current);
    return () => {
      mo.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", move);
    };
  }, []);

  return (
    <div ref={wrap} className="size-full">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        frameloop={visible ? "always" : "never"}
      >
        <Orb palette={palette} pointer={pointer} />
      </Canvas>
    </div>
  );
}
