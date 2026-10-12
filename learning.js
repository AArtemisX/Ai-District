import "./page-navigation.js";
import { supabase, requirePlayer, setPlayerHeader, setupLogout, toast } from "./flow-common.js";
import { LEARNING_DISTRICTS, getDistrictForLesson, lessonDuration, lessonGrade, lessonRewardPreview } from "./learning-content.js?v=20261012-stage4";

const $ = (selector) => document.querySelector(selector);
let lessons = [];
let progressByLesson = new Map();
let rewardByLesson = new Map();
let unlockedCardIds = new Set();
let districtFilter = "all";
let statusFilter = "all";
let gradeFilter = "all";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

function progressPercent(progress) {
  if (progress?.status === "completed") return 100;
  return Math.min(95, Math.round(((progress?.scene_index || 0) / 4) * 100));
}

function statusFor(progress) {
  if (progress?.status === "completed") return { key: "completed", label: "เรียนจบ", icon: "✓" };
  if (progress) return { key: "in_progress", label: "กำลังเรียน", icon: "↻" };
  return { key: "not_started", label: "ยังไม่เริ่ม", icon: "○" };
}

function renderDistrictMap() {
  $("#district-map").innerHTML = LEARNING_DISTRICTS.map((district) => {
    const districtLessons = lessons.filter((lesson) => getDistrictForLesson(lesson).id === district.id);
    const done = districtLessons.filter((lesson) => progressByLesson.get(lesson.id)?.status === "completed").length;
    return `<button type="button" class="learning-district ${districtFilter === district.id ? "selected" : ""}" data-district="${district.id}" aria-pressed="${districtFilter === district.id}" style="--district:${district.color};--district-soft:${district.soft}"><span class="district-building" aria-hidden="true"><i></i><i></i><i></i></span><span class="district-copy"><small>${district.kicker}</small><strong>${district.name}</strong><em>${district.topic}</em><span>${done}/${districtLessons.length} ภารกิจสำเร็จ</span></span></button>`;
  }).join("");
}

function renderLessons() {
  const visible = lessons.filter((lesson) => {
    const progress = progressByLesson.get(lesson.id);
    return (districtFilter === "all" || getDistrictForLesson(lesson).id === districtFilter) && (statusFilter === "all" || statusFor(progress).key === statusFilter) && (gradeFilter === "all" || lessonGrade(lesson) === Number(gradeFilter));
  });
  $("#lesson-grid").innerHTML = visible.length ? visible.map((lesson) => {
    const progress = progressByLesson.get(lesson.id);
    const status = statusFor(progress);
    const percent = progressPercent(progress);
    const district = getDistrictForLesson(lesson);
    const title = escapeHtml(lesson.title);
    const summary = escapeHtml(lesson.summary);
    const grade = lessonGrade(lesson);
    const rewardConfig = rewardByLesson.get(lesson.id);
    const reward = escapeHtml(rewardConfig?.action_cards?.name || lessonRewardPreview(lesson));
    const unlocked = Boolean(rewardConfig && unlockedCardIds.has(rewardConfig.action_card_id));
    const missionCompleted = Boolean(progress?.mission_completed_at);
    const quizPassed = Boolean(progress?.quiz_passed_at);
    return `<a class="hub-lesson-card ${status.key}" href="lesson-player.html?lesson=${encodeURIComponent(lesson.code)}" aria-label="${progress ? "เรียนต่อ" : "เริ่ม"} ${title} ระดับชั้นมัธยมศึกษาปีที่ ${grade}" style="--district:${district.color}"><div class="lesson-card-top"><span>${status.icon} ${status.label}</span><small>${lessonDuration(lesson)} นาที</small></div><div class="lesson-card-tags"><span>ม.${grade}</span><span>${lesson.category === "ethics" ? "AI ETHICS" : "AI IMPACT"}</span></div><p>${district.name}</p><h3>${title}</h3><div class="lesson-objective">${summary}</div><div class="lesson-reward-preview ${unlocked?"unlocked":"locked"}"><span aria-hidden="true">${unlocked?"✓":"✦"}</span><div><small>${unlocked?"ปลดล็อกถาวรแล้ว":"สิทธิ์รางวัลหลังผ่าน Quiz"}</small><b>${reward}</b></div></div>${rewardConfig?`<div class="lesson-stage-status"><span class="${missionCompleted?"done":""}">${missionCompleted?"✓":"○"} เรียนครบ</span><span class="${quizPassed?"done":""}">${quizPassed?"✓":"○"} ผ่าน Quiz ${rewardConfig.minimum_score}/10</span><span class="${unlocked?"done":""}">${unlocked?"✓":"○"} ได้รับการ์ด</span></div>`:""}<div class="lesson-progress-line" aria-label="ความคืบหน้า ${percent}%"><i style="width:${percent}%"></i></div><div class="lesson-card-foot"><span>${percent}%</span><b>${progress ? "เรียนต่อ" : "เริ่มภารกิจ"} →</b><em>${lesson.reward_xp} XP</em></div></a>`;
  }).join("") : `<div class="hub-empty-state"><span>⌁</span><h3>ยังไม่มีภารกิจในตัวกรองนี้</h3><button data-clear-filter>ดูภารกิจทั้งหมด</button></div>`;
  const completed = [...progressByLesson.values()].filter((row) => row.status === "completed").length;
  const started = progressByLesson.size;
  const totalActiveSeconds = [...progressByLesson.values()].reduce((sum, row) => sum + (row.active_seconds || 0), 0);
  const overall = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
  $("#learning-percent").textContent = `${overall}%`;
  $("#hub-progress-ring").style.setProperty("--progress", `${overall * 3.6}deg`);
  $("#learning-summary").textContent = completed ? `เรียนจบแล้ว ${completed} จาก ${lessons.length} ภารกิจ` : started ? `กำลังเรียน ${started} ภารกิจ` : "ยังไม่เริ่มภารกิจ";
  $("#learning-active-time").textContent = `เวลาเรียนแบบมีส่วนร่วม ${Math.floor(totalActiveSeconds / 60)} นาที`;
}

function selectDistrict(id) {
  districtFilter = districtFilter === id ? "all" : id;
  const selected = LEARNING_DISTRICTS.find((item) => item.id === districtFilter);
  $("#catalog-district-label").textContent = selected ? selected.kicker : "ALL DISTRICTS";
  $("#lesson-catalog-title").textContent = selected ? `ภารกิจใน ${selected.name}` : "ภารกิจทั้งหมด";
  renderDistrictMap(); renderLessons();
  $(".lesson-catalog").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
}

document.addEventListener("click", (event) => {
  const district = event.target.closest("[data-district]");
  if (district) selectDistrict(district.dataset.district);
  if (event.target.closest("[data-clear-filter]")) { districtFilter = "all"; statusFilter = "all"; gradeFilter = "all"; $("#grade-filter").value = "all"; document.querySelectorAll("[data-filter]").forEach((button) => { const selected = button.dataset.filter === "all"; button.classList.toggle("active", selected); button.setAttribute("aria-pressed", String(selected)); }); renderDistrictMap(); renderLessons(); }
});
document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => { statusFilter = button.dataset.filter; document.querySelectorAll("[data-filter]").forEach((item) => { const selected = item === button; item.classList.toggle("active", selected); item.setAttribute("aria-pressed", String(selected)); }); renderLessons(); }));
$("#grade-filter").addEventListener("change", (event) => { gradeFilter = event.target.value; renderLessons(); });

try {
  const { user, profile } = await requirePlayer(); setPlayerHeader(profile); setupLogout();
  const [lessonResult, progressResult, rewardResult, unlockResult] = await Promise.all([
    supabase.from("learning_lessons").select("id,code,category,title,summary,content,unlock_order,reward_xp").eq("is_active", true).order("unlock_order"),
    supabase.from("player_learning_progress").select("lesson_id,status,scene_index,active_seconds,mission_completed_at,quiz_passed_at,best_quiz_score,updated_at").eq("user_id", user.id),
    supabase.from("lesson_rewards").select("lesson_id,action_card_id,minimum_score,action_cards(name,card_type,en_cost)").eq("is_active",true),
    supabase.from("user_card_unlocks").select("action_card_id").eq("user_id",user.id),
  ]);
  if (lessonResult.error) throw lessonResult.error;
  if (progressResult.error) throw progressResult.error;
  if (rewardResult.error) throw rewardResult.error;
  if (unlockResult.error) throw unlockResult.error;
  lessons = lessonResult.data || [];
  progressByLesson = new Map((progressResult.data || []).map((row) => [row.lesson_id, row]));
  rewardByLesson = new Map((rewardResult.data || []).map((row)=>[row.lesson_id,row]));
  unlockedCardIds = new Set((unlockResult.data || []).map((row)=>row.action_card_id));
  renderDistrictMap(); renderLessons();
} catch (error) { if (!error.message.endsWith("REQUIRED")) toast(error.message, "error"); }
