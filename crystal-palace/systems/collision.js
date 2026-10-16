// 2D collision for the palace floor. Pure functions: walkable rects + circle obstacles,
// axis-separated sliding, sub-stepped so a large frame delta can never tunnel through a wall.
import { COLUMN_RADIUS, ELMS, FOUNTAIN, INTERIOR_COLUMNS, PLAYER_RADIUS, WALKABLE_RECTS } from "../config/palace-layout.js";
import { EXHIBITS, STAND_RADIUS } from "../config/exhibits.js";

export const MAX_STEP = .2;

export function buildCollisionWorld({ rects = WALKABLE_RECTS, exhibits = EXHIBITS, radius = PLAYER_RADIUS } = {}) {
  const circles = [
    ...INTERIOR_COLUMNS.map((p) => ({ x: p.x, z: p.z, r: COLUMN_RADIUS, kind: "column" })),
    ...ELMS.map((p) => ({ x: p.x, z: p.z, r: p.trunk, kind: "elm" })),
    { x: FOUNTAIN.x, z: FOUNTAIN.z, r: FOUNTAIN.radius, kind: "fountain" },
    ...exhibits.filter((item) => item.obstacle !== false).map((item) => ({ x: item.x, z: item.z, r: STAND_RADIUS, kind: "stand", id: item.id })),
  ];
  return Object.freeze({ rects, circles, radius });
}

export function insideFloor(world, x, z) {
  const r = world.radius;
  return world.rects.some((b) => x >= b.xMin + r && x <= b.xMax - r && z >= b.zMin + r && z <= b.zMax - r);
}

export function hitsObstacle(world, x, z) {
  return world.circles.some((c) => (x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + world.radius) ** 2);
}

export function isWalkable(world, x, z) {
  return insideFloor(world, x, z) && !hitsObstacle(world, x, z);
}

// Push a point out of any overlapping circle (radially). Returns null if it lands off the floor.
function pushOut(world, x, z) {
  let px = x;
  let pz = z;
  for (const c of world.circles) {
    const dx = px - c.x;
    const dz = pz - c.z;
    const min = c.r + world.radius;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2) || 1e-6;
    px = c.x + (dx / d) * (min + 1e-4);
    pz = c.z + (dz / d) * (min + 1e-4);
  }
  return isWalkable(world, px, pz) ? { x: px, z: pz } : null;
}

function step(world, pos, dx, dz) {
  // Try the full move, with circle push-out so the player slides around round obstacles.
  const full = pushOut(world, pos.x + dx, pos.z + dz);
  if (full) return full;
  // Axis-separated fallback: slide along walls.
  let { x, z } = pos;
  if (dx && isWalkable(world, x + dx, z)) x += dx;
  if (dz && isWalkable(world, x, z + dz)) z += dz;
  return { x, z };
}

export function moveWithCollision(world, pos, dx, dz) {
  if (!isWalkable(world, pos.x, pos.z)) return { x: pos.x, z: pos.z };
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / MAX_STEP));
  let current = { x: pos.x, z: pos.z };
  for (let i = 0; i < steps; i += 1) current = step(world, current, dx / steps, dz / steps);
  return current;
}
