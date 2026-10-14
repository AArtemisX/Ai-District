// ROUND 2 compatibility metadata only. This does not change the production
// Action Card effects used by Legacy District Battle.
export const RESPONSE_METADATA_STATUS = "TEMPORARY_ROUND_2";

export const CARD_RESPONSE_METADATA = Object.freeze({
  "data-strike": Object.freeze({ tags: ["VERIFY", "AUDIT"], summary: "ใช้การวิเคราะห์ข้อมูลเพื่อค้นหาจุดที่ควรตรวจสอบ" }),
  "system-crash": Object.freeze({ tags: ["SAFETY", "ESCALATION"], summary: "หยุดระบบชั่วคราวเมื่อความเสี่ยงสูง" }),
  "firewall-guard": Object.freeze({ tags: ["PRIVACY", "SAFETY", "DATA_MINIMIZATION"], summary: "จำกัดการเข้าถึงและคุ้มครองข้อมูล" }),
  "secure-backup": Object.freeze({ tags: ["ACCOUNTABILITY", "AUDIT", "TRANSPARENCY"], summary: "เก็บหลักฐานสำหรับการตรวจสอบย้อนหลัง" }),
  "lag-pulse": Object.freeze({ tags: ["HUMAN_REVIEW", "VERIFY"], summary: "ชะลอการตัดสินใจเพื่อให้มนุษย์ตรวจสอบ" }),
  "access-denied": Object.freeze({ tags: ["CONSENT", "PRIVACY", "COPYRIGHT"], summary: "ระงับการใช้งานเมื่อยังไม่มีสิทธิหรือความยินยอม" }),
  "patch-update": Object.freeze({ tags: ["FAIRNESS", "AUDIT", "APPEAL"], summary: "ปรับกระบวนการและเปิดทางแก้ไขข้อผิดพลาด" }),
  "energy-boost": Object.freeze({ tags: ["DIVERSITY", "REPORT", "TRANSPARENCY"], summary: "ระดมทรัพยากรและสื่อสารกับผู้เกี่ยวข้อง" }),
});

export function cardResponseMetadata(cardId) {
  return CARD_RESPONSE_METADATA[cardId] || Object.freeze({ tags: [], summary: "ยังไม่มี Metadata สำหรับตอบสถานการณ์" });
}

