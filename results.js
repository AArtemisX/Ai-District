import { supabase, requirePlayer, toast } from "./flow-common.js";

try {
  const { user } = await requirePlayer();
  const sessionId = new URLSearchParams(location.search).get("session");
  if (!sessionId) throw new Error("ไม่พบรหัสผลการแข่งขัน");
  const { data: session, error: sessionError } = await supabase.from("ai_world_sessions").select("id, owner_id, room_id, current_turn, max_turns, status").eq("id", sessionId).single();
  if (sessionError) throw sessionError;
  const [membersResult, turnsResult, facilitiesResult] = await Promise.all([
    supabase.from("lobby_members").select("user_id, profiles(username, display_name)").eq("room_id", session.room_id),
    supabase.from("ai_world_turns").select("user_id, decision_score, facility_score, scenario_code, ai_scenarios(title, learning_topic)").eq("session_id", sessionId),
    supabase.from("ai_world_facility_states").select("owner_id, level, control_points, ai_facilities(name, base_points)").eq("session_id", sessionId),
  ]);
  const turns = turnsResult.data || [];
  const facilities = facilitiesResult.data || [];
  const members = membersResult.data || [];
  if (!members.some((member) => member.user_id === session.owner_id)) members.push({ user_id: session.owner_id, profiles: { username: "PLAYER", display_name: "PLAYER" } });
  const scores = members.map((member) => {
    const playerTurns = turns.filter((turn) => turn.user_id === member.user_id);
    const decision = playerTurns.reduce((sum, turn) => sum + turn.decision_score, 0);
    const facilityActions = playerTurns.reduce((sum, turn) => sum + turn.facility_score, 0);
    const controlled = facilities.filter((facility) => facility.owner_id === member.user_id);
    const controlBonus = controlled.reduce((sum, facility) => sum + facility.ai_facilities.base_points * facility.level, 0);
    const mission = playerTurns.length >= 4 ? 50 : 0;
    return { id: member.user_id, name: member.profiles?.display_name || member.profiles?.username || "PLAYER", decision, facility: facilityActions + controlBonus, mission, total: decision + facilityActions + controlBonus + mission, controlled: controlled.length };
  }).sort((a, b) => b.total - a.total);
  document.querySelector("#ranking-list").innerHTML = scores.map((score, index) => `<div class="ranking-row ${score.id === user.id ? "self" : ""}"><span class="place">${index + 1}</span><div><b>${score.name}</b><small>${score.controlled} สิ่งก่อสร้าง</small></div><strong>${score.total}</strong></div>`).join("");
  const mine = scores.find((score) => score.id === user.id) || { decision: 0, facility: 0, mission: 0, total: 0 };
  document.querySelector("#total-score").textContent = mine.total;
  document.querySelector("#decision-score").textContent = mine.decision;
  document.querySelector("#facility-score").textContent = mine.facility;
  document.querySelector("#mission-score").textContent = mine.mission;
  const weakTopics = [...new Set(turns.filter((turn) => turn.user_id === user.id && turn.scenario_code && turn.decision_score < 20).map((turn) => turn.ai_scenarios?.learning_topic).filter(Boolean))];
  document.querySelector("#learning-topics").innerHTML = weakTopics.length ? weakTopics.map((topic) => `<a href="learning.html"><span>ทบทวน</span><b>${topic}</b><i>→</i></a>`).join("") : `<div class="learning-good"><b>✓ การตัดสินใจมีความรับผิดชอบ</b><span>คุณใช้หลักฐานและพิจารณาผลกระทบได้ดี ลองเรียนบทถัดไปเพื่อปลดล็อกความรู้เพิ่ม</span></div>`;
  document.querySelector("#facility-results").innerHTML = facilities.length ? facilities.map((facility) => { const owner = scores.find((score) => score.id === facility.owner_id); return `<div><span>▥</span><b>${facility.ai_facilities.name}</b><small>Level ${facility.level} · ${owner?.name || "ไม่มีเจ้าของ"}</small><strong>${facility.control_points} CP</strong></div>`; }).join("") : `<p>แมตช์นี้ยังไม่มีสิ่งก่อสร้างถูกควบคุม</p>`;
  if (session.owner_id === user.id && scores[0]) await supabase.from("ai_world_sessions").update({ winner_id: scores[0].id }).eq("id", sessionId);
} catch (error) { if (!error.message.endsWith("REQUIRED")) toast(error.message, "error"); }
