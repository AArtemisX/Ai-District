import { Color, Object3D } from "three";
import { useLayoutEffect, useRef } from "react";
import { html } from "../../map-3d/runtime.js";

// One InstancedMesh per repeated part keeps the whole iron-and-glass frame to a handful of draw calls.
// items: [{ p: [x, y, z], s: [sx, sy, sz], r?: [rx, ry, rz], color? }]
export function Instances({ geometry, items, color = "#ffffff", material = "standard", opacity = 1, castShadow = false, receiveShadow = false, roughness = .7, metalness = 0, flatShading = true, side, onClick, meshRef, clip }) {
  const local = useRef();
  const ref = meshRef || local;
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const tint = new Color();
    items.forEach((item, index) => {
      dummy.position.set(...item.p);
      dummy.rotation.set(...(item.r || [0, 0, 0]));
      dummy.scale.set(...(item.s || [1, 1, 1]));
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      if (item.color) mesh.setColorAt(index, tint.set(item.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  const transparent = opacity < 1;
  const tinted = items.some((item) => item.color);
  const events = onClick ? { onClick } : { raycast: () => null };
  const props = { color: tinted ? "#ffffff" : color, transparent, opacity, depthWrite: !transparent, ...(side === undefined ? {} : { side }), ...(clip ? { clippingPlanes: clip } : {}) };
  return html`<instancedMesh ref=${ref} args=${[geometry, null, items.length]} castShadow=${castShadow} receiveShadow=${receiveShadow} frustumCulled=${false} ...${events}>
    ${material === "basic"
      ? html`<meshBasicMaterial ...${props} />`
      : html`<meshStandardMaterial ...${props} roughness=${roughness} metalness=${metalness} flatShading=${flatShading} />`}
  </instancedMesh>`;
}
