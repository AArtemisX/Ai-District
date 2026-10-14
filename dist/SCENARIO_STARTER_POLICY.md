# Scenario Adventure Starter Policy — Option B

## Policy ที่อนุมัติ

หลัง migration เท่านั้น Scenario Adventure ใช้ Starter 5 ID ที่ไม่ซ้ำ:

1. `privacy-shield`
2. `threat-shutdown`
3. `recovery-protocol`
4. `data-audit`
5. `firewall-guard`

Starter เหล่านี้บันทึกใน `public.scenario_card_eligibility` โดย `game_mode_code = 'scenario-adventure'` ไม่เปลี่ยน `public.action_cards.is_starter` และไม่เพิ่ม `public.user_card_unlocks` ให้ผู้เล่น

## Compatibility Gate

- ก่อน migration หรือตอน query eligibility ไม่สำเร็จ: `LEGACY_COMPAT`, Deck 5 ใบ, Starter เดิม 3 ชนิด, ซ้ำได้สูงสุด 2 ใบ
- หลัง server ส่ง eligibility ที่ active อย่างน้อย 5 ID: `FIVE_UNIQUE_STARTERS`, Deck 5 ใบ, ID ต้องไม่ซ้ำ
- Client gate ใช้ข้อมูลจาก server เท่านั้น ไม่ใช้ `localStorage`, query string หรือ flag ที่ผู้เล่นแก้เองได้
- RPC บังคับ 5 unique IDs และตรวจ mode starter/permanent unlock ซ้ำอีกชั้น จึงไม่เชื่อ client validation

## Ownership Rules

- Mode starter: ใช้ได้ใน Scenario Adventure แต่ไม่ใช่สิทธิ์ถาวร
- Permanent unlock: ต้องมี `user_card_unlocks` ที่ server สร้างจาก flow ที่เชื่อถือได้
- Prototype-only: ดู Artwork/ข้อมูลได้ แต่ใช้ใน Match ไม่ได้
- Legacy Battle: starter, loadout 3 ใบ, reward และ card effect เดิมไม่เปลี่ยน

## Safe Rollout

1. ตรวจ production preflight และสำรอง schema/data ตามกระบวนการของผู้ดูแล
2. Review `supabase/action_card_catalog_phase4b2a.sql`
3. Apply ใน staging ก่อน
4. รัน verification queries และทดสอบผู้เล่นใหม่/ผู้เล่นเดิม
5. เปิด production migration เมื่อผลผ่าน
6. หาก client ยังไม่เห็น capability จะ fallback กติกาเดิมโดยอัตโนมัติ

## Recovery

Migration ไม่ลบ legacy row หรือแก้ global starter. หากต้องหยุด rollout ให้ตั้ง `scenario_card_eligibility.is_active = false` สำหรับ mode นี้ผ่าน migration ที่ผ่านการ review; client จะ fallback เป็น `LEGACY_COMPAT`. ห้ามลบ unlock หรือ reward ของผู้ใช้เพื่อ rollback.

