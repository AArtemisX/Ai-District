import { AI_SCENARIOS } from "../map-3d/scenario-data.js";
import { DEFAULT_THEME_ID, SCENARIO_CATEGORIES } from "./theme-config.js";

export const SCENARIO_CONTENT_STATUS = Object.freeze({
  MOCK: "MOCK",
  REVIEWED: "REVIEWED",
  PUBLISHED: "PUBLISHED",
  FALLBACK: "FALLBACK",
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
    matchedCard: Object.freeze({ responsePoints: 3, stability: 1, explanation: scenario.explanation }),
    partialCard: Object.freeze({ responsePoints: 1, stability: 0, explanation: "การตอบสนองช่วยลดความเสี่ยงได้บางส่วน แต่ยังเหลือผลกระทบที่ต้องติดตาม" }),
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
export const SCENARIO_ADVENTURE_SEED = Object.freeze(AI_SCENARIOS.map((scenario) => {
  const metadata = META_BY_ID[scenario.scenarioId];
  return Object.freeze({
    scenarioId: `adventure-${scenario.scenarioId}`,
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

export const FALLBACK_SCENARIO_TEMPLATE = Object.freeze({
  scenarioId: "adventure-fallback",
  themeId: DEFAULT_THEME_ID,
  category: SCENARIO_CATEGORIES.AI_LITERACY,
  difficulty: "พื้นฐาน",
  title: "ระบบตรวจพบเหตุการณ์ใหม่",
  description: "ข้อมูลของเหตุการณ์เฉพาะหมดแล้ว ให้ใช้กระบวนการพื้นฐาน: หยุด ตรวจสอบแหล่งที่มา และขอให้มนุษย์ทบทวนก่อนตัดสินใจ",
  availableResponses: Object.freeze(["CARD", "BASIC"]),
  cardTags: Object.freeze(["VERIFY", "HUMAN_REVIEW"]),
  basicResponse: Object.freeze({
    responseId: "basic-fallback",
    label: "หยุดการดำเนินการ ตรวจสอบข้อมูล และขอให้มนุษย์ทบทวน",
    description: "ใช้ขั้นตอนพื้นฐานที่ปลอดภัยเมื่อยังไม่มีข้อมูลเฉพาะเพียงพอ",
    impact: "ชะลอความเสี่ยงและเปิดทางให้ตรวจสอบก่อนตัดสินใจ",
    explanation: "เมื่อข้อมูลไม่พอ การหยุด ตรวจสอบ และส่งต่อให้ผู้รับผิดชอบเป็นทางเลือกที่ปลอดภัยกว่าการเดา",
  }),
  outcomes: Object.freeze({
    matchedCard: Object.freeze({ responsePoints: 2, stability: 1, explanation: "การตรวจสอบและให้มนุษย์ร่วมรับผิดชอบช่วยควบคุมความเสี่ยง" }),
    partialCard: Object.freeze({ responsePoints: 1, stability: 0, explanation: "ลดความเสี่ยงได้บางส่วน" }),
    basicResponse: Object.freeze({ responsePoints: 1, stability: -1, explanation: "ใช้แนวทางพื้นฐานเพื่อให้เกมดำเนินต่ออย่างปลอดภัย" }),
    mismatchedCard: Object.freeze({ responsePoints: 0, stability: -1, explanation: "การตอบสนองยังไม่ตรงกับความเสี่ยง" }),
  }),
  explanation: "Fallback ใช้ข้อความที่กำหนดไว้ล่วงหน้าและสร้าง Instance ID ใหม่ จึงไม่วน Scenario ID เดิม",
  status: SCENARIO_CONTENT_STATUS.FALLBACK,
});
