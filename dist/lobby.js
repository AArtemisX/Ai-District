import { supabase } from "./supabase-client.js";

const toast = document.querySelector("#toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function showPlayer(profile) {
  const name = (profile.display_name || profile.username).trim().slice(0, 18);
  const firstLetter = name.charAt(0).toUpperCase();
  document.querySelectorAll("#nav-player-name, #squad-player-name, #welcome-name")
    .forEach((node) => node.textContent = name.toUpperCase());
  document.querySelectorAll("#avatar-letter, #squad-avatar")
    .forEach((node) => node.textContent = firstLetter);
  document.querySelector("#player-level").textContent = profile.level;
}

async function loadLobby() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    window.location.replace("login.html");
    return;
  }

  const [profileResult, onlineResult, missionResult] = await Promise.all([
    supabase.from("profiles").select("username, display_name, level, xp, credits").eq("id", user.id).single(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "online"),
    supabase.from("missions").select("id, title, description, target_count, reward_xp").eq("is_active", true).eq("mission_type", "daily").limit(1).maybeSingle(),
  ]);

  if (profileResult.error) {
    showToast(profileResult.error.message);
    return;
  }

  showPlayer(profileResult.data);
  if (onlineResult.count !== null) document.querySelector(".players-online strong").textContent = onlineResult.count.toLocaleString("th-TH");

  const mission = missionResult.data;
  if (mission) {
    const { data: progress } = await supabase
      .from("player_mission_progress")
      .select("progress")
      .eq("user_id", user.id)
      .eq("mission_id", mission.id)
      .maybeSingle();
    const current = Math.min(progress?.progress || 0, mission.target_count);
    const percent = Math.round((current / mission.target_count) * 100);
    document.querySelector("#mission-title").textContent = mission.title;
    document.querySelector("#mission-description").textContent = mission.description || "ทำภารกิจให้สำเร็จเพื่อรับรางวัล";
    document.querySelector("#mission-reward").textContent = `+${mission.reward_xp} XP`;
    document.querySelector("#mission-progress-text").textContent = `${current} / ${mission.target_count}`;
    document.querySelector("#mission-progress-bar").style.width = `${percent}%`;
  }

  await supabase
    .from("profiles")
    .update({ status: "online", last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}

document.querySelector("#logout-button").addEventListener("click", async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("profiles")
      .update({ status: "offline", last_seen_at: new Date().toISOString() })
      .eq("id", user.id);
  }
  await supabase.auth.signOut();
  window.location.replace("login.html");
});

document.querySelector("#play-button").addEventListener("click", () => showToast("กำลังค้นหาผู้เล่นที่เหมาะสม..."));
document.querySelectorAll(".mode-card").forEach((button) => {
  button.addEventListener("click", () => showToast(`เลือกโหมด ${button.querySelector("b").textContent} แล้ว`));
});
document.querySelectorAll(".invite").forEach((button) => {
  button.addEventListener("click", () => showToast("สร้างลิงก์เชิญทีมแล้ว"));
});

await loadLobby();

