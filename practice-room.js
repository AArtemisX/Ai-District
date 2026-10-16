import {readSavedLoadouts} from './scenario-adventure/saved-loadouts.mjs';
import {requirePlayer} from "./flow-common.js";
import {CHARACTER_BY_ID} from "./characters/character-roster.js";
import {readScenarioCharacterSelection,writeScenarioCharacterSelection} from "./characters/character-session.js";
import {loadAdventureInventory} from "./scenario-adventure/loadout-client.js";
import {readPracticeSetup,createPracticeRoom,startPracticeRoom,clearPracticeRoom,prepareSavedPractice} from "./scenario-adventure/practice-room.mjs?v=board-events-r3a-final";
const $=selector=>document.querySelector(selector);
let userId=null,inventory=null,setup=null;
function render(){
  $("#practice-summary").replaceChildren();
  const title=document.createElement("strong");title.textContent=CHARACTER_BY_ID[setup.characterId].displayName;$("#practice-summary").append(title);
  const list=document.createElement("ol");for(const id of setup.cardIds){const item=document.createElement("li");item.textContent=inventory.cards.find(c=>c.id===id)?.name||id;list.append(item);}$("#practice-summary").append(list);
  const waiting=setup.status!=="PREPARED";$("#practice-create-form").hidden=waiting;$("#practice-waiting").hidden=!waiting;$("#practice-title").textContent=setup.roomName;$("#practice-create-button").disabled=false;
}
$("#practice-create-form").addEventListener("submit",event=>{
  event.preventDefault();if(!userId||!inventory)return;
  const result=createPracticeRoom(userId,$("#practice-room-name").value,inventory);
  if(!result.ok){$("#practice-message").textContent=result.message;return;}setup=result.room;$("#practice-message").textContent="สร้างห้องฝึกในเครื่องนี้แล้ว";render();
});
$("#practice-start").addEventListener("click",()=>{
  if(!userId||!inventory)return;
  // Refresh means a new local practice match, not a restored multiplayer match.
  if(setup?.status==="STARTED"){const reset=createPracticeRoom(userId,setup.roomName,inventory);if(!reset.ok)return;}
  const selection=readScenarioCharacterSelection();
  if(!selection||selection.characterId!==setup?.characterId){location.replace("character-selection.html");return;}
  if(!startPracticeRoom(userId,inventory)){$("#practice-message").textContent="เริ่มห้องไม่ได้ กรุณาตรวจชุดใหม่";return;}
  location.assign("map-3d.html?mode=scenario-adventure&practice=1");
});
$("#practice-leave").addEventListener("click",()=>{if(userId)clearPracticeRoom(userId);location.assign("lobby.html");});
try {
  const {user}=await requirePlayer();userId=user.id;
  inventory=await loadAdventureInventory(userId);setup=readPracticeSetup(userId,inventory);
  if(!setup)setup=prepareSavedPractice(userId,readSavedLoadouts(userId),inventory);
  if(!setup){$("#practice-summary").textContent="ยังไม่มีชุดการ์ดที่ใช้ได้ตามสิทธิ์ปัจจุบัน";$("#practice-message").textContent="กรุณาเลือกชุดที่บันทึกไว้หรือจัด Deck แล้วกลับมาหน้านี้";}
  else if(!writeScenarioCharacterSelection(setup.characterId))throw Error('SESSION_WRITE_FAILED');
  else render();
}catch(error){if(!String(error.message).endsWith("REQUIRED"))$("#practice-message").textContent=error.message==="PRACTICE_STORAGE_UNAVAILABLE"?"Browser บันทึก Session ห้องฝึกไม่ได้ กรุณาอนุญาตพื้นที่จัดเก็บแล้วลองใหม่":"ตรวจชุดไม่สำเร็จ กรุณากลับไปจัด Deck แล้วลองใหม่";}

// Online remains authoritative; local practice shares board-event rules.
const {onlineRequest,setServerUrl,serverUrl,onlineError}=await import("./scenario-adventure/online-client.js");
$("#online-server").value=serverUrl();
async function enterOnline(join){
 if(!setup||!userId)return;$("#online-create").disabled=true;$("#online-join").disabled=true;
 try {setServerUrl($("#online-server").value);const room=await onlineRequest(join?"join":"create",{characterId:setup.characterId,cardIds:setup.cardIds,roomName:$("#practice-room-name").value,code:$("#online-code").value.trim().toUpperCase()});location.assign("online-room.html?code="+encodeURIComponent(room.code));}
 catch(error){$("#online-message").textContent=onlineError(error);}finally{$("#online-create").disabled=false;$("#online-join").disabled=false;}
}
$("#online-create").addEventListener("click",()=>enterOnline(false));$("#online-join").addEventListener("click",()=>enterOnline(true));

if(setup&&userId){$("#online-create").disabled=false;$("#online-join").disabled=false;}
