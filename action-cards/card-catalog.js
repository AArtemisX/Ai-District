import { ACTION_CARD_PROTOTYPES } from "./card-data.js";

/** @typedef {"LEGACY_DATABASE"|"MAPPED_PROTOTYPE"|"PROTOTYPE_ONLY"} CardDefinitionSource */
/** @typedef {"INVENTORY_CARD"|"PROTOTYPE"} CardCatalogState */

export const CARD_CATALOG_STATES = Object.freeze({
  INVENTORY_CARD: "INVENTORY_CARD",
  PROTOTYPE: "PROTOTYPE",
});

export const CARD_DEFINITION_SOURCES = Object.freeze({
  LEGACY_DATABASE: "LEGACY_DATABASE",
  MAPPED_PROTOTYPE: "MAPPED_PROTOTYPE",
  PROTOTYPE_ONLY: "PROTOTYPE_ONLY",
});

// Canonical identities approved for the future production catalog. A mapping is
// descriptive only: a prototype stays PROTOTYPE_ONLY until the matching row is
// returned by Supabase, and it never grants ownership on the client.
export const PROTOTYPE_TO_INVENTORY_CARD_ID = Object.freeze({
  "prototype-privacy-shield": "privacy-shield",
  "prototype-firewall-guard": "firewall-guard",
  "prototype-threat-shutdown": "threat-shutdown",
  "prototype-system-countermeasure": "system-countermeasure",
  "prototype-recovery-protocol": "recovery-protocol",
  "prototype-human-assistance": "human-assistance",
  "prototype-data-audit": "data-audit",
  "prototype-explainability-insight": "explainability-insight",
  "prototype-ethical-override": "ethical-override",
  "prototype-responsible-ai-protocol": "responsible-ai-protocol",
});

export const SCENARIO_STARTER_CANONICAL_IDS = Object.freeze([
  "privacy-shield",
  "threat-shutdown",
  "recovery-protocol",
  "data-audit",
  "firewall-guard",
]);

function prototypeCatalogCard(card) {
  return Object.freeze({
    id: card.id,
    catalogId: card.id,
    inventoryCardId: null,
    canonicalProductionId: PROTOTYPE_TO_INVENTORY_CARD_ID[card.id] || null,
    prototypeId: card.id,
    name: card.name,
    description: card.description,
    card_type: card.type,
    rarity: card.rarity,
    artwork: card.artwork,
    icon_key: card.type.toLowerCase(),
    is_starter: false,
    is_active: card.status === "ACTIVE",
    catalogState: CARD_CATALOG_STATES.PROTOTYPE,
    definitionSource: CARD_DEFINITION_SOURCES.PROTOTYPE_ONLY,
    prototypeMetadata: card,
  });
}

function inventoryCatalogCard(card, prototype = null) {
  return Object.freeze({
    ...card,
    catalogId: card.id,
    inventoryCardId: card.id,
    canonicalProductionId: card.id,
    prototypeId: prototype?.id || null,
    rarity: prototype?.rarity || "LEGACY",
    artwork: prototype?.artwork || null,
    catalogState: CARD_CATALOG_STATES.INVENTORY_CARD,
    definitionSource: prototype ? CARD_DEFINITION_SOURCES.MAPPED_PROTOTYPE : CARD_DEFINITION_SOURCES.LEGACY_DATABASE,
    prototypeMetadata: prototype,
  });
}

export function buildUnifiedCardCatalog(inventoryCards = [], prototypes = ACTION_CARD_PROTOTYPES) {
  const inventoryIds = new Set(inventoryCards.map((card) => card.id));
  const prototypesByInventoryId = new Map();
  for (const prototype of prototypes) {
    const inventoryId = PROTOTYPE_TO_INVENTORY_CARD_ID[prototype.id];
    if (inventoryId && inventoryIds.has(inventoryId)) prototypesByInventoryId.set(inventoryId, prototype);
  }

  const catalog = inventoryCards.map((card) => inventoryCatalogCard(card, prototypesByInventoryId.get(card.id)));
  for (const prototype of prototypes) {
    const inventoryId = PROTOTYPE_TO_INVENTORY_CARD_ID[prototype.id];
    if (!inventoryId || !inventoryIds.has(inventoryId)) catalog.push(prototypeCatalogCard(prototype));
  }
  return catalog;
}

export function isMatchEligibleCatalogCard(card) {
  return Boolean(card && card.catalogState !== CARD_CATALOG_STATES.PROTOTYPE && card.inventoryCardId !== null && card.is_active !== false);
}

export function validateUnifiedCardCatalog(catalog = []) {
  const errors = [];
  const catalogIds = new Set();
  const inventoryIds = new Set();
  for (const card of catalog) {
    if (!card?.catalogId) errors.push("CATALOG_ID_REQUIRED");
    else if (catalogIds.has(card.catalogId)) errors.push(`DUPLICATE_CATALOG_ID:${card.catalogId}`);
    else catalogIds.add(card.catalogId);
    if (card?.inventoryCardId) {
      if (inventoryIds.has(card.inventoryCardId)) errors.push(`DUPLICATE_INVENTORY_ID:${card.inventoryCardId}`);
      inventoryIds.add(card.inventoryCardId);
    }
    if (card?.catalogState === CARD_CATALOG_STATES.PROTOTYPE && card.inventoryCardId !== null) errors.push(`PROTOTYPE_HAS_INVENTORY_ID:${card.catalogId}`);
  }
  return { valid: errors.length === 0, errors };
}

export function validateCanonicalCardMapping(
  prototypes = ACTION_CARD_PROTOTYPES,
  mapping = PROTOTYPE_TO_INVENTORY_CARD_ID,
) {
  const errors = [];
  const prototypeIds = new Set(prototypes.map((card) => card.id));
  const productionIds = new Set();
  for (const [prototypeId, productionId] of Object.entries(mapping)) {
    if (!prototypeIds.has(prototypeId)) errors.push(`UNKNOWN_PROTOTYPE_ID:${prototypeId}`);
    if (!productionId) errors.push(`CANONICAL_ID_REQUIRED:${prototypeId}`);
    else if (productionIds.has(productionId)) errors.push(`DUPLICATE_CANONICAL_ID:${productionId}`);
    else productionIds.add(productionId);
  }
  for (const prototypeId of prototypeIds) {
    if (!mapping[prototypeId]) errors.push(`MISSING_CANONICAL_MAPPING:${prototypeId}`);
  }
  if (productionIds.size !== prototypes.length) errors.push("CANONICAL_CARD_COUNT_MISMATCH");
  return { valid: errors.length === 0, errors };
}

export function scenarioStarterIdsFromServer(rows = []) {
  return rows
    .filter((row) => row?.game_mode_code === "scenario-adventure" && row?.is_starter === true && row?.is_active !== false)
    .map((row) => row.action_card_id);
}

export function catalogOwnershipState(card, unlockedIds = new Set(), equippedIds = new Set()) {
  if (!isMatchEligibleCatalogCard(card)) return "PROTOTYPE";
  if (equippedIds.has(card.inventoryCardId)) return "EQUIPPED";
  if (card.is_starter) return "AVAILABLE_IN_BATTLE";
  if (unlockedIds.has(card.inventoryCardId)) return "UNLOCKED";
  return "LOCKED";
}

