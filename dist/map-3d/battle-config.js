export const BATTLE_RULES = Object.freeze({
  STARTING_ENERGY: 5,
  MAX_ENERGY: 10,
  START_OF_TURN_REGEN: 1,
  ENERGY_TILE_REWARD: 2,
  ACTION_SECONDS: 30,
});

export const ACTION_ENCOUNTER_TYPES = Object.freeze({
  BATTLE: "BATTLE",
  CARD: "CARD",
  ITEM: "ITEM",
  ENERGY: "ENERGY",
  DISTRICT: "DISTRICT",
  RANDOM_EVENT: "RANDOM_EVENT",
});

export const BATTLE_TILE_EVENTS = Object.freeze([
  Object.freeze({
    type: ACTION_ENCOUNTER_TYPES.BATTLE,
    title: "เขตปะทะอิทธิพล",
    description: "เตรียมใช้การ์ดและทรัพยากรเพื่อท้าชิง District ที่เข้าเงื่อนไข",
    duration: 45,
    safeResult: "ไม่มี District ที่เข้าเงื่อนไข — ข้ามการปะทะอย่างปลอดภัย",
  }),
  Object.freeze({
    type: ACTION_ENCOUNTER_TYPES.CARD,
    title: "จุดเสริมกำลังการ์ด",
    description: "จั่วการ์ดหนึ่งใบจาก Card Pool ของ Loadout เมื่อมือยังมีพื้นที่",
    duration: 30,
    safeResult: "มือการ์ดเต็มหรือไม่มีการ์ดใน Pool — ไม่จั่วเพิ่ม",
  }),
  Object.freeze({
    type: ACTION_ENCOUNTER_TYPES.ITEM,
    title: "คลังอุปกรณ์สนับสนุน",
    description: "รับไอเทมหนึ่งชิ้นเมื่อ Inventory ยังมีพื้นที่",
    duration: 30,
    safeResult: "ช่องไอเทมเต็ม — ไม่รับไอเทมเพิ่ม",
  }),
  Object.freeze({
    type: ACTION_ENCOUNTER_TYPES.ENERGY,
    title: "สถานีพลังงาน",
    description: `ฟื้นฟูพลังงาน +${BATTLE_RULES.ENERGY_TILE_REWARD} EN โดยไม่เกิน ${BATTLE_RULES.MAX_ENERGY} EN`,
    duration: 30,
    safeResult: "พลังงานเต็มแล้ว",
  }),
  Object.freeze({
    type: ACTION_ENCOUNTER_TYPES.DISTRICT,
    title: "เขตพัฒนาเมือง",
    description: "สร้าง District ใหม่หรือเพิ่ม Influence ตามกติกาเดิม",
    duration: 35,
    safeResult: "ข้ามการจัดการ District โดยไม่เสียพลังงาน",
  }),
  Object.freeze({
    type: ACTION_ENCOUNTER_TYPES.RANDOM_EVENT,
    title: "เหตุการณ์เครือข่าย",
    description: "การจราจรข้อมูลผันผวน ระบบรักษาทรัพยากรปัจจุบันไว้",
    duration: 30,
    safeResult: "เหตุการณ์สิ้นสุดโดยไม่มีการเปลี่ยนทรัพยากร",
  }),
]);

export function clampBattleEnergy(value) {
  return Math.min(BATTLE_RULES.MAX_ENERGY, Math.max(0, Number(value) || 0));
}

export function regenerateTurnEnergy(value) {
  const before = clampBattleEnergy(value);
  const energy = clampBattleEnergy(before + BATTLE_RULES.START_OF_TURN_REGEN);
  return { before, energy, gained: energy - before };
}

export function resolveEnergyTile(value) {
  const before = clampBattleEnergy(value);
  const energy = clampBattleEnergy(before + BATTLE_RULES.ENERGY_TILE_REWARD);
  return { before, energy, gained: energy - before };
}

