const CITY = "assets/ai-district-login-bg.png";

const CAST = Object.freeze([
  { characterId: "alexander", speaker: "Alexander", role: "ผู้ประสานเหตุเร่งด่วน" },
  { characterId: "mamasan", speaker: "MAMASan", role: "ผู้ดูแลผลกระทบต่อผู้คน" },
  { characterId: "milo", speaker: "Milo", role: "ผู้ตรวจสอบข้อมูล" },
]);

const dialogue = (characterId, text) => {
  const character = CAST.find((item) => item.characterId === characterId);
  return { ...character, text };
};

export function buildM6Mission(lesson) {
  return {
    schemaVersion: 3,
    missionId: "ai-ethics-m6-01",
    lessonId: lesson.code,
    demo: false,
    demoLabel: "MISSION STORY 01 · ม.6",
    title: "เมืองที่ AI ตัดสินผิดพลาด",
    gradeLevel: "มัธยมศึกษาปีที่ 6",
    topic: "AI Bias · Fairness · Human Oversight",
    estimatedDuration: 18,
    accent: "#7b75e8",
    objectives: [
      "อธิบายว่า AI Bias อาจเกิดจากข้อมูลที่ไม่ครอบคลุม",
      "วิเคราะห์ความเป็นธรรมโดยอ้างอิงหลักฐาน",
      "เสนอ Transparency, Explainability และ Human Oversight",
    ],
    finalQuiz: {
      usesExistingFlow: true,
      totalQuestions: 10,
      passingScore: 8,
      rewardCardId: "access-denied",
      characterUnlock: false,
    },
    scenes: [
      {
        id: "opening",
        phase: "OPENING · SMART ACADEMY ALERT",
        type: "dialogue",
        title: "สัญญาณเตือนจาก Smart Academy",
        accent: "#58c8eb",
        environmentLabel: "SMART ACADEMY",
        cast: CAST,
        dialogue: [
          dialogue("alexander", "ถ้ามีคนเสียโอกาสจริง เราต้องรู้ก่อนว่าใครได้รับผลกระทบ และระบบกำลังตัดสินใจต่อหรือเปล่า"),
          dialogue("mamasan", "ฟังคนที่ยื่นเรื่องด้วยนะ ผลลัพธ์ในตารางอาจไม่บอกความรู้สึกหรือบริบททั้งหมด"),
          dialogue("milo", "อย่าเพิ่งสรุปว่า AI ลำเอียงจากตัวเลขอย่างเดียว เรามาตรวจข้อมูลและขั้นตอนกัน"),
        ],
        openingChoices: [
          { id: "summary", label: "อ่านผลสรุป", feedback: "เริ่มจากภาพรวม แล้วตรวจว่าตัวเลขนี้อธิบายผู้ได้รับผลกระทบได้แค่ไหน" },
          { id: "complaint", label: "ฟังคำร้องเรียน", feedback: "เริ่มจากเสียงของผู้ได้รับผลกระทบ แล้วนำข้อกังวลไปตรวจเทียบกับหลักฐาน" },
          { id: "data-source", label: "ตรวจที่มาข้อมูล", feedback: "เริ่มจากต้นทางข้อมูล แล้วตรวจว่าข้อมูลครอบคลุมผู้สมัครหลากหลายบริบทหรือไม่" },
        ],
        prompt: "ฟังทีมสำรวจและเลือกจุดเริ่มต้นหนึ่งทาง ทุกทางนำไปสู่การตรวจหลักฐานที่ครบถ้วน",
      },
      {
        id: "incident",
        phase: "SCENE 1 · INCIDENT REPORT",
        type: "classification",
        title: "รายงานเหตุการณ์",
        accent: "#58c8eb",
        cast: CAST,
        dialogue: [
          dialogue("mamasan", "รายงานนี้บอกว่าอะไรเกิดขึ้น แต่ยังไม่ได้บอกว่าเพราะอะไร"),
          dialogue("alexander", "แยกสิ่งที่ยืนยันได้ออกจากข้อสันนิษฐานก่อน เราจะได้จัดการความเสี่ยงโดยไม่กล่าวหาใครเร็วเกินไป"),
          dialogue("milo", "เมื่อแยกข้อเท็จจริงแล้ว เราค่อยตั้งสมมติฐานและหาหลักฐานมาทดสอบ"),
        ],
        report: {
          title: "รายงานเหตุการณ์ ADU-061",
          facts: ["ระบบ AI แนะนำรายชื่อผู้สมัครทุนให้คณะกรรมการ", "มีคำร้องเรียนจากกลุ่มที่มีข้อมูลย้อนหลังในชุดฝึกน้อยกว่า"],
        },
        statements: [
          { id: "complaint-exists", text: "มีคำร้องเรียนเกี่ยวกับผลการคัดเลือกทุน", answer: "FACT", explanation: "เป็นเหตุการณ์ที่ปรากฏในรายงาน" },
          { id: "limited-history", text: "ผู้สมัครบางกลุ่มมีข้อมูลย้อนหลังในชุดฝึกน้อยกว่า", answer: "FACT", explanation: "เป็นข้อมูลที่ตรวจสอบจากรายงานและชุดข้อมูลได้" },
          { id: "intentional-discrimination", text: "AI จงใจเลือกปฏิบัติต่อผู้สมัคร", answer: "INTERPRETATION", explanation: "AI ไม่มีเจตนาแบบมนุษย์ และหลักฐานขณะนี้ยังไม่ยืนยันสาเหตุ" },
          { id: "secret-edit", text: "เจ้าหน้าที่แก้ผลลับ ๆ ก่อนประกาศ", answer: "INTERPRETATION", explanation: "ยังไม่มีหลักฐานรองรับข้อสันนิษฐานนี้" },
        ],
        knowledge: {
          title: "ข้อเท็จจริงไม่เท่ากับคำอธิบายสาเหตุ",
          text: "ความแตกต่างของผลลัพธ์เป็นสัญญาณให้ตรวจสอบ แต่ยังไม่พิสูจน์ว่าเกิดจากข้อมูล เกณฑ์ อัลกอริทึม หรือกระบวนการมนุษย์ส่วนใด",
        },
        prompt: "จำแนกข้อความทุกข้อเป็น FACT หรือ INTERPRETATION ให้ถูกต้อง",
      },
      {
        id: "evidence",
        phase: "SCENE 2 · EVIDENCE BOARD",
        type: "evidence",
        title: "กระดานหลักฐาน",
        body: "สำรวจข้อมูลจำลองอย่างน้อย 2 ชิ้น แล้วบันทึกข้อสงสัยที่ควรตรวจต่อก่อนสรุปสาเหตุ",
        image: CITY,
        cast: CAST,
        dialogue: [
          dialogue("milo", "เรามีข้อมูล 3 อย่าง: สัดส่วนข้อมูลฝึก เกณฑ์คะแนน และบันทึกการตรวจทานโดยคน"),
          dialogue("alexander", "ถ้าพบความเสี่ยงกับผู้สมัครรุ่นนี้ เราควรระงับการใช้ผลอัตโนมัติชั่วคราวไหม?"),
          dialogue("mamasan", "ไม่ว่าจะเลือกทางไหน คนที่ได้รับผลกระทบควรเข้าถึงคำอธิบายและช่องทางทบทวนได้"),
        ],
        requiredEvidence: 2,
        evidenceQuestionPrompt: "เขียนข้อสงสัยหนึ่งข้อที่ต้องตรวจสอบต่อ",
        evidence: [
          { id: "a", marker: "A", x: 28, y: 48, title: "สัดส่วนข้อมูลฝึก", summary: "กลุ่มพื้นที่ห่างไกลมี 12% ในชุดฝึก แต่มี 31% ในผู้สมัครปัจจุบัน", insight: "ความไม่ครอบคลุมอาจทำให้โมเดลเรียนรู้บางกลุ่มได้ไม่ดี" },
          { id: "b", marker: "B", x: 58, y: 38, title: "เกณฑ์คะแนน", summary: "ระบบใช้จำนวนกิจกรรมนอกห้องเรียนเป็นสัญญาณความพร้อม", insight: "ตัวแปรที่ดูเป็นกลางอาจสะท้อนโอกาสที่ไม่เท่ากัน" },
          { id: "c", marker: "C", x: 74, y: 66, title: "บันทึกการตรวจทาน", summary: "ไม่มีเหตุผลรายกรณี และมนุษย์ตรวจเพียง 2% ของใบสมัคร", insight: "การอธิบายและช่องทางทบทวนช่วยรักษาสิทธิผู้สมัคร" },
        ],
        check: {
          question: "หลักฐานทำให้สรุปอะไรได้เหมาะสมที่สุด?",
          options: [
            { id: "e1", label: "ระบบเลือกปฏิบัติแน่นอน", correct: false, feedback: "เร็วเกินไป หลักฐานชี้ความเสี่ยงแต่ยังต้องทดสอบสาเหตุ" },
            { id: "e2", label: "มีความเสี่ยงที่ต้องตรวจข้อมูล เกณฑ์ และผลรายกลุ่ม", correct: true, feedback: "ถูกต้อง การตรวจสอบแยกสัญญาณออกจากข้อสรุป" },
            { id: "e3", label: "คะแนนรวมดีจึงไม่มีปัญหา", correct: false, feedback: "คะแนนรวมอาจซ่อนความแตกต่างรายกลุ่ม" },
          ],
        },
        prompt: "ตรวจอย่างน้อย 2 หลักฐาน บันทึกข้อสงสัย และตอบ Knowledge Check",
      },
      {
        id: "simulation",
        phase: "SCENE 3 · DATA SIMULATION",
        type: "simulation",
        title: "ห้องทดลองข้อมูล",
        body: "เปรียบเทียบอย่างน้อย 2 รอบด้วยข้อมูลสมมติเพื่อการเรียนรู้ ไม่ใช่ข้อมูลนักเรียนจริงหรือผลการทดลองจริง",
        cast: CAST,
        dialogue: [
          dialogue("milo", "ลองดูสิว่าผลเปลี่ยนแค่ไหนเมื่อชุดข้อมูลเปลี่ยน แต่จำไว้ว่าเพิ่มข้อมูลไม่ได้แปลว่ายุติธรรมโดยอัตโนมัติ"),
          dialogue("mamasan", "หลังเห็นตัวเลข อย่าลืมถามว่าผลนี้กระทบใคร และใครยังไม่ได้ถูกมองเห็น"),
          dialogue("alexander", "ผลจำลองช่วยชี้ความเสี่ยง ไม่ใช่คำสั่งให้เปิดหรือปิดระบบทันที"),
        ],
        requiredRuns: 2,
        simulationReflectionPrompt: "หลังเปรียบเทียบแล้ว มีอะไรที่เรายังไม่รู้จากแบบจำลองนี้?",
        controls: [
          { id: "coverage", label: "ความครอบคลุมข้อมูล", type: "range", min: 20, max: 100, step: 10, initial: 40, unit: "%" },
          { id: "quality", label: "คุณภาพและความเป็นปัจจุบัน", type: "range", min: 20, max: 100, step: 10, initial: 50, unit: "%" },
          { id: "oversight", label: "การทบทวนโดยมนุษย์", type: "select", initial: "periodic", options: [{ value: "none", label: "ไม่มี" }, { value: "periodic", label: "ตรวจเป็นระยะ" }, { value: "continuous", label: "ตรวจกรณีเสี่ยงทุกครั้ง" }] },
        ],
        presets: [
          { id: "legacy", label: "A · บริบทเดียวเป็นส่วนใหญ่", values: { coverage: 40, quality: 50, oversight: "none" } },
          { id: "more", label: "B · เพิ่มความครอบคลุม", values: { coverage: 90, quality: 60, oversight: "periodic" } },
          { id: "responsible", label: "C · ตรวจคุณภาพและผล", values: { coverage: 90, quality: 90, oversight: "continuous" } },
        ],
        model: { coverageWeight: .38, qualityWeight: .42, oversightScores: { none: 0, periodic: 55, continuous: 100 }, oversightWeight: .2 },
        check: {
          question: "เหตุใดเพิ่มข้อมูลมากอย่างเดียวจึงอาจไม่ลดอคติ?",
          options: [
            { id: "s1", label: "ข้อมูลมากทำให้ AI ช้าลงเสมอ", correct: false, feedback: "ความเร็วไม่ใช่ประเด็นหลักของความเป็นธรรม" },
            { id: "s2", label: "ข้อมูลซ้ำ ล้าสมัย หรือไม่ครอบคลุมยังถ่ายทอดอคติเดิม", correct: true, feedback: "ถูกต้อง ปริมาณต้องมาพร้อมคุณภาพ การตรวจผล และการกำกับดูแล" },
            { id: "s3", label: "มนุษย์ต้องตัดสินแทน AI ทุกกรณี", correct: false, feedback: "Human Oversight สำคัญ แต่การมีมนุษย์ไม่ได้รับประกันว่าจะไม่มีข้อผิดพลาด" },
          ],
        },
        prompt: "เปรียบเทียบ 2 รอบ ระบุสิ่งที่ยังไม่รู้ และตอบ Knowledge Check",
      },
      {
        id: "decision",
        phase: "SCENE 4 · DECISION ROOM",
        type: "decision",
        title: "ห้องตัดสินใจ",
        body: "เลือกมาตรการที่ทำงานร่วมกัน แล้วพิจารณาทั้งผลระยะสั้น ระยะยาว ผู้เกี่ยวข้อง และข้อมูลที่ยังต้องตรวจ",
        cast: CAST,
        dialogue: [
          dialogue("alexander", "เราต้องป้องกันผลกระทบที่เกิดอยู่"),
          dialogue("mamasan", "แล้วคนที่ไม่ได้ทุนจะขอคำอธิบายหรืออุทธรณ์ได้อย่างไร?"),
          dialogue("milo", "และต้องตรวจทั้งข้อมูล เกณฑ์ตัดสิน และผลของระบบก่อนเปิดใช้เต็มรูปแบบ"),
        ],
        minChoices: 1,
        options: [
          { id: "audit", label: "ตรวจชุดข้อมูลและผลแยกกลุ่ม", quality: 3, impact: "ช่วยระบุจุดเสี่ยงและแก้สาเหตุที่ตรวจพบ", remainingRisks: ["ต้องเลือกตัวชี้วัด Fairness ให้เหมาะกับบริบท"] },
          { id: "explain", label: "แจ้งเกณฑ์อย่างเข้าใจง่ายและเปิดอุทธรณ์", quality: 3, impact: "เพิ่ม Explainability และสิทธิขอทบทวน", remainingRisks: ["Transparency อย่างเดียวไม่รับประกัน Fairness"] },
          { id: "oversight", label: "ให้มนุษย์ตรวจทานกรณีเสี่ยง", quality: 3, impact: "เพิ่มผู้รับผิดชอบและโอกาสแก้ไขผล", remainingRisks: ["ผู้ตรวจเองอาจมีอคติหรือข้อมูลไม่ครบ"] },
          { id: "hide", label: "ซ่อนข้อมูลกลุ่มแล้วใช้ระบบเดิม", quality: 0, impact: "ตัวแปรอื่นยังอาจเป็นตัวแทนของกลุ่ม", remainingRisks: ["ความเหลื่อมล้ำอาจตรวจพบยากขึ้น"] },
        ],
        check: {
          question: "เหตุใด Responsible AI จึงมักต้องใช้หลายมาตรการร่วมกัน?",
          options: [
            { id: "d1", label: "ความเสี่ยงเกิดได้หลายจุดตลอดวงจรระบบ", correct: true, feedback: "ถูกต้อง แต่ละมาตรการลดความเสี่ยงคนละด้านและยังต้องติดตามผล" },
            { id: "d2", label: "เลือกทุกมาตรการแล้วไม่ต้องติดตามผล", correct: false, feedback: "ยังต้องติดตามและปรับปรุงต่อเนื่อง" },
            { id: "d3", label: "AI ไม่มีวันทำงานได้", correct: false, feedback: "AI ใช้งานได้เมื่อกำกับตามระดับความเสี่ยงและพร้อมแก้ไข" },
          ],
        },
        prompt: "เลือกมาตรการ อ่านข้อดี/ข้อจำกัด และตอบ Knowledge Check",
      },
      {
        id: "reflection",
        phase: "SCENE 5 · REFLECTION & LEARNING SUMMARY",
        type: "reflection",
        title: "ทบทวนภารกิจ",
        body: "AI ช่วยตัดสินใจได้ แต่ผู้พัฒนาและผู้ใช้งานยังต้องรับผิดชอบต่อข้อมูล การออกแบบ ผลลัพธ์ และช่องทางอุทธรณ์",
        cast: CAST,
        dialogue: [
          dialogue("mamasan", "บางครั้งระบบมีตัวเลขที่ดูมั่นใจ แต่คนได้รับผลกระทบจริง"),
          dialogue("milo", "ข้อสรุปที่ดีต้องมีหลักฐาน และยอมรับสิ่งที่เรายังไม่รู้"),
          dialogue("alexander", "การตัดสินใจที่รับผิดชอบไม่ใช่เลือกเร็วที่สุด แต่ต้องพร้อมตรวจทานและแก้ไข"),
        ],
        reflectionPrompt: "ถ้าคุณเป็นผู้ดูแลระบบ จะป้องกันไม่ให้เกิดปัญหาซ้ำอย่างไร?",
        takeaways: [
          "ความลำเอียงอาจเกิดจากข้อมูล เกณฑ์ การออกแบบ และบริบทการใช้",
          "Transparency ไม่เท่ากับ Fairness โดยอัตโนมัติ",
          "Human Oversight สำคัญ แต่ผู้ตรวจที่เป็นมนุษย์ก็อาจผิดพลาดได้",
          "ผู้ได้รับผลกระทบควรได้รับคำอธิบายและมีช่องทางอุทธรณ์",
        ],
        prompt: "บันทึกแนวทางป้องกันที่ตรวจสอบได้และเปิดโอกาสให้แก้ไขผล",
      },
      {
        id: "final-quiz",
        phase: "SCENE 6 · FINAL QUIZ & REWARD",
        type: "summary",
        title: "พร้อมตรวจสอบความเข้าใจ",
        body: "แบบทดสอบและรางวัลใช้ระบบเดิม: 10 ข้อ ผ่าน 8/10 และให้สิทธิ์การ์ด Access Denied ผ่าน Reward RPC เมื่อผ่านเกณฑ์",
        quizReady: true,
        takeaways: [
          "AI Bias — ตรวจหลายสาเหตุโดยไม่สรุปเร็วเกินหลักฐาน",
          "Data Bias — ตรวจความครอบคลุม คุณภาพ และความเป็นปัจจุบัน",
          "Algorithmic Fairness — พิจารณาผลรายกลุ่มและบริบท",
          "Transparency & Explainability — อธิบายปัจจัย ข้อจำกัด และเปิดทางทบทวน",
          "Human Oversight — มีผู้รับผิดชอบ ตรวจสอบ และแก้ไขได้",
          "Mission 01 ไม่ปลดล็อกตัวละคร Locked",
        ],
        prompt: "เริ่ม Final Quiz ผ่านระบบเดิมเมื่อพร้อม",
      },
    ],
  };
}
