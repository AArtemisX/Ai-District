import { supabase, requirePlayer, toast } from "./flow-common.js";

const phases = ["start", "draw", "inspect", "resolve", "result", "end"];
const phaseCopy = {
  start: ["START TURN", "◎", "เริ่มเทิร์นของคุณ", "ตรวจสอบสถานะ ไอเทม และทรัพยากรก่อนออกเดินทาง", "ทอยลูกเต๋า"],
  draw: ["DRAW & MOVE", "⚄", "กำลังเคลื่อนที่", "ลูกเต๋าจะกำหนดตำแหน่งใหม่บนกระดาน AI World", "เปิดพื้นที่ที่พบ"],
  inspect: ["INSPECT BLOCK", "⌾", "ตรวจสอบประเภทบล็อก", "พื้นที่แต่ละแบบให้โอกาสและความเสี่ยงแตกต่างกัน", "เลือกการตอบสนอง"],
  resolve: ["RESOLVE ACTION", "◇", "ตัดสินใจอย่างรับผิดชอบ", "เลือกแนวทางที่สมดุลระหว่างประโยชน์ ความปลอดภัย และผู้ได้รับผลกระทบ", "ประมวลผลลัพธ์"],
  result: ["TURN RESULT", "⌁", "ผลลัพธ์ของการตัดสินใจ", "การเลือกที่โปร่งใสและมีมนุษย์ตรวจสอบจะเพิ่ม Insight", "จบเทิร์น"],
  end: ["END TURN", "↻", "สรุปเทิร์น", "บันทึกผลแล้ว เตรียมเข้าสู่รอบถัดไป", "เริ่มเทิร์นถัดไป"],
};
const blocks = [
  { type: "ai_encounter", icon: "▣", name: "AI Encounter", detail: "วิเคราะห์สถานการณ์ AI" },
  { type: "ai_facility", icon: "▥", name: "AI Facility", detail: "เข้าสู่สิ่งก่อสร้างกลาง" },
  { type: "action", icon: "ϟ", name: "Action Block", detail: "เปิดโอกาสหรือเหตุการณ์พิเศษ" },
  { type: "resource", icon: "♙", name: "Resource Block", detail: "รับทรัพยากรสนับสนุน" },
];
const choices = ["หยุดและให้มนุษย์ตรวจสอบ", "เปิดเผยข้อมูลที่เกี่ยวข้องและรับฟังผู้ได้รับผลกระทบ", "ทดสอบในวงจำกัดก่อนขยายผล"];
let user;
let session;
let chosenBlock;
let chosenAction;

function renderTrack() {
  document.querySelector("#phase-track").innerHTML = phases.map((phase, index) => `<span class="${phases.indexOf(session.phase) >= index ? "active" : ""}"><i>${index + 1}</i>${phase.toUpperCase()}</span>`).join("");
}
function render() {
  const [kicker, icon, title, description, action] = phaseCopy[session.phase];
  document.querySelector("#turn-number").textContent = session.current_turn;
  document.querySelector("#phase-kicker").textContent = kicker;
  document.querySelector("#phase-icon").textContent = icon;
  document.querySelector("#phase-title").textContent = title;
  document.querySelector("#phase-description").textContent = description;
  document.querySelector("#phase-action span").textContent = action;
  document.querySelector("#position-value").textContent = session.board_state.position || 0;
  document.querySelector("#insight-value").textContent = session.board_state.insight || 0;
  document.querySelector("#energy-value").textContent = session.board_state.energy ?? 3;
  document.querySelector("#block-grid").hidden = session.phase !== "inspect";
  document.querySelector("#choice-grid").hidden = session.phase !== "resolve";
  if (session.phase === "inspect") document.querySelector("#block-grid").innerHTML = blocks.map((block) => `<div class="block-option"><span>${block.icon}</span><b>${block.name}</b><small>${block.detail}</small></div>`).join("");
  if (session.phase === "resolve") {
    document.querySelector("#choice-grid").innerHTML = choices.map((choice, index) => `<button class="${chosenAction === choice ? "active" : ""}" data-choice="${choice}"><span>0${index + 1}</span>${choice}</button>`).join("");
    document.querySelectorAll("[data-choice]").forEach((button) => button.addEventListener("click", () => { chosenAction = button.dataset.choice; render(); }));
  }
  renderTrack();
}
async function persist(updates) {
  const { data, error } = await supabase.from("ai_world_sessions").update(updates).eq("id", session.id).select("*, characters(name, ability)").single();
  if (error) throw error;
  session = data;
}

document.querySelector("#phase-action").addEventListener("click", async () => {
  const button = document.querySelector("#phase-action"); button.disabled = true;
  try {
    if (session.owner_id !== user.id) throw new Error("กำลังรอหัวหน้าห้องดำเนินเทิร์น");
    if (session.phase === "start") await persist({ phase: "draw" });
    else if (session.phase === "draw") {
      const roll = Math.floor(Math.random() * 6) + 1;
      await persist({ phase: "inspect", board_state: { ...session.board_state, position: (session.board_state.position || 0) + roll, last_roll: roll } });
      toast(`ทอยได้ ${roll} — เคลื่อนที่ ${roll} ช่อง`);
    } else if (session.phase === "inspect") {
      chosenBlock = blocks[Math.floor(Math.random() * blocks.length)];
      await persist({ phase: "resolve", board_state: { ...session.board_state, block_type: chosenBlock.type } });
    } else if (session.phase === "resolve") {
      if (!chosenAction) throw new Error("กรุณาเลือกวิธีตอบสนองก่อน");
      const insightGain = 10 + Math.floor(Math.random() * 11);
      const nextState = { ...session.board_state, insight: (session.board_state.insight || 0) + insightGain, energy: Math.max(0, (session.board_state.energy ?? 3) - 1), last_choice: chosenAction, insight_gain: insightGain };
      const { error } = await supabase.from("ai_world_turns").insert({ session_id: session.id, user_id: user.id, turn_number: session.current_turn, block_type: session.board_state.block_type || chosenBlock?.type || "ai_encounter", choice: chosenAction, result: { insight_gain: insightGain } });
      if (error && error.code !== "23505") throw error;
      await persist({ phase: "result", board_state: nextState });
    } else if (session.phase === "result") await persist({ phase: "end" });
    else if (session.current_turn >= 6 || (session.board_state.energy ?? 0) <= 0) {
      await persist({ status: "completed" });
      document.querySelector("#result-summary").textContent = `คุณเดินทางถึงช่อง ${session.board_state.position || 0} และสะสม ${session.board_state.insight || 0} Insight จาก ${session.current_turn} เทิร์น`;
      document.querySelector("#result-dialog").showModal();
    } else {
      chosenBlock = null; chosenAction = null;
      await persist({ phase: "start", current_turn: session.current_turn + 1, board_state: { ...session.board_state, energy: (session.board_state.energy ?? 0) + 1 } });
    }
    render();
  } catch (error) { toast(error.message, "error"); } finally { button.disabled = false; }
});

try {
  ({ user } = await requirePlayer());
  const sessionId = new URLSearchParams(location.search).get("session");
  if (!sessionId) throw new Error("ไม่พบรหัสเกม");
  const { data, error } = await supabase.from("ai_world_sessions").select("*, characters(name, ability)").eq("id", sessionId).single();
  if (error) throw error;
  session = data;
  document.querySelector("#agent-name").textContent = session.characters.name;
  document.querySelector("#agent-avatar").textContent = session.characters.name[0];
  document.querySelector("#agent-ability").textContent = session.characters.ability;
  if (session.status === "completed") document.querySelector("#result-dialog").showModal();
  render();
} catch (error) { if (!error.message.endsWith("REQUIRED")) toast(error.message, "error"); }
