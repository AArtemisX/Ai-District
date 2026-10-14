import test from "node:test";
import assert from "node:assert/strict";
import { ACTION_CARD_PROTOTYPES } from "./card-data.js";
import {
  CARD_CATALOG_STATES,
  CARD_DEFINITION_SOURCES,
  PROTOTYPE_TO_INVENTORY_CARD_ID,
  SCENARIO_STARTER_CANONICAL_IDS,
  buildUnifiedCardCatalog,
  catalogOwnershipState,
  isMatchEligibleCatalogCard,
  scenarioStarterIdsFromServer,
  validateCanonicalCardMapping,
  validateUnifiedCardCatalog,
} from "./card-catalog.js";
import { ACTION_CARD_MECHANICS_V1, validateMechanicsContract } from "./mechanics-contract.js";
import { SCENARIO_LOADOUT_POLICIES, availableAdventureCardIds, normalizeAdventureLoadout, scenarioLoadoutPolicy, validateAdventureLoadout } from "../scenario-adventure/loadout-engine.js";

const productionCards = [
  { id: "data-strike", name: "Data Strike", card_type: "ATTACK", en_cost: 1, is_starter: false, is_active: true },
  { id: "system-crash", name: "System Crash", card_type: "ATTACK", en_cost: 3, is_starter: false, is_active: true },
  { id: "firewall-guard", name: "Firewall Guard", card_type: "DEFENSE", en_cost: 1, is_starter: true, is_active: true },
  { id: "secure-backup", name: "Secure Backup", card_type: "DEFENSE", en_cost: 2, is_starter: false, is_active: true },
  { id: "lag-pulse", name: "Lag Pulse", card_type: "CONTROL", en_cost: 2, is_starter: false, is_active: true },
  { id: "access-denied", name: "Access Denied", card_type: "CONTROL", en_cost: 2, is_starter: false, is_active: true },
  { id: "patch-update", name: "Patch Update", card_type: "SUPPORT", en_cost: 1, is_starter: true, is_active: true },
  { id: "energy-boost", name: "Energy Boost", card_type: "SUPPORT", en_cost: 0, is_starter: true, is_active: true },
];

test("Unified catalog keeps 8 production identities and adds 9 unmapped prototypes", () => {
  const catalog = buildUnifiedCardCatalog(productionCards);
  const validation = validateUnifiedCardCatalog(catalog);
  assert.equal(validation.valid, true, validation.errors.join(","));
  assert.equal(catalog.length, 17);
  assert.equal(new Set(catalog.map((card) => card.catalogId)).size, 17);
  assert.equal(new Set(catalog.map((card) => card.name)).size, 17);
  assert.equal(catalog.filter((card) => card.catalogState === CARD_CATALOG_STATES.PROTOTYPE).length, 9);
});

test("Firewall Guard maps explicitly without replacing production ownership identity", () => {
  const catalog = buildUnifiedCardCatalog(productionCards);
  const firewall = catalog.find((card) => card.id === "firewall-guard");
  assert.equal(firewall.inventoryCardId, "firewall-guard");
  assert.equal(firewall.prototypeId, "prototype-firewall-guard");
  assert.equal(firewall.definitionSource, CARD_DEFINITION_SOURCES.MAPPED_PROTOTYPE);
  assert.match(firewall.artwork.src, /Cyan Firewall/);
  assert.equal(catalog.some((card) => card.id === "prototype-firewall-guard"), false);
});

test("Prototype definitions never become owned or match eligible on the client", () => {
  const catalog = buildUnifiedCardCatalog(productionCards);
  const prototype = catalog.find((card) => card.id === "prototype-privacy-shield");
  assert.equal(isMatchEligibleCatalogCard(prototype), false);
  assert.equal(catalogOwnershipState(prototype, new Set([prototype.id]), new Set([prototype.id])), "PROTOTYPE");
  const allowed = availableAdventureCardIds(catalog, new Set([prototype.id, "access-denied"]));
  assert.equal(allowed.includes(prototype.id), false);
  assert.equal(allowed.includes("access-denied"), true);
});

test("Starter policy still creates a valid five-card deck with two-copy limit", () => {
  const catalog = buildUnifiedCardCatalog(productionCards);
  const allowed = availableAdventureCardIds(catalog, new Set());
  const loadout = normalizeAdventureLoadout([], allowed);
  assert.equal(loadout.length, 5);
  assert.equal(validateAdventureLoadout(loadout, allowed).valid, true);
  for (const id of new Set(loadout)) assert.ok(loadout.filter((cardId) => cardId === id).length <= 2);
});

test("All ten prototype definitions remain present as source data", () => {
  assert.equal(ACTION_CARD_PROTOTYPES.length, 10);
  assert.equal(new Set(ACTION_CARD_PROTOTYPES.map((card) => card.id)).size, 10);
});

test("Canonical mapping covers ten unique cards and reuses firewall-guard exactly once", () => {
  const validation = validateCanonicalCardMapping();
  assert.equal(validation.valid, true, validation.errors.join(","));
  assert.equal(Object.keys(PROTOTYPE_TO_INVENTORY_CARD_ID).length, 10);
  assert.equal(new Set(Object.values(PROTOTYPE_TO_INVENTORY_CARD_ID)).size, 10);
  assert.equal(Object.values(PROTOTYPE_TO_INVENTORY_CARD_ID).filter((id) => id === "firewall-guard").length, 1);
});

test("Prototype canonical identity alone never grants ownership before a server row exists", () => {
  const catalog = buildUnifiedCardCatalog(productionCards);
  const privacy = catalog.find((card) => card.prototypeId === "prototype-privacy-shield");
  assert.equal(privacy.canonicalProductionId, "privacy-shield");
  assert.equal(privacy.inventoryCardId, null);
  assert.equal(catalogOwnershipState(privacy, new Set(["privacy-shield"])), "PROTOTYPE");
});

test("Server eligibility enables five unique Scenario starters without changing legacy starters", () => {
  const futureRows = ACTION_CARD_PROTOTYPES
    .filter((prototype) => prototype.id !== "prototype-firewall-guard")
    .map((prototype) => ({
      id: PROTOTYPE_TO_INVENTORY_CARD_ID[prototype.id],
      name: prototype.name,
      card_type: prototype.type,
      is_starter: false,
      is_active: true,
    }));
  const catalog = buildUnifiedCardCatalog([...productionCards, ...futureRows]);
  const eligibilityRows = SCENARIO_STARTER_CANONICAL_IDS.map((action_card_id) => ({ game_mode_code: "scenario-adventure", action_card_id, is_starter: true, is_active: true }));
  const starterIds = scenarioStarterIdsFromServer(eligibilityRows);
  const policy = scenarioLoadoutPolicy({ serverEligibilityReady: true, starterIds });
  const allowed = availableAdventureCardIds(catalog, new Set(), starterIds);
  const loadout = normalizeAdventureLoadout([], allowed, starterIds, { policy });
  assert.equal(policy, SCENARIO_LOADOUT_POLICIES.FIVE_UNIQUE_STARTERS);
  assert.deepEqual(loadout, SCENARIO_STARTER_CANONICAL_IDS);
  assert.equal(new Set(loadout).size, 5);
  assert.equal(validateAdventureLoadout(loadout, allowed, { policy }).valid, true);
  assert.equal(productionCards.filter((card) => card.is_starter).length, 3);
});

test("Mechanics 1.0 remains a side-effect-free design contract", () => {
  assert.equal(validateMechanicsContract().valid, true);
  assert.equal(ACTION_CARD_MECHANICS_V1.status, "DESIGN_CONTRACT_ONLY");
  assert.equal(ACTION_CARD_MECHANICS_V1.responsePoints.enabled, false);
  assert.equal(ACTION_CARD_MECHANICS_V1.stability.enabled, false);
});

