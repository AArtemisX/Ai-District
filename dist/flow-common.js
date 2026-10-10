import { supabase } from "./supabase-client.js";

export { supabase };

export async function requirePlayer({ tutorialRequired = true } = {}) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    window.location.replace("login.html");
    throw new Error("AUTH_REQUIRED");
  }
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, username, display_name, level, xp, credits, selected_character_code")
    .eq("id", user.id)
    .single();
  if (profileError) throw profileError;
  if (tutorialRequired) {
    const { data: tutorial } = await supabase.from("player_tutorial_progress").select("completed_at").eq("user_id", user.id).maybeSingle();
    if (!tutorial?.completed_at) {
      window.location.replace("tutorial.html");
      throw new Error("TUTORIAL_REQUIRED");
    }
  }
  return { user, profile };
}

export function setPlayerHeader(profile) {
  const name = (profile.display_name || profile.username || "PLAYER").trim();
  document.querySelectorAll("[data-player-name]").forEach((node) => node.textContent = name.toUpperCase());
  document.querySelectorAll("[data-player-avatar]").forEach((node) => node.textContent = name.charAt(0).toUpperCase());
}

export function toast(message, type = "info") {
  const node = document.querySelector("#toast");
  if (!node) return;
  node.textContent = message;
  node.dataset.type = type;
  node.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove("show"), 2800);
}

export function setupLogout() {
  document.querySelector("#logout-button")?.addEventListener("click", async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ status: "offline", last_seen_at: new Date().toISOString() }).eq("id", user.id);
    await supabase.auth.signOut();
    window.location.replace("login.html");
  });
}
