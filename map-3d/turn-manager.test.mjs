import test from "node:test";
import assert from "node:assert/strict";
import { GAME_PHASES, TILE_EVENTS, canTransition, getTileEvent, nextTurn, rollDie, transitionPhase } from "./turn-manager.js";
import { buildTilePath } from "./board-data.js";
import { DICE_ROTATIONS } from "./dice-data.js";

test("turn state machine follows the complete gameplay sequence", () => {
  const sequence = [
    GAME_PHASES.WAITING,
    GAME_PHASES.ROLLING,
    GAME_PHASES.MOVING,
    GAME_PHASES.TILE_EVENT,
    GAME_PHASES.ACTION_PHASE,
    GAME_PHASES.TURN_END,
    GAME_PHASES.WAITING,
  ];
  for (let index = 0; index < sequence.length - 1; index += 1) {
    assert.equal(transitionPhase(sequence[index], sequence[index + 1]), sequence[index + 1]);
  }
  assert.equal(canTransition(GAME_PHASES.ROLLING, GAME_PHASES.ROLLING), false);
  assert.throws(() => transitionPhase(GAME_PHASES.WAITING, GAME_PHASES.MOVING));
});

test("dice result is always 1-6 and uses one random sample", () => {
  let calls = 0;
  assert.equal(rollDie(() => { calls += 1; return 0; }), 1);
  assert.equal(calls, 1);
  assert.equal(rollDie(() => .999999), 6);
  assert.equal(rollDie(() => .5), 4);
});

test("all dice results have a final 3D orientation and match movement steps", () => {
  assert.deepEqual(Object.keys(DICE_ROTATIONS).map(Number), [1, 2, 3, 4, 5, 6]);
  for (let value = 1; value <= 6; value += 1) {
    assert.equal(DICE_ROTATIONS[value].length, 3);
    assert.equal(buildTilePath(30, value).length, value);
  }
  assert.equal(buildTilePath(30, 6).at(-1), 4);
});

test("tile events cover all six demo types and enforce at least 30 seconds", () => {
  const types = Array.from({ length: 6 }, (_, index) => getTileEvent(index).type);
  assert.deepEqual(types, TILE_EVENTS.map((event) => event.type));
  for (let index = 0; index < 64; index += 1) assert.ok(getTileEvent(index).duration >= 30);
});

test("turn order cycles and supports future four-player order", () => {
  assert.equal(nextTurn("player"), "bot");
  assert.equal(nextTurn("bot"), "player");
  const fourPlayers = ["p1", "p2", "p3", "p4"];
  assert.equal(nextTurn("p4", fourPlayers), "p1");
});
