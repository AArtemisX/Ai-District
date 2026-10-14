import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHARACTER_BY_ID, isSelectableCharacter } from "./characters/character-roster.js";
import { StoryCharacterPortrait } from "./characters/StoryCharacterPortrait.js";
import { MissionSummary } from "./lesson-components.js";
import { buildMissionStory02Draft, MISSION_STORY_02_DRAFT_KEY } from "./mission-story-02-data.js";
import { createMissionRuntime, evaluateKnowledgeCheck, sceneRequirement } from "./mission-player-engine.mjs";
import { MISSION_02_PREVIEW_PROGRESS_KEY, readMissionPreviewProgress, writeMissionPreviewProgress } from "./mission-preview-progress.mjs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key), values };
}

test("Mission 02 มี Preview route ใน Learning Hub โดยไม่เป็น Production navigation", () => {
  const mission = buildMissionStory02Draft();
  assert.equal(mission.draftKey, MISSION_STORY_02_DRAFT_KEY);
  assert.equal(mission.missionId, null);
  assert.equal(mission.published, false);
  assert.equal(mission.navigationEnabled, false);
  assert.equal(mission.previewNavigationEnabled, true);
  assert.match(read("./learning.html"), /lesson-player\.html\?preview=mission-story-02-nancy-draft/);
});

test("Preview progress ใช้ session contract แยกและไม่สร้าง Ownership", () => {
  const storage = memoryStorage();
  const saved = writeMissionPreviewProgress({ scene_index: 3, scene_state: { sceneId: "evaluation-simulation", runtime: {} }, active_seconds: 42 }, storage);
  assert.equal(storage.values.has(MISSION_02_PREVIEW_PROGRESS_KEY), true);
  assert.equal(saved.status, "in_progress");
  assert.equal(readMissionPreviewProgress(storage).scene_index, 3);
  const completed = writeMissionPreviewProgress({ ...saved, status: "preview_completed" }, storage);
  assert.equal(completed.status, "preview_completed");
  assert.equal(typeof completed.completed_at, "string");
  assert.doesNotMatch(JSON.stringify(completed), /ownership|unlock|reward/i);
});

test("Nancy ใช้ S+ Original Portrait และยังเลือกเข้าเกมไม่ได้", () => {
  assert.equal(CHARACTER_BY_ID.nancy.artwork.src, "assets/Nancy.png");
  assert.equal(isSelectableCharacter("nancy"), false);
  assert.match(StoryCharacterPortrait({ characterId: "nancy" }), /assets\/Nancy\.png/);
});

test("Evidence, Simulation, Decision และ Reflection มี requirement ที่เล่นได้จริง", () => {
  const mission = buildMissionStory02Draft();
  const runtime = createMissionRuntime(mission);
  const evidence = mission.scenes.find((scene) => scene.type === "evidence");
  runtime.evidence[evidence.id] = evidence.evidence.slice(0, 2).map((item) => item.id);
  runtime.evidenceQuestions[evidence.id] = "ต้องตรวจผลแยกกลุ่มและเหตุผลของเกณฑ์เพิ่มเติม";
  const evidenceAnswer = evidence.check.options.find((item) => item.correct);
  runtime.checks[evidence.id] = { selected: evidenceAnswer.id, ...evaluateKnowledgeCheck(evidence, evidenceAnswer.id), attempts: 1 };
  assert.equal(sceneRequirement(evidence, runtime).ready, true);

  const simulation = mission.scenes.find((scene) => scene.type === "simulation");
  runtime.simulation[simulation.id].runCount = 2;
  runtime.simulation[simulation.id].reflection = "ยังไม่รู้ผลจริงต่อผู้เรียนแต่ละบริบท";
  const simulationAnswer = simulation.check.options.find((item) => item.correct);
  runtime.checks[simulation.id] = { selected: simulationAnswer.id, ...evaluateKnowledgeCheck(simulation, simulationAnswer.id), attempts: 1 };
  assert.equal(sceneRequirement(simulation, runtime).ready, true);

  const decision = mission.scenes.find((scene) => scene.type === "decision");
  runtime.decisions[decision.id] = { selected: ["rubric-audit", "appeal"], submitted: true };
  const decisionAnswer = decision.check.options.find((item) => item.correct);
  runtime.checks[decision.id] = { selected: decisionAnswer.id, ...evaluateKnowledgeCheck(decision, decisionAnswer.id), attempts: 1 };
  assert.equal(sceneRequirement(decision, runtime).ready, true);

  const reflection = mission.scenes.find((scene) => scene.type === "reflection");
  runtime.reflections[reflection.id] = "เปิดช่องอุทธรณ์ที่เข้าถึงง่าย มีผู้รับผิดชอบและกำหนดเวลาชัดเจน";
  assert.equal(sceneRequirement(reflection, runtime).ready, true);
});

test("Mission Completion Preview ไม่มี Quiz หรือ Reward Claim", () => {
  const mission = buildMissionStory02Draft();
  const runtime = createMissionRuntime(mission);
  const finalScene = mission.scenes.at(-1);
  const html = MissionSummary(finalScene, runtime);
  assert.equal(finalScene.type, "summary");
  assert.equal(finalScene.quizReady, false);
  assert.equal(finalScene.rewardClaimEnabled, false);
  assert.equal(finalScene.characterUnlockEnabled, false);
  assert.doesNotMatch(html, /data-action="start-quiz"/);
  assert.match(html, /Nancy ยังไม่ถูกปลดล็อก/);
});

test("Lesson Player แยก Preview boot/persistence ออกจาก Supabase Progress", () => {
  const player = read("./lesson-player.js");
  assert.match(player, /mission02Preview/);
  assert.match(player, /readMissionPreviewProgress/);
  assert.match(player, /writeMissionPreviewProgress/);
  assert.match(player, /if \(state\.previewMode\)/);
  assert.match(player, /refreshNavigationRequirement/);
  assert.match(player, /dataset\.simulationReflection/);
  assert.match(player, /dataset\.missionReflection/);
  assert.match(player, /Final Assessment ของ Mission 02 ยังอยู่ระหว่างพัฒนา/);
});

test("Mission 01 Quiz และ Access Denied flow ไม่เปลี่ยน", () => {
  const mission01 = read("./mission-m6-data.js");
  assert.match(mission01, /passingScore:\s*8/);
  assert.match(mission01, /rewardCardId:\s*"access-denied"/);
  assert.match(read("./quiz.js"), /claim_lesson_reward/);
});
