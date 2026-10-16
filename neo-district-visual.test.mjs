import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { BOARD_TILES, TILE_POSITIONS } from "./map-3d/board-data.js";
import { EVENT_TYPES, TILE_EVENT_TYPES, eventTypeForTile } from "./scenario-adventure/board-events.js";
import { EVENT_VISUALS, eventVisualForType } from "./scenario-adventure/event-visuals.js";

test("Neo District keeps the existing 32-tile movement contract", () => {
  assert.equal(BOARD_TILES.length, 32);
  assert.deepEqual(TILE_POSITIONS, BOARD_TILES.map((tile) => tile.position));
  assert.deepEqual(BOARD_TILES.map((tile) => tile.index), Array.from({ length: 32 }, (_, index) => index));
});

test("all tile visuals derive their type from the runtime event mapping", () => {
  assert.equal(TILE_EVENT_TYPES.length, 32);
  assert.deepEqual(BOARD_TILES.map((tile) => eventTypeForTile(tile.index)), TILE_EVENT_TYPES);
  assert.deepEqual(
    Object.fromEntries(EVENT_TYPES.map((type) => [type, TILE_EVENT_TYPES.filter((value) => value === type).length])),
    { ACTION: 12, MOVEMENT: 6, SUPPORT: 5, RISK: 5, DECISION: 4 },
  );
});

test("five event types have distinct color and non-color icon identities", () => {
  assert.deepEqual(Object.keys(EVENT_VISUALS), EVENT_TYPES);
  assert.equal(new Set(EVENT_TYPES.map((type) => eventVisualForType(type).color)).size, 5);
  assert.equal(new Set(EVENT_TYPES.map((type) => eventVisualForType(type).shortLabel)).size, 5);
  for (const type of EVENT_TYPES) {
    const visual = eventVisualForType(type);
    assert.match(visual.color, /^#[0-9a-f]{6}$/i);
    assert.ok(visual.label.length > 0);
  }
});

test("shared scene consumes board-events mapping instead of a parallel tile map", async () => {
  const scene = await readFile(new URL("./scenario-adventure/ScenarioAdventureScene.js", import.meta.url), "utf8");
  const tile = await readFile(new URL("./map-3d/BoardTile.js", import.meta.url), "utf8");
  assert.match(scene, /eventTypeForTile\(tile\.index\)/);
  assert.match(scene, /eventVisualForType\(eventType\)/);
  assert.doesNotMatch(tile, /TILE_EVENT_TYPES|eventTypeForTile/);
});
