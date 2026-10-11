import "./page-navigation.js";
import { supabase, requirePlayer, setPlayerHeader, setupLogout, toast } from "./flow-common.js";

let user;
let lessons = [];
let completed = new Set();
let selectedLesson;
let filter = "all";

function isUnlocked(lesson) {
  return lesson.unlock_order === 1 || completed.has(lessons.find((item) => item.unlock_order === lesson.unlock_order - 1)?.id) || completed.has(lesson.id);
}

function renderLessons() {
  const visible = lessons.filter((lesson) => filter === "all" || lesson.category === filter);
  document.querySelector("#lesson-grid").innerHTML = visible.map((lesson) => {
    const done = completed.has(lesson.id);
    const unlocked = isUnlocked(lesson);
    return `<button class="lesson-card ${done ? "done" : ""} ${unlocked ? "" : "locked"}" data-id="${lesson.id}" ${unlocked ? "" : "disabled"}><span class="lesson-index">${String(lesson.unlock_order).padStart(2, "0")}</span><span class="lesson-status">${done ? "✓ สำเร็จ" : unlocked ? "พร้อมเรียน" : "🔒 ล็อก"}</span><small>${lesson.category === "ethics" ? "AI ETHICS" : "AI IMPACT"}</small><h2>${lesson.title}</h2><p>${lesson.summary}</p><b>${done ? "ทบทวนอีกครั้ง" : "เริ่มบทเรียน"} →</b></button>`;
  }).join("");
  document.querySelectorAll(".lesson-card:not(:disabled)").forEach((button) => button.addEventListener("click", () => openLesson(Number(button.dataset.id))));
  document.querySelector("#learning-percent").textContent = `${Math.round((completed.size / lessons.length) * 100) || 0}%`;
}

function openLesson(id) {
  selectedLesson = lessons.find((item) => item.id === id);
  document.querySelector("#dialog-category").textContent = selectedLesson.category === "ethics" ? "AI ETHICS" : "AI IMPACT";
  document.querySelector("#dialog-title").textContent = selectedLesson.title;
  document.querySelector("#dialog-summary").textContent = selectedLesson.summary;
  document.querySelector("#dialog-scenario").textContent = selectedLesson.content.scenario;
  const correct = selectedLesson.content.answer;
  const distractors = ["ปล่อยให้ระบบตัดสินใจเองเพื่อความรวดเร็ว", "เก็บรายละเอียดไว้ภายในและไม่ต้องแจ้งผู้ใช้"];
  const answers = [correct, ...distractors].sort(() => Math.random() - .5);
  document.querySelector("#answer-list").innerHTML = answers.map((answer) => `<button data-correct="${answer === correct}">${answer}</button>`).join("");
  const completeButton = document.querySelector("#complete-lesson");
  completeButton.disabled = !completed.has(id);
  completeButton.querySelector("span").textContent = completed.has(id) ? "ทบทวนเสร็จแล้ว" : "ตอบให้ถูกเพื่อจบบทเรียน";
  document.querySelectorAll("#answer-list button").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll("#answer-list button").forEach((item) => item.classList.remove("selected", "wrong"));
    button.classList.add(button.dataset.correct === "true" ? "selected" : "wrong");
    completeButton.disabled = button.dataset.correct !== "true";
    completeButton.querySelector("span").textContent = button.dataset.correct === "true" ? "ยืนยันคำตอบและรับ XP" : "ลองคิดอีกครั้ง";
  }));
  document.querySelector("#lesson-dialog").showModal();
}

document.querySelector("#complete-lesson").addEventListener("click", async () => {
  const button = document.querySelector("#complete-lesson");
  button.disabled = true;
  const { error } = await supabase.from("player_learning_progress").upsert({ user_id: user.id, lesson_id: selectedLesson.id, status: "completed", score: 100, completed_at: new Date().toISOString() });
  if (error) { toast(error.message, "error"); button.disabled = false; return; }
  completed.add(selectedLesson.id);
  document.querySelector("#lesson-dialog").close();
  renderLessons();
  toast(`ผ่านบทเรียน “${selectedLesson.title}” และปลดล็อกบทถัดไปแล้ว`);
});
document.querySelector("#close-dialog").addEventListener("click", () => document.querySelector("#lesson-dialog").close());
document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => { filter = button.dataset.filter; document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button)); renderLessons(); }));

try {
  const player = await requirePlayer(); user = player.user; setPlayerHeader(player.profile); setupLogout();
  const [lessonResult, progressResult] = await Promise.all([supabase.from("learning_lessons").select("*").order("unlock_order"), supabase.from("player_learning_progress").select("lesson_id").eq("user_id", user.id).eq("status", "completed")]);
  if (lessonResult.error) throw lessonResult.error;
  lessons = lessonResult.data || [];
  completed = new Set((progressResult.data || []).map((row) => row.lesson_id));
  renderLessons();
} catch (error) { if (!error.message.endsWith("REQUIRED")) toast(error.message, "error"); }
