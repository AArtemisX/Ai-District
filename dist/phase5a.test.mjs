import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHARACTER_ACCESS, CHARACTER_ROSTER, isSelectableCharacter } from "./characters/character-roster.js";
import { CHARACTER_UNLOCK_CONTRACTS, NANCY_MISSION_02_PREVIEW, validateCharacterUnlockContracts } from "./characters/character-unlock-contract.js";
import { buildMissionStory02Draft, MISSION_STORY_02_DRAFT_KEY } from "./mission-story-02-data.js";
import { createMissionRuntime, evaluateSimulation } from "./mission-player-engine.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Character Catalog ยังคง 9 ตัว โดย Free 3 และ Locked 6", () => {
  assert.equal(CHARACTER_ROSTER.length, 9);
  assert.equal(CHARACTER_ROSTER.filter((item) => item.access === CHARACTER_ACCESS.FREE).length, 3);
  assert.equal(CHARACTER_ROSTER.filter((item) => item.access === CHARACTER_ACCESS.LOCKED).length, 6);
});

test("Nancy ยัง Locked เลือกเข้าเกมไม่ได้ และไม่มี Client claim", () => {
  const nancy = CHARACTER_ROSTER.find((item) => item.id === "nancy");
  assert.equal(nancy.access, CHARACTER_ACCESS.LOCKED);
  assert.equal(nancy.unlock.implemented, false);
  assert.equal(nancy.unlock.rewardClaimEnabled, false);
  assert.equal(isSelectableCharacter("nancy"), false);
  assert.match(nancy.unlock.previewMessage, /คะแนนที่มองไม่เห็น/);
});

test("Character Unlock Contract ใช้ ID จริงและไม่สร้าง Mission ID ที่ยังไม่อนุมัติ", () => {
  const validation = validateCharacterUnlockContracts();
  assert.equal(validation.valid, true, validation.errors.join(","));
  assert.deepEqual(Object.keys(CHARACTER_UNLOCK_CONTRACTS).sort(), CHARACTER_ROSTER.map((item) => item.id).sort());
  assert.equal(CHARACTER_UNLOCK_CONTRACTS.nancy.requiredMissionId, null);
  assert.equal(CHARACTER_UNLOCK_CONTRACTS.nancy.ownershipStatus, "LOCKED");
  assert.equal(CHARACTER_UNLOCK_CONTRACTS.nancy.clientClaimEnabled, false);
  assert.equal(NANCY_MISSION_02_PREVIEW.requiredMissionId, null);
});

test("Mission Story 02 เป็น Draft 7 ช่วงและไม่เปิด Navigation, Quiz, Reward หรือ Character Unlock", () => {
  const mission = buildMissionStory02Draft();
  assert.equal(mission.draftKey, MISSION_STORY_02_DRAFT_KEY);
  assert.equal(mission.missionId, null);
  assert.equal(mission.scenes.length, 7);
  assert.deepEqual(mission.scenes.map((scene) => scene.id), ["opening", "meet-nancy", "assessment-evidence", "evaluation-simulation", "fairness-decision", "reflection", "final-assessment-placeholder"]);
  assert.equal(mission.published, false);
  assert.equal(mission.navigationEnabled, false);
  assert.equal(mission.rewardClaimEnabled, false);
  assert.equal(mission.characterUnlockEnabled, false);
  assert.equal(mission.finalAssessment.quizEnabled, false);
});

test("Mission 02 ใช้ Nancy.png และ Component types เดิมโดยไม่ซ้ำเรื่องทุนของ Mission 01", () => {
  const mission = buildMissionStory02Draft();
  const text = JSON.stringify(mission);
  assert.match(text, /Nancy/);
  assert.doesNotMatch(text, /ทุนการศึกษา|คัดเลือกทุน/);
  assert.deepEqual([...new Set(mission.scenes.map((scene) => scene.type))].sort(), ["decision", "dialogue", "evidence", "reflection", "simulation", "summary"]);
  assert.match(read("./characters/character-roster.js"), /assets\/Nancy\.png/);
});

test("Mission 02 Draft ใช้ Mission Runtime และ Simulation Engine เดิมได้", () => {
  const mission = buildMissionStory02Draft();
  const runtime = createMissionRuntime(mission);
  const scene = mission.scenes.find((item) => item.type === "simulation");
  const result = evaluateSimulation(scene, runtime.simulation[scene.id].values);
  assert.equal(Number.isFinite(result.readiness), true);
  assert.equal(result.educationalOnly, true);
});

test("Character Selection แสดง Preview แต่ไม่มีปุ่ม Claim", () => {
  const source = read("./character-selection.js");
  assert.match(source, /lockedPreviewMessage/);
  assert.match(source, /ยังไม่เปิดรับรางวัลจริง/);
  assert.doesNotMatch(source, /claimCharacter|claim_character|unlockCharacter/);
});

test("Mission 01 Quiz และ Access Denied contract เดิมยังอยู่", () => {
  const mission01 = read("./mission-m6-data.js");
  assert.match(mission01, /totalQuestions:\s*10/);
  assert.match(mission01, /passingScore:\s*8/);
  assert.match(mission01, /rewardCardId:\s*"access-denied"/);
  assert.match(read("./quiz.js"), /claim_lesson_reward/);
});

test("Mission 02 Draft ไม่ถูกเพิ่มเป็น Production lesson และเปิดเฉพาะ Preview route", () => {
  const player = read("./lesson-player.js");
  assert.match(player, /buildMissionStory02Draft/);
  assert.match(player, /mission02Preview/);
  assert.match(player, /lesson\.code === "ai-ethics-m6-01"/);
  assert.doesNotMatch(read("./quiz.js"), /mission-story-02-nancy-draft/);
});
