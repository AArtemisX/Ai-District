import { CylinderGeometry, IcosahedronGeometry } from "three";
import { useMemo } from "react";
import { html } from "../../map-3d/runtime.js";
import { Instances } from "./instancing.js";
import { CUTAWAY } from "./PalaceStructure.js";
import { ELMS, FOUNTAIN } from "../config/palace-layout.js";

const LEAF = ["#4fae4f", "#5dbb55", "#3f9a47", "#6cc35e"];

// The full-grown elms Paxton enclosed under the transept vault, as chunky low-poly canopies.
function Elms() {
  const geo = useMemo(() => ({ trunk: new CylinderGeometry(.32, .55, 1, 7).translate(0, .5, 0), blob: new IcosahedronGeometry(1, 0) }), []);
  const data = useMemo(() => {
    const trunks = ELMS.map((e) => ({ p: [e.x, 0, e.z], s: [1, e.height * .55, 1] }));
    const blobs = [];
    ELMS.forEach((e, i) => {
      const top = e.height * .55;
      const parts = [[0, top + 1.6, 0, 2.3], [-1.3, top + .9, .5, 1.6], [1.2, top + 1.1, -.6, 1.7], [.3, top + 2.9, .2, 1.6], [-.5, top + .4, -1.1, 1.3]];
      parts.forEach(([dx, y, dz, s], j) => blobs.push({ p: [e.x + dx, y, e.z + dz], s: [s, s * .9, s], r: [j, i + j, 0], color: LEAF[(i + j) % LEAF.length] }));
    });
    return { trunks, blobs };
  }, []);
  return html`<group>
    <${Instances} geometry=${geo.trunk} items=${data.trunks} clip=${CUTAWAY} color="#8a6a48" castShadow roughness=${.9} />
    <${Instances} geometry=${geo.blob} items=${data.blobs} clip=${CUTAWAY} castShadow roughness=${.85} />
  </group>`;
}

// Osler's crystal fountain (1851): a tall tiered glass fountain on an octagonal stone basin.
function CrystalFountain() {
  const { x, z, radius } = FOUNTAIN;
  const tiers = [[1.1, 1.3, .9, 1.4], [.55, .75, .7, 2.6], [.32, .5, .6, 3.7], [.16, .3, .5, 4.6]];
  return html`<group position=${[x, 0, z]}>
    <mesh position=${[0, .28, 0]} castShadow receiveShadow raycast=${() => null}>
      <cylinderGeometry args=${[radius, radius + .15, .56, 8]} />
      <meshStandardMaterial color="#f3ead6" roughness=${.8} flatShading />
    </mesh>
    <mesh position=${[0, .5, 0]} rotation-x=${-Math.PI / 2} raycast=${() => null}>
      <circleGeometry args=${[radius - .22, 8]} />
      <meshStandardMaterial color="#6fd3e6" roughness=${.2} />
    </mesh>
    ${tiers.map(([top, bottom, h, y], i) => html`<group key=${i}>
      <mesh position=${[0, y - h / 2, 0]} raycast=${() => null}>
        <cylinderGeometry args=${[top * .4, bottom * .5, h, 8]} />
        <meshStandardMaterial color="#e7f8ff" transparent opacity=${.55} depthWrite=${false} roughness=${.05} />
      </mesh>
      <mesh position=${[0, y, 0]} raycast=${() => null}>
        <cylinderGeometry args=${[bottom * 1.05, top * .55, .14, 8]} />
        <meshStandardMaterial color="#c9efff" transparent opacity=${.62} depthWrite=${false} roughness=${.05} />
      </mesh>
    </group>`)}
    <mesh position=${[0, 5.05, 0]} raycast=${() => null}>
      <octahedronGeometry args=${[.26, 0]} />
      <meshStandardMaterial color="#ffd75e" emissive="#ffb000" emissiveIntensity=${.5} flatShading />
    </mesh>
  </group>`;
}

export function AtriumLandmarks() {
  return html`<group><${Elms} /><${CrystalFountain} /></group>`;
}

// A light ring of park trees outside so the glass reads against Hyde Park, not a void.
export function ParkTrees() {
  const geo = useMemo(() => ({ trunk: new CylinderGeometry(.2, .3, 1, 6).translate(0, .5, 0), crown: new IcosahedronGeometry(1, 0) }), []);
  const data = useMemo(() => {
    let seed = 7;
    const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const trunks = [];
    const crowns = [];
    for (let i = 0; i < 46; i += 1) {
      const a = random() * Math.PI * 2;
      const rx = 52 + random() * 30;
      const rz = 34 + random() * 26;
      const x = Math.cos(a) * rx;
      const tz = Math.sin(a) * rz;
      if (Math.abs(x) < 6 && tz > 20) continue; // keep the entrance avenue clear
      const h = 2.2 + random() * 1.6;
      trunks.push({ p: [x, 0, tz], s: [1, h, 1] });
      crowns.push({ p: [x, h + 1.2, tz], s: [1.8 + random(), 1.7, 1.8 + random()], r: [0, a, 0], color: LEAF[i % LEAF.length] });
    }
    return { trunks, crowns };
  }, []);
  return html`<group>
    <${Instances} geometry=${geo.trunk} items=${data.trunks} color="#8a6a48" roughness=${.9} />
    <${Instances} geometry=${geo.crown} items=${data.crowns} roughness=${.85} />
  </group>`;
}
