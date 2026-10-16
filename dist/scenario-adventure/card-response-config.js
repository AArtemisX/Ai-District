// ROUND 2 compatibility metadata only. This does not change the production
// Action Card effects used by Legacy District Battle.
export const RESPONSE_METADATA_STATUS = "FRIDAY_DEMO_ROUND_1";

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

// Explicit context rules for the existing eight stories only; rarity is irrelevant.
export const DEMO_CONTEXT_RULES = Object.freeze({
  "model-version-drift": {effective:["data-strike","secure-backup"],partial:["patch-update","lag-pulse"],reason:"ต้องตรวจผลหลังเปลี่ยนโมเดล เก็บรุ่นและค่ามาตรฐานเพื่อย้อนกลับได้ คะแนนทดสอบรุ่นก่อนยืนยันรุ่นใหม่ไม่ได้"},
  "poisoned-feedback": {effective:["data-strike","firewall-guard"],partial:["secure-backup","access-denied"],reason:"ต้องตรวจแหล่งและความผิดปกติของ feedback พร้อมแยกข้อมูลที่ถูกป้อนเพื่อบิดโมเดล ปริมาณโหวตมากไม่ได้รับประกันคุณภาพ"},
  "adversarial-visual-marker": {effective:["system-crash","data-strike"],partial:["lag-pulse","patch-update"],reason:"ต้องหยุดการทำงานที่เสี่ยงและทดสอบภาพรบกวนในสภาพจริง ความแม่นยำบนภาพสะอาดไม่พิสูจน์ความทนทาน"},
  "sensitive-inference": {effective:["firewall-guard","access-denied"],partial:["data-strike","lag-pulse"],reason:"ต้องประเมินการอนุมานข้อมูลอ่อนไหวจากกลุ่มขนาดเล็กและจำกัดการเผยแพร่ แม้รายงานไม่มีชื่อก็อาจเปิดเผยความลับได้"},

  "verify-ai-homework": {effective:["data-strike","lag-pulse"],partial:["energy-boost","secure-backup"],reason:"ต้องตรวจความถูกต้องและแหล่งที่มาก่อนใช้คำตอบ AI"},
  "fair-attendance-camera": {effective:["patch-update","lag-pulse"],partial:["data-strike","firewall-guard","secure-backup"],reason:"ต้องทบทวนความเป็นธรรมและแก้ผลตัดสินของระบบเช็กชื่อ ไม่ใช่ป้องกันข้อมูลเพียงอย่างเดียว"},
  "deepfake-rumor": {effective:["data-strike","system-crash"],partial:["energy-boost","access-denied","lag-pulse"],reason:"ต้องตรวจหลักฐานและหยุดการแพร่ข่าวปลอม การรายงานอย่างเดียวยังไม่ยืนยันข้อเท็จจริง"},
  "recommendation-bubble": {effective:["energy-boost"],partial:["data-strike","secure-backup","patch-update"],reason:"ต้องเปิดรับแหล่งข้อมูลหลากหลาย การตรวจหรือบันทึกข้อมูลอย่างเดียวยังไม่แก้ฟองข้อมูล"},
  "student-data-upload": {effective:["firewall-guard","access-denied"],partial:["secure-backup","lag-pulse"],reason:"ต้องลดข้อมูลส่วนบุคคลและตรวจสิทธิ/ความยินยอมก่อนอัปโหลด"},
  "ai-essay-grading": {effective:["patch-update","lag-pulse"],partial:["data-strike","secure-backup"],reason:"ต้องทบทวนเกณฑ์ให้เป็นธรรมและเปิดช่องอุทธรณ์คะแนนเรียงความ"},
  "generative-art-credit": {effective:["access-denied"],partial:["energy-boost","secure-backup","lag-pulse"],reason:"ต้องตรวจสิทธิการใช้งานและเครดิต การเปิดเผยหรือเก็บหลักฐานยังไม่ให้สิทธิใช้งานเอง"},
  "wellbeing-chatbot": {effective:["system-crash","lag-pulse"],partial:["firewall-guard","energy-boost"],reason:"ต้องหยุดการพึ่งพาคำตอบเสี่ยงและส่งต่อมนุษย์ที่รับผิดชอบ การรักษาความลับอย่างเดียวไม่พอ"},
  "fabricated-citations": {effective:["data-strike"],partial:["lag-pulse","secure-backup"],reason:"ต้องตรวจว่าเอกสารอ้างอิงมีอยู่จริงและรองรับข้อความ ไม่ใช่เชื่อรูปแบบบรรณานุกรมที่ดูถูกต้อง"},
  "voice-clone-fraud": {effective:["data-strike","system-crash"],partial:["firewall-guard","energy-boost"],reason:"ต้องหยุดธุรกรรมและยืนยันคำขอผ่านช่องทางอิสระ การรู้เสียงผู้พูดอย่างเดียวไม่พิสูจน์ตัวตน"},
  "prompt-injection-document": {effective:["firewall-guard","access-denied"],partial:["data-strike","system-crash"],reason:"เอกสารภายนอกเป็นข้อมูล ไม่ใช่คำสั่งที่อนุญาตให้ AI เปิดไฟล์ลับ ต้องจำกัดเครื่องมือและสิทธิ"},
  "training-consent": {effective:["access-denied","firewall-guard"],partial:["secure-backup","energy-boost"],reason:"สิทธิใช้ภาพในกิจกรรมไม่เท่ากับความยินยอมให้นำไปฝึกโมเดล ต้องตรวจวัตถุประสงค์และลดข้อมูล"},
  "retention-and-deletion": {effective:["access-denied","firewall-guard"],partial:["secure-backup","lag-pulse"],reason:"ต้องควบคุมอายุข้อมูลและยืนยันการลบรวมสำเนา การเก็บ audit log อย่างเดียวไม่ใช่การลบ"},
  "rural-data-coverage": {effective:["data-strike","patch-update"],partial:["energy-boost","lag-pulse"],reason:"ความแม่นยำรวมอาจซ่อนข้อผิดพลาดของข้อมูลพื้นที่ที่ไม่ครอบคลุม ต้องตรวจรายกลุ่มและปรับข้อมูล"},
  "accessibility-speech": {effective:["patch-update","lag-pulse"],partial:["data-strike","energy-boost"],reason:"การถอดเสียงผิดไม่ใช่หลักฐานว่าเรียนรู้ไม่ได้ ต้องมีช่องทางประเมินที่เข้าถึงได้และทบทวนโดยมนุษย์"},
  "appeal-explanation": {effective:["patch-update","lag-pulse"],partial:["secure-backup","energy-boost"],reason:"ผู้ถูกตัดสินต้องเข้าใจเหตุผลเฉพาะกรณีและอุทธรณ์ได้ การประกาศว่าใช้ AI ยังไม่ใช่คำอธิบาย"},
  "uncertainty-disclosure": {effective:["energy-boost","data-strike"],partial:["secure-backup","lag-pulse"],reason:"ต้องสื่อสารความไม่แน่นอนและข้อจำกัดของค่าคาดการณ์ ไม่แสดงตัวเลขเดียวเสมือนรับประกันผล"},
  "automation-override": {effective:["lag-pulse","system-crash"],partial:["secure-backup","patch-update"],reason:"มนุษย์ต้องมีอำนาจหยุดหรือแก้คำสั่งระบบจริง มิใช่เพียงกดยืนยันตาม AI ในงานที่กระทบความปลอดภัย"},
  "vendor-incident-accountability": {effective:["secure-backup","energy-boost"],partial:["system-crash","lag-pulse"],reason:"ต้องเก็บหลักฐาน แจ้งเหตุ และกำหนดผู้รับผิดชอบ ไม่ให้โรงเรียนกับผู้ขายโยนความรับผิดชอบกัน"},
  "procurement-governance": {effective:["data-strike","secure-backup"],partial:["access-denied","lag-pulse"],reason:"ก่อนจัดซื้อ AI ต้องตรวจการประเมินผล ข้อตกลงข้อมูล และแผนติดตาม/หยุดใช้ ไม่พึ่งเพียงคำโฆษณาผู้ขาย"},
});

