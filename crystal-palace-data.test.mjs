import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { EXHIBITS, REQUIRED_LESSON_CODES } from "./crystal-palace/config/exhibits.js";
import { LESSON_STATUS, cardArtwork, deriveArchiveCards, deriveExhibitStates, derivePassportStamps } from "./crystal-palace/data/palace-state.js";
import { PALACE_PAGE, carryPalaceReturn, exitDestination, isPalaceReturn, palaceLessonHref } from "./crystal-palace/return-param.js";
import { PALACE_VISIT_KEY, createVisit, parseVisit, saveVisit, takeVisit } from "./crystal-palace/data/visit-session.js";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

// Fixture shaped like the real SELECT results.
const lessons = REQUIRED_LESSON_CODES.filter((code) => code !== "impact_guidance").map((code, i) => ({ id: i + 1, code, title: `Lesson ${code}`, category: code.startsWith("impact") ? "impact" : "ethics", unlock_order: i }));
const id = (code) => lessons.find((row) => row.code === code).id;
const data = {
  lessons,
  progress: [
    { lesson_id: id("ethics_safety"), status: "completed", quiz_passed_at: "2026-10-10T00:00:00Z", updated_at: "2026-10-10T00:00:00Z" },
    { lesson_id: id("impact_society"), status: "in_progress", quiz_passed_at: null, updated_at: "2026-10-11T00:00:00Z" },
    { lesson_id: id("ethics_privacy"), status: "completed", quiz_passed_at: null, updated_at: "2026-10-12T00:00:00Z" },
    { lesson_id: 999, status: "completed", updated_at: "2026-10-12T00:00:00Z" },
  ],
  rewards: [
    { lesson_id: id("ethics_safety"), action_card_id: "secure-backup", minimum_score: 8 },
    { lesson_id: id("ethics_privacy"), action_card_id: "secure-backup", minimum_score: 8 },
    { lesson_id: id("impact_society"), action_card_id: "data-strike", minimum_score: 7 },
    { lesson_id: id("ai-ethics-m6-01"), action_card_id: "access-denied", minimum_score: 8 },
  ],
  unlocks: [{ action_card_id: "secure-backup" }],
  cards: [
    { id: "secure-backup", name: "Secure Backup", card_type: "DEFENSE", education: {} },
    { id: "data-strike", name: "Data Strike", card_type: "ATTACK", education: {} },
    { id: "access-denied", name: "Access Denied", card_type: "CONTROL", education: { artwork: "assets/Golden Codex of Responsible AI-10.png" } },
  ],
};

test("exhibit states: locked / available (in progress) / completed with the real reward card", () => {
  const states = deriveExhibitStates(EXHIBITS, data);
  const lessonExhibits = EXHIBITS.filter((item) => item.lessonCode);
  assert.equal(Object.keys(states).length, lessonExhibits.length, "every lesson exhibit gets a state; info exhibits none");
  assert.equal(states["ethics-safety"].status, LESSON_STATUS.COMPLETED);
  assert.equal(states["ethics-safety"].quizPassed, true);
  assert.deepEqual(states["ethics-safety"].reward, { cardId: "secure-backup", name: "Secure Backup", type: "DEFENSE", minimumScore: 8, unlocked: true });
  assert.equal(states["impact-society"].status, LESSON_STATUS.AVAILABLE);
  assert.equal(states["impact-society"].inProgress, true);
  assert.equal(states["impact-society"].reward.unlocked, false);
  assert.equal(states["ethics-fairness"].status, LESSON_STATUS.AVAILABLE);
  assert.equal(states["ethics-fairness"].inProgress, false);
  assert.equal(states["ethics-fairness"].reward, null);
  assert.equal(states["impact-guidance"].status, LESSON_STATUS.LOCKED, "no active lesson row → locked");
  assert.equal(states["impact-guidance"].lesson, null);
});

test("exhibit states with no data are all locked and never throw", () => {
  const states = deriveExhibitStates(EXHIBITS, {});
  assert.ok(Object.values(states).every((state) => state.status === LESSON_STATUS.LOCKED));
});

test("passport stamps come only from completed progress rows of palace lessons", () => {
  const passport = derivePassportStamps(data);
  assert.equal(passport.total, 12);
  assert.deepEqual(passport.stamps.map((stamp) => stamp.code), ["ethics_safety", "ethics_privacy"], "palace order, in-progress and unknown lessons excluded");
  assert.equal(passport.stamps[0].category, "ethics");
  assert.equal(passport.stamps[0].stampedAt, "2026-10-10T00:00:00Z");
  assert.equal(derivePassportStamps({}).stamps.length, 0);
});

test("archive: unlocked cards framed with art, locked cards as silhouettes with a real lesson hint", () => {
  const archive = deriveArchiveCards(data);
  assert.deepEqual(archive.map((card) => card.cardId), ["secure-backup", "access-denied", "data-strike"]);
  const backup = archive[0];
  assert.equal(backup.unlocked, true);
  assert.equal(backup.hint, null);
  const denied = archive.find((card) => card.cardId === "access-denied");
  assert.equal(denied.unlocked, false);
  assert.equal(denied.art, null, "locked cards never expose artwork");
  assert.deepEqual(denied.hint, { lessonCode: "ai-ethics-m6-01", lessonTitle: "Lesson ai-ethics-m6-01", minimumScore: 8, more: 0 });
  assert.equal(cardArtwork(data.cards[2]), "assets/thumbs/Golden Codex of Responsible AI-10.png");
  assert.equal(cardArtwork({ id: "firewall-guard" }), "assets/thumbs/Cyan Firewall Protecting a Luminous AI City-2.png", "prototype mapping fallback");
  assert.equal(cardArtwork({ id: "secure-backup", education: { artwork: "../secret.png" } }), null, "type illustration fallback");
});

test("return param: only return=crystal-palace is honoured", () => {
  assert.equal(isPalaceReturn("?lesson=x&return=crystal-palace"), true);
  for (const search of ["", "?return=quiz", "?return=Crystal-Palace", "?return=https://evil.example", "?return=crystal-palace.html", "?return=//evil", "?return=crystal-palace%00"]) {
    assert.equal(isPalaceReturn(search), false, search);
    assert.equal(exitDestination(search), "learning.html", search);
  }
  assert.equal(exitDestination("?return=crystal-palace"), PALACE_PAGE);
  assert.equal(carryPalaceReturn("quiz.html?lesson=a", "?return=crystal-palace"), "quiz.html?lesson=a&return=crystal-palace");
  assert.equal(carryPalaceReturn("quiz.html?lesson=a", "?return=quiz"), "quiz.html?lesson=a");
  assert.equal(palaceLessonHref("ethics_safety"), "lesson-player.html?lesson=ethics_safety&return=crystal-palace");
  assert.equal(palaceLessonHref("ai-ethics-m6-01"), "lesson-player.html?lesson=ai-ethics-m6-01&return=crystal-palace");
  assert.equal(palaceLessonHref("x&return=evil"), null);
});

test("lesson-player and quiz use the allowlist only for exits; quiz/reward logic untouched", () => {
  const player = read("./lesson-player.js");
  assert.match(player, /import \{ carryPalaceReturn, exitDestination \} from "\.\/crystal-palace\/return-param\.js/);
  assert.equal((player.match(/location\.assign\(exitDestination\(location\.search\)\)/g) || []).length, 2);
  assert.doesNotMatch(player, /location\.assign\("learning\.html"\)/);
  assert.match(player, /carryPalaceReturn\(`quiz\.html\?lesson=/);
  assert.match(player, /get\("return"\) === "quiz"/, "existing return=quiz review flow kept");
  const quiz = read("./quiz.js");
  assert.match(quiz, /location\.assign\(exitDestination\(location\.search\)\)/);
  assert.match(quiz, /supabase\.rpc\("claim_lesson_reward"/, "reward claim still server-side");
  assert.doesNotMatch(quiz, /location\.assign\("learning\.html"\)/);
});

test("visit session: save → one-shot restore, rejects bad or stale data", () => {
  const store = new Map();
  const storage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) };
  assert.equal(saveVisit(storage, { x: -12, z: -6, heading: 1, exhibitId: "ethics-safety" }), true);
  assert.deepEqual(takeVisit(storage), { x: -12, z: -6, heading: 1, exhibitId: "ethics-safety" });
  assert.equal(store.has(PALACE_VISIT_KEY), false, "consumed");
  assert.equal(takeVisit(storage), null);
  const now = 1_000_000_000;
  assert.equal(parseVisit(createVisit({ x: 0, z: 0, exhibitId: "nope" }, now), now).exhibitId, null);
  assert.equal(parseVisit(createVisit({ x: 500, z: 0 }, now), now), null);
  assert.equal(parseVisit(createVisit({ x: 0, z: 0 }, now - 7 * 3600 * 1000), now), null);
  assert.equal(parseVisit("{not json", now), null);
  assert.equal(takeVisit({ getItem() { throw new Error("blocked"); } }), null);
});

test("palace data layer is SELECT-only and the page never writes progress", () => {
  const client = read("./crystal-palace/data/palace-data-client.js");
  for (const table of ["learning_lessons", "player_learning_progress", "lesson_rewards", "user_card_unlocks", "action_cards"]) assert.match(client, new RegExp(`from\\("${table}"\\)\\.select\\(`), table);
  for (const path of ["./crystal-palace/data/palace-data-client.js", "./crystal-palace/data/palace-state.js", "./crystal-palace/app.js", "./crystal-palace/ui/ExhibitPanel.js", "./crystal-palace/ui/HUD.js"]) {
    assert.doesNotMatch(read(path), /(supabase|\))\s*\.(insert|upsert|update|delete|rpc)\(/, path);
  }
});
