export const MATCH_RULES = Object.freeze({ MAX_ROUNDS: 10 });

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function calculateActorScore(actorId, districts, decisionPoints = 0, energy = 0) {
  const districtList = Object.values(districts || {});
  const districtCount = districtList.filter((district) => district?.ownerId === actorId).length;
  const totalInfluence = districtList.reduce(
    (sum, district) => sum + safeNumber(district?.influenceByPlayer?.[actorId]),
    0,
  );
  const dp = safeNumber(decisionPoints);
  const remainingEnergy = safeNumber(energy);
  const districtScore = districtCount * 10;
  const decisionScore = dp * 2;
  return {
    actorId,
    districtCount,
    districtScore,
    totalInfluence,
    decisionPoints: dp,
    decisionScore,
    remainingEnergy,
    total: districtScore + totalInfluence + decisionScore + remainingEnergy,
  };
}

export function determineWinner(playerScore, botScore, endReason = "ROUNDS_COMPLETE") {
  if (endReason === "SURRENDER") return { winnerId: "bot", outcome: "LOSE" };
  if (playerScore.total !== botScore.total) {
    return playerScore.total > botScore.total
      ? { winnerId: "player", outcome: "WIN" }
      : { winnerId: "bot", outcome: "LOSE" };
  }
  if (playerScore.districtCount !== botScore.districtCount) {
    return playerScore.districtCount > botScore.districtCount
      ? { winnerId: "player", outcome: "WIN" }
      : { winnerId: "bot", outcome: "LOSE" };
  }
  return { winnerId: null, outcome: "DRAW" };
}

export function buildLearningSummary(history = []) {
  const playerHistory = history.filter((result) => result?.actor === "player");
  if (!playerHistory.length) {
    return {
      hasData: false,
      message: "ยังไม่มีข้อมูลการเรียนรู้เพียงพอ",
      encountered: 0,
      performedWell: 0,
      decisionPointsEarned: 0,
      strongTopics: [],
      reviewTopics: [],
    };
  }

  const topics = new Map();
  for (const result of playerHistory) {
    const topic = result.topic || "หัวข้อ AI ทั่วไป";
    const summary = topics.get(topic) || { points: 0, attempts: 0 };
    summary.points += safeNumber(result.decisionPoints);
    summary.attempts += 1;
    topics.set(topic, summary);
  }

  const strongTopics = [];
  const reviewTopics = [];
  for (const [topic, summary] of topics) {
    const average = summary.points / summary.attempts;
    (average >= 2 ? strongTopics : reviewTopics).push(topic);
  }

  return {
    hasData: true,
    message: null,
    encountered: playerHistory.length,
    performedWell: playerHistory.filter((result) => result.quality === "BEST").length,
    decisionPointsEarned: playerHistory.reduce((sum, result) => sum + safeNumber(result.decisionPoints), 0),
    strongTopics,
    reviewTopics,
  };
}

export function createMatchResult({
  matchId,
  endReason,
  totalRounds,
  districts,
  decisionPoints,
  energy,
  scenarioHistory = [],
  completedAt = new Date().toISOString(),
}) {
  const playerScore = calculateActorScore("player", districts, decisionPoints?.player, energy?.player);
  const botScore = calculateActorScore("bot", districts, decisionPoints?.bot, energy?.bot);
  const verdict = determineWinner(playerScore, botScore, endReason);
  const districtOwnership = Object.fromEntries(
    Object.values(districts || {}).map((district) => [district.districtId, district.ownerId]),
  );
  const influenceSummary = Object.fromEntries(
    Object.values(districts || {}).map((district) => [district.districtId, { ...district.influenceByPlayer }]),
  );
  return {
    matchId,
    winnerId: verdict.winnerId,
    outcome: verdict.outcome,
    endReason,
    totalRounds: Math.max(0, Number(totalRounds) || 0),
    playerScore,
    botScore,
    districtOwnership,
    influenceSummary,
    scenarioHistory: structuredClone(scenarioHistory),
    learningSummary: buildLearningSummary(scenarioHistory),
    completedAt,
  };
}

export function createMatchId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `match-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
