import "./page-navigation.js";
import { requirePlayer, supabase } from "./flow-common.js";
import { CHARACTER_ACCESS, CHARACTER_ROSTER } from "./characters/character-roster.js";
import { characterOwnershipState, loadCharacterOwnership, ownershipSnapshot } from "./characters/character-ownership.mjs";
import { readScenarioCharacterSelection, writeScenarioCharacterSelection } from "./characters/character-session.js";
import { readSavedLoadouts } from "./scenario-adventure/saved-loadouts.mjs";

const gallery = document.querySelector("#character-gallery");
const dialog = document.querySelector("#character-detail");
const confirmButton = document.querySelector("#confirm-character");
const selectedName = document.querySelector("#selected-character-name");
const selectionNote = document.querySelector("#selection-note");
const toast = document.querySelector("#character-toast");
let selectedId = readScenarioCharacterSelection()?.characterId || null;
let detailId = null;
let currentUserId = null;
let ownership = ownershipSnapshot(null);
let ownershipRequest = 0;

function accessState(character) {
  return characterOwnershipState(character.id, ownership, currentUserId);
}

// Phase 5C foundation: ownership can be displayed, but gameplay rollout stays closed.
function canSelect(character) {
  return Boolean(currentUserId) && character?.access === CHARACTER_ACCESS.FREE;
}

function accessMessage(character) {
  const state = accessState(character);
  if (state === "LOADING") return "กำลังตรวจสิทธิ์ตัวละคร";
  if (state === "ERROR") return "ยังตรวจสิทธิ์ไม่ได้ ลองใหม่ได้ โดยยังเลือกตัวละครเริ่มต้นได้";
  if (state === "UNLOCKED") return "มีสิทธิ์ตัวละครแล้ว การเลือกเข้าเกมจะเปิดในขั้นถัดไป";
  return lockedPreviewMessage(character);
}

async function refreshOwnership() {
  const request = ++ownershipRequest;
  const userId = currentUserId;
  ownership = ownershipSnapshot(userId);
  renderRoster();
  const result = await loadCharacterOwnership(supabase, userId);
  if (request !== ownershipRequest || userId !== currentUserId) return;
  ownership = result;
  renderRoster();
  if (dialog.open && detailId) updateDetails(detailId);
}

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
    const locked = !canSelect(character);
    const state = accessState(character);
    const selected = selectedId === character.id;
    return `<article class="roster-card ${locked ? "is-locked" : "is-free"} ${selected ? "is-selected" : ""}" data-character-id="${character.id}" data-access-state="${state}">
      <button class="roster-art-button" type="button" data-character-action="${locked ? "detail" : "select"}" aria-label="${locked ? `ดูรายละเอียด ${character.displayName} ตัวละครยังล็อก` : `เลือก ${character.displayName}`}" aria-pressed="${selected}">
        <img src="${character.artwork.src}" alt="${character.artwork.alt}" width="1058" height="1486" />
        ${locked ? `<span class="locked-overlay" aria-hidden="true"><b>${state === "UNLOCKED" ? "✓" : "🔒"}</b><small>${accessMessage(character)}</small></span>` : ""}
        ${selected ? `<span class="selected-mark" aria-hidden="true">✓ เลือกแล้ว</span>` : ""}
      </button>
      <div class="roster-card-actions"><span>${state}</span><button type="button" data-character-action="detail">ดูภาพใหญ่</button></div>
    </article>`;
  }).join("");
  const selected = CHARACTER_ROSTER.find((item) => item.id === selectedId);
  selectedName.textContent = selected?.displayName || "ยังไม่ได้เลือก";
  selectionNote.textContent = selected ? "พร้อมไปยังหน้า Deck Builder — ตัวหมากบนกระดานยังใช้แบบเดิม" : "เลือกตัวละคร Free 1 ตัวเพื่อดำเนินการต่อ";
  confirmButton.disabled = !canSelect(selected);
  document.querySelector("#ownership-status").textContent = ownership.status === "LOADING"
    ? "กำลังตรวจสิทธิ์ตัวละคร…" : ownership.status === "ERROR"
      ? "ยังตรวจสิทธิ์ตัวละครเพิ่มเติมไม่ได้ ตัวละครเริ่มต้นยังเลือกได้" : "ตรวจสิทธิ์ตัวละครแล้ว";
  document.querySelector("#retry-ownership").hidden = ownership.status !== "ERROR" || !currentUserId;
  document.querySelector("#locked-count").textContent = CHARACTER_ROSTER.filter((item) => item.access !== CHARACTER_ACCESS.FREE && accessState(item) !== "UNLOCKED").length;
}

function selectCharacter(characterId) {
  const character = CHARACTER_ROSTER.find((item) => item.id === characterId);
  if (!canSelect(character)) {
    showToast("ตัวละครนี้ยังล็อกอยู่และไม่สามารถเลือกเข้าเกมได้");
    return;
  }
  selectedId = characterId;
  renderRoster();
  showToast(`เลือก ${character.displayName} แล้ว`);
}

function updateDetails(characterId) {
  const character = CHARACTER_ROSTER.find((item) => item.id === characterId);
  if (!character) return;
  detailId = characterId;
  document.querySelector("#detail-character-art").src = character.artwork.src;
  document.querySelector("#detail-character-art").alt = character.artwork.alt;
  document.querySelector("#detail-character-name").textContent = character.displayName;
  document.querySelector("#detail-character-access").textContent = `${accessState(character)} CHARACTER`;
  document.querySelector("#detail-character-message").textContent = character.access === CHARACTER_ACCESS.FREE
    ? "ตัวละครเริ่มต้น สามารถใช้เป็น Character Identity สำหรับ Scenario Adventure ได้ทันที"
    : `${accessMessage(character)} ภารกิจนี้ยังไม่เปิดรับรางวัลจริง ขณะนี้ดู Artwork ได้แต่ยังเลือกเข้าเกมไม่ได้`;
  const selectButton = document.querySelector("#detail-select-character");
  selectButton.hidden = !canSelect(character);
}

function openDetails(characterId) {
  if (!CHARACTER_ROSTER.some((item) => item.id === characterId)) return;
  updateDetails(characterId);
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
  if (!canSelect(CHARACTER_ROSTER.find((item) => item.id === selectedId)) || !writeScenarioCharacterSelection(selectedId)) return showToast("กรุณาเลือกตัวละคร Free ก่อน");
  window.location.assign("map-3d.html?mode=scenario-adventure");
});
document.querySelector("#retry-ownership").addEventListener("click", refreshOwnership);
document.querySelector("#continue-saved-loadout").addEventListener("click", () => {
  const saved = readSavedLoadouts(currentUserId);
  const preset = saved.presets.find(p => p.id === saved.activePresetId);
  if (!preset || !canSelect(CHARACTER_ROSTER.find(c => c.id === preset.characterId)) || !writeScenarioCharacterSelection(preset.characterId)) return showToast("ยังเปิดชุดที่บันทึกไม่ได้ กรุณาเลือกตัวละครเริ่มต้น");
  window.location.assign("map-3d.html?mode=scenario-adventure");
});

try {
  const { user } = await requirePlayer();
  currentUserId = user.id;
  const saved = readSavedLoadouts(user.id);
  const active = saved.presets.find(p => p.id === saved.activePresetId);
  const continueButton = document.querySelector("#continue-saved-loadout");
  continueButton.hidden = !active;
  if (active) continueButton.textContent = `ใช้ชุดที่บันทึก: ${active.name}`;
  document.querySelector("#free-count").textContent = CHARACTER_ROSTER.filter((item) => item.access === CHARACTER_ACCESS.FREE).length;
  document.querySelector("#locked-count").textContent = CHARACTER_ROSTER.filter((item) => item.access === CHARACTER_ACCESS.LOCKED).length;
  supabase.auth.onAuthStateChange((_event, session) => {
    const userId = session?.user?.id || null;
    if (userId === currentUserId) return;
    currentUserId = userId;
    selectedId = null;
    ++ownershipRequest;
    ownership = ownershipSnapshot(userId, "ERROR");
    renderRoster();
    if (dialog.open && detailId) updateDetails(detailId);
    // Reload through requirePlayer so account/profile/tutorial checks run again.
    window.location.reload();
  });
  await refreshOwnership();
} catch (error) {
  if (!error.message.endsWith("REQUIRED")) showToast(error.message);
}

