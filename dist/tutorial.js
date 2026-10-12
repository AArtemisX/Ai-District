import { supabase, requirePlayer, toast } from "./flow-common.js";

const slides = [
  { symbol: "AI", title: "AI คือเครื่องมือ ไม่ใช่เวทมนตร์", copy: "ปัญญาประดิษฐ์เรียนรู้รูปแบบจากข้อมูลเพื่อช่วยคาดการณ์ สร้างเนื้อหา และสนับสนุนการตัดสินใจ", points: ["ผลลัพธ์ขึ้นอยู่กับข้อมูลและการออกแบบ", "มนุษย์ยังต้องตรวจสอบและรับผิดชอบ"] },
  { symbol: "⚖", title: "จริยธรรมทำให้ AI น่าเชื่อถือ", copy: "ทุกระบบควรปลอดภัย โปร่งใส เป็นธรรม เคารพความเป็นส่วนตัว และมีผู้รับผิดชอบเมื่อเกิดปัญหา", points: ["มองหาความเสี่ยงก่อนนำไปใช้", "ให้ผู้ได้รับผลกระทบมีเสียง"] },
  { symbol: "◎", title: "ผลกระทบเกิดขึ้นหลายระดับ", copy: "AI เปลี่ยนชีวิตคน สังคม การทำงาน และสิ่งแวดล้อม การตัดสินใจที่ดีจึงต้องมองทั้งผลทันทีและระยะยาว", points: ["วิเคราะห์ว่าใครได้และใครเสีย", "ติดตามผลจริงหลังเปิดใช้งาน"] },
  { symbol: "◇", title: "พร้อมเข้าสู่ Ai District", copy: "เรียนบทเรียนเพื่อปลดล็อกความรู้และไอเทม แล้วใช้สิ่งที่เรียนรู้ใน AI World แบบผลัดกันเล่น", points: ["รับ ARIA เป็นตัวละครเริ่มต้น", "รับไอเทมเริ่มต้น 3 ชิ้น"] },
];

let step = 1;
let user;
const title = document.querySelector("#tutorial-title");
const copy = document.querySelector("#tutorial-copy");
const points = document.querySelector("#tutorial-points");
const next = document.querySelector("#next-button");
const back = document.querySelector("#back-button");

function render() {
  const slide = slides[step - 1];
  document.querySelector("#tutorial-kicker").textContent = `INTRO / ${String(step).padStart(2, "0")}`;
  document.querySelector("#tutorial-symbol").textContent = slide.symbol;
  title.textContent = slide.title;
  copy.textContent = slide.copy;
  points.innerHTML = slide.points.map((item) => `<div><i>✓</i><span>${item}</span></div>`).join("");
  document.querySelectorAll(".tutorial-progress span").forEach((node, index) => node.classList.toggle("active", index < step));
  back.disabled = step === 1;
  next.querySelector("span").textContent = step === slides.length ? "รับ ARIA และเข้าสู่ Lobby" : "ถัดไป";
}

async function saveStep() {
  const { error } = await supabase.from("player_tutorial_progress").upsert({ user_id: user.id, current_step: step });
  if (error) throw error;
}

next.addEventListener("click", async () => {
  next.disabled = true;
  try {
    if (step < slides.length) {
      step += 1;
      await saveStep();
      render();
    } else {
      const finished = new Date().toISOString();
      const { error } = await supabase.from("player_tutorial_progress").update({ completed_at: finished, current_step: 4 }).eq("user_id", user.id);
      if (error) throw error;
      const { error: profileError } = await supabase.from("profiles").update({ selected_character_code: "aria" }).eq("id", user.id);
      if (profileError) throw profileError;
      const savedNext = window.sessionStorage.getItem("ai-district-return-to");
      const safeNext = savedNext && /^(?!\/|\\|[a-z]+:)[\w.-]+\.html(?:[?#].*)?$/i.test(savedNext) ? savedNext : null;
      window.sessionStorage.removeItem("ai-district-return-to");
      window.location.assign(safeNext || "lobby.html?welcome=1");
    }
  } catch (error) { toast(error.message, "error"); } finally { next.disabled = false; }
});
back.addEventListener("click", async () => { if (step > 1) { step -= 1; await saveStep(); render(); } });

try {
  ({ user } = await requirePlayer({ tutorialRequired: false }));
  const { data } = await supabase.from("player_tutorial_progress").select("current_step, completed_at").eq("user_id", user.id).maybeSingle();
  if (data?.completed_at) {
    const savedNext = window.sessionStorage.getItem("ai-district-return-to");
    const safeNext = savedNext && /^(?!\/|\\|[a-z]+:)[\w.-]+\.html(?:[?#].*)?$/i.test(savedNext) ? savedNext : null;
    window.sessionStorage.removeItem("ai-district-return-to");
    window.location.replace(safeNext || "lobby.html");
  }
  step = data?.current_step || 1;
  render();
} catch (error) { if (!error.message.endsWith("REQUIRED")) toast(error.message, "error"); }
