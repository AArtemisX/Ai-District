import { BoxGeometry, DoubleSide, TorusGeometry } from "three";
import { useMemo } from "react";
import { html } from "../../map-3d/runtime.js";
import { Instances } from "./instancing.js";
import { CUTAWAY, PALACE_COLORS } from "./PalaceStructure.js";
import { TRANSEPT_VAULT } from "../config/palace-layout.js";

// The one central barrel vault of 1851 (N–S), with iron ribs every half bay, purlins along its length,
// and the semicircular fanlight (lunette) with radiating glazing bars at each end.
export function TranseptVault() {
  const { radius: R, springHeight: Y, zMin, zMax } = TRANSEPT_VAULT;
  const length = zMax - zMin;
  const cz = (zMin + zMax) / 2;
  const geo = useMemo(() => ({ rib: new TorusGeometry(R, .13, 4, 28, Math.PI), box: new BoxGeometry(1, 1, 1) }), [R]);
  const data = useMemo(() => {
    const ribs = [];
    for (let z = zMin; z <= zMax + 1e-6; z += 2) ribs.push({ p: [0, Y, z], s: [1, 1, 1] });
    const purlins = [];
    for (let i = 1; i < 8; i += 1) {
      const a = (i / 8) * Math.PI;
      purlins.push({ p: [Math.cos(a) * R, Y + Math.sin(a) * R, cz], s: [.1, .1, length] });
    }
    const spokes = [];
    for (const z of [zMin, zMax]) {
      for (let i = 1; i < 12; i += 1) {
        const a = (i / 12) * Math.PI;
        spokes.push({ p: [Math.cos(a) * R / 2, Y + Math.sin(a) * R / 2, z], s: [R, .08, .08], r: [0, 0, a] });
      }
      spokes.push({ p: [0, Y + .9, z], s: [3.2, .08, .08] });
    }
    return { ribs, purlins, spokes };
  }, [R, Y, zMin, zMax, cz, length]);
  return html`<group>
    <mesh position=${[0, Y, cz]} rotation-x=${-Math.PI / 2} raycast=${() => null}>
      <cylinderGeometry args=${[R, R, length, 28, 1, true, -Math.PI / 2, Math.PI]} />
      <meshStandardMaterial color=${PALACE_COLORS.glass} transparent opacity=${.2} depthWrite=${false} side=${DoubleSide} roughness=${.05} metalness=${.3} clippingPlanes=${CUTAWAY} />
    </mesh>
    ${[zMin, zMax].map((z) => html`<mesh key=${z} position=${[0, Y, z]} raycast=${() => null}>
      <circleGeometry args=${[R, 28, 0, Math.PI]} />
      <meshStandardMaterial color=${PALACE_COLORS.glass} transparent opacity=${.22} depthWrite=${false} side=${DoubleSide} roughness=${.1} clippingPlanes=${CUTAWAY} />
    </mesh>`)}
    <${Instances} geometry=${geo.rib} items=${data.ribs} clip=${CUTAWAY} color=${PALACE_COLORS.girder} roughness=${.55} />
    <${Instances} geometry=${geo.box} items=${[...data.purlins, ...data.spokes]} clip=${CUTAWAY} color=${PALACE_COLORS.girder} roughness=${.55} />
  </group>`;
}
