import { AdditiveBlending, CanvasTexture, DoubleSide, LinearFilter, SRGBColorSpace } from "three";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { html } from "./runtime.js";

function drawEventIcon(context, eventType) {
  context.save();
  context.strokeStyle = "#ffffff";
  context.fillStyle = "#ffffff";
  context.lineWidth = 11;
  context.lineCap = "round";
  context.lineJoin = "round";
  if (eventType === "ACTION") {
    context.strokeRect(73, 70, 70, 82);
    context.strokeRect(91, 55, 70, 82);
    context.beginPath(); context.moveTo(112, 92); context.lineTo(142, 92); context.stroke();
  } else if (eventType === "MOVEMENT") {
    context.beginPath(); context.moveTo(62, 105); context.lineTo(105, 72); context.lineTo(105, 91); context.lineTo(148, 91); context.lineTo(148, 72); context.lineTo(190, 105); context.lineTo(148, 138); context.lineTo(148, 119); context.lineTo(105, 119); context.lineTo(105, 138); context.closePath(); context.fill();
  } else if (eventType === "SUPPORT") {
    context.fillRect(105, 57, 32, 96); context.fillRect(73, 89, 96, 32);
  } else if (eventType === "RISK") {
    context.beginPath(); context.moveTo(121, 50); context.lineTo(181, 157); context.lineTo(61, 157); context.closePath(); context.stroke();
    context.fillRect(115, 82, 12, 42); context.beginPath(); context.arc(121, 140, 7, 0, Math.PI * 2); context.fill();
  } else {
    context.beginPath(); context.moveTo(121, 153); context.lineTo(121, 109); context.lineTo(84, 73); context.moveTo(121, 109); context.lineTo(158, 73); context.stroke();
    context.beginPath(); context.arc(84, 70, 11, 0, Math.PI * 2); context.arc(158, 70, 11, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}

function useTileTexture(tile, eventType, visual) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 242;
    canvas.height = 242;
    const context = canvas.getContext("2d");
    // Base color + soft top light, dark frame and inner rim so tiles read apart even in low contrast.
    context.fillStyle = visual.color;
    context.fillRect(0, 0, 242, 242);
    const sheen = context.createLinearGradient(0, 0, 0, 242);
    sheen.addColorStop(0, "rgba(255,255,255,.22)");
    sheen.addColorStop(.55, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(0,0,0,.12)");
    context.fillStyle = sheen;
    context.fillRect(0, 0, 242, 242);
    context.strokeStyle = visual.dark;
    context.lineWidth = 14;
    context.strokeRect(7, 7, 228, 228);
    context.strokeStyle = "rgba(255,255,255,.55)";
    context.lineWidth = 3;
    context.strokeRect(17, 17, 208, 208);
    context.save();
    context.shadowColor = "rgba(0, 20, 45, .45)";
    context.shadowBlur = 6;
    context.shadowOffsetY = 3;
    context.translate(121, 92);
    context.scale(.86, .86);
    context.translate(-121, -105);
    drawEventIcon(context, eventType);
    context.restore();
    context.font = "800 25px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineWidth = 6;
    context.strokeStyle = visual.dark;
    context.strokeText(visual.shortLabel, 121, 196);
    context.fillStyle = "#ffffff";
    context.fillText(visual.shortLabel, 121, 196);
    context.fillStyle = "rgba(4, 26, 55, .78)";
    context.beginPath(); context.arc(38, 38, 22, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#ffffff";
    context.font = "700 24px sans-serif";
    context.fillText(String(tile.index + 1), 38, 39);
    const next = new CanvasTexture(canvas);
    next.colorSpace = SRGBColorSpace;
    next.minFilter = LinearFilter;
    next.generateMipmaps = false;
    return next;
  }, [tile.index, eventType, visual.color, visual.dark, visual.shortLabel]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

const prefersReducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Current-actor tile marker: ground halo outside the tile footprint plus a faint additive light column.
// Purely decorative; it never touches tile transforms, tokens or the dice.
function ActiveTileBeacon() {
  const halo = useRef();
  const beam = useRef();
  const still = useMemo(prefersReducedMotion, []);
  useFrame(({ clock }) => {
    if (still || !halo.current || !beam.current) return;
    const wave = Math.sin(clock.elapsedTime * 3.2);
    const size = 1 + wave * .06;
    halo.current.scale.set(size, size, 1);
    halo.current.material.opacity = .62 + wave * .26;
    beam.current.material.opacity = .13 + wave * .05;
  });
  return html`<group>
    <mesh ref=${halo} position=${[0,-.01,0]} raycast=${() => null} rotation=${[-Math.PI/2,0,0]}><ringGeometry args=${[1.0,1.15,40]} /><meshBasicMaterial color="#ffd84a" transparent opacity=${.85} depthWrite=${false} toneMapped=${false} /></mesh>
    <mesh ref=${beam} position=${[0,1.45,0]} raycast=${() => null}><cylinderGeometry args=${[.84,.96,2.6,32,1,true]} /><meshBasicMaterial color="#fff1a6" transparent opacity=${.15} depthWrite=${false} side=${DoubleSide} blending=${AdditiveBlending} toneMapped=${false} /></mesh>
  </group>`;
}

export function BoardTile({ tile, eventType, visual, selected, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const active = selected || hovered;
  const marker = useTileTexture(tile, eventType, visual);
  return html`
    <group position=${tile.position}>
      <${RoundedBox} args=${[2.02,.22,2.02]} radius=${.08} smoothness=${2} position=${[0,-.13,0]} receiveShadow raycast=${() => null}>
        <meshStandardMaterial color="#f6eedb" roughness=${.9} />
      </${RoundedBox}>
      <${RoundedBox}
        args=${[1.82, .34, 1.82]}
        radius=${.11}
        smoothness=${3}
        castShadow
        receiveShadow
        scale=${selected ? [1.1, 1.15, 1.1] : hovered ? [1.04,1.08,1.04] : [1, 1, 1]}
        onClick=${(event) => { event.stopPropagation(); onSelect(tile); }}
        onPointerOver=${(event) => { event.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut=${() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <meshStandardMaterial color=${visual.color} roughness=${.42} metalness=${.05} emissive=${active ? (selected ? "#ffd95e" : visual.dark) : "#000000"} emissiveIntensity=${selected ? .62 : hovered ? .24 : 0} />
      </${RoundedBox}>
      <mesh position=${[0,.235,0]} rotation=${[-Math.PI/2,0,0]}>
        <planeGeometry args=${[1.5,1.5]} />
        <meshBasicMaterial map=${marker} transparent toneMapped=${false} polygonOffset polygonOffsetFactor=${-1} />
      </mesh>
      ${selected ? html`<${ActiveTileBeacon} />` : null}
      ${active ? html`<mesh position=${[0,.255,0]} rotation=${[-Math.PI/2,0,0]}><ringGeometry args=${[.72,.86,24]} /><meshBasicMaterial color=${selected?"#ffe16a":"#ffffff"} transparent opacity=${selected?.98:.76} depthWrite=${false} /></mesh>` : null}
    </group>
  `;
}
