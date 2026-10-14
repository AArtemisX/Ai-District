import { StoryCharacterPortrait } from "./characters/StoryCharacterPortrait.js";
import { classificationProgress } from "./mission-player-engine.mjs";

export const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));

export function MissionProgress({ current, total, scenes }) {
  const percent = Math.round((current + 1) / total * 100);
  return `<div class="mission-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${current + 1}"><span><i style="width:${percent}%"></i></span><b>${current + 1} / ${total}</b><div class="mission-progress-steps">${scenes.map((scene, index) => `<span class="mission-step ${index < current ? "done" : index === current ? "active" : ""}" title="${escapeHtml(scene.phase)}"></span>`).join("")}</div></div>`;
}

function Check(scene, runtime) {
  if (!scene.check) return "";
  const check = runtime.checks[scene.id];
  const answer = scene.check.options.find((item) => item.id === check.selected);
  return `<section class="knowledge-check"><small>KNOWLEDGE CHECK</small><h3>${escapeHtml(scene.check.question)}</h3><div>${scene.check.options.map((item) => `<button type="button" data-check="${escapeHtml(item.id)}" class="${check.selected === item.id ? "selected" : ""}">${escapeHtml(item.label)}</button>`).join("")}</div>${answer ? `<p class="${check.correct ? "correct" : "retry"}">${check.correct ? "✓" : "↻"} ${escapeHtml(answer.feedback)}</p>` : ""}</section>`;
}

function DialogueBlock(scene, runtime) {
  if (!scene.dialogue?.length) return "";
  const index = runtime.dialogue[scene.id] || 0;
  const line = scene.dialogue[index];
  const cast = scene.cast || [...new Map(scene.dialogue.map((item) => [item.characterId, item])).values()];
  return `<section class="mission-dialogue-block" aria-label="บทสนทนาในฉาก"><div class="story-dialogue-cast">${cast.map((character) => StoryCharacterPortrait({ characterId: character.characterId, active: character.characterId === line.characterId, size: "small", speakerLabel: character.speaker })).join("")}</div><div class="mission-dialogue-copy"><small>${escapeHtml(line.speaker)} · ${escapeHtml(line.role)}</small><p class="dialogue-text" data-dialogue-text="${escapeHtml(line.text)}"></p><div class="dialogue-navigation"><button type="button" data-action="dialogue-prev" ${index === 0 ? "disabled" : ""}>← ก่อนหน้า</button><span>${index + 1}/${scene.dialogue.length}</span><button type="button" data-action="dialogue-next" ${index === scene.dialogue.length - 1 ? "disabled" : ""}>ถัดไป →</button></div><button class="skip-text-effect" type="button" data-action="skip-text">แสดงข้อความทั้งหมด</button></div></section>`;
}

function OpeningChoices(scene, runtime) {
  const selectedId = runtime.openingChoices[scene.id];
  const selected = scene.openingChoices.find((item) => item.id === selectedId);
  return `<section class="opening-choice-panel"><small>คุณจะเริ่มตรวจสอบจากจุดใด?</small><div>${scene.openingChoices.map((item) => `<button type="button" data-opening-choice="${escapeHtml(item.id)}" class="${selectedId === item.id ? "selected" : ""}">${selectedId === item.id ? "✓" : "→"} ${escapeHtml(item.label)}</button>`).join("")}</div>${selected ? `<p>${escapeHtml(selected.feedback)}</p>` : ""}</section>`;
}

export function CharacterDialogue(scene, runtime) {
  return `<article class="story-dialogue story-dialogue-rich"><div><small>${escapeHtml(scene.phase)}</small><h2>${escapeHtml(scene.title)}</h2></div>${DialogueBlock(scene, runtime)}${scene.openingChoices ? OpeningChoices(scene, runtime) : ""}</article>`;
}

export function ClassificationPanel(scene, runtime) {
  const answers = runtime.classifications[scene.id];
  const progress = classificationProgress(scene, answers);
  return `<article class="classification-panel">${DialogueBlock(scene, runtime)}<div><small>${escapeHtml(scene.phase)}</small><h2>${escapeHtml(scene.title)}</h2></div><section class="incident-brief"><b>${escapeHtml(scene.report.title)}</b><ul>${scene.report.facts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><aside><strong>${escapeHtml(scene.knowledge.title)}</strong><p>${escapeHtml(scene.knowledge.text)}</p></aside></section><div class="classification-progress"><b>${progress.correct}/${progress.total}</b><span>จำแนกถูกต้อง</span></div><div class="classification-list">${scene.statements.map((statement) => { const selected = answers[statement.id]; const correct = selected === statement.answer; return `<section class="classification-item ${selected ? correct ? "is-correct" : "is-retry" : ""}"><p>${escapeHtml(statement.text)}</p><div><button type="button" data-classification="${escapeHtml(statement.id)}" data-classification-value="FACT" class="${selected === "FACT" ? "selected" : ""}">FACT</button><button type="button" data-classification="${escapeHtml(statement.id)}" data-classification-value="INTERPRETATION" class="${selected === "INTERPRETATION" ? "selected" : ""}">INTERPRETATION</button></div>${selected ? `<small>${correct ? "✓" : "↻"} ${escapeHtml(statement.explanation)}</small>` : ""}</section>`; }).join("")}</div></article>`;
}

export function EvidenceViewer(scene, runtime) {
  const seen = runtime.evidence[scene.id] || [];
  const selected = scene.evidence.find((item) => item.id === (runtime.selectedEvidence[scene.id] || seen.at(-1)));
  return `<article class="evidence-panel">${DialogueBlock(scene, runtime)}<div><small>${escapeHtml(scene.phase)}</small><h2>${escapeHtml(scene.title)}</h2><p>${escapeHtml(scene.body)}</p></div>${selected ? `<div class="evidence-detail"><span>${escapeHtml(selected.marker)}</span><div><b>${escapeHtml(selected.title)}</b><p>${escapeHtml(selected.summary)}</p><em>${escapeHtml(selected.insight)}</em></div></div>` : '<div class="evidence-empty">เลือกจุดบนฉากเพื่อเปิดหลักฐาน</div>'}<div class="evidence-count"><b>${seen.length}/${scene.requiredEvidence}</b><span>หลักฐานขั้นต่ำที่ต้องตรวจ</span></div><label class="mission-response-field"><span>${escapeHtml(scene.evidenceQuestionPrompt)}</span><textarea data-evidence-question="${escapeHtml(scene.id)}" maxlength="600" placeholder="เช่น เกณฑ์นี้ส่งผลต่างกันในแต่ละกลุ่มหรือไม่?">${escapeHtml(runtime.evidenceQuestions[scene.id])}</textarea></label>${seen.length >= scene.requiredEvidence ? Check(scene, runtime) : ""}</article>`;
}

export function KnowledgeCard(scene) {
  return `<article class="knowledge-card knowledge-card-rich"><span>⌁</span><div><small>${escapeHtml(scene.phase)}</small><h2>${escapeHtml(scene.title)}</h2><p>${escapeHtml(scene.body)}</p><div class="knowledge-keywords">${scene.keywords.map((item) => `<b>${escapeHtml(item)}</b>`).join("")}</div><div class="knowledge-snippets">${scene.cards.map((item) => `<section><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></section>`).join("")}</div></div></article>`;
}

export function SimulationPanel(scene, runtime, result) {
  const simulation = runtime.simulation[scene.id];
  const controls = scene.controls.map((control) => control.type === "range" ? `<label class="simulation-control"><span>${escapeHtml(control.label)}<b data-control-value="${escapeHtml(control.id)}">${simulation.values[control.id]}${escapeHtml(control.unit)}</b></span><input type="range" min="${control.min}" max="${control.max}" step="${control.step}" value="${simulation.values[control.id]}" data-simulation-control="${escapeHtml(control.id)}"></label>` : `<label class="simulation-control"><span>${escapeHtml(control.label)}</span><select data-simulation-control="${escapeHtml(control.id)}">${control.options.map((option) => `<option value="${escapeHtml(option.value)}" ${option.value === simulation.values[control.id] ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></label>`).join("");
  const output = result ? `<div class="simulation-result risk-${result.risk === "ต่ำ" ? "low" : result.risk === "ปานกลาง" ? "medium" : "high"}"><div><small>แนวโน้มความพร้อม</small><strong>${result.readiness}</strong><span>/100</span></div><div><b>ความเสี่ยง ${escapeHtml(result.risk)}</b>${result.reasons.map((item) => `<p>• ${escapeHtml(item)}</p>`).join("")}<em>ข้อมูลสมมติเพื่อการเรียนรู้ ไม่ใช่ผลการทดลองจริง</em></div></div>` : '<div class="simulation-empty">เลือกค่าหรือชุดจำลอง แล้วประมวลผล</div>';
  return `<article class="simulation-panel">${DialogueBlock(scene, runtime)}<div><small>${escapeHtml(scene.phase)}</small><h2>${escapeHtml(scene.title)}</h2><p>${escapeHtml(scene.body)}</p></div><div class="simulation-presets">${scene.presets.map((preset) => `<button type="button" data-preset="${escapeHtml(preset.id)}">${escapeHtml(preset.label)}</button>`).join("")}</div><div class="simulation-controls">${controls}</div><button class="simulation-run" type="button" data-action="run-simulation">ประมวลผล (${simulation.runCount}/${scene.requiredRuns || 1})</button>${simulation.history.length ? `<div class="simulation-history">${simulation.history.map((item, index) => `<span><b>ครั้ง ${index + 1}</b><i style="width:${item.readiness}%"></i><em>${item.readiness}/100</em></span>`).join("")}</div>` : ""}${output}<label class="mission-response-field"><span>${escapeHtml(scene.simulationReflectionPrompt)}</span><textarea data-simulation-reflection="${escapeHtml(scene.id)}" maxlength="600" placeholder="บันทึกข้อจำกัดหรือข้อมูลที่ยังต้องตรวจ…">${escapeHtml(simulation.reflection)}</textarea></label>${simulation.runCount >= (scene.requiredRuns || 1) ? Check(scene, runtime) : ""}</article>`;
}

export function DecisionPanel(scene, runtime, result) {
  const decision = runtime.decisions[scene.id];
  return `<article class="decision-panel">${DialogueBlock(scene, runtime)}<div><small>${escapeHtml(scene.phase)}</small><h2>${escapeHtml(scene.title)}</h2><p>${escapeHtml(scene.body)}</p></div><div class="decision-options">${scene.options.map((option) => `<button type="button" class="decision-option ${decision.selected.includes(option.id) ? "selected" : ""}" data-decision="${escapeHtml(option.id)}"><span>${decision.selected.includes(option.id) ? "✓" : "+"}</span><div><b>${escapeHtml(option.label)}</b><small>${escapeHtml(option.impact)}</small></div></button>`).join("")}</div><button class="decision-submit" type="button" data-action="submit-decision" ${decision.selected.length < scene.minChoices ? "disabled" : ""}>ยืนยันแนวทาง (${decision.selected.length})</button>${result ? `<div class="decision-feedback"><strong>${escapeHtml(result.level)}</strong>${result.impacts.map((item) => `<p>ประโยชน์: ${escapeHtml(item)}</p>`).join("")}${result.remainingRisks.map((item) => `<p>ข้อจำกัด/ความเสี่ยงคงเหลือ: ${escapeHtml(item)}</p>`).join("")}${result.allSelected ? "<p>การเลือกทุกข้อไม่แทนการชั่งน้ำหนักผลกระทบ</p>" : ""}</div>${Check(scene, runtime)}` : ""}</article>`;
}

export function ReflectionPanel(scene, runtime) {
  return `<article class="reflection-panel">${DialogueBlock(scene, runtime)}<div><small>${escapeHtml(scene.phase)}</small><h2>${escapeHtml(scene.title)}</h2><p>${escapeHtml(scene.body)}</p></div><ul>${scene.takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><label class="mission-response-field"><span>${escapeHtml(scene.reflectionPrompt)}</span><textarea data-mission-reflection="${escapeHtml(scene.id)}" maxlength="1200" placeholder="เขียนแนวทางของคุณอย่างน้อย 20 ตัวอักษร…">${escapeHtml(runtime.reflections[scene.id])}</textarea></label></article>`;
}

export function MissionSummary(scene, runtime) {
  const evidence = Object.values(runtime.evidence).reduce((total, items) => total + items.length, 0);
  const runs = Object.values(runtime.simulation).reduce((total, item) => total + item.runCount, 0);
  const assessment = scene.quizReady ? '<button type="button" data-action="start-quiz">เริ่มแบบทดสอบ 10 ข้อ</button><p>ใช้ Quiz เดิม · ผ่านเมื่อได้อย่างน้อย 8/10 · รางวัล Access Denied ตรวจสิทธิ์ผ่าน Server</p>' : `<p>${escapeHtml(scene.previewNote || "แบบทดสอบท้ายบทเรียนยังไม่เปิดใช้งาน")}</p>`;
  return `<article class="mission-summary-card"><small>${escapeHtml(scene.phase)}</small><h2>${escapeHtml(scene.title)}</h2><p>${escapeHtml(scene.body)}</p><div class="mission-summary-stats"><span><b>${evidence}</b>หลักฐาน</span><span><b>${runs}</b>การทดลอง</span><span><b>${Object.values(runtime.decisions).filter((item) => item.submitted).length}</b>การตัดสินใจ</span></div><ul>${scene.takeaways.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul><div class="stage3-note">${assessment}</div></article>`;
}

export function SceneVisual(scene, runtime, result) {
  if (scene.evidence) {
    const seen = runtime.evidence[scene.id] || [];
    return `<div class="evidence-scene" style="background-image:linear-gradient(#1f5b8018,#40378033),url('${escapeHtml(scene.image)}')">${scene.evidence.map((item) => `<button type="button" class="evidence-hotspot ${seen.includes(item.id) ? "checked" : ""}" data-evidence="${escapeHtml(item.id)}" style="left:${item.x}%;top:${item.y}%" aria-label="ตรวจหลักฐาน ${escapeHtml(item.title)}"><span>${seen.includes(item.id) ? "✓" : escapeHtml(item.marker)}</span></button>`).join("")}</div>`;
  }
  if (scene.controls) return `<div class="simulation-visual"><div class="simulation-core" style="--readiness:${result?.readiness || 0}%"><span>AI</span><b>${result?.readiness ?? "—"}</b></div><div class="simulation-orbits"><i></i><i></i><i></i></div><p>${result ? `แนวโน้มความเสี่ยง: ${escapeHtml(result.risk)}` : "รอผลการจำลอง"}</p></div>`;
  if (scene.options) return '<div class="decision-visual"><span>?</span><h3>RESPONSIBLE AI</h3><p>ชั่งน้ำหนักประโยชน์ ความเสี่ยง และสิทธิของผู้ได้รับผลกระทบ</p></div>';
  return `<div class="scene-visual" style="--scene-accent:${scene.accent || "#7b75e8"}"><div class="scene-orbit"><i></i><i></i><i></i><strong>${scene.type === "summary" ? (scene.quizReady ? "QUIZ" : "จบ") : scene.type === "reflection" ? "คิด" : "AI"}</strong></div><div class="scene-node-row"><span>${escapeHtml(scene.environmentLabel || "Smart Academy")}</span><span>หลักฐาน</span><span>ความเป็นธรรม</span><span>มนุษย์กำกับ</span></div></div>`;
}

export function SceneExplanation(scene, requirement) {
  return `<aside class="scene-explanation"><b>คำแนะนำภารกิจ</b><p>${escapeHtml(scene.prompt)}</p><span class="scene-requirement ${requirement.ready ? "ready" : "pending"}">${requirement.ready ? "✓" : "○"} ${escapeHtml(requirement.message)}</span></aside>`;
}
