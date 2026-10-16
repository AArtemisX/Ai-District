import { CanvasTexture, SRGBColorSpace } from "three";
import { useEffect, useMemo } from "react";
import { html } from "../../map-3d/runtime.js";
import { CUTAWAY } from "./PalaceStructure.js";
import { CARD_TYPE_ART } from "../data/palace-state.js";

// Hanging slots in the north transept (Collection Archive): the end wall first (it faces the follow
// camera), then the side walls, angled a little toward the entrance so they read from the south.
const SIDE = Math.PI / 2 - .45;
const SLOTS = [
  [-3.4, -23.55, 0, 2.5], [3.4, -23.55, 0, 2.5], [0, -23.55, 0, 3.9],
  [-5.5, -21.2, SIDE, 2.5], [5.5, -21.2, -SIDE, 2.5],
  [-5.5, -18.6, SIDE, 2.5], [5.5, -18.6, -SIDE, 2.5],
  [-5.5, -16, SIDE, 2.5], [5.5, -16, -SIDE, 2.5],
];
export const CARD_GALLERY_SLOTS = SLOTS.length;
const W = 1.5;
const H = 2.1;

function paint(canvas, card, image) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  const type = CARD_TYPE_ART[card.type];
  if (card.unlocked && image) {
    const scale = Math.max(w / image.width, h / image.height);
    ctx.drawImage(image, (w - image.width * scale) / 2, (h - image.height * scale) / 2, image.width * scale, image.height * scale);
    return;
  }
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  if (card.unlocked) { grad.addColorStop(0, "#fffaf0"); grad.addColorStop(1, type?.color || "#d9c49a"); } else { grad.addColorStop(0, "#4a4a5c"); grad.addColorStop(1, "#2d2d3a"); }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "120px sans-serif";
  ctx.fillStyle = card.unlocked ? "#24412c" : "#8c8ca6";
  ctx.fillText(card.unlocked ? type?.icon || "🃏" : "?", w / 2, h * .45);
  ctx.font = "600 26px Kanit, sans-serif";
  ctx.fillText(card.unlocked ? card.name : "ยังไม่ปลดล็อก", w / 2, h * .8, w - 30);
}

function Frame({ card, slot }) {
  const { canvas, texture } = useMemo(() => {
    const node = document.createElement("canvas");
    node.width = 256;
    node.height = 358;
    const tex = new CanvasTexture(node);
    tex.colorSpace = SRGBColorSpace;
    return { canvas: node, texture: tex };
  }, []);
  useEffect(() => {
    let live = true;
    paint(canvas, card, null);
    texture.needsUpdate = true;
    if (card.unlocked && card.art) {
      const image = new Image();
      image.onload = () => { if (!live) return; paint(canvas, card, image); texture.needsUpdate = true; };
      image.src = card.art;
    }
    return () => { live = false; };
  }, [canvas, texture, card]);
  useEffect(() => () => texture.dispose(), [texture]);
  const [x, z, ry, y] = slot;
  return html`<group position=${[x, y, z]} rotation-y=${ry}>
    <mesh position=${[0, 0, -.04]} castShadow raycast=${() => null}>
      <boxGeometry args=${[W + .24, H + .24, .08]} />
      <meshStandardMaterial color=${card.unlocked ? "#c9a46f" : "#8a7a62"} roughness=${.8} clippingPlanes=${CUTAWAY} />
    </mesh>
    <mesh raycast=${() => null}>
      <planeGeometry args=${[W, H]} />
      <meshBasicMaterial map=${texture} toneMapped=${false} clippingPlanes=${CUTAWAY} />
    </mesh>
  </group>`;
}

// Read-only wall of reward cards: framed artwork once unlocked on the server, silhouettes otherwise.
export function CardGallery({ archive }) {
  if (!archive?.length) return null;
  return html`<group>${archive.slice(0, SLOTS.length).map((card, i) => html`<${Frame} key=${card.cardId} card=${card} slot=${SLOTS[i]} />`)}</group>`;
}
