import test from "node:test";
import assert from "node:assert/strict";
import { buildLearningSummary, calculateActorScore, createMatchResult, determineWinner } from "./result-engine.js";

const districts = {
  academy: { districtId: "academy", ownerId: "player", influenceByPlayer: { player: 4, bot: 2 } },
  cloud: { districtId: "cloud", ownerId: "bot", influenceByPlayer: { player: 1, bot: 5 } },
  robot: { districtId: "robot", ownerId: "player", influenceByPlayer: { player: 3, bot: 0 } },
};

test("score follows district + influence + DPx2 + energy formula", () => {
  assert.deepEqual(calculateActorScore("player", districts, 5, 4), {
    actorId: "player", districtCount: 2, districtScore: 20, totalInfluence: 8,
    decisionPoints: 5, decisionScore: 10, remainingEnergy: 4, total: 42,
  });
});

test("tie uses district ownership and can remain a draw", () => {
  assert.equal(determineWinner({ total: 20, districtCount: 2 }, { total: 20, districtCount: 1 }).outcome, "WIN");
  assert.equal(determineWinner({ total: 20, districtCount: 1 }, { total: 20, districtCount: 1 }).outcome, "DRAW");
});

test("surrender always awards the match to the bot", () => {
  assert.deepEqual(determineWinner({ total: 999, districtCount: 4 }, { total: 0, districtCount: 0 }, "SURRENDER"), { winnerId: "bot", outcome: "LOSE" });
});

test("learning summary uses only player scenario history", () => {
  const summary = buildLearningSummary([
    { actor: "player", topic: "AI Ethics", quality: "BEST", decisionPoints: 3 },
    { actor: "player", topic: "AI Literacy", quality: "GOOD", decisionPoints: 1 },
    { actor: "bot", topic: "AI Ethics", quality: "BEST", decisionPoints: 3 },
  ]);
  assert.equal(summary.encountered, 2);
  assert.equal(summary.performedWell, 1);
  assert.equal(summary.decisionPointsEarned, 4);
  assert.deepEqual(summary.strongTopics, ["AI Ethics"]);
  assert.deepEqual(summary.reviewTopics, ["AI Literacy"]);
});

test("empty learning history never invents advice", () => {
  assert.deepEqual(buildLearningSummary([]), {
    hasData: false, message: "ยังไม่มีข้อมูลการเรียนรู้เพียงพอ", encountered: 0,
    performedWell: 0, decisionPointsEarned: 0, strongTopics: [], reviewTopics: [],
  });
});

test("match result contains requested summary fields", () => {
  const result = createMatchResult({ matchId: "demo", endReason: "ROUNDS_COMPLETE", totalRounds: 10, districts, decisionPoints: { player: 2, bot: 1 }, energy: { player: 3, bot: 2 }, scenarioHistory: [], completedAt: "2026-10-11T00:00:00.000Z" });
  assert.equal(result.totalRounds, 10);
  assert.equal(result.completedAt, "2026-10-11T00:00:00.000Z");
  assert.equal(result.districtOwnership.academy, "player");
  assert.equal(result.influenceSummary.cloud.bot, 5);
});
