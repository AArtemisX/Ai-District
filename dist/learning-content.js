export const LEARNING_DISTRICTS = Object.freeze([
  { id: "academy", name: "AI Academy", kicker: "FOUNDATIONS", topic: "หลักคิด จริยธรรม และการตัดสินใจ", color: "#47bce7", soft: "#e4f8ff" },
  { id: "cloud", name: "Cloud Data", kicker: "DATA SYSTEMS", topic: "ข้อมูล ความเป็นส่วนตัว และความน่าเชื่อถือ", color: "#9b75e8", soft: "#f1eaff" },
  { id: "robot", name: "Robot Lab", kicker: "HUMAN + MACHINE", topic: "ระบบอัตโนมัติ ความปลอดภัย และมนุษย์กำกับ", color: "#f178aa", soft: "#ffebf3" },
  { id: "green", name: "Green AI", kicker: "IMPACT", topic: "ผลกระทบต่อสังคม บุคคล และสิ่งแวดล้อม", color: "#57c985", soft: "#e6f9ed" },
]);

const CODE_TO_DISTRICT = Object.freeze({ ethics_safety: "robot", ethics_reliability: "robot", ethics_privacy: "cloud", ethics_transparency: "academy", ethics_accountability: "academy", ethics_fairness: "academy", "ai-ethics-m6-01": "academy", impact_individual: "green", impact_society: "green", impact_environment: "green", impact_analysis: "cloud", impact_guidance: "robot" });
const CODE_TO_GRADE = Object.freeze({
  ethics_safety: 1,
  impact_individual: 1,
  ethics_privacy: 2,
  impact_society: 2,
  ethics_reliability: 3,
  impact_environment: 3,
  ethics_transparency: 4,
  impact_analysis: 4,
  ethics_accountability: 5,
  impact_guidance: 5,
  ethics_fairness: 6,
  "ai-ethics-m6-01": 6,
});
const LESSON_REWARD_PREVIEWS = Object.freeze({
  ethics_safety: "Secure Backup",
  impact_individual: "Data Strike",
  ethics_privacy: "Secure Backup",
  impact_society: "Data Strike",
  ethics_reliability: "Secure Backup",
  impact_environment: "Data Strike",
  ethics_transparency: "Secure Backup",
  impact_analysis: "Data Strike",
  ethics_accountability: "Secure Backup",
  impact_guidance: "Data Strike",
  ethics_fairness: "Secure Backup",
  "ai-ethics-m6-01": "Access Denied",
});

export function getDistrictForLesson(lesson) {
  const id = CODE_TO_DISTRICT[lesson.code] || LEARNING_DISTRICTS[lesson.unlock_order % LEARNING_DISTRICTS.length].id;
  return LEARNING_DISTRICTS.find((district) => district.id === id) || LEARNING_DISTRICTS[0];
}
export function lessonGrade(lesson) { return CODE_TO_GRADE[lesson.code] || 1; }
export function lessonRewardPreview(lesson) { return LESSON_REWARD_PREVIEWS[lesson.code] || "Action Card"; }
export function lessonDuration(lesson) { return Number(lesson.content?.duration) || (lesson.code === "ethics_fairness" ? 15 : 10); }
export function buildFoundationLesson(lesson) {
  const district = getDistrictForLesson(lesson);
  const scenario = lesson.content?.scenario || lesson.summary;
  const answer = lesson.content?.answer || "พิจารณาหลักฐาน ผลกระทบ และให้มนุษย์ร่วมรับผิดชอบ";
  return { lessonId: lesson.code, title: lesson.title, gradeLevel: `มัธยมศึกษาปีที่ ${lessonGrade(lesson)}`, topic: district.topic, estimatedDuration: lessonDuration(lesson), learningObjectives: [lesson.summary, "เชื่อมโยงแนวคิดกับสถานการณ์ใกล้ตัว"], scenes: [
    { id: "briefing", phase: "BRIEFING", title: "รับภารกิจ", type: "dialogue", speaker: "ARIA · ผู้ประสานงานภาคสนาม", body: lesson.summary, prompt: "เป้าหมายของคุณคือทำความเข้าใจปัญหา ก่อนเลือกแนวทางที่รับผิดชอบ", accent: district.color },
    { id: "context", phase: "EXPLORE", title: "สำรวจสถานการณ์", type: "knowledge", speaker: "แฟ้มข้อมูลเขต", body: scenario, prompt: "ลองแยกให้ออกว่าใครได้รับผลกระทบ และข้อมูลใดที่ยังขาด", accent: district.color },
    { id: "principle", phase: "EXPLAIN", title: "หลักคิดสำคัญ", type: "knowledge", speaker: "AI Academy", body: answer, prompt: "นี่คือฐานรากของ Lesson Player ส่วนภารกิจโต้ตอบเต็มรูปแบบจะเพิ่มใน Stage 2", accent: district.color },
    { id: "reflection", phase: "REFLECTION", title: "บันทึกก่อนออกจากภารกิจ", type: "reflection", speaker: "Mission Log", body: "เมื่อพบระบบ AI ที่ส่งผลต่อคน เราควรตรวจสอบหลักฐาน กลุ่มผู้ได้รับผลกระทบ ความโปร่งใส และบทบาทของมนุษย์", prompt: "ความคืบหน้าของคุณถูกบันทึกแล้ว คุณสามารถกลับมาเรียนต่อได้ทุกเมื่อ", accent: district.color },
  ] };
}
