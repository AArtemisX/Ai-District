# Action Card System Foundation

โมดูลนี้เป็น UI/Data Foundation สำหรับ Action Cards และแยกจากระบบเกมจริงโดยเจตนา

## Phase 4B.2A — Canonical Catalog Preparation

- Canonical ID mapping ครบ Prototype 10 ใบ โดยไม่ให้ Ownership จาก client
- `firewall-guard` ใช้ Production row เดิมและไม่มี duplicate identity
- Scenario starter candidates 5 ใบอยู่ใน server eligibility policy ไม่แก้ global starter
- ก่อน server capability พร้อม ระบบยัง fallback กติกา Legacy; หลังพร้อมจึงใช้ 5 unique IDs
- Migration draft และรายละเอียด rollout อยู่ที่ `CARD_CATALOG_MIGRATION_PLAN.md`
- Card effects ทั้ง 9 row ใหม่ยัง disabled และไม่เชื่อม Gameplay

## Phase 4B.1 — Catalog / Inventory Mapping

- `card-catalog.js` รวม Production Inventory 8 ใบกับ Prototype Definitions โดยไม่เปลี่ยนสิทธิ์ผู้เล่น
- Mapping ที่ยืนยันแล้วมีเพียง `prototype-firewall-guard` → `firewall-guard`; อีก 9 ใบเป็น `PROTOTYPE_ONLY`
- Prototype ที่ไม่มี `inventoryCardId` ไม่ผ่าน Match Eligibility แม้ Client จะส่ง ID ในรายการ Unlock
- Production `action_cards`, `user_card_unlocks` และ `is_starter` ยังเป็นแหล่งสิทธิ์จริง
- Card Inventory และ Scenario Pre-match แสดง Prototype/Locked/Unlocked/Equipped แยกกัน
- `mechanics-contract.js` บันทึก Mechanics 1.0 แบบไม่มี Side Effects; RP/Stability ยังปิด
- Starter policy ยังคง 3 ชนิดและไม่เกิน 2 Copies ต่อชนิด เพื่อให้ผู้เล่นใหม่สร้าง Deck 5 ใบได้
- ไม่มี Schema/RPC/Reward change และ migration 5 ใบยังไม่ Apply

## Phase 4A — Main Web Integration

- Lobby แสดง Action Card Hub ที่ลิงก์ไปยังคลังถาวร, Prototype Gallery และ Scenario Deck Builder 5 ใบ
- Prototype Gallery เป็น Sandbox เท่านั้น การเลือกชุดทดลองไม่เขียนสิทธิ์หรือ Loadout ของผู้ใช้
- Permanent Inventory (`card-inventory.html`) ยังคงกติกา District Battle 3 ใบเดิม
- Scenario Pre-match (`map-3d.html?mode=scenario-adventure`) ใช้ระบบเดิมตรวจ Starter/Permanent Unlock, Deck 5 ใบ และสำเนาสูงสุด 2 ใบต่อชนิด
- Prototype Sandbox ป้องกัน ID ซ้ำ แต่ Pre-match เดิมยังอนุญาตสำเนาสูงสุด 2 ใบเพื่อให้ Starter 3 ชนิดสร้าง Deck 5 ใบได้; การเปลี่ยนเป็น 5 ID ไม่ซ้ำต้องเพิ่ม Starter อย่างถูกต้องในรอบที่ได้รับอนุมัติ
- ไม่มี Effect Execution, Supabase Schema Change หรือ Gameplay Balance Change ใน Phase นี้
- Integration contract ตรวจโดย `main-web-integration.test.mjs`

## Artwork Integration

- การ์ดทั้ง 10 ใบอ่านไฟล์ PNG จริงจาก `assets/` ผ่าน `artwork.src`
- Deploy mirror ใช้ไฟล์ชื่อเดียวกันใน `dist/assets/`
- Component รักษาสัดส่วนต้นฉบับ 1122 × 1402 และใช้ Placeholder เมื่อ `<img>` โหลดไม่สำเร็จ
- ไม่มีการเปลี่ยน Card Effect, Gameplay, Inventory หรือ Database

## Phase 2 — Prototype Collection

- Prototype Cards 10 ใบ ครบ 5 ประเภท ประเภทละ 2 ใบ
- การ์ดทั้งหมดมี ID ไม่ซ้ำและ `isPrototype: true`
- ไม่มีค่าพลังโจมตี ความเสียหาย คะแนน หรือ Effect Execution จริง
- Collection เลือกชุดทดลองได้สูงสุด 5 ใบและแสดงรายละเอียดการ์ดที่เลือกล่าสุด
- Selected และ Disabled State ใช้ Component เดิม; Disabled Preview ไม่เปลี่ยนสถานะข้อมูลจริงของการ์ด

รายชื่อ: Privacy Shield, Firewall Guard, Threat Shutdown, System Countermeasure, Recovery Protocol, Human Assistance, Data Audit, Explainability Insight, Ethical Override และ Responsible AI Protocol

## เปิดหน้า Preview

เปิด `action-card-preview.html` ผ่าน Local Web Server หรือเปิด Deploy mirror ที่ `dist/action-card-preview.html`

## โครงสร้าง

- `card-data.js` — JSDoc Data Model, enums, prototype cards และ schema validation
- `collection-engine.js` — pure selection/validation functions สำหรับชุดทดลองไม่เกิน 5 ใบ
- `ActionCard.js` — reusable presentational component
- `CardCollection.js` — filter, selection, remove และ count UI
- `app.js` — preview composition เท่านั้น
- `card-system.test.mjs` — pure logic/data tests

## ขอบเขตที่ยังไม่เชื่อม

- Scenario Engine
- Battle Engine
- Inventory / Permanent Unlock
- Match Loadout persistence
- Card draw / consume / resolve effects
- Supabase

ข้อมูลความสามารถทั้งหมดใน `ACTION_CARD_PROTOTYPES` เป็น Placeholder และมี `isPrototype: true` เพื่อป้องกันการตีความว่าเป็นกติกาจริง

## การทดสอบ

```powershell
node --test action-cards/card-system.test.mjs
node --test
```

- Action Card System + Main Web Integration + Catalog Mapping: 16/16 ผ่าน
- Full Regression ทั้ง Source และ `dist/`: 165/165 ผ่าน (Phase 4B.2A)
- Source/`dist/` SHA-256 ตรงกันครบทุกไฟล์ของโมดูล
- ยังต้องตรวจ Visual QA ใน Browser จริงผ่าน Local Web Server ก่อน Deploy

