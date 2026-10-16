import { BoxGeometry, CanvasTexture, DoubleSide, ExtrudeGeometry, Plane, PlaneGeometry, RepeatWrapping, Shape, ShapeGeometry, SRGBColorSpace, Vector3 } from "three";
import { useEffect, useMemo } from "react";
import { html } from "../../map-3d/runtime.js";
import { Instances } from "./instancing.js";
import { BAY, FLOOR_PATHS, PALACE, ROOF_TIERS } from "../config/palace-layout.js";

// Paxton's 1851 Hyde Park building: a modular cast-iron grid, flat roofs stepping down from the nave
// to the outer aisles, ridge-and-furrow glazing on every tier, and (in TranseptVault) one barrel vault.
// Colours follow the cozy valley palette with a nod to Owen Jones's blue / cream / red iron scheme.
export const PALACE_COLORS = Object.freeze({
  column: "#6b9fd8",
  girder: "#fff4dc",
  gallery: "#d9775f",
  glass: "#d4f1ff",
  floor: "#ead7ad",
  carpet: "#d98b6a",
  grass: "#8fd16a",
  path: "#efe1bf",
  hoarding: "#c9a46f",
});

// Diorama cutaway: ironwork and glass between the camera and the player are clipped away so the
// interior stays readable. PalaceScene moves this plane every frame.
export const CUTAWAY = [new Plane(new Vector3(0, 0, -1), 0)];

const L = PALACE.halfLength;
const T = PALACE.transeptHalfWidth;
const RIDGE = BAY / 3;
const outsideTransept = (x) => Math.abs(x) > T + 1e-6;
const range = (from, to, step) => { const out = []; for (let v = from; v <= to + 1e-6; v += step) out.push(+v.toFixed(4)); return out; };

// Glazed wall panels: [x1, z1, x2, z2, yBottom, yTop]
function wallSegments() {
  const s = [];
  for (const side of [-1, 1]) {
    for (const [x1, x2] of [[-L, -T], [T, L]]) {
      s.push([x1, side * 14, x2, side * 14, 0, 4.5]);
      s.push([x1, side * 10, x2, side * 10, 4.5, 7.5]);
      s.push([x1, side * 6, x2, side * 6, 7.5, 11]);
    }
    // Transept side walls rising above the aisle roofs, and the projecting transept arms.
    s.push([side * T, 6, side * T, 10, 7.5, 11], [side * T, -10, side * T, -6, 7.5, 11]);
    s.push([side * T, 10, side * T, 14, 4.5, 11], [side * T, -14, side * T, -10, 4.5, 11]);
    s.push([side * T, PALACE.outerAisle, side * T, PALACE.transeptSouth, 0, 11]);
    s.push([side * T, PALACE.transeptNorth, side * T, -PALACE.outerAisle, 0, 11]);
    // Nave ends: stepped profile.
    s.push([side * L, -14, side * L, -10, 0, 4.5], [side * L, 10, side * L, 14, 0, 4.5]);
    s.push([side * L, -10, side * L, -6, 0, 7.5], [side * L, 6, side * L, 10, 0, 7.5]);
    s.push([side * L, -6, side * L, 6, 0, 11]);
  }
  // Transept end walls; the south one is the Grand Entrance with an open doorway.
  s.push([-T, PALACE.transeptNorth, T, PALACE.transeptNorth, 0, 11]);
  const zs = PALACE.transeptSouth;
  s.push([-T, zs, -2.6, zs, 0, 11], [2.6, zs, T, zs, 0, 11], [-2.6, zs, 2.6, zs, 5.4, 11]);
  return s;
}

function glassAndMullions(segments) {
  const panes = [];
  const bars = [];
  for (const [x1, z1, x2, z2, y0, y1] of segments) {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const ry = x1 === x2 ? Math.PI / 2 : 0;
    const cx = (x1 + x2) / 2;
    const cz = (z1 + z2) / 2;
    panes.push({ p: [cx, (y0 + y1) / 2, cz], s: [length, y1 - y0, 1], r: [0, ry, 0] });
    const count = Math.max(1, Math.round(length / RIDGE));
    for (let i = 1; i < count; i += 1) {
      const t = i / count;
      bars.push({ p: [x1 + (x2 - x1) * t, (y0 + y1) / 2, z1 + (z2 - z1) * t], s: [.06, y1 - y0, .06] });
    }
    for (let y = y0 + 2.2; y < y1 - .6; y += 2.2) bars.push({ p: [cx, y, cz], s: x1 === x2 ? [.06, .06, length] : [length, .06, .06] });
  }
  return { panes, bars };
}

function columns() {
  const items = [];
  const post = (x, z, h) => items.push({ p: [x, h / 2, z], s: [.3, h, .3] });
  for (const side of [-1, 1]) {
    for (const x of range(-L, L, BAY)) if (Math.abs(x) >= T) post(x, side * 14, Math.abs(x) === T ? 11 : 4.5);
    for (const x of range(-L, L, 2 * BAY)) if (outsideTransept(x)) { post(x, side * 10, 7.5); post(x, side * 6, 11); }
    for (const z of [6, 10]) post(side * T, side * z, 11), post(-side * T, side * z, 11);
    for (const z of range(PALACE.outerAisle + BAY, PALACE.transeptSouth, BAY)) post(side * T, z, 11);
    for (const z of range(PALACE.transeptNorth, -PALACE.outerAisle - 1, BAY)) post(side * T, z, 11);
  }
  for (const x of range(-T + 2, T - 2, 2)) { post(x, PALACE.transeptNorth, 11); if (Math.abs(x) > 2.6) post(x, PALACE.transeptSouth, 11); }
  return items;
}

function girders() {
  const items = [];
  const along = (x1, x2, z, y, color) => items.push({ p: [(x1 + x2) / 2, y, z], s: [x2 - x1, .42, .24], color });
  const across = (x, z1, z2, y, color) => items.push({ p: [x, y, (z1 + z2) / 2], s: [.24, .42, z2 - z1], color });
  for (const [x1, x2] of [[-L, -T], [T, L]]) {
    for (const side of [-1, 1]) {
      along(x1, x2, side * 14, 4.5, PALACE_COLORS.girder);
      along(x1, x2, side * 10, 7.5, PALACE_COLORS.girder);
      along(x1, x2, side * 6, 11, PALACE_COLORS.girder);
      // Gallery-level girders in Owen Jones red.
      along(x1, x2, side * 10, 3.6, PALACE_COLORS.gallery);
      along(x1, x2, side * 6, 3.6, PALACE_COLORS.gallery);
    }
  }
  for (const x of range(-L, L, BAY)) {
    if (!outsideTransept(x) && Math.abs(x) !== T) continue;
    for (const tier of ROOF_TIERS) across(x, tier.zMin, tier.zMax, tier.height, PALACE_COLORS.girder);
  }
  for (const side of [-1, 1]) across(side * T, PALACE.transeptNorth, PALACE.transeptSouth, 11, PALACE_COLORS.girder);
  along(-T, T, PALACE.transeptNorth, 11, PALACE_COLORS.girder);
  along(-T, T, PALACE.transeptSouth, 11, PALACE_COLORS.girder);
  return items;
}

// Ridge-and-furrow: a row of glazed triangular ridges spanning each tier, one every third of a bay.
function ridges() {
  const glass = [];
  const caps = [];
  for (const tier of ROOF_TIERS) {
    const depth = tier.zMax - tier.zMin;
    const cz = (tier.zMin + tier.zMax) / 2;
    for (let x = -L + RIDGE / 2; x < L; x += RIDGE) {
      if (!outsideTransept(x - RIDGE / 2) || !outsideTransept(x + RIDGE / 2)) continue;
      glass.push({ p: [x, tier.height + .21, cz], s: [RIDGE, .5, depth] });
      caps.push({ p: [x, tier.height + .71, cz], s: [.07, .07, depth] });
    }
  }
  return { glass, caps };
}

export function PalaceStructure() {
  const geo = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(-.5, 0); shape.lineTo(.5, 0); shape.lineTo(0, 1); shape.closePath();
    const prism = new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false }).translate(0, 0, -.5);
    return { box: new BoxGeometry(1, 1, 1), plane: new PlaneGeometry(1, 1), prism };
  }, []);
  const data = useMemo(() => {
    const walls = glassAndMullions(wallSegments());
    return { walls, columns: columns(), girders: girders(), ridges: ridges() };
  }, []);
  return html`<group>
    <${Instances} geometry=${geo.box} items=${data.columns} clip=${CUTAWAY} color=${PALACE_COLORS.column} castShadow roughness=${.45} metalness=${.15} />
    <${Instances} geometry=${geo.box} items=${data.girders} clip=${CUTAWAY} roughness=${.6} />
    <${Instances} geometry=${geo.box} items=${data.walls.bars} clip=${CUTAWAY} color=${PALACE_COLORS.girder} roughness=${.6} />
    <${Instances} geometry=${geo.box} items=${data.ridges.caps} clip=${CUTAWAY} color=${PALACE_COLORS.girder} roughness=${.6} />
    <${Instances} geometry=${geo.prism} items=${data.ridges.glass} clip=${CUTAWAY} color=${PALACE_COLORS.glass} opacity=${.26} side=${DoubleSide} roughness=${.08} metalness=${.2} />
    <${Instances} geometry=${geo.plane} items=${data.walls.panes} clip=${CUTAWAY} color=${PALACE_COLORS.glass} opacity=${.13} side=${DoubleSide} roughness=${.05} metalness=${.1} />
  </group>`;
}

// Warm parquet: one small canvas pattern (planks along the nave) shared by every floor plane.
function plankTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const tones = ["#ecd9b0", "#e6d1a5", "#efdeb9", "#e3cc9d"];
  for (let row = 0; row < 8; row += 1) {
    const offset = (row % 2) * 48;
    for (let col = -1; col < 2; col += 1) {
      ctx.fillStyle = tones[(row * 3 + col + 4) % tones.length];
      ctx.fillRect(offset + col * 96, row * 16, 96, 16);
      ctx.fillStyle = "#cdb487";
      ctx.fillRect(offset + col * 96, row * 16, 1.5, 16);
    }
    ctx.fillStyle = "#d5bf94";
    ctx.fillRect(0, row * 16 + 15, 128, 1);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}

function FloorPlane({ width, depth, position, texture }) {
  const map = useMemo(() => {
    const tex = texture.clone();
    tex.needsUpdate = true;
    tex.repeat.set(width / 6, depth / 6);
    return tex;
  }, [texture, width, depth]);
  useEffect(() => () => map.dispose(), [map]);
  return html`<mesh rotation-x=${-Math.PI / 2} position=${position} receiveShadow>
    <planeGeometry args=${[width, depth]} />
    <meshStandardMaterial map=${map} roughness=${.62} metalness=${0} envMapIntensity=${.6} />
  </mesh>`;
}

// Zone-tinted carpets (one instanced draw call) — the colour under your feet says where you are.
export const ZONE_CARPETS = Object.freeze([
  { p: [-(PALACE.openHalfLength + T) / 2, .012, 0], s: [PALACE.openHalfLength - T, 1, 3.2], color: "#86c88f" },
  { p: [(PALACE.openHalfLength + T) / 2, .012, 0], s: [PALACE.openHalfLength - T, 1, 3.2], color: "#f0a985" },
  { p: [0, .012, (PALACE.transeptNorth - T) / 2], s: [3.2, 1, -PALACE.transeptNorth - T], color: "#bba7ea" },
  { p: [0, .012, (PALACE.transeptSouth + T) / 2], s: [3.2, 1, PALACE.transeptSouth - T], color: "#f2cf74" },
]);

export function pathChevrons(paths = FLOOR_PATHS, spacing = 2) {
  const items = [];
  for (const path of paths) {
    const [x0, z0] = path.from;
    const [x1, z1] = path.to;
    const length = Math.hypot(x1 - x0, z1 - z0);
    const heading = Math.atan2(x1 - x0, z1 - z0);
    for (let d = 0; d <= length + 1e-6; d += spacing) {
      const t = d / length;
      items.push({ p: [x0 + (x1 - x0) * t, .02, z0 + (z1 - z0) * t], r: [0, heading, 0], s: [1, 1, 1], color: path.color });
    }
  }
  return items;
}

function chevronGeometry() {
  const shape = new Shape();
  shape.moveTo(-.55, -.2); shape.lineTo(0, .3); shape.lineTo(.55, -.2); shape.lineTo(.55, -.48); shape.lineTo(0, .02); shape.lineTo(-.55, -.48); shape.closePath();
  // Lay flat with the tip pointing along +z (the instance heading rotates it).
  return new ShapeGeometry(shape).rotateX(-Math.PI / 2).rotateY(Math.PI);
}

// Floor, zone carpets, paths, closed Future Expansion hoardings and the Hyde Park lawn outside.
export function PalaceGround({ onFloorClick }) {
  const floorEvents = onFloorClick ? { onClick: onFloorClick } : {};
  const hoardings = useMemo(() => [-1, 1].map((side) => ({ x: side * PALACE.openHalfLength })), []);
  const texture = useMemo(plankTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);
  const geo = useMemo(() => ({ plane: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), chevron: chevronGeometry() }), []);
  const chevrons = useMemo(() => pathChevrons(), []);
  const northDepth = -PALACE.outerAisle - PALACE.transeptNorth;
  const southDepth = PALACE.transeptSouth - PALACE.outerAisle;
  return html`<group>
    <mesh rotation-x=${-Math.PI / 2} position=${[0, -.02, 0]} receiveShadow raycast=${() => null}>
      <planeGeometry args=${[260, 260]} />
      <meshStandardMaterial color=${PALACE_COLORS.grass} roughness=${1} envMapIntensity=${.4} />
    </mesh>
    <mesh rotation-x=${-Math.PI / 2} position=${[0, -.01, PALACE.transeptSouth + 14]} receiveShadow raycast=${() => null}>
      <planeGeometry args=${[6, 28]} />
      <meshStandardMaterial color=${PALACE_COLORS.path} roughness=${1} />
    </mesh>
    <group ...${floorEvents}>
      <${FloorPlane} width=${2 * L} depth=${2 * PALACE.outerAisle} position=${[0, 0, 0]} texture=${texture} />
      <${FloorPlane} width=${2 * T} depth=${northDepth} position=${[0, 0, (PALACE.transeptNorth - PALACE.outerAisle) / 2]} texture=${texture} />
      <${FloorPlane} width=${2 * T} depth=${southDepth} position=${[0, 0, (PALACE.transeptSouth + PALACE.outerAisle) / 2]} texture=${texture} />
    </group>
    <${Instances} geometry=${geo.plane} items=${ZONE_CARPETS} receiveShadow roughness=${.95} />
    <mesh rotation-x=${-Math.PI / 2} position=${[0, .014, 0]} receiveShadow raycast=${() => null}>
      <ringGeometry args=${[3.1, 4.6, 48]} />
      <meshStandardMaterial color="#9fd6dc" roughness=${.9} />
    </mesh>
    <${Instances} geometry=${geo.chevron} items=${chevrons} roughness=${.8} materialProps=${{ transparent: true, opacity: .55, depthWrite: false }} />
    ${hoardings.map((h) => html`<mesh key=${h.x} position=${[h.x, 1.6, 0]} castShadow receiveShadow raycast=${() => null}>
      <boxGeometry args=${[.3, 3.2, 2 * PALACE.outerAisle]} />
      <meshStandardMaterial color=${PALACE_COLORS.hoarding} roughness=${.9} flatShading />
    </mesh>`)}
  </group>`;
}
