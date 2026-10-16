import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { GAME_MODES, resolveGameMode } from "./scenario-adventure/game-mode.js";
import { CHARACTER_ROSTER } from "./characters/character-roster.js";
import { SCENARIO_CHARACTER_SESSION_KEY, parseCharacterSelection, readScenarioCharacterSelection, writeScenarioCharacterSelection } from "./characters/character-session.js";
import { activeSavedLoadout, readSavedLoadouts, saveLocalLoadout, validateSavedLoadout } from "./scenario-adventure/saved-loadouts.mjs";
import {preparePracticeSetup,readPracticeSetup} from "./scenario-adventure/practice-room.mjs";
import { SCENARIO_LOADOUT_POLICIES, SCENARIO_LOADOUT_SIZE, maxCopiesForScenarioPolicy, validateAdventureLoadout } from "./scenario-adventure/loadout-engine.js";

const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const selection = (id) => parseCharacterSelection({ schemaVersion: 1, characterId: id });
const stripImports = (source) => source.replace(/^import .*;\r?\n/gm, "");

async function entry(search, current) {
  const imports = [], redirects = [];
  const source = stripImports(read("./map-3d-entry.js")).replace(/await import\(/g, "await loadModule(");
  await new AsyncFunction("GAME_MODES", "resolveGameMode", "readScenarioCharacterSelection", "window", "document", "loadModule", source)(
    GAME_MODES, resolveGameMode, () => current, { location: { search, replace: (url) => redirects.push(url) } }, { documentElement: { dataset: {} } }, async (url) => imports.push(url));
  return { imports, redirects };
}

async function appHarness({ current = selection("milo"), afterInventory, save } = {}) {
  const redirects = [], renders = [];
  let inventoryReads = 0;
  const inventory = { cards: ["patch-update","firewall-guard","energy-boost"].map(id=>({ id, name:id, en_cost:0 })), allowedIds: ["patch-update","firewall-guard","energy-boost"], loadout: ["patch-update","patch-update","firewall-guard","firewall-guard","energy-boost"], loadoutPolicy: SCENARIO_LOADOUT_POLICIES.LEGACY_COMPAT, persistenceReady: false };
  const html = (strings, ...values) => ({ strings, values });
  const stored = new Map();
  const storage = {getItem:key=>stored.get(key)||null,setItem:(key,value)=>stored.set(key,value)};
  const dependencies = {
    createRoot: () => ({ render: value => renders.push(value) }), requirePlayer: async () => ({ user: { id: "qa-user" } }),
    readScenarioCharacterSelection: () => current, ACTION_CARD_BY_ID: {}, buildTilePath() {}, html,
    writeScenarioCharacterSelection: id=>{current=selection(id);return Boolean(current);},
    readSavedLoadouts: userId=>readSavedLoadouts(userId,storage), activeSavedLoadout: (userId,id,inventory)=>activeSavedLoadout(userId,id,inventory,storage),
    saveLocalLoadout: (userId,preset,inventory)=>saveLocalLoadout(userId,preset,inventory,storage), validateSavedLoadout,
    preparePracticeSetup:(userId,id,cards,inventory)=>preparePracticeSetup(userId,id,cards,inventory,storage),readPracticeSetup:(userId,inventory)=>readPracticeSetup(userId,inventory,storage),
    React: { useEffect() {}, useMemo(fn) { return fn(); }, useRef(value) { return { current:value }; }, useState(initial) { return [typeof initial === "function" ? initial() : initial, () => {}]; } },
    nextTurn() {}, rollDie() {}, ScenarioAdventureScene() {}, cancelCardSelection() {}, consumeSelectedCard() {}, countDeckCards() {}, createDeckState() {}, prepareDeckForTurn() {}, selectCardInstance() {},
    loadAdventureInventory: async () => { inventoryReads++; if (afterInventory !== undefined) current = afterInventory; return inventory; },
    saveAdventureLoadout: async () => { if (save) return await save(value=>{current=value;}); return { ok:true }; },
    SCENARIO_LOADOUT_POLICIES, SCENARIO_LOADOUT_SIZE, maxCopiesForScenarioPolicy, validateAdventureLoadout,
    RESPONSE_TYPES: {}, chooseBotResponse() {}, createResponseSelection() {}, resolveScenarioResponse() {}, createScenarioAdventureMatch() {}, recordScenarioUse() {}, selectAdventureScenario() {}, createScenarioRepository: () => ({}),
    document: { querySelector: () => ({ innerHTML: "" }) }, window: { location: { replace: url=>redirects.push(url) } },
  };
  const api = await new AsyncFunction(...Object.keys(dependencies), stripImports(read("./scenario-adventure/app.js")) + "\nreturn { LoadoutScreen, identity:()=>characterSelection };")(...Object.values(dependencies));
  return { ...api, readPresets:()=>readSavedLoadouts("qa-user",storage), inventory, redirects, renders, inventoryReads, setSelection(value) { current=value; } };
}
function startButton(tree) {
  if (!tree?.strings) return null;
  if (tree.strings.join("").includes('button className="primary"')) return tree.values.findLast(value=>typeof value === "function");
  for (const value of tree.values) {
    for (const child of Array.isArray(value) ? value : [value]) { const found = startButton(child); if (found) return found; }
  }
  return null;
}

test("Free Session IDs preserve canonical identity and ignore forged display/ownership data", () => {
  for (const id of ["alexander","mamasan","milo"]) {
    const selected = parseCharacterSelection({ schemaVersion:1, characterId:id, character:{ displayName:"Nancy" }, unlocked:true });
    assert.equal(selected.character.id,id);
    assert.notEqual(selected.character.displayName,"Nancy");
  }
});
test("All six locked IDs remain rejected even with client unlock flags", () => {
  for (const { id } of CHARACTER_ROSTER.filter(c=>c.access === "LOCKED")) {
    assert.equal(parseCharacterSelection({schemaVersion:1,characterId:id,unlocked:true,ownershipStatus:"UNLOCKED",passed:true}),null);
    assert.equal(writeScenarioCharacterSelection(id,{setItem(){throw new Error("Must not write");}}),false);
  }
});
test("Missing, malformed, unknown and wrong-version Sessions fail safely", () => {
  for (const value of [null,"{",JSON.stringify({schemaVersion:2,characterId:"milo"}),JSON.stringify({schemaVersion:1,characterId:"unknown"})]) {
    assert.equal(readScenarioCharacterSelection({getItem:key=>{assert.equal(key,SCENARIO_CHARACTER_SESSION_KEY);return value;}}),null);
  }
  assert.equal(readScenarioCharacterSelection({getItem(){throw new Error("Storage denied");}}),null);
  assert.equal(writeScenarioCharacterSelection("milo",{setItem(){throw new Error("Storage denied");}}),false);
});
test("Scenario entry imports only Scenario app for each selected Free identity without asking again", async () => {
  for (const id of ["alexander","mamasan","milo"]) {
    const result = await entry("?mode=scenario-adventure",selection(id));
    assert.deepEqual(result.redirects,[]);
    assert.equal(result.imports.length,1);
    assert.match(result.imports[0],/scenario-adventure\/app\.js/);
  }
});
test("Invalid Scenario Session redirects; old/default mode URLs now enter Scenario only", async () => {
  const invalid = await entry("?mode=scenario-adventure",selection("nancy"));
  assert.deepEqual(invalid.redirects,["character-selection.html"]);
  assert.deepEqual(invalid.imports,[]);
  for (const search of ["","?mode=district-battle"]) {
    const oldUrl = await entry(search,selection("milo"));
    assert.deepEqual(oldUrl.redirects,[]);
    assert.equal(oldUrl.imports.length,1);
    assert.match(oldUrl.imports[0],/scenario-adventure\/app\.js/);
  }
});
test("App rechecks Session after Auth and after inventory loading without mounting invalid identity", async () => {
  const absent = await appHarness({current:null});
  assert.equal(absent.inventoryReads,0);
  assert.equal(absent.renders.length,0);
  assert.deepEqual(absent.redirects,["character-selection.html"]);
  const expired = await appHarness({afterInventory:null});
  assert.equal(expired.renders.length,0);
  assert.deepEqual(expired.redirects,["character-selection.html"]);
});
test("Deck save persists selected identity and cards without starting a room", async () => {
  for (const id of ["alexander","mamasan","milo"]) {
    const app = await appHarness({current:selection(id)});
    const started = [];
    const tree = app.LoadoutScreen({inventory:app.inventory,initialLoadout:app.inventory.loadout,onStart:deck=>started.push(deck),userId:"qa-user"});
    await startButton(tree)();
    assert.equal(app.identity().characterId,id);
    assert.deepEqual(started,[]);
    assert.equal(app.readPresets().presets[0].characterId,id);
    assert.deepEqual(app.readPresets().presets[0].cardIds,app.inventory.loadout);
    assert.deepEqual(app.redirects,[]);
  }
});
test("Invalid Session before Deck confirmation cannot proceed to a practice room", async () => {
  const app = await appHarness();
  let starts=0;
  const tree = app.LoadoutScreen({inventory:app.inventory,initialLoadout:app.inventory.loadout,onStart:()=>starts++,userId:"qa-user"});
  app.setSelection(null);
  await startButton(tree)();
  assert.equal(starts,0);
  assert.deepEqual(app.redirects,["character-selection.html"]);
});
test("Scenario navigation avoids Legacy preparation; identity never changes 3D tokens", () => {
  const app = read("./scenario-adventure/app.js");
  assert.doesNotMatch(app,/href="ai-world\.html"|S\+ AGENT/);
  assert.match(app,/href="lobby\.html"/);
  assert.match(read("./ai-world.html"),/id="world-create-dialog"/);
  const scene = read("./scenario-adventure/ScenarioAdventureScene.js");
  assert.match(scene,/import \{ PlayerToken \} from "\.\.\/map-3d\/PlayerToken\.js"/);
  assert.match(scene,/import \{ BotToken \} from "\.\.\/map-3d\/BotToken\.js"/);
  assert.doesNotMatch(scene,/characterSelection|characterId|character-selection/);
});
