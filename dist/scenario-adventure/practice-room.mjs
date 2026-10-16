import {validateSavedLoadout} from './saved-loadouts.mjs';
import { isSelectableCharacter } from "../characters/character-roster.js";
import { validateAdventureLoadout } from "./loadout-engine.js";
const PREFIX = "aiDistrict.scenario.practiceRoom.v1:";
function storageFor(storage) { return storage ?? window.sessionStorage; }
function key(userId) { if (!userId || typeof userId !== "string") throw new Error("ACCOUNT_REQUIRED"); return PREFIX + encodeURIComponent(userId); }

export function readPracticeSetup(userId, inventory, storage) {
  try {
    const setup = JSON.parse(storageFor(storage).getItem(key(userId)));
    if (setup?.schemaVersion !== 1 || setup.userId !== userId || !isSelectableCharacter(setup.characterId)
      || !Array.isArray(setup.cardIds) || !validateAdventureLoadout(setup.cardIds, inventory.allowedIds, {policy:inventory.loadoutPolicy}).valid
      || !["PREPARED","WAITING","STARTED"].includes(setup.status)
      || (setup.status !== "PREPARED" && (typeof setup.roomName !== "string" || !setup.roomName.trim() || setup.roomName.length > 60))) return null;
    return {schemaVersion:1,userId,characterId:setup.characterId,cardIds:[...setup.cardIds],status:setup.status,roomName:setup.roomName||""};
  } catch { return null; }
}

export function preparePracticeSetup(userId, characterId, cardIds, inventory, storage) {
  try {
    if (!isSelectableCharacter(characterId) || !Array.isArray(cardIds) || !validateAdventureLoadout(cardIds,inventory.allowedIds,{policy:inventory.loadoutPolicy}).valid) return false;
    storageFor(storage).setItem(key(userId),JSON.stringify({schemaVersion:1,userId,characterId,cardIds:[...cardIds],status:"PREPARED",roomName:""}));
    return true;
  } catch { return false; }
}

export function createPracticeRoom(userId, roomName, inventory, storage) {
  const setup=readPracticeSetup(userId,inventory,storage);
  const name=typeof roomName === "string" ? roomName.trim() : "";
  if (!setup || !name || name.length>60) return {ok:false,message:"กรุณาตรวจชุดตัวละคร/Deck และตั้งชื่อห้อง 1–60 ตัวอักษร"};
  try {const room={...setup,roomName:name,status:"WAITING"};storageFor(storage).setItem(key(userId),JSON.stringify(room));return {ok:true,room};}
  catch {return {ok:false,message:"บันทึกห้องฝึกใน Session ไม่สำเร็จ"};}
}

export function startPracticeRoom(userId,inventory,storage) {
  const setup=readPracticeSetup(userId,inventory,storage);
  if (!setup || setup.status!=="WAITING") return false;
  try {storageFor(storage).setItem(key(userId),JSON.stringify({...setup,status:"STARTED"}));return true;}
  catch {return false;}
}

export function clearPracticeRoom(userId,storage) {
  try {storageFor(storage).removeItem(key(userId));return true;}catch{return false;}
}

// Compatibility entry for the separate saved-deck flow; never grants ownership.
export function prepareSavedPractice(userId,saved,inventory,storage){
 const preset=saved.presets.find(p=>p.id===saved.activePresetId&&validateSavedLoadout(p,inventory))||saved.presets.find(p=>validateSavedLoadout(p,inventory));
 if(!preset||!validateSavedLoadout(preset,inventory))return null;
 if(!preparePracticeSetup(userId,preset.characterId,preset.cardIds,inventory,storage))throw Error("PRACTICE_STORAGE_UNAVAILABLE");
 return readPracticeSetup(userId,inventory,storage);
}
