import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { characterOwnershipState, loadCharacterOwnership, ownershipSnapshot } from "./characters/character-ownership.mjs";
import { parseCharacterSelection } from "./characters/character-session.js";
import { CHARACTER_ACCESS, CHARACTER_ROSTER } from "./characters/character-roster.js";
import { readSavedLoadouts } from "./scenario-adventure/saved-loadouts.mjs";

const userId = "account-a";
const row = { user_id: userId, character_id: "nancy", source_lesson_id: 2, source_attempt_id: "server-attempt", unlocked_at: "2026-10-14T00:00:00Z" };
function client({ rows = [], error = null, users = [userId, userId], queryThrows = false, pending = false } = {}) {
  let calls = 0;
  const seen = [];
  const query = {
    select(fields) { seen.push(["select", fields]); return this; },
    eq(field, value) { seen.push(["eq", field, value]); return this; },
    abortSignal(signal) {
      seen.push(["signal", signal]);
      if (queryThrows) throw new Error("OFFLINE");
      return pending ? new Promise(() => {}) : Promise.resolve({ data: rows, error });
    },
  };
  return { seen, auth: { async getUser() { return { data: { user: users[calls] ? { id: users[calls++] } : null } }; } }, from(table) { seen.push(["table", table]); return query; } };
}

test("Free starters remain available while ownership loads or fails", () => {
  for (const status of ["LOADING", "ERROR", "READY"]) {
    for (const id of ["alexander", "mamasan", "milo"]) assert.equal(characterOwnershipState(id, ownershipSnapshot(userId, status), userId), "FREE");
  }
});
test("Locked characters expose loading, error, locked and verified unlocked states", () => {
  assert.equal(characterOwnershipState("nancy", ownershipSnapshot(userId), userId), "LOADING");
  assert.equal(characterOwnershipState("nancy", ownershipSnapshot(userId, "ERROR", ["nancy"]), userId), "ERROR");
  assert.equal(characterOwnershipState("nancy", ownershipSnapshot(userId, "READY"), userId), "LOCKED");
  assert.equal(characterOwnershipState("nancy", ownershipSnapshot(userId, "READY", ["nancy"]), userId), "UNLOCKED");
  assert.equal(characterOwnershipState("unknown", ownershipSnapshot(userId, "READY", ["unknown"]), userId), "LOCKED");
});
test("Snapshots from another account never grant access", () => {
  assert.equal(characterOwnershipState("nancy", ownershipSnapshot(userId, "READY", ["nancy"]), "account-b"), "ERROR");
  assert.equal(characterOwnershipState("nancy", ownershipSnapshot(null, "READY", ["nancy"]), null), "ERROR");
});
test("Ownership read filters the authenticated account and deduplicates server rows", async () => {
  const api = client({ rows: [row, row] });
  const result = await loadCharacterOwnership(api, userId);
  assert.equal(result.status, "READY");
  assert.deepEqual(result.characterIds, ["nancy"]);
  assert.deepEqual(api.seen[0], ["table", "user_character_unlocks"]);
  assert.deepEqual(api.seen[2], ["eq", "user_id", userId]);
  assert.equal(Object.isFrozen(result.characterIds), true);
});
test("Missing migration, denied read and offline requests fail closed", async () => {
  for (const config of [{ error: { code: "42P01" } }, { error: { code: "42501" } }, { queryThrows: true }, { rows: null }]) {
    const result = await loadCharacterOwnership(client(config), userId);
    assert.equal(result.status, "ERROR");
    assert.deepEqual(result.characterIds, []);
  }
});
test("Cross-account or malformed ownership rows invalidate the complete response", async () => {
  for (const invalid of [{ ...row, user_id: "account-b" }, { ...row, character_id: "unknown" }, { ...row, character_id: "alexander" }, { ...row, source_attempt_id: null }, { ...row, source_lesson_id: null }, { ...row, unlocked_at: "invalid" }]) {
    assert.equal((await loadCharacterOwnership(client({ rows: [row, invalid] }), userId)).status, "ERROR");
  }
});
test("Sign out or account change before/during a read clears ownership", async () => {
  for (const users of [[null], ["account-b"], [userId, "account-b"], [userId, null]]) {
    const result = await loadCharacterOwnership(client({ rows: [row], users }), userId);
    assert.equal(result.status, "ERROR");
    assert.deepEqual(result.characterIds, []);
  }
});
test("Timeout aborts pending reads and cannot grant ownership", async () => {
  const api = client({ rows: [row], pending: true });
  const result = await loadCharacterOwnership(api, userId, { timeoutMs: 10 });
  assert.equal(result.status, "ERROR");
  assert.equal(api.seen.at(-1)[1].aborted, true);
});
test("Retry recovers from an error without carrying stale access", async () => {
  const failed = await loadCharacterOwnership(client({ error: { code: "NETWORK" } }), userId);
  const recovered = await loadCharacterOwnership(client(), userId);
  assert.equal(characterOwnershipState("nancy", failed, userId), "ERROR");
  assert.equal(characterOwnershipState("nancy", recovered, userId), "LOCKED");
});
test("Preview and forged session identity do not enable Nancy gameplay", () => {
  assert.equal(parseCharacterSelection({ schemaVersion: 1, characterId: "nancy", passed: true, ownershipStatus: "UNLOCKED" }), null);
});

async function selectionPage(snapshot) {
  const elements = new Map();
  const element = (key) => {
    if (!elements.has(key)) elements.set(key, { textContent: "", innerHTML: "", hidden: false, disabled: false, open: false,
      dataset: {}, listeners: {}, classList: { add() {}, remove() {} }, addEventListener(name, listener) { this.listeners[name] = listener; },
      showModal() { this.open = true; }, close() { this.open = false; } });
    return elements.get(key);
  };
  const document = { querySelector: element };
  let authCallback;
  const window = { clearTimeout, setTimeout: () => 0, location: { assign() { throw new Error("Unexpected navigation"); }, reload() {} } };
  const api = { auth: { onAuthStateChange(callback) { authCallback = callback; } } };
  const source = readFileSync(new URL("./character-selection.js", import.meta.url), "utf8").replace(/^import .*;\r?\n/gm, "");
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  await new AsyncFunction("document", "window", "requirePlayer", "supabase", "CHARACTER_ACCESS", "CHARACTER_ROSTER", "readScenarioCharacterSelection", "writeScenarioCharacterSelection", "characterOwnershipState", "loadCharacterOwnership", "ownershipSnapshot", "readSavedLoadouts", source)(
    document, window, async () => ({ user: { id: userId } }), api, CHARACTER_ACCESS, CHARACTER_ROSTER,
    () => null, () => false, characterOwnershipState, async () => snapshot, ownershipSnapshot, () => readSavedLoadouts(userId, {getItem:()=>null}));
  return { element, authCallback };
}
test("Selection page handles unavailable backend and retry while Free cards remain selectable", async () => {
  const page = await selectionPage(ownershipSnapshot(userId, "ERROR"));
  assert.match(page.element("#character-gallery").innerHTML, /data-access-state="ERROR"/);
  assert.match(page.element("#character-gallery").innerHTML, /data-character-action="select"/);
  assert.equal(page.element("#retry-ownership").hidden, false);
  await page.element("#retry-ownership").listeners.click();
  assert.equal(page.element("#retry-ownership").hidden, false);
  assert.equal(page.element("#confirm-character").disabled, true);
});
test("Selection page displays server unlock without enabling rollout and clears on account change", async () => {
  const page = await selectionPage(ownershipSnapshot(userId, "READY", ["nancy"]));
  const markup = page.element("#character-gallery").innerHTML;
  assert.match(markup, /data-character-id="nancy" data-access-state="UNLOCKED">\s*<button[^>]*data-character-action="detail"/);
  assert.equal(page.element("#retry-ownership").hidden, true);
  page.authCallback("SIGNED_OUT", null);
  assert.doesNotMatch(page.element("#character-gallery").innerHTML, /data-access-state="UNLOCKED"/);
  assert.equal(page.element("#confirm-character").disabled, true);
});

const sql = readFileSync(new URL("./supabase/character_unlock_phase5c.DRAFT.sql", import.meta.url), "utf8");
test("STATIC SQL ONLY: browser writes denied, own-row RLS and least privilege RPC", () => {
  assert.match(sql, /alter table public\.user_character_unlocks enable row level security/i);
  assert.match(sql, /using \(\(select auth\.uid\(\)\) = user_id\)/i);
  assert.match(sql, /revoke all on public\.character_reward_catalog,public\.mission_character_rewards,public\.user_character_unlocks from public,anon,authenticated/i);
  assert.match(sql, /grant select on public\.user_character_unlocks to authenticated/i);
  assert.doesNotMatch(sql, /grant (insert|update|delete|all).* to (authenticated|anon)/i);
  assert.match(sql, /security definer set search_path=''/i);
  assert.match(sql, /revoke all on function public\.claim_character_reward\(text\) from public,anon,authenticated/i);
});
test("STATIC SQL ONLY: RPC derives account, policy, attempt and idempotent reward server-side", () => {
  assert.match(sql, /claim_character_reward\(p_lesson_code text\)/);
  assert.match(sql, /a\.user_id=v_user and a\.quiz_id=v_reward\.quiz_id and a\.passed/);
  assert.match(sql, /q\.passing_score=r\.approved_passing_score/);
  assert.match(sql, /a\.max_score=v_reward\.total_questions/);
  assert.match(sql, /has_any_column_privilege/);
  assert.match(sql, /on conflict on constraint user_character_unlocks_pkey do nothing/);
  assert.match(sql, /primary key \(user_id,character_id\)/);
  assert.match(sql, /for share of r,l,q,c/);
});
test("STATIC SQL ONLY: no reward seed and no changes to existing Quiz/Card reward systems", () => {
  const statements = sql.replace(/--[^\n]*/g, "");
  assert.doesNotMatch(statements, /insert into public\.mission_character_rewards/i);
  assert.doesNotMatch(statements, /(?:alter|update|delete from|insert into) public\.(?:quiz_attempts|lesson_rewards|user_card_unlocks)/i);
  assert.doesNotMatch(statements, /claim_lesson_reward|submit_lesson_quiz|mission-story-02-nancy-draft/);
});
