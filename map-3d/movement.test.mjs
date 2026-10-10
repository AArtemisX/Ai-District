import test from "node:test";
import assert from "node:assert/strict";
import { BOARD_TILES, TILE_POSITIONS, buildTilePath, normalizeTileIndex } from "./board-data.js";

test("tile positions match every board mesh and remain unique", () => {
  assert.equal(TILE_POSITIONS.length, 32);
  assert.deepEqual(TILE_POSITIONS, BOARD_TILES.map((tile) => tile.position));
  assert.equal(new Set(TILE_POSITIONS.map((position) => position.join(","))).size, 32);
});

test("tile indices are sequential and every edge including corners is connected", () => {
  assert.deepEqual(BOARD_TILES.map((tile) => tile.index), Array.from({ length: 32 }, (_, index) => index));
  for (let index = 0; index < TILE_POSITIONS.length; index += 1) {
    const current = TILE_POSITIONS[index];
    const next = TILE_POSITIONS[normalizeTileIndex(index + 1)];
    const distance = Math.hypot(next[0] - current[0], next[2] - current[2]);
    assert.ok(distance > 0 && distance < 2.3, `invalid connection ${index} -> ${normalizeTileIndex(index + 1)}`);
  }
});

test("multi-step movement visits every intermediate tile", () => {
  assert.deepEqual(buildTilePath(5, 4), [6, 7, 8, 9]);
});

test("movement wraps around the board and a full lap returns to start", () => {
  assert.deepEqual(buildTilePath(30, 3), [31, 0, 1]);
  assert.equal(buildTilePath(0, 32).at(-1), 0);
  assert.equal(buildTilePath(17, 64).at(-1), 17);
});
