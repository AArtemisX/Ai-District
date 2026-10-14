import { SCENARIO_HAND_LIMIT } from "../scenario-adventure/deck-engine.js";
import { SCENARIO_LOADOUT_SIZE } from "../scenario-adventure/loadout-engine.js";

// Documentation/configuration contract only. No score or effect resolver reads this in Phase 4B.1.
export const ACTION_CARD_MECHANICS_V1 = Object.freeze({
  status: "DESIGN_CONTRACT_ONLY",
  deckSize: SCENARIO_LOADOUT_SIZE,
  startingHand: SCENARIO_HAND_LIMIT,
  maxCardResponsesPerScenario: 1,
  basicResponseAlwaysAvailable: true,
  compatibilityLevels: Object.freeze(["EFFECTIVE", "PARTIAL", "INEFFECTIVE"]),
  responsePoints: Object.freeze({ enabled: false, values: "UNSPECIFIED" }),
  stability: Object.freeze({ enabled: false, initial: 10, maximum: 10 }),
  effectDomains: Object.freeze(["SCENARIO_EFFECT", "STRATEGY_EFFECT"]),
  specialCardBonusLimit: "UNSPECIFIED",
  requiresScenarioContext: true,
});

export function validateMechanicsContract(contract = ACTION_CARD_MECHANICS_V1) {
  const errors = [];
  if (contract.status !== "DESIGN_CONTRACT_ONLY") errors.push("CONTRACT_MUST_NOT_BE_ACTIVE");
  if (contract.deckSize !== SCENARIO_LOADOUT_SIZE) errors.push("DECK_SIZE_MISMATCH");
  if (contract.startingHand !== SCENARIO_HAND_LIMIT) errors.push("HAND_SIZE_MISMATCH");
  if (contract.responsePoints.enabled || contract.stability.enabled) errors.push("PHASE_4B1_SIDE_EFFECTS_FORBIDDEN");
  return { valid: errors.length === 0, errors };
}

