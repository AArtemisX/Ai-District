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
- `CharacterToken.js` — ตัวละครและบอทที่เคลื่อนตามช่อง
- `AICore.js` — จุดศูนย์กลางเมือง
- `MapScene.js` — ฉาก แสง เงา กล้อง และ OrbitControls
- `board-data.js` — พิกัดช่องและ District

## เปลี่ยนอาคารเป็น GLB ภายหลัง

`District` เรียกอาคารผ่าน `BuildingModelSlot` แทนการเรียก primitive โดยตรง เมื่อต้องใช้ GLB ให้เปลี่ยน implementation ใน `BuildingModelSlot` เป็น `useGLTF(modelUrl)` แล้วส่ง `modelUrl` ผ่าน state ของ District ได้ โดยไม่ต้องแก้ตำแหน่งฐานหรือระบบเจ้าของพื้นที่

