# Supabase database for NEON NEXUS

ไฟล์ `game_schema.sql` เป็น schema เริ่มต้น และ `game_flow_extension.sql` เพิ่ม Intro Tutorial, Learning และ AI World

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

## วิธีสร้างฐานข้อมูล

1. เปิดโปรเจกต์ใหม่ใน Supabase Dashboard
2. ไปที่ **SQL Editor** แล้วเลือก **New query**
3. คัดลอกโค้ดทั้งหมดจาก `game_schema.sql`
4. กด **Run** แล้วสร้าง New query อีกครั้ง
5. คัดลอก `game_flow_extension.sql` และกด **Run**
6. เปิด **Database > Tables** เพื่อตรวจว่าตารางถูกสร้างครบ
7. เปิด **Authentication > Providers > Email** และตั้งค่าการยืนยันอีเมลตามต้องการ

## หมายเหตุด้านความปลอดภัย

- ทุกตารางใน `public` เปิด RLS แล้ว
- หน้าเว็บควรใช้เฉพาะ Project URL และ publishable key
- ห้ามใส่ `service_role` หรือ secret key ลงใน JavaScript ฝั่งหน้าเว็บ
- XP, credits, inventory, mission rewards และ match results ไม่เปิดให้ browser เขียนโดยตรง เพื่อป้องกันการโกง
- หลังสมัครสมาชิก หน้าเว็บต้องสร้างแถว `profiles` ด้วย `id` ที่ได้จาก `auth.users`

## ขั้นตอนถัดไป

หลังรัน SQL แล้ว จึงนำ Project URL และ publishable key มาเชื่อม `login.js` กับ Supabase Auth และเปลี่ยน `lobby.js` ให้โหลดข้อมูลจริงจากตารางเหล่านี้

