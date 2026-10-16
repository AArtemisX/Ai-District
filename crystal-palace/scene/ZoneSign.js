import { CanvasTexture, SRGBColorSpace } from "three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { html } from "../../map-3d/runtime.js";
import { CUTAWAY } from "./PalaceStructure.js";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSign(canvas, zone) {
  const ctx = canvas.getContext("2d");
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#d9c49a";
  roundRect(ctx, 6, 14, w - 12, h - 20, 34); ctx.fill();
  ctx.fillStyle = "#fffaf0";
  roundRect(ctx, 6, 4, w - 12, h - 22, 34); ctx.fill();
  ctx.fillStyle = zone.color;
  roundRect(ctx, 24, 22, 22, h - 58, 11); ctx.fill();
  ctx.fillStyle = "#24412c";
  ctx.textBaseline = "middle";
  ctx.font = "600 52px Kanit, sans-serif";
  ctx.fillText(zone.open ? zone.nameTh : `${zone.nameTh} · เร็วๆ นี้`, 70, h * .36, w - 96);
  ctx.fillStyle = "#5f7458";
  ctx.font = "500 32px Kanit, sans-serif";
  ctx.fillText(zone.name.toUpperCase(), 70, h * .68, w - 96);
}

// Hanging zone banner as a camera-facing sprite (one draw call each, no font download in WebGL).
export function ZoneSign({ zone, fontsReady, controller }) {
  const material = useRef();
  const { canvas, texture } = useMemo(() => {
    const node = document.createElement("canvas");
    node.width = 640;
    node.height = 170;
    const tex = new CanvasTexture(node);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return { canvas: node, texture: tex };
  }, []);
  useEffect(() => {
    drawSign(canvas, zone);
    texture.needsUpdate = true;
  }, [canvas, texture, zone, fontsReady]);
  useEffect(() => () => texture.dispose(), [texture]);
  // Fade a sign out as the player walks under it so it never hides the avatar.
  useFrame(() => {
    const player = controller?.current.player;
    if (!player || !material.current) return;
    const distance = Math.hypot(player.x - zone.sign.x, player.z - zone.sign.z);
    material.current.opacity = Math.min(1, Math.max(0, (distance - 3) / 3));
  });
  const scale = zone.open ? 1 : .8;
  return html`<sprite position=${[zone.sign.x, zone.sign.y, zone.sign.z]} scale=${[4.6 * scale, 1.22 * scale, 1]} raycast=${() => null}>
    <spriteMaterial ref=${material} map=${texture} transparent depthWrite=${false} clippingPlanes=${CUTAWAY} />
  </sprite>`;
}
