# District Battle 2.0 — Step A dependency map

## Runtime flow

`turn-manager.js`
→ dice state transition
→ `board-data.js` movement path (32 unchanged mesh positions)
→ `battle-config.js` Action Encounter mapping
→ `map-3d.js` applies the one-time tile result
→ existing `action-engine.js` / `district-engine.js`
→ `TURN_END`
→ start-of-turn EN regeneration

## Loadout trust path

Supabase `player_card_loadouts` (RLS: current user only)
→ `card-loadout-client.js`
→ validates exactly three known card IDs
→ `createInitialInventory()` creates card instances and `poolCardIds`
→ CARD tile draws only from that pool
→ used cards move to the existing discard pile

Saved session inventory is resumed only when its pool and every hand/discard
card still match the server-loaded loadout. Invalid or legacy state falls back to
the verified loadout or the three starter cards.

## Energy single source of truth

`battle-config.js` owns starting EN, maximum EN, turn regeneration and ENERGY
tile reward. `district-engine.js` reuses that configuration so card, item and
district actions share the same cap.

## Deliberately deferred to Step B

- Battle eligibility and target restrictions
- Effect preview and confirm/cancel interaction
- Battle log and Battle Action panel
- Bot Strategy 2.0 priorities

Learning World scenario data and quiz/reward persistence remain untouched.

