import { getDistrictForLesson, lessonDuration, lessonGrade } from "./learning-content.js";

const CITY_SCENE = "assets/ai-district-login-bg.png";

export function buildMissionDemo(lesson) {
  const district = getDistrictForLesson(lesson);
  const scenario = lesson.content?.scenario || lesson.summary;
  const principle = lesson.content?.answer || "ตรวจสอบหลักฐาน ผลกระทบ และให้มนุษย์ร่วมรับผิดชอบ";
  return {
    schemaVersion: 1, missionId: `stage2-demo-${lesson.code}`, lessonId: lesson.code, demo: true,
    demoLabel: "STAGE 2 · COMPONENT DEMO", title: `ระบบภารกิจ: ${lesson.title}`,
    gradeLevel: `มัธยมศึกษาปีที่ ${lessonGrade(lesson)}`, topic: district.topic,
    estimatedDuration: lessonDuration(lesson), accent: district.color,
    scenes: [
      { id: "mission-intro", phase: "MISSION INTRO", type: "dialogue", title: "รับสัญญาณจากศูนย์ควบคุม", accent: district.color,
        dialogue: [
          { speaker: "ARIA", role: "ผู้ช่วยวิเคราะห์ AI", portrait: CITY_SCENE, portraitPosition: "59% 49%", text: `พบเหตุการณ์ตัวอย่างใน ${district.name} ภารกิจนี้ใช้สำหรับทดสอบระบบ Story Mission เท่านั้น` },
          { speaker: "KAI", role: "เจ้าหน้าที่ภาคสนาม", portrait: CITY_SCENE, portraitPosition: "30% 43%", text: scenario },
          { speaker: "ARIA", role: "ผู้ช่วยวิเคราะห์ AI", portrait: CITY_SCENE, portraitPosition: "59% 49%", text: "สำรวจหลักฐาน ทดลองปรับข้อมูล และเลือกแนวทางที่อธิบายเหตุผลได้" },
        ], prompt: "บทสนทนารองรับหลายช่วงและกลับมาที่ช่วงเดิมได้" },
      { id: "evidence-lab", phase: "INTERACTIVE EVIDENCE", type: "evidence", title: "สำรวจแฟ้มหลักฐาน",
        body: "เลือกจุดข้อมูลทั้งสามเพื่อดูว่าระบบ AI อาจมีข้อจำกัดตรงไหน", image: CITY_SCENE, accent: district.color, requiredEvidence: 3,
        evidence: [
          { id: "dataset", marker: "01", x: 29, y: 47, title: "ชุดข้อมูลฝึก", summary: "ข้อมูลบางกลุ่มปรากฏน้อยกว่ากลุ่มอื่น", insight: "ความครอบคลุมของข้อมูลส่งผลต่อรูปแบบที่ AI เรียนรู้" },
          { id: "metric", marker: "02", x: 58, y: 39, title: "รายงานผลแยกกลุ่ม", summary: "ค่าเฉลี่ยรวมดูดี แต่ผลลัพธ์ของแต่ละกลุ่มต่างกัน", insight: "ควรดูผลแยกกลุ่ม ไม่พิจารณาเฉพาะคะแนนรวม" },
          { id: "appeal", marker: "03", x: 73, y: 66, title: "บันทึกการทบทวน", summary: "ยังไม่มีช่องทางให้มนุษย์ตรวจสอบกรณีผิดปกติ", insight: "ระบบที่ส่งผลต่อคนควรมี Human Oversight และช่องทางแก้ไข" },
        ], prompt: "ต้องตรวจหลักฐานครบก่อนเข้าสู่การ์ดความรู้" },
      { id: "knowledge-brief", phase: "KNOWLEDGE CARD", type: "knowledge", title: "หลักคิดก่อนทดลอง",
        body: "การประเมินระบบ AI ต้องพิจารณาคุณภาพข้อมูล ผลกระทบต่อแต่ละกลุ่ม และกระบวนการกำกับดูแลร่วมกัน", accent: district.color, illustration: "DATA",
        keywords: ["Data Quality", "Fairness", "Human Oversight"], cards: [
          { title: "ข้อมูล", text: "ข้อมูลจำนวนมากไม่ได้หมายความว่าครอบคลุมทุกกลุ่ม" },
          { title: "การประเมิน", text: "คะแนนรวมอาจซ่อนความแตกต่างของผลลัพธ์รายกลุ่ม" },
          { title: "การกำกับ", text: principle },
        ], prompt: "ผู้เรียนย้อนกลับมาเปิดการ์ดนี้ได้ตลอดเวลา" },
      { id: "simulation-lab", phase: "SIMULATION", type: "simulation", title: "ทดลองปรับเงื่อนไขข้อมูล",
        body: "ปรับค่าตัวอย่างแล้วกดประมวลผล ผลลัพธ์นี้เป็นแบบจำลองเพื่อการเรียนรู้ ไม่ใช่ค่าความแม่นยำของโมเดลจริง", accent: district.color,
        controls: [
          { id: "coverage", type: "range", label: "ความครอบคลุมของกลุ่มข้อมูล", min: 20, max: 100, step: 10, initial: 50, unit: "%" },
          { id: "quality", type: "range", label: "คุณภาพการตรวจข้อมูล", min: 20, max: 100, step: 10, initial: 50, unit: "%" },
          { id: "oversight", type: "select", label: "การตรวจสอบโดยมนุษย์", initial: "periodic", options: [{ value: "none", label: "ไม่มี" }, { value: "periodic", label: "ตรวจเป็นระยะ" }, { value: "continuous", label: "ตรวจต่อเนื่อง" }] },
        ], model: { coverageWeight: 0.45, qualityWeight: 0.4, oversightScores: { none: 0, periodic: 55, continuous: 100 }, oversightWeight: 0.15 },
        prompt: "Engine ใช้กฎคงที่และอธิบายเหตุผลได้ ไม่มีการสุ่มค่า" },
      { id: "decision-room", phase: "DECISION MAKING", type: "decision", title: "เลือกแนวทางตอบสนอง",
        body: "เลือกได้มากกว่าหนึ่งแนวทาง เพราะปัญหา AI มักต้องใช้หลายมาตรการร่วมกัน", accent: district.color, minChoices: 1,
        options: [
          { id: "audit-data", label: "ตรวจความครอบคลุมของข้อมูล", quality: 3, impact: "ช่วยค้นหากลุ่มที่ข้อมูลขาดหรือไม่สมดุล" },
          { id: "group-metrics", label: "ประเมินผลแยกตามกลุ่ม", quality: 3, impact: "ทำให้เห็นความแตกต่างที่คะแนนรวมอาจซ่อนอยู่" },
          { id: "human-review", label: "เพิ่มการตรวจสอบโดยมนุษย์", quality: 3, impact: "ช่วยจัดการกรณีผิดปกติและเปิดโอกาสให้ทบทวน" },
          { id: "more-data-only", label: "เพิ่มข้อมูลอย่างเดียวแล้วเปิดใช้ทันที", quality: 1, impact: "ข้อมูลที่มากขึ้นอาจยังมีอคติ หากไม่ตรวจคุณภาพและผลกระทบ" },
        ], prompt: "หลายคำตอบเหมาะสมได้ ระบบประเมินจากเหตุผลรวม ไม่บังคับคำตอบเดียว" },
      { id: "mission-summary", phase: "MISSION SUMMARY", type: "summary", title: "เดโม่ระบบภารกิจเสร็จสมบูรณ์",
        body: "คุณได้ทดลอง Dialogue, Evidence, Knowledge, Simulation และ Decision ครบแล้ว เนื้อหาบทเรียน ม.6 ฉบับสมบูรณ์จะพัฒนาใน Stage 3", accent: district.color,
        takeaways: ["สำรวจหลักฐานก่อนสรุป", "ทดลองด้วยกฎที่อธิบายได้", "การตัดสินใจที่ดีอาจประกอบด้วยหลายมาตรการ"],
        prompt: "Stage 2 ไม่ทำเครื่องหมายเรียนจบ ไม่ให้รางวัล และไม่สร้าง Quiz ใหม่" },
    ],
  };
}
