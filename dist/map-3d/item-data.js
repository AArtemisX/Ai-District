export const ITEM_TARGETS = Object.freeze({
  SELF: "SELF",
  ANY_DISTRICT: "ANY_DISTRICT",
  OWNED_DISTRICT: "OWNED_DISTRICT",
});

export const ITEMS = Object.freeze([
  { id: "repair-kit", name: "Repair Kit", description: "เพิ่ม Influence +1 ให้ District ที่ตนครอบครอง", effect: { kind: "ADD_IP", amount: 1 }, targetType: ITEM_TARGETS.OWNED_DISTRICT, iconKey: "repair" },
  { id: "energy-cell", name: "Energy Cell", description: "ฟื้นฟู Energy +2 โดยไม่เกินค่าสูงสุด", effect: { kind: "ADD_ENERGY", amount: 2 }, targetType: ITEM_TARGETS.SELF, iconKey: "battery" },
  { id: "scanner-lens", name: "Scanner Lens", description: "ตรวจสอบ IP และสถานะป้องกันของ District เป้าหมาย", effect: { kind: "SCAN_DISTRICT" }, targetType: ITEM_TARGETS.ANY_DISTRICT, iconKey: "scanner" },
  { id: "speed-chip", name: "Speed Chip", description: "เพิ่มจำนวนก้าวเดินครั้งถัดไป +1", effect: { kind: "SPEED_BOOST", amount: 1, uses: 1 }, targetType: ITEM_TARGETS.SELF, iconKey: "speed" },
  { id: "shield-module", name: "Shield Module", description: "ลดผลการโจมตี IP ครั้งถัดไป 2", effect: { kind: "SHIELD_MODULE", amount: 2, uses: 1 }, targetType: ITEM_TARGETS.ANY_DISTRICT, iconKey: "shield" },
  { id: "lucky-cache", name: "Lucky Cache", description: "สุ่มได้รับ Energy 1–3", effect: { kind: "RANDOM_ENERGY", min: 1, max: 3 }, targetType: ITEM_TARGETS.SELF, iconKey: "cache" },
]);

export const ITEM_BY_ID = Object.freeze(Object.fromEntries(ITEMS.map((item) => [item.id, item])));

