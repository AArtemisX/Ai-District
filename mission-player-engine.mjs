function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function safeText(value, limit = 600) {
  return typeof value === "string" ? value.slice(0, limit) : "";
}

export function initialSimulationValues(scene) {
  return Object.fromEntries((scene.controls || []).map((control) => [control.id, control.initial]));
}

export function createMissionRuntime(mission, saved = {}) {
  const source = asObject(saved);
  const runtime = {
    dialogue: {}, evidence: {}, selectedEvidence: {}, evidenceQuestions: {}, simulation: {},
    decisions: {}, checks: {}, accepted: {}, openingChoices: {}, classifications: {}, reflections: {},
  };
  for (const scene of mission.scenes) {
    if (scene.dialogue) runtime.dialogue[scene.id] = Math.max(0, Math.min(Number(source.dialogue?.[scene.id]) || 0, scene.dialogue.length - 1));
    if (scene.openingChoices) {
      const valid = new Set(scene.openingChoices.map((item) => item.id));
      runtime.openingChoices[scene.id] = valid.has(source.openingChoices?.[scene.id]) ? source.openingChoices[scene.id] : null;
    }
    if (scene.statements) {
      const validIds = new Set(scene.statements.map((item) => item.id));
      runtime.classifications[scene.id] = Object.fromEntries(Object.entries(asObject(source.classifications?.[scene.id])).filter(([id, value]) => validIds.has(id) && ["FACT", "INTERPRETATION"].includes(value)));
    }
    if (scene.evidence) {
      const valid = new Set(scene.evidence.map((item) => item.id));
      runtime.evidence[scene.id] = [...new Set((source.evidence?.[scene.id] || []).filter((item) => valid.has(item)))];
      runtime.selectedEvidence[scene.id] = valid.has(source.selectedEvidence?.[scene.id]) ? source.selectedEvidence[scene.id] : null;
      runtime.evidenceQuestions[scene.id] = safeText(source.evidenceQuestions?.[scene.id]);
    }
    if (scene.controls) {
      const values = { ...initialSimulationValues(scene), ...asObject(source.simulation?.[scene.id]?.values) };
      runtime.simulation[scene.id] = {
        values,
        runCount: Math.max(0, Number(source.simulation?.[scene.id]?.runCount) || 0),
        history: Array.isArray(source.simulation?.[scene.id]?.history) ? source.simulation[scene.id].history.slice(-4) : [],
        reflection: safeText(source.simulation?.[scene.id]?.reflection),
      };
    }
    if (scene.options) {
      const valid = new Set(scene.options.map((item) => item.id));
      runtime.decisions[scene.id] = {
        selected: [...new Set((source.decisions?.[scene.id]?.selected || []).filter((item) => valid.has(item)))],
        submitted: Boolean(source.decisions?.[scene.id]?.submitted),
      };
    }
    if (scene.check) runtime.checks[scene.id] = { selected: source.checks?.[scene.id]?.selected || null, correct: Boolean(source.checks?.[scene.id]?.correct), attempts: Math.max(0, Number(source.checks?.[scene.id]?.attempts) || 0) };
    if (scene.requiresAcceptance) runtime.accepted[scene.id] = Boolean(source.accepted?.[scene.id]);
    if (scene.reflectionPrompt) runtime.reflections[scene.id] = safeText(source.reflections?.[scene.id], 1200);
  }
  return runtime;
}

export function evaluateSimulation(scene, values) {
  const model = scene.model;
  const coverage = Number(values.coverage) || 0;
  const quality = Number(values.quality) || 0;
  const oversight = model.oversightScores[values.oversight] ?? 0;
  const readiness = Math.round(coverage * model.coverageWeight + quality * model.qualityWeight + oversight * model.oversightWeight);
  const risk = readiness >= 80 ? "ต่ำ" : readiness >= 60 ? "ปานกลาง" : "สูง";
  const reasons = [];
  if (coverage < 70) reasons.push("ข้อมูลยังครอบคลุมผู้สมัครแต่ละกลุ่มไม่เพียงพอ");
  if (quality < 70) reasons.push("ข้อมูลอาจคลาดเคลื่อน ล้าสมัย หรือมีป้ายกำกับไม่สม่ำเสมอ");
  if (values.oversight === "none") reasons.push("ยังไม่มีมนุษย์ทบทวนกรณีเสี่ยง");
  if (!reasons.length) reasons.push("ลดความเสี่ยงในแบบจำลองได้ แต่ยังต้องตรวจผลจริง ความเป็นธรรม และข้อผิดพลาดของมนุษย์อย่างต่อเนื่อง");
  return { readiness, risk, reasons, educationalOnly: true };
}

export function evaluateDecision(scene, ids) {
  const selected = scene.options.filter((item) => ids.includes(item.id));
  const strong = selected.filter((item) => item.quality === 3).length;
  const harmful = selected.filter((item) => item.quality === 0).length;
  const allSelected = selected.length === scene.options.length;
  const level = !allSelected && strong >= 2 && !harmful ? "รอบด้าน" : strong >= 1 && !harmful ? "มีฐานคิดที่ดี" : "ควรทบทวนเพิ่มเติม";
  return {
    level,
    total: selected.reduce((sum, item) => sum + item.quality, 0),
    impacts: selected.map((item) => item.impact),
    remainingRisks: [...new Set(selected.flatMap((item) => item.remainingRisks || []))],
    selectedCount: selected.length,
    allSelected,
  };
}

export function evaluateKnowledgeCheck(scene, id) {
  const answer = scene.check.options.find((item) => item.id === id);
  return { correct: Boolean(answer?.correct), feedback: answer?.feedback || "เลือกคำตอบก่อน" };
}

export function classificationProgress(scene, answers = {}) {
  const answered = scene.statements.filter((item) => answers[item.id]).length;
  const correct = scene.statements.filter((item) => answers[item.id] === item.answer).length;
  return { answered, correct, total: scene.statements.length, complete: answered === scene.statements.length && correct === scene.statements.length };
}

export function resolveMissionSceneIndex(mission, progress, legacySceneIds = []) {
  const savedSceneId = progress?.scene_state?.sceneId;
  const bySavedId = mission.scenes.findIndex((scene) => scene.id === savedSceneId);
  if (bySavedId >= 0) return bySavedId;
  const numericIndex = Math.max(0, Number(progress?.scene_index) || 0);
  if ((Number(progress?.scene_state?.schemaVersion) || 0) < mission.schemaVersion && legacySceneIds[numericIndex]) {
    const legacyIndex = mission.scenes.findIndex((scene) => scene.id === legacySceneIds[numericIndex]);
    if (legacyIndex >= 0) return legacyIndex;
  }
  return Math.min(numericIndex, mission.scenes.length - 1);
}

export function sceneRequirement(scene, runtime) {
  if (scene.openingChoices && !runtime.openingChoices[scene.id]) return { ready: false, message: "เลือกจุดเริ่มต้นของการตรวจสอบก่อน" };
  if (scene.requiresAcceptance && !runtime.accepted[scene.id]) return { ready: false, message: "เปิดรายงานและกดรับภารกิจก่อน" };
  if (scene.statements) {
    const progress = classificationProgress(scene, runtime.classifications[scene.id]);
    if (!progress.complete) return { ready: false, message: `จำแนกถูกต้อง ${progress.correct}/${progress.total} ข้อ` };
  }
  if (scene.evidence) {
    const count = runtime.evidence[scene.id]?.length || 0;
    if (count < scene.requiredEvidence) return { ready: false, message: `ตรวจหลักฐาน ${count}/${scene.requiredEvidence} จุด` };
    if (scene.evidenceQuestionPrompt && (runtime.evidenceQuestions[scene.id] || "").trim().length < 8) return { ready: false, message: "บันทึกข้อสงสัยที่ต้องตรวจสอบต่อ" };
  }
  if (scene.controls) {
    const simulation = runtime.simulation[scene.id];
    const count = simulation?.runCount || 0;
    if (count < (scene.requiredRuns || 1)) return { ready: false, message: `ทดลองแล้ว ${count}/${scene.requiredRuns || 1} ครั้ง` };
    if (scene.simulationReflectionPrompt && (simulation?.reflection || "").trim().length < 8) return { ready: false, message: "ระบุสิ่งที่แบบจำลองยังตอบไม่ได้" };
  }
  if (scene.check && !runtime.checks[scene.id]?.correct) return { ready: false, message: "ตอบ Knowledge Check ให้ถูกต้องก่อน" };
  if (scene.options && !runtime.decisions[scene.id]?.submitted) return { ready: false, message: "เลือกและยืนยันแนวทางก่อน" };
  if (scene.reflectionPrompt && (runtime.reflections[scene.id] || "").trim().length < 20) return { ready: false, message: "เขียน Reflection อย่างน้อย 20 ตัวอักษร" };
  return { ready: true, message: "พร้อมไปต่อ" };
}
