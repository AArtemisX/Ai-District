import { isSelectableCharacter } from "../characters/character-roster.js";
import { validateAdventureLoadout } from "./loadout-engine.js";

const PREFIX = "aiDistrict.scenario.savedLoadouts.v1:";
export const MAX_SAVED_LOADOUTS = 8;
const empty = () => ({ presets: [], activePresetId: null });
function store(storage) { return storage ?? window.localStorage; }
function key(userId) {
  if (typeof userId !== "string" || !userId || userId.length > 128) throw new Error("ACCOUNT_REQUIRED");
  return PREFIX + encodeURIComponent(userId);
}
function validPreset(value) {
  return typeof value?.id === "string" && value.id.length > 0 && value.id.length <= 100
    && typeof value.name === "string" && value.name.trim().length > 0 && value.name.length <= 60
    && isSelectableCharacter(value.characterId)
    && Array.isArray(value.cardIds) && value.cardIds.length === 5
    && value.cardIds.every(id => typeof id === "string" && /^[a-z0-9-]{1,80}$/.test(id));
}

// Preferences only. Saved IDs never add to inventory.allowedIds or ownership.
export function readSavedLoadouts(userId, storage) {
  try {
    const value = JSON.parse(store(storage).getItem(key(userId)));
    if (value?.schemaVersion !== 1 || value.userId !== userId || !Array.isArray(value.presets)) return empty();
    const seen = new Set();
    const presets = value.presets.filter(preset => {
      if (!validPreset(preset) || seen.has(preset.id)) return false;
      seen.add(preset.id); return true;
    }).slice(0, MAX_SAVED_LOADOUTS).map(preset => ({ id: preset.id, name: preset.name.trim(), characterId: preset.characterId, cardIds: [...preset.cardIds] }));
    return { presets, activePresetId: presets.some(p => p.id === value.activePresetId) ? value.activePresetId : null };
  } catch { return empty(); }
}

export function validateSavedLoadout(preset, inventory) {
  return validPreset(preset) && validateAdventureLoadout(preset.cardIds, inventory.allowedIds, { policy: inventory.loadoutPolicy }).valid;
}

export function saveLocalLoadout(userId, { name, characterId, cardIds }, inventory, storage) {
  try {
    const trimmedName = typeof name === "string" ? name.trim() : "";
    if (!trimmedName || trimmedName.length > 60 || !isSelectableCharacter(characterId)
      || !Array.isArray(cardIds) || !validateAdventureLoadout(cardIds, inventory.allowedIds, { policy: inventory.loadoutPolicy }).valid) return { ok: false, message: "กรุณาตั้งชื่อชุด เลือกตัวละครเริ่มต้น และจัดการ์ดที่มีสิทธิ์ให้ครบ 5 ใบ" };
    const saved = readSavedLoadouts(userId, storage);
    const existing = saved.presets.find(p => p.name === trimmedName);
    if (!existing && saved.presets.length >= MAX_SAVED_LOADOUTS) return { ok: false, message: "บันทึกได้สูงสุด 8 ชุด ใช้ชื่อชุดเดิมเพื่ออัปเดต" };
    const preset = { id: existing?.id || `preset-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, name: trimmedName, characterId, cardIds: [...cardIds] };
    const presets = existing ? saved.presets.map(p => p.id === existing.id ? preset : p) : [...saved.presets, preset];
    store(storage).setItem(key(userId), JSON.stringify({ schemaVersion: 1, userId, presets, activePresetId: preset.id }));
    return { ok: true, preset };
  } catch { return { ok: false, message: "Browser ไม่อนุญาตให้บันทึกในเครื่อง ชุดนี้ยังไม่ได้บันทึก" }; }
}

export function activeSavedLoadout(userId, characterId, inventory, storage) {
  const saved = readSavedLoadouts(userId, storage);
  const active = saved.presets.find(p => p.id === saved.activePresetId);
  return active?.characterId === characterId && validateSavedLoadout(active, inventory) ? active : null;
}
