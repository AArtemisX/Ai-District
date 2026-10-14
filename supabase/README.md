# Supabase database for Ai District

ไฟล์ `game_schema.sql` เป็น schema เริ่มต้น, `game_flow_extension.sql` เพิ่ม Intro Tutorial/Learning/AI World และ `gameplay_rules_extension.sql` เพิ่มสถานการณ์ สิ่งก่อสร้าง กติกา 8 รอบ และผลการแข่งขัน

## ข้อมูลที่เก็บ

| ตาราง | ใช้เก็บอะไร | ใครแก้ได้ |
| --- | --- | --- |
| `auth.users` | อีเมล รหัสผ่าน และ session | Supabase Auth |
| `profiles` | username, ชื่อแสดงผล, รูป, level, XP, credits, สถานะออนไลน์ | ผู้เล่นแก้ได้เฉพาะข้อมูลโปรไฟล์ของตนเอง ส่วนรางวัลให้เซิร์ฟเวอร์แก้ |
| `game_modes` | รายชื่อโหมด จำนวนผู้เล่น และโหมดจัดอันดับ | เซิร์ฟเวอร์/แอดมิน |
| `lobby_rooms` | ห้อง Lobby เจ้าของห้อง โหมด จำนวนผู้เล่น และสถานะห้อง | เจ้าของห้อง |
| `lobby_members` | สมาชิกในห้อง ตำแหน่ง และสถานะพร้อม | ผู้เล่นเจ้าของข้อมูล |
| `missions` | ภารกิจรายวัน/สัปดาห์และรางวัล | เซิร์ฟเวอร์/แอดมิน |
| `player_mission_progress` | ความคืบหน้าและการรับรางวัล | เซิร์ฟเวอร์ |
| `game_items` | แคตตาล็อกอาวุธ ชุด สกิน และไอเทม | เซิร์ฟเวอร์/แอดมิน |
| `player_inventory` | ไอเทมและจำนวนที่ผู้เล่นเป็นเจ้าของ | เซิร์ฟเวอร์ |
| `match_history` | โหมด เวลา และสถานะของแต่ละแมตช์ | เซิร์ฟเวอร์ |
| `match_players` | คะแนน ผลแพ้ชนะ kills/deaths และรางวัลต่อผู้เล่น | เซิร์ฟเวอร์ |
| `characters` | ตัวละคร Rank S/S+ และความสามารถ | ผู้เล่นอ่านได้ |
| `learning_lessons` | บทเรียนจริยธรรม 6 บทและผลกระทบ 5 บท | ผู้เล่นอ่านได้ |
| `player_tutorial_progress` | ขั้น Intro และเวลาที่เรียนจบ | เจ้าของบัญชี |
| `player_learning_progress` | บทที่ผ่าน คะแนน และเวลาที่เรียนจบ | เจ้าของบัญชี |
| `ai_world_sessions` | ห้องเกม เฟสปัจจุบัน ตัวละคร และสถานะกระดาน | สมาชิกห้อง |
| `ai_world_turns` | บล็อก การตัดสินใจ และผลลัพธ์แต่ละเทิร์น | สมาชิกห้อง |
| `ai_scenarios` | สถานการณ์ AI หลักฐาน ตัวเลือก คะแนน และผลกระทบ | ผู้เล่นอ่านได้ |
| `ai_facilities` | ประเภทสิ่งก่อสร้างและคะแนนพื้นฐาน | ผู้เล่นอ่านได้ |
| `ai_world_facility_states` | เจ้าของ ระดับ และคะแนนควบคุมในแต่ละแมตช์ | สมาชิกห้อง |

## วิธีสร้างฐานข้อมูล

1. เปิดโปรเจกต์ใหม่ใน Supabase Dashboard
2. ไปที่ **SQL Editor** แล้วเลือก **New query**
3. คัดลอกโค้ดทั้งหมดจาก `game_schema.sql`
4. กด **Run** แล้วสร้าง New query อีกครั้ง
5. คัดลอก `game_flow_extension.sql` และกด **Run**
6. รัน `gameplay_rules_extension.sql` เป็นไฟล์สุดท้าย
7. เปิด **Database > Tables** เพื่อตรวจว่าตารางถูกสร้างครบ
8. เปิด **Authentication > Providers > Email** และตั้งค่าการยืนยันอีเมลตามต้องการ

## หมายเหตุด้านความปลอดภัย

- ทุกตารางใน `public` เปิด RLS แล้ว
- หน้าเว็บควรใช้เฉพาะ Project URL และ publishable key
- ห้ามใส่ `service_role` หรือ secret key ลงใน JavaScript ฝั่งหน้าเว็บ
- XP, credits, inventory, mission rewards และ match results ไม่เปิดให้ browser เขียนโดยตรง เพื่อป้องกันการโกง
- หลังสมัครสมาชิก หน้าเว็บต้องสร้างแถว `profiles` ด้วย `id` ที่ได้จาก `auth.users`

## Phase 4B.2A migration draft

`action_card_catalog_phase4b2a.sql` เตรียม Canonical Action Card rows, Scenario-only starter eligibility, five-unique loadout constraint และ server-validated save RPC. ไฟล์นี้ยังไม่ได้ Apply และต้องผ่าน preflight/staging review ตาม `../CARD_CATALOG_MIGRATION_PLAN.md` ก่อนใช้งานจริง โดยไม่ควรรัน `scenario_adventure_round2_loadout.sql` ซ้ำร่วมกันโดยไม่ review ลำดับ migration.

## ขั้นตอนถัดไป

หลังรัน SQL แล้ว จึงนำ Project URL และ publishable key มาเชื่อม `login.js` กับ Supabase Auth และเปลี่ยน `lobby.js` ให้โหลดข้อมูลจริงจากตารางเหล่านี้

