import test from "node:test";
import assert from "node:assert/strict";
import { DISTRICTS } from "./board-data.js";
import { buildDistrict, createInitialDistrictStates } from "./district-engine.js";
import {
  EFFECT_TYPES,
  INVENTORY_RULES,
  activeEffects,
  chooseBotUtilityAction,
  consumeInfluenceBlock,
  consumeSpeedBoost,
  createCardInstance,
  createInitialInventory,
  createItemInstance,
  grantReward,
  resolveCardAction,
  resolveItemAction,
} from "./action-engine.js";

const freshDistricts = () => createInitialDistrictStates(DISTRICTS);
const ownedAcademy = (owner = "player", energy = 5) => buildDistrict(freshDistricts().academy, owner, energy).district;

function cardInventory(cardIds, actor = "player") {
  return { hand: cardIds.map((id, index) => createCardInstance(id, `${actor}-${id}-${index}`)), items: [], discard: [], claimedRewardIds: [] };
}

function itemInventory(itemIds, actor = "player") {
  return { hand: [], items: itemIds.map((id, index) => createItemInstance(id, `${actor}-${id}-${index}`)), discard: [], claimedRewardIds: [] };
}

test("ผู้เล่นและบอทเริ่มด้วยการ์ด 3 ใบและไอเทม 1 ชิ้นแบบ Instance ID ไม่ซ้ำ", () => {
  const player = createInitialInventory("player");
  const bot = createInitialInventory("bot");
  assert.equal(player.hand.length, 3);
  assert.equal(player.items.length, 1);
  assert.equal(bot.hand.length, 3);
  assert.equal(new Set([...player.hand, ...player.items, ...bot.hand, ...bot.items].map((entry) => entry.instanceId)).size, 8);
});

test("ใช้การ์ดสำเร็จแล้วหัก EN และย้ายไป Discard", () => {
  const inventory = cardInventory(["patch-update"]);
  const academy = ownedAcademy();
  const result = resolveCardAction({ actorId: "player", instanceId: inventory.hand[0].instanceId, targetDistrictId: "academy", inventory, energy: 5, districts: { ...freshDistricts(), academy }, effects: [] });
  assert.equal(result.success, true);
  assert.equal(result.energy, 4);
  assert.equal(result.inventory.hand.length, 0);
  assert.equal(result.inventory.discard.length, 1);
  assert.equal(result.districts.academy.influenceByPlayer.player, 5);
});

test("การโจมตีลด IP ผ่านฟังก์ชันกลางและเปลี่ยนเจ้าของได้", () => {
  const inventory = cardInventory(["system-crash"], "bot");
  const academy = { ...ownedAcademy(), influenceByPlayer: { player: 3, bot: 2 } };
  const result = resolveCardAction({ actorId: "bot", instanceId: inventory.hand[0].instanceId, targetDistrictId: "academy", inventory, energy: 5, districts: { ...freshDistricts(), academy }, effects: [] });
  assert.equal(result.districts.academy.influenceByPlayer.player, 0);
  assert.equal(result.districts.academy.ownerId, "bot");
  assert.equal(result.energy, 2);
});

test("Firewall Guard ป้องกันการโจมตีครั้งถัดไปทั้งหมด", () => {
  const districts = { ...freshDistricts(), academy: ownedAcademy() };
  const guardInventory = cardInventory(["firewall-guard"]);
  const guard = resolveCardAction({ actorId: "player", instanceId: guardInventory.hand[0].instanceId, targetDistrictId: "academy", inventory: guardInventory, energy: 5, districts, effects: [] });
  const attackInventory = cardInventory(["data-strike"], "bot");
  const attack = resolveCardAction({ actorId: "bot", instanceId: attackInventory.hand[0].instanceId, targetDistrictId: "academy", inventory: attackInventory, energy: 5, districts: guard.districts, effects: guard.effects });
  assert.equal(attack.success, true);
  assert.equal(attack.districts.academy.influenceByPlayer.player, 3);
  assert.equal(attack.effects.some((effect) => effect.effectType === EFFECT_TYPES.FIREWALL_SHIELD), false);
});

test("Lag Pulse บล็อก District Influence หนึ่งครั้งแล้วหมดอายุ", () => {
  const districts = { ...freshDistricts(), academy: ownedAcademy() };
  const inventory = cardInventory(["lag-pulse"]);
  const result = resolveCardAction({ actorId: "player", instanceId: inventory.hand[0].instanceId, targetDistrictId: "academy", inventory, energy: 5, districts, effects: [] });
  const first = consumeInfluenceBlock(result.effects, "bot", "academy", 0);
  const second = consumeInfluenceBlock(first.effects, "bot", "academy", 0);
  assert.equal(first.blocked, true);
  assert.equal(second.blocked, false);
});

test("Access Denied บล็อก ATTACK ถึงจบเทิร์นถัดไปของคู่แข่ง", () => {
  const districts = { ...freshDistricts(), academy: ownedAcademy() };
  const controlInventory = cardInventory(["access-denied"]);
  const control = resolveCardAction({ actorId: "player", instanceId: controlInventory.hand[0].instanceId, targetDistrictId: "academy", inventory: controlInventory, energy: 5, districts, effects: [], turnNumber: 0 });
  const attackInventory = cardInventory(["data-strike"], "bot");
  const blocked = resolveCardAction({ actorId: "bot", instanceId: attackInventory.hand[0].instanceId, targetDistrictId: "academy", inventory: attackInventory, energy: 5, districts, effects: control.effects, turnNumber: 1 });
  const expired = resolveCardAction({ actorId: "bot", instanceId: attackInventory.hand[0].instanceId, targetDistrictId: "academy", inventory: attackInventory, energy: 5, districts, effects: activeEffects(control.effects, 2), turnNumber: 2 });
  assert.equal(blocked.success, false);
  assert.equal(expired.success, true);
});

test("Speed Chip เพิ่มก้าวครั้งถัดไป +1 และถูกใช้เพียงครั้งเดียว", () => {
  const inventory = itemInventory(["speed-chip"]);
  const used = resolveItemAction({ actorId: "player", instanceId: inventory.items[0].instanceId, inventory, energy: 5, districts: freshDistricts(), effects: [] });
  const first = consumeSpeedBoost(used.effects, "player", 0);
  const second = consumeSpeedBoost(first.effects, "player", 0);
  assert.equal(first.bonus, 1);
  assert.equal(second.bonus, 0);
  assert.equal(used.inventory.items.length, 0);
});

test("Shield Module ลดความเสียหายครั้งถัดไป 2", () => {
  const districts = { ...freshDistricts(), academy: ownedAcademy() };
  const itemInventoryState = itemInventory(["shield-module"]);
  const shield = resolveItemAction({ actorId: "player", instanceId: itemInventoryState.items[0].instanceId, targetDistrictId: "academy", inventory: itemInventoryState, energy: 5, districts, effects: [] });
  const attackInventory = cardInventory(["system-crash"], "bot");
  const attack = resolveCardAction({ actorId: "bot", instanceId: attackInventory.hand[0].instanceId, targetDistrictId: "academy", inventory: attackInventory, energy: 5, districts, effects: shield.effects });
  assert.equal(attack.districts.academy.influenceByPlayer.player, 1);
});

test("Inventory ไม่เกินขนาดสูงสุดและ Event เดิมรับรางวัลซ้ำไม่ได้", () => {
  let inventory = createInitialInventory("player");
  let first = grantReward(inventory, { kind: "CARD", id: "data-strike" }, "reward-1");
  assert.equal(first.success, true);
  const duplicate = grantReward(first.inventory, { kind: "CARD", id: "data-strike" }, "reward-1");
  assert.equal(duplicate.duplicate, true);
  inventory = { ...first.inventory, hand: [...first.inventory.hand, createCardInstance("data-strike", "extra")] };
  assert.equal(inventory.hand.length, INVENTORY_RULES.MAX_HAND);
  const full = grantReward(inventory, { kind: "CARD", id: "patch-update" }, "reward-2");
  assert.equal(full.full, true);
  assert.equal(full.inventory.hand.length, INVENTORY_RULES.MAX_HAND);
});

test("ห้ามใช้ Card Action ซ้ำในเทิร์นเดียวและความล้มเหลวไม่หัก EN", () => {
  const inventory = cardInventory(["energy-boost", "patch-update"]);
  const blocked = resolveCardAction({ actorId: "player", instanceId: inventory.hand[0].instanceId, inventory, energy: 1, districts: freshDistricts(), effects: [], actionUsed: true });
  assert.equal(blocked.success, false);
  assert.equal(blocked.energy, 1);
  assert.equal(blocked.inventory.hand.length, 2);
});

test("Bot ใช้ Energy Boost เมื่อ EN ต่ำและโจมตีเมื่อมีเป้าหมาย", () => {
  const inventory = createInitialInventory("bot");
  const lowEnergy = chooseBotUtilityAction({ inventory, energy: 2, districts: freshDistricts() });
  assert.equal(inventory.hand.find((entry) => entry.instanceId === lowEnergy.instanceId).cardId, "energy-boost");
  const districts = { ...freshDistricts(), academy: ownedAcademy() };
  const attack = chooseBotUtilityAction({ inventory, energy: 5, districts });
  assert.equal(attack.kind, "CARD");
  assert.equal(attack.targetDistrictId, "academy");
});

test("จำลอง 5 รอบ การ์ดและไอเทมไม่ทำให้ State ค้างหรือค่าเกินขอบเขต", () => {
  let energy = 1;
  let inventory = createInitialInventory("bot");
  let districts = { ...freshDistricts(), academy: ownedAcademy() };
  let effects = [];
  for (let turn = 0; turn < 5; turn += 1) {
    const action = chooseBotUtilityAction({ inventory, energy, districts, effects, turnNumber: turn });
    if (!action) continue;
    const result = action.kind === "CARD"
      ? resolveCardAction({ actorId: "bot", instanceId: action.instanceId, targetDistrictId: action.targetDistrictId, inventory, energy, districts, effects, turnNumber: turn })
      : resolveItemAction({ actorId: "bot", instanceId: action.instanceId, targetDistrictId: action.targetDistrictId, inventory, energy, districts, effects, turnNumber: turn, random: () => .5 });
    if (result.success) ({ inventory, energy, districts, effects } = result);
    effects = activeEffects(effects, turn + 1);
  }
  assert.ok(energy >= 0 && energy <= 10);
  assert.ok(Object.values(districts).every((district) => Object.values(district.influenceByPlayer).every((ip) => ip >= 0 && ip <= 12)));
  assert.ok(inventory.hand.length <= 5 && inventory.items.length <= 3);
});

