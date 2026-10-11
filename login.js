import { authRedirectUrl, supabase } from "./supabase-client.js";

const loginForm = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const errorMessage = document.querySelector("#login-error");
const revealButton = document.querySelector("#reveal-password");
const registerButton = document.querySelector("#register-button");
const registerFields = document.querySelector("#register-fields");
const registerPrompt = document.querySelector("#register-prompt");
const submitLabel = loginForm.querySelector("button[type='submit'] span");
const submitButton = loginForm.querySelector("button[type='submit']");
const forgotButton = document.querySelector("#forgot-button");
const resendButton = document.querySelector("#resend-confirmation");
const backButton = document.querySelector("#login-back-button");

let authMode = "login";

backButton?.addEventListener("click", (event) => {
  try {
    const previousUrl = document.referrer ? new URL(document.referrer) : null;
    if (previousUrl?.origin === window.location.origin && window.history.length > 1) {
      event.preventDefault();
      window.history.back();
    }
  } catch {
    // Keep the link's href as the fallback when the referrer is unavailable.
  }
});

function setMessage(message, type = "error") {
  errorMessage.textContent = message;
  errorMessage.classList.toggle("success", type === "success");
  if (!message) resendButton.hidden = true;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  registerButton.disabled = isLoading;
  forgotButton.disabled = isLoading;
  resendButton.disabled = isLoading;
  submitLabel.textContent = isLoading
    ? "กำลังเชื่อมต่อ..."
    : authMode === "login" ? "เข้าสู่เกม" : "สร้างบัญชี";
}

function setAuthMode(mode) {
  authMode = mode;
  const isRegistering = mode === "register";
  registerFields.hidden = !isRegistering;
  usernameInput.required = isRegistering;
  registerPrompt.textContent = isRegistering ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?";
  registerButton.textContent = isRegistering ? "กลับไปเข้าสู่ระบบ" : "สร้างบัญชีใหม่";
  submitLabel.textContent = isRegistering ? "สร้างบัญชี" : "เข้าสู่เกม";
  setMessage("");
}

function authErrorMessage(error) {
  const code = error?.code || "";
  if (code === "email_not_confirmed") return "อีเมลนี้ยังไม่ได้ยืนยัน กรุณาเปิดอีเมลยืนยันหรือกดส่งใหม่ด้านล่าง";
  if (code === "invalid_credentials") return "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
  if (code === "over_email_send_rate_limit") return "ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  if (code === "user_already_exists") return "อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ";
  if (code === "signup_disabled") return "ระบบสมัครสมาชิกถูกปิดชั่วคราว";
  return error?.message || "เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
}

async function ensureProfile(user, requestedUsername) {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (readError) throw readError;
  if (existing) return;

  const fallback = `player_${user.id.replaceAll("-", "").slice(0, 8)}`;
  const username = (requestedUsername || user.user_metadata?.username || fallback).trim();
  const { error: insertError } = await supabase.from("profiles").insert({
    id: user.id,
    username,
    display_name: username,
    avatar_url: user.user_metadata?.avatar_url || null,
  });

  if (insertError?.code === "23505" && username !== fallback) {
    const { error: fallbackError } = await supabase.from("profiles").insert({
      id: user.id,
      username: fallback,
      display_name: fallback,
      avatar_url: user.user_metadata?.avatar_url || null,
    });
    if (fallbackError) throw fallbackError;
    return;
  }
  if (insertError) throw insertError;
}

async function continueToGame(user, requestedUsername) {
  await ensureProfile(user, requestedUsername);
  await supabase
    .from("profiles")
    .update({ status: "online", last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
  const { data: tutorial, error } = await supabase
    .from("player_tutorial_progress")
    .select("completed_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  window.location.assign(tutorial?.completed_at ? "lobby.html" : "tutorial.html");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const username = usernameInput.value.trim();

  if (!emailInput.validity.valid) {
    setMessage("กรุณากรอกอีเมลให้ถูกต้อง");
    emailInput.focus();
    return;
  }
  if (password.length < 6) {
    setMessage("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
    passwordInput.focus();
    return;
  }
  if (authMode === "register" && (username.length < 3 || username.length > 24)) {
    setMessage("ชื่อผู้เล่นต้องมี 3–24 ตัวอักษร");
    usernameInput.focus();
    return;
  }

  setLoading(true);

  try {
    if (authMode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: authRedirectUrl("confirm-email.html"),
          data: { username },
        },
      });
      if (error) throw error;

      if (!data.session) {
        setAuthMode("login");
        setMessage("สร้างบัญชีแล้ว กรุณาเปิดอีเมลเพื่อยืนยันก่อนเข้าสู่เกม", "success");
        return;
      }
      await continueToGame(data.user, username);
      return;
    }

    setMessage("กำลังตรวจสอบบัญชี กรุณารอสักครู่…", "success");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await continueToGame(data.user);
  } catch (error) {
    const duplicateUsername = error?.code === "23505";
    resendButton.hidden = error?.code !== "email_not_confirmed";
    setMessage(duplicateUsername ? "ชื่อผู้เล่นนี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น" : authErrorMessage(error));
  } finally {
    setLoading(false);
  }
});

registerButton.addEventListener("click", () => {
  setAuthMode(authMode === "login" ? "register" : "login");
});

revealButton.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  revealButton.textContent = isHidden ? "HIDE" : "SHOW";
});

forgotButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!emailInput.validity.valid) {
    setMessage("กรอกอีเมลก่อนขอรีเซ็ตรหัสผ่าน");
    emailInput.focus();
    return;
  }

  setLoading(true);
  setMessage("กำลังส่งอีเมลตั้งรหัสผ่านใหม่…", "success");
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: authRedirectUrl("reset-password.html"),
  });
  setMessage(error ? authErrorMessage(error) : "ส่งอีเมลแล้ว กรุณาเปิดลิงก์ในอีเมลเพื่อตั้งรหัสผ่านใหม่", error ? "error" : "success");
  setLoading(false);
});

resendButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!emailInput.validity.valid) {
    setMessage("กรอกอีเมลให้ถูกต้องก่อนส่งอีเมลยืนยันอีกครั้ง");
    return;
  }
  setLoading(true);
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: authRedirectUrl("confirm-email.html") },
  });
  setMessage(error ? authErrorMessage(error) : "ส่งอีเมลยืนยันใหม่แล้ว กรุณาตรวจกล่องจดหมายและ Spam", error ? "error" : "success");
  resendButton.hidden = !error;
  setLoading(false);
});

const { data: { session } } = await supabase.auth.getSession();
if (session?.user) {
  try {
    await continueToGame(session.user);
  } catch (error) {
    setMessage(error?.message || "โหลดข้อมูลผู้เล่นไม่สำเร็จ");
  }
}

