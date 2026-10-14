import { STARTER_CARD_IDS } from "../learning-reward-engine.mjs";
import { isMatchEligibleCatalogCard } from "../action-cards/card-catalog.js";

export const SCENARIO_LOADOUT_SIZE = 5;
export const SCENARIO_MAX_CARD_COPIES = 2;
export const SCENARIO_LOADOUT_POLICIES = Object.freeze({
  LEGACY_COMPAT: "LEGACY_COMPAT",
  FIVE_UNIQUE_STARTERS: "FIVE_UNIQUE_STARTERS",
});

export function scenarioLoadoutPolicy({ serverEligibilityReady = false, starterIds = [] } = {}) {
  return serverEligibilityReady && new Set(starterIds).size >= SCENARIO_LOADOUT_SIZE
    ? SCENARIO_LOADOUT_POLICIES.FIVE_UNIQUE_STARTERS
    : SCENARIO_LOADOUT_POLICIES.LEGACY_COMPAT;
}

export function maxCopiesForScenarioPolicy(policy = SCENARIO_LOADOUT_POLICIES.LEGACY_COMPAT) {
  return policy === SCENARIO_LOADOUT_POLICIES.FIVE_UNIQUE_STARTERS ? 1 : SCENARIO_MAX_CARD_COPIES;
}

export function availableAdventureCardIds(cards = [], unlockedIds = new Set(), scenarioStarterIds = []) {
  const scenarioStarters = new Set(scenarioStarterIds);
  return cards
    .filter((card) => isMatchEligibleCatalogCard(card) && (
      card?.is_starter
      || scenarioStarters.has(card?.inventoryCardId || card?.id)
      || unlockedIds.has(card?.inventoryCardId || card?.id)
    ))
    .map((card) => card.inventoryCardId || card.id);
}

export function validateAdventureLoadout(cardIds = [], allowedIds = [], { policy = SCENARIO_LOADOUT_POLICIES.LEGACY_COMPAT } = {}) {
  const allowed = new Set(allowedIds);
  const counts = new Map();
  const errors = [];
  const maxCopies = maxCopiesForScenarioPolicy(policy);
  for (const cardId of cardIds) {
    counts.set(cardId, (counts.get(cardId) || 0) + 1);
    if (!allowed.has(cardId)) errors.push({ code: "CARD_LOCKED", cardId });
    if (counts.get(cardId) > maxCopies) errors.push({ code: maxCopies === 1 ? "DUPLICATE_CARD" : "COPY_LIMIT", cardId });
  }
  if (cardIds.length !== SCENARIO_LOADOUT_SIZE) errors.push({ code: "LOADOUT_SIZE", expected: SCENARIO_LOADOUT_SIZE, actual: cardIds.length });
  return { valid: errors.length === 0, errors };
}

export function normalizeAdventureLoadout(
  cardIds = [],
  allowedIds = [],
  starterIds = STARTER_CARD_IDS,
  { policy = SCENARIO_LOADOUT_POLICIES.LEGACY_COMPAT } = {},
) {
  const allowed = new Set(allowedIds);
  const normalized = [];
  const counts = new Map();
  const maxCopies = maxCopiesForScenarioPolicy(policy);
  const add = (cardId) => {
    const count = counts.get(cardId) || 0;
    if (!allowed.has(cardId) || count >= maxCopies || normalized.length >= SCENARIO_LOADOUT_SIZE) return false;
    normalized.push(cardId);
    counts.set(cardId, count + 1);
    return true;
  };

  cardIds.forEach(add);
  const fillPool = [...starterIds.filter((id) => allowed.has(id)), ...allowedIds.filter((id) => !starterIds.includes(id))];
  let progress = true;
  while (normalized.length < SCENARIO_LOADOUT_SIZE && progress) {
    progress = false;
    for (const cardId of fillPool) {
      if (add(cardId)) progress = true;
      if (normalized.length === SCENARIO_LOADOUT_SIZE) break;
    }
  }
  return normalized;
}

