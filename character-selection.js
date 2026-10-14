import "./page-navigation.js";
import { requirePlayer } from "./flow-common.js";
import { CHARACTER_ACCESS, CHARACTER_ROSTER } from "./characters/character-roster.js";
import { readScenarioCharacterSelection, writeScenarioCharacterSelection } from "./characters/character-session.js";

const gallery = document.querySelector("#character-gallery");
const dialog = document.querySelector("#character-detail");
const confirmButton = document.querySelector("#confirm-character");
const selectedName = document.querySelector("#selected-character-name");
const selectionNote = document.querySelector("#selection-note");
const toast = document.querySelector("#character-toast");
let selectedId = readScenarioCharacterSelection()?.characterId || null;
let detailId = null;

function lockedPreviewMessage(character) {
  return character.unlock?.previewMessage || "ปลดล็อกผ่าน Story Mission ในอนาคต";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function renderRoster() {
  gallery.innerHTML = CHARACTER_ROSTER.map((character) => {
    const locked = character.access === CHARACTER_ACCESS.LOCKED;
    const selected = selectedId === character.id;
    return `<article class="roster-card ${locked ? "is-locked" : "is-free"} ${selected ? "is-selected" : ""}" data-character-id="${character.id}">
      <button class="roster-art-button" type="button" data-character-action="${locked ? "detail" : "select"}" aria-label="${locked ? `ดูรายละเอียด ${character.displayName} ตัวละครยังล็อก` : `เลือก ${character.displayName}`}" aria-pressed="${selected}">
        <img src="${character.artwork.src}" alt="${character.artwork.alt}" width="1058" height="1486" />
        ${locked ? `<span class="locked-overlay" aria-hidden="true"><b>🔒</b><small>${lockedPreviewMessage(character)}</small></span>` : ""}
        ${selected ? `<span class="selected-mark" aria-hidden="true">✓ เลือกแล้ว</span>` : ""}
      </button>
      <div class="roster-card-actions"><span>${locked ? "LOCKED" : "FREE"}</span><button type="button" data-character-action="detail">ดูภาพใหญ่</button></div>
    </article>`;
  }).join("");
  const selected = CHARACTER_ROSTER.find((item) => item.id === selectedId);
  selectedName.textContent = selected?.displayName || "ยังไม่ได้เลือก";
  selectionNote.textContent = selected ? "พร้อมไปยังหน้า Deck Builder — ตัวหมากบนกระดานยังใช้แบบเดิม" : "เลือกตัวละคร Free 1 ตัวเพื่อดำเนินการต่อ";
  confirmButton.disabled = !selected;
}

function selectCharacter(characterId) {
  const character = CHARACTER_ROSTER.find((item) => item.id === characterId);
  if (!character || character.access !== CHARACTER_ACCESS.FREE) {
    showToast("ตัวละครนี้ยังล็อกอยู่และไม่สามารถเลือกเข้าเกมได้");
    return;
  }
  selectedId = characterId;
  renderRoster();
  showToast(`เลือก ${character.displayName} แล้ว`);
}

function openDetails(characterId) {
  const character = CHARACTER_ROSTER.find((item) => item.id === characterId);
  if (!character) return;
  detailId = characterId;
  document.querySelector("#detail-character-art").src = character.artwork.src;
  document.querySelector("#detail-character-art").alt = character.artwork.alt;
  document.querySelector("#detail-character-name").textContent = character.displayName;
  document.querySelector("#detail-character-access").textContent = character.access === CHARACTER_ACCESS.FREE ? "FREE CHARACTER · พร้อมเลือก" : "LOCKED CHARACTER";
  document.querySelector("#detail-character-message").textContent = character.access === CHARACTER_ACCESS.FREE
    ? "ตัวละครเริ่มต้น สามารถใช้เป็น Character Identity สำหรับ Scenario Adventure ได้ทันที"
    : `${lockedPreviewMessage(character)} ภารกิจนี้ยังไม่เปิดรับรางวัลจริง ขณะนี้ดู Artwork ได้แต่ยังเลือกเข้าเกมไม่ได้`;
  const selectButton = document.querySelector("#detail-select-character");
  selectButton.hidden = character.access !== CHARACTER_ACCESS.FREE;
  dialog.showModal();
}

gallery.addEventListener("click", (event) => {
  const action = event.target.closest("[data-character-action]");
  if (!action) return;
  const card = action.closest("[data-character-id]");
  if (action.dataset.characterAction === "select") selectCharacter(card.dataset.characterId);
  else openDetails(card.dataset.characterId);
});

document.querySelector("[data-close-dialog]").addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
document.querySelector("#detail-select-character").addEventListener("click", () => { selectCharacter(detailId); dialog.close(); });
confirmButton.addEventListener("click", () => {
  if (!selectedId || !writeScenarioCharacterSelection(selectedId)) return showToast("กรุณาเลือกตัวละคร Free ก่อน");
  window.location.assign("map-3d.html?mode=scenario-adventure");
});

try {
  await requirePlayer();
  document.querySelector("#free-count").textContent = CHARACTER_ROSTER.filter((item) => item.access === CHARACTER_ACCESS.FREE).length;
  document.querySelector("#locked-count").textContent = CHARACTER_ROSTER.filter((item) => item.access === CHARACTER_ACCESS.LOCKED).length;
  renderRoster();
} catch (error) {
  if (!error.message.endsWith("REQUIRED")) showToast(error.message);
}

