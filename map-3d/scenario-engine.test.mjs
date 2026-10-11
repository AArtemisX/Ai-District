import test from "node:test";
import assert from "node:assert/strict";
import { AI_SCENARIOS } from "./scenario-data.js";
import { addDecisionPoints, chooseBotChoice, createTimeoutResult, resolveScenarioChoice, selectScenario, validateScenario } from "./scenario-engine.js";

test("มีสถานการณ์ที่ถูกต้อง 8 เรื่องและมี 3 ตัวเลือกแบบ 0/1/3 DP", () => {
  assert.equal(AI_SCENARIOS.length, 8);
  for (const scenario of AI_SCENARIOS) {
    assert.equal(validateScenario(scenario), true);
    assert.ok(scenario.districtId);
    assert.deepEqual(scenario.choices.map((item) => item.consequence.decisionPoints).sort((a, b) => a - b), [0, 1, 3]);
    assert.ok([30, 45, 60].includes(scenario.timeLimit));
  }
});

test("ประเมิน BEST, GOOD และ POOR เป็น 3, 1 และ 0 DP", () => {
  const scenario = AI_SCENARIOS[0];
  const byQuality = Object.fromEntries(scenario.choices.map((item) => [item.consequence.quality, item]));
  assert.equal(resolveScenarioChoice(scenario, byQuality.BEST.id).decisionPoints, 3);
  assert.equal(resolveScenarioChoice(scenario, byQuality.GOOD.id).decisionPoints, 1);
  assert.equal(resolveScenarioChoice(scenario, byQuality.POOR.id).decisionPoints, 0);
});

test("TIMEOUT ให้ 0 DP และมีโครงผลลัพธ์ที่ปลอดภัย", () => {
  const result = createTimeoutResult(AI_SCENARIOS[0]);
  assert.equal(result.status, "TIMEOUT");
  assert.equal(result.decisionPoints, 0);
  assert.deepEqual(result.futureEffects, { decisionPoints: 0, resources: { insight: 0, trust: 0 }, buildRights: 0 });
});

test("บอท Standard เลือกได้ทั้งสามระดับตามค่าควบคุม", () => {
  const scenario = AI_SCENARIOS[0];
  assert.equal(chooseBotChoice(scenario, "standard", () => .1).consequence.quality, "BEST");
  assert.equal(chooseBotChoice(scenario, "standard", () => .7).consequence.quality, "GOOD");
  assert.equal(chooseBotChoice(scenario, "standard", () => .95).consequence.quality, "POOR");
});

test("คะแนนผู้เล่นและบอทสะสมแยกกัน", () => {
  const scenario = AI_SCENARIOS[0];
  const best = scenario.choices.find((item) => item.consequence.quality === "BEST");
  const good = scenario.choices.find((item) => item.consequence.quality === "GOOD");
  let scores = { player: 0, bot: 0 };
  scores = addDecisionPoints(scores, resolveScenarioChoice(scenario, best.id, "player"));
  scores = addDecisionPoints(scores, resolveScenarioChoice(scenario, good.id, "bot"));
  assert.deepEqual(scores, { player: 3, bot: 1 });
});

test("การเลือกสถานการณ์หลีกเลี่ยงรายการล่าสุด", () => {
  const first = selectScenario(0, []);
  const next = selectScenario(0, [first.scenarioId]);
  assert.notEqual(next.scenarioId, first.scenarioId);
});

test("ผลลัพธ์พร้อมเชื่อม Phase 4", () => {
  const scenario = AI_SCENARIOS[4];
  const best = scenario.choices.find((item) => item.consequence.quality === "BEST");
  const result = resolveScenarioChoice(scenario, best.id);
  assert.equal(typeof result.futureEffects.resources.insight, "number");
  assert.equal(typeof result.futureEffects.resources.trust, "number");
  assert.equal(typeof result.futureEffects.buildRights, "number");
});

test("จำลอง 5 รอบ ผู้เล่นและบอทโดยสถานะคะแนนไม่ปะปน", () => {
  let scores = { player: 0, bot: 0 };
  const history = [];
  for (let round = 0; round < 5; round += 1) {
    for (const actor of ["player", "bot"]) {
      const scenario = selectScenario(round * 2 + (actor === "bot" ? 1 : 0), history);
      const picked = actor === "player"
        ? scenario.choices.find((item) => item.consequence.quality === "BEST")
        : chooseBotChoice(scenario, "standard", () => round % 2 ? .7 : .2);
      const result = resolveScenarioChoice(scenario, picked.id, actor);
      scores = addDecisionPoints(scores, result);
      history.push(result.scenarioId);
    }
  }
  assert.equal(history.length, 10);
  assert.equal(scores.player, 15);
  assert.equal(scores.bot, 11);
});
