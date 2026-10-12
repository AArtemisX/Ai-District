export const REWARD_STATUSES = Object.freeze({
  LOCKED: "LOCKED",
  UNLOCKED: "UNLOCKED",
  EQUIPPED: "EQUIPPED",
  AVAILABLE_IN_BATTLE: "AVAILABLE_IN_BATTLE",
});

export const STARTER_CARD_IDS = Object.freeze(["patch-update", "firewall-guard", "energy-boost"]);

export function cardAccessState(card, unlockedIds = new Set(), equippedIds = new Set()) {
  if (equippedIds.has(card.id)) return REWARD_STATUSES.EQUIPPED;
  if (card.is_starter) return REWARD_STATUSES.AVAILABLE_IN_BATTLE;
  if (unlockedIds.has(card.id)) return REWARD_STATUSES.UNLOCKED;
  return REWARD_STATUSES.LOCKED;
}

export function normalizeLoadout(cardIds, availableCards) {
  const allowed = new Set(availableCards.filter((card) => card.is_starter || card.unlocked).map((card) => card.id));
  const unique = [...new Set((cardIds || []).filter((id) => allowed.has(id)))];
  for (const id of STARTER_CARD_IDS) if (unique.length < 3 && allowed.has(id) && !unique.includes(id)) unique.push(id);
  return unique.slice(0, 3);
}

export function rewardMissionState(progress, unlocked) {
  return {
    missionCompleted: Boolean(progress?.mission_completed_at),
    quizPassed: Boolean(progress?.quiz_passed_at),
    rewardUnlocked: Boolean(unlocked),
  };
}
