import test from "node:test";
import assert from "node:assert/strict";
import { classificationProgress, createMissionRuntime, evaluateDecision, evaluateSimulation, sceneRequirement } from "./mission-player-engine.mjs";

const mission = { scenes: [
  { id: "talk", type: "dialogue", dialogue: [{}, {}, {}] },
  { id: "proof", type: "evidence", requiredEvidence: 2, evidence: [{ id: "a" }, { id: "b" }] },
  { id: "sim", type: "simulation", controls: [{ id: "coverage", initial: 50 }, { id: "quality", initial: 50 }, { id: "oversight", initial: "periodic" }], model: { coverageWeight: .45, qualityWeight: .4, oversightScores: { none: 0, periodic: 55, continuous: 100 }, oversightWeight: .15 } },
  { id: "choice", type: "decision", minChoices: 1, options: [{ id: "audit", quality: 3, impact: "ตรวจข้อมูล" }, { id: "review", quality: 3, impact: "มนุษย์ตรวจ" }, { id: "rush", quality: 1, impact: "เสี่ยง" }] },
] };

test("runtime restores only valid dialogue and evidence state", () => {
  const runtime = createMissionRuntime(mission, { dialogue: { talk: 99 }, evidence: { proof: ["a", "invalid", "a"] }, selectedEvidence: { proof: "a" } });
  assert.equal(runtime.dialogue.talk, 2);
  assert.deepEqual(runtime.evidence.proof, ["a"]);
  assert.equal(runtime.selectedEvidence.proof, "a");
});

test("simulation is deterministic and explains lower risk", () => {
  const scene = mission.scenes[2];
  const weak = evaluateSimulation(scene, { coverage: 30, quality: 40, oversight: "none" });
  const strong = evaluateSimulation(scene, { coverage: 90, quality: 90, oversight: "continuous" });
  assert.equal(weak.risk, "สูง");
  assert.equal(strong.risk, "ต่ำ");
  assert.ok(strong.readiness > weak.readiness);
  assert.equal(strong.educationalOnly, true);
});

test("decision accepts multiple appropriate approaches", () => {
  const result = evaluateDecision(mission.scenes[3], ["audit", "review"]);
  assert.equal(result.level, "รอบด้าน");
  assert.equal(result.selectedCount, 2);
  assert.equal(result.impacts.length, 2);
});

test("interactive scenes block navigation until their action is complete", () => {
  const runtime = createMissionRuntime(mission);
  assert.equal(sceneRequirement(mission.scenes[1], runtime).ready, false);
  runtime.evidence.proof.push("a", "b");
  assert.equal(sceneRequirement(mission.scenes[1], runtime).ready, true);
  assert.equal(sceneRequirement(mission.scenes[2], runtime).ready, false);
  runtime.simulation.sim.runCount = 1;
  assert.equal(sceneRequirement(mission.scenes[2], runtime).ready, true);
  assert.equal(sceneRequirement(mission.scenes[3], runtime).ready, false);
  runtime.decisions.choice.submitted = true;
  assert.equal(sceneRequirement(mission.scenes[3], runtime).ready, true);
});

test("runtime restores bounded narrative interaction state", () => {
  const narrativeMission = { scenes: [
    { id: "opening", dialogue: [{ characterId: "milo" }], openingChoices: [{ id: "data" }] },
    { id: "incident", statements: [{ id: "fact", answer: "FACT" }, { id: "guess", answer: "INTERPRETATION" }] },
    { id: "reflection", reflectionPrompt: "สะท้อน" },
  ] };
  const runtime = createMissionRuntime(narrativeMission, {
    openingChoices: { opening: "invalid" },
    classifications: { incident: { fact: "FACT", guess: "INVALID", injected: "FACT" } },
    reflections: { reflection: "แนวทางตรวจสอบและอุทธรณ์" },
  });
  assert.equal(runtime.openingChoices.opening, null);
  assert.deepEqual(runtime.classifications.incident, { fact: "FACT" });
  assert.equal(runtime.reflections.reflection, "แนวทางตรวจสอบและอุทธรณ์");
  assert.deepEqual(classificationProgress(narrativeMission.scenes[1], runtime.classifications.incident), { answered: 1, correct: 1, total: 2, complete: false });
});
