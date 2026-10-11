import test from "node:test";
import assert from "node:assert/strict";
import { DISTRICTS } from "./board-data.js";
import { AI_SCENARIOS } from "./scenario-data.js";
import { addDecisionPoints, resolveScenarioChoice } from "./scenario-engine.js";
import {
  DISTRICT_RULES,
  DISTRICT_STATUS,
  applyInfluenceChange,
  buildDistrict,
  canBuildDistrict,
  chooseBotDistrictAction,
  clampEnergy,
  createInitialDistrictStates,
  getDistrictIdForTile,
  getScenarioEnergyReward,
  increaseInfluence,
} from "./district-engine.js";

const fresh = () => createInitialDistrictStates(DISTRICTS);

test("District เริ่มเป็น NEUTRAL และมี IP แยกผู้เล่น/บอท", () => {
  const states = fresh();
  assert.equal(Object.keys(states).length, 4);
  assert.deepEqual(states.academy.influenceByPlayer, { player: 0, bot: 0 });
  assert.equal(states.academy.status, DISTRICT_STATUS.NEUTRAL);
});

test("ผู้เล่นสร้าง District ใช้ 3 EN และรับ 3 IP", () => {
  const result = buildDistrict(fresh().academy, "player", 5);
  assert.equal(result.success, true);
  assert.equal(result.energy, 2);
  assert.equal(result.district.ownerId, "player");
  assert.equal(result.district.influenceByPlayer.player, 3);
  assert.equal(result.district.status, DISTRICT_STATUS.OWNED);
});

test("บอทใช้กติกาเดียวกันและสร้าง District ว่างได้", () => {
  const district = fresh().cloud;
  assert.equal(chooseBotDistrictAction(district, 5), "BUILD");
  assert.equal(buildDistrict(district, "bot", 5).district.ownerId, "bot");
});

test("EN ไม่ติดลบและสร้างไม่ได้เมื่อ EN ไม่พอ", () => {
  assert.equal(clampEnergy(-7), 0);
  assert.equal(buildDistrict(fresh().robot, "player", 2).success, false);
  assert.equal(buildDistrict(fresh().robot, "player", 2).energy, 2);
});

test("เพิ่ม Influence ใช้ 2 EN และได้ 2 IP", () => {
  const built = buildDistrict(fresh().green, "player", 5).district;
  const result = increaseInfluence(built, "bot", 5);
  assert.equal(result.energy, 3);
  assert.equal(result.district.influenceByPlayer.bot, 2);
  assert.equal(result.district.status, DISTRICT_STATUS.CONTESTED);
});

test("IP ถูกจำกัดไม่เกิน 12", () => {
  const district = { ...buildDistrict(fresh().academy, "player", 5).district, influenceByPlayer: { player: 11, bot: 0 } };
  assert.equal(applyInfluenceChange(district, "player", 2).district.influenceByPlayer.player, DISTRICT_RULES.MAX_INFLUENCE);
});

test("ผู้ท้าชิง IP สูงกว่าแล้วเปลี่ยนเจ้าของโดยไม่รีเซ็ต IP", () => {
  const district = { ...buildDistrict(fresh().academy, "player", 5).district, influenceByPlayer: { player: 3, bot: 2 } };
  const result = applyInfluenceChange(district, "bot", 2);
  assert.equal(result.ownerChanged, true);
  assert.equal(result.district.ownerId, "bot");
  assert.deepEqual(result.district.influenceByPlayer, { player: 3, bot: 4 });
});

test("IP เท่ากัน เจ้าของเดิมยังคงอยู่", () => {
  const district = buildDistrict(fresh().academy, "player", 5).district;
  const result = applyInfluenceChange(district, "bot", 3);
  assert.equal(result.ownerChanged, false);
  assert.equal(result.district.ownerId, "player");
});

test("District Action ใช้ไม่ได้ซ้ำเมื่อ actionUsed เป็น true", () => {
  assert.equal(canBuildDistrict(fresh().cloud, "player", 5, true, true), false);
});

test("Scenario ให้ EN ตามคุณภาพโดยไม่แตะการคำนวณ DP", () => {
  const scenario = AI_SCENARIOS[0];
  const best = scenario.choices.find((item) => item.consequence.quality === "BEST");
  const result = resolveScenarioChoice(scenario, best.id, "player");
  const once = addDecisionPoints({ player: 0, bot: 0 }, result);
  assert.deepEqual(once, { player: 3, bot: 0 });
  assert.equal(getScenarioEnergyReward(result), 2);
  assert.equal(getScenarioEnergyReward({ ...result, status: "TIMEOUT" }), 0);
});

test("Scenario ทุกเรื่องเชื่อม District ที่มีอยู่จริง", () => {
  const ids = new Set(DISTRICTS.map((district) => district.id));
  assert.ok(AI_SCENARIOS.every((scenario) => ids.has(scenario.districtId)));
});

test("ช่อง District ถูกจับคู่กับเขตอย่างแน่นอน", () => {
  const ids = DISTRICTS.map((district) => district.id);
  assert.equal(getDistrictIdForTile(4, ids), "academy");
  assert.equal(getDistrictIdForTile(10, ids), "cloud");
  assert.equal(getDistrictIdForTile(16, ids), "robot");
  assert.equal(getDistrictIdForTile(22, ids), "green");
});

test("จำลอง 5 รอบ บอทไม่ใช้ EN ฟรีและ State ไม่ค้าง", () => {
  let district = fresh().academy;
  let botEnergy = 5;
  let completed = 0;
  for (let round = 0; round < 5; round += 1) {
    const action = chooseBotDistrictAction(district, botEnergy);
    if (action === "BUILD") {
      const result = buildDistrict(district, "bot", botEnergy);
      district = result.district;
      botEnergy = result.energy;
    } else if (action === "INFLUENCE") {
      const result = increaseInfluence(district, "bot", botEnergy);
      district = result.district;
      botEnergy = result.energy;
    }
    completed += 1;
  }
  assert.equal(completed, 5);
  assert.ok(botEnergy >= 0);
  assert.ok(district.influenceByPlayer.bot <= 12);
});
