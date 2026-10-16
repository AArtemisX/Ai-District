import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validatePalaceConfig } from "./crystal-palace/config/validate-config.js";
import { EXHIBITS, REQUIRED_LESSON_CODES } from "./crystal-palace/config/exhibits.js";
import { ROOF_TIERS, TRANSEPT_VAULT, ZONES } from "./crystal-palace/config/palace-layout.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("palace config validates cleanly", () => {
  assert.deepEqual(validatePalaceConfig(), []);
});

test("validator catches bad data", () => {
  const broken = [...EXHIBITS, { ...EXHIBITS[3], id: "dup-lesson" }, { id: "fake", zone: "future-west", kind: "info", x: -36, z: 0, title: "x", summary: "y", reward: 10 }];
  const errors = validatePalaceConfig({ exhibits: broken });
  assert.ok(errors.some((e) => e.includes("appears twice")));
  assert.ok(errors.some((e) => e.includes("closed zone")));
  assert.ok(errors.some((e) => e.includes("must not define reward")));
  assert.ok(validatePalaceConfig({ exhibits: EXHIBITS.filter((e) => e.lessonCode !== "impact_guidance") }).some((e) => e.includes("impact_guidance")));
});

test("every required lesson code has exactly one exhibit", () => {
  assert.equal(REQUIRED_LESSON_CODES.length, 12);
  for (const code of REQUIRED_LESSON_CODES) assert.equal(EXHIBITS.filter((e) => e.lessonCode === code).length, 1, code);
});

test("1851 Hyde Park massing: one central vault, stepped roof tiers", () => {
  const heights = ROOF_TIERS.map((t) => t.height);
  assert.equal(new Set(heights).size, 3, "three roof steps");
  assert.ok(TRANSEPT_VAULT.springHeight >= Math.max(...heights));
  assert.equal(ZONES.filter((z) => !z.open).length, 2);
});

test("page is auth-gated, uses the shared import map, and makes no fake progress writes", () => {
  const page = read("./crystal-palace.html");
  for (const pin of ["react@18.3.1", "@react-three/fiber@8.17.10", "@react-three/drei@9.117.3", "three@0.170.0"]) assert.ok(page.includes(pin), pin);
  const app = read("./crystal-palace/app.js");
  assert.match(app, /requirePlayer\(/);
  for (const path of ["./crystal-palace/app.js", "./crystal-palace/ui/ExhibitPanel.js", "./crystal-palace/config/exhibits.js"]) {
    assert.doesNotMatch(read(path), /\.(insert|upsert|update|rpc)\(/, path);
  }
  assert.match(read("./lobby.html"), /href="crystal-palace.html"/);
});
