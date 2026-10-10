# AI District 3D Map

หน้าเริ่มต้นคือ `map-3d.html` และ `map-3d.js`

## Runtime dependencies

Dependencies ถูกล็อกเวอร์ชันผ่าน Import Map ใน `map-3d.html` เพื่อไม่เปลี่ยนระบบ build ของเว็บเดิม:

- React 18.3.1
- React DOM 18.3.1
- Three.js 0.170.0
- React Three Fiber 8.17.10
- Drei 9.117.3

## Components

- `BoardTile.js` — ช่องเดิน Mesh แยกอิสระ
- `District.js` — ฐานเขตและสถานะ Empty/Built
- `Building.js` — อาคาร Low Poly จาก Three.js primitives
- `CharacterToken.js` — Animation พื้นฐานแบบทีละช่องด้วย Delta Time
- `PlayerToken.js` / `BotToken.js` — ตัวหมากแยก Component และ Offset เมื่ออยู่ช่องเดียวกัน
- `AICore.js` — จุดศูนย์กลางเมือง
- `MapScene.js` — ฉาก แสง เงา กล้อง และ OrbitControls
- `board-data.js` — พิกัดช่องและ District

## Movement

- `TILE_POSITIONS` สร้างจากตำแหน่ง Mesh จริงของ `BOARD_TILES`
- `buildTilePath()` รองรับการเดินหลายช่องและวนกลับช่องเริ่มต้น
- ใช้เวลา 0.4 วินาทีต่อช่อง พร้อม smoothstep และ jump arc
- State ตำแหน่งจะอัปเดตหลังตัวหมากหยุดที่ Mesh ปลายทางจริง
- ระหว่างเดิน ปุ่ม movement และสร้าง District จะถูกล็อกเพื่อป้องกัน State ซ้อนกัน

รันชุดทดสอบเส้นทางด้วย `node --test map-3d/movement.test.mjs`

## Dice & Turn Management

- `Dice3D.js` — ลูกเต๋า Mesh 3D ครบ 6 หน้า กำหนดผลครั้งเดียวและหมุนก่อนหยุด
- `turn-manager.js` — State Machine: WAITING → ROLLING → MOVING → TILE_EVENT → ACTION_PHASE → TURN_END
- ผู้เล่นกดทอยเอง ส่วนบอททอย เดิน และเลือก Action ทดสอบอัตโนมัติ
- `TILE_EVENTS` รองรับ NORMAL, AI_SCENARIO, BATTLE, ITEM, DISTRICT และ SPECIAL
- Action Timer เริ่มหลัง Movement จบเท่านั้น กำหนดเวลาแต่ละ Event ได้และไม่น้อยกว่า 30 วินาที
- เมื่อหมดเวลา ระบบเลือกผลลัพธ์ปลอดภัยและดำเนินเทิร์นต่อโดยอัตโนมัติ
- `TURN_ORDER` เป็น Array จึงขยายจากผู้เล่น/บอทเป็นผู้เล่น 4 คนได้ภายหลัง

รันชุดทดสอบทั้งหมดด้วย `node --test map-3d/movement.test.mjs map-3d/turn-manager.test.mjs`

## เปลี่ยนอาคารเป็น GLB ภายหลัง

`District` เรียกอาคารผ่าน `BuildingModelSlot` แทนการเรียก primitive โดยตรง เมื่อต้องใช้ GLB ให้เปลี่ยน implementation ใน `BuildingModelSlot` เป็น `useGLTF(modelUrl)` แล้วส่ง `modelUrl` ผ่าน state ของ District ได้ โดยไม่ต้องแก้ตำแหน่งฐานหรือระบบเจ้าของพื้นที่

