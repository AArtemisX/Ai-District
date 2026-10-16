# Phase 5C — Character Unlock Migration Plan

วันที่: 14 ตุลาคม 2026 (Asia/Bangkok)

สถานะ: **Local Foundation + SQL Draft only. Not applied. PostgreSQL integration NOT VERIFIED.**

## Scope and activation boundary

- Draft: `supabase/character_unlock_phase5c.DRAFT.sql`. ไฟล์แยกจาก migration runner และห้าม Apply Production อัตโนมัติ
- เพิ่ม canonical catalog 9 ตัว, server-only lesson/quiz/character mapping, own-row ownership และ `claim_character_reward(text)`
- Mapping เริ่มต้นว่าง ไม่มี Nancy seed หรือ ownership seed; catalog row ไม่ใช่สิทธิ์ผู้ใช้
- ไม่แก้ Mission 01, quiz submission, Card reward tables/RPC, Auth หรือ Gameplay
- Client อ่าน ownership ได้ แต่ไม่มี Claim UI, ไม่มีการเรียก Claim และยังเลือกเข้าเกมได้เฉพาะ Free 3 ตัว การเปิด Locked character ใน session/game entry เป็นงาน rollout ถัดไป
- Source of truth ของรอบนี้คือราก `D:/Ai-District-main` และ `dist/`. โฟลเดอร์ `Ai-District-main/` ที่ซ้อนอยู่เป็นสำเนาเดิมและไม่ใช่ชุดทำงานต่อ

## Preconditions — before staging, not satisfied by static tests

1. เจ้าของอนุมัติการใช้ Staging ก่อน Apply และสำรอง schema/data ที่เกี่ยวข้อง; Production ต้องอนุมัติแยก
2. ตรวจ schema จริงเทียบ local SQL: `profiles.id uuid`, `learning_lessons.id bigint/code/is_active`, `lesson_quizzes.id uuid/lesson_id/passing_score/total_questions/is_active`, `quiz_attempts.id/user_id/quiz_id/score/max_score/passed/submitted_at` และ private submission function
3. ยืนยันตารางใหม่ยังไม่มี เพราะ Draft ใช้ `create table` โดยตั้งใจให้ abort หากชน schema เดิม ไม่ใช้ `IF NOT EXISTS` กลบ drift
4. ตรวจ grants, column grants, role inheritance และ RLS ของ `quiz_attempts`: browser roles ไม่มี insert/update/delete; Draft จะ abort หากพบสิทธิ์เหล่านี้
5. ตรวจทุก RPC/trigger ที่เขียนหรือแก้ attempts และข้อมูลเก่า เพื่อยืนยันว่า attempts เป็นผล Server grading จริง; absence of direct table grants เพียงอย่างเดียวไม่พิสูจน์ provenance ถ้ามี RPC อื่นที่เขียนคะแนนจาก Client ได้
6. ตรวจ `submit_lesson_quiz` และ private implementation จริง รวม Answer Keys, Quiz configuration และ policy โดยไม่แก้ Mission 01; local implementation ปัจจุบันบังคับ 10 ข้อ ดังนั้น Mission 02 Final Assessment ต้องสอดคล้องหรือผ่านงานปรับ verifier ที่อนุมัติแยก
7. ตรวจ `private.quiz_answer_keys` advisory แยก; การแก้ RLS/permissions ต้องทดสอบ Quiz เดิม ไม่รวม remediation ใน Draft นี้
8. ตรวจ function owner เป็น trusted migration role, schema CREATE privileges, Data API exposure ของ `public` และ explicit `GRANT SELECT/EXECUTE` ที่ Draft กำหนด
9. บันทึก Mission 01 baseline: Quiz 10 ข้อ, ผ่าน 8/10, Card reward `access-denied`; ไม่มี Character reward

## Draft design

- `character_reward_catalog`: canonical IDs พร้อม starter flag ตรงกับ roster; ไม่มี browser access
- `mission_character_rewards`: หนึ่ง policy ต่อ lesson, quiz ID จริง, character ID, minimum score, snapshot passing/total questions, `eligible_attempts_since`, `approved_at`, `is_active=false` โดย default
- `user_character_unlocks`: primary key `(user_id,character_id)`, audit source lesson/attempt/time และ RLS read-own เท่านั้น
- RPC รับเพียง lesson code เพื่อ lookup; derive user จาก `auth.uid()`, mapping/quiz จาก Server, attempts จาก user/quiz ที่ตรงกันและ `passed=true`
- ตรวจ score, max score, approved threshold, active lesson/quiz/mapping, approval และ cutoff ป้องกันใช้ attempts ก่อน policy ที่กำหนด
- ตรวจ browser attempt-write privileges ซ้ำตอน Claim; ไม่มีการอ้าง progress JSON หรือ local completion
- ล็อก policy/lesson/quiz/catalog และ attempt ระหว่าง transaction; `ON CONFLICT ON CONSTRAINT` กันหลายแท็บ/หลาย request; คืน `UNLOCKED` หรือ `ALREADY_UNLOCKED`
- คืน `REWARD_NOT_CONFIGURED` หาก mapping ไม่พร้อม/policy drift; คืน `NOT_ELIGIBLE` หากไม่มีผลผ่าน; unauthenticated เรียกไม่ได้
- เมื่อ policy ถูกปิด/เปลี่ยนจนตรวจไม่ผ่าน การ Claim ซ้ำอาจคืน not configured/not eligible; existing permanent ownership ไม่ถูกลบ
- RLS และ explicit revokes ป้องกัน browser เขียน ownership; `search_path=''` และ fully qualified relation names

## Mission 02 activation — separate approved change

1. Content review และอนุมัติ Production Lesson ID/code, Final Quiz, passing score และ Nancy reward
2. ตรวจ verifier รองรับ assessment จริงและสร้างผลผ่านฝั่ง Server ได้; ทดสอบก่อน seed mapping
3. สร้าง mapping ใน Staging ด้วย lesson/quiz ID จริง, snapshot thresholds, eligible-attempt cutoff และ approval time; ไม่ใช้ `mission-story-02-nancy-draft` เป็น lesson code จริง
4. ผ่าน integration/security matrix ด้านล่าง แล้วเตรียม production change ให้เจ้าของตรวจและอนุมัติ
5. เพิ่ม Claim UI เฉพาะเส้นทางจริง และ re-read ownership หลัง Claim/timeout; เปิดเลือก character/session/game entry โดยตรวจสิทธิ์ Server ใหม่หลัง login/account switch ทุกครั้ง
6. Browser/session identity เป็น UI identity ไม่ใช่ authorization; protected gameplay/reward operations ต้องยืนยัน Server เอง

## Verification checklist — run on disposable Staging

ใช้บัญชี A/B จริงผ่าน Auth, browser role `authenticated`, และ quiz submission RPC จริงเพื่อสร้าง attempts ห้าม insert score ด้วย Client เป็นหลักฐานทดสอบ success path

| Case | Expected |
| --- | --- |
| Apply Draft with reviewed prerequisites | Tables/RLS/grants/function created; mapping and ownership empty |
| Anonymous SELECT/Claim | denied; no ownership |
| A SELECT while B owns character | A sees no B row; B sees own row |
| Direct INSERT/UPDATE/DELETE ownership or reward mapping/catalog from browser | denied |
| Direct or column-level INSERT/UPDATE attempt grant exists | Draft aborts; Claim refuses |
| Preview completion/localStorage/URL/forged score/passed/attempt/user/character | no ownership; RPC accepts only lesson code |
| Mapping absent/inactive/unapproved; lesson/quiz inactive; wrong lesson/quiz; threshold drift | REWARD_NOT_CONFIGURED |
| Failed score, passed=false, wrong account/quiz, old cutoff, mismatched max score | NOT_ELIGIBLE |
| Real server quiz pass meeting approved policy | UNLOCKED, one audit row with correct sources |
| Same pass repeated, double click, two concurrent connections | one row; UNLOCKED then ALREADY_UNLOCKED |
| Mapping update races Claim | serialized by locks; no mixed policy insert |
| Offline/missing table/timeout/account switch/retry | client ERROR/LOADING; no stale unlock; Free still usable |
| Refresh and fresh login | own server read; no cache-derived permission |
| Mission 01 Quiz + Access Denied | unchanged and passes regression |

หลังทดสอบตรวจ Security Advisor, RLS table policies, table/column privileges, function ACL/search_path/owner, indexes, referential integrity และ API behavior. Static SQL assertions ไม่ใช่ PostgreSQL execution tests

## Rollback checklist

1. ปิด rollout/Claim UI และปิด active mapping ด้วย trusted admin; ไม่ลบข้อมูลผู้ใช้ทันที
2. Revoke execute ของ `public.claim_character_reward(text)` จาก authenticated เพื่อหยุด Claim ใหม่
3. สำรอง `user_character_unlocks` และ reward policies พร้อม audit fields ก่อนเปลี่ยน schema
4. หาก staging disposable และยังไม่มีข้อมูลจริง: drop function ก่อน แล้ว drop ownership, mappings, catalog ตามลำดับภายใน transaction โดยใช้ชื่อเฉพาะและไม่ใช้ CASCADE
5. Production ที่มี ownership จริง: ใช้ forward fix หรือ restore ที่ได้รับอนุมัติ ห้าม drop ownership โดยพลการ
6. คืน frontend รุ่นก่อน ตรวจ Free selection, Mission 01 Quiz/Card reward และ Scenario entry; ไม่ rollback existing quiz/card tables

## Local verification record

- Baseline `node --test`: 460/460 ผ่าน (รวมสำเนา nested); primary source + dist baseline 230 tests
- Phase 5C Mock behavioral/UI harness tests และ Static SQL assertions แยกชัดเจนใน `phase5c.test.mjs`: Source/`dist` 30/30 ผ่าน
- Primary regression 260/260 ผ่าน; full `node --test` รวม nested สำเนาเดิม 490/490 ผ่าน; syntax และ Source/`dist` hashes ผ่าน
- PostgreSQL/Staging integration: **NOT RUN / NOT VERIFIED**
- Live Supabase schema/advisor ในเครื่องนี้: **ไม่ได้ตรวจใหม่**; อ้างอิง pre-flight เดิมใน README และ local SQL เท่านั้น
- Browser visual/interaction QA แบบ Mock Auth/Ownership: Desktop และ Tablet 1024×768 ผ่าน; LOADING→LOCKED, Free selection, Nancy detail/no select, Error/Retry, ไม่มี broken source image/scroll แนวนอน หรือ console warning/error. Temporary loopback harness ไม่ต่อ Supabase และถูกลบหลังตรวจ
- Browser authenticated E2E กับ Supabase จริง: **NOT VERIFIED** ในรอบนี้
- ไม่มี Apply, seed reward, Deploy หรือแก้ข้อมูล Production
