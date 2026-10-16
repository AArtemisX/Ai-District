import { CanvasTexture, SRGBColorSpace } from "three";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { html } from "../../map-3d/runtime.js";

// Draw the selected character's card art as a round badge (crop centred at the portrait focus point).
function drawPortrait(canvas, image, focusY, accent) {
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 14, 0, Math.PI * 2); ctx.clip();
  if (image) {
    const side = image.width * .78;
    const sy = Math.max(0, Math.min(image.height - side, image.height * focusY - side / 2));
    ctx.drawImage(image, (image.width - side) / 2, sy, side, side, 0, 0, size, size);
  } else {
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.restore();
  ctx.lineWidth = 10;
  ctx.strokeStyle = accent;
  ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2 - 9, 0, Math.PI * 2); ctx.stroke();
}

// Stylised token body (no 3D character models exist) + floating portrait badge of the chosen character.
export function PlayerAvatar({ controller, portraitSrc, focusY = .39, accent = "#2aa9b8", reducedMotion }) {
  const group = useRef();
  const body = useRef();
  const { canvas, texture } = useMemo(() => {
    const node = document.createElement("canvas");
    node.width = node.height = 256;
    const tex = new CanvasTexture(node);
    tex.colorSpace = SRGBColorSpace;
    return { canvas: node, texture: tex };
  }, []);

  useEffect(() => {
    let live = true;
    drawPortrait(canvas, null, focusY, accent);
    texture.needsUpdate = true;
    if (!portraitSrc) return undefined;
    const image = new Image();
    image.onload = () => { if (!live) return; drawPortrait(canvas, image, focusY, accent); texture.needsUpdate = true; };
    image.src = portraitSrc;
    return () => { live = false; };
  }, [canvas, texture, portraitSrc, focusY, accent]);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }, delta) => {
    const ctrl = controller.current;
    const node = group.current;
    if (!node) return;
    node.position.set(ctrl.player.x, 0, ctrl.player.z);
    // Step out of the shot while the camera frames an exhibit.
    node.visible = ctrl.rig.state !== "FOCUS";
    if (body.current) {
      const current = body.current.rotation.y;
      let diff = ctrl.player.heading - current;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      body.current.rotation.y = reducedMotion ? ctrl.player.heading : current + diff * Math.min(1, delta * 12);
      // Walk cycle: a hop-bob plus a slight forward lean that eases in and out.
      body.current.rotation.order = "YXZ"; // lean around the avatar's own sideways axis
      const moving = !reducedMotion && ctrl.player.moving;
      body.current.position.y = moving ? Math.abs(Math.sin(clock.elapsedTime * 11)) * .12 : 0;
      const lean = moving ? .14 : 0;
      body.current.rotation.x += (lean - body.current.rotation.x) * Math.min(1, delta * 10);
    }
  });

  return html`<group ref=${group}>
    <mesh position=${[0, .03, 0]} rotation-x=${-Math.PI / 2} raycast=${() => null}>
      <circleGeometry args=${[.62, 24]} />
      <meshBasicMaterial color="#24412c" transparent opacity=${.22} depthWrite=${false} />
    </mesh>
    <group ref=${body}>
      <mesh position=${[0, .16, 0]} castShadow raycast=${() => null}>
        <cylinderGeometry args=${[.46, .52, .32, 16]} />
        <meshStandardMaterial color="#fffaf0" roughness=${.6} />
      </mesh>
      <mesh position=${[0, .78, 0]} castShadow raycast=${() => null}>
        <capsuleGeometry args=${[.3, .55, 4, 12]} />
        <meshStandardMaterial color=${accent} roughness=${.5} />
      </mesh>
      <mesh position=${[0, .95, .26]} raycast=${() => null}>
        <sphereGeometry args=${[.09, 10, 8]} />
        <meshStandardMaterial color="#fffaf0" emissive="#fffaf0" emissiveIntensity=${.4} />
      </mesh>
    </group>
    <sprite position=${[0, 2.15, 0]} scale=${[1.15, 1.15, 1]} raycast=${() => null}>
      <spriteMaterial map=${texture} transparent depthWrite=${false} />
    </sprite>
  </group>`;
}
