import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { SCENARIO_STARTER_CANONICAL_IDS } from "./card-catalog.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const migration = readFileSync(resolve(projectRoot, "supabase/action_card_catalog_phase4b2a.sql"), "utf8");

test("Phase 4B.2A migration is a non-applied, transaction-wrapped draft", () => {
  assert.match(migration, /SAFE MIGRATION DRAFT/i);
  assert.match(migration, /begin;/i);
  assert.match(migration, /commit;/i);
  assert.doesNotMatch(migration, /\bdrop\s+(table|schema|column)\b/i);
  assert.doesNotMatch(migration, /\btruncate\b/i);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.(user_card_unlocks|lesson_rewards|player_card_loadouts)/i);
});

test("Migration declares the five approved Scenario starters exactly once", () => {
  for (const id of SCENARIO_STARTER_CANONICAL_IDS) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const eligibilityBlock = migration.match(/insert into public\.scenario_card_eligibility[\s\S]*?on conflict/i)?.[0] || "";
    assert.equal((eligibilityBlock.match(new RegExp(`'${escaped}'`, "g")) || []).length, 1, id);
  }
  assert.match(migration, /count\(distinct card_id\)[\s\S]*?<> 5/i);
  assert.match(migration, /unique index[\s\S]*?\(user_id, action_card_id\)/i);
});

test("Migration keeps global starters and reward configuration out of writes", () => {
  assert.doesNotMatch(migration, /update\s+public\.action_cards[\s\S]*?is_starter/i);
  assert.doesNotMatch(migration, /(insert\s+into|update|delete\s+from)\s+public\.lesson_rewards/i);
  assert.match(migration, /scenario_card_eligibility/i);
});

test("Server RPC rechecks auth, ownership and mode eligibility", () => {
  assert.match(migration, /auth\.uid\(\)/i);
  assert.match(migration, /public\.user_card_unlocks/i);
  assert.match(migration, /public\.scenario_card_eligibility/i);
  assert.match(migration, /security definer/i);
  assert.match(migration, /revoke all on function[\s\S]*?from public, anon/i);
});

