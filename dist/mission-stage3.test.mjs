import test from "node:test";
import assert from "node:assert/strict";
import { buildM6Mission } from "./mission-m6-data.js";
import { classificationProgress, createMissionRuntime, evaluateDecision, evaluateKnowledgeCheck, evaluateSimulation, resolveMissionSceneIndex, sceneRequirement } from "./mission-player-engine.mjs";

const mission = buildM6Mission({ code: "ai-ethics-m6-01" });
const scene = (id) => mission.scenes.find((item) => item.id === id);

test("Mission Story 01 มี Opening และ Scene 1-6 ตาม Storyboard", () => {
  assert.deepEqual(mission.scenes.map((item) => item.id), ["opening", "incident", "evidence", "simulation", "decision", "reflection", "final-quiz"]);
  assert.equal(mission.schemaVersion, 3);
  assert.match(mission.title, /AI/);
});

test("ใช้ Alexander, MAMASan และ Milo เป็นผู้ดำเนินเรื่องเท่านั้น", () => {
  const expected = ["alexander", "mamasan", "milo"];
  for (const item of mission.scenes.filter((entry) => entry.dialogue)) {
    assert.deepEqual([...new Set(item.dialogue.map((line) => line.characterId))].sort(), expected);
  }
  assert.equal(JSON.stringify(mission).includes("ARIA"), false);
  assert.equal(JSON.stringify(mission).includes("KAI"), false);
});

test("Opening ทั้งสามทางไม่มีคำตอบถูกผิดและต้องเลือกก่อนดำเนินต่อ", () => {
  const opening = scene("opening");
  const runtime = createMissionRuntime(mission);
  assert.equal(opening.openingChoices.length, 3);
  assert.equal(sceneRequirement(opening, runtime).ready, false);
  runtime.openingChoices.opening = "complaint";
  assert.equal(sceneRequirement(opening, runtime).ready, true);
});

test("Incident Report ต้องจำแนก FACT และ INTERPRETATION ถูกต้อง", () => {
  const incident = scene("incident");
  const runtime = createMissionRuntime(mission);
  for (const statement of incident.statements) runtime.classifications.incident[statement.id] = statement.answer;
  assert.deepEqual(classificationProgress(incident, runtime.classifications.incident), { answered: 4, correct: 4, total: 4, complete: true });
  assert.equal(sceneRequirement(incident, runtime).ready, true);
});

test("Evidence ต้องตรวจอย่างน้อยสองชิ้น บันทึกข้อสงสัย และตอบ Check", () => {
  const evidence = scene("evidence");
  const runtime = createMissionRuntime(mission);
  runtime.evidence.evidence.push("a", "b");
  runtime.evidenceQuestions.evidence = "เกณฑ์คะแนนมีผลต่างกันในแต่ละกลุ่มหรือไม่";
  assert.equal(sceneRequirement(evidence, runtime).ready, false);
  const result = evaluateKnowledgeCheck(evidence, "e2");
  assert.equal(result.correct, true);
  runtime.checks.evidence = { selected: "e2", correct: true, attempts: 1 };
  assert.equal(sceneRequirement(evidence, runtime).ready, true);
});

test("Simulation ใช้ข้อมูลสมมติ ต้องทดลองสองครั้งและบันทึกสิ่งที่ยังไม่รู้", () => {
  const simulation = scene("simulation");
  const runtime = createMissionRuntime(mission);
  const weak = evaluateSimulation(simulation, simulation.presets[0].values);
  const stronger = evaluateSimulation(simulation, simulation.presets[2].values);
  assert.ok(stronger.readiness > weak.readiness);
  assert.equal(weak.educationalOnly, true);
  runtime.simulation.simulation.runCount = 2;
  runtime.simulation.simulation.reflection = "ยังไม่รู้ผลต่อผู้สมัครจริงและความผิดพลาดของผู้ตรวจ";
  runtime.checks.simulation = { selected: "s2", correct: true, attempts: 1 };
  assert.equal(sceneRequirement(simulation, runtime).ready, true);
});

test("Decision ให้หลายมาตรการร่วมกันโดยไม่ถือว่าเลือกทุกข้อคือรอบด้าน", () => {
  const decision = scene("decision");
  const all = evaluateDecision(decision, decision.options.map((item) => item.id));
  const good = evaluateDecision(decision, ["audit", "explain", "oversight"]);
  assert.equal(all.allSelected, true);
  assert.notEqual(all.level, "รอบด้าน");
  assert.equal(good.level, "รอบด้าน");
});

test("Reflection บังคับให้ผู้เรียนสะท้อนก่อนเข้าสู่ Final Quiz", () => {
  const reflection = scene("reflection");
  const runtime = createMissionRuntime(mission);
  assert.equal(sceneRequirement(reflection, runtime).ready, false);
  runtime.reflections.reflection = "ตรวจผลแยกกลุ่ม เปิดช่องอุทธรณ์ และทบทวนระบบอย่างต่อเนื่อง";
  assert.equal(sceneRequirement(reflection, runtime).ready, true);
});

test("Final Quiz และ Reward contract เดิมไม่เปลี่ยนและไม่ปลดล็อกตัวละคร", () => {
  assert.deepEqual(mission.finalQuiz, { usesExistingFlow: true, totalQuestions: 10, passingScore: 8, rewardCardId: "access-denied", characterUnlock: false });
  assert.equal(scene("final-quiz").quizReady, true);
});

test("Progress schema รุ่น 2 กลับเข้าสู่ Scene ID เดิมหลังเพิ่ม Opening", () => {
  const progress = { scene_index: 2, scene_state: { schemaVersion: 2 } };
  assert.equal(mission.scenes[resolveMissionSceneIndex(mission, progress, ["incident", "evidence", "simulation", "decision", "reflection"])].id, "simulation");
  const current = { scene_index: 0, scene_state: { schemaVersion: 3, sceneId: "decision" } };
  assert.equal(mission.scenes[resolveMissionSceneIndex(mission, current)].id, "decision");
});
