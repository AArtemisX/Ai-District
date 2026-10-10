import { supabase } from "./supabase-client.js";

const icon = document.querySelector("#auth-icon");
const title = document.querySelector("#auth-title");
const description = document.querySelector("#auth-description");
const continueButton = document.querySelector("#continue-button");
const backButton = document.querySelector("#back-button");

function paramsFromUrl() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return { query, hash };
}

function showSuccess() {
  icon.dataset.state = "success";
  icon.textContent = "✓";
  title.textContent = "ยืนยันตัวตนสำเร็จแล้ว!";
  description.textContent = "บัญชีของคุณพร้อมออกผจญภัยใน Ai District แล้ว กดปุ่มด้านล่างเพื่อเข้าสู่เกม";
  continueButton.hidden = false;
}

function showError(message) {
  icon.dataset.state = "error";
  icon.textContent = "!";
  title.textContent = "ลิงก์นี้ใช้งานไม่ได้";
  description.textContent = message;
  backButton.hidden = false;
}

async function verify() {
  const { query, hash } = paramsFromUrl();
  const errorDescription = query.get("error_description") || hash.get("error_description");
  if (errorDescription) {
    showError("ลิงก์ยืนยันอาจหมดอายุหรือถูกใช้แล้ว กรุณากลับไปหน้าเข้าสู่ระบบและขออีเมลยืนยันใหม่");
    return;
  }

  const code = query.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      showError("ไม่สามารถยืนยันลิงก์นี้ได้ กรุณาขออีเมลยืนยันใหม่แล้วลองอีกครั้ง");
      return;
    }
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    showError("เกิดปัญหาระหว่างตรวจสอบบัญชี กรุณาลองเปิดลิงก์จากอีเมลอีกครั้ง");
    return;
  }
  if (data.session?.user) {
    showSuccess();
    return;
  }

  window.setTimeout(async () => {
    const { data: retry } = await supabase.auth.getSession();
    retry.session?.user
      ? showSuccess()
      : showError("ลิงก์ยืนยันอาจหมดอายุหรือถูกเปิดคนละเบราว์เซอร์ กรุณาขออีเมลยืนยันใหม่");
  }, 900);
}

verify();
