> Current flow: Character → Deck → practice-room.html → named local room with 1 player + 1 Bot. No online room RPC, no Legacy game, no new 3D tokens. Root README is authoritative.

# Scenario Card Adventure — ROUND 1–2

This directory contains the isolated foundation for the new `SCENARIO_ADVENTURE` game mode.

## Reused systems

- Supabase Auth, Lobby, Story Mission, Final Quiz, permanent card unlock and card collection remain unchanged.
- The existing 3D board, dice, movement and turn manager are retained for integration in later rounds.
- Existing reviewed scenario text is adapted into a clearly labelled local `MOCK` seed.

## Isolated legacy systems

The new mode capability config disables District construction, ownership, Influence Points, city actions and item actions. Legacy Battle runtime was removed by owner instruction on 14 October 2026. All map URLs now resolve to Scenario Adventure.

## Repository boundary

`ScenarioRepository` defines the content boundary. ROUND 1 uses `LocalScenarioRepository`; no migration or Production database write is performed. A Supabase-backed repository can replace it after its schema and RLS are reviewed and approved.

## Entry URL

`map-3d.html?mode=scenario-adventure`

ROUND 2 replaces the preview with a playable prototype:

- Five-card loadout using Starter/Permanent Unlock access only
- Maximum two copies per card type with unique in-match instance IDs
- Starting hand 3, draw pile 2, discard and next-turn reshuffle
- 3D dice/movement followed by a Scenario on every tile
- Card Response or contextual Basic Response
- Idempotent confirm/consume using resolved action IDs
- Bot uses the same deck rules and falls back to Basic Response
- Temporary response metadata is isolated from Legacy District/IP effects

RP/Stability, final Scenario card abilities, deep Bot strategy and Scenario match result remain ROUND 3 work.

Production persistence requires the reviewed but unapplied migration at `supabase/scenario_adventure_round2_loadout.sql`. Until it is explicitly approved and applied, the UI exposes a labelled session-only test start rather than pretending the five-card loadout was saved.

## Phase 4B.2A transition

Option B ถูกเตรียมไว้แบบ server capability gate:

- ก่อน `scenario_card_eligibility` พร้อม: ใช้ ROUND 2 policy เดิม 5 ใบ/ชนิดละไม่เกิน 2
- หลัง eligibility พร้อมและมี Starter อย่างน้อย 5 IDs: บังคับ 5 IDs ไม่ซ้ำ
- Starter เฉพาะโหมด: Privacy Shield, Threat Shutdown, Recovery Protocol, Data Audit, Firewall Guard
- Client validation ใช้เพื่อ UX เท่านั้น; `save_scenario_adventure_loadout` ต้องตรวจ auth, eligibility/unlock และ uniqueness ฝั่ง server
- Migration ใหม่เป็น draft ที่ `supabase/action_card_catalog_phase4b2a.sql` และยังไม่ Apply
