# AI District 2.0 — Gameplay Freeze Handoff v1

> Freeze date: 15 October 2026 (Asia/Bangkok)  
> Status: **CONFIRMED**  
> Scope: Scenario Adventure gameplay used by Local Practice and Online Rooms  
> This round changed documentation only. No gameplay, score, Supabase, SQL, authentication, or deployment code was changed.

## 1. Frozen Runtime Contract

- Board path has exactly 32 indexed tiles and uses the existing `TILE_POSITIONS` / `BOARD_TILES` contract.
- Runtime event mapping is `ACTION 12 / MOVEMENT 6 / SUPPORT 5 / RISK 5 / DECISION 4` from `scenario-adventure/board-events.js`.
- A match supports 2–4 actors (human and/or Bot), with 6 turns for every actor.
- Initial score is `0 RP / 10 Stability`; RP cannot go below 0 and Stability is clamped to 0–10.
- The winner is the actor with the highest RP. Stability is the tie-breaker. Equal RP and Stability produces co-winners / DRAW.
- Online play remains server-authoritative. A client sends intent only; the server validates actor, turn, room revision, owned card instance, allowed card ID, and duplicate action IDs.
- Used match-card instances are consumed only from that match deck. Permanent unlock ownership is not removed.
- Result and Replay are part of the frozen contract. Replay requires ready actors and must reset scores, turn counts, positions, event/scenario history, action IDs, result state, and match decks.

### Frozen score table

| Event / response | RP | Stability | Movement |
|---|---:|---:|---:|
| ACTION — Effective card | +3 | 0 | 0 |
| ACTION — Partial card | +1 | -1 | 0 |
| ACTION — Ineffective card | +0 | -2 | 0 |
| ACTION — Basic response | +1 | -1 | 0 |
| MOVEMENT — forward | +0 | 0 | +2 tiles |
| MOVEMENT — review/backward | +1 | 0 | -2 tiles |
| SUPPORT — report | +1 | 0 | 0 |
| SUPPORT — restore | +0 | +1, capped at 10 | 0 |
| RISK — accept | +1 | -1 | 0 |
| DECISION — pilot | +2 | -1 | 0 |
| DECISION — review | +1 | 0 | 0 |

### Movement Rule A

Bonus movement resolves along the real 32-tile path and wraps at the ends. After moving `+2` or `-2`, the destination tile **does not open another event**. Passing START grants no bonus and movement cannot chain.

## 2. Frozen Bot Policy Boundaries

`chooseEventIntent()` in `scenario-adventure/board-events.js` is the shared Local/Online Bot policy.

- It may read only the current resolved match context: its own RP/Stability, best opponent RP, RP gap, turns already taken, turns remaining, current event/scenario, its own match hand, and allowed card IDs.
- It must not inspect a future dice roll, future tile/event, hidden opponent hand, or random outcome not yet resolved.
- ACTION compares Basic against legal in-hand cards and avoids spending Partial/Ineffective cards when Basic is equal or better.
- RISK may use only a legal compatible in-hand card and accounts for card opportunity cost.
- SUPPORT prioritizes recovery at low Stability and avoids wasted healing at Stability 10.
- DECISION protects very low Stability or a late lead; otherwise it may pursue RP.
- Tie-break order is deterministic: utility, avoid consuming a card, then stable key/instance ID.
- Bot intent must still pass the same authoritative resolver validation as a human intent.

## 3. Protected Gameplay Files

Do not change these during visual work without explicit owner approval and a new gameplay acceptance round:

- `scenario-adventure/board-events.js`
- `scenario-adventure/response-engine.js`
- `scenario-adventure/scenario-engine.js`
- `scenario-adventure/online-rooms.mjs`
- `scenario-adventure/online-client.js`
- `scenario-online-server.mjs`
- `map-3d/board-data.js`
- deck/card eligibility, ownership, unlock, and saved-loadout modules
- authentication, room command validation, result/replay, surrender, Story, Quiz, Reward RPC, Supabase schema/RLS

Mixed render/controller files are also protected by default:

- `scenario-adventure/app.js`
- `scenario-adventure/online-app.js`
- `scenario-adventure/ScenarioAdventureScene.js`
- `scenario-adventure/BoardEventPanel.js`

In mixed files, a visual-only task may change presentational markup, class names, labels, or material props only when it preserves state shape, effects, callbacks, tile indices, movement/event wiring, room commands, and resolver inputs/outputs. Run the acceptance matrix afterward.

## 4. Visual Handoff — Safe Areas for Claude or Another Agent

Generally safe visual surfaces, subject to source/dist parity and QA:

- `scenario-adventure.css`
- `ai-world.css`
- `map-3d.css`
- static images and visual assets
- low-poly decorative modules such as `map-3d/NeoDistrict.js`
- materials and non-interactive geometry inside `map-3d/CityFoundation.js`
- visual appearance inside `map-3d/BoardTile.js`

Visual work must preserve tile transforms/indexes, event mapping, contrast/readability, token clearance, dice visibility, camera controls, pointer callbacks, HUD accessibility, and Desktop/Mobile performance. Decorative districts remain visual only and must not introduce zone mechanics or score effects.

## 5. Round 4B Acceptance Evidence

### Real browser match — passed

- Environment: localhost static frontend `127.0.0.1:4174` and online room service `127.0.0.1:4180`.
- Existing authenticated user and saved eligible five-card deck were used.
- Isolated room: `Round 4B QA 20261015`, code `86167681`, 2 seats, one human and one Bot.
- Completed 6 turns per actor, 12/12 resolved events, without a stuck turn.
- Result: Bot won. Human finished `5 RP / 6 Stability`; Bot finished `6 RP / 4 Stability`.
- Observed distribution: `ACTION 7 / MOVEMENT 1 / SUPPORT 0 / RISK 2 / DECISION 2`; 7 unique content identities.
- Naturally observed Movement review/backward moved `-2`, awarded `+1 RP`, and did not open a destination event, confirming Rule A in the browser.
- Replay readiness completed and `เล่นอีกครั้ง` started a fresh match. Both actors reset to `0 RP / 10 Stability / 0 of 6 turns`, with the human roll prompt available.
- No localhost console error or warning was recorded after filtering out unrelated Codex browser telemetry.

SUPPORT was not naturally rolled in this one browser match. Its behavior is covered by the focused automated tests below; this report does not claim a natural browser observation for SUPPORT.

### Automated acceptance — passed

Command:

```text
node --test bot-decision-policy.test.mjs dist/bot-decision-policy.test.mjs board-events.test.mjs dist/board-events.test.mjs scenario-online.test.mjs dist/scenario-online.test.mjs neo-district-visual.test.mjs dist/neo-district-visual.test.mjs turn-popup.test.mjs dist/turn-popup.test.mjs
```

Result: **70/70 passed**.

Coverage includes 32-tile mapping/counts, every tile landing, Movement Rule A and wrapping, score bounds, legal card ownership/hand validation, duplicate/stale command rejection, context-aware Bot policy, deterministic choices, 2/3/4-seat completion, surrender, winner/result, replay reset, Neo District visual mapping, and turn popup flow.

### Source / dist parity

SHA-256 matched for 11/11 checked runtime pairs:

- `board-events.js`, `response-engine.js`, `scenario-engine.js`, `online-rooms.mjs`
- `app.js`, `online-app.js`, `ScenarioAdventureScene.js`
- `board-data.js`, `BoardTile.js`, `CityFoundation.js`, `NeoDistrict.js`

The Bot policy is implemented inside `board-events.js`; there is no separate runtime `bot-decision-policy.js` file.

## 6. Known Limitations

- Local online rooms are in memory. Restarting the room server clears active rooms.
- This acceptance used localhost and one authenticated browser session; it is not a production deployment test.
- Chapter/lesson content that is marked `DEMO_DRAFT` remains draft content.
- Saved deck and some Chapter 01 progress paths may use browser storage according to the existing implementation.
- The current backward Movement choice (`-2 tiles / +1 RP`) is known to be strategically dominant in the balance review. It is intentionally frozen, not silently rebalanced.
- Card engagement is intentionally limited by event distribution, owned/allowed match cards, hand instances, and compatibility rules.
- No Supabase production migration, SQL apply, deploy, audio work, or new visual redesign was performed in Round 4B.

## 7. Safe Checkpoint and Restore Procedure

The workspace can contain substantial uncommitted and untracked work from earlier rounds. Preserve it.

1. Run `git status --short` and inspect `git diff -- <specific-path>` before editing.
2. Copy/archive the whole project directory to a dated location, or create a reviewed commit containing the intended checkpoint.
3. Keep one editor/agent active at a time for protected or mixed files.
4. Restore individual files only from a known reviewed commit or backup, after checking their diff.
5. Never use broad `git reset --hard`, `git clean`, or checkout/restore commands against the whole workspace.
6. After an approved visual change, mirror only the changed shipped files into `dist/`, verify hashes, and rerun focused tests plus a browser smoke/full match proportional to the change.

## 8. Entry Instructions for the Next Agent

1. Read the latest `CURRENT DEMO` section in root `README.md`, then read this file completely.
2. Treat this Freeze v1 as the gameplay contract. If a later approved contract conflicts, document the approval and create a new acceptance version instead of silently editing v1.
3. For visual work, stay within the safe areas above. Do not alter scoring, event counts/mapping, Bot policy, movement, card eligibility, state transitions, room/auth/server behavior, or result/replay.
4. Preserve the dirty workspace and unrelated user changes.
5. Keep source and `dist/` shipped copies identical for every changed runtime/test/document pair.
6. Update root `README.md` in every development round with files, tests, browser QA, limitations, and next step.
7. Do not apply SQL, modify Supabase Production, deploy, or begin unrelated feature work unless the owner explicitly requests it.

## 9. Freeze Decision

**Gameplay Freeze v1 is CONFIRMED.** The current Scenario Adventure gameplay passed a complete real browser match through Result and Replay reset, the focused source/dist suite passed 70/70, and the checked shipped runtime pairs match. Future visual work may proceed only within the handoff boundaries above.
