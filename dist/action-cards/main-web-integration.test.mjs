import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Lobby exposes all three Action Card destinations", async () => {
  const lobby = await read("../lobby.html");
  assert.match(lobby, /href="card-inventory\.html"/);
  assert.match(lobby, /href="action-card-preview\.html"/);
  assert.match(lobby, /href="character-selection\.html"/);
});

test("Prototype gallery clearly separates sandbox selection from account inventory", async () => {
  const app = await read("./app.js");
  assert.match(app, /Prototype Sandbox/);
  assert.match(app, /ไม่บันทึกสิทธิ์หรือ Loadout ของบัญชี/);
  assert.match(app, /href="card-inventory\.html"/);
});

test("Permanent inventory and five-card pre-match link to each other", async () => {
  const inventory = await read("../card-inventory.html");
  const adventure = await read("../scenario-adventure/app.js");
  assert.match(inventory, /จัด Deck Scenario 5 ใบ/);
  assert.match(inventory, /map-3d\.html\?mode=scenario-adventure/);
  assert.match(adventure, /href="card-inventory\.html"/);
  assert.match(adventure, /เลือก 5 ใบจากการ์ดที่คุณมีสิทธิ์ใช้/);
});
