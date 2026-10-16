import test from "node:test";
import assert from "node:assert/strict";
import { buildCollisionWorld, isWalkable, moveWithCollision, insideFloor } from "./crystal-palace/systems/collision.js";
import { stepPlayer, directionFromKeys, directionFromJoystick } from "./crystal-palace/systems/movement.js";
import { nearestExhibit } from "./crystal-palace/systems/interaction.js";
import { EXHIBITS, exhibitInteractRadius } from "./crystal-palace/config/exhibits.js";
import { INTERACT_RADIUS, PALACE, SPAWN, ELMS, FOUNTAIN, INTERIOR_COLUMNS, ZONES, zoneAt } from "./crystal-palace/config/palace-layout.js";

const world = buildCollisionWorld();

function seeded(seed) {
  let value = seed >>> 0;
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296; };
}

// Flood fill over a 0.25 grid, moving only through moveWithCollision so the result is what a player can do.
function reachableCells() {
  const h = .25;
  const key = (x, z) => `${Math.round(x / h)},${Math.round(z / h)}`;
  const seen = new Map([[key(SPAWN.x, SPAWN.z), { x: SPAWN.x, z: SPAWN.z }]]);
  const queue = [{ x: SPAWN.x, z: SPAWN.z }];
  while (queue.length) {
    const p = queue.pop();
    for (const [dx, dz] of [[h, 0], [-h, 0], [0, h], [0, -h]]) {
      const next = moveWithCollision(world, p, dx, dz);
      if (Math.hypot(next.x - p.x - dx, next.z - p.z - dz) > 1e-3) continue;
      const k = key(next.x, next.z);
      if (seen.has(k)) continue;
      seen.set(k, next);
      queue.push(next);
    }
  }
  return [...seen.values()];
}

test("spawn is walkable and inside the Grand Entrance", () => {
  assert.ok(isWalkable(world, SPAWN.x, SPAWN.z));
  assert.equal(zoneAt(SPAWN.x, SPAWN.z).id, "entrance");
});

test("walls cannot be passed, even with huge frame deltas", () => {
  const cases = [
    [{ x: 0, z: 0 + 4 }, 0, -500],     // through north transept wall
    [{ x: 10, z: 0 }, 0, 500],         // through south outer wall
    [{ x: -20, z: 3 }, -500, 0],       // into closed future expansion (west)
    [{ x: 20, z: 3 }, 500, 0],         // into closed future expansion (east)
    [{ x: 0, z: 19 }, 0, 500],         // out of the entrance
    [{ x: 4, z: 19 }, 40, 0],          // sideways out of the south transept
    [{ x: 4, z: -20 }, 40, 0],         // sideways out of the north transept
  ];
  for (const [from, dx, dz] of cases) {
    assert.ok(isWalkable(world, from.x, from.z), `start ${JSON.stringify(from)} walkable`);
    const to = moveWithCollision(world, from, dx, dz);
    assert.ok(isWalkable(world, to.x, to.z), `end ${JSON.stringify(to)} walkable`);
    assert.ok(Math.abs(to.x) <= PALACE.openHalfLength && Math.abs(to.z) <= PALACE.outerAisle || Math.abs(to.x) <= PALACE.transeptHalfWidth);
    assert.ok(to.z >= PALACE.transeptNorth && to.z <= PALACE.transeptSouth);
  }
});

test("random walks never leave the floor or enter an obstacle", () => {
  const random = seeded(42);
  let pos = { x: SPAWN.x, z: SPAWN.z };
  for (let i = 0; i < 20000; i += 1) {
    const angle = random() * Math.PI * 2;
    const length = random() * 3;
    pos = moveWithCollision(world, pos, Math.cos(angle) * length, Math.sin(angle) * length);
    assert.ok(isWalkable(world, pos.x, pos.z), `step ${i} at ${pos.x},${pos.z}`);
  }
});

test("walking into a wall slides along it instead of stopping dead", () => {
  const start = { x: 20, z: 12.5 };
  const next = moveWithCollision(world, start, 1, 2);
  assert.ok(next.x > start.x + .9, "x slides");
  assert.ok(insideFloor(world, next.x, next.z));
});

test("every column, elm, the fountain and every stand is solid", () => {
  for (const c of [...INTERIOR_COLUMNS, ...ELMS, FOUNTAIN, ...EXHIBITS.filter((e) => e.obstacle !== false)]) {
    assert.equal(isWalkable(world, c.x, c.z), false, `${c.id || `${c.x},${c.z}`} blocks`);
  }
});

test("every exhibit is reachable from spawn and every open zone can be entered", () => {
  const cells = reachableCells();
  assert.ok(cells.length > 5000);
  for (const item of EXHIBITS) {
    const reach = exhibitInteractRadius(item, INTERACT_RADIUS);
    const spot = cells.find((p) => Math.hypot(p.x - item.x, p.z - item.z) <= reach - .1);
    assert.ok(spot, `${item.id} reachable`);
    assert.equal(nearestExhibit(spot, EXHIBITS)?.id !== undefined, true);
  }
  for (const zone of ZONES) {
    const entered = cells.some((p) => zoneAt(p.x, p.z)?.id === zone.id);
    assert.equal(entered, zone.open, `${zone.id} entered=${entered}`);
  }
});

test("movement input: keys, joystick and tap target", () => {
  assert.deepEqual(directionFromKeys(new Set(["KeyW"])), { x: 0, z: -1 });
  const diag = directionFromKeys(new Set(["KeyD", "ArrowDown"]));
  assert.ok(Math.abs(Math.hypot(diag.x, diag.z) - 1) < 1e-9);
  assert.deepEqual(directionFromJoystick(.05, .05), { x: 0, z: 0 });
  const stick = directionFromJoystick(3, 4);
  assert.ok(Math.abs(stick.x - .6) < 1e-9 && Math.abs(stick.z - .8) < 1e-9);

  let state = { x: SPAWN.x, z: SPAWN.z, heading: 0 };
  let target = { x: 0, z: 15 };
  for (let i = 0; i < 120 && target; i += 1) ({ target, ...state } = stepPlayer(world, state, { target, dt: 1 / 60 }));
  assert.equal(target, null);
  assert.ok(Math.hypot(state.x - 0, state.z - 15) < .3);
});

test("nearest exhibit prefers the closest stand within reach", () => {
  assert.equal(nearestExhibit({ x: -12, z: -6.2 }, EXHIBITS)?.id, "ethics-safety");
  assert.equal(nearestExhibit({ x: 0, z: 3 }, EXHIBITS)?.id, "crystal-fountain");
  assert.equal(nearestExhibit({ x: 0, z: 10 }, EXHIBITS), null);
});
