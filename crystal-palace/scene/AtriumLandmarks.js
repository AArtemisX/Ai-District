import { CylinderGeometry, IcosahedronGeometry, Object3D, SphereGeometry } from "three";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { html } from "../../map-3d/runtime.js";
import { Instances } from "./instancing.js";
import { CUTAWAY } from "./PalaceStructure.js";
import { ELMS, FOUNTAIN } from "../config/palace-layout.js";

const LEAF = ["#4fae4f", "#5dbb55", "#3f9a47", "#6cc35e"];

// Gentle canopy sway: rewrites the instance matrices of one InstancedMesh (no extra draw calls).
// Each item sways around its base pose; higher items move a little more.
function useSway(meshRef, items, { amplitude = .1, speed = .7, reducedMotion }) {
  const dummy = useMemo(() => new Object3D(), []);
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh || reducedMotion) return;
    const t = clock.elapsedTime * speed;
    items.forEach((item, i) => {
      const lift = Math.min(1.6, item.p[1] / 6);
      const phase = item.p[0] * .37 + item.p[2] * .23;
      dummy.position.set(item.p[0] + Math.sin(t + phase) * amplitude * lift, item.p[1], item.p[2] + Math.cos(t * .8 + phase) * amplitude * .6 * lift);
      dummy.rotation.set(...(item.r || [0, 0, 0]));
      dummy.rotation.z += Math.sin(t + phase) * .04;
      dummy.scale.set(...item.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
}

// The full-grown elms Paxton enclosed under the transept vault, as chunky low-poly canopies.
function Elms({ reducedMotion }) {
  const canopy = useRef();
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
  useSway(canopy, data.blobs, { amplitude: .12, speed: .6, reducedMotion });
  return html`<group>
    <${Instances} geometry=${geo.trunk} items=${data.trunks} clip=${CUTAWAY} color="#8a6a48" castShadow roughness=${.9} />
    <${Instances} meshRef=${canopy} geometry=${geo.blob} items=${data.blobs} clip=${CUTAWAY} castShadow roughness=${.85} />
  </group>`;
}

// Osler's crystal fountain (1851): a tall tiered glass fountain on an octagonal stone basin.
// Water spray: droplets travel down from the top bowl to the basin along simple arcs (one
// InstancedMesh), plus two ripple rings on the basin. Frozen in place under reduced motion.
const DROPS = 28;
function FountainWater({ radius, reducedMotion }) {
  const spray = useRef();
  const rings = useRef([]);
  const geo = useMemo(() => new SphereGeometry(.07, 6, 4), []);
  const dummy = useMemo(() => new Object3D(), []);
  const pose = (t, i) => {
    const angle = (i / DROPS) * Math.PI * 2;
    const phase = (t * .55 + i * .37) % 1;
    const r = .5 + phase * (radius - .9);
    const y = 4.6 - phase * phase * 4.1;
    dummy.position.set(Math.cos(angle) * r, Math.max(.55, y), Math.sin(angle) * r);
    dummy.scale.setScalar(1 - phase * .4);
    dummy.updateMatrix();
    return dummy.matrix;
  };
  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.elapsedTime;
    if (spray.current && (!reducedMotion || !spray.current.userData.posed)) {
      for (let i = 0; i < DROPS; i += 1) spray.current.setMatrixAt(i, pose(t, i));
      spray.current.instanceMatrix.needsUpdate = true;
      spray.current.userData.posed = true;
    }
    rings.current.forEach((ring, i) => {
      if (!ring) return;
      const k = reducedMotion ? .5 : (t * .35 + i * .5) % 1;
      ring.scale.setScalar(.6 + k * (radius - .6));
      ring.material.opacity = .45 * (1 - k);
    });
  });
  return html`<group>
    <instancedMesh ref=${spray} args=${[geo, null, DROPS]} frustumCulled=${false} raycast=${() => null}>
      <meshStandardMaterial color="#d8f6ff" emissive="#9fe6f5" emissiveIntensity=${.35} transparent opacity=${.8} roughness=${.1} />
    </instancedMesh>
    ${[0, 1].map((i) => html`<mesh key=${i} ref=${(node) => { rings.current[i] = node; }} position=${[0, .52, 0]} rotation-x=${-Math.PI / 2} raycast=${() => null}>
      <ringGeometry args=${[.92, 1, 40]} />
      <meshBasicMaterial color="#ffffff" transparent opacity=${.3} depthWrite=${false} />
    </mesh>`)}
  </group>`;
}

function CrystalFountain({ reducedMotion }) {
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
    <${FountainWater} radius=${radius} reducedMotion=${reducedMotion} />
  </group>`;
}

export function AtriumLandmarks({ reducedMotion }) {
  return html`<group><${Elms} reducedMotion=${reducedMotion} /><${CrystalFountain} reducedMotion=${reducedMotion} /></group>`;
}

// A light ring of park trees outside so the glass reads against Hyde Park, not a void.
export function ParkTrees({ reducedMotion }) {
  const crownsRef = useRef();
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
  useSway(crownsRef, data.crowns, { amplitude: .14, speed: .5, reducedMotion });
  return html`<group>
    <${Instances} geometry=${geo.trunk} items=${data.trunks} color="#8a6a48" roughness=${.9} />
    <${Instances} meshRef=${crownsRef} geometry=${geo.crown} items=${data.crowns} roughness=${.85} />
  </group>`;
}
