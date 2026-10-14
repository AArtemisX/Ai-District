import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CHARACTER_ACCESS, CHARACTER_ROSTER, isSelectableCharacter, validateCharacterRoster } from "./character-roster.js";
import { SCENARIO_CHARACTER_SESSION_KEY, parseCharacterSelection, writeScenarioCharacterSelection } from "./character-session.js";
import { StoryCharacterPortrait } from "./StoryCharacterPortrait.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("S+ roster has nine unique full-card artworks with 3 free and 6 locked", () => {
  const validation = validateCharacterRoster();
  assert.equal(validation.valid, true, validation.errors.join(","));
  assert.equal(CHARACTER_ROSTER.length, 9);
  assert.equal(new Set(CHARACTER_ROSTER.map((item) => item.id)).size, 9);
  assert.equal(CHARACTER_ROSTER.filter((item) => item.access === CHARACTER_ACCESS.FREE).length, 3);
  assert.equal(CHARACTER_ROSTER.filter((item) => item.access === CHARACTER_ACCESS.LOCKED).length, 6);
  assert.equal(new Set(CHARACTER_ROSTER.map((item) => item.artwork.src)).size, 9);
});

test("all character PNG files exist at the original 1058x1486 ratio", () => {
  for (const character of CHARACTER_ROSTER) {
    const png = readFileSync(resolve(root, character.artwork.src));
    assert.equal(png.toString("ascii", 1, 4), "PNG", character.id);
    assert.equal(png.readUInt32BE(16), 1058, character.id);
    assert.equal(png.readUInt32BE(20), 1486, character.id);
  }
});

test("locked characters cannot be written into session selection", () => {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  assert.equal(isSelectableCharacter("alexander"), true);
  assert.equal(isSelectableCharacter("alice"), false);
  assert.equal(writeScenarioCharacterSelection("alice", storage), false);
  assert.equal(values.has(SCENARIO_CHARACTER_SESSION_KEY), false);
  assert.equal(writeScenarioCharacterSelection("alexander", storage), true);
  assert.equal(parseCharacterSelection(storage.getItem(SCENARIO_CHARACTER_SESSION_KEY)).characterId, "alexander");
});

test("Story portrait is circular-crop ready and supports speaker states", () => {
  const active = StoryCharacterPortrait({ characterId: "mamasan", active: true });
  const inactive = StoryCharacterPortrait({ characterId: "mamasan", active: false });
  assert.match(active, /story-character-portrait is-active/);
  assert.match(active, /assets\/Mama\.png/);
  assert.match(inactive, /is-inactive/);
  assert.match(read("characters/story-character-portrait.css"), /border-radius:50%/);
  assert.match(read("characters/story-character-portrait.css"), /object-position:var\(--portrait-position/);
});

test("Scenario route requires selection and Lobby starts the requested flow", () => {
  assert.match(read("lobby.html"), /href="character-selection\.html"/);
  assert.match(read("map-3d-entry.js"), /readScenarioCharacterSelection/);
  assert.match(read("map-3d-entry.js"), /window\.location\.replace\("character-selection\.html"\)/);
  assert.match(read("character-selection.js"), /map-3d\.html\?mode=scenario-adventure/);
});

test("character integration does not replace board tokens or movement", () => {
  const integrationFiles = [read("character-selection.js"), read("characters/character-roster.js"), read("characters/character-session.js")].join("\n");
  assert.doesNotMatch(integrationFiles, /PlayerToken|BotToken|buildTilePath|Dice3D|useFrame/);
  assert.match(read("scenario-adventure/ScenarioAdventureScene.js"), /PlayerToken/);
  assert.match(read("scenario-adventure/ScenarioAdventureScene.js"), /BotToken/);
});

