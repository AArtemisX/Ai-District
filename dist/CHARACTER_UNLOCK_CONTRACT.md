# AI District — Character Unlock Design Contract

สถานะ: **Phase 5A Design Only**  
วันที่: 14 ตุลาคม 2026  
ข้อจำกัด: เอกสารนี้ไม่ใช่ Migration, ไม่เปิด Character Claim และไม่เปลี่ยนตัวละคร Locked ให้เล่นได้

## 1. Character Ownership Data Model

Client contract อยู่ใน `characters/character-unlock-contract.js` และใช้ Character ID จริงจาก `characters/character-roster.js` เท่านั้น

| Field | ความหมาย | กติกา Phase 5A |
| --- | --- | --- |
| `characterId` | Canonical Character ID | ต้องตรงกับ Roster |
| `unlockType` | `STARTER` หรือ `STORY_MISSION` | Locked ทั้ง 6 ใช้ `STORY_MISSION` |
| `requiredMissionId` | Production Mission/Lesson ID ที่ Backend อนุมัติ | เป็น `null` จนมี record จริง ห้ามเดาจาก Client |
| `requiredCompletionStatus` | สถานะที่ Server ต้องยืนยัน | Locked ใช้ `SERVER_VERIFIED_QUIZ_PASS` เป็น Design Contract |
| `requiredQuizScore` | คะแนนขั้นต่ำที่ Backend อนุมัติ | เป็น `null` จนออกแบบ Final Assessment |
| `rewardCharacterId` | Character ที่จะให้สิทธิ์ | ต้องตรงกับ `characterId` |
| `ownershipStatus` | `FREE`, `LOCKED`, `OWNED` | Phase 5A ไม่มีการสร้าง `OWNED` ใหม่ |

Free Characters คือ `alexander`, `mamasan`, `milo` ส่วน Locked Characters คือ `albert`, `alice`, `dylan`, `nancy`, `nicolas`, `noah`

## 2. Mission-to-Character Reward Mapping

Mission 02 ยังไม่มี Production Mission ID จึงใช้เพียง Draft Key `mission-story-02-nancy-draft` สำหรับงานออกแบบ และมี Mapping Preview ดังนี้:

| Draft Key | ชื่อ | Reward Character | Production Mission ID | Claim |
| --- | --- | --- | --- | --- |
| `mission-story-02-nancy-draft` | คะแนนที่มองไม่เห็น | `nancy` | ยังไม่กำหนด | ปิด |

ห้ามใช้ Draft Key แทน Foreign Key หรือหลักฐานสิทธิ์ถาวร เมื่อมี Mission อื่นในอนาคตต้องตรวจ ID ที่มีอยู่จริงก่อนเพิ่ม Mapping

## 3. Unlock Verification Flow

1. ผู้เล่น Login และเริ่ม Mission ที่ Backend ระบุว่า Active
2. Mission Player บันทึก Progress ตามระบบเดิม แต่ Progress เพียงอย่างเดียวไม่ให้ Ownership
3. ผู้เล่นทำ Final Assessment ผ่าน RPC ที่ตรวจคำตอบและคะแนนฝั่ง Server
4. Reward Claim RPC ตรวจ `auth.uid()`, Mission ID, Completion, Quiz attempt, คะแนนขั้นต่ำ และ Reward mapping อีกครั้ง
5. Server insert Ownership แบบ idempotent แล้วส่งผล `UNLOCKED` หรือ `ALREADY_UNLOCKED`
6. Character Selection อ่าน Ownership จาก Server แล้วจึงอนุญาตให้เลือก
7. หาก Server ไม่พร้อมหรือ Request ล้มเหลว ตัวละครต้องคง `LOCKED` และผู้เล่น Retry ได้ภายหลัง

Client localStorage, sessionStorage, URL parameter, Mission Progress JSON หรือค่า `passed` ที่ Client ส่งมา ห้ามใช้เป็นหลักฐาน Ownership

## 4. Security Requirements

- ใช้ Supabase Auth และ `auth.uid()` ภายใน RPC
- Character reward mapping และคะแนนขั้นต่ำต้องอ่านจากตารางที่ Server ควบคุม
- Frontend ใช้ Anon/Publishable Key เท่านั้น ห้ามมี Service Role Key
- เปิด RLS และให้ผู้เล่นอ่านเฉพาะ Ownership ของตนเอง
- ห้ามให้ `authenticated` insert/update/delete Ownership โดยตรง
- RPC แบบ `security definer` ต้องกำหนด `search_path` ชัดเจนและตรวจสิทธิ์ทุกครั้ง
- ห้ามเชื่อ `characterId`, Mission passed, Quiz score หรือ attempt ID ที่ Client ส่งมาโดยไม่ตรวจฐานข้อมูล
- เก็บ Audit fields ที่จำเป็น เช่น source mission, source attempt และเวลาปลดล็อก โดยไม่เก็บข้อมูลส่วนบุคคลเกินจำเป็น

## 5. Idempotency Requirements

- Unique key ขั้นต่ำควรเป็น `(user_id, character_id)`
- Reward Claim ซ้ำต้องคืน Ownership เดิม ไม่ insert ซ้ำ
- Refresh, Retry, Double click และหลายแท็บต้องให้ผลเหมือนกัน
- ใช้ transaction ครอบการตรวจ eligibility และ insert
- หากมี submission/claim ID ให้บันทึกเพื่อป้องกัน replay แต่ห้ามให้ ID จาก Client ข้ามการตรวจ eligibility

## 6. Compatibility with Existing Card Rewards

Card Reward ปัจจุบันใช้ `claim_lesson_reward(text)` และ `user_card_unlocks` สำหรับ Access Denied ของ Mission 01 ระบบ Character ต้องแยกตารางและ RPC เพื่อไม่เปลี่ยนความหมายของ Card Ownership

- Mission เดียวสามารถมี Card Reward และ Character Reward ได้ในอนาคต แต่ต้อง Claim แยกประเภทอย่างชัดเจน
- ห้ามเปลี่ยน `lesson_rewards`, `user_card_unlocks` หรือ `claim_lesson_reward` ใน Phase 5A
- การปลดล็อก Character ต้องไม่เพิ่ม/ลบ Card และการใช้ Card ใน Match ต้องไม่กระทบ Character Ownership
- Mission 01 ยังคง Final Quiz 10 ข้อ ผ่าน 8/10 และให้ Access Denied เท่านั้น

## 7. Database Migration Plan — Design Only

Phase 5B หรือรอบที่ได้รับอนุมัติจึงค่อยออกแบบ Migration โดยตรวจ Schema จริงก่อน แนวทางเบื้องต้น:

1. `characters` — canonical catalog และสถานะ active
2. `mission_character_rewards` — mapping Mission → Character พร้อม completion/score policy
3. `user_character_unlocks` — ownership ต่อผู้ใช้ พร้อม source mission/attempt
4. Index และ unique constraints
5. RLS สำหรับ read-own และ deny direct write
6. Private verification function + public authenticated wrapper
7. Seed เฉพาะ Mapping ที่ได้รับอนุมัติ
8. Staging verification, Security Advisor และ rollback plan

เอกสารนี้ไม่สร้าง SQL และไม่ Apply Production Migration

## 8. Failure / Retry Handling

- Quiz ผ่านแต่ Claim ล้มเหลว: เก็บผลผ่านเดิม แสดง Retry โดยไม่ทำ Quiz ซ้ำโดยบังคับ
- Claim timeout: ตรวจ Ownership ก่อน retry เพื่อเลี่ยงรายการซ้ำ
- Mapping ไม่พร้อม: คืน `REWARD_NOT_CONFIGURED` และคงตัวละคร Locked
- Mission/attempt ไม่ผ่าน: คืน `NOT_ELIGIBLE` โดยไม่เปิดเผย Answer Key
- Ownership มีอยู่แล้ว: คืน `ALREADY_UNLOCKED`
- Client offline: แสดงสถานะล่าสุดที่ Server ยืนยันได้เท่านั้น ห้ามเปิดเล่นจาก Cache

## 9. Backward Compatibility

- Free 3 ตัวเลือกได้ผ่าน `isSelectableCharacter` เหมือนเดิม
- Locked 6 ตัวยังเลือกไม่ได้จน Server Ownership integration เสร็จ
- Session identity เดิมเก็บเฉพาะ Free Character ที่ผ่าน validation
- Full-card Character Selection และ Story Portrait ใช้ Asset เดิม
- Scenario Adventure, Deck Builder, Mission 01, Quiz และ Card Reward ไม่เปลี่ยน
- ข้อมูลเก่าที่ไม่มี Character Ownership ต้องตีความเป็น Free starters + Locked roster ไม่ใช่แจกสิทธิ์ใหม่

## 10. Future Phase Implementation Tasks

1. อนุมัติ Production Mission ID และ Final Assessment ของ Mission 02
2. อนุมัติคะแนนขั้นต่ำและ Nancy reward mapping
3. ตรวจ Supabase schema จริงและทำ Migration/RLS/RPC ใน Staging
4. เพิ่ม Character ownership repository ฝั่ง Client แบบ read-only + server claim
5. ปรับ `isSelectableCharacter` ให้รวม Server-owned character โดยไม่เชื่อ Client state
6. เพิ่ม Claim UI ที่แสดงเฉพาะหลัง Server ยืนยัน eligibility
7. ทดสอบ refresh, multi-tab, retry, duplicate claim และ account isolation
8. ทดสอบ Regression ของ Access Denied และ Scenario Adventure ก่อน Production rollout

