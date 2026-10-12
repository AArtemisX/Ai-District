import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTION_ENCOUNTER_TYPES,
  BATTLE_RULES,
  BATTLE_TILE_EVENTS,
  regenerateTurnEnergy,
  resolveEnergyTile,
} from "./battle-config.js";

test("Action Encounter mapping replaces quiz-style battle events", () => {
  assert.deepEqual(BATTLE_TILE_EVENTS.map((event) => event.type), Object.values(ACTION_ENCOUNTER_TYPES));
  assert.equal(BATTLE_TILE_EVENTS.some((event) => event.type === "AI_SCENARIO"), false);
});

test("energy economy uses one shared capped configuration", () => {
  assert.equal(BATTLE_RULES.STARTING_ENERGY, 5);
  assert.deepEqual(regenerateTurnEnergy(5), { before: 5, energy: 6, gained: 1 });
  assert.deepEqual(regenerateTurnEnergy(10), { before: 10, energy: 10, gained: 0 });
  assert.deepEqual(resolveEnergyTile(5), { before: 5, energy: 7, gained: 2 });
  assert.equal(resolveEnergyTile(9).energy, 10);
});

