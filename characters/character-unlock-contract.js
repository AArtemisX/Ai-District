import { CHARACTER_ACCESS, CHARACTER_ROSTER } from "./character-roster.js";

export const CHARACTER_OWNERSHIP_STATUS = Object.freeze({
  FREE: "FREE",
  LOCKED: "LOCKED",
  OWNED: "OWNED",
});

export const CHARACTER_UNLOCK_TYPE = Object.freeze({
  STARTER: "STARTER",
  STORY_MISSION: "STORY_MISSION",
});

const lockedContract = (character) => Object.freeze({
  characterId: character.id,
  unlockType: CHARACTER_UNLOCK_TYPE.STORY_MISSION,
  requiredMissionId: null,
  requiredCompletionStatus: "SERVER_VERIFIED_QUIZ_PASS",
  requiredQuizScore: null,
  rewardCharacterId: character.id,
  ownershipStatus: CHARACTER_OWNERSHIP_STATUS.LOCKED,
  implementationStatus: "DESIGN_ONLY",
  clientClaimEnabled: false,
});

export const CHARACTER_UNLOCK_CONTRACTS = Object.freeze(Object.fromEntries(
  CHARACTER_ROSTER.map((character) => [character.id, character.access === CHARACTER_ACCESS.FREE
    ? Object.freeze({
      characterId: character.id,
      unlockType: CHARACTER_UNLOCK_TYPE.STARTER,
      requiredMissionId: null,
      requiredCompletionStatus: "NOT_REQUIRED",
      requiredQuizScore: 0,
      rewardCharacterId: character.id,
      ownershipStatus: CHARACTER_OWNERSHIP_STATUS.FREE,
      implementationStatus: "ACTIVE_STARTER",
      clientClaimEnabled: false,
    })
    : lockedContract(character)]),
));

export const NANCY_MISSION_02_PREVIEW = Object.freeze({
  draftKey: "mission-story-02-nancy-draft",
  title: "คะแนนที่มองไม่เห็น",
  requiredMissionId: null,
  rewardCharacterId: "nancy",
  rewardClaimEnabled: false,
  ownershipStatus: CHARACTER_OWNERSHIP_STATUS.LOCKED,
  note: "Preview only — รออนุมัติ Mission ID, Quiz threshold และ Backend ownership flow",
});

export function validateCharacterUnlockContracts(contracts = CHARACTER_UNLOCK_CONTRACTS) {
  const errors = [];
  const rosterIds = new Set(CHARACTER_ROSTER.map((character) => character.id));
  for (const [key, contract] of Object.entries(contracts)) {
    if (!rosterIds.has(key) || contract.characterId !== key) errors.push(`UNKNOWN_CHARACTER:${key}`);
    if (contract.rewardCharacterId !== key) errors.push(`REWARD_ID_MISMATCH:${key}`);
    if (contract.ownershipStatus === CHARACTER_OWNERSHIP_STATUS.LOCKED && contract.clientClaimEnabled !== false) errors.push(`CLIENT_CLAIM_ENABLED:${key}`);
    if (contract.implementationStatus === "DESIGN_ONLY" && contract.requiredMissionId !== null) errors.push(`UNAPPROVED_MISSION_ID:${key}`);
  }
  return { valid: errors.length === 0, errors };
}
