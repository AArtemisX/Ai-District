// Crystal Palace (Hyde Park, 1851) — layout as data. Pure module: no DOM, no three.js.
// Axes: x runs along the nave (west −, east +), z runs along the transept (north −, south +).
// One BAY is Paxton's 24 ft module; every column, girder and roof ridge snaps to it.

export const BAY = 4;

// Building envelope. The nave spans the full length; aisles step down on both sides.
export const PALACE = Object.freeze({
  halfLength: 40,        // x ∈ [−40, 40]  (20 bays)
  naveHalfWidth: 6,      // |z| ≤ 6   nave (3 bays)
  innerAisle: 10,        // 6 < |z| ≤ 10   inner aisle
  outerAisle: 14,        // 10 < |z| ≤ 14  outer aisle / outer wall
  wallInset: .6,         // walkable floor stops this far inside a glazed wall
  transeptHalfWidth: 6,  // |x| ≤ 6 single central transept
  transeptNorth: -24,    // north transept end wall
  transeptSouth: 22,     // south transept end wall (Grand Entrance)
  openHalfLength: 32,    // nave beyond |x| > 32 is closed Future Expansion
});

// Stepped flat roof tiers (ridge-and-furrow glazing sits on top of each tier).
export const ROOF_TIERS = Object.freeze([
  Object.freeze({ id: "nave", zMin: -6, zMax: 6, height: 11 }),
  Object.freeze({ id: "inner-aisle-n", zMin: -10, zMax: -6, height: 7.5 }),
  Object.freeze({ id: "inner-aisle-s", zMin: 6, zMax: 10, height: 7.5 }),
  Object.freeze({ id: "outer-aisle-n", zMin: -14, zMax: -10, height: 4.5 }),
  Object.freeze({ id: "outer-aisle-s", zMin: 10, zMax: 14, height: 4.5 }),
]);

// The single barrel vault spans the transept (N–S) and springs from the nave roof line.
export const TRANSEPT_VAULT = Object.freeze({ radius: PALACE.transeptHalfWidth, springHeight: 11, zMin: PALACE.transeptNorth, zMax: PALACE.transeptSouth });

export const SPAWN = Object.freeze({ x: 0, z: 19, facing: Math.PI });
export const PLAYER_RADIUS = .45;
export const INTERACT_RADIUS = 2.7;

const inset = PALACE.wallInset;
// Walkable floor: axis-aligned rects (the player's centre must stay inside one, shrunk by its radius).
// Rects overlap at junctions so the union is connected.
export const WALKABLE_RECTS = Object.freeze([
  Object.freeze({ id: "main-hall", xMin: -PALACE.openHalfLength + inset, xMax: PALACE.openHalfLength - inset, zMin: -PALACE.outerAisle + inset, zMax: PALACE.outerAisle - inset }),
  Object.freeze({ id: "north-transept", xMin: -PALACE.transeptHalfWidth + inset, xMax: PALACE.transeptHalfWidth - inset, zMin: PALACE.transeptNorth + inset, zMax: -PALACE.outerAisle + 2 }),
  Object.freeze({ id: "south-transept", xMin: -PALACE.transeptHalfWidth + inset, xMax: PALACE.transeptHalfWidth - inset, zMin: PALACE.outerAisle - 2, zMax: PALACE.transeptSouth - inset }),
]);

// Interior iron columns: on aisle lines every two bays, skipping the open transept crossing.
function columnGrid() {
  const points = [];
  for (const z of [-10, -6, 6, 10]) {
    for (let x = -PALACE.openHalfLength + 2 * BAY; x <= PALACE.openHalfLength - 2 * BAY; x += 2 * BAY) {
      if (Math.abs(x) <= PALACE.transeptHalfWidth) continue;
      points.push({ x, z });
    }
  }
  // Transept crossing corners carry the vault.
  for (const x of [-6, 6]) for (const z of [-10, -6, 6, 10]) points.push({ x, z });
  return points;
}
export const COLUMN_RADIUS = .28;
export const INTERIOR_COLUMNS = Object.freeze(columnGrid().map((p) => Object.freeze(p)));

// Central atrium landmarks: elms (as in the real 1851 transept) and a crystal fountain.
export const FOUNTAIN = Object.freeze({ x: 0, z: 0, radius: 2.3 });
export const ELMS = Object.freeze([
  Object.freeze({ x: -3.4, z: -9.6, trunk: .7, height: 9.5 }),
  Object.freeze({ x: 3.4, z: -9.6, trunk: .7, height: 8.8 }),
  Object.freeze({ x: -3.4, z: 9.6, trunk: .7, height: 8.6 }),
  Object.freeze({ x: 3.4, z: 9.6, trunk: .7, height: 9.2 }),
]);

// Wooden signpost at the atrium crossing: one arrow board per open wing (angle = world heading the
// arrow points along, measured like the player's heading: atan2(dx, dz)).
export const SIGNPOSTS = Object.freeze([
  Object.freeze({ x: 4.4, z: 4.4, radius: .35, boards: Object.freeze([
    Object.freeze({ zone: "archive", heading: Math.PI }),
    Object.freeze({ zone: "ethics", heading: -Math.PI / 2 }),
    Object.freeze({ zone: "impact", heading: Math.PI / 2 }),
    Object.freeze({ zone: "entrance", heading: 0 }),
  ]) }),
]);

// Floor paths: chevrons lead in from the entrance to the atrium, then out to each wing in its colour.
export const FLOOR_PATHS = Object.freeze([
  Object.freeze({ zone: "ethics", from: [-7.5, 0], to: [-29, 0], color: "#2b7f40" }),
  Object.freeze({ zone: "impact", from: [7.5, 0], to: [29, 0], color: "#c4532c" }),
  Object.freeze({ zone: "archive", from: [0, -7.5], to: [0, -20.5], color: "#6a4fc0" }),
  Object.freeze({ zone: "atrium", from: [0, 18.5], to: [0, 7.5], color: "#b07a10" }),
]);

// Zones as data. `bounds` are used for "which zone am I in" (first match wins, so order matters).
export const ZONES = Object.freeze([
  Object.freeze({ id: "entrance", name: "Grand Entrance", nameTh: "ประตูใหญ่ & มุมพาสปอร์ต", color: "#ffc93c", open: true, bounds: { xMin: -6, xMax: 6, zMin: 14, zMax: 22 }, sign: { x: 0, z: 14.4, y: 3.4 } }),
  Object.freeze({ id: "archive", name: "Collection Archive", nameTh: "หอจดหมายเหตุคอลเลกชัน", color: "#9d7bea", open: true, bounds: { xMin: -6, xMax: 6, zMin: -24, zMax: -14 }, sign: { x: 0, z: -15.2, y: 4.2 } }),
  Object.freeze({ id: "atrium", name: "Central Atrium", nameTh: "โถงกลาง", color: "#2aa9b8", open: true, bounds: { xMin: -6, xMax: 6, zMin: -14, zMax: 14 }, sign: { x: 0, z: -5.6, y: 6.4 } }),
  Object.freeze({ id: "ethics", name: "Ethics Gallery", nameTh: "หอจริยธรรม AI", color: "#3fae5a", open: true, bounds: { xMin: -32, xMax: -6, zMin: -14, zMax: 14 }, sign: { x: -7.4, z: 0, y: 6.4 } }),
  Object.freeze({ id: "impact", name: "Impact Pavilion", nameTh: "ศาลาผลกระทบของ AI", color: "#ff8f5a", open: true, bounds: { xMin: 6, xMax: 32, zMin: -14, zMax: 14 }, sign: { x: 7.4, z: 0, y: 6.4 } }),
  Object.freeze({ id: "future-west", name: "Future Expansion (West)", nameTh: "พื้นที่ขยายในอนาคต", color: "#b9a98a", open: false, bounds: { xMin: -40, xMax: -32, zMin: -14, zMax: 14 }, sign: { x: -31.2, z: 0, y: 3.6 } }),
  Object.freeze({ id: "future-east", name: "Future Expansion (East)", nameTh: "พื้นที่ขยายในอนาคต", color: "#b9a98a", open: false, bounds: { xMin: 32, xMax: 40, zMin: -14, zMax: 14 }, sign: { x: 31.2, z: 0, y: 3.6 } }),
]);

export const ZONE_BY_ID = Object.freeze(Object.fromEntries(ZONES.map((zone) => [zone.id, zone])));

export function zoneAt(x, z) {
  return ZONES.find(({ bounds: b }) => x >= b.xMin && x <= b.xMax && z >= b.zMin && z <= b.zMax) || null;
}
