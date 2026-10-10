import { supabase } from "./supabase-client.js";

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

let authMode = "login";

function setMessage(message, type = "error") {
  errorMessage.textContent = message;
  errorMessage.classList.toggle("success", type === "success");
}

function setLoading(isLoading) {
  loginForm.querySelector("button[type='submit']").disabled = isLoading;
  submitLabel.textContent = isLoading
    ? "กำลังเชื่อมต่อ..."
    : authMode === "login" ? "เข้าสู่เกม" : "สร้างบัญชี";
}

function setAuthMode(mode) {
  authMode = mode;
  const isRegistering = mode === "register";
  const isRecovering = mode === "recovery";
  registerFields.hidden = !isRegistering;
  usernameInput.required = isRegistering;
  registerPrompt.textContent = isRegistering || isRecovering ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?";
  registerButton.textContent = isRegistering || isRecovering ? "กลับไปเข้าสู่ระบบ" : "สร้างบัญชีใหม่";
  submitLabel.textContent = isRegistering ? "สร้างบัญชี" : isRecovering ? "ตั้งรหัสผ่านใหม่" : "เข้าสู่เกม";
  setMessage("");
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

async function continueToLobby(user, requestedUsername) {
  await ensureProfile(user, requestedUsername);
  await supabase
    .from("profiles")
    .update({ status: "online", last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
  window.location.assign("lobby.html");
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const username = usernameInput.value.trim();

  if (authMode !== "recovery" && !emailInput.validity.valid) {
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
    if (authMode === "recovery") {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setAuthMode("login");
      setMessage("เปลี่ยนรหัสผ่านแล้ว กรุณาเข้าสู่ระบบอีกครั้ง", "success");
      return;
    }

    if (authMode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login.html`,
          data: { username },
        },
      });
      if (error) throw error;

      if (!data.session) {
        setAuthMode("login");
        setMessage("สร้างบัญชีแล้ว กรุณาเปิดอีเมลเพื่อยืนยันก่อนเข้าสู่เกม", "success");
        return;
      }
      await continueToLobby(data.user, username);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await continueToLobby(data.user);
  } catch (error) {
    const duplicateUsername = error?.code === "23505";
    setMessage(duplicateUsername ? "ชื่อผู้เล่นนี้ถูกใช้แล้ว กรุณาเลือกชื่ออื่น" : (error?.message || "ไม่สามารถเชื่อมต่อ Supabase ได้"));
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

document.querySelector("#forgot-button").addEventListener("click", async () => {
  const email = emailInput.value.trim();
  if (!emailInput.validity.valid) {
    setMessage("กรอกอีเมลก่อนขอรีเซ็ตรหัสผ่าน");
    emailInput.focus();
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login.html`,
  });
  setMessage(error ? error.message : "ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว", error ? "error" : "success");
});

const { data: { session } } = await supabase.auth.getSession();
const isRecoveryLink = window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
if (isRecoveryLink) {
  setAuthMode("recovery");
  setMessage("กรอกรหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร", "success");
} else if (session?.user) {
  try {
    await continueToLobby(session.user);
  } catch (error) {
    setMessage(error?.message || "โหลดข้อมูลผู้เล่นไม่สำเร็จ");
  }
}

