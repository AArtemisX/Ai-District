# AI District 2.0 — Gameplay Freeze Handoff v2 ("Bonus Tiles")

> Date: 16 October 2026 (Asia/Bangkok)
> Status: **IMPLEMENTED — awaiting owner sign-off**
> Scope: Scenario Adventure board rules used by Local Practice and Online Rooms
> Supersedes Gameplay Freeze v1 **only** where listed below. `GAMEPLAY_FREEZE_HANDOFF_v1.md` stays as history.

## 0. Owner approval

On demo day (16 Oct 2026) the owner asked for board tiles that are not all scenarios — some instant bonuses such as "land here, move forward 2". The owner chose:

1. A mixed set of four bonus kinds on **8 of 32 tiles**; the old choice-based MOVEMENT tiles are folded into these automatic bonus tiles.
2. **Rule A'**: after a FORWARD_2 bonus, the destination tile's event opens **once** in the same turn (replacing v1 Rule A, where the destination never opened).
3. A bonus tile counts as the actor's turn. 6 turns per actor is unchanged.

Everything not listed in §1–§3 is unchanged from v1 (scores, bounds, winner, server authority, card ownership, Result/Replay, surrender).

## 1. Board mapping v2

`scenario-adventure/board-events.js` — `TILE_EVENT_TYPES`, `TILE_BONUS_KINDS`.

| Type | v1 | **v2** |
|---|---:|---:|
| ACTION | 12 | **12** |
| MOVEMENT (choice) | 6 | **0** — folded into BONUS |
| BONUS (instant) | — | **8** |
| SUPPORT | 5 | **4** |
| RISK | 5 | **4** |
| DECISION | 4 | **4** |

Tile layout (index 0 = START; the board UI shows index + 1):

| Index | Type | | Index | Type | | Index | Type | | Index | Type |
|---:|---|---|---:|---|---|---:|---|---|---:|---|
| 0 | ACTION | | 8 | SUPPORT | | 16 | RISK | | 24 | ACTION |
| 1 | ACTION | | 9 | ACTION | | 17 | ACTION | | 25 | SUPPORT |
| **2** | **BONUS ⏩ FORWARD_2** | | **10** | **BONUS ♥ STABILITY_PLUS_1** | | **18** | **BONUS ⏩ FORWARD_2** | | **26** | **BONUS ♥ STABILITY_PLUS_1** |
| 3 | ACTION | | 11 | SUPPORT | | 19 | SUPPORT | | 27 | DECISION |
| 4 | RISK | | 12 | ACTION | | 20 | DECISION | | 28 | ACTION |
| 5 | DECISION | | 13 | DECISION | | 21 | ACTION | | 29 | ACTION |
| **6** | **BONUS ★ RP_PLUS_1** | | **14** | **BONUS ☕ REST** | | **22** | **BONUS ★ RP_PLUS_1** | | **30** | **BONUS ☕ REST** |
| 7 | ACTION | | 15 | ACTION | | 23 | RISK | | 31 | RISK |

Balance notes:

- One bonus tile every 4 tiles; two of each kind; the same kind repeats only half a loop later.
- The two FORWARD_2 tiles are 16 tiles apart (rule: never within 2 tiles of each other).
- Both FORWARD_2 destinations are scenario tiles (2 → 4 RISK, 18 → 20 DECISION), so the default layout never reaches the no-chain case; the guard still exists and is tested with an injected mapping.
- MOVEMENT "review/backward −2 / +1 RP" was flagged as dominant in the v1 balance review; it no longer exists.

## 2. Score table v2

| Event / response | RP | Stability | Movement |
|---|---:|---:|---:|
| ACTION — Effective card | +3 | 0 | 0 |
| ACTION — Partial card | +1 | −1 | 0 |
| ACTION — Ineffective card | +0 | −2 | 0 |
| ACTION — Basic response | +1 | −1 | 0 |
| **BONUS ⏩ FORWARD_2** | +0 | 0 | **+2 tiles**, then Rule A' |
| **BONUS ★ RP_PLUS_1** | **+1** | 0 | 0 |
| **BONUS ♥ STABILITY_PLUS_1** | 0 | **+1, capped at 10** | 0 |
| **BONUS ☕ REST** | 0 | 0 | 0 |
| SUPPORT — report | +1 | 0 | 0 |
| SUPPORT — restore | +0 | +1, capped at 10 | 0 |
| RISK — accept | +1 | −1 | 0 |
| DECISION — pilot | +2 | −1 | 0 |
| DECISION — review | +1 | 0 | 0 |

Unchanged: initial `0 RP / 10 Stability`, RP ≥ 0, Stability clamped 0–10, winner by RP then Stability, equal → co-winners / DRAW.

## 3. Rule A' (replaces v1 Rule A)

Implemented once, in `landOnTile()` (`scenario-adventure/board-events.js`), and used by both the Online server and Local Practice.

1. The dice path ends on a tile. A scenario tile opens its event exactly as before.
2. A BONUS tile resolves **instantly** — there is no popup choice and no client intent.
   - RP_PLUS_1 / STABILITY_PLUS_1 / REST commit the score change and **count as the actor's turn** immediately (phase `RESOLVED`; the player only presses "ส่งต่อเทิร์น").
   - FORWARD_2 moves +2 along the real 32-tile path (wrapping past START).
     - Destination is a **scenario tile** → that event opens **once**, in the same turn; it is the turn's event, and the turn is counted when it resolves. The event carries `viaBonus`.
     - Destination is **another BONUS tile** → **no chaining**: the destination's bonus is not applied, the FORWARD_2 itself is committed as the turn (`chainStopped: true`).
3. Passing START gives no bonus.
4. A turn can contain at most one landing event; a second landing in the same turn is rejected (`EVENT_ALREADY_OPENED`). A BONUS cannot be opened as an event (`BONUS_TILE_HAS_NO_EVENT`) or resolved by a client choice.
5. If a BONUS lands on an actor's last turn and all actors are done, the match finishes from the roll.

## 4. Online server contract (`scenario-adventure/online-rooms.mjs`)

- `roll` = dice → path → `landOnTile` → (bonus apply | destination event) as **one commit and one revision**. The room view gains `bonus` (`kind`, `label`, `title`, `destination`, `chainStopped`) and `movement.bonusPath`.
- Phase after a roll: `RESOLVED` for an instant bonus, `RESPONSE_SELECTION` for a scenario/destination event.
- Existing guards still apply: actor/turn, `STALE_REVISION`, phase checks (`respond` after an instant bonus → `INVALID_PHASE`), duplicate action IDs (`bonus:<actor>:<turn>:<tile>`), and rejection of client-sent `rp/rpDelta/stability/stabilityDelta/position/positions/tileIndex/event/score/scores`. The bonus kind is always read from the server's tile mapping; any client field such as `bonusKind` is ignored.
- `continue` and Replay (`reset`) clear `bonus`.

## 5. Bot boundaries (v2 changes only)

`chooseEventIntent()` stays the shared Local/Online policy with the v1 boundaries (no future dice/tiles, no hidden hands, deterministic tie-breaks, same validator as humans). In v2:

- BONUS needs no choice: `chooseEventIntent` returns `null`; the server bot simply sends `continue` after the instant bonus.
- A FORWARD_2 destination event reaches the bot as its normal type (ACTION / SUPPORT / RISK / DECISION) and is decided by the unchanged policy for that type.
- The MOVEMENT policy branch is gone with MOVEMENT.

## 6. Visuals (presentation only)

- `scenario-adventure/event-visuals.js`: `EVENT_VISUALS.BONUS` (green, star icon, label "ช่องโบนัส") replaces MOVEMENT; `BONUS_VISUALS` gives per-kind glyphs ⏩ ★ ♥ ☕ and short labels; `tileVisualFor(type, kind)`.
- `ScenarioAdventureScene.js` reads `eventTypeForTile` + `bonusKindForTile` (runtime mapping) and passes a visual; `map-3d/BoardTile.js` draws the glyph from the visual only (it never reads the mapping).
- Online: a short toast "ช่องโบนัส: เดินหน้า 2 ช่อง" (etc., prefixed with the actor name on other turns) appears after the dice walk; the existing visual-only glide in `map-3d/CharacterToken.js` animates the +2; the destination event then opens through the existing popup / card table. Local Practice shows the bonus result in the event panel and a "⏩ … → เปิดเหตุการณ์ช่องปลายทาง" note on a destination event.

## 7. Acceptance evidence

Automated: `node --test` — see the root `README.md` CURRENT DEMO section for the exact count. New file `board-rules-v2.test.mjs` covers mapping counts and spacing, each bonus kind, the Stability cap, FORWARD_2 → destination event once, Rule A' chain stop and START wrap, rejection of BONUS as event/choice, single-revision server commit, forged client score/position/bonus fields, 2/3/4-actor matches with bots completing 6 turns each through bonus tiles, a match finishing on a bonus roll, and Replay reset. Existing tests asserting the v1 mapping were updated to v2 deliberately (`board-events.test.mjs`, `neo-district-visual.test.mjs`, `bot-decision-policy.test.mjs`, `scenario-online-http.test.mjs`).

Browser: see README CURRENT DEMO (one full Online match, human + Bot, to Result, plus Replay reset).

## 8. Protected files (unchanged list)

The v1 protected-file list (§3 of v1) still applies. This round changed, with owner approval: `board-events.js`, `online-rooms.mjs`, `app.js`, `online-app.js`, `ScenarioAdventureScene.js`, `BoardEventPanel.js`, `event-visuals.js`, `map-3d/BoardTile.js`. Not changed: `response-engine.js`, `scenario-engine.js`, `map-3d/board-data.js`, `online-client.js`, `scenario-online-server.mjs`, `CharacterToken.js`.

## 9. Known limitations

- `gameplay-balance-sim.mjs` is a v1 analysis script (it still models MOVEMENT choices) and was not updated; do not use its output for v2 balance.
- The no-chain FORWARD_2 case cannot occur with the default layout; it is covered only by automated tests.
- A BONUS on the very last turn finishes the match at the roll, so that final dice walk / toast is not shown before the Result screen.
- Other v1 limitations (in-memory rooms, localhost-only acceptance, DEMO_DRAFT content) remain.
