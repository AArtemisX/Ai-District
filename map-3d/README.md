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

## AI Scenario System

- `scenario-data.js` — สถานการณ์ใช้งาน AI จริง 8 เรื่อง ครอบคลุม AI Literacy และ AI Ethics
- `scenario-engine.js` — เลือกสถานการณ์ ประเมินผล TIMEOUT คำนวณ DP และ Logic บอท โดยไม่ผูกกับ UI
- `ScenarioModal.js` — หน้าตัดสินใจและผลตอบกลับที่แสดงด้านข้างกระดาน
- แต่ละสถานการณ์มี 3 แนวทาง ให้ 3/1/0 DP ตามคุณภาพการตัดสินใจ และใช้เวลา 30–60 วินาที
- ผลลัพธ์เตรียมฟิลด์ `resources` และ `buildRights` ไว้สำหรับเชื่อม District Development ใน Phase 4
- คะแนนผู้เล่นและบอทแยกกัน บอทระดับ Standard มีโอกาสเลือก BEST/GOOD/POOR 55%/30%/15%

รันชุดทดสอบ Phase 3 ด้วย `node --test map-3d/scenario-engine.test.mjs`

## District Development & Influence

- `district-engine.js` — กติกากลางสำหรับ EN, IP, การสร้างเขต การเพิ่ม Influence และการเปลี่ยนเจ้าของ
- `DistrictPanel.js` — UI สำหรับ Build / Increase Influence / Skip พร้อม Action Timer 30 วินาที
- ผู้เล่นและบอทเริ่ม 5 EN สูงสุด 10 EN; Build ใช้ 3 EN และ Influence ใช้ 2 EN
- การสร้างให้ 3 IP ส่วนการเพิ่ม Influence ให้ 2 IP โดยจำกัด 12 IP ต่อฝ่ายต่อเขต
- สถานะเขตคำนวณเป็น NEUTRAL, OWNED หรือ CONTESTED และอาคารเปลี่ยนสีทันทีเมื่อเจ้าของเปลี่ยน
- Scenario แต่ละเรื่องเชื่อม District ชัดเจน และรางวัล BEST/GOOD/POOR ให้ EN 2/1/0 โดยไม่ใช้ DP เป็นค่าใช้จ่าย
- จำกัด District Action หนึ่งครั้งต่อเทิร์น และบอทใช้กติกาเดียวกับผู้เล่น

รันชุดทดสอบ Phase 4 ด้วย `node --test map-3d/district-engine.test.mjs`

## เปลี่ยนอาคารเป็น GLB ภายหลัง

`District` เรียกอาคารผ่าน `BuildingModelSlot` แทนการเรียก primitive โดยตรง เมื่อต้องใช้ GLB ให้เปลี่ยน implementation ใน `BuildingModelSlot` เป็น `useGLTF(modelUrl)` แล้วส่ง `modelUrl` ผ่าน state ของ District ได้ โดยไม่ต้องแก้ตำแหน่งฐานหรือระบบเจ้าของพื้นที่

