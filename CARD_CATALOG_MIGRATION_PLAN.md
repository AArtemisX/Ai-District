# Safe Card Catalog Migration Plan — Phase 4B.2A

สถานะ: **Prepared / Not Applied**

## เป้าหมาย

- เพิ่ม Canonical Production IDs ให้ Prototype 10 ใบโดยรักษา `firewall-guard` เดิม
- เพิ่ม Starter 5 ใบเฉพาะ Scenario Adventure
- บังคับ Scenario Loadout 5 IDs ไม่ซ้ำด้วย RPC และ constraint ฝั่ง server
- รักษา Legacy Battle, rewards, permanent unlocks และ effects เดิม

## ไฟล์ Migration Draft

`supabase/action_card_catalog_phase4b2a.sql`

Draft ทำงานใน transaction และมี:

- Preflight ตรวจ tables และ collision ของ `firewall-guard`
- Insert 9 canonical rows ที่ยังไม่มีด้วย `ON CONFLICT DO NOTHING`
- Effect ของแถวใหม่เป็น `DESIGN_CONTRACT_ONLY` และ `enabled:false`
- `scenario_card_eligibility` พร้อม RLS แบบ read-only สำหรับ authenticated
- `scenario_adventure_loadouts` พร้อม unique `(user_id, action_card_id)`
- SECURITY DEFINER internal RPC ที่ใช้ `auth.uid()`, advisory lock, ตรวจ exact 5 unique และ ownership/mode eligibility
- Public SECURITY INVOKER wrapper; anon ไม่มีสิทธิ์ execute
- Verification queries หลัง apply

## Preflight ก่อน Apply จริง

1. ยืนยัน `action_cards`, `profiles`, `user_card_unlocks`, `lesson_rewards`, `scenario_adventure_loadouts`
2. ตรวจ constraint ของ `action_cards.card_type`
3. ตรวจ ID ทั้ง 10 และยืนยันไม่มี semantic collision
4. ตรวจ Scenario loadout เดิมว่าไม่มี duplicate `(user_id, action_card_id)`
5. Snapshot จำนวน rows ของ catalog, unlock, rewards และ loadouts
6. ตรวจ `access-denied` reward ของ `ai-ethics-m6-01` ว่ายังเหมือนเดิม
7. Review RLS/GRANT และ execute migration ใน staging ก่อน production

## Invariants

- ไม่แก้ `lesson_rewards` หรือ Reward RPC
- ไม่เพิ่ม/ลบ `user_card_unlocks`
- ไม่แก้ `player_card_loadouts` หรือ Legacy starter flags
- ไม่เปิดใช้ Card Effects ใหม่
- ไม่ใช้ Service Role ใน frontend
- ไม่ลบข้อมูลผู้ใช้

## Verification หลัง Apply

- Catalog canonical IDs ครบ 10 และ `firewall-guard` มีเพียงหนึ่งแถว
- Eligibility active starter มี 5 unique IDs ตรง policy
- ผู้เล่นใหม่สร้าง Scenario Deck 5 unique ได้
- ID นอก starter/unlock ถูก RPC ปฏิเสธ
- Refresh แล้วยังคง loadout
- Legacy loadout 3 ใบและ Final Quiz reward ยังทำงาน
- Source/`dist` build และ regression ผ่าน

## Recovery Strategy

ระบบ client ใช้ server capability detection. หาก eligibility ไม่พร้อมหรือถูกปิด ระบบกลับไป `LEGACY_COMPAT` อัตโนมัติ. การปิด rollout ควรทำผ่าน reviewed forward migration ที่ตั้ง eligibility inactive; ไม่ย้อนด้วยการลบ catalog, unlock, reward หรือ loadout. เก็บ canonical rows ไว้เพื่อลด foreign-key risk.

## ข้อจำกัด

- Draft ยังไม่ได้ตรวจ syntax ด้วย PostgreSQL server จริงและยังไม่ได้ Apply
- Compatibility/effect metadata เป็น readiness contract เท่านั้น
- Production Security Advisor ปัจจุบันเตือน Public `SECURITY DEFINER` RPC เดิม 18 รายการและ Leaked Password Protection ที่ยังปิด; อยู่นอก scope และ migration นี้ไม่เพิ่ม public definer RPC ใหม่

