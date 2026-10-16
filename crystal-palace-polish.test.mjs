import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { WORLD_BOUNDS, minimapLayout, minimapShapes, minimapToWorld, playerMarkerTransform, rectToMinimap, worldToMinimap } from "./crystal-palace/systems/minimap.js";
import { arrivalSpeedFactor, directionFromJoystick, smoothDirection, stepPlayer } from "./crystal-palace/systems/movement.js";
import { buildCollisionWorld, insideFloor, isWalkable } from "./crystal-palace/systems/collision.js";
import { FLOOR_PATHS, SIGNPOSTS, SPAWN, ZONE_BY_ID } from "./crystal-palace/config/palace-layout.js";
import { EXHIBITS } from "./crystal-palace/config/exhibits.js";

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("minimap fits the palace, keeps aspect, and round-trips world ↔ map", () => {
  const layout = minimapLayout(176, 108, 6);
  const nw = worldToMinimap(layout, WORLD_BOUNDS.xMin, WORLD_BOUNDS.zMin);
  const se = worldToMinimap(layout, WORLD_BOUNDS.xMax, WORLD_BOUNDS.zMax);
  for (const p of [nw, se]) { assert.ok(p.u >= 6 - 1e-9 && p.u <= 170 + 1e-9); assert.ok(p.v >= 6 - 1e-9 && p.v <= 102 + 1e-9); }
  assert.ok(near(se.u - nw.u, (WORLD_BOUNDS.xMax - WORLD_BOUNDS.xMin) * layout.scale), "uniform scale");
  assert.ok(near((nw.u + se.u) / 2, 88) || near((nw.v + se.v) / 2, 54), "centred on the constrained axis");
  for (const [x, z] of [[0, 0], [-31, 12], [SPAWN.x, SPAWN.z], [12.5, -8.25]]) {
    const { u, v } = worldToMinimap(layout, x, z);
    const back = minimapToWorld(layout, u, v);
    assert.ok(near(back.x, x, 1e-9) && near(back.z, z, 1e-9));
  }
  const north = worldToMinimap(layout, 0, -20);
  const south = worldToMinimap(layout, 0, 20);
  const east = worldToMinimap(layout, 20, 0);
  assert.ok(north.v < south.v, "north is up");
  assert.ok(east.u > north.u, "east is right");
});

test("minimap shapes come from config: every zone tile and the walkable outline", () => {
  const layout = minimapLayout(176, 108);
  const shapes = minimapShapes(layout);
  assert.equal(shapes.zones.length, 7);
  assert.equal(shapes.zones.filter((zone) => !zone.open).length, 2);
  for (const shape of [...shapes.zones, ...shapes.floor]) assert.ok(shape.width > 0 && shape.height > 0);
  const atrium = rectToMinimap(layout, ZONE_BY_ID.atrium.bounds);
  const fountain = worldToMinimap(layout, 0, 0);
  assert.ok(fountain.u > atrium.x && fountain.u < atrium.x + atrium.width && fountain.v > atrium.y && fountain.v < atrium.y + atrium.height);
});

test("player arrow transform follows position and heading", () => {
  const layout = minimapLayout(176, 108);
  const { u, v } = worldToMinimap(layout, 4, -2);
  assert.equal(playerMarkerTransform(layout, { x: 4, z: -2, heading: 0 }), `translate(${u.toFixed(2)} ${v.toFixed(2)}) rotate(0.0)`);
  assert.match(playerMarkerTransform(layout, { x: 4, z: -2, heading: Math.PI }), /rotate\(-180\.0\)$/, "facing north points up");
  assert.match(playerMarkerTransform(layout, { x: 4, z: -2, heading: Math.PI / 2 }), /rotate\(-90\.0\)$/, "facing east points right");
});

test("joystick: dead zone, eased magnitude, full tilt is unit length", () => {
  assert.deepEqual(directionFromJoystick(.1, 0), { x: 0, z: 0 });
  const full = directionFromJoystick(0, -2);
  assert.ok(near(full.x, 0) && near(full.z, -1));
  const half = directionFromJoystick(.5, 0);
  assert.ok(half.x > 0 && half.x < .5, "half tilt is finer than linear");
});

test("smoothDirection eases in and out frame-rate independently and settles", () => {
  let v = { x: 0, z: 0 };
  v = smoothDirection(v, { x: 1, z: 0 }, 1 / 60);
  assert.ok(v.x > 0 && v.x < .4, "does not jump to full speed");
  const a = smoothDirection({ x: 0, z: 0 }, { x: 1, z: 0 }, .1);
  let b = { x: 0, z: 0 };
  for (let i = 0; i < 6; i += 1) b = smoothDirection(b, { x: 1, z: 0 }, 1 / 60);
  assert.ok(Math.abs(a.x - b.x) < .02, "60 fps and 10 fps agree");
  for (let i = 0; i < 60; i += 1) v = smoothDirection(v, { x: 0, z: 0 }, 1 / 60);
  assert.deepEqual(v, { x: 0, z: 0 }, "stops cleanly");
});

test("tap-to-walk eases into the target without overshooting", () => {
  assert.equal(arrivalSpeedFactor(5), 1);
  assert.ok(arrivalSpeedFactor(.3) < 1 && arrivalSpeedFactor(.3) >= .35);
  const world = buildCollisionWorld();
  let state = { x: SPAWN.x, z: SPAWN.z, heading: 0 };
  let target = { x: 0, z: 15 };
  let last = Infinity;
  for (let i = 0; i < 240 && target; i += 1) {
    ({ target, ...state } = stepPlayer(world, state, { target, dt: 1 / 60 }));
    const d = Math.hypot(state.x, state.z - 15);
    assert.ok(d <= last + 1e-9, "monotonic approach");
    last = d;
  }
  assert.equal(target, null);
  assert.ok(state.z >= 15 - 1e-6, "never overshoots");
});

test("signposts are solid and do not block any floor path or exhibit", () => {
  const world = buildCollisionWorld();
  for (const post of SIGNPOSTS) assert.equal(isWalkable(world, post.x, post.z), false);
  for (const path of FLOOR_PATHS) {
    assert.ok(ZONE_BY_ID[path.zone], path.zone);
    for (const [x, z] of [path.from, path.to]) assert.ok(insideFloor(world, x, z), `${path.zone} ${x},${z}`);
  }
  for (const item of EXHIBITS) for (const post of SIGNPOSTS) assert.ok(Math.hypot(item.x - post.x, item.z - post.z) > 2.5, item.id);
});

test("polish keeps rendering budget rules: no transmission, one shadow light, dpr ≤ 1.5, reduced-motion guards", () => {
  const files = ["scene/PalaceScene.js", "scene/PalaceStructure.js", "scene/TranseptVault.js", "scene/Atmosphere.js", "scene/AtriumLandmarks.js", "scene/Signpost.js", "scene/ExhibitStand.js", "scene/PlayerAvatar.js"].map((f) => read(`./crystal-palace/${f}`));
  const all = files.join("\n");
  assert.doesNotMatch(all, /transmission\s*[=:]|MeshPhysicalMaterial|meshPhysicalMaterial/);
  assert.equal((all.match(/castShadow\s*\n?\s*shadow-mapSize-width=\$\{1024\}/g) || []).length, 1);
  assert.equal((all.match(/<directionalLight/g) || []).length, 1);
  assert.match(files[0], /dpr=\$\{\[1, 1\.5\]\}/);
  for (const source of [read("./crystal-palace/scene/AtriumLandmarks.js"), read("./crystal-palace/scene/Atmosphere.js"), read("./crystal-palace/scene/ExhibitStand.js"), read("./crystal-palace/scene/PlayerAvatar.js")]) assert.match(source, /reducedMotion/);
});
