import { supabase } from "./supabase-client.js";

const icon = document.querySelector("#auth-icon");
const title = document.querySelector("#auth-title");
const description = document.querySelector("#auth-description");
const form = document.querySelector("#reset-form");
const password = document.querySelector("#new-password");
const confirmPassword = document.querySelector("#confirm-password");
const message = document.querySelector("#reset-message");
const backButton = document.querySelector("#back-button");
const submitButton = form.querySelector("button[type='submit']");

function showError(text) {
  icon.dataset.state = "error";
  icon.textContent = "!";
  title.textContent = "ลิงก์ตั้งรหัสผ่านใช้ไม่ได้";
  description.textContent = text;
  form.hidden = true;
  backButton.hidden = false;
}

async function prepareRecovery() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  if (query.get("error") || hash.get("error")) {
    showError("ลิงก์อาจหมดอายุหรือถูกใช้แล้ว กรุณากลับไปขอลิงก์ใหม่จากหน้าเข้าสู่ระบบ");
    return;
  }

  const code = query.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      showError("ไม่สามารถเปิดลิงก์นี้ได้ กรุณาขอลิงก์ตั้งรหัสผ่านใหม่อีกครั้ง");
      return;
    }
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) {
    window.setTimeout(async () => {
      const { data: retry } = await supabase.auth.getSession();
      if (!retry.session?.user) {
        showError("ไม่พบสิทธิ์สำหรับเปลี่ยนรหัสผ่าน กรุณาขอลิงก์ใหม่และเปิดด้วยเบราว์เซอร์เดิม");
        return;
      }
      showForm();
    }, 900);
    return;
  }
  showForm();
}

function showForm() {
  icon.dataset.state = "success";
  icon.textContent = "✦";
  description.textContent = "สร้างรหัสผ่านใหม่ที่จำง่ายสำหรับคุณและคาดเดายากสำหรับผู้อื่น";
  form.hidden = false;
  password.focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  message.classList.remove("success");
  if (password.value.length < 8) {
    message.textContent = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    return;
  }
  if (password.value !== confirmPassword.value) {
    message.textContent = "รหัสผ่านทั้งสองช่องไม่ตรงกัน";
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "กำลังบันทึก…";
  const { error } = await supabase.auth.updateUser({ password: password.value });
  if (error) {
    message.textContent = error.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่";
    submitButton.disabled = false;
    submitButton.textContent = "บันทึกรหัสผ่านใหม่";
    return;
  }

  await supabase.auth.signOut({ scope: "local" });
  form.hidden = true;
  icon.textContent = "✓";
  title.textContent = "เปลี่ยนรหัสผ่านสำเร็จแล้ว!";
  description.textContent = "รหัสผ่านใหม่พร้อมใช้งาน คุณสามารถกลับไปเข้าสู่ระบบได้ทันที";
  backButton.hidden = false;
});

prepareRecovery();
