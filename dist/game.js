const loginScreen = document.querySelector("#login-screen");
const lobbyScreen = document.querySelector("#lobby-screen");
const loginForm = document.querySelector("#login-form");
const usernameInput = document.querySelector("#username");
const passwordInput = document.querySelector("#password");
const rememberInput = document.querySelector("#remember");
const errorMessage = document.querySelector("#login-error");
const revealButton = document.querySelector("#reveal-password");
const logoutButton = document.querySelector("#logout-button");
const toast = document.querySelector("#toast");

const savedPlayer = localStorage.getItem("aiDistrictPlayer");
if (savedPlayer) {
  usernameInput.value = savedPlayer;
  rememberInput.checked = true;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function enterLobby(playerName) {
  const safeName = playerName.trim().slice(0, 18);
  const firstLetter = safeName.charAt(0).toUpperCase();
  document.querySelectorAll("#nav-player-name, #squad-player-name, #welcome-name").forEach((node) => {
    node.textContent = safeName.toUpperCase();
  });
  document.querySelectorAll("#avatar-letter, #squad-avatar").forEach((node) => {
    node.textContent = firstLetter;
  });
  loginScreen.hidden = true;
  lobbyScreen.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = usernameInput.value.trim();
  const password = passwordInput.value;
  errorMessage.textContent = "";

  if (name.length < 3) {
    errorMessage.textContent = "ชื่อผู้เล่นต้องมีอย่างน้อย 3 ตัวอักษร";
    usernameInput.focus();
    return;
  }
  if (password.length < 4) {
    errorMessage.textContent = "รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร";
    passwordInput.focus();
    return;
  }

  if (rememberInput.checked) localStorage.setItem("aiDistrictPlayer", name);
  else localStorage.removeItem("aiDistrictPlayer");

  const submitButton = loginForm.querySelector("button[type='submit'] span");
  submitButton.textContent = "กำลังเชื่อมต่อ...";
  window.setTimeout(() => {
    submitButton.textContent = "เข้าสู่เกม";
    enterLobby(name);
  }, 650);
});

revealButton.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  revealButton.textContent = isHidden ? "HIDE" : "SHOW";
  revealButton.setAttribute("aria-label", isHidden ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน");
});

logoutButton.addEventListener("click", () => {
  lobbyScreen.hidden = true;
  loginScreen.hidden = false;
  passwordInput.value = "";
  passwordInput.focus();
});

document.querySelector("#play-button").addEventListener("click", () => showToast("กำลังค้นหาผู้เล่นที่เหมาะสม..."));
document.querySelectorAll(".mode-card").forEach((button) => button.addEventListener("click", () => showToast(`เลือกโหมด ${button.querySelector("b").textContent} แล้ว`)));
document.querySelectorAll(".invite").forEach((button) => button.addEventListener("click", () => showToast("สร้างลิงก์เชิญทีมแล้ว")));
document.querySelector("#forgot-button").addEventListener("click", () => { errorMessage.textContent = "ระบบรีเซ็ตรหัสผ่านยังเป็นเวอร์ชันสาธิต"; });
document.querySelector("#register-button").addEventListener("click", () => { errorMessage.textContent = "ระบบสมัครสมาชิกยังเป็นเวอร์ชันสาธิต"; });
