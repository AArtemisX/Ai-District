import { CHARACTER_BY_ID, isSelectableCharacter } from "./character-roster.js";

export const SCENARIO_CHARACTER_SESSION_KEY = "aiDistrict.scenario.character.v1";

export function createCharacterSelection(characterId) {
  if (!isSelectableCharacter(characterId)) return null;
  return Object.freeze({ schemaVersion: 1, characterId, selectedAt: new Date().toISOString() });
}

export function parseCharacterSelection(value) {
  try {
    const selection = typeof value === "string" ? JSON.parse(value) : value;
    if (selection?.schemaVersion !== 1 || !isSelectableCharacter(selection.characterId)) return null;
    return { ...selection, character: CHARACTER_BY_ID[selection.characterId] };
  } catch {
    return null;
  }
}

export function readScenarioCharacterSelection(storage = window.sessionStorage) {
  return parseCharacterSelection(storage.getItem(SCENARIO_CHARACTER_SESSION_KEY));
}

export function writeScenarioCharacterSelection(characterId, storage = window.sessionStorage) {
  const selection = createCharacterSelection(characterId);
  if (!selection) return false;
  storage.setItem(SCENARIO_CHARACTER_SESSION_KEY, JSON.stringify(selection));
  return true;
}

