import test from "node:test";
import assert from "node:assert/strict";
import { getGameModeConfig, GAME_MODES, resolveGameMode } from "./game-mode.js";
import { createScenarioAdventureMatch, recordScenarioUse, selectAdventureScenario } from "./scenario-engine.js";
import { createScenarioRepository, validateAdventureScenario } from "./scenario-repository.js";
import { SCENARIO_ADVENTURE_SEED } from "./scenario-seed.js";
import { DEFAULT_THEME_ID, getScenarioCategoryForTile, SCENARIO_CATEGORIES } from "./theme-config.js";

test("Scenario Adventure mode แยกจาก District, IP, City และ Item systems", () => {
  const config = getGameModeConfig(GAME_MODES.SCENARIO_ADVENTURE);
  assert.equal(resolveGameMode("?mode=scenario-adventure"), GAME_MODES.SCENARIO_ADVENTURE);
  assert.equal(config.capabilities.scenarioAdventure, true);
  assert.equal(config.capabilities.districtConstruction, false);
  assert.equal(config.capabilities.districtOwnership, false);
  assert.equal(config.capabilities.influencePoints, false);
  assert.equal(config.capabilities.itemActions, false);
});

test("Local mock seed มี schema ที่พร้อมเปลี่ยน Repository ภายหลัง", () => {
  assert.equal(SCENARIO_ADVENTURE_SEED.length, 8);
  assert.ok(SCENARIO_ADVENTURE_SEED.every(validateAdventureScenario));
  assert.ok(SCENARIO_ADVENTURE_SEED.every((scenario) => scenario.status === "MOCK"));
});

test("เลือก Scenario ตามธีมและหมวดของช่อง", async () => {
  const repository = createScenarioRepository();
  const scenario = await selectAdventureScenario({
    repository,
    themeId: DEFAULT_THEME_ID,
    category: SCENARIO_CATEGORIES.PRIVACY,
    history: [],
    random: () => 0,
  });
  assert.equal(scenario.themeId, DEFAULT_THEME_ID);
  assert.equal(scenario.category, SCENARIO_CATEGORIES.PRIVACY);
});

test("ผู้เล่นและ Bot ใช้ Scenario history ชุดเดียวและ Scenario ไม่ซ้ำ", async () => {
  const repository = createScenarioRepository();
  const match = createScenarioAdventureMatch();
  const first = await selectAdventureScenario({ repository, category: SCENARIO_CATEGORIES.FAIRNESS, history: match.scenarioHistory, random: () => 0 });
  match.scenarioHistory = recordScenarioUse(match.scenarioHistory, { scenario: first, actorId: "player", tileIndex: 1, turnNumber: 1 });
  const second = await selectAdventureScenario({ repository, category: SCENARIO_CATEGORIES.FAIRNESS, history: match.scenarioHistory, random: () => 0 });
  match.scenarioHistory = recordScenarioUse(match.scenarioHistory, { scenario: second, actorId: "bot", tileIndex: 1, turnNumber: 2 });
  assert.notEqual(second.scenarioId, first.scenarioId);
  assert.deepEqual(match.scenarioHistory.map((entry) => entry.actorId), ["player", "bot"]);
});

test("กลับช่องเดิมจะเลือก Scenario ใหม่จากประวัติร่วม", async () => {
  const repository = createScenarioRepository();
  let history = [];
  const tileIndex = 0;
  const first = await selectAdventureScenario({ repository, tileIndex, history, random: () => 0 });
  history = recordScenarioUse(history, { scenario: first, actorId: "player", tileIndex, turnNumber: 1 });
  const second = await selectAdventureScenario({ repository, tileIndex, history, random: () => 0 });
  assert.notEqual(second.scenarioId, first.scenarioId);
  assert.equal(first.category, getScenarioCategoryForTile(tileIndex));
});

test("เมื่อหมวดของช่องหมดจะใช้ Fallback หมวดเดิม ไม่ดึง Scenario ผิดหมวด", async () => {
  const repository = createScenarioRepository();
  const privacy = SCENARIO_ADVENTURE_SEED.find((scenario) => scenario.category === SCENARIO_CATEGORIES.PRIVACY);
  const history = recordScenarioUse([], { scenario: privacy, actorId: "player", tileIndex: 2, turnNumber: 1 });
  const next = await selectAdventureScenario({ repository, category: SCENARIO_CATEGORIES.PRIVACY, history, random: () => 0 });
  assert.equal(next.isFallback, true);
  assert.equal(next.category, SCENARIO_CATEGORIES.PRIVACY);
});

test("เมื่อ Scenario หมด ระบบใช้ Fallback ID ใหม่และไม่วนรายการเดิม", async () => {
  const repository = createScenarioRepository();
  let history = [];
  for (const scenario of SCENARIO_ADVENTURE_SEED) {
    history = recordScenarioUse(history, { scenario, actorId: "player", tileIndex: 0, turnNumber: history.length + 1 });
  }
  const fallbackOne = await selectAdventureScenario({ repository, category: SCENARIO_CATEGORIES.SAFETY, history, random: () => 0 });
  history = recordScenarioUse(history, { scenario: fallbackOne, actorId: "bot", tileIndex: 0, turnNumber: history.length + 1 });
  const fallbackTwo = await selectAdventureScenario({ repository, category: SCENARIO_CATEGORIES.SAFETY, history, random: () => 0 });
  assert.equal(fallbackOne.isFallback, true);
  assert.equal(fallbackTwo.isFallback, true);
  assert.notEqual(fallbackOne.scenarioId, fallbackTwo.scenarioId);
});

test("recordScenarioUse ป้องกัน Scenario ID ซ้ำโดยตรง", () => {
  const scenario = SCENARIO_ADVENTURE_SEED[0];
  const history = recordScenarioUse([], { scenario, actorId: "player", tileIndex: 0, turnNumber: 1 });
  assert.throws(() => recordScenarioUse(history, { scenario, actorId: "bot", tileIndex: 2, turnNumber: 2 }), /already been used/);
});
