# AI District — Shared 3D Scene

Legacy District Battle ถูกนำออกตามคำสั่งเจ้าของวันที่ 14 ตุลาคม 2026

Runtime: `map-3d.html` → `map-3d-entry.js` → `scenario-adventure/app.js` เท่านั้น
Flow: Character Selection → Deck Builder → `practice-room.html` → named local room → Scenario game with 1 player + 1 Bot.

เก็บเฉพาะส่วนที่ Scenario ใช้: BoardTile/board-data, Dice3D/dice-data, PlayerToken/BotToken/CharacterToken, turn-core, AICore, CityFoundation/CityProps, SkyDecor, TransitDecor, runtime และ Action Card/Scenario seed data ที่ใช้ร่วมกับระบบเดิม

`turn-manager.js` เป็น compatibility re-export ของ turn-core เท่านั้น ไม่มี Legacy Tile Events. ไม่มี map-3d.js, MapScene, District building/ownership/IP engine หรือ Legacy Battle runtime แล้ว

ฉากยังใช้ React 18.3.1, Three 0.170.0, R3F 8.17.10 และ Drei 9.117.3 ผ่าน Import Map เดิม ไม่มีการเปลี่ยน 3D Token, Dice หรือ Movement
