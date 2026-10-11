import "./page-navigation.js";
import { supabase, requirePlayer, toast } from "./flow-common.js";

const phases = ["start", "draw", "inspect", "resolve", "result", "end"];
const phaseBase = {
  start: ["START TURN", "◎", "เริ่มเทิร์นของคุณ", "ตรวจสอบตำแหน่ง Insight และ Energy ก่อนออกเดินทาง", "ทอยลูกเต๋า"],
  draw: ["DRAW & MOVE", "⚄", "เคลื่อนที่บนกระดาน", "ทอยลูกเต๋าเพื่อค้นหาบล็อกเหตุการณ์ในรอบนี้", "ทอยและเปิดบล็อก"],
  inspect: ["INSPECT BLOCK", "⌾", "ตรวจสอบบล็อกที่พบ", "อ่านประเภทบล็อกและเตรียมข้อมูลก่อนตัดสินใจ", "เข้าสู่สถานการณ์"],
  resolve: ["MAKE A DECISION", "◇", "ตัดสินใจและประมวลผล", "ใช้หลักฐานและความรู้ด้าน AI เลือกแนวทางที่รับผิดชอบที่สุด", "ยืนยันการตัดสินใจ"],
  result: ["TURN RESULT", "⌁", "ผลกระทบจากการตัดสินใจ", "ระบบบันทึกคะแนนการเรียนรู้และผลต่อกระดานแล้ว", "สรุปเทิร์น"],
  end: ["END TURN", "↻", "จบเทิร์น", "ตรวจสอบเงื่อนไขจบเกมแล้วเตรียมรอบถัดไป", "เริ่มเทิร์นถัดไป"],
};
const blockCatalog = [
  ["ai_encounter", "▣", "AI Encounter", "อ่านสถานการณ์ วิเคราะห์หลักฐาน และเลือกมาตรการ"],
  ["ai_facility", "▥", "AI Facility Zone", "สร้าง พัฒนา หรือแย่งการควบคุมสิ่งก่อสร้าง"],
  ["action", "ϟ", "Action Block", "เหตุการณ์พิเศษที่เพิ่มหรือลดทรัพยากร"],
  ["resource", "♙", "Resource Block", "รับ Energy และ Insight เพื่อใช้ในรอบต่อไป"],
];

let user, session, scenarios = [], facilities = [], facilityStates = [];
let selectedChoice = null;
const card = document.querySelector(".turn-card");
const detail = document.createElement("div");
detail.id = "turn-detail";
detail.className = "turn-detail";
card.insertBefore(detail, document.querySelector("#block-grid"));

function state() { return session.board_state || {}; }
function currentBlock() { return state().block_type || "ai_encounter"; }
function currentScenario() { return scenarios.find((item) => item.code === state().scenario_code); }
function currentFacility() { return facilities.find((item) => item.code === state().facility_code); }
function facilityState(code) { return facilityStates.find((item) => item.facility_code === code); }

function renderTrack() {
  document.querySelector("#phase-track").innerHTML = phases.map((phase, index) => `<span class="${phases.indexOf(session.phase) >= index ? "active" : ""}"><i>${index + 1}</i>${phase.toUpperCase()}</span>`).join("");
}

function renderInspect() {
  const active = currentBlock();
  document.querySelector("#block-grid").innerHTML = blockCatalog.map(([type, icon, name, copy]) => `<div class="block-option ${type === active ? "active" : ""}"><span>${icon}</span><b>${name}</b><small>${copy}</small></div>`).join("");
}

function renderEncounter() {
  const scenario = currentScenario();
  if (!scenario) return;
  detail.innerHTML = `<section class="scenario-stage"><span class="scenario-tag">${scenario.category === "ethics" ? "AI ETHICS" : "AI IMPACT"}</span><h2>${scenario.title}</h2><p>${scenario.description}</p><div class="evidence-panel"><b>หลักฐานที่มี</b>${scenario.evidence.map((item) => `<span>• ${item}</span>`).join("")}</div></section>`;
  document.querySelector("#choice-grid").innerHTML = scenario.choices.map((choice, index) => `<button class="${selectedChoice?.id === choice.id ? "active" : ""}" data-choice="${choice.id}"><span>0${index + 1}</span>${choice.label}</button>`).join("");
  document.querySelectorAll("[data-choice]").forEach((button) => button.addEventListener("click", () => { selectedChoice = scenario.choices.find((choice) => choice.id === button.dataset.choice); render(); }));
}

function renderFacility() {
  const facility = currentFacility();
  const owned = facilityState(facility?.code);
  if (!facility) return;
  const status = !owned?.owner_id ? "ยังไม่มีเจ้าของ" : owned.owner_id === user.id ? `คุณควบคุมอยู่ · Level ${owned.level}` : "ผู้เล่นอื่นควบคุมอยู่";
  const choices = !owned?.owner_id
    ? [{ id: "claim", label: "สร้างและเข้าควบคุมพื้นที่", score: facility.base_points, impact: `รับ ${facility.base_points} คะแนนสิ่งก่อสร้าง`, feedback: "สร้างสิ่งก่อสร้างสำเร็จ" }]
    : owned.owner_id === user.id
      ? [{ id: "upgrade", label: "ใช้ Energy 1 เพื่อพัฒนา Level", score: 10, impact: "เพิ่มระดับและคะแนนควบคุม", feedback: "พัฒนาสิ่งก่อสร้างสำเร็จ" }]
      : [{ id: "contest", label: "เข้าสู่ภารกิจแย่งการควบคุม", score: 15, impact: "ใช้ Insight แข่งขันกับเจ้าของเดิม", feedback: "เริ่มการแย่งชิงพื้นที่" }];
  detail.innerHTML = `<section class="scenario-stage facility-stage" style="--facility:${facility.accent_color}"><span class="scenario-tag">AI FACILITY ZONE</span><h2>${facility.name}</h2><p>${facility.description}</p><div class="facility-status"><b>${status}</b><span>คะแนนพื้นฐาน ${facility.base_points}</span></div></section>`;
  document.querySelector("#choice-grid").innerHTML = choices.map((choice) => `<button class="${selectedChoice?.id === choice.id ? "active" : ""}" data-facility-action="${choice.id}">${choice.label}</button>`).join("");
  document.querySelectorAll("[data-facility-action]").forEach((button) => button.addEventListener("click", () => { selectedChoice = choices.find((choice) => choice.id === button.dataset.facilityAction); render(); }));
}

function renderResult() {
  const result = state().last_result;
  if (!result) return;
  detail.innerHTML = `<section class="impact-result ${result.score >= 20 ? "positive" : "warning"}"><span>${result.score >= 20 ? "✓ RESPONSIBLE IMPACT" : "△ REVIEW NEEDED"}</span><h2>+${result.score} คะแนน</h2><p>${result.impact}</p><small>${result.feedback}</small></section>`;
}

function render() {
  const [kicker, icon, title, description, action] = phaseBase[session.phase];
  document.querySelector("#turn-number").textContent = `${session.current_turn} / ${session.max_turns}`;
  document.querySelector("#phase-kicker").textContent = kicker;
  document.querySelector("#phase-icon").textContent = icon;
  document.querySelector("#phase-title").textContent = title;
  document.querySelector("#phase-description").textContent = description;
  document.querySelector("#phase-action span").textContent = session.phase === "end" && session.current_turn >= session.max_turns ? "ดู Results & Ranking" : action;
  document.querySelector("#position-value").textContent = state().position || 0;
  document.querySelector("#insight-value").textContent = state().insight || 0;
  document.querySelector("#energy-value").textContent = state().energy ?? 3;
  detail.innerHTML = "";
  document.querySelector("#block-grid").hidden = session.phase !== "inspect";
  document.querySelector("#choice-grid").hidden = session.phase !== "resolve";
  if (session.phase === "inspect") renderInspect();
  if (session.phase === "resolve") currentBlock() === "ai_encounter" ? renderEncounter() : currentBlock() === "ai_facility" ? renderFacility() : renderSpecial();
  if (session.phase === "result") renderResult();
  renderTrack();
}

function renderSpecial() {
  const resource = currentBlock() === "resource";
  selectedChoice = selectedChoice || { id: resource ? "collect" : "activate", label: resource ? "รวบรวมทรัพยากร" : "เปิดใช้ Action", score: resource ? 8 : 6, impact: resource ? "ได้รับ Energy 1 และ Insight 8" : "Action เพิ่ม Insight 6", feedback: "ใช้บล็อกพิเศษสำเร็จ" };
  detail.innerHTML = `<section class="scenario-stage"><span class="scenario-tag">${resource ? "RESOURCE BLOCK" : "ACTION BLOCK"}</span><h2>${resource ? "แหล่งทรัพยากร" : "โอกาสพิเศษ"}</h2><p>${selectedChoice.impact}</p></section>`;
  document.querySelector("#choice-grid").innerHTML = `<button class="active">${selectedChoice.label}</button>`;
}

async function persist(updates) {
  const { data, error } = await supabase.from("ai_world_sessions").update(updates).eq("id", session.id).select("*, characters(name, ability)").single();
  if (error) throw error;
  session = data;
}

async function resolveFacility() {
  const facility = currentFacility();
  const owned = facilityState(facility.code);
  let score = selectedChoice.score;
  let ownerId = owned?.owner_id || user.id;
  let level = owned?.level || 1;
  let energy = state().energy ?? 3;
  if (selectedChoice.id === "upgrade") { if (energy < 1) throw new Error("Energy ไม่พอสำหรับพัฒนา"); level = Math.min(5, level + 1); energy -= 1; }
  if (selectedChoice.id === "contest") {
    const won = (state().insight || 0) + Math.floor(Math.random() * 20) >= 20;
    if (won) { ownerId = user.id; score += facility.base_points; selectedChoice = { ...selectedChoice, impact: "ชนะภารกิจและเข้าควบคุมสิ่งก่อสร้าง", feedback: "การเตรียม Insight ช่วยให้แย่งพื้นที่สำเร็จ" }; }
    else { score = 5; selectedChoice = { ...selectedChoice, score, impact: "ภารกิจไม่สำเร็จ เจ้าของเดิมยังควบคุมพื้นที่", feedback: "สะสม Insight แล้วกลับมาท้าทายใหม่" }; }
  }
  const { error } = await supabase.from("ai_world_facility_states").upsert({ session_id: session.id, facility_code: facility.code, owner_id: ownerId, level, control_points: (owned?.control_points || 0) + score });
  if (error) throw error;
  facilityStates = (await supabase.from("ai_world_facility_states").select("*").eq("session_id", session.id)).data || [];
  return { score, energy };
}

async function recordTurn() {
  if (!selectedChoice) throw new Error("กรุณาเลือกคำตอบก่อน");
  let decisionScore = 0, facilityScore = 0, energy = state().energy ?? 3;
  if (currentBlock() === "ai_encounter") decisionScore = selectedChoice.score;
  else if (currentBlock() === "ai_facility") { const resolved = await resolveFacility(); facilityScore = resolved.score; energy = resolved.energy; }
  else { decisionScore = selectedChoice.score; if (currentBlock() === "resource") energy += 1; }
  const score = decisionScore + facilityScore;
  const nextState = { ...state(), insight: (state().insight || 0) + score, energy, last_result: { score, impact: selectedChoice.impact, feedback: selectedChoice.feedback } };
  const { error } = await supabase.from("ai_world_turns").insert({ session_id: session.id, user_id: user.id, turn_number: session.current_turn, block_type: currentBlock(), scenario_code: currentScenario()?.code || null, choice: selectedChoice.id, decision_score: decisionScore, facility_score: facilityScore, result: nextState.last_result });
  if (error && error.code !== "23505") throw error;
  await persist({ phase: "result", board_state: nextState });
}

document.querySelector("#phase-action").addEventListener("click", async () => {
  const button = document.querySelector("#phase-action"); button.disabled = true;
  try {
    if (session.owner_id !== user.id) throw new Error("กำลังรอหัวหน้าห้องดำเนินเทิร์น");
    if (session.phase === "start") await persist({ phase: "draw" });
    else if (session.phase === "draw") {
      const roll = Math.floor(Math.random() * 6) + 1;
      const block = blockCatalog[Math.floor(Math.random() * blockCatalog.length)][0];
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
      const facility = facilities[Math.floor(Math.random() * facilities.length)];
      selectedChoice = null;
      await persist({ phase: "inspect", board_state: { ...state(), position: (state().position || 0) + roll, last_roll: roll, block_type: block, scenario_code: scenario.code, facility_code: facility.code } });
      toast(`ทอยได้ ${roll} — เคลื่อนที่ ${roll} ช่อง`);
    } else if (session.phase === "inspect") await persist({ phase: "resolve" });
    else if (session.phase === "resolve") await recordTurn();
    else if (session.phase === "result") await persist({ phase: "end" });
    else if (session.current_turn >= session.max_turns) {
      await persist({ status: "completed", completed_at: new Date().toISOString() });
      window.location.assign(`results.html?session=${session.id}`);
      return;
    } else {
      selectedChoice = null;
      await persist({ phase: "start", current_turn: session.current_turn + 1, board_state: { ...state(), energy: Math.min(5, (state().energy ?? 3) + 1), last_result: null } });
    }
    render();
  } catch (error) { toast(error.message, "error"); } finally { button.disabled = false; }
});

try {
  ({ user } = await requirePlayer());
  const sessionId = new URLSearchParams(location.search).get("session");
  if (!sessionId) throw new Error("ไม่พบรหัสเกม");
  const [sessionResult, scenarioResult, facilityResult, stateResult] = await Promise.all([
    supabase.from("ai_world_sessions").select("*, characters(name, ability)").eq("id", sessionId).single(),
    supabase.from("ai_scenarios").select("*").eq("is_active", true),
    supabase.from("ai_facilities").select("*").eq("is_active", true),
    supabase.from("ai_world_facility_states").select("*").eq("session_id", sessionId),
  ]);
  if (sessionResult.error) throw sessionResult.error;
  session = sessionResult.data; scenarios = scenarioResult.data || []; facilities = facilityResult.data || []; facilityStates = stateResult.data || [];
  if (session.status === "completed") { window.location.replace(`results.html?session=${session.id}`); throw new Error("NAVIGATING"); }
  document.querySelector("#agent-name").textContent = session.characters.name;
  document.querySelector("#agent-avatar").textContent = session.characters.name[0];
  document.querySelector("#agent-ability").textContent = session.characters.ability;
  render();
} catch (error) { if (!["AUTH_REQUIRED", "TUTORIAL_REQUIRED", "NAVIGATING"].includes(error.message)) toast(error.message, "error"); }
