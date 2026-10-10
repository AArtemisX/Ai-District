const playerName = sessionStorage.getItem("neonNexusActivePlayer") || localStorage.getItem("neonNexusPlayer");

if (!playerName) {
  window.location.replace("login.html");
} else {
  const safeName = playerName.trim().slice(0, 18);
  const firstLetter = safeName.charAt(0).toUpperCase();
  document.querySelectorAll("#nav-player-name, #squad-player-name, #welcome-name").forEach((node) => node.textContent = safeName.toUpperCase());
  document.querySelectorAll("#avatar-letter, #squad-avatar").forEach((node) => node.textContent = firstLetter);
}

const toast = document.querySelector("#toast");
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

document.querySelector("#logout-button").addEventListener("click", () => {
  sessionStorage.removeItem("neonNexusActivePlayer");
  window.location.replace("login.html");
});
document.querySelector("#play-button").addEventListener("click", () => showToast("กำลังค้นหาผู้เล่นที่เหมาะสม..."));
document.querySelectorAll(".mode-card").forEach((button) => button.addEventListener("click", () => showToast(`เลือกโหมด ${button.querySelector("b").textContent} แล้ว`)));
document.querySelectorAll(".invite").forEach((button) => button.addEventListener("click", () => showToast("สร้างลิงก์เชิญทีมแล้ว")));
