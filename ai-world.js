import { supabase, requirePlayer, setPlayerHeader, setupLogout, toast } from "./flow-common.js";

let user;
let profile;
let selectedCharacter;
const selectedItems = new Set();

function renderCharacters(characters) {
  selectedCharacter ||= profile.selected_character_code || characters[0]?.code;
  document.querySelector("#character-grid").innerHTML = characters.map((character) => `<button class="character-card ${selectedCharacter === character.code ? "selected" : ""}" data-code="${character.code}" style="--accent:${character.accent_color}"><span class="rank">${character.rank}</span><div class="character-orb">${character.name[0]}</div><h3>${character.name}</h3><small>${character.title}</small><p>${character.ability}</p></button>`).join("");
  document.querySelector("#selected-character-label").textContent = characters.find((item) => item.code === selectedCharacter)?.name || "ยังไม่ได้เลือก";
  document.querySelectorAll(".character-card").forEach((button) => button.addEventListener("click", async () => {
    selectedCharacter = button.dataset.code;
    await supabase.from("profiles").update({ selected_character_code: selectedCharacter }).eq("id", user.id);
    renderCharacters(characters);
  }));
}

function renderItems(items) {
  document.querySelector("#item-grid").innerHTML = items.map((row) => `<button class="item-card ${selectedItems.has(row.item_code) ? "selected" : ""}" data-code="${row.item_code}"><span>◇</span><div><h3>${row.game_items.name}</h3><p>${row.game_items.metadata?.description || "ไอเทมสนับสนุน"}</p></div><b>×${row.quantity}</b></button>`).join("");
  document.querySelector("#item-selected-count").textContent = selectedItems.size;
  document.querySelectorAll(".item-card").forEach((button) => button.addEventListener("click", () => {
    if (selectedItems.has(button.dataset.code)) selectedItems.delete(button.dataset.code);
    else if (selectedItems.size < 3) selectedItems.add(button.dataset.code);
    else { toast("เลือกไอเทมได้สูงสุด 3 ชิ้น", "error"); return; }
    renderItems(items);
  }));
}

function roomCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

document.querySelector("#create-room-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedCharacter) { toast("กรุณาเลือกตัวละคร", "error"); return; }
  const button = event.currentTarget.querySelector("button"); button.disabled = true;
  try {
    const { data: room, error: roomError } = await supabase.from("lobby_rooms").insert({ room_code: roomCode(), owner_id: user.id, name: document.querySelector("#room-name").value.trim(), game_mode_code: "ai_world", max_players: 4 }).select().single();
    if (roomError) throw roomError;
    const { error: memberError } = await supabase.from("lobby_members").insert({ room_id: room.id, user_id: user.id, member_role: "leader", is_ready: true });
    if (memberError) throw memberError;
    const { data: session, error: sessionError } = await supabase.from("ai_world_sessions").insert({ owner_id: user.id, room_id: room.id, character_code: selectedCharacter, board_state: { position: 0, insight: 0, energy: 3, items: [...selectedItems] } }).select().single();
    if (sessionError) throw sessionError;
    await supabase.from("lobby_rooms").update({ status: "in_game" }).eq("id", room.id);
    window.location.assign(`game.html?session=${session.id}`);
  } catch (error) { toast(error.message, "error"); button.disabled = false; }
});

document.querySelector("#join-room-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = document.querySelector("#room-code").value.trim().toUpperCase();
  try {
    const { data: room, error } = await supabase.from("lobby_rooms").select("id, status, max_players").eq("room_code", code).maybeSingle();
    if (error || !room) throw new Error("ไม่พบห้องจากรหัสนี้");
    const { count } = await supabase.from("lobby_members").select("user_id", { count: "exact", head: true }).eq("room_id", room.id);
    if ((count || 0) >= room.max_players) throw new Error("ห้องนี้เต็มแล้ว");
    await supabase.from("lobby_members").upsert({ room_id: room.id, user_id: user.id, member_role: "member", is_ready: true });
    const { data: session } = await supabase.from("ai_world_sessions").select("id").eq("room_id", room.id).maybeSingle();
    if (!session) throw new Error("หัวหน้าห้องยังไม่เริ่มเกม กรุณาลองใหม่อีกครั้ง");
    window.location.assign(`game.html?session=${session.id}`);
  } catch (error) { toast(error.message, "error"); }
});

try {
  const player = await requirePlayer(); ({ user, profile } = player); setPlayerHeader(profile); setupLogout();
  const [characters, inventory] = await Promise.all([supabase.from("characters").select("*").order("rank", { ascending: false }), supabase.from("player_inventory").select("item_code, quantity, game_items(name, metadata)").eq("user_id", user.id)]);
  if (characters.error) throw characters.error;
  renderCharacters(characters.data || []); renderItems(inventory.data || []);
} catch (error) { if (!error.message.endsWith("REQUIRED")) toast(error.message, "error"); }
