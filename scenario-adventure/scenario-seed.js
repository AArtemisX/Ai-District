import { AI_SCENARIOS } from "../map-3d/scenario-data.js";
import { DEFAULT_THEME_ID, SCENARIO_CATEGORIES } from "./theme-config.js";
import {DEMO_CONTEXT_RULES,CARD_RESPONSE_METADATA} from "./card-response-config.js";

export const SCENARIO_CONTENT_STATUS = Object.freeze({
  MOCK: "MOCK",
  DEMO_DRAFT: "DEMO_DRAFT",
  REVIEWED: "REVIEWED",
  PUBLISHED: "PUBLISHED",
});

const META_BY_ID = Object.freeze({
  "verify-ai-homework": { category: SCENARIO_CATEGORIES.AI_LITERACY, cardTags: ["VERIFY", "TRANSPARENCY", "HUMAN_REVIEW"] },
  "fair-attendance-camera": { category: SCENARIO_CATEGORIES.FAIRNESS, cardTags: ["FAIRNESS", "AUDIT", "HUMAN_REVIEW"] },
  "deepfake-rumor": { category: SCENARIO_CATEGORIES.AI_LITERACY, cardTags: ["VERIFY", "SAFETY", "REPORT"] },
  "recommendation-bubble": { category: SCENARIO_CATEGORIES.TRANSPARENCY, cardTags: ["TRANSPARENCY", "DIVERSITY", "VERIFY"] },
  "student-data-upload": { category: SCENARIO_CATEGORIES.PRIVACY, cardTags: ["PRIVACY", "DATA_MINIMIZATION", "CONSENT"] },
  "ai-essay-grading": { category: SCENARIO_CATEGORIES.FAIRNESS, cardTags: ["FAIRNESS", "AUDIT", "APPEAL"] },
  "generative-art-credit": { category: SCENARIO_CATEGORIES.ACCOUNTABILITY, cardTags: ["COPYRIGHT", "TRANSPARENCY", "CONSENT"] },
  "wellbeing-chatbot": { category: SCENARIO_CATEGORIES.SAFETY, cardTags: ["SAFETY", "ESCALATION", "HUMAN_REVIEW"] },
});

function configuredOutcomes(scenario) {
  return Object.freeze({
    matchedCard: Object.freeze({ responsePoints: 3, stability: 0, explanation: scenario.explanation }),
    partialCard: Object.freeze({ responsePoints: 1, stability: -1, explanation: "การตอบสนองช่วยลดความเสี่ยงได้บางส่วน แต่ยังเหลือผลกระทบที่ต้องติดตาม" }),
    basicResponse: Object.freeze({ responsePoints: 1, stability: -1, explanation: "Basic Response ทำให้เกมเดินต่อได้ แต่ไม่ครอบคลุมความเสี่ยงทั้งหมด" }),
    mismatchedCard: Object.freeze({ responsePoints: 0, stability: -2, explanation: "การ์ดไม่ตรงกับความเสี่ยงหลักของสถานการณ์" }),
  });
}

function configuredBasicResponse(scenario) {
  const response = scenario.choices?.find((choice) => choice.consequence?.quality === "GOOD") || scenario.choices?.[0];
  return Object.freeze({
    responseId: `basic-${scenario.scenarioId}`,
    label: response.label,
    description: response.consequence.explanation,
    impact: response.consequence.impact,
    explanation: response.consequence.explanation,
  });
}

// ROUND 1 uses reviewed legacy scenario text as clearly labelled local mock seed.
// No live AI generation and no Production database write occurs here.
const ORIGINAL_SCENARIOS = Object.freeze(AI_SCENARIOS.map((scenario) => {
  const metadata = META_BY_ID[scenario.scenarioId];
  return Object.freeze({
    scenarioId: `adventure-${scenario.scenarioId}`,
    contentIdentity:`ai-context:${scenario.scenarioId}`,
    compatibilityRules:DEMO_CONTEXT_RULES[scenario.scenarioId],
    themeId: DEFAULT_THEME_ID,
    category: metadata.category,
    difficulty: scenario.difficulty,
    title: scenario.title,
    description: scenario.description,
    availableResponses: Object.freeze(["CARD", "BASIC"]),
    cardTags: Object.freeze([...metadata.cardTags]),
    basicResponse: configuredBasicResponse(scenario),
    outcomes: configuredOutcomes(scenario),
    explanation: scenario.explanation,
    status: SCENARIO_CONTENT_STATUS.MOCK,
  });
}));

// Hypothetical contexts authored for the demo; NOT content-review approved.
// A change of person/place must retain this context's contentIdentity.
function draft({id,category,title,description,basic,explanation,topics}) {
  const scenarioId=`adventure-${id}`;
  return Object.freeze({scenarioId,contentIdentity:`ai-context:${id}`,themeId:DEFAULT_THEME_ID,category,difficulty:"ปานกลาง",title,description,
    topics:Object.freeze(topics),availableResponses:Object.freeze(["CARD","BASIC"]),cardTags:Object.freeze([...new Set([...DEMO_CONTEXT_RULES[id].effective,...DEMO_CONTEXT_RULES[id].partial].flatMap(cardId=>CARD_RESPONSE_METADATA[cardId].tags))]),
    compatibilityRules:DEMO_CONTEXT_RULES[id],
    basicResponse:Object.freeze({responseId:`basic-${id}`,label:basic,description:explanation,impact:"เริ่มลดความเสี่ยง แต่ต้องติดตามมาตรการเฉพาะให้ครบ",explanation}),
    outcomes:configuredOutcomes({explanation}),explanation,status:SCENARIO_CONTENT_STATUS.DEMO_DRAFT});
}

const DRAFT_SCENARIOS = [
  {id:"model-version-drift",category:"ACCOUNTABILITY",title:"โมเดลรุ่นใหม่กับผลที่เปลี่ยนไป",description:"บริการจัดตารางสมมติอัปเดตโมเดลโดยไม่เก็บหมายเลขรุ่น หลังอัปเดตเกิดข้อผิดพลาดเพิ่มขึ้น แต่ทีมยังใช้ผลทดสอบรุ่นก่อนและไม่มีทางย้อนกลับ",basic:"พักการขยายรุ่นใหม่และตรวจผลเทียบค่ามาตรฐาน",explanation:"การกำกับ AI ต้องติดตามหลังอัปเดตและระบุรุ่นได้ พร้อมเกณฑ์หยุดหรือย้อนกลับเมื่อผลเปลี่ยน ไม่อ้างผลทดสอบเก่าแทนรุ่นใหม่",topics:["Governance","Accountability"]},
  {id:"poisoned-feedback",category:"AI_LITERACY",title:"เสียงโหวตที่ป้อนเพื่อบิดโมเดล",description:"ผู้ดูแลระบบคัดแยกข้อความสมมติพบ feedback จำนวนมากจากบัญชีที่สร้างพร้อมกัน โหวตให้ข้อความหลอกลวงเป็นข้อความปลอดภัย ระบบกำลังจะใช้ feedback เหล่านี้ฝึกโมเดลรอบใหม่",basic:"แยก feedback ผิดปกติและตรวจที่มาก่อนฝึกโมเดล",explanation:"ข้อมูลฝึกอาจถูกจงใจปนเปื้อน ต้องตรวจที่มา รูปแบบประสานกัน และคุณภาพข้อมูล ไม่ถือว่าข้อมูลมากคือเสียงที่เชื่อถือได้เสมอ",topics:["Security","AI Literacy","Data Bias"]},
  {id:"adversarial-visual-marker",category:"SAFETY",title:"ลายรบกวนที่ทำให้หุ่นยนต์มองผิด",description:"หุ่นยนต์ขนของในคลังจำลองผ่านการทดสอบภาพทั่วไป แต่เมื่อติดลายรบกวนบนป้ายหยุด ระบบมองเป็นป้ายให้เดินต่อ ทีมกำลังจะเปิดใช้ในพื้นที่ที่มีคนเดิน",basic:"ระงับการเดินอัตโนมัติและทดสอบภาพรบกวนอย่างควบคุม",explanation:"ระบบมองภาพต้องทนต่อสภาพที่คาดได้รวมถึง adversarial input ต้องมีมาตรการหยุดที่ไม่พึ่งการรับรู้ AI ทางเดียวและทดสอบก่อนใช้จริง",topics:["Safety","Security","Human Oversight"]},
  {id:"sensitive-inference",category:"PRIVACY",title:"รายงานรวมที่บอกความลับของคนกลุ่มเล็ก",description:"รายงานสุขภาวะของชมรมสมมติไม่ใส่ชื่อ แต่แสดงสถิติแยกกลุ่มที่มีสมาชิกเพียงคนเดียว ผู้ที่รู้จำนวนสมาชิกจึงอนุมานข้อมูลอ่อนไหวได้จากรายงาน AI",basic:"พักการเผยแพร่และรวมกลุ่มให้ไม่เปิดเผยข้อมูลรายคน",explanation:"ข้อมูลสรุปยังอาจเปิดเผยข้อมูลอ่อนไหวผ่านการอนุมาน ต้องตรวจขนาดกลุ่ม การเชื่อมโยงกับข้อมูลอื่น และจำกัดรายละเอียดก่อนเผยแพร่",topics:["Privacy","Governance"]},

  {id:"fabricated-citations",category:"AI_LITERACY",title:"บรรณานุกรมที่ค้นไม่พบ",description:"ทีมรายงานสมมติได้รับบทสรุปพร้อมชื่อวารสารและ DOI จาก AI แต่เปิดลิงก์แล้วไม่พบเอกสาร ทีมจะส่งรายงานโดยเชื่อรายการอ้างอิงหรือไม่?",basic:"พักรายการที่ตรวจไม่ได้และค้นเอกสารต้นฉบับ",explanation:"รูปแบบอ้างอิงที่สมจริงไม่ยืนยันว่าแหล่งข้อมูลมีอยู่ ต้องตรวจทั้งตัวเอกสารและว่าข้อความอ้างสอดคล้องกัน",topics:["AI Literacy","Misinformation"]},
  {id:"voice-clone-fraud",category:"SAFETY",title:"เสียงคุ้นเคยกับคำขอโอนเงิน",description:"ชมรมสมมติได้รับสายเสียงเหมือนผู้ดูแล ขอให้โอนเงินด่วนไปบัญชีใหม่พร้อมห้ามถามคนอื่น ยังไม่มีหลักฐานอิสระว่าคนโทรเป็นผู้ดูแลจริง",basic:"หยุดโอนและโทรกลับช่องทางเดิมที่ยืนยันไว้",explanation:"เสียงอาจสังเคราะห์ได้ ความเร่งด่วนไม่ใช่การยืนยันตัวตน ต้องตรวจคำขอผ่านช่องทางอิสระก่อนธุรกรรม",topics:["Security","Misinformation"]},
  {id:"prompt-injection-document",category:"PRIVACY",title:"คำสั่งลับในเอกสารประชุม",description:"ผู้ช่วย AI กำลังสรุปเอกสารตัวอย่างจากภายนอก ภายในมีข้อความให้ส่งไฟล์ภายในทั้งหมดไปเว็บไซต์หนึ่ง ผู้ช่วยมีสิทธิอ่านไฟล์หลายโฟลเดอร์",basic:"ระงับการส่งไฟล์และจำกัดสิทธิเครื่องมือก่อนสรุป",explanation:"ข้อมูลจากเอกสารไม่ใช่คำสั่งจากเจ้าของ ต้องแยกคำสั่งกับข้อมูลและจำกัดสิทธิเข้าถึงเพื่อป้องกันข้อมูลรั่ว",topics:["Security","Privacy"]},
  {id:"training-consent",category:"PRIVACY",title:"ภาพกิจกรรมกับการฝึกโมเดล",description:"โรงเรียนสมมติมีภาพกิจกรรมที่ได้รับอนุญาตให้ลงข่าว ผู้ขาย AI ขอภาพชุดเดียวกันเพื่อฝึกโมเดลจดจำใบหน้า แบบอนุญาตเดิมไม่กล่าวถึงการฝึกโมเดล",basic:"พักการส่งภาพและตรวจขอบเขตความยินยอมใหม่",explanation:"ความยินยอมมีขอบเขตตามวัตถุประสงค์ การอนุญาตเผยแพร่ภาพไม่ให้สิทธิฝึกโมเดลโดยอัตโนมัติ และต้องลดข้อมูลที่ไม่จำเป็น",topics:["Privacy","Governance"]},
  {id:"retention-and-deletion",category:"PRIVACY",title:"แชตเก่าที่ยังอยู่ในสำเนา",description:"บริการติว AI สมมติเก็บบทสนทนานานเกินช่วงที่แจ้งไว้ แม้ผู้ใช้ลบบัญชี ผู้ขายยืนยันว่าฐานหลักลบแล้วแต่สำเนาสำรองและชุดวิเคราะห์ยังมีข้อมูล",basic:"หยุดนำข้อมูลเก่าไปใช้และตรวจการลบทุกสำเนา",explanation:"การลบบัญชีไม่เท่ากับลบข้อมูลทุกชุด ต้องกำหนดอายุข้อมูลและยืนยันการลบตามขอบเขตที่แจ้ง ไม่เก็บไว้โดยไม่มีเหตุผล",topics:["Privacy","Accountability"]},
  {id:"rural-data-coverage",category:"FAIRNESS",title:"ความแม่นยำสูงที่ไม่ครอบคลุมทุกพื้นที่",description:"แบบจำลองวางแผนทรัพยากรของเมืองสมมติมีความแม่นยำรวมสูง แต่ชุดทดสอบแทบไม่มีพื้นที่ห่างไกล เมื่อทดลองแยกกลุ่มกลับผิดบ่อยในพื้นที่นั้น",basic:"ทดสอบแยกพื้นที่และทบทวนข้อมูลก่อนขยายระบบ",explanation:"Data Bias อาจถูกซ่อนด้วยค่าเฉลี่ย ต้องตรวจความครอบคลุมและผลกระทบรายกลุ่ม แล้วปรับข้อมูล/กระบวนการให้เหมาะสม",topics:["Data Bias","Fairness"]},
  {id:"accessibility-speech",category:"FAIRNESS",title:"คะแนนจากการถอดเสียงที่ฟังไม่ครบ",description:"ระบบประเมินงานนำเสนอสมมติให้คะแนนต่ำเมื่อเครื่องมือถอดเสียงอ่านสำเนียงหรือเสียงพูดบางรูปแบบไม่ได้ ทั้งที่ผู้เรียนอธิบายเนื้อหาครบ",basic:"ให้ผู้ประเมินทบทวนและเปิดช่องทางนำเสนออื่น",explanation:"ข้อจำกัดของเครื่องมือไม่ใช่ความสามารถของผู้เรียน ต้องออกแบบการประเมินที่เข้าถึงได้และไม่ผลักภาระความผิดพลาดให้ผู้ใช้",topics:["Fairness","Human Oversight"]},
  {id:"appeal-explanation",category:"TRANSPARENCY",title:"ผลตัดสินที่บอกเพียงว่า AI แนะนำ",description:"ระบบจัดสรรพื้นที่ชมรมสมมติปฏิเสธคำขอและส่งข้อความว่า AI แนะนำให้ปฏิเสธ ไม่มีปัจจัยสำคัญหรือช่องทางขอทบทวน ผู้ขอจึงตรวจความผิดพลาดไม่ได้",basic:"ขอเหตุผลเฉพาะกรณีและช่องทางอุทธรณ์จากผู้รับผิดชอบ",explanation:"Transparency ต้องทำให้เข้าใจข้อจำกัดและ Explainability ต้องอธิบายเหตุผลที่เกี่ยวข้อง พร้อม Human Oversight ที่แก้ผลตัดสินได้",topics:["Transparency","Explainability","Human Oversight"]},
  {id:"uncertainty-disclosure",category:"TRANSPARENCY",title:"ยอดคาดการณ์ที่ดูเหมือนรับประกัน",description:"AI คาดการณ์จำนวนผู้มางานสมมติเป็นตัวเลขเดียว ทีมใช้ตัวเลขนั้นสั่งอุปกรณ์ทั้งหมดโดยไม่เห็นช่วงความไม่แน่นอนหรือสมมติฐาน และข้อมูลปีนี้ต่างจากปีฝึกโมเดล",basic:"ขอช่วงความไม่แน่นอนและเปรียบเทียบหลายแผน",explanation:"การคาดการณ์ไม่ใช่คำรับประกัน ต้องสื่อสารสมมติฐาน ความไม่แน่นอน และข้อจำกัดข้อมูลเพื่อให้คนตัดสินใจได้เหมาะสม",topics:["AI Literacy","Transparency","Explainability"]},
  {id:"automation-override",category:"SAFETY",title:"ผู้ควบคุมที่หยุดเครื่องไม่ได้",description:"ระบบอัตโนมัติในห้องทดลองสมมติยังสั่งเดินเครื่องเมื่อเซนเซอร์ให้ค่าขัดกัน ผู้ควบคุมมีปุ่มยืนยันคำสั่งแต่ไม่มีสิทธิหยุดหรือแก้คำสั่ง AI",basic:"หยุดการทำงานเสี่ยงและส่งต่อผู้มีอำนาจควบคุม",explanation:"Human Oversight ต้องมีอำนาจจริง เครื่องหมายว่ามีคนกดยืนยันไม่พอเมื่อระบบกระทบความปลอดภัย ต้องมีทางหยุดและทบทวน",topics:["Safety","Human Oversight"]},
  {id:"vendor-incident-accountability",category:"ACCOUNTABILITY",title:"เหตุผิดพลาดที่ไม่มีใครรับผิดชอบ",description:"ระบบประกาศผล AI สมมติส่งข้อมูลผิดจนผู้ใช้เสียโอกาส ฝ่ายใช้งานบอกให้ถามผู้ขาย ผู้ขายบอกว่าเป็นการตั้งค่าของฝ่ายใช้งาน ไม่มีผู้รับเรื่องหรือบันทึกเหตุ",basic:"รวบรวมหลักฐานและตั้งผู้รับผิดชอบการแก้เหตุ",explanation:"Accountability ต้องกำหนดหน้าที่ ช่องทางรายงานและแก้ไขให้ตรวจสอบได้ การแบ่งงานกับผู้ขายไม่ทำให้ความรับผิดชอบหายไป",topics:["Accountability","Governance"]},
  {id:"procurement-governance",category:"ACCOUNTABILITY",title:"สัญญา AI ที่ไม่มีแผนตรวจหลังซื้อ",description:"คณะจัดซื้อสมมติกำลังเลือก AI จากคำโฆษณาความแม่นยำ แต่ยังไม่กำหนดการทดสอบในบริบทจริง ข้อตกลงใช้ข้อมูล ผู้ติดตามผล หรือเงื่อนไขหยุดใช้เมื่อเกิดปัญหา",basic:"ชะลอการจัดซื้อจนมีเกณฑ์ประเมินและแผนกำกับ",explanation:"Governance ครอบคลุมก่อนและหลังใช้งาน ต้องกำหนดเกณฑ์ หลักฐาน ขอบเขตข้อมูล และผู้รับผิดชอบติดตาม ไม่ใช่ซื้อแล้วปล่อยให้ AI ดูแลตัวเอง",topics:["Governance","Accountability","Data Bias"]},
].map(draft);

export const SCENARIO_ADVENTURE_SEED = Object.freeze([...ORIGINAL_SCENARIOS,...DRAFT_SCENARIOS]);

