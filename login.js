const loginForm = document.querySelector("#login-form");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const rememberInput = document.querySelector("#remember");
const errorMessage = document.querySelector("#login-error");
const revealButton = document.querySelector("#reveal-password");

const savedPlayer = localStorage.getItem("neonNexusPlayer");
if (savedPlayer) {
  usernameInput.value = savedPlayer;
  rememberInput.checked = true;
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const playerName = usernameInput.value.trim();
  const password = passwordInput.value;
  errorMessage.textContent = "";

  if (playerName.length < 3) {
    errorMessage.textContent = "ชื่อผู้เล่นต้องมีอย่างน้อย 3 ตัวอักษร";
    usernameInput.focus();
    return;
  }
  if (password.length < 4) {
    errorMessage.textContent = "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร";
    passwordInput.focus();
    return;
  }

  if (rememberInput.checked) localStorage.setItem("neonNexusPlayer", playerName);
  else localStorage.removeItem("neonNexusPlayer");
  sessionStorage.setItem("neonNexusActivePlayer", playerName);
  loginForm.querySelector("button[type='submit'] span").textContent = "กำลังเชื่อมต่อ...";
  window.setTimeout(() => window.location.assign("lobby.html"), 500);
});

revealButton.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  revealButton.textContent = isHidden ? "HIDE" : "SHOW";
});

document.querySelector("#forgot-button").addEventListener("click", () => errorMessage.textContent = "ระบบรีเซ็ตรหัสผ่านยังเป็นเวอร์ชันสาธิต");
document.querySelector("#register-button").addEventListener("click", () => errorMessage.textContent = "ระบบสมัครสมาชิกยังเป็นเวอร์ชันสาธิต");
