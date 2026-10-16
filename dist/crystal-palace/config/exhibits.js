// Crystal Palace exhibits as data. Phase 2: display text only — no unlocks, stamps or rewards are
// granted or implied here. `lessonCode` only names the lesson a later phase will link to.

export const EXHIBIT_KIND = Object.freeze({ LESSON: "lesson", INFO: "info" });

const exhibit = (definition) => Object.freeze({ ...definition, points: Object.freeze(definition.points || []) });

export const EXHIBITS = Object.freeze([
  // Grand Entrance + Passport corner (south transept, spawn)
  exhibit({ id: "entrance-welcome", zone: "entrance", kind: "info", x: 3.6, z: 17.4, title: "ยินดีต้อนรับสู่ Crystal Palace", summary: "อาคารกระจกแห่งนี้ได้แรงบันดาลใจจาก Crystal Palace ของ Joseph Paxton ในงาน Great Exhibition ที่ไฮด์ปาร์ก ปี 1851 — เดินสำรวจแต่ละโซนเพื่อรู้จักโลกของ AI", points: ["ฝั่งตะวันตก: หอจริยธรรม AI", "ฝั่งตะวันออก: ศาลาผลกระทบของ AI", "ทิศเหนือ: หอจดหมายเหตุคอลเลกชัน"] }),
  exhibit({ id: "passport-desk", zone: "entrance", kind: "info", panel: "passport", x: -3.6, z: 17.4, title: "มุมพาสปอร์ต AI", summary: "พาสปอร์ตแสดงตราประทับจากบทเรียนในหอจริยธรรมและศาลาผลกระทบที่คุณเรียนจบจริง อ่านจากความก้าวหน้าในบัญชีของคุณเท่านั้น", points: ["มุมนี้ไม่ประทับตราหรือมอบรางวัลเอง"] }),

  // Central Atrium
  exhibit({ id: "crystal-fountain", zone: "atrium", kind: "info", x: 0, z: 0, obstacle: false, interactRadius: 4.2, focus: Object.freeze({ distance: 10, height: 6.4, lookY: 2.4 }), title: "น้ำพุคริสตัล", summary: "น้ำพุแก้วกลางโถงเป็นสัญลักษณ์ของงานปี 1851 ที่นี่เป็นจุดศูนย์กลาง — เดินออกจากตรงนี้ไปยังทุกปีกของอาคาร", points: ["ต้นเอล์มสูงในโถงกลางสะท้อนต้นไม้จริงที่ Paxton สร้างหลังคาโค้งครอบไว้"] }),

  // Ethics Gallery (west wing)
  exhibit({ id: "ethics-safety", zone: "ethics", kind: "lesson", lessonCode: "ethics_safety", x: -12, z: -8, title: "ความปลอดภัย (Safety)", summary: "AI ที่ดีต้องไม่ก่ออันตรายต่อผู้คน ต้องมีการทดสอบ ป้องกันความเสี่ยง และหยุดได้เมื่อเกิดปัญหา", points: ["ประเมินความเสี่ยงก่อนใช้งานจริง", "มีปุ่มหยุดหรือช่องทางให้มนุษย์เข้าแทรก"] }),
  exhibit({ id: "ethics-reliability", zone: "ethics", kind: "lesson", lessonCode: "ethics_reliability", x: -20, z: -8, title: "ความน่าเชื่อถือ (Reliability)", summary: "AI ควรทำงานได้สม่ำเสมอและคาดเดาได้ ไม่ใช่ถูกบ้างผิดบ้างโดยไม่มีใครรู้", points: ["ทดสอบกับข้อมูลหลากหลาย", "ตรวจสอบผลลัพธ์อย่างต่อเนื่อง"] }),
  exhibit({ id: "ethics-privacy", zone: "ethics", kind: "lesson", lessonCode: "ethics_privacy", x: -28, z: -8, title: "ความเป็นส่วนตัว (Privacy)", summary: "ข้อมูลส่วนตัวต้องได้รับการปกป้อง เก็บเท่าที่จำเป็น และใช้ตามที่เจ้าของข้อมูลยินยอม", points: ["เก็บข้อมูลให้น้อยที่สุด", "ขออนุญาตก่อนใช้ข้อมูล"] }),
  exhibit({ id: "ethics-transparency", zone: "ethics", kind: "lesson", lessonCode: "ethics_transparency", x: -12, z: 8, title: "ความโปร่งใส (Transparency)", summary: "ผู้ใช้ควรรู้ว่ากำลังคุยหรือใช้งาน AI และเข้าใจได้ว่า AI ตัดสินใจอย่างไรในระดับที่เหมาะสม", points: ["บอกให้ชัดว่าเป็น AI", "อธิบายเหตุผลของผลลัพธ์ได้"] }),
  exhibit({ id: "ethics-accountability", zone: "ethics", kind: "lesson", lessonCode: "ethics_accountability", x: -20, z: 8, title: "ความรับผิดชอบ (Accountability)", summary: "ต้องมีคนรับผิดชอบเมื่อ AI ทำผิดพลาด AI ไม่ใช่ข้ออ้างในการโยนความผิด", points: ["กำหนดผู้รับผิดชอบที่ชัดเจน", "มีช่องทางร้องเรียนและแก้ไข"] }),
  exhibit({ id: "ethics-fairness", zone: "ethics", kind: "lesson", lessonCode: "ethics_fairness", x: -28, z: 8, title: "ความเป็นธรรม (Fairness)", summary: "AI ไม่ควรเลือกปฏิบัติหรือให้ผลไม่เท่าเทียมกับคนบางกลุ่มเพราะข้อมูลที่ลำเอียง", points: ["ตรวจหาอคติในข้อมูล", "เปรียบเทียบผลลัพธ์ระหว่างกลุ่มคน"] }),
  exhibit({ id: "ethics-mission-m6", zone: "ethics", kind: "lesson", lessonCode: "ai-ethics-m6-01", x: -29.4, z: 0, title: "ภารกิจจริยธรรม M6", summary: "รวมหลักจริยธรรมทั้งหกมาใช้กับสถานการณ์จริง ลองคิดว่าคุณจะตัดสินใจอย่างไรเมื่อหลักการขัดกัน", points: ["ภารกิจนี้อยู่ในหน้าบทเรียนเดิม", "ห้องจัดแสดงนี้ยังไม่บันทึกความก้าวหน้า"] }),

  // Impact Pavilion (east wing)
  exhibit({ id: "impact-individual", zone: "impact", kind: "lesson", lessonCode: "impact_individual", x: 12, z: -8, title: "ผลกระทบต่อบุคคล", summary: "AI เปลี่ยนชีวิตประจำวันของแต่ละคน ทั้งการเรียน การทำงาน และการตัดสินใจ — มีทั้งข้อดีและสิ่งที่ต้องระวัง", points: ["ใช้ AI เป็นผู้ช่วย ไม่ใช่ผู้ตัดสินแทนทั้งหมด"] }),
  exhibit({ id: "impact-society", zone: "impact", kind: "lesson", lessonCode: "impact_society", x: 20, z: -8, title: "ผลกระทบต่อสังคม", summary: "เมื่อคนจำนวนมากใช้ AI สังคมก็เปลี่ยน ทั้งอาชีพ ข่าวสาร และความเหลื่อมล้ำในการเข้าถึงเทคโนโลยี", points: ["คิดถึงคนที่ได้และเสียประโยชน์"] }),
  exhibit({ id: "impact-environment", zone: "impact", kind: "lesson", lessonCode: "impact_environment", x: 28, z: -8, title: "ผลกระทบต่อสิ่งแวดล้อม", summary: "การฝึกและใช้งาน AI ใช้พลังงานและทรัพยากร แต่ AI ก็ช่วยแก้ปัญหาสิ่งแวดล้อมได้เช่นกัน", points: ["ใช้อย่างคุ้มค่า", "ชั่งน้ำหนักประโยชน์กับต้นทุน"] }),
  exhibit({ id: "impact-analysis", zone: "impact", kind: "lesson", lessonCode: "impact_analysis", x: 12, z: 8, title: "วิเคราะห์ผลกระทบ", summary: "ก่อนใช้ AI ลองถามว่าใครได้รับผลกระทบ ทางบวกหรือลบ ระยะสั้นหรือระยะยาว", points: ["มองหลายมุม", "ใช้หลักฐานประกอบการตัดสินใจ"] }),
  exhibit({ id: "impact-guidance", zone: "impact", kind: "lesson", lessonCode: "impact_guidance", x: 20, z: 8, title: "แนวทางการใช้ AI", summary: "สรุปแนวทางใช้ AI อย่างรับผิดชอบ: ตรวจสอบข้อมูล เคารพผู้อื่น และรู้ขีดจำกัดของ AI", points: ["ตรวจสอบก่อนเชื่อ", "ให้เครดิตและไม่ละเมิดผู้อื่น"] }),

  // Collection Archive (north transept)
  exhibit({ id: "archive-cards", zone: "archive", kind: "info", panel: "archive", x: -3, z: -19, title: "ตู้การ์ดแอ็กชัน", summary: "การ์ดที่คุณปลดล็อกแล้วแขวนเป็นภาพในกรอบ ส่วนการ์ดที่ยังไม่ได้เป็นเงาปริศนาพร้อมคำใบ้ว่าต้องผ่าน Quiz บทเรียนไหน ห้องนี้ไม่ปลดล็อกการ์ดเอง", points: ["ดูและจัดการ์ดได้ที่คลังการ์ด"], link: Object.freeze({ href: "card-inventory.html", label: "เปิดคลังการ์ด" }) }),
  exhibit({ id: "archive-characters", zone: "archive", kind: "info", x: 3, z: -19, title: "หอภาพตัวละคร", summary: "ตัวละครของ AI District แต่ละคนมีเรื่องราวของตัวเอง บางตัวจะปลดล็อกผ่าน Story Mission ในอนาคต", points: ["เลือกตัวละครได้ที่หน้าเลือกตัวละคร"], link: Object.freeze({ href: "character-selection.html", label: "เลือกตัวละคร" }) }),
  exhibit({ id: "archive-1851", zone: "archive", kind: "info", x: 0, z: -22.2, title: "พิมพ์เขียวปี 1851", summary: "Crystal Palace ต้นฉบับสร้างจากเหล็กหล่อและกระจกแบบโมดูลาร์ ประกอบเสร็จในไม่กี่เดือน มีหลังคาโค้งตรงกลางเพียงหลังเดียวครอบต้นเอล์ม และหลังคาแบบสันและร่อง (ridge-and-furrow) ทั้งหลัง", points: ["ทุกเสาและคานยึดตามระยะโมดูล 24 ฟุต", "อาคารปี 1854 ที่ซิเดนแฮมเป็นอีกหลังหนึ่ง"] }),
]);

export const EXHIBIT_BY_ID = Object.freeze(Object.fromEntries(EXHIBITS.map((item) => [item.id, item])));

export const REQUIRED_LESSON_CODES = Object.freeze([
  "ethics_safety", "ethics_reliability", "ethics_privacy", "ethics_transparency", "ethics_accountability", "ethics_fairness", "ai-ethics-m6-01",
  "impact_individual", "impact_society", "impact_environment", "impact_analysis", "impact_guidance",
]);

export const STAND_RADIUS = .9;

export function exhibitInteractRadius(item, fallback) {
  return item.interactRadius ?? fallback;
}
