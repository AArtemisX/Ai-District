import { ACTION_CARD_BY_ID, CARD_TARGETS, CARD_TYPES } from "./action-card-data.js";
import { ITEM_BY_ID, ITEM_TARGETS } from "./item-data.js";
import { DISTRICT_RULES, applyInfluenceChange, clampEnergy } from "./district-engine.js";

export const INVENTORY_RULES = Object.freeze({ MAX_HAND: 5, MAX_ITEMS: 3 });
export const PLAYER_STARTER_CARD_IDS = Object.freeze(["patch-update", "firewall-guard", "energy-boost"]);
export const BOT_CARD_POOL_IDS = Object.freeze(["data-strike", "firewall-guard", "energy-boost"]);
export const EFFECT_TYPES = Object.freeze({
  FIREWALL_SHIELD: "FIREWALL_SHIELD",
  INFLUENCE_BLOCK: "INFLUENCE_BLOCK",
  ATTACK_BLOCK: "ATTACK_BLOCK",
  SHIELD_MODULE: "SHIELD_MODULE",
  SPEED_BOOST: "SPEED_BOOST",
});

let instanceSequence = 0;
const nextInstanceId = (prefix) => `${prefix}-${Date.now().toString(36)}-${(instanceSequence += 1).toString(36)}`;
export const opponentOf = (actorId) => actorId === "player" ? "bot" : "player";

export function createCardInstance(cardId, instanceId = nextInstanceId("card")) {
  if (!ACTION_CARD_BY_ID[cardId]) throw new Error(`Unknown card: ${cardId}`);
  return { instanceId, cardId };
}

export function createItemInstance(itemId, instanceId = nextInstanceId("item")) {
  if (!ITEM_BY_ID[itemId]) throw new Error(`Unknown item: ${itemId}`);
  return { instanceId, itemId };
}

export function normalizeBattleCardPool(cardIds, fallbackIds = PLAYER_STARTER_CARD_IDS) {
  if (!Array.isArray(cardIds)) return [...fallbackIds];
  const uniqueValidIds = [...new Set(cardIds.filter((id) => Boolean(ACTION_CARD_BY_ID[id])))];
  return uniqueValidIds.length === 3 ? uniqueValidIds : [...fallbackIds];
}

export function createInitialInventory(actorId = "player", playerCardIds = null) {
  const cardIds = actorId === "bot"
    ? [...BOT_CARD_POOL_IDS]
    : normalizeBattleCardPool(playerCardIds);
  const itemIds = actorId === "bot" ? ["repair-kit"] : ["energy-cell"];
  return {
    hand: cardIds.map((id, index) => createCardInstance(id, `${actorId}-card-${index + 1}`)),
    items: itemIds.map((id, index) => createItemInstance(id, `${actorId}-item-${index + 1}`)),
    discard: [],
    poolCardIds: [...cardIds],
    claimedRewardIds: [],
  };
}

export function isInventoryCompatibleWithPool(inventory, allowedCardIds) {
  const pool = normalizeBattleCardPool(allowedCardIds);
  if (!inventory || !Array.isArray(inventory.hand) || !Array.isArray(inventory.discard)) return false;
  if (!Array.isArray(inventory.poolCardIds) || inventory.poolCardIds.length !== pool.length) return false;
  const allowed = new Set(pool);
  const storedPool = new Set(inventory.poolCardIds);
  if (storedPool.size !== allowed.size || [...allowed].some((id) => !storedPool.has(id))) return false;
  return [...inventory.hand, ...inventory.discard].every((instance) => allowed.has(instance.cardId));
}

export function drawCardFromPool(inventory, eventId, seed = 0) {
  if (!inventory?.poolCardIds?.length) return { success: false, inventory, message: "ไม่พบการ์ดใน Battle Card Pool" };
  if (inventory.claimedRewardIds.includes(eventId)) return { success: false, duplicate: true, inventory, message: "ประมวลผลช่องการ์ดนี้แล้ว" };
  if (inventory.hand.length >= INVENTORY_RULES.MAX_HAND) return { success: false, full: true, inventory, message: `มือการ์ดเต็ม ${INVENTORY_RULES.MAX_HAND} ใบ — ไม่จั่วเพิ่ม` };
  const cardId = inventory.poolCardIds[Math.abs(Number(seed) || 0) % inventory.poolCardIds.length];
  const card = ACTION_CARD_BY_ID[cardId];
  if (!card) return { success: false, inventory, message: "การ์ดใน Battle Card Pool ไม่ถูกต้อง" };
  const instance = createCardInstance(cardId);
  const next = {
    ...inventory,
    hand: [...inventory.hand, instance],
    claimedRewardIds: [...inventory.claimedRewardIds, eventId],
  };
  return { success: true, inventory: next, reward: { kind: "CARD", id: cardId, name: card.name }, message: `จั่ว ${card.name} จาก Loadout Pool` };
}

export function createEffect({ sourcePlayerId, targetPlayerId, districtId = null, effectType, remainingUses = 1, expiresAtTurn = null, amount = 0 }) {
  return {
    effectId: nextInstanceId("effect"), sourcePlayerId, targetPlayerId, districtId,
    effectType, remainingUses, expiresAtTurn, amount,
  };
}

export function isEffectActive(effect, turnNumber = 0) {
  return effect.remainingUses !== 0 && (effect.expiresAtTurn == null || effect.expiresAtTurn >= turnNumber);
}

export function activeEffects(effects, turnNumber = 0) {
  return effects.filter((effect) => isEffectActive(effect, turnNumber));
}

export function addOrRefreshEffect(effects, incoming) {
  const existingIndex = effects.findIndex((effect) => (
    effect.effectType === incoming.effectType
    && effect.sourcePlayerId === incoming.sourcePlayerId
    && effect.targetPlayerId === incoming.targetPlayerId
    && effect.districtId === incoming.districtId
  ));
  if (existingIndex < 0) return [...effects, incoming];
  return effects.map((effect, index) => index === existingIndex ? {
    ...effect,
    remainingUses: Math.max(effect.remainingUses ?? 0, incoming.remainingUses ?? 0),
    expiresAtTurn: Math.max(effect.expiresAtTurn ?? -1, incoming.expiresAtTurn ?? -1),
    amount: Math.max(effect.amount ?? 0, incoming.amount ?? 0),
  } : effect);
}

function consumeEffect(effects, effectId) {
  return effects.map((effect) => effect.effectId === effectId
    ? { ...effect, remainingUses: Math.max(0, (effect.remainingUses ?? 1) - 1) }
    : effect).filter((effect) => effect.remainingUses !== 0);
}

function matchingEffect(effects, effectType, targetPlayerId, districtId, turnNumber) {
  return effects.find((effect) => effect.effectType === effectType
    && effect.targetPlayerId === targetPlayerId
    && (effect.districtId == null || effect.districtId === districtId)
    && isEffectActive(effect, turnNumber));
}

function validDistrictTarget(targetType, district, actorId) {
  if (targetType === CARD_TARGETS.SELF || targetType === ITEM_TARGETS.SELF) return true;
  if (!district?.isBuilt) return false;
  if (targetType === CARD_TARGETS.OWNED_DISTRICT || targetType === ITEM_TARGETS.OWNED_DISTRICT) return district.ownerId === actorId;
  if (targetType === CARD_TARGETS.OPPONENT_DISTRICT) return (district.influenceByPlayer[opponentOf(actorId)] || 0) > 0;
  return true;
}

function removeHandCard(inventory, cardInstance) {
  return {
    ...inventory,
    hand: inventory.hand.filter((item) => item.instanceId !== cardInstance.instanceId),
    discard: [...inventory.discard, cardInstance],
  };
}

function removeItem(inventory, itemInstance) {
  return { ...inventory, items: inventory.items.filter((item) => item.instanceId !== itemInstance.instanceId) };
}

function failed(message, snapshot) {
  return { success: false, message, ...snapshot };
}

export function createUtilityActionId({ actorId, turnNumber = 0, kind, instanceId, targetDistrictId = null }) {
  return [actorId, turnNumber, kind, instanceId, targetDistrictId || "self"].join(":");
}

function describeCardEffect(card) {
  if (card.effect.kind === "DAMAGE_IP") return `ผลเมื่อสำเร็จ: คู่แข่ง -${card.effect.amount} IP`;
  if (card.effect.kind === "ADD_IP") return `ผลเมื่อสำเร็จ: คุณ +${card.effect.amount} IP`;
  if (card.effect.kind === "ADD_ENERGY") return `ผลเมื่อสำเร็จ: ฟื้น +${card.effect.amount} EN`;
  if (card.effect.kind === "FIREWALL_SHIELD") return "ผลเมื่อสำเร็จ: ป้องกันการ์ดโจมตีครั้งถัดไป";
  if (card.effect.kind === "INFLUENCE_BLOCK") return "ผลเมื่อสำเร็จ: บล็อกการเพิ่ม IP ครั้งถัดไป";
  if (card.effect.kind === "ATTACK_BLOCK") return "ผลเมื่อสำเร็จ: ปิดการโจมตีของคู่แข่งชั่วคราว";
  return "พร้อมใช้งาน";
}

export function previewCardAction({ actorId, instanceId, targetDistrictId = null, inventory, energy, districts, effects = [], actionUsed = false, turnNumber = 0, allowedDistrictIds = null }) {
  const instance = inventory?.hand?.find((item) => item.instanceId === instanceId);
  const card = instance ? ACTION_CARD_BY_ID[instance.cardId] : null;
  const base = { success: false, valid: false, card, energyCost: card?.cost ?? 0, effectPreview: card ? describeCardEffect(card) : "" };
  if (actionUsed) return { ...base, message: "ใช้การ์ดครบ 1 ใบสำหรับเทิร์นนี้แล้ว" };
  if (!card) return { ...base, message: "ไม่พบการ์ดในมือ" };
  if (energy < card.cost) return { ...base, message: `Energy ไม่พอ (ต้องใช้ ${card.cost} EN)` };
  if (card.targetType !== CARD_TARGETS.SELF && Array.isArray(allowedDistrictIds) && !allowedDistrictIds.includes(targetDistrictId)) {
    return { ...base, message: "District นี้ไม่ใช่เป้าหมายของ Encounter ปัจจุบัน" };
  }
  const district = targetDistrictId ? districts?.[targetDistrictId] : null;
  if (!validDistrictTarget(card.targetType, district, actorId)) return { ...base, message: "เป้าหมายไม่ตรงตามเงื่อนไขของการ์ด" };
  if (card.type === CARD_TYPES.ATTACK) {
    const blocked = matchingEffect(effects, EFFECT_TYPES.ATTACK_BLOCK, actorId, targetDistrictId, turnNumber);
    if (blocked) return { ...base, blockedBy: "ACCESS_DENIED", message: "Access Denied ปิดการใช้การ์ดโจมตีต่อ District นี้" };
  }
  return { ...base, success: true, valid: true, message: "พร้อมยืนยันการใช้การ์ด" };
}

export function resolveCardAction({ actorId, instanceId, targetDistrictId = null, inventory, energy, districts, effects = [], actionUsed = false, turnNumber = 0 }) {
  const snapshot = { inventory, energy: clampEnergy(energy), districts, effects, actionUsed };
  const preview = previewCardAction({ actorId, instanceId, targetDistrictId, inventory, energy, districts, effects, actionUsed, turnNumber });
  if (!preview.valid) return failed(preview.message, {
    ...snapshot,
    card: preview.card,
    targetDistrictId,
    resolution: { targetDistrictId, ipChange: 0, ownerChanged: false, blockedBy: preview.blockedBy || null },
  });
  const instance = inventory.hand.find((item) => item.instanceId === instanceId);
  const card = preview.card;
  const district = targetDistrictId ? districts[targetDistrictId] : null;

  let nextDistricts = districts;
  let nextEffects = activeEffects(effects, turnNumber);
  let nextEnergy = clampEnergy(energy - card.cost);
  let message = `${card.name} ทำงานสำเร็จ`;
  const targetActor = opponentOf(actorId);
  const resolution = { targetDistrictId, ipChange: 0, ownerChanged: false, blockedBy: null };

  if (card.effect.kind === "DAMAGE_IP") {
    let damage = card.effect.amount;
    const firewall = matchingEffect(nextEffects, EFFECT_TYPES.FIREWALL_SHIELD, targetActor, targetDistrictId, turnNumber);
    if (firewall) {
      damage = 0;
      nextEffects = consumeEffect(nextEffects, firewall.effectId);
      resolution.blockedBy = "FIREWALL_GUARD";
      message = `${card.name} ถูก Firewall Guard ป้องกันทั้งหมด`;
    } else {
      const shield = matchingEffect(nextEffects, EFFECT_TYPES.SHIELD_MODULE, targetActor, targetDistrictId, turnNumber);
      if (shield) {
        damage = Math.max(0, damage - (shield.amount || 2));
        nextEffects = consumeEffect(nextEffects, shield.effectId);
        message = `${card.name} ถูก Shield Module ลดความเสียหาย เหลือ ${damage} IP`;
      }
    }
    if (damage > 0) {
      const beforeIp = district.influenceByPlayer[targetActor] || 0;
      const changed = applyInfluenceChange(district, targetActor, -damage);
      nextDistricts = { ...districts, [targetDistrictId]: changed.district };
      resolution.ipChange = (changed.district.influenceByPlayer[targetActor] || 0) - beforeIp;
      resolution.ownerChanged = changed.ownerChanged;
      message = `${card.name} ลด IP ของ${targetActor === "player" ? "ผู้เล่น" : "บอท"} ${damage}${changed.ownerChanged ? " และเปลี่ยนผู้ครอบครอง" : ""}`;
    }
  } else if (card.effect.kind === "ADD_IP") {
    const beforeIp = district.influenceByPlayer[actorId] || 0;
    const changed = applyInfluenceChange(district, actorId, card.effect.amount);
    nextDistricts = { ...districts, [targetDistrictId]: changed.district };
    resolution.ipChange = (changed.district.influenceByPlayer[actorId] || 0) - beforeIp;
    resolution.ownerChanged = changed.ownerChanged;
    message = `${card.name} เพิ่ม IP +${card.effect.amount}${changed.ownerChanged ? " และยึด District สำเร็จ" : ""}`;
  } else if (card.effect.kind === "ADD_ENERGY") {
    nextEnergy = clampEnergy(nextEnergy + card.effect.amount);
    message = `${card.name} เพิ่ม Energy เป็น ${nextEnergy} EN`;
  } else if (card.effect.kind === "FIREWALL_SHIELD") {
    nextEffects = addOrRefreshEffect(nextEffects, createEffect({ sourcePlayerId: actorId, targetPlayerId: actorId, districtId: targetDistrictId, effectType: EFFECT_TYPES.FIREWALL_SHIELD, remainingUses: 1 }));
  } else if (card.effect.kind === "INFLUENCE_BLOCK") {
    nextEffects = addOrRefreshEffect(nextEffects, createEffect({ sourcePlayerId: actorId, targetPlayerId: targetActor, districtId: targetDistrictId, effectType: EFFECT_TYPES.INFLUENCE_BLOCK, remainingUses: 1 }));
  } else if (card.effect.kind === "ATTACK_BLOCK") {
    nextEffects = addOrRefreshEffect(nextEffects, createEffect({ sourcePlayerId: actorId, targetPlayerId: targetActor, districtId: targetDistrictId, effectType: EFFECT_TYPES.ATTACK_BLOCK, remainingUses: 1, expiresAtTurn: turnNumber + 1 }));
  }

  return {
    success: true,
    message,
    card,
    targetDistrictId,
    resolution,
    energyChange: nextEnergy - clampEnergy(energy),
    inventory: removeHandCard(inventory, instance),
    energy: nextEnergy,
    districts: nextDistricts,
    effects: nextEffects,
    actionUsed: true,
  };
}

export function resolveItemAction({ actorId, instanceId, targetDistrictId = null, inventory, energy, districts, effects = [], actionUsed = false, turnNumber = 0, random = Math.random }) {
  const snapshot = { inventory, energy: clampEnergy(energy), districts, effects, actionUsed };
  if (actionUsed) return failed("ใช้ไอเทมครบ 1 ชิ้นสำหรับเทิร์นนี้แล้ว", snapshot);
  const instance = inventory.items.find((entry) => entry.instanceId === instanceId);
  const item = instance ? ITEM_BY_ID[instance.itemId] : null;
  if (!item) return failed("ไม่พบไอเทมใน Inventory", snapshot);
  const district = targetDistrictId ? districts[targetDistrictId] : null;
  if (!validDistrictTarget(item.targetType, district, actorId)) return failed("เป้าหมายไม่ตรงตามเงื่อนไขของไอเทม", snapshot);

  let nextEnergy = clampEnergy(energy);
  let nextDistricts = districts;
  let nextEffects = activeEffects(effects, turnNumber);
  let scan = null;
  let message = `${item.name} ทำงานสำเร็จ`;

  if (item.effect.kind === "ADD_IP") {
    const changed = applyInfluenceChange(district, actorId, item.effect.amount);
    nextDistricts = { ...districts, [targetDistrictId]: changed.district };
    message = `${item.name} เพิ่ม IP +${item.effect.amount}`;
  } else if (item.effect.kind === "ADD_ENERGY") {
    nextEnergy = clampEnergy(nextEnergy + item.effect.amount);
    message = `${item.name} เพิ่ม Energy เป็น ${nextEnergy} EN`;
  } else if (item.effect.kind === "RANDOM_ENERGY") {
    const sample = Math.min(.999999999, Math.max(0, random()));
    const amount = Math.floor(sample * (item.effect.max - item.effect.min + 1)) + item.effect.min;
    nextEnergy = clampEnergy(nextEnergy + amount);
    message = `${item.name} สุ่มได้รับ +${amount} EN`;
  } else if (item.effect.kind === "SCAN_DISTRICT") {
    scan = { districtId: district.districtId, influenceByPlayer: { ...district.influenceByPlayer }, ownerId: district.ownerId, effects: nextEffects.filter((effect) => effect.districtId === district.districtId) };
    message = `${item.name} สแกน ${district.districtName} สำเร็จ`;
  } else if (item.effect.kind === "SPEED_BOOST") {
    nextEffects = addOrRefreshEffect(nextEffects, createEffect({ sourcePlayerId: actorId, targetPlayerId: actorId, effectType: EFFECT_TYPES.SPEED_BOOST, remainingUses: 1, amount: item.effect.amount }));
  } else if (item.effect.kind === "SHIELD_MODULE") {
    nextEffects = addOrRefreshEffect(nextEffects, createEffect({ sourcePlayerId: actorId, targetPlayerId: actorId, districtId: targetDistrictId, effectType: EFFECT_TYPES.SHIELD_MODULE, remainingUses: 1, amount: item.effect.amount }));
  }

  return { success: true, message, item, scan, inventory: removeItem(inventory, instance), energy: nextEnergy, districts: nextDistricts, effects: nextEffects, actionUsed: true };
}

export function consumeInfluenceBlock(effects, actorId, districtId, turnNumber = 0) {
  const effect = matchingEffect(effects, EFFECT_TYPES.INFLUENCE_BLOCK, actorId, districtId, turnNumber);
  return effect ? { blocked: true, effects: consumeEffect(effects, effect.effectId) } : { blocked: false, effects: activeEffects(effects, turnNumber) };
}

export function consumeSpeedBoost(effects, actorId, turnNumber = 0) {
  const effect = matchingEffect(effects, EFFECT_TYPES.SPEED_BOOST, actorId, null, turnNumber);
  return effect
    ? { bonus: effect.amount || 1, effects: consumeEffect(effects, effect.effectId) }
    : { bonus: 0, effects: activeEffects(effects, turnNumber) };
}

export function grantReward(inventory, reward, eventId) {
  if (!reward) return { success: false, inventory, message: "ไม่มีรางวัลสำหรับ Event นี้" };
  if (inventory.claimedRewardIds.includes(eventId)) return { success: false, duplicate: true, inventory, message: "รับรางวัล Event นี้แล้ว" };
  if (reward.kind === "CARD" && inventory.hand.length >= INVENTORY_RULES.MAX_HAND) return { success: false, full: true, inventory, message: "มือการ์ดเต็ม 5 ใบ — ไม่ได้รับการ์ดเพิ่ม" };
  if (reward.kind === "ITEM" && inventory.items.length >= INVENTORY_RULES.MAX_ITEMS) return { success: false, full: true, inventory, message: "ช่องไอเทมเต็ม 3 ชิ้น — ไม่ได้รับไอเทมเพิ่ม" };
  const next = {
    ...inventory,
    hand: reward.kind === "CARD" ? [...inventory.hand, createCardInstance(reward.id)] : inventory.hand,
    items: reward.kind === "ITEM" ? [...inventory.items, createItemInstance(reward.id)] : inventory.items,
    claimedRewardIds: [...inventory.claimedRewardIds, eventId],
  };
  const definition = reward.kind === "CARD" ? ACTION_CARD_BY_ID[reward.id] : ITEM_BY_ID[reward.id];
  return { success: true, inventory: next, reward: { ...reward, name: definition.name }, message: `ได้รับ ${definition.name}` };
}

export function chooseBotUtilityAction({ inventory, energy, districts, effects = [], cardUsed = false, itemUsed = false, turnNumber = 0, allowedDistrictIds = null }) {
  const allowed = (district) => !Array.isArray(allowedDistrictIds) || allowedDistrictIds.includes(district.districtId);
  const availableDistricts = Object.values(districts).filter((district) => district.isBuilt && allowed(district));
  if (!cardUsed) {
    const affordableCards = inventory.hand.filter((entry) => energy >= ACTION_CARD_BY_ID[entry.cardId].cost);
    const attacks = affordableCards.filter((entry) => ["system-crash", "data-strike"].includes(entry.cardId));
    const capture = attacks.flatMap((entry) => {
      const card = ACTION_CARD_BY_ID[entry.cardId];
      return availableDistricts
        .filter((district) => district.ownerId === "player" && (district.influenceByPlayer.player || 0) > 0)
        .map((district) => ({ entry, district, captures: (district.influenceByPlayer.bot || 0) > Math.max(0, (district.influenceByPlayer.player || 0) - card.effect.amount) }));
    }).find((candidate) => candidate.captures);
    if (capture) return { kind: "CARD", instanceId: capture.entry.instanceId, targetDistrictId: capture.district.districtId };
    const guard = inventory.hand.find((entry) => entry.cardId === "firewall-guard");
    const ownedAtRisk = availableDistricts.find((district) => district.ownerId === "bot" && (district.influenceByPlayer.player || 0) >= (district.influenceByPlayer.bot || 0) - 2);
    if (guard && ownedAtRisk && energy >= 1) return { kind: "CARD", instanceId: guard.instanceId, targetDistrictId: ownedAtRisk.districtId };
    const attack = attacks[0];
    const target = availableDistricts
      .filter((district) => (district.influenceByPlayer.player || 0) > 0)
      .sort((a, b) => (b.influenceByPlayer.player || 0) - (a.influenceByPlayer.player || 0))[0];
    if (attack && target) return { kind: "CARD", instanceId: attack.instanceId, targetDistrictId: target.districtId };
    const energyBoost = inventory.hand.find((entry) => entry.cardId === "energy-boost");
    if (energy <= 2 && energyBoost) return { kind: "CARD", instanceId: energyBoost.instanceId, targetDistrictId: null };
  }
  if (!itemUsed) {
    const energyItem = inventory.items.find((entry) => ["energy-cell", "lucky-cache"].includes(entry.itemId));
    if (energy <= 4 && energyItem) return { kind: "ITEM", instanceId: energyItem.instanceId, targetDistrictId: null };
    const repair = inventory.items.find((entry) => entry.itemId === "repair-kit");
    const owned = Object.values(districts).find((district) => district.ownerId === "bot");
    if (repair && owned) return { kind: "ITEM", instanceId: repair.instanceId, targetDistrictId: owned.districtId };
  }
  return null;
}

