import test from "node:test";
import assert from "node:assert/strict";
import {existsSync,readFileSync} from "node:fs";
import {preparePracticeSetup,readPracticeSetup,createPracticeRoom,startPracticeRoom,clearPracticeRoom} from "./scenario-adventure/practice-room.mjs";
import {resolveGameMode} from "./scenario-adventure/game-mode.js";
const inventory={allowedIds:["patch-update","energy-boost","firewall-guard"]};
const deck=["energy-boost","patch-update","firewall-guard","energy-boost","patch-update"];
function memory(){const data=new Map();return {data,getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};}
test("Deck preparation leads to a named waiting room then a local Bot match preserving exact setup",()=>{
  const storage=memory();assert.equal(preparePracticeSetup("A","mamasan",deck,inventory,storage),true);
  assert.equal(startPracticeRoom("A",inventory,storage),false);
  const result=createPracticeRoom("A","  ห้อง MAMA  ",inventory,storage);
  assert.equal(result.ok,true);assert.equal(result.room.roomName,"ห้อง MAMA");
  assert.equal(startPracticeRoom("A",inventory,storage),true);
  assert.deepEqual(readPracticeSetup("A",inventory,storage).cardIds,deck);
  assert.equal(readPracticeSetup("A",inventory,storage).status,"STARTED");
  assert.equal(readPracticeSetup("A",inventory,storage).characterId,"mamasan");
});
test("Room setup cannot bypass locked character or revoked card ownership and is account-isolated",()=>{
  const storage=memory();assert.equal(preparePracticeSetup("A","nancy",deck,inventory,storage),false);
  assert.equal(preparePracticeSetup("A","milo",[...deck.slice(0,4),"access-denied"],inventory,storage),false);
  preparePracticeSetup("A","milo",deck,inventory,storage);
  assert.equal(readPracticeSetup("B",inventory,storage),null);
  assert.equal(createPracticeRoom("A","room",{allowedIds:["energy-boost"]},storage).ok,false);
  assert.equal(startPracticeRoom("A",{allowedIds:[]},storage),false);
});
test("Invalid names, malformed storage and storage failures cannot produce a room",()=>{
  const storage=memory();preparePracticeSetup("A","milo",deck,inventory,storage);
  for(const name of ["", "   ", "x".repeat(61)])assert.equal(createPracticeRoom("A",name,inventory,storage).ok,false);
  assert.equal(readPracticeSetup("A",inventory,{getItem:()=>"{"}),null);
  assert.equal(preparePracticeSetup("A","milo",deck,inventory,{setItem(){throw new Error("Denied");}}),false);
});
test("Leaving a practice room removes only its session setup",()=>{
  const storage=memory();storage.data.set("savedDeck","keep");preparePracticeSetup("A","milo",deck,inventory,storage);
  assert.equal(clearPracticeRoom("A",storage),true);
  assert.equal(readPracticeSetup("A",inventory,storage),null);
  assert.equal(storage.data.get("savedDeck"),"keep");
});
test("Deck page scroll rules override map clipping and exit links remain sticky",()=>{
  const css=readFileSync(new URL("./scenario-adventure.css",import.meta.url),"utf8");
  assert.match(css,/height:auto;min-height:100%;overflow-x:clip;overflow-y:visible/);
  assert.match(css,/adventure-loadout>header\{position:sticky;top:0/);
});
test("Legacy launch/code and 3-card inventory editor are removed; all map modes use Scenario",()=>{
  for(const file of ["map-3d.js","room.js","map-3d/MapScene.js","map-3d/district-engine.js","map-3d/action-engine.js","map-3d/battle-config.js"])assert.equal(existsSync(new URL(file,import.meta.url)),false,file);
  for(const url of ["","?mode=district-battle","?mode=scenario-adventure"])assert.equal(resolveGameMode(url),"scenario-adventure");
  const read=file=>readFileSync(new URL(file,import.meta.url),"utf8");
  assert.doesNotMatch(read("./card-inventory.js"),/save_action_card_loadout|player_card_loadouts/);
  assert.doesNotMatch(read("./map-3d-entry.js"),/import\("\.\/map-3d\.js/);
  assert.doesNotMatch(read("./friends.js"),/respond_room_invitation|data-room-invite-accept/);
  assert.doesNotMatch(read("./practice-room.js"),/supabase\.rpc|create_ai_room|join_ai_room/);
  assert.doesNotMatch(read("./scenario-adventure/app.js"),/window\.location\.assign\("practice-room\.html"\)/);
  assert.doesNotMatch(read("./ai-world.js"),/create_ai_room|join_ai_room|selected_items/);
});
test('Local Practice restores only an eligible active saved deck without granting locked cards',async()=>{const {prepareSavedPractice}=await import('./scenario-adventure/practice-room.mjs');const storage=memory(),preset={id:'saved-a',name:'ชุดเดิม',characterId:'milo',cardIds:deck};const saved={activePresetId:preset.id,presets:[preset]};const room=prepareSavedPractice('A',saved,inventory,storage);assert.deepEqual(room.cardIds,deck);assert.equal(room.status,'PREPARED');assert.ok(prepareSavedPractice('C',{...saved,activePresetId:null},inventory,storage));assert.throws(()=>prepareSavedPractice('C',saved,inventory,{getItem:()=>null,setItem(){throw Error('quota')}}),/PRACTICE_STORAGE_UNAVAILABLE/);assert.equal(prepareSavedPractice('B',{...saved,presets:[{...preset,characterId:'noah'}]},inventory,storage),null);assert.equal(prepareSavedPractice('B',saved,{allowedIds:[]},storage),null);assert.equal(readPracticeSetup('B',inventory,storage),null);});
