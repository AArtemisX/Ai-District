import { supabase, requirePlayer, toast } from "./flow-common.js";
import { buildMissionDemo } from "./mission-demo-data.js?v=20261012-stage2b";
import { buildM6Mission } from "./mission-m6-data.js?v=20261014-mission-story-01";
import { buildMissionStory02Draft, MISSION_STORY_02_DRAFT_KEY } from "./mission-story-02-data.js?v=20261014-phase5b";
import { readMissionPreviewProgress, writeMissionPreviewProgress } from "./mission-preview-progress.mjs?v=20261014-phase5b";
import { createMissionRuntime, evaluateDecision, evaluateKnowledgeCheck, evaluateSimulation, resolveMissionSceneIndex, sceneRequirement } from "./mission-player-engine.mjs?v=20261014-mission-story-01";
import { CharacterDialogue, ClassificationPanel, DecisionPanel, EvidenceViewer, KnowledgeCard, MissionProgress, MissionSummary, ReflectionPanel, SceneExplanation, SceneVisual, SimulationPanel } from "./lesson-components.js?v=20261014-mission-story-01";

const $ = (selector) => document.querySelector(selector);
const lessonCode = new URLSearchParams(location.search).get("lesson");
const previewKey = new URLSearchParams(location.search).get("preview");
const mission02Preview = previewKey === MISSION_STORY_02_DRAFT_KEY;
const requestedScene = new URLSearchParams(location.search).get("scene");
const returnToQuiz = new URLSearchParams(location.search).get("return") === "quiz";
const state = {
  user: null, lessonRow: null, mission: null, sceneIndex: 0, progress: null, runtime: null,
  explanationOpen: false, animationSkipped: false, textEffectsDisabled: false,
  activeSeconds: 0, saveRequested: false, savePromise: null, dialogueTimer: null,
  previewMode: false, previewCompleted: false,
};

function activeNow() { return document.visibilityState === "visible" && document.hasFocus(); }
window.setInterval(() => { if (activeNow()) state.activeSeconds += 1; }, 1000);

function currentScene() { return state.mission.scenes[state.sceneIndex]; }
function simulationResult(scene) {
  const simulation = state.runtime.simulation[scene.id];
  return simulation?.runCount ? evaluateSimulation(scene, simulation.values) : null;
}
function decisionResult(scene) {
  const decision = state.runtime.decisions[scene.id];
  return decision?.submitted ? evaluateDecision(scene, decision.selected) : null;
}

function refreshNavigationRequirement() {
  if (!state.mission || !state.runtime) return;
  const requirement = sceneRequirement(currentScene(), state.runtime);
  $("#next-scene").setAttribute("aria-disabled", String(!requirement.ready));
  $("#next-scene").classList.toggle("needs-action", !requirement.ready);
}

function renderContent(scene) {
  if (scene.type === "dialogue") return CharacterDialogue(scene, state.runtime, state.textEffectsDisabled);
  if (scene.type === "classification") return ClassificationPanel(scene, state.runtime);
  if (scene.type === "evidence") return EvidenceViewer(scene, state.runtime);
  if (scene.type === "knowledge") return KnowledgeCard(scene);
  if (scene.type === "simulation") return SimulationPanel(scene, state.runtime, simulationResult(scene));
  if (scene.type === "decision") return DecisionPanel(scene, state.runtime, decisionResult(scene));
  if (scene.type === "reflection") return ReflectionPanel(scene, state.runtime);
  return MissionSummary(scene, state.runtime);
}

function bindPortraitFallbacks() {
  document.querySelectorAll(".story-character-portrait img").forEach((image) => {
    const showFallback = () => image.closest(".story-character-portrait")?.classList.add("is-fallback");
    if (image.complete && image.naturalWidth === 0) showFallback();
    else image.addEventListener("error", showFallback, { once: true });
  });
}

function startDialogueEffect() {
  window.clearInterval(state.dialogueTimer);
  const node = document.querySelector("[data-dialogue-text]");
  if (!node) return;
  const text = node.dataset.dialogueText || "";
  if (state.textEffectsDisabled || state.animationSkipped || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    node.textContent = text;
    return;
  }
  let index = 0;
  node.textContent = "";
  state.dialogueTimer = window.setInterval(() => {
    index += 1;
    node.textContent = text.slice(0, index);
    if (index >= text.length) window.clearInterval(state.dialogueTimer);
  }, 18);
}

function renderScene() {
  const scene = currentScene();
  const requirement = sceneRequirement(scene, state.runtime);
  const result = scene.type === "simulation" ? simulationResult(scene) : null;
  $("#mission-kicker").textContent = state.mission.demoLabel;
  $("#mission-title").textContent = state.mission.title;
  $("#mission-topic").textContent = `${state.mission.gradeLevel} · ${state.mission.topic} · ประมาณ ${state.mission.estimatedDuration} นาที`;
  $("#scene-phase").textContent = scene.phase;
  $("#mission-progress-wrap").innerHTML = MissionProgress({ current: state.sceneIndex, total: state.mission.scenes.length, scenes: state.mission.scenes });
  $("#scene-visual-wrap").innerHTML = SceneVisual(scene, state.runtime, result);
  $("#scene-content").innerHTML = renderContent(scene);
  $("#scene-explanation-wrap").innerHTML = state.explanationOpen ? SceneExplanation(scene, requirement) : "";
  $("#previous-scene").disabled = state.sceneIndex === 0;
  const isLast = state.sceneIndex === state.mission.scenes.length - 1;
  $("#next-scene").innerHTML = isLast ? "กลับ Learning Hub <span>→</span>" : "ถัดไป <span>→</span>";
  if (isLast && state.previewMode) $("#next-scene").innerHTML = "จบ Preview และกลับ Learning Hub <span>→</span>";
  refreshNavigationRequirement();
  $("#toggle-explanation").textContent = state.explanationOpen ? "ซ่อนคำอธิบาย" : "ดูคำอธิบาย";
  $("#skip-animation").textContent = state.animationSkipped ? "ลดการเคลื่อนไหวแล้ว" : "ลดการเคลื่อนไหว";
  document.body.classList.toggle("animation-skipped", state.animationSkipped);
  bindPortraitFallbacks();
  startDialogueEffect();
}

async function persistProgress() {
  if (!state.user) return;
  const activeDelta = state.activeSeconds;
  if (state.previewMode) {
    state.progress = writeMissionPreviewProgress({
      ...state.progress,
      status: state.previewCompleted ? "preview_completed" : "in_progress",
      scene_index: state.sceneIndex,
      scene_state: {
        schemaVersion: state.mission.schemaVersion,
        sceneId: currentScene().id,
        animationSkipped: state.animationSkipped,
        textEffectsDisabled: state.textEffectsDisabled,
        runtime: state.runtime,
      },
      active_seconds: (state.progress?.active_seconds || 0) + activeDelta,
      started_at: state.progress?.started_at || new Date().toISOString(),
      completed_at: state.previewCompleted ? (state.progress?.completed_at || new Date().toISOString()) : null,
    });
    state.activeSeconds = Math.max(0, state.activeSeconds - activeDelta);
    return;
  }
  if (!state.lessonRow) return;
  const existingCompleted = state.progress?.status === "completed";
  const payload = {
    user_id: state.user.id,
    lesson_id: state.lessonRow.id,
    status: existingCompleted ? "completed" : "in_progress",
    score: state.progress?.score ?? null,
    scene_index: state.sceneIndex,
    scene_state: {
      schemaVersion: state.mission.schemaVersion,
      sceneId: currentScene().id,
      animationSkipped: state.animationSkipped,
      textEffectsDisabled: state.textEffectsDisabled,
      runtime: state.runtime,
    },
    active_seconds: (state.progress?.active_seconds || 0) + activeDelta,
    started_at: state.progress?.started_at || new Date().toISOString(),
    completed_at: state.progress?.completed_at || null,
  };
  const { error } = await supabase.from("player_learning_progress").upsert(payload, { onConflict: "user_id,lesson_id" });
  if (error) throw error;
  state.progress = { ...state.progress, ...payload };
  state.activeSeconds = Math.max(0, state.activeSeconds - activeDelta);
}

function requestSave() {
  state.saveRequested = true;
  if (state.savePromise) return state.savePromise;
  state.savePromise = (async () => {
    while (state.saveRequested) {
      state.saveRequested = false;
      await persistProgress();
    }
  })().finally(() => { state.savePromise = null; });
  return state.savePromise;
}

async function moveScene(direction) {
  const scene = currentScene();
  if (direction > 0) {
    const requirement = sceneRequirement(scene, state.runtime);
    if (!requirement.ready) { toast(requirement.message, "error"); state.explanationOpen = true; renderScene(); return; }
  }
  const next = state.sceneIndex + direction;
  if (next >= state.mission.scenes.length) {
    if (state.previewMode) state.previewCompleted = true;
    await requestSave();
    location.assign("learning.html");
    return;
  }
  state.sceneIndex = Math.max(0, next);
  state.explanationOpen = false;
  renderScene();
  await requestSave();
}

async function exitLesson() {
  try { await requestSave(); } catch (error) { toast(error.message, "error"); return; }
  location.assign("learning.html");
}

async function startQuiz() {
  if (state.previewMode) { toast("Final Assessment ของ Mission 02 ยังอยู่ระหว่างพัฒนา", "error"); return; }
  await requestSave();
  const { error } = await supabase.from("player_learning_progress").update({ mission_completed_at: new Date().toISOString() }).eq("user_id", state.user.id).eq("lesson_id", state.lessonRow.id);
  if (error) throw error;
  location.assign(`quiz.html?lesson=${encodeURIComponent(state.lessonRow.code)}`);
}

function updateDialogue(direction) {
  const scene = currentScene();
  const current = state.runtime.dialogue[scene.id] || 0;
  state.runtime.dialogue[scene.id] = Math.max(0, Math.min(current + direction, scene.dialogue.length - 1));
  renderScene();
  requestSave().catch((error) => toast(error.message, "error"));
}

function inspectEvidence(id) {
  const scene = currentScene();
  const checked = state.runtime.evidence[scene.id];
  if (!checked.includes(id)) checked.push(id);
  state.runtime.selectedEvidence[scene.id] = id;
  renderScene();
  requestSave().catch((error) => toast(error.message, "error"));
}

function runSimulation() {
  const scene = currentScene();
  const simulation=state.runtime.simulation[scene.id];
  simulation.runCount += 1;
  simulation.history.push(evaluateSimulation(scene,simulation.values));
  simulation.history=simulation.history.slice(-4);
  renderScene();
  requestSave().catch((error) => toast(error.message, "error"));
}

function chooseCheck(id){const scene=currentScene(),check=state.runtime.checks[scene.id],result=evaluateKnowledgeCheck(scene,id);check.selected=id;check.correct=result.correct;check.attempts+=1;renderScene();requestSave().catch(error=>toast(error.message,"error"));}
function applyPreset(id){const scene=currentScene(),preset=scene.presets.find(x=>x.id===id);if(!preset)return;state.runtime.simulation[scene.id].values={...preset.values};renderScene();requestSave().catch(error=>toast(error.message,"error"));}

function toggleDecision(id) {
  const scene = currentScene();
  const decision = state.runtime.decisions[scene.id];
  decision.selected = decision.selected.includes(id) ? decision.selected.filter((item) => item !== id) : [...decision.selected, id];
  decision.submitted = false;
  renderScene();
  requestSave().catch((error) => toast(error.message, "error"));
}

function submitDecision() {
  const scene = currentScene();
  const decision = state.runtime.decisions[scene.id];
  if (decision.selected.length < scene.minChoices) { toast("เลือกอย่างน้อยหนึ่งแนวทาง", "error"); return; }
  decision.submitted = true;
  renderScene();
  requestSave().catch((error) => toast(error.message, "error"));
}

function chooseOpeningPath(id) {
  const scene = currentScene();
  if (!scene.openingChoices?.some((item) => item.id === id)) return;
  state.runtime.openingChoices[scene.id] = id;
  renderScene();
  requestSave().catch((error) => toast(error.message, "error"));
}

function classifyStatement(id, value) {
  const scene = currentScene();
  if (!scene.statements?.some((item) => item.id === id) || !["FACT", "INTERPRETATION"].includes(value)) return;
  state.runtime.classifications[scene.id][id] = value;
  renderScene();
  requestSave().catch((error) => toast(error.message, "error"));
}

$("#previous-scene").addEventListener("click", () => moveScene(-1).catch((error) => toast(error.message, "error")));
$("#next-scene").addEventListener("click", () => moveScene(1).catch((error) => toast(error.message, "error")));
$("#exit-lesson").addEventListener("click", exitLesson);
$("#toggle-explanation").addEventListener("click", () => { state.explanationOpen = !state.explanationOpen; renderScene(); });
$("#skip-animation").addEventListener("click", () => { state.animationSkipped = true; state.textEffectsDisabled = true; renderScene(); requestSave().catch(() => {}); });

$(".mission-stage").addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const evidence = event.target.closest("[data-evidence]")?.dataset.evidence;
  const decision = event.target.closest("[data-decision]")?.dataset.decision;
  const check = event.target.closest("[data-check]")?.dataset.check;
  const preset = event.target.closest("[data-preset]")?.dataset.preset;
  const openingChoice = event.target.closest("[data-opening-choice]")?.dataset.openingChoice;
  const classificationButton = event.target.closest("[data-classification]");
  if (evidence) inspectEvidence(evidence);
  else if (decision) toggleDecision(decision);
  else if (check) chooseCheck(check);
  else if (preset) applyPreset(preset);
  else if (openingChoice) chooseOpeningPath(openingChoice);
  else if (classificationButton) classifyStatement(classificationButton.dataset.classification, classificationButton.dataset.classificationValue);
  else if (action === "accept-mission") { state.runtime.accepted[currentScene().id]=true; renderScene(); requestSave().catch(()=>{}); }
  else if (action === "dialogue-prev") updateDialogue(-1);
  else if (action === "dialogue-next") updateDialogue(1);
  else if (action === "skip-text") { state.textEffectsDisabled = true; renderScene(); requestSave().catch(() => {}); }
  else if (action === "run-simulation") runSimulation();
  else if (action === "submit-decision") submitDecision();
  else if (action === "start-quiz") startQuiz().catch((error) => toast(error.message, "error"));
});

$(".mission-stage").addEventListener("input", (event) => {
  const scene = currentScene();
  if (event.target.dataset.evidenceQuestion) { state.runtime.evidenceQuestions[scene.id] = event.target.value; refreshNavigationRequirement(); return; }
  if (event.target.dataset.simulationReflection) { state.runtime.simulation[scene.id].reflection = event.target.value; refreshNavigationRequirement(); return; }
  if (event.target.dataset.missionReflection) { state.runtime.reflections[scene.id] = event.target.value; refreshNavigationRequirement(); return; }
  const id = event.target.dataset.simulationControl;
  if (!id) return;
  state.runtime.simulation[scene.id].values[id] = event.target.type === "range" ? Number(event.target.value) : event.target.value;
  state.runtime.simulation[scene.id].runCount = 0;
  const valueNode = document.querySelector(`[data-control-value="${id}"]`);
  if (valueNode) valueNode.textContent = `${event.target.value}%`;
});

$(".mission-stage").addEventListener("change", (event) => {
  const id = event.target.dataset.simulationControl;
  const scene = currentScene();
  if (event.target.dataset.evidenceQuestion) {
    state.runtime.evidenceQuestions[scene.id] = event.target.value;
    renderScene();
    requestSave().catch((error) => toast(error.message, "error"));
    return;
  }
  if (event.target.dataset.simulationReflection) {
    state.runtime.simulation[scene.id].reflection = event.target.value;
    renderScene();
    requestSave().catch((error) => toast(error.message, "error"));
    return;
  }
  if (event.target.dataset.missionReflection) {
    state.runtime.reflections[scene.id] = event.target.value;
    renderScene();
    requestSave().catch((error) => toast(error.message, "error"));
    return;
  }
  if (!id) return;
  state.runtime.simulation[scene.id].values[id] = event.target.type === "range" ? Number(event.target.value) : event.target.value;
  state.runtime.simulation[scene.id].runCount = 0;
  renderScene();
  requestSave().catch((error) => toast(error.message, "error"));
});

document.addEventListener("keydown", (event) => {
  if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(document.activeElement?.tagName)) return;
  if (event.key === "ArrowRight") moveScene(1).catch((error) => toast(error.message, "error"));
  if (event.key === "ArrowLeft" && state.sceneIndex > 0) moveScene(-1).catch((error) => toast(error.message, "error"));
  if (event.key === "Escape") exitLesson();
});
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") requestSave().catch(() => {}); });

try {
  const player = await requirePlayer();
  state.user = player.user;
  if (mission02Preview) {
    state.previewMode = true;
    state.mission = buildMissionStory02Draft();
    state.progress = readMissionPreviewProgress();
    state.sceneIndex = resolveMissionSceneIndex(state.mission, state.progress);
    if (requestedScene) { const requestedIndex=state.mission.scenes.findIndex((scene)=>scene.id===requestedScene); if(requestedIndex>=0) state.sceneIndex=requestedIndex; }
    state.animationSkipped = Boolean(state.progress?.scene_state?.animationSkipped);
    state.textEffectsDisabled = Boolean(state.progress?.scene_state?.textEffectsDisabled);
    state.runtime = createMissionRuntime(state.mission, state.progress?.scene_state?.runtime);
    state.previewCompleted = state.progress?.status === "preview_completed";
    $("#mission-demo-banner").textContent = "Preview — ยังไม่เปิดรับรางวัล · ความคืบหน้าเก็บชั่วคราวในแท็บนี้ · Nancy ยังเป็นตัวละคร Locked";
    await requestSave();
    renderScene();
  } else {
  if (!lessonCode) throw new Error("ไม่พบรหัสบทเรียน");
  const { data: lesson, error: lessonError } = await supabase.from("learning_lessons").select("id,code,category,title,summary,content,unlock_order,reward_xp").eq("code", lessonCode).eq("is_active", true).maybeSingle();
  if (lessonError || !lesson) throw lessonError || new Error("ไม่พบบทเรียนนี้");
  state.lessonRow = lesson;
  state.mission = lesson.code === "ai-ethics-m6-01" ? buildM6Mission(lesson) : buildMissionDemo(lesson);
  const { data: progress, error: progressError } = await supabase.from("player_learning_progress").select("status,score,scene_index,scene_state,active_seconds,started_at,completed_at").eq("user_id", state.user.id).eq("lesson_id", lesson.id).maybeSingle();
  if (progressError) throw progressError;
  state.progress = progress;
  state.sceneIndex = resolveMissionSceneIndex(state.mission, progress, ["incident", "evidence", "simulation", "decision", "reflection"]);
  if (requestedScene) { const requestedIndex=state.mission.scenes.findIndex((scene)=>scene.id===requestedScene); if(requestedIndex>=0) state.sceneIndex=requestedIndex; }
  state.animationSkipped = Boolean(progress?.scene_state?.animationSkipped);
  state.textEffectsDisabled = Boolean(progress?.scene_state?.textEffectsDisabled);
  state.runtime = createMissionRuntime(state.mission, progress?.scene_state?.runtime);
  await requestSave();
  if (returnToQuiz) $("#mission-demo-banner").innerHTML=`กำลังทบทวนหัวข้อที่เกี่ยวข้อง · <a href="quiz.html?lesson=${encodeURIComponent(lesson.code)}">กลับไปทำแบบทดสอบ</a>`;
  renderScene();
  }
} catch (error) {
  if (!error.message.endsWith("REQUIRED")) { toast(error.message, "error"); $("#mission-title").textContent = "ไม่สามารถเปิดภารกิจได้"; }
}
