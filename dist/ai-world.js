import "./page-navigation.js";
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

document.querySelector("#create-room-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedCharacter) { toast("กรุณาเลือกตัวละคร", "error"); return; }
  const button = event.currentTarget.querySelector("button"); button.disabled = true;
  try {
    const { data, error } = await supabase.rpc("create_ai_room", { room_name: document.querySelector("#room-name").value.trim(), selected_character: selectedCharacter, selected_item_codes: [...selectedItems], desired_players: 4 });
    if (error) throw error;
    window.location.assign(`room.html?code=${encodeURIComponent(data.room_code)}`);
  } catch (error) { toast(error.message, "error"); button.disabled = false; }
});

document.querySelector("#join-room-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const code = document.querySelector("#room-code").value.trim().toUpperCase();
  try {
    if (!selectedCharacter) throw new Error("กรุณาเลือกตัวละคร");
    const { data, error } = await supabase.rpc("join_ai_room", { requested_code: code, selected_character: selectedCharacter, selected_item_codes: [...selectedItems] });
    if (error) throw error;
    window.location.assign(`room.html?code=${encodeURIComponent(data.room_code)}`);
  } catch (error) { toast(error.message, "error"); }
});

try {
  const player = await requirePlayer(); ({ user, profile } = player); setPlayerHeader(profile); setupLogout();
  const [characters, inventory] = await Promise.all([supabase.from("characters").select("*").order("rank", { ascending: false }), supabase.from("player_inventory").select("item_code, quantity, game_items(name, metadata)").eq("user_id", user.id)]);
  if (characters.error) throw characters.error;
  renderCharacters(characters.data || []); renderItems(inventory.data || []);
} catch (error) { if (!error.message.endsWith("REQUIRED")) toast(error.message, "error"); }
