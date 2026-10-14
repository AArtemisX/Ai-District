import test from "node:test";
import assert from "node:assert/strict";
import { SCENARIO_ADVENTURE_SEED } from "./scenario-seed.js";
import { SCENARIO_LOADOUT_POLICIES, availableAdventureCardIds, normalizeAdventureLoadout, scenarioLoadoutPolicy, validateAdventureLoadout } from "./loadout-engine.js";
import { cancelCardSelection, consumeSelectedCard, countDeckCards, createDeckState, prepareDeckForTurn, selectCardInstance } from "./deck-engine.js";
import { RESPONSE_TYPES, chooseBotResponse, createResponseSelection, evaluateCardCompatibility, resolveScenarioResponse } from "./response-engine.js";

const cards = [
  { id: "patch-update", is_starter: true, is_active: true },
  { id: "firewall-guard", is_starter: true, is_active: true },
  { id: "energy-boost", is_starter: true, is_active: true },
  { id: "access-denied", is_starter: false, is_active: true },
  { id: "locked", is_starter: false, is_active: true },
];

test("Scenario Adventure สร้าง Loadout 5 ใบจาก starter 3 ชนิดโดยจำกัดชนิดละ 2 ใบ", () => {
  const allowed = availableAdventureCardIds(cards, new Set());
  const loadout = normalizeAdventureLoadout(["patch-update", "firewall-guard", "energy-boost"], allowed);
  assert.equal(loadout.length, 5);
  assert.equal(validateAdventureLoadout(loadout, allowed).valid, true);
  assert.ok([...new Set(loadout)].length >= 3);
});

test("การ์ดล็อกและสำเนาเกิน 2 ใบผ่าน validation ไม่ได้", () => {
  const allowed = availableAdventureCardIds(cards, new Set(["access-denied"]));
  const locked = validateAdventureLoadout(["patch-update", "firewall-guard", "energy-boost", "access-denied", "locked"], allowed);
  assert.equal(locked.valid, false);
  assert.ok(locked.errors.some((error) => error.code === "CARD_LOCKED"));
  const copies = validateAdventureLoadout(["patch-update", "patch-update", "patch-update", "firewall-guard", "energy-boost"], allowed);
  assert.ok(copies.errors.some((error) => error.code === "COPY_LIMIT"));
});

test("ข้อมูล Loadout 3 ใบเดิมถูกเติมเป็น 5 ใบแบบ backwards-compatible", () => {
  const allowed = availableAdventureCardIds(cards, new Set());
  assert.deepEqual(normalizeAdventureLoadout(["patch-update", "firewall-guard", "energy-boost"], allowed).slice(0, 3), ["patch-update", "firewall-guard", "energy-boost"]);
});

test("ก่อน server capability ระบบยังใช้ legacy copy policy", () => {
  const policy = scenarioLoadoutPolicy({ serverEligibilityReady: false, starterIds: ["a", "b", "c", "d", "e"] });
  assert.equal(policy, SCENARIO_LOADOUT_POLICIES.LEGACY_COMPAT);
  const allowed = availableAdventureCardIds(cards, new Set());
  const loadout = normalizeAdventureLoadout([], allowed, undefined, { policy });
  assert.equal(validateAdventureLoadout(loadout, allowed, { policy }).valid, true);
});

test("หลัง server capability ระบบบังคับ five unique IDs", () => {
  const starterIds = ["a", "b", "c", "d", "e"];
  const futureCards = starterIds.map((id) => ({ id, is_starter: false, is_active: true }));
  const policy = scenarioLoadoutPolicy({ serverEligibilityReady: true, starterIds });
  const allowed = availableAdventureCardIds(futureCards, new Set(), starterIds);
  const loadout = normalizeAdventureLoadout(["a", "a"], allowed, starterIds, { policy });
  assert.deepEqual(loadout, starterIds);
  assert.equal(validateAdventureLoadout(loadout, allowed, { policy }).valid, true);
  const duplicate = validateAdventureLoadout(["a", "a", "b", "c", "d"], allowed, { policy });
  assert.ok(duplicate.errors.some((error) => error.code === "DUPLICATE_CARD"));
});

test("เริ่มเกมด้วย Hand 3 และ Draw Pile 2 พร้อม Instance ID ไม่ซ้ำ", () => {
  const deck = createDeckState(["patch-update", "firewall-guard", "energy-boost", "patch-update", "firewall-guard"], { actorId: "player", matchId: "m1", random: () => .5 });
  assert.equal(deck.hand.length, 3); assert.equal(deck.drawPile.length, 2); assert.equal(countDeckCards(deck), 5);
  const ids = [...deck.hand, ...deck.drawPile].map((card) => card.instanceId);
  assert.equal(new Set(ids).size, 5);
});

test("ใช้การ์ดสำเร็จแล้ว Discard และจั่วทดแทนโดยจำนวนรวมคงที่", () => {
  const initial = createDeckState(["patch-update", "firewall-guard", "energy-boost", "patch-update", "firewall-guard"], { random: () => 0 });
  const selected = selectCardInstance(initial, initial.hand[0].instanceId);
  const resolved = consumeSelectedCard(selected, { actionId: "action-1", successful: true });
  assert.equal(resolved.deck.hand.length, 3); assert.equal(resolved.deck.drawPile.length, 1); assert.equal(resolved.deck.discard.length, 1); assert.equal(countDeckCards(resolved.deck), 5);
});

test("Confirm action เดิมซ้ำไม่ Consume การ์ดซ้ำ", () => {
  const initial = createDeckState(["a", "b", "c", "d", "e"], { random: () => 0 });
  const selected = selectCardInstance(initial, initial.hand[0].instanceId);
  const first = consumeSelectedCard(selected, { actionId: "same", successful: true });
  const duplicate = consumeSelectedCard(first.deck, { actionId: "same", successful: true });
  assert.equal(duplicate.duplicate, true); assert.equal(countDeckCards(duplicate.deck), 5); assert.equal(duplicate.deck.discard.length, 1);
});

test("ยกเลิกการเลือกไม่ทิ้งการ์ดและกลับไปเลือกใหม่ได้", () => {
  const initial = createDeckState(["a", "b", "c", "d", "e"], { random: () => 0 });
  const selected = selectCardInstance(initial, initial.hand[0].instanceId);
  const cancelled = cancelCardSelection(selected);
  assert.equal(cancelled.pendingInstanceId, null); assert.equal(countDeckCards(cancelled), 5);
  assert.equal(selectCardInstance(cancelled, cancelled.hand[1].instanceId).pendingInstanceId, cancelled.hand[1].instanceId);
});

test("เมื่อกองจั่วหมด ต้นเทิร์นถัดไปสับกองทิ้งกลับและเติมมือไม่เกิน 3", () => {
  const deck = { hand: [{ instanceId: "h", cardId: "a" }], drawPile: [], discard: [{ instanceId: "d1", cardId: "b" }, { instanceId: "d2", cardId: "c" }, { instanceId: "d3", cardId: "d" }], pendingInstanceId: null, consumedActionIds: [] };
  const prepared = prepareDeckForTurn(deck, () => 0);
  assert.equal(prepared.hand.length, 3); assert.equal(prepared.drawPile.length, 1); assert.equal(prepared.discard.length, 0); assert.equal(countDeckCards(prepared), 4);
});

test("Basic Response มีบริบทเฉพาะ Scenario และไม่ Consume Card", () => {
  const scenario = SCENARIO_ADVENTURE_SEED[0]; const deck = createDeckState(["a", "b", "c", "d", "e"], { random: () => 0 });
  const selection = createResponseSelection({ type: RESPONSE_TYPES.BASIC, scenario, deck });
  const resolved = resolveScenarioResponse({ scenario, actorId: "player", selection, actionId: "basic-1" });
  assert.equal(resolved.result.responseType, "BASIC"); assert.equal(countDeckCards(deck), 5); assert.match(selection.reason, /ตรวจ|แหล่ง|เขียน|บทบาท/);
});

test("Card Response ใช้ Metadata ชั่วคราวและไม่เรียก IP/District effect", () => {
  const scenario = SCENARIO_ADVENTURE_SEED.find((item) => item.category === "PRIVACY");
  const compatible = evaluateCardCompatibility(scenario, "firewall-guard");
  const incompatible = evaluateCardCompatibility(scenario, "energy-boost");
  assert.equal(compatible.usable, true); assert.equal(incompatible.usable, false); assert.equal(compatible.metadataStatus, "TEMPORARY_ROUND_2");
});

test("Response action ID ป้องกัน Resolve ซ้ำ", () => {
  const scenario = SCENARIO_ADVENTURE_SEED[0]; const deck = createDeckState(["patch-update", "firewall-guard", "energy-boost", "patch-update", "firewall-guard"], { random: () => 0 });
  const selection = createResponseSelection({ type: RESPONSE_TYPES.BASIC, scenario, deck });
  const first = resolveScenarioResponse({ scenario, actorId: "player", selection, actionId: "r1" });
  const second = resolveScenarioResponse({ scenario, actorId: "player", selection, actionId: "r1", resolvedActionIds: first.resolvedActionIds });
  assert.equal(second.duplicate, true); assert.equal(second.result, null);
});

test("Bot ใช้การ์ดที่เข้ากันได้ หรือ Basic Response เมื่อไม่มีการ์ดที่ใช้ได้", () => {
  const privacy = SCENARIO_ADVENTURE_SEED.find((item) => item.category === "PRIVACY");
  const compatibleDeck = createDeckState(["firewall-guard", "firewall-guard", "firewall-guard", "a", "b"], { random: () => 0 });
  assert.equal(chooseBotResponse({ scenario: privacy, deck: compatibleDeck }).type, RESPONSE_TYPES.CARD);
  const basicDeck = createDeckState(["unknown", "unknown", "unknown", "unknown", "unknown"], { random: () => 0 });
  assert.equal(chooseBotResponse({ scenario: privacy, deck: basicDeck }).type, RESPONSE_TYPES.BASIC);
});

