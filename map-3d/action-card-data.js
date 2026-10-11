export const CARD_TYPES = Object.freeze({
  ATTACK: "ATTACK",
  DEFENSE: "DEFENSE",
  CONTROL: "CONTROL",
  SUPPORT: "SUPPORT",
});

export const CARD_TARGETS = Object.freeze({
  SELF: "SELF",
  ANY_DISTRICT: "ANY_DISTRICT",
  OWNED_DISTRICT: "OWNED_DISTRICT",
  OPPONENT_DISTRICT: "OPPONENT_DISTRICT",
});

export const ACTION_CARDS = Object.freeze([
  { id: "data-strike", name: "Data Strike", type: CARD_TYPES.ATTACK, cost: 1, description: "ลด Influence ของคู่แข่งใน District เป้าหมาย 2 IP", effect: { kind: "DAMAGE_IP", amount: 2 }, targetType: CARD_TARGETS.OPPONENT_DISTRICT, iconKey: "data-strike" },
  { id: "system-crash", name: "System Crash", type: CARD_TYPES.ATTACK, cost: 3, description: "โจมตีระบบหลักและลด Influence ของคู่แข่ง 4 IP", effect: { kind: "DAMAGE_IP", amount: 4 }, targetType: CARD_TARGETS.OPPONENT_DISTRICT, iconKey: "system-crash" },
  { id: "firewall-guard", name: "Firewall Guard", type: CARD_TYPES.DEFENSE, cost: 1, description: "ป้องกันการลด IP จากการ์ดโจมตีครั้งถัดไปใน District", effect: { kind: "FIREWALL_SHIELD", uses: 1 }, targetType: CARD_TARGETS.ANY_DISTRICT, iconKey: "firewall" },
  { id: "secure-backup", name: "Secure Backup", type: CARD_TYPES.DEFENSE, cost: 2, description: "เพิ่ม Influence ของตนเองใน District ที่ครอบครอง 2 IP", effect: { kind: "ADD_IP", amount: 2 }, targetType: CARD_TARGETS.OWNED_DISTRICT, iconKey: "backup" },
  { id: "lag-pulse", name: "Lag Pulse", type: CARD_TYPES.CONTROL, cost: 2, description: "บล็อกการเพิ่ม IP ครั้งถัดไปของคู่แข่งในเขตเป้าหมาย", effect: { kind: "INFLUENCE_BLOCK", uses: 1 }, targetType: CARD_TARGETS.ANY_DISTRICT, iconKey: "lag" },
  { id: "access-denied", name: "Access Denied", type: CARD_TYPES.CONTROL, cost: 2, description: "บล็อกการ์ด ATTACK ของคู่แข่งต่อ District จนจบเทิร์นถัดไป", effect: { kind: "ATTACK_BLOCK" }, targetType: CARD_TARGETS.ANY_DISTRICT, iconKey: "access-denied" },
  { id: "patch-update", name: "Patch Update", type: CARD_TYPES.SUPPORT, cost: 1, description: "เพิ่ม Influence ของตนเองใน District เป้าหมาย 2 IP", effect: { kind: "ADD_IP", amount: 2 }, targetType: CARD_TARGETS.ANY_DISTRICT, iconKey: "patch" },
  { id: "energy-boost", name: "Energy Boost", type: CARD_TYPES.SUPPORT, cost: 0, description: "เพิ่ม Energy ของผู้ใช้ 2 โดยไม่เกินค่าสูงสุด", effect: { kind: "ADD_ENERGY", amount: 2 }, targetType: CARD_TARGETS.SELF, iconKey: "energy" },
]);

export const ACTION_CARD_BY_ID = Object.freeze(Object.fromEntries(ACTION_CARDS.map((card) => [card.id, card])));

