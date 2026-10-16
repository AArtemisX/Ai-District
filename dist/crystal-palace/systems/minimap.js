// Minimap projection: world (x, z) ↔ map (u, v). North (−z) is up, east (+x) is right. Pure.
import { PALACE, WALKABLE_RECTS, ZONES } from "../config/palace-layout.js";

export const WORLD_BOUNDS = Object.freeze({ xMin: -PALACE.halfLength, xMax: PALACE.halfLength, zMin: PALACE.transeptNorth, zMax: PALACE.transeptSouth });

// Uniform scale that fits the palace into (width × height) with padding, centred.
export function minimapLayout(width, height, pad = 6, bounds = WORLD_BOUNDS) {
  const spanX = bounds.xMax - bounds.xMin;
  const spanZ = bounds.zMax - bounds.zMin;
  const scale = Math.min((width - 2 * pad) / spanX, (height - 2 * pad) / spanZ);
  return { width, height, scale, offsetU: (width - spanX * scale) / 2 - bounds.xMin * scale, offsetV: (height - spanZ * scale) / 2 - bounds.zMin * scale };
}

export function worldToMinimap(layout, x, z) {
  return { u: layout.offsetU + x * layout.scale, v: layout.offsetV + z * layout.scale };
}

export function minimapToWorld(layout, u, v) {
  return { x: (u - layout.offsetU) / layout.scale, z: (v - layout.offsetV) / layout.scale };
}

export function rectToMinimap(layout, b) {
  const a = worldToMinimap(layout, b.xMin, b.zMin);
  const c = worldToMinimap(layout, b.xMax, b.zMax);
  return { x: a.u, y: a.v, width: c.u - a.u, height: c.v - a.v };
}

// SVG transform for the player arrow (drawn pointing "down" = +v = south at rotation 0).
// Player heading h points along (sin h, cos h) in (x, z); in SVG that needs rotate(−h).
export function playerMarkerTransform(layout, player) {
  const { u, v } = worldToMinimap(layout, player.x, player.z);
  const degrees = (-player.heading * 180) / Math.PI;
  return `translate(${u.toFixed(2)} ${v.toFixed(2)}) rotate(${degrees.toFixed(1)})`;
}

// Static shapes: zone tiles, walkable floor outline.
export function minimapShapes(layout) {
  return {
    zones: ZONES.map((zone) => ({ id: zone.id, color: zone.color, open: zone.open, ...rectToMinimap(layout, zone.bounds) })),
    floor: WALKABLE_RECTS.map((rect) => ({ id: rect.id, ...rectToMinimap(layout, rect) })),
  };
}
