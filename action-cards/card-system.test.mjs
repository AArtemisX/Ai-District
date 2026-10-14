import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ACTION_CARD_PROTOTYPES, ACTION_CARD_TYPES, validateActionCardDefinition } from "./card-data.js";
import { PREVIEW_DECK_LIMIT, togglePreviewDeck, validatePreviewDeck } from "./collection-engine.js";

test("ข้อมูลต้นแบบ 10 ใบครอบคลุม 5 ประเภท ประเภทละ 2 ใบ และผ่าน schema validation", () => {
  assert.equal(ACTION_CARD_PROTOTYPES.length, 10);
  assert.deepEqual(new Set(ACTION_CARD_PROTOTYPES.map((card) => card.type)), new Set(Object.values(ACTION_CARD_TYPES)));
  for (const type of Object.values(ACTION_CARD_TYPES)) assert.equal(ACTION_CARD_PROTOTYPES.filter((card) => card.type === type).length, 2);
  assert.equal(new Set(ACTION_CARD_PROTOTYPES.map((card) => card.id)).size, 10);
  assert.ok(ACTION_CARD_PROTOTYPES.every((card) => validateActionCardDefinition(card).valid));
  assert.ok(ACTION_CARD_PROTOTYPES.every((card) => card.isPrototype));
});

test("ชื่อ ประเภท และความหายากของ Prototype ตรงตาม Phase 2", () => {
  const expected = new Map([
    ["Privacy Shield", ["DEFENSE", "COMMON"]], ["Firewall Guard", ["DEFENSE", "RARE"]],
    ["Threat Shutdown", ["ATTACK", "COMMON"]], ["System Countermeasure", ["ATTACK", "RARE"]],
    ["Recovery Protocol", ["SUPPORT", "COMMON"]], ["Human Assistance", ["SUPPORT", "RARE"]],
    ["Data Audit", ["STRATEGY", "COMMON"]], ["Explainability Insight", ["STRATEGY", "RARE"]],
    ["Ethical Override", ["SPECIAL", "EPIC"]], ["Responsible AI Protocol", ["SPECIAL", "EPIC"]],
  ]);
  for (const card of ACTION_CARD_PROTOTYPES) {
    assert.deepEqual([card.type, card.rarity], expected.get(card.name));
    assert.ok(card.target.rule.startsWith("สถานการณ์ด้าน"));
    assert.equal(card.status, "ACTIVE");
  }
});

test("Card Data แยก artwork และ effect ออกจาก UI พร้อมรองรับภาพภายหลัง", () => {
  for (const card of ACTION_CARD_PROTOTYPES) {
    assert.ok(Object.hasOwn(card.artwork, "src"));
    assert.ok(card.artwork.alt);
    assert.ok(card.effect.kind.startsWith("PLACEHOLDER_"));
    assert.equal(Object.hasOwn(card.effect, "value"), false);
    assert.equal(Object.hasOwn(card.effect, "damage"), false);
    assert.equal(Object.hasOwn(card.effect, "score"), false);
    assert.ok(card.target.scope);
    assert.ok(card.activationCondition.timing);
  }
});

test("Artwork PNG ทั้ง 10 ใบมีอยู่จริง ไม่ซ้ำ และตรงกับสัดส่วน 1122 × 1402", async () => {
  assert.equal(new Set(ACTION_CARD_PROTOTYPES.map((card) => card.artwork.src)).size, 10);
  for (const card of ACTION_CARD_PROTOTYPES) {
    assert.ok(card.artwork.src?.startsWith("assets/"));
    const bytes = await readFile(new URL(`../${card.artwork.src}`, import.meta.url));
    assert.deepEqual([...bytes.subarray(0, 4)], [137, 80, 78, 71]);
    assert.equal(bytes.readUInt32BE(16), 1122);
    assert.equal(bytes.readUInt32BE(20), 1402);
  }
});

test("เลือกการ์ดเข้าชุดได้สูงสุด 5 และป้องกัน ID ซ้ำ", () => {
  let selected = [];
  for (const card of ACTION_CARD_PROTOTYPES.slice(0, PREVIEW_DECK_LIMIT)) selected = togglePreviewDeck(selected, card.id).selectedIds;
  assert.equal(selected.length, PREVIEW_DECK_LIMIT);
  assert.equal(new Set(selected).size, selected.length);
  const duplicateToggle = togglePreviewDeck(selected, selected[0]);
  assert.equal(duplicateToggle.reason, "REMOVED");
  assert.equal(togglePreviewDeck(selected, ACTION_CARD_PROTOTYPES[PREVIEW_DECK_LIMIT].id).reason, "DECK_FULL");
});

test("การ์ด Disabled เลือกไม่ได้และ validation ปฏิเสธ", () => {
  const disabled = { ...ACTION_CARD_PROTOTYPES[0], id: "prototype-disabled-state", status: "DISABLED" };
  assert.equal(togglePreviewDeck([], disabled.id, { disabled: true }).reason, "CARD_DISABLED");
  const result = validatePreviewDeck([disabled.id], [...ACTION_CARD_PROTOTYPES, disabled]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.startsWith("CARD_NOT_ACTIVE")));
});

test("ยกเลิกการเลือกแล้วสามารถเลือกใหม่ได้โดยไม่มีข้อมูลค้าง", () => {
  const active = ACTION_CARD_PROTOTYPES.find((card) => card.status === "ACTIVE");
  const added = togglePreviewDeck([], active.id);
  const removed = togglePreviewDeck(added.selectedIds, active.id);
  const addedAgain = togglePreviewDeck(removed.selectedIds, active.id);
  assert.deepEqual(addedAgain.selectedIds, [active.id]);
  assert.equal(validatePreviewDeck(addedAgain.selectedIds, ACTION_CARD_PROTOTYPES).valid, true);
});

