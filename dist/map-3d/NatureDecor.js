import { Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry, IcosahedronGeometry, Object3D, SphereGeometry } from "three";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { html } from "./runtime.js";

// Decorative valley around Neo District (cozy low-poly reference). Visual only: no interaction,
// no raycast, no gameplay data. Every repeated prop is one InstancedMesh so Safari stays light.

const BOARD_CLEARANCE = 11.2;
const POND = { x: 15.6, z: -5.4, rx: 2.05, rz: 1.6 };

function seeded(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Matches the terraces built in CityFoundation (plaza / middle step / outer base), in scene units.
export function groundHeight(x, z) {
  if (Math.abs(x) < 11.3 && Math.abs(z) < 11.3) return .11;
  if (Math.abs(x) < 13.5 && Math.abs(z) < 12.5) return -.04;
  return -.17;
}

const inPond = (x, z, pad = 0) => ((x - POND.x) / (POND.rx + pad)) ** 2 + ((z - POND.z) / (POND.rz + pad)) ** 2 < 1;

function scatter({ count, seed, min = BOARD_CLEARANCE, maxX = 18.3, maxZ = 16.3, spacing = .9, avoid = [] }) {
  const random = seeded(seed);
  const points = [];
  for (let tries = 0; points.length < count && tries < count * 60; tries += 1) {
    const x = (random() * 2 - 1) * maxX;
    const z = (random() * 2 - 1) * maxZ;
    if (Math.abs(x) < min && Math.abs(z) < min) continue;
    if (inPond(x, z, .6)) continue;
    if ([...avoid, ...points].some((p) => Math.hypot(p.x - x, p.z - z) < spacing)) continue;
    points.push({ x, z, r: random(), y: groundHeight(x, z) });
  }
  return points;
}

function Instanced({ geometry, color, items, transform, roughness = .85, castShadow = true, colors }) {
  const ref = useRef();
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const tint = new Color();
    items.forEach((item, index) => {
      transform(dummy, item);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      if (colors) mesh.setColorAt(index, tint.set(colors[Math.floor(item.r * colors.length) % colors.length]));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
      mesh.material.needsUpdate = true;
    }
  }, [items, transform, colors]);
  return html`<instancedMesh ref=${ref} args=${[geometry, null, items.length]} castShadow=${castShadow} receiveShadow raycast=${() => null}>
    <meshStandardMaterial color=${colors ? "#ffffff" : color} roughness=${roughness} flatShading />
  </instancedMesh>`;
}

// Trees closer to the board stay short so they never hide edge tiles at low camera angles.
const treeScale = (p) => Math.min(1.45, .78 + Math.max(0, Math.max(Math.abs(p.x), Math.abs(p.z)) - BOARD_CLEARANCE) * .12) * (.9 + p.r * .2);
const place = (dummy, p, scale, lift = 0) => {
  dummy.position.set(p.x, p.y + lift, p.z);
  dummy.rotation.set(0, p.r * Math.PI * 2, 0);
  dummy.scale.setScalar(scale);
};

export function NatureDecor() {
  const geo = useMemo(() => ({
    trunk: new CylinderGeometry(.08, .12, .5, 6).translate(0, .25, 0),
    pineLow: new ConeGeometry(.58, 1.05, 7).translate(0, .88, 0),
    pineHigh: new ConeGeometry(.4, .8, 7).translate(0, 1.42, 0),
    crown: new IcosahedronGeometry(.55, 0).translate(0, 1.02, 0),
    bush: new IcosahedronGeometry(.32, 0).translate(0, .2, 0),
    flower: new IcosahedronGeometry(.075, 0).translate(0, .1, 0),
    stem: new CylinderGeometry(.035, .045, .14, 5).translate(0, .07, 0),
    cap: new SphereGeometry(.12, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, .13, 0),
    rock: new DodecahedronGeometry(.26, 0).translate(0, .1, 0),
    tuft: new ConeGeometry(.08, .28, 4).translate(0, .14, 0),
  }), []);
  useEffect(() => () => Object.values(geo).forEach((geometry) => geometry.dispose()), [geo]);

  const layout = useMemo(() => {
    const pines = scatter({ count: 38, seed: 11, spacing: 1.25 });
    const rounds = scatter({ count: 22, seed: 23, spacing: 1.25, avoid: pines });
    const trees = [...pines, ...rounds];
    const bushes = scatter({ count: 34, seed: 37, min: 10.5, spacing: .7, avoid: trees });
    const flowers = scatter({ count: 120, seed: 41, min: 10.3, spacing: .28, avoid: trees });
    const mushrooms = scatter({ count: 14, seed: 53, min: 10.6, spacing: .6, avoid: trees });
    const rocks = scatter({ count: 16, seed: 67, min: 10.6, spacing: .8, avoid: trees });
    const tufts = scatter({ count: 70, seed: 79, min: 10.2, spacing: .3, avoid: trees });
    return { pines, rounds, bushes, flowers, mushrooms, rocks, tufts };
  }, []);

  const tf = useMemo(() => ({
    tree: (d, p) => place(d, p, treeScale(p)),
    bush: (d, p) => place(d, p, .8 + p.r * .7),
    small: (d, p) => place(d, p, .85 + p.r * .5),
    rock: (d, p) => { place(d, p, .6 + p.r * .9); d.scale.y *= .65; },
  }), []);

  const lily = [[-.7, .3], [.5, -.4], [.9, .5], [-.2, -.7]];
  const reeds = [[-1.7, .6], [-1.85, .2], [-1.6, -.3], [1.95, -.5], [2.05, -.1]];
  const pondY = groundHeight(POND.x, POND.z);

  return html`<group>
    <${Instanced} geometry=${geo.trunk} color="#8a5a3b" items=${[...layout.pines, ...layout.rounds]} transform=${tf.tree} />
    <${Instanced} geometry=${geo.pineLow} items=${layout.pines} transform=${tf.tree} colors=${["#2f8f57", "#3a9e5f", "#2b7f63"]} />
    <${Instanced} geometry=${geo.pineHigh} items=${layout.pines} transform=${tf.tree} colors=${["#46b26b", "#3fa36a", "#52b878"]} />
    <${Instanced} geometry=${geo.crown} items=${layout.rounds} transform=${tf.tree} colors=${["#5cb847", "#71c552", "#4fa84a"]} />
    <${Instanced} geometry=${geo.bush} items=${layout.bushes} transform=${tf.bush} colors=${["#5fb44c", "#79c95a", "#4ea24a"]} />
    <${Instanced} geometry=${geo.flower} items=${layout.flowers} transform=${tf.small} castShadow=${false} roughness=${.6} colors=${["#ffffff", "#fff2a8", "#ffd34d", "#ffffff"]} />
    <${Instanced} geometry=${geo.stem} color="#f6efe0" items=${layout.mushrooms} transform=${tf.small} />
    <${Instanced} geometry=${geo.cap} items=${layout.mushrooms} transform=${tf.small} colors=${["#e8463f", "#f0703a"]} roughness=${.5} />
    <${Instanced} geometry=${geo.rock} items=${layout.rocks} transform=${tf.rock} colors=${["#b9c0c4", "#a7aeb3", "#cfd4d6"]} />
    <${Instanced} geometry=${geo.tuft} items=${layout.tufts} transform=${tf.small} castShadow=${false} colors=${["#4f9f3f", "#5fb04a"]} />

    <group position=${[POND.x, pondY, POND.z]}>
      <mesh position=${[0, .03, 0]} scale=${[POND.rx + .3, 1, POND.rz + .3]} receiveShadow><cylinderGeometry args=${[1, 1.04, .1, 20]} /><meshStandardMaterial color="#d8c79a" roughness=${.95} flatShading /></mesh>
      <mesh position=${[0, .07, 0]} scale=${[POND.rx, 1, POND.rz]}><cylinderGeometry args=${[1, 1, .06, 20]} /><meshStandardMaterial color="#47b4e6" roughness=${.15} metalness=${.05} emissive="#1b7fb6" emissiveIntensity=${.18} /></mesh>
      ${lily.map(([x, z], index) => html`<mesh key=${index} position=${[x, .115, z]} rotation=${[0, index, 0]}><cylinderGeometry args=${[.2, .2, .02, 7, 1, false, 0, Math.PI * 1.75]} /><meshStandardMaterial color="#58b84a" flatShading /></mesh>`)}
      ${reeds.map(([x, z], index) => html`<group key=${index} position=${[x, .05, z]}>
        <mesh position=${[0, .3, 0]}><cylinderGeometry args=${[.02, .025, .6, 4]} /><meshStandardMaterial color="#6fa64a" /></mesh>
        <mesh position=${[0, .62, 0]}><capsuleGeometry args=${[.045, .14, 2, 5]} /><meshStandardMaterial color="#8a5a3b" /></mesh>
      </group>`)}
    </group>

    ${[[13.2, 8.6, .4], [-14.4, -8.8, -.5], [-15.6, 6.2, 1.2]].map(([x, z, rotation], index) => html`<group key=${`log-${index}`} position=${[x, groundHeight(x, z) + .14, z]} rotation=${[0, rotation, Math.PI / 2]}>
      <mesh castShadow><cylinderGeometry args=${[.14, .16, 1.1, 7]} /><meshStandardMaterial color="#9a6640" flatShading /></mesh>
      <mesh position=${[0, .56, 0]}><cylinderGeometry args=${[.12, .12, .02, 7]} /><meshStandardMaterial color="#e8c48e" /></mesh>
    </group>`)}
  </group>`;
}
