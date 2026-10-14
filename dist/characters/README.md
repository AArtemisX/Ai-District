# AI District S+ Character Roster

โมดูลนี้แยก Character Definition, session-only Scenario identity และ Story Mission portrait markup ออกจาก Gameplay Token

## Roster

- Free: Alexander, MAMASan, Milo
- Locked: Albert, Alice, Dylan, Nancy, Nicolas, Noah
- Full-card artwork อยู่ใน `assets/` และมีขนาด 1058 × 1486

## Runtime boundaries

- `character-roster.js` เป็น local metadata เท่านั้น ไม่ใช่ ownership database
- `character-session.js` ยอมรับเฉพาะตัวละคร `FREE` และบันทึกเฉพาะ `sessionStorage`
- `StoryCharacterPortrait.js` พร้อมใช้ใน Story Mission ภายหลัง แต่ยังไม่ถูกเชื่อมกับ Dialogue Engine
- Selection ไม่เปลี่ยน `PlayerToken`, `BotToken`, Dice, Movement หรือ Turn Manager

## Entry

เปิด `character-selection.html` หลัง Login หรือเข้าผ่าน Lobby Action Card Hub

