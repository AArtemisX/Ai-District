import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { activeSavedLoadout, readSavedLoadouts, saveLocalLoadout, validateSavedLoadout } from "./scenario-adventure/saved-loadouts.mjs";
import { CHARACTER_ROSTER } from "./characters/character-roster.js";
import { SCENARIO_LOADOUT_POLICIES } from "./scenario-adventure/loadout-engine.js";

const deck = ["energy-boost","patch-update","firewall-guard","energy-boost","patch-update"];
const inventory = {allowedIds:["patch-update","firewall-guard","energy-boost"],loadoutPolicy:SCENARIO_LOADOUT_POLICIES.LEGACY_COMPAT};
function storage() { const values=new Map(); return {values,getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}; }
const preset = (name="ชุดของฉัน",characterId="milo",cardIds=deck)=>({name,characterId,cardIds});

test("Saved character and custom five-card order survive fresh reads and active restore",()=>{
  const local=storage();
  const result=saveLocalLoadout("user-a",preset(),inventory,local);
  assert.equal(result.ok,true);
  assert.deepEqual(activeSavedLoadout("user-a","milo",inventory,local).cardIds,deck);
  assert.equal(readSavedLoadouts("user-a",local).presets[0].characterId,"milo");
  assert.equal(activeSavedLoadout("user-a","alexander",inventory,local),null);
});
test("Named presets update in place while different names retain separate custom decks",()=>{
  const local=storage();
  const first=saveLocalLoadout("user-a",preset("A"),inventory,local);
  saveLocalLoadout("user-a",preset("B","alexander",[...deck].reverse()),inventory,local);
  const updated=saveLocalLoadout("user-a",preset("A","mamasan",[...deck].reverse()),inventory,local);
  assert.equal(updated.preset.id,first.preset.id);
  assert.equal(readSavedLoadouts("user-a",local).presets.length,2);
  assert.equal(activeSavedLoadout("user-a","mamasan",inventory,local).name,"A");
});
test("Presets are isolated by authenticated account and do not accept a copied account envelope",()=>{
  const local=storage();
  saveLocalLoadout("user-a",preset(),inventory,local);
  assert.deepEqual(readSavedLoadouts("user-b",local).presets,[]);
  saveLocalLoadout("user-b",preset("B","alexander"),inventory,local);
  const aKey=[...local.values.keys()].find(key=>key.endsWith("user-a"));
  const bKey=[...local.values.keys()].find(key=>key.endsWith("user-b"));
  local.values.set(aKey,local.values.get(bKey));
  assert.deepEqual(readSavedLoadouts("user-a",local).presets,[]);
});
test("All Locked characters and invalid names cannot be saved",()=>{
  for(const character of CHARACTER_ROSTER.filter(c=>c.access==="LOCKED")) assert.equal(saveLocalLoadout("user-a",preset("A",character.id),inventory,storage()).ok,false);
  for(const name of ["", "   ", "x".repeat(61)])assert.equal(saveLocalLoadout("user-a",preset(name),inventory,storage()).ok,false);
});
test("Client saved IDs never grant card ownership; restoration revalidates current server policy",()=>{
  const local=storage();
  assert.equal(saveLocalLoadout("user-a",preset("A","milo",[...deck.slice(0,4),"access-denied"]),inventory,local).ok,false);
  const saved=saveLocalLoadout("user-a",preset(),inventory,local).preset;
  assert.equal(validateSavedLoadout({...saved,allowedIds:["access-denied"],cardIds:[...deck.slice(0,4),"access-denied"]},inventory),false);
  assert.equal(activeSavedLoadout("user-a","milo",{...inventory,allowedIds:["patch-update"]},local),null);
  assert.equal(activeSavedLoadout("user-a","milo",{...inventory,loadoutPolicy:SCENARIO_LOADOUT_POLICIES.FIVE_UNIQUE_STARTERS},local),null);
});
test("Corrupt or forged Locked presets are rejected and unavailable storage reports save failure",()=>{
  assert.deepEqual(readSavedLoadouts("user-a",{getItem:()=>"{"}).presets,[]);
  const local=storage();saveLocalLoadout("user-a",preset(),inventory,local);
  const [key]=local.values.keys();const data=JSON.parse(local.values.get(key));
  data.presets[0].characterId="nancy";data.presets[0].unlocked=true;local.values.set(key,JSON.stringify(data));
  assert.deepEqual(readSavedLoadouts("user-a",local).presets,[]);
  const denied={getItem(){throw new Error("Denied");},setItem(){throw new Error("Denied");}};
  assert.equal(saveLocalLoadout("user-a",preset(),inventory,denied).ok,false);
  assert.equal(saveLocalLoadout(null,preset(),inventory,local).ok,false);
});
test("Preset limit preserves existing sets and permits deliberate updates by name",()=>{
  const local=storage();for(let i=0;i<8;i++)assert.equal(saveLocalLoadout("user-a",preset(`ชุด ${i}`),inventory,local).ok,true);
  assert.equal(saveLocalLoadout("user-a",preset("ชุดใหม่"),inventory,local).ok,false);
  assert.equal(saveLocalLoadout("user-a",preset("ชุด 0","alexander"),inventory,local).ok,true);
  assert.equal(readSavedLoadouts("user-a",local).presets.length,8);
});
test("Main Lobby separates saved decks and Ai Word without Legacy selection",()=>{
  const read=file=>readFileSync(new URL(file,import.meta.url),"utf8");
  assert.match(read("./lobby.html"),/portal-card world-portal" href="character-selection.html"/);
  assert.doesNotMatch(read("./lobby.html"),/Legacy District Battle/);
  assert.match(read("./ai-world.html"),/id="world-create-dialog"/);
  assert.match(read("./room.html"),/ai-world\.html/);
  assert.doesNotMatch(read("./ai-world.html"),/id="character-grid"/);
});
