/**
 * @typedef {"DEFENSE"|"ATTACK"|"SUPPORT"|"STRATEGY"|"SPECIAL"} ActionCardType
 * @typedef {"COMMON"|"RARE"|"EPIC"|"LEGENDARY"} ActionCardRarity
 * @typedef {"ACTIVE"|"DISABLED"|"DRAFT"} ActionCardStatus
 * @typedef {{kind:string, value?:number, duration?:number, note?:string}} ActionCardEffect
 * @typedef {{scope:string, rule:string}} ActionCardTarget
 * @typedef {{timing:string, requirement:string}} ActionCardActivationCondition
 * @typedef {{perTurn:number, perMatch:number|null}} ActionCardUsageLimit
 * @typedef {{src:string|null, alt:string, focalPoint?:string}} ActionCardArtwork
 * @typedef {{id:string,name:string,description:string,type:ActionCardType,rarity:ActionCardRarity,artwork:ActionCardArtwork,effect:ActionCardEffect,target:ActionCardTarget,activationCondition:ActionCardActivationCondition,usageLimit:ActionCardUsageLimit,status:ActionCardStatus,isPrototype:true}} ActionCardDefinition
 */

export const ACTION_CARD_TYPES = Object.freeze({ DEFENSE: "DEFENSE", ATTACK: "ATTACK", SUPPORT: "SUPPORT", STRATEGY: "STRATEGY", SPECIAL: "SPECIAL" });
export const ACTION_CARD_RARITIES = Object.freeze({ COMMON: "COMMON", RARE: "RARE", EPIC: "EPIC", LEGENDARY: "LEGENDARY" });
export const ACTION_CARD_STATUSES = Object.freeze({ ACTIVE: "ACTIVE", DISABLED: "DISABLED", DRAFT: "DRAFT" });

function prototypeCard(card) {
  return Object.freeze({ ...card, artwork: Object.freeze(card.artwork), effect: Object.freeze(card.effect), target: Object.freeze(card.target), activationCondition: Object.freeze(card.activationCondition), usageLimit: Object.freeze(card.usageLimit), isPrototype: true });
}

/** @type {ReadonlyArray<ActionCardDefinition>} */
export const ACTION_CARD_PROTOTYPES = Object.freeze([
  prototypeCard({ id: "prototype-privacy-shield", name: "Privacy Shield", description: "ป้องกันหรือลดผลกระทบจากสถานการณ์ที่เกี่ยวข้องกับการเปิดเผยข้อมูลส่วนบุคคล", type: "DEFENSE", rarity: "COMMON", artwork: { src: "assets/Luminous Shield for Private Data-1.png", alt: "โล่ข้อมูลส่วนบุคคลสีฟ้าไซเบอร์" }, effect: { kind: "PLACEHOLDER_SCENARIO_RESPONSE", note: "ข้อมูลต้นแบบ ยังไม่มีผลต่อ Gameplay" }, target: { scope: "PRIVACY_DATA_PROTECTION", rule: "สถานการณ์ด้าน Privacy และ Data Protection" }, activationCondition: { timing: "UNDEFINED", requirement: "รอกำหนดเงื่อนไขใช้งานฉบับจริง" }, usageLimit: { perTurn: 1, perMatch: null }, status: "ACTIVE" }),
  prototypeCard({ id: "prototype-firewall-guard", name: "Firewall Guard", description: "ช่วยลดความเสี่ยงจากภัยคุกคามทางระบบและการเข้าถึงที่ไม่ได้รับอนุญาต", type: "DEFENSE", rarity: "RARE", artwork: { src: "assets/Cyan Firewall Protecting a Luminous AI City-2.png", alt: "กำแพงไฟพลังงานล้อมรอบแกน AI" }, effect: { kind: "PLACEHOLDER_SCENARIO_RESPONSE", note: "ข้อมูลต้นแบบ ยังไม่มีผลต่อ Gameplay" }, target: { scope: "SECURITY_UNAUTHORIZED_ACCESS", rule: "สถานการณ์ด้าน Security และ Unauthorized Access" }, activationCondition: { timing: "UNDEFINED", requirement: "รอกำหนดเงื่อนไขใช้งานฉบับจริง" }, usageLimit: { perTurn: 1, perMatch: null }, status: "ACTIVE" }),
  prototypeCard({ id: "prototype-threat-shutdown", name: "Threat Shutdown", description: "หยุดหรือจำกัดการทำงานของระบบ AI ที่ก่อให้เกิดความเสี่ยง", type: "ATTACK", rarity: "COMMON", artwork: { src: "assets/Emergency Stop Powers Down AI Core-3.png", alt: "สวิตช์หยุดระบบอันตรายสีแดงส้ม" }, effect: { kind: "PLACEHOLDER_SCENARIO_RESPONSE", note: "รับมือภัยคุกคามในสถานการณ์ ไม่ใช่การโจมตีผู้เล่น" }, target: { scope: "UNSAFE_AI_OPERATIONS", rule: "สถานการณ์ด้าน Unsafe AI Operations" }, activationCondition: { timing: "UNDEFINED", requirement: "รอกำหนดเงื่อนไขใช้งานฉบับจริง" }, usageLimit: { perTurn: 1, perMatch: null }, status: "ACTIVE" }),
  prototypeCard({ id: "prototype-system-countermeasure", name: "System Countermeasure", description: "ตอบโต้ภัยคุกคามด้วยมาตรการที่เหมาะสมและลดการแพร่กระจายของผลกระทบ", type: "ATTACK", rarity: "RARE", artwork: { src: "assets/Radiant Circuit Intercepts Crimson Shards-4.png", alt: "วงจรตอบโต้เหตุการณ์ความปลอดภัย" }, effect: { kind: "PLACEHOLDER_SCENARIO_RESPONSE", note: "รับมือภัยคุกคามในสถานการณ์ ไม่ใช่การโจมตีผู้เล่น" }, target: { scope: "SECURITY_INCIDENTS", rule: "สถานการณ์ด้าน Security Incidents" }, activationCondition: { timing: "UNDEFINED", requirement: "รอกำหนดเงื่อนไขใช้งานฉบับจริง" }, usageLimit: { perTurn: 1, perMatch: null }, status: "ACTIVE" }),
  prototypeCard({ id: "prototype-recovery-protocol", name: "Recovery Protocol", description: "สนับสนุนการฟื้นฟูระบบ AI หลังเกิดข้อผิดพลาด", type: "SUPPORT", rarity: "COMMON", artwork: { src: "assets/Mint light core repair-5.png", alt: "หุ่นยนต์กำลังฟื้นฟูแกนระบบสีเขียวมิ้นต์" }, effect: { kind: "PLACEHOLDER_SCENARIO_RESPONSE", note: "ข้อมูลต้นแบบ ยังไม่มีผลต่อ Gameplay" }, target: { scope: "SYSTEM_RECOVERY", rule: "สถานการณ์ด้าน System Recovery" }, activationCondition: { timing: "UNDEFINED", requirement: "รอกำหนดเงื่อนไขใช้งานฉบับจริง" }, usageLimit: { perTurn: 1, perMatch: null }, status: "ACTIVE" }),
  prototypeCard({ id: "prototype-human-assistance", name: "Human Assistance", description: "ขอความช่วยเหลือจากมนุษย์เพื่อร่วมตรวจสอบและตัดสินใจในสถานการณ์ที่ AI มีข้อจำกัด", type: "SUPPORT", rarity: "RARE", artwork: { src: "assets/Human-AI teamwork at a holographic workstation-6.png", alt: "มนุษย์และผู้ช่วย AI ร่วมตรวจสอบข้อมูล" }, effect: { kind: "PLACEHOLDER_SCENARIO_RESPONSE", note: "ข้อมูลต้นแบบ ยังไม่มีผลต่อ Gameplay" }, target: { scope: "HUMAN_OVERSIGHT", rule: "สถานการณ์ด้าน Human Oversight" }, activationCondition: { timing: "UNDEFINED", requirement: "รอกำหนดเงื่อนไขใช้งานฉบับจริง" }, usageLimit: { perTurn: 1, perMatch: null }, status: "ACTIVE" }),
  prototypeCard({ id: "prototype-data-audit", name: "Data Audit", description: "ตรวจสอบคุณภาพและความเหมาะสมของข้อมูลที่ใช้ในระบบ AI", type: "STRATEGY", rarity: "COMMON", artwork: { src: "assets/Spotting the Odd Data Crystal-7.png", alt: "แว่นขยายตรวจชุดข้อมูลสีม่วงอินดิโก" }, effect: { kind: "PLACEHOLDER_SCENARIO_RESPONSE", note: "ข้อมูลต้นแบบ ยังไม่มีผลต่อ Gameplay" }, target: { scope: "DATA_BIAS_QUALITY", rule: "สถานการณ์ด้าน Data Bias และ Data Quality" }, activationCondition: { timing: "UNDEFINED", requirement: "รอกำหนดเงื่อนไขใช้งานฉบับจริง" }, usageLimit: { perTurn: 1, perMatch: null }, status: "ACTIVE" }),
  prototypeCard({ id: "prototype-explainability-insight", name: "Explainability Insight", description: "วิเคราะห์เหตุผลและความโปร่งใสของการตัดสินใจจาก AI", type: "STRATEGY", rarity: "RARE", artwork: { src: "assets/Transparent AI Brain with Glowing Pathways-8.png", alt: "โครงข่าย AI โปร่งใสพร้อมเส้นทางคำอธิบาย" }, effect: { kind: "PLACEHOLDER_SCENARIO_RESPONSE", note: "ข้อมูลต้นแบบ ยังไม่มีผลต่อ Gameplay" }, target: { scope: "EXPLAINABILITY_TRANSPARENCY", rule: "สถานการณ์ด้าน Explainability และ Transparency" }, activationCondition: { timing: "UNDEFINED", requirement: "รอกำหนดเงื่อนไขใช้งานฉบับจริง" }, usageLimit: { perTurn: 1, perMatch: null }, status: "ACTIVE" }),
  prototypeCard({ id: "prototype-ethical-override", name: "Ethical Override", description: "เสนอการแทรกแซงโดยมนุษย์เพื่อทบทวนการตัดสินใจของ AI เมื่อเกิดประเด็นด้านจริยธรรม", type: "SPECIAL", rarity: "EPIC", artwork: { src: "assets/Golden Balance Guiding a Purple AI Core-9.png", alt: "ตราสัญลักษณ์จริยธรรมสีทองและม่วง" }, effect: { kind: "PLACEHOLDER_SCENARIO_RESPONSE", note: "ข้อมูลต้นแบบ ยังไม่มีผลต่อ Gameplay" }, target: { scope: "AI_ETHICS_HUMAN_OVERSIGHT", rule: "สถานการณ์ด้าน AI Ethics และ Human Oversight" }, activationCondition: { timing: "UNDEFINED", requirement: "รอกำหนดเงื่อนไขใช้งานฉบับจริง" }, usageLimit: { perTurn: 1, perMatch: null }, status: "ACTIVE" }),
  prototypeCard({ id: "prototype-responsible-ai-protocol", name: "Responsible AI Protocol", description: "เสนอแนวทางกำกับดูแล AI อย่างรับผิดชอบ โดยพิจารณาความปลอดภัย ความเป็นธรรม และผลกระทบต่อผู้ใช้", type: "SPECIAL", rarity: "EPIC", artwork: { src: "assets/Golden Codex of Responsible AI-10.png", alt: "คัมภีร์กำกับดูแล AI สีทองล้อมด้วยวงแหวนม่วง" }, effect: { kind: "PLACEHOLDER_SCENARIO_RESPONSE", note: "ข้อมูลต้นแบบ ยังไม่มีผลต่อ Gameplay" }, target: { scope: "RESPONSIBLE_AI", rule: "สถานการณ์ด้าน Responsible AI" }, activationCondition: { timing: "UNDEFINED", requirement: "รอกำหนดเงื่อนไขใช้งานฉบับจริง" }, usageLimit: { perTurn: 1, perMatch: null }, status: "ACTIVE" }),
]);

const REQUIRED_FIELDS = Object.freeze(["id", "name", "description", "type", "rarity", "artwork", "effect", "target", "activationCondition", "usageLimit", "status"]);

export function validateActionCardDefinition(card) {
  const errors = [];
  if (!card || typeof card !== "object") return { valid: false, errors: ["CARD_REQUIRED"] };
  for (const field of REQUIRED_FIELDS) if (card[field] == null || card[field] === "") errors.push(`MISSING_${field.toUpperCase()}`);
  if (!Object.values(ACTION_CARD_TYPES).includes(card.type)) errors.push("INVALID_TYPE");
  if (!Object.values(ACTION_CARD_RARITIES).includes(card.rarity)) errors.push("INVALID_RARITY");
  if (!Object.values(ACTION_CARD_STATUSES).includes(card.status)) errors.push("INVALID_STATUS");
  if (!card.artwork?.alt) errors.push("ARTWORK_ALT_REQUIRED");
  if (!Number.isInteger(card.usageLimit?.perTurn) || card.usageLimit.perTurn < 0) errors.push("INVALID_USAGE_LIMIT");
  return { valid: errors.length === 0, errors };
}

