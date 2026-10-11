import { AI_SCENARIOS, SCENARIO_QUALITIES } from "./scenario-data.js";

export const BOT_LEVELS = Object.freeze({
  beginner: { BEST: .35, GOOD: .4, POOR: .25 },
  standard: { BEST: .55, GOOD: .3, POOR: .15 },
  advanced: { BEST: .75, GOOD: .2, POOR: .05 },
});

export function validateScenario(scenario) {
  if (!scenario?.scenarioId || !scenario.districtId || !scenario.title || !scenario.topic || !scenario.description) return false;
  if (![30, 45, 60].includes(scenario.timeLimit) || scenario.choices?.length !== 3) return false;
  const points = scenario.choices.map((item) => item.consequence?.decisionPoints).sort((a, b) => a - b);
  return points.join(",") === "0,1,3" && scenario.choices.every((item) => item.id && item.label && item.consequence?.explanation);
}

export function selectScenario(tileIndex, recentScenarioIds = [], scenarios = AI_SCENARIOS) {
  const valid = scenarios.filter(validateScenario);
  if (!valid.length) throw new Error("No valid AI scenarios available");
  const recent = new Set(recentScenarioIds.slice(-Math.max(1, valid.length - 1)));
  const available = valid.filter((scenario) => !recent.has(scenario.scenarioId));
  const pool = available.length ? available : valid;
  return pool[Math.abs(Number(tileIndex) || 0) % pool.length];
}

export function resolveScenarioChoice(scenario, choiceId, actor = "player") {
  const selected = scenario?.choices?.find((item) => item.id === choiceId);
  if (!selected) throw new Error(`Unknown scenario choice: ${choiceId}`);
  return {
    scenarioId: scenario.scenarioId,
    districtId: scenario.districtId,
    actor,
    status: "ANSWERED",
    choiceId,
    quality: selected.consequence.quality,
    decisionPoints: selected.consequence.decisionPoints,
    impact: selected.consequence.impact,
    explanation: selected.consequence.explanation,
    learningSummary: scenario.explanation,
    futureEffects: structuredClone(selected.consequence.futureEffects),
  };
}

export function createTimeoutResult(scenario, actor = "player") {
  return {
    scenarioId: scenario.scenarioId,
    districtId: scenario.districtId,
    actor,
    status: "TIMEOUT",
    choiceId: null,
    quality: null,
    decisionPoints: 0,
    impact: "หมดเวลา — ไม่มีการเพิ่ม Decision Points",
    explanation: "ระบบบันทึก TIMEOUT และใช้ผลลัพธ์ปลอดภัยเพื่อให้เกมดำเนินต่อได้",
    learningSummary: scenario.explanation,
    futureEffects: { decisionPoints: 0, resources: { insight: 0, trust: 0 }, buildRights: 0 },
  };
}

export function chooseBotChoice(scenario, level = "standard", random = Math.random) {
  const weights = BOT_LEVELS[level] || BOT_LEVELS.standard;
  const sample = Math.min(.999999999, Math.max(0, random()));
  let target = SCENARIO_QUALITIES.POOR;
  if (sample < weights.BEST) target = SCENARIO_QUALITIES.BEST;
  else if (sample < weights.BEST + weights.GOOD) target = SCENARIO_QUALITIES.GOOD;
  return scenario.choices.find((item) => item.consequence.quality === target) || scenario.choices[0];
}

export function addDecisionPoints(scores, result) {
  return { ...scores, [result.actor]: (scores[result.actor] || 0) + result.decisionPoints };
}
