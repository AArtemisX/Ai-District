// Lobby "My squad" panel. Read-only: shows the active saved loadout (character + 5 cards) the
// player will take into Ai Word. Never writes inventory, loadouts or ownership.
import { supabase } from "./supabase-client.js";
import { loadAdventureInventory } from "./scenario-adventure/loadout-client.js";
import { readSavedLoadouts, validateSavedLoadout } from "./scenario-adventure/saved-loadouts.mjs";
import { CHARACTER_BY_ID } from "./characters/character-roster.js";

const TYPE_LABELS = { ATTACK: "โจมตี", DEFENSE: "ป้องกัน", SUPPORT: "สนับสนุน", STRATEGY: "กลยุทธ์", UTILITY: "เสริม" };
const thumb = (src) => (src && src.startsWith("assets/") ? `assets/thumbs/${src.slice("assets/".length)}` : src);

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function cardTile(card, index) {
  const tile = element("article", "lg-card");
  tile.style.setProperty("--i", index);
  const type = String(card?.card_type || card?.prototypeMetadata?.type || "").toUpperCase();
  tile.dataset.type = type || "CARD";
  const art = element("div", "lg-card-art");
  const src = thumb(card?.artwork?.src);
  if (src) {
    const img = element("img");
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => { if (card.artwork?.src && img.src.indexOf("/thumbs/") > -1) img.src = card.artwork.src; }, { once: true });
    art.append(img);
  } else art.append(element("span", "lg-card-glyph", "🃏"));
  tile.append(art, element("b", "", card?.name || "การ์ด"), element("small", "", TYPE_LABELS[type] || type || "ACTION"));
  return tile;
}

function renderEmpty(panel) {
  panel.dataset.state = "empty";
  panel.querySelector(".lg-squad-name").textContent = "ยังไม่มีชุดที่บันทึกไว้";
  panel.querySelector(".lg-squad-preset").textContent = "เลือกตัวละครและจัด Deck 5 ใบก่อนเริ่มเกม";
  const cards = panel.querySelector(".lg-squad-cards");
  cards.replaceChildren(...Array.from({ length: 5 }, (_, index) => {
    const slot = element("div", "lg-card is-empty");
    slot.style.setProperty("--i", index);
    slot.append(element("span", "lg-card-glyph", "＋"));
    return slot;
  }));
}

async function renderSquad() {
  const panel = document.querySelector("#lobby-squad");
  if (!panel) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const inventory = await loadAdventureInventory(user.id);
    const saved = readSavedLoadouts(user.id);
    const presets = saved.presets.filter((preset) => validateSavedLoadout(preset, inventory));
    const preset = presets.find((item) => item.id === saved.activePresetId) || presets[0];
    if (!preset) { renderEmpty(panel); return; }
    const character = CHARACTER_BY_ID[preset.characterId];
    const byId = new Map(inventory.cards.map((card) => [card.id, card]));
    panel.dataset.state = "ready";
    const portrait = panel.querySelector(".lg-squad-portrait img");
    portrait.src = thumb(character?.artwork?.src) || "assets/ai-district-logo.png";
    portrait.alt = character?.displayName || "ตัวละคร";
    if (character?.portrait?.objectPosition) portrait.style.objectPosition = character.portrait.objectPosition;
    panel.querySelector(".lg-squad-name").textContent = character?.displayName || "ตัวละคร";
    panel.querySelector(".lg-squad-preset").textContent = `ชุด "${preset.name}" · ${preset.cardIds.length} การ์ด${presets.length > 1 ? ` · มีทั้งหมด ${presets.length} ชุด` : ""}`;
    panel.querySelector(".lg-squad-cards").replaceChildren(...preset.cardIds.map((id, index) => cardTile(byId.get(id) || { name: id }, index)));
  } catch {
    panel.dataset.state = "error";
    panel.querySelector(".lg-squad-preset").textContent = "โหลดชุดการ์ดไม่สำเร็จ ลองรีเฟรชอีกครั้ง";
  }
}

void renderSquad();
