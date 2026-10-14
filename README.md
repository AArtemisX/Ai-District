# AI District 2.0 — Project Handoff README

> เอกสารนี้จัดทำเพื่อส่งต่อโปรเจกต์ไปพัฒนาบนเครื่องอื่น หรือให้ AI/Coding Agent ตัวใหม่อ่านก่อนเริ่มแก้โค้ด  
> อัปเดตล่าสุด: 14 ตุลาคม 2026 (Asia/Bangkok) — Machine Transfer Checkpoint หลัง Phase 5B / ก่อนเริ่ม Phase 5C Implementation

> กติกาการทำงานถาวร: ทุกครั้งที่มีการแก้หรือเพิ่มระบบ ต้องอัปเดตไฟล์ `README.md` นี้ในรอบเดียวกัน โดยระบุสถานะล่าสุด ไฟล์ที่แก้ ผลทดสอบ ข้อจำกัด และงานถัดไปตามจริง

## MACHINE TRANSFER CHECKPOINT — อ่านส่วนนี้ก่อนทำงานต่อ

สถานะส่งต่อ: **Phase 5B เสร็จและทดสอบแล้ว / Phase 5C ทำเฉพาะ Pre-flight Audit / ยังไม่มีโค้ด Character Ownership หรือ Migration Draft / ไม่ Apply Supabase / ไม่ Deploy**

จุดที่ต้องทำต่อคือ **AI DISTRICT — PHASE 5C: Secure Character Unlock Foundation — Nancy Unlock via Story Mission 02** โดยต้องเริ่มต่อจากผลตรวจด้านล่าง ไม่ย้อนกลับไปทำ Phase 5A–5B ใหม่

### สิ่งที่ตรวจแล้วก่อนย้ายเครื่อง

- อ่าน `CHARACTER_UNLOCK_CONTRACT.md`, `MISSION_STORY_02_DESIGN.md`, Character Catalog/Selection, Quiz Verification และ Learning Reward Engine แล้ว
- Mission Story 02 ยังเป็น Preview เท่านั้น: ไม่มี Production Mission ID, Final Quiz, passing score หรือ Reward mapping ที่อนุมัติ
- Preview Completion **ห้าม** ใช้เป็นหลักฐานผ่านภารกิจและ **ห้าม** ปลดล็อก Nancy
- Supabase Project ที่ตรวจแบบ Read-only: `Ai District` (`urkimjcqsfidxwnnrclc`) สถานะ `ACTIVE_HEALTHY`, PostgreSQL 17
- Production ปัจจุบันมี Final Quiz เพียง Mission 01: `lesson_quizzes` 1 รายการ, `quiz_questions` 10 รายการ และ Card Reward `access-denied`
- Production ยังไม่มี `user_character_unlocks` หรือ Character Reward mapping/RPC
- Existing Card ownership ใช้ `lesson_rewards`, `user_card_unlocks` และ `claim_lesson_reward(text)` ต้องไม่แก้หรือปะปนกับ Character ownership
- Supabase Changelog ปี 2026 ระบุว่าตารางใหม่อาจไม่ถูกเปิด Data API อัตโนมัติ จึงต้องเขียน `GRANT` แบบ explicit ควบคู่ RLS ใน Migration Draft
- Supabase Inspector รายงาน Security Advisory ว่า `private.quiz_answer_keys` ยังไม่ได้เปิด RLS แม้อยู่ private schema ต้องทบทวนแยกต่างหากก่อน Production; รอบนี้ยังไม่ได้ Apply remediation ใดๆ

### งาน Phase 5C ที่ยังไม่ได้เริ่มและต้องทำต่อ

1. สร้าง `CHARACTER_UNLOCK_MIGRATION_PLAN.md` พร้อม Preconditions, Verification และ Rollback checklist
2. สร้าง SQL Migration **Draft เท่านั้น** สำหรับ Character Reward mapping และ `user_character_unlocks`
3. ใช้ Character ID จริงจาก `characters/character-roster.js`; Free คือ `alexander`, `mamasan`, `milo`; Locked คือ `albert`, `alice`, `dylan`, `nancy`, `nicolas`, `noah`
4. เปิด RLS; ให้ผู้ใช้ `select` เฉพาะ ownership ของตน; ห้าม browser insert/update/delete โดยตรง
5. Reward RPC ต้องตรวจ `auth.uid()`, Server-created `quiz_attempts`, `passed`, approved lesson/quiz policy และ mapping ฝั่ง Server; ห้ามรับ score/passed/user_id/character_id จาก Client เป็นหลักฐาน
6. RPC ต้อง idempotent ด้วย unique `(user_id, character_id)`, กำหนด `search_path=''`, revoke `PUBLIC/anon` และให้สิทธิ์เท่าที่จำเป็น
7. **ห้าม Seed Nancy mapping** จนกว่า Mission 02 จะมี Production Lesson ID, Final Quiz และ passing score ที่อนุมัติ
8. เตรียม Character Selection states: `FREE`, `LOCKED`, `UNLOCKED`, `LOADING`, `ERROR` แบบ fail-closed; Server ล้มเหลวต้องไม่เปิดสิทธิ์
9. แยก Mock/Static SQL tests ออกจาก PostgreSQL Integration tests และห้ามรายงานว่า Migration ผ่าน PostgreSQL จนกว่าจะรันบน Staging จริง
10. อัปเดต `CHARACTER_UNLOCK_CONTRACT.md`, README และ Source/`dist` mirror ทุกครั้ง

### คำสั่งเริ่มงานบนเครื่องใหม่

```powershell
git clone https://github.com/AArtemisX/Ai-District.git
cd Ai-District
git status
node --test
python -m http.server 4174
```

เปิด `http://127.0.0.1:4174/login.html` สำหรับทดสอบ Local Web App และหยุดเซิร์ฟเวอร์ด้วย `Ctrl+C` เมื่อเสร็จ

ข้อห้ามในการทำต่อ: ห้าม `git reset --hard`, `git clean`, Apply Migration, Deploy Production, เปิด Nancy Reward จริง, เปลี่ยน Mission 01 Quiz/Reward, แก้ Scenario Gameplay หรือ Legacy District Battle โดยไม่จำเป็น

## PHASE 5B — Mission Story 02 Playable Prototype

สถานะ: **เล่น Preview ครบเส้นทางได้ / Nancy ยัง Locked / ไม่มี Quiz หรือ Reward จริง / ไม่แก้ Supabase / ไม่ Deploy**

สิ่งที่ทำเสร็จ:

- เพิ่ม Mission Preview **คะแนนที่มองไม่เห็น** ใน Learning Hub ผ่าน `lesson-player.html?preview=mission-story-02-nancy-draft`
- ใช้ Draft Key จาก Phase 5A โดยไม่แต่ง Production Mission ID ที่ยังไม่ได้รับอนุมัติ และไม่เพิ่ม Mission นี้เข้า Production lesson records
- เล่นได้ครบ 7 ช่วง: Opening, Meet Nancy, Evidence, Simulation, Fairness Decision, Reflection และ Mission Completion Preview
- Nancy เป็นตัวละครหลัก พร้อม Artwork จริง `assets/Nancy.png`; Alexander และ Milo เป็นผู้สนับสนุนตาม Character Bible
- Evidence บังคับตรวจอย่างน้อย 2 จุดและตั้งคำถาม; Simulation บังคับเปรียบเทียบอย่างน้อย 2 รอบ; Decision รองรับหลายแนวทาง; Reflection บังคับเขียนคำตอบก่อนจบ
- เพิ่ม `mission-preview-progress.mjs` เพื่อเก็บสถานะชั่วคราวใน `sessionStorage` และกลับมาเล่นต่อในแท็บเดิม โดยแยกจาก Supabase lesson progress และไม่มีข้อมูล Reward/Ownership
- หน้า Summary ไม่แสดงปุ่ม Quiz หรือ Claim และย้ำว่า Final Assessment ยังอยู่ระหว่างพัฒนาและ Nancy ยังไม่ถูกปลดล็อก
- แก้การอัปเดต textarea ให้ Navigation requirement ตอบสนองทันทีโดยไม่ทำข้อความหายระหว่าง re-render
- Mission 01 ยังคง Quiz 10 ข้อ ผ่าน 8/10 และ Reward `access-denied` ตามเดิม

ไฟล์ Phase 5B:

- `mission-story-02-data.js`, `mission-preview-progress.mjs`
- `lesson-player.js`, `lesson-player.html`, `lesson-components.js`
- `learning.html`, `style.css`
- `phase5a.test.mjs`, `phase5b.test.mjs`
- `MISSION_STORY_02_DESIGN.md`, `README.md`
- Source/`dist` mirror ของไฟล์ข้างต้น

ขอบเขตและงาน Phase 5C:

- ยังไม่มี Production Mission ID, Final Assessment, passing score หรือ Reward mapping ที่อนุมัติ
- ยังไม่เชื่อม Durable Progress, Character Reward Claim หรือ Backend Ownership verification
- Nancy ยัง Locked และไม่สามารถเลือกเข้าเกมได้
- ต้องผ่าน Content Review และออกแบบ Final Assessment ก่อนเปิด Production navigation
- รอบนี้ไม่ได้แก้ Supabase schema/RLS/RPC, ไม่แตะ Production data และไม่ Deploy

ผลทดสอบ Phase 5B:

- Focused Phase 5B tests ทั้ง Source และ `dist/`: 14/14 ผ่าน
- Full Regression ทั้ง Source และ `dist/`: 230/230 ผ่าน
- JavaScript syntax checks ของ Mission 02 Data, Preview Progress, Lesson Player, Components และ Tests: ผ่าน
- Browser QA แบบ Login จริง: เล่นครบ Evidence → Simulation 2 รอบ → Decision → Reflection → Summary และกลับ Learning Hub สำเร็จ
- Browser QA: ไม่มี Console error/warning, ไม่มี Broken Image, ไม่มี Scroll แนวนอน และ Tablet layout ที่ 1024×768 ใช้งานได้
- `git diff --check`: ผ่านโดยมีเพียงคำเตือน LF/CRLF เดิมของ Working Tree
- Source/`dist` ของไฟล์ Phase 5B ที่เกี่ยวข้องตรงกันตาม SHA-256

## PHASE 5A — Character Unlock Foundation & Mission Story 02 Preparation

สถานะ: **Design Contract + Draft Data พร้อม / Nancy ยัง Locked / ไม่สร้าง Migration / ไม่แก้ Supabase / ไม่ Deploy**

สิ่งที่ทำเสร็จ:

- เพิ่ม `characters/character-unlock-contract.js` เป็น Data Contract สำหรับ Free 3 และ Locked 6 โดยใช้ Character ID จริงจาก Roster
- ไม่สร้าง Mission ID ขึ้นเอง: Mission 02 ใช้ Draft Key `mission-story-02-nancy-draft` และ `requiredMissionId:null` จนกว่าจะมี Backend record ที่อนุมัติ
- เพิ่ม Draft Data `mission-story-02-data.js` ชื่อ **คะแนนที่มองไม่เห็น** ใช้ Nancy เป็นตัวละครหลัก พร้อม Alexander และ Milo สนับสนุนตาม Character Bible
- โครงเรื่องแยกจาก Mission 01: เน้นการประเมินผลงาน เกณฑ์/น้ำหนัก คำอธิบาย Accountability, Human Oversight และสิทธิ์อุทธรณ์ ไม่ใช้เรื่องคัดเลือกทุน
- Draft มี Opening + Scene 1–6 รวม 7 ช่วง และใช้ Component types เดิม: Dialogue, Evidence, Simulation, Decision และ Reflection
- Mission 02 ยังไม่ถูกเพิ่มเข้า Lesson Navigation, ไม่มี Final Quiz จริง, ไม่มี Reward Claim และไม่ปลดล็อก Nancy
- Character Selection ยังแสดง Free 3 / Locked 6; Nancy แสดง “ปลดล็อกผ่าน Story Mission: คะแนนที่มองไม่เห็น (เร็วๆ นี้)” และระบุว่ายังไม่มีรางวัลจริง
- เพิ่มเอกสาร `CHARACTER_UNLOCK_CONTRACT.md` และ `MISSION_STORY_02_DESIGN.md` พร้อม Security/Idempotency/Failure flow และ Learning Alignment
- Mission 01 ยังคง Quiz 10 ข้อ ผ่าน 8/10 และ Card Reward `access-denied` ตามระบบเดิม

ไฟล์ที่เพิ่ม/แก้ใน Phase 5A:

- `characters/character-roster.js`, `characters/character-unlock-contract.js`
- `character-selection.js`, `character-selection.html`
- `mission-story-02-data.js`
- `phase5a.test.mjs`
- `CHARACTER_UNLOCK_CONTRACT.md`, `MISSION_STORY_02_DESIGN.md`
- `README.md` และ Source/`dist` mirror ของไฟล์ที่เกี่ยวข้อง

ขอบเขตที่ยังไม่ดำเนินการ:

- ไม่สร้างหรือ Apply Database Migration/RLS/RPC
- ไม่สร้าง Production Mission ID, Final Quiz 02 หรือคะแนนผ่าน
- ไม่เพิ่ม Character Claim UI และไม่เปลี่ยน Nancy เป็น Playable
- ไม่แก้ Login/Auth, Scenario Adventure, District Battle, Dice/Movement, Deck Builder, Action Card, Quiz 01 หรือ Reward Access Denied
- Phase 5B ต้องอนุมัติ Mission ID, Final Assessment, Reward mapping และ Backend ownership verification ก่อนเริ่ม Implementation จริง

ผลทดสอบ Phase 5A:

- Focused Character/Mission/Quiz/Reward tests: 31/31 ผ่าน
- Full Regression ทั้ง Source และ `dist/`: 216/216 ผ่าน
- JavaScript syntax checks ของ Character Contract, Mission 02 Data, Character Selection และ Tests: ผ่าน
- `git diff --check`: ผ่าน มีเพียงคำเตือน LF/CRLF เดิมของ Working Tree
- Browser QA: **Not Verified** ใน Phase 5A เพราะ Mission 02 ยังเป็น Draft Data ที่ไม่ถูกเพิ่มเข้า Navigation จริง; Character Selection behavior ถูกตรวจด้วย Automated Tests
- Source/`dist` ของไฟล์ Phase 5A ที่เกี่ยวข้องตรงกันตาม SHA-256

## MISSION STORY 01 INTEGRATION

สถานะ: **เชื่อม Storyboard v1.0 เข้ากับ Mission Player แล้ว / Source และ `dist` ตรงกัน / ไม่แก้ Supabase / ไม่ Deploy**

แหล่งข้อมูลหลักที่อ่านและใช้จริง:

- `AI_District_SPlus_Character_Bible_v1.txt`
- `AI_District_Mission_Story_01_Storyboard_v1.txt`

Mission `ai-ethics-m6-01` ใช้ชื่อ **เมืองที่ AI ตัดสินผิดพลาด** และแบ่งเป็น 7 ช่วงตาม Storyboard: Opening, Incident, Evidence, Simulation, Decision, Reflection และ Final Quiz โดยคงสาระ AI Bias, Fairness, Explainability และ Human Oversight สำหรับระดับ ม.6

สิ่งที่เชื่อมแล้ว:

- เปลี่ยนตัวละครเดโมเดิมเป็น Alexander, MAMASan และ Milo พร้อม `StoryCharacterPortrait` จาก Artwork ใน `assets/`
- Opening รองรับ 3 แนวทางเริ่มสืบสวนที่ไม่มีคำตอบถูก/ผิดแบบขาวดำ
- Incident แยกข้อเท็จจริงกับการตีความ; Evidence บังคับตรวจหลักฐานอย่างน้อย 2 ชิ้น พร้อมคำถามที่ผู้เรียนต้องบันทึกเอง
- Simulation รองรับ Slider, Preset, Human Review, การเปรียบเทียบอย่างน้อย 2 รอบ และระบุชัดว่าเป็นข้อมูลสมมติเพื่อการเรียนรู้
- Decision รองรับหลายแนวทางที่เหมาะสม พร้อม Trade-off, Transparency และ Human Oversight
- Reflection บันทึกคำตอบผู้เรียนก่อนเข้าสู่ Final Quiz
- Progress เดิมยัง Restore ได้ โดยเพิ่ม `sceneId` และมี Migration Mapping จาก Mission schema รุ่นก่อน
- Final Quiz ยังคงใช้ระบบเดิม 10 ข้อ ผ่าน 8/10 และรางวัล `access-denied`; ไม่มี Character Unlock และไม่ได้แก้ Quiz/Reward/Supabase logic
- Character Selection และ Scenario Adventure ไม่ได้เปลี่ยนกติกาหรือเส้นทางการทำงานในรอบนี้

ไฟล์ที่แก้ในรอบนี้:

- `mission-m6-data.js`
- `mission-player-engine.mjs`
- `lesson-components.js`
- `lesson-player.js`, `lesson-player.html`, `style.css`
- `characters/StoryCharacterPortrait.js`, `characters/story-character-portrait.css`
- `mission-stage3.test.mjs`, `mission-player-engine.test.mjs`
- Deploy mirror ของไฟล์ข้างต้นใน `dist/`

ผลทดสอบ Mission Story 01:

- Focused Mission tests ทั้ง Source และ `dist/`: 30/30 ผ่าน
- Full Regression ทั้ง Source และ `dist/`: 198/198 ผ่าน
- JavaScript syntax checks ของ Mission Player, Engine, Data และ Character Portrait: ผ่าน
- Browser Visual QA บน Desktop และ Tablet: ภาพตัวละครทั้ง 3 โหลดสำเร็จ, ไม่มี Broken Image, ไม่มี Scroll แนวนอน และ Console ไม่มี error/warning ใหม่
- ตรวจหน้าจอตัวแทน Opening, Evidence และ Simulation แล้ว; QA Harness ใช้ตรวจ Visual/Responsive เท่านั้นและไม่เชื่อม Supabase หรือบันทึก Progress
- Authenticated End-to-End Browser QA ของ Progress → Final Quiz → Reward ยังไม่ได้ทำในรอบนี้; Contract และ Regression Tests ของเส้นทางดังกล่าวผ่านแล้ว

ข้อจำกัดและงานถัดไป:

- เอกสาร Character Bible ยังระบุสถานะ Draft; เนื้อหาควรผ่านการทบทวนโดยครู/ผู้เชี่ยวชาญก่อนใช้เป็นบทเรียน Production
- ควรทดสอบ Flow แบบ Login จริงบน Origin ที่มี Supabase session ตั้งแต่เริ่ม Mission จนรับรางวัล ก่อน Deploy รอบถัดไป
- รอบนี้ไม่ได้ Apply Migration, ไม่แก้ข้อมูล Production และไม่ได้ Deploy

## S+ CHARACTER ROSTER INTEGRATION

สถานะ: **Source/`dist` พร้อมใช้งาน / Session-only identity / ไม่แก้ Supabase / ไม่ Deploy**

- เพิ่มหน้า `character-selection.html` แสดง Full S+ Card Artwork ครบ 9 ตัวในอัตราส่วนต้นฉบับ 1058 × 1486 ด้วย `object-fit: contain`
- Free และเลือกได้ 3 ตัว: Alexander, MAMASan (`Mama.png`) และ Milo
- Locked 6 ตัว: Albert, Alice, Dylan, Nancy, Nicolas และ Noah; เปิดดู Artwork ขนาดใหญ่ได้ แต่ Client ไม่สามารถเลือกหรือปลดล็อกได้
- Metadata การปลดล็อก Locked ใช้ `FUTURE_STORY_MISSION` และ `implemented:false`; ยังไม่มี Mission Reward หรือ Database Logic
- Flow ใหม่: Lobby Action Card Hub → Character Selection → Scenario Deck Builder 5 ใบ → Scenario Adventure
- ตัวละครที่เลือกเก็บใน `sessionStorage` ที่ `aiDistrict.scenario.character.v1` และใช้เป็น UI Identity เท่านั้น เมื่อปิด session ต้องเลือกใหม่
- Route `map-3d.html?mode=scenario-adventure` ตรวจ session selection ก่อนเปิด Deck Builder; ไม่มีการใช้ client state เพื่อให้สิทธิ์ตัวละคร Locked
- เพิ่ม `StoryCharacterPortrait` ที่รองรับ circular crop, soft edge, per-character object position, active/inactive speaker และ responsive sizing; ปัจจุบันเชื่อมกับ Mission Story 01 แล้ว
- `PlayerToken`, `BotToken`, Dice, Movement, Turn Manager และ `ScenarioAdventureScene` ไม่ได้แก้และยังใช้ตัวหมากเดิม
- ไม่สร้าง Character Ability, Story Mission, Reward RPC หรือ Supabase schema ใหม่

ไฟล์หลัก:

- `character-selection.html`, `character-selection.css`, `character-selection.js`
- `characters/character-roster.js`, `characters/character-session.js`
- `characters/StoryCharacterPortrait.js`, `characters/story-character-portrait.css`
- `characters/character-roster.test.mjs`
- `lobby.html`, `map-3d-entry.js`, `map-3d.html`, `scenario-adventure/app.js`

ผลทดสอบ Character Roster รอบนี้:

- Focused Character tests: 6/6 ผ่าน
- Full Regression ทั้ง Source และ `dist/`: 177/177 ผ่าน
- JavaScript syntax checks ของไฟล์ Character/Route/Scenario ที่เกี่ยวข้อง: ผ่าน
- Source และ `dist/` ตรงกันครบ 13/13 คู่ไฟล์ที่เกี่ยวข้อง
- `git diff --check`: ผ่าน (มีเพียงคำเตือน LF/CRLF เดิมของ Working Tree)
- Browser QA บน Desktop viewport 1745 × 777: Artwork ทั้ง 9 ใบโหลดสำเร็จที่ 1058 × 1486, `object-fit: contain`, ไม่มี Scroll แนวนอน, Free Character มี Selected State และ Locked Character เปิดรายละเอียดได้แต่ไม่มี Action สำหรับเลือกเข้าเกม
- Browser QA ของ Tablet/Mobile และเส้นทาง Deck Builder/Scenario แบบ Login จริงบน Origin ทดสอบใหม่: **Not Verified** ในรอบสุดท้าย เพราะ Supabase session เดิมผูกกับ Origin/Port เดิม; Route guard, session policy และ flow contract ผ่าน Automated Tests แล้ว
- ปัญหาหน้ากระดานว่างที่พบระหว่าง QA มาจากเซิร์ฟเวอร์ทดสอบพอร์ตเดิมหยุดทำงาน ทำให้ Dynamic Import fetch ไม่สำเร็จ ไม่พบ JavaScript syntax หรือ module contract regression จาก Character Integration

งานที่ยังเหลือ:

- ขยาย `StoryCharacterPortrait` ไปยัง Story Mission อื่นเมื่อเนื้อหาแต่ละภารกิจได้รับอนุมัติ
- ออกแบบ Character Unlock verification/RPC และ Permanent Collection ในอนาคต; ตัวละคร Locked ทั้ง 6 คนยังไม่มีสิทธิ์ปลดล็อกจริง
- ออกแบบ Board Token รุ่นใหม่แยกต่างหาก; รอบนี้ยังคง Token, Dice และ Movement เดิมตามข้อกำหนด
- ทำ Authenticated Browser QA เพิ่มบน Desktop/Tablet/Mobile ก่อน Deploy Production

## PHASE 4B.2A — Safe Catalog Migration & Five Unique Scenario Starters

สถานะ: **เตรียม Source + Migration Draft แล้ว / ยังไม่ Apply Supabase / ยังไม่ Deploy**

- อนุมัติ Canonical Production IDs ครบ 10 ใบใน `action-cards/card-catalog.js`; `firewall-guard` ใช้ ID เดิมเพียงหนึ่งรายการ
- การมี Canonical ID ใน Client ไม่ให้ Ownership: หาก Supabase ยังไม่มี row ที่ตรงกัน การ์ดยังคง `PROTOTYPE_ONLY`, ไม่มี `inventoryCardId` และเข้า Match ไม่ได้
- อนุมัติ Option B สำหรับ Scenario Adventure หลัง migration: `privacy-shield`, `threat-shutdown`, `recovery-protocol`, `data-audit`, `firewall-guard`
- Starter ชุดนี้เป็น mode-specific eligibility ไม่แก้ global `action_cards.is_starter` และไม่สร้าง permanent unlock
- เพิ่ม policy gate 2 แบบ: ก่อน migration ใช้ `LEGACY_COMPAT` (Starter เดิม 3 ชนิด ซ้ำได้สูงสุด 2); หลัง server eligibility พร้อมจึงใช้ `FIVE_UNIQUE_STARTERS` (5 IDs ไม่ซ้ำ)
- Client ไม่ใช้ local flag/localStorage ตัดสิน capability และ RPC จะตรวจ auth, exact 5 unique, mode eligibility/permanent unlock ซ้ำฝั่ง server
- เพิ่ม migration draft `supabase/action_card_catalog_phase4b2a.sql` แบบ transaction, preflight, idempotent inserts, RLS/GRANT และ verification queries โดยไม่แก้ Reward RPC, Quiz, legacy loadout หรือ card effects
- เพิ่มเอกสาร `CARD_ID_MAPPING.md`, `SCENARIO_STARTER_POLICY.md`, `CARD_CATALOG_MIGRATION_PLAN.md`
- Effect ของ catalog rows ใหม่ยังเป็น `DESIGN_CONTRACT_ONLY` และ `enabled:false`; Phase นี้ไม่เปิด Gameplay Effect
- Production read-only audit ยืนยัน `action_cards` 8 rows, global starter เดิม 3 ใบ, reward `access-denied` ที่ 8/10 และยังไม่มี Scenario eligibility/loadout tables
- Security Advisor ปัจจุบันเตือน Public `SECURITY DEFINER` RPC เดิม 18 รายการและ Leaked Password Protection ที่ยังปิด; อยู่นอก scope รอบนี้ Migration ใหม่จึงใช้ private definer + public invoker wrapper ตามรูปแบบที่ปลอดภัยกว่า

ไฟล์หลักที่แก้/เพิ่ม:

- `action-cards/card-catalog.js`, `action-cards/card-catalog.test.mjs`, `action-cards/phase4b2a.test.mjs`
- `scenario-adventure/loadout-engine.js`, `scenario-adventure/loadout-client.js`, `scenario-adventure/app.js`, `scenario-adventure/round2.test.mjs`
- `supabase/action_card_catalog_phase4b2a.sql`
- เอกสารทั้งสามข้างต้น และ deploy mirror ใน `dist/`

ผลทดสอบ Phase 4B.2A:

- Focused Catalog/Migration/Scenario tests: 27/27 ผ่าน
- Full Regression ทั้ง Source และ `dist/`: 165/165 ผ่าน
- JavaScript syntax checks: ผ่าน
- SQL migration: static safety/contract tests ผ่าน แต่ยังไม่ Apply และยังไม่ยืนยัน DDL ด้วย PostgreSQL staging จริง
- Browser Visual QA: Not Verified ในรอบนี้

## PHASE 4B.1 — Action Card Inventory Mapping

Phase นี้เพิ่ม Mapping Layer ระหว่าง Prototype Catalog, Production Inventory และ Scenario Deck Builder โดยไม่มีการแจกสิทธิ์ใหม่และไม่เปิดใช้ Card Effects:

- เพิ่ม `action-cards/card-catalog.js` เป็น Adapter กลาง แยกข้อมูล 5 ระดับให้ชัดเจน: Card Definition, Catalog, Ownership, Match Instance และ Effect
- Production `action_cards` 8 ใบยังเป็นแหล่งยืนยัน Card ID/Starter/สิทธิ์จริงจาก Supabase
- Prototype 10 ใบยังเป็น Definition Catalog จาก `action-cards/card-data.js`; Client ไม่สามารถเปลี่ยน Prototype ให้เป็น Owned ได้
- Mapping ที่ยืนยันได้แน่นอนในปัจจุบันมี 1 รายการ: `prototype-firewall-guard` → Production ID `firewall-guard`
- Firewall Guard ใช้ Production ID สำหรับ Ownership/Match แต่รับชื่อ Rarity และ Artwork จาก Prototype Definition โดยไม่ใช้ Placeholder Effect แทนกติกา Legacy
- Prototype อีก 9 ใบไม่มี Production Card ID จึงแสดงสถานะ `PROTOTYPE`, ไม่มี `inventoryCardId`, ไม่สามารถเลือกเข้า Deck และไม่ถูกนับเป็น Owned แม้ Client จะใส่ ID ปลอมในชุด Unlock
- Card Inventory รวม Catalog ให้ดูได้ในหน้าเดียว: `Prototype`, `Locked`, `Unlocked`, `Starter` และ `Equipped` แยกกัน พร้อม Artwork/Fallback
- Scenario Pre-match อ่าน Unified Catalog แต่ `allowedIds` ยังคำนวณจาก Starter หรือ `user_card_unlocks` ของ Production เท่านั้น
- Deck/Hand/Discard ยังใช้ Card Instance ID เดิม และ Permanent Ownership ไม่เปลี่ยนเมื่อใช้การ์ดใน Match
- เพิ่ม `action-cards/mechanics-contract.js` เพื่อบันทึก Mechanics 1.0 แบบ `DESIGN_CONTRACT_ONLY`; RP, Stability และ Effect Resolver ยังคงปิดและไม่มี Side Effects

Card Ownership Policy ที่ใช้จริง:

1. `public.action_cards` = Production Card Catalog ที่ Match อ้างอิงได้
2. `public.user_card_unlocks` = Permanent Unlock ของบัญชีที่ตรวจจาก Server/RPC
3. `is_starter = true` = ใช้ได้โดยไม่ต้องมี Unlock row
4. Prototype Definition ที่ไม่มี Production ID = ดูข้อมูล/Artwork ได้ แต่ใช้ใน Match ไม่ได้
5. Frontend ไม่มีสิทธิ์เพิ่ม Ownership และไม่แก้ `lesson_rewards` หรือ Reward RPC

Starter Deck Compatibility:

- **Option A — ใช้อยู่และแนะนำให้คงไว้ใน Prototype:** Starter 3 ชนิด (`patch-update`, `firewall-guard`, `energy-boost`) และซ้ำได้สูงสุดชนิดละ 2 ใบ ทำให้สร้าง Deck 5 ใบได้ทันที
- **Option B — ยังไม่อนุมัติ:** เพิ่ม Starter ให้ครบ 5 ชนิดและบังคับ 5 ID ไม่ซ้ำ ต้องอนุมัติ Catalog/Ownership/Reward policy และทำ Migration ก่อน ห้ามแจกจาก Client

ผลตรวจ Supabase Production แบบ Read-only วันที่ 13 ตุลาคม 2026:

- Project `Ai District` สถานะ `ACTIVE_HEALTHY`
- `public.action_cards` มี 8 ใบ และ Starter 3 ใบตรงกับ Source
- `public.lesson_rewards` มีรางวัลเดียว: Final Quiz `ai-ethics-m6-01` ปลดล็อก `access-denied` เมื่อผ่าน 8/10
- `scenario_adventure_loadouts` และ `save_scenario_adventure_loadout(text[])` ยังไม่มีใน Production
- `supabase/scenario_adventure_round2_loadout.sql` จึงยังเป็น Draft และ **ไม่ได้ Apply**
- ไม่ได้แก้ Schema, RLS, RPC หรือข้อมูลผู้ใช้ใน Phase นี้
- Security Advisor รายงานความเสี่ยงเดิมว่า `private.quiz_answer_keys` ปิด RLS อยู่ การแก้อยู่นอก Phase 4B.1 และต้องตรวจ API exposure/policy ก่อน เพราะเปิด RLS โดยไม่มี policy อาจทำให้ Final Quiz ใช้งานไม่ได้

ไฟล์ที่เพิ่ม/แก้ใน Phase 4B.1:

- `action-cards/card-catalog.js`
- `action-cards/mechanics-contract.js`
- `action-cards/card-catalog.test.mjs`
- `card-inventory.js`, `card-inventory.html`, `stage5.css`
- `scenario-adventure/loadout-engine.js`
- `scenario-adventure/loadout-client.js`
- `scenario-adventure/app.js`, `scenario-adventure.css`
- `map-3d-entry.js`, `map-3d.html`
- Deploy mirror ใน `dist/`

ผลทดสอบ Phase 4B.1:

- Catalog/Inventory/Scenario focused tests: 39/39 ผ่าน
- Action Card source tests: 16/16 ผ่าน
- Full Regression ทั้ง Source และ `dist/`: 147/147 ผ่าน
- JavaScript syntax checks ของไฟล์ที่แก้: ผ่าน
- Browser QA: ยังไม่ยืนยัน; ต้องรายงานเป็น Not Verified จนกว่าจะตรวจผ่าน Browser จริง

ยังไม่ได้ทำใน Phase นี้:

- ไม่ Apply Scenario Loadout Migration
- ไม่เพิ่ม Production rows สำหรับ Prototype อีก 9 ใบ
- ไม่เพิ่ม Reward/Starter Ownership
- ไม่เปิด Card Effect, RP, Stability, Compatibility Outcome หรือ Game Balance ใหม่
- ไม่แก้ Turn Manager, Scenario Resolver, Legacy District Battle หรือ Quiz Reward Verification

Phase 4B.2 ที่เสนอ (ต้องรออนุมัติ): อนุมัติ Canonical Production IDs ของ Prototype 9 ใบ, ตัดสิน Starter Option A/B, ออกแบบ Migration/RLS/RPC สำหรับ Catalog และ Scenario Loadout แล้วจึงกำหนด Compatibility/Effect values โดยมี Scenario Context และ Server-validated ownership

## อัปเดตล่าสุด — Action Card Main Web Integration Phase 4A

เชื่อมระบบ Action Card ที่มีอยู่เข้ากับหน้าเว็บหลัก โดยไม่สร้าง Inventory, Loadout หรือ Gameplay Logic ซ้ำ:

- `lobby.html` มี Action Card Hub พร้อมทางเข้า 3 จุดที่แยกความหมายชัดเจน:
  - `card-inventory.html` — คลังสิทธิ์ถาวร Locked / Unlocked และ Battle Loadout เดิม 3 ใบ
  - `action-card-preview.html` — Prototype Gallery/Deck Sandbox สำหรับตรวจ Artwork และ UI 10 ใบ การเลือกไม่บันทึกเข้าบัญชี
  - `map-3d.html?mode=scenario-adventure` — Pre-match Deck Builder 5 ใบของ Scenario Adventure
- หน้า Prototype มีข้อความเตือนว่าเป็น Sandbox และมีลิงก์ไปคลังถาวรกับ Deck Builder จริง
- หน้าคลังถาวรกลับ Lobby ได้และมีทางลัดไป Prototype/Deck 5 ใบ โดยไม่เปลี่ยนระบบปลดล็อกหรือ RPC เดิม
- หน้า Pre-match Scenario Adventure มีทางกลับคลังถาวร และยังใช้ `loadout-engine.js` / `loadout-client.js` เดิม
- Deck Scenario ยังคงกติกาเดิม: 5 ใบ, ซ้ำชนิดเดิมสูงสุด 2 ใบ, เลือกเฉพาะ Starter หรือ Permanent Unlock, การ์ด Locked เลือกไม่ได้ และผู้เล่นใหม่สามารถเติม Deck จาก Starter 3 ชนิดได้
- แยก Prototype Data ออกจาก Owned Inventory อย่างชัดเจน จึงไม่ตีความการ์ดต้นแบบทั้ง 10 ใบว่าเป็นสิทธิ์ของบัญชี
- เพิ่ม Responsive/Keyboard focus/reduced-motion styling เฉพาะจุดเชื่อมต่อใหม่
- เพิ่ม Integration tests ตรวจเส้นทางหลักและข้อความแบ่งขอบเขต Prototype/Inventory/Pre-match
- ซิงก์ไฟล์ที่ใช้ Deploy ไป `dist/` แล้ว

Card Mechanics 1.0 ที่ยืนยันไว้สำหรับการพัฒนารอบถัดไป (ยังไม่เปิด Effect Execution ใน Phase 4A):

- Deck Size 5, Starting Hand 3, Card Response สูงสุด 1 ใบต่อ Scenario และมี Basic Response เสมอ
- RP, Stability, Compatibility, การ Resolve Effect และสมดุลการ์ดจริงยังเป็นสัญญาออกแบบสำหรับ Phase ถัดไป ไม่ได้ Hardcode เพิ่มใน UI รอบนี้

ไฟล์ที่แก้/เพิ่มใน Phase 4A:

- `lobby.html`, `style.css`
- `card-inventory.html`, `stage5.css`
- `action-cards/app.js`, `action-card-preview.css`
- `scenario-adventure/app.js`, `scenario-adventure.css`
- `action-cards/main-web-integration.test.mjs`
- Deploy mirror ของไฟล์ข้างต้นใน `dist/`

ผลตรวจ Phase 4A:

- Action Card source tests: 10/10 ผ่าน
- Full Regression ทั้ง Source และ `dist/`: 135/135 ผ่าน
- JavaScript syntax checks ของไฟล์ที่แก้: ผ่าน
- ไม่มีการแก้ Login, Supabase Schema/RLS/RPC, Reward, Scenario Effect, District Battle หรือ Permanent Unlock
- ยังไม่ได้ Deploy และยังไม่ได้เปิดใช้ Card Effects จริงตามขอบเขตงาน
- ข้อจำกัดที่รักษาไว้เพื่อไม่เปลี่ยนฐานข้อมูล/สิทธิ์โดยพลการ: Scenario Deck เดิมอนุญาตการ์ดชนิดเดียวกันสูงสุด 2 ใบ เพราะผู้เล่นใหม่มี Starter เพียง 3 ชนิด; ส่วน Prototype Sandbox ป้องกัน ID ซ้ำแล้ว หาก Phase ถัดไปต้องบังคับ 5 ID ไม่ซ้ำจริง ต้องกำหนด Starter เพิ่มอย่างน้อย 2 ใบและตรวจ Reward/Inventory policy ก่อน ไม่ควรปลดล็อกการ์ดทั้งหมดจาก Frontend

## Action Card Artwork Integration

เชื่อม Artwork PNG จริงเข้ากับ Prototype Collection 10 ใบ โดยยังไม่เชื่อมการทำงานจริงเข้ากับเกม:

- Preview URL: `action-card-preview.html`
- Deploy mirror: `dist/action-card-preview.html`
- ใช้ React/HTM Runtime และ CSS เดิมของโปรเจกต์โดยไม่ติดตั้ง Dependency เพิ่ม
- Data Model รองรับ `id`, `name`, `description`, `type`, `rarity`, `artwork`, `effect`, `target`, `activationCondition`, `usageLimit`, `status`
- ใช้ JSDoc typedef และ runtime schema validation เพราะโปรเจกต์รากเป็น JavaScript Modules และไม่มี TypeScript build pipeline
- Prototype Data มี 10 ใบ ครบ 5 ประเภท ประเภทละ 2 ใบ: Defense, Attack, Support, Strategy และ Special
- รายชื่อการ์ด: Privacy Shield, Firewall Guard, Threat Shutdown, System Countermeasure, Recovery Protocol, Human Assistance, Data Audit, Explainability Insight, Ethical Override และ Responsible AI Protocol
- `artwork.src` ของทุกใบชี้ไปยังไฟล์ PNG จริงใน `assets/` และมี mirror ที่ `dist/assets/`
- `ActionCard` ใช้ `<img>` ขนาดอ้างอิง 1122 × 1402, รักษาอัตราส่วนเดิม และกลับไปแสดง Placeholder อัตโนมัติเมื่อโหลดภาพล้มเหลว
- เปลี่ยน Cache Version ของหน้า Preview เป็น `artwork-1` เพื่อไม่ให้ Browser ใช้ JavaScript/CSS เก่า
- ทุกใบมี `isPrototype: true`; `effect` เป็น Placeholder Metadata และไม่มีค่าพลังโจมตี ความเสียหาย หรือคะแนน
- `ActionCard` แสดงชื่อ Artwork/Placeholder ประเภท คำอธิบาย Rarity ไอคอน Selected และ Disabled
- `CardCollection` รองรับตัวกรอง เลือก/ยกเลิก จำนวนที่เลือก สูงสุด 5 ใบ กัน ID ซ้ำ ตรวจความถูกต้อง และแสดงรายละเอียดจาก Card Data เมื่อเลือก
- รองรับ Desktop/Mobile, Keyboard focus และ `prefers-reduced-motion`
- ไม่มีการสุ่ม จั่ว Consume หรือ Resolve Effect
- ไม่แก้ Login, Lobby, Scenario Engine, Battle Engine, Supabase หรือคลังการ์ด Production เดิม

ไฟล์ Foundation ที่ใช้ต่อและไฟล์ที่แก้ใน Phase 2:

- `action-card-preview.html`
- `action-card-preview.css`
- `action-cards/card-data.js`
- `action-cards/collection-engine.js`
- `action-cards/ActionCard.js`
- `action-cards/CardCollection.js`
- `action-cards/app.js`
- `action-cards/card-system.test.mjs`
- `action-cards/README.md`

ผลตรวจรอบล่าสุด:

- Action Card System tests: 7/7 ผ่าน
- Full Regression ทั้ง Source และ `dist/`: 129/129 ผ่าน
- JavaScript syntax checks: ผ่าน
- Source/`dist/` SHA-256: ตรงกันครบทุกไฟล์ของ Action Card System
- `git diff --check`: ผ่าน (มีเฉพาะคำเตือน line ending ของไฟล์งานเดิม)
- Browser Visual QA: ยังไม่ได้ยืนยันใน In-app Browser รอบนี้ เนื่องจาก Local Server ภายใน Sandbox ไม่สามารถเข้าถึงจาก Browser ได้ จึงควรเปิด Preview URL เพื่อตรวจภาพจริงบน Desktop/Mobile ก่อนนำขึ้น Deploy
- ยังไม่ได้เชื่อม Scenario Outcome, Permanent Inventory, Pre-Match Loadout, Draw/Discard หรือการใช้การ์ดระหว่างเทิร์น
- เพิ่มเอกสารสำหรับเตรียม Artwork ทั้ง 10 ใบที่ `ACTION_CARD_ARTWORK_LIST_TH.txt` พร้อมแนวคิด สี เป้าหมาย และชื่อไฟล์ภาพแนะนำ

## สถานะล่าสุด — Scenario Adventure ROUND 2

ROUND 2: Five-Card Loadout & Scenario Response UI พัฒนาใน Source แล้ว โดยแยกจาก Legacy District Battle:

- Route: `map-3d.html?mode=scenario-adventure`
- Loadout เฉพาะโหมดใหม่ 5 ใบ; Legacy Battle ยังคง 3 ใบ
- เลือกได้เฉพาะ Starter Card หรือ Permanent Unlock ของผู้ใช้
- การ์ดชนิดเดิมซ้ำได้สูงสุด 2 ใบ และทุกใบในแมตช์มี Card Instance ID แยกกัน
- ข้อมูล Loadout 3 ใบเดิมถูกเติมเป็น 5 ใบอย่างเข้ากันได้ โดยไม่แก้หรือลบสิทธิ์เดิม
- Starting Hand 3 ใบ, Draw Pile 2 ใบ, ใช้สำเร็จแล้วเข้า Discard และจั่วทดแทน
- เมื่อ Draw Pile หมด จะสับ Discard กลับในต้นเทิร์นถัดไป
- ทุกช่องบนกระดานเปิด Scenario จาก Scenario Engine และใช้ Match History ร่วมกันระหว่างผู้เล่นกับ Bot
- ผู้เล่นเลือก Card Response ได้สูงสุด 1 ใบ หรือเลือก Basic Response ที่เขียนตามบริบทของแต่ละ Scenario
- Card Response ใช้ Metadata ที่ระบุชัดว่า `TEMPORARY_ROUND_2`; ยังไม่ใช้เอฟเฟกต์ IP/District และยังไม่เพิ่มคะแนนของ ROUND 3
- Confirm ใช้ Unique Action ID ป้องกัน Resolve/Consume ซ้ำ
- Bot ใช้ Deck/Hand/Draw/Discard แบบเดียวกับผู้เล่น และเลือก Basic Response เมื่อไม่มีการ์ดที่เข้ากันได้
- ฉาก 3D ใช้ Board, Dice, Movement และ Token เดิม แต่ไม่ Import District Component, Ownership, Influence หรือ Item Action

ไฟล์ ROUND 2 หลัก:

- `scenario-adventure/app.js`
- `scenario-adventure/ScenarioAdventureScene.js`
- `scenario-adventure/loadout-engine.js`
- `scenario-adventure/loadout-client.js`
- `scenario-adventure/deck-engine.js`
- `scenario-adventure/card-response-config.js`
- `scenario-adventure/response-engine.js`
- `scenario-adventure/round2.test.mjs`
- `scenario-adventure/scenario-seed.js`
- `scenario-adventure/scenario-repository.js`
- `map-3d/turn-core.js`
- `map-3d/turn-manager.js`
- `scenario-adventure.css`
- `supabase/scenario_adventure_round2_loadout.sql`

ผลทดสอบล่าสุด:

- ROUND 2 + Scenario Engine + Turn Manager: 25/25 ผ่าน
- Full Regression ทั้ง Source และ `dist/`: 115/115 ผ่าน
- Syntax check ของไฟล์ JavaScript ที่เพิ่ม/แก้: ผ่าน
- Source/`dist/` hash: ตรงกันทุกไฟล์ที่ใช้ Deploy
- Browser Visual QA: ยังตรวจไม่ได้ในสภาพแวดล้อม Codex รอบนี้ เพราะ Sandbox แยกเครือข่ายจาก In-app Browser ทำให้ Browser เข้า Local Server ไม่ได้ แม้ Unit/Integration ผ่าน

ข้อจำกัดฐานข้อมูลสำคัญ:

- Production Database ปัจจุบันมี `player_card_loadouts` สำหรับ Legacy Battle เพียง 3 ช่องและบังคับการ์ดไม่ซ้ำ
- ROUND 2 จึงใช้ตาราง/RPC แยกเพื่อไม่เปลี่ยนกติกา Legacy: `scenario_adventure_loadouts` และ `save_scenario_adventure_loadout`
- Migration draft อยู่ที่ `supabase/scenario_adventure_round2_loadout.sql`
- Migration นี้ **ยังไม่ได้ Apply ไป Production** เพราะต้องได้รับอนุญาตจากเจ้าของโปรเจกต์ก่อน
- ก่อน Apply หน้าเว็บยังทดสอบ Flow ในแท็บปัจจุบันได้ แต่จะแจ้งชัดเจนว่า Loadout 5 ใบยังไม่ถูกบันทึกถาวร

สิ่งที่ตั้งใจรอ ROUND 3:

- ความสามารถ/ผลลัพธ์การ์ดสำหรับ Scenario ฉบับจริง
- Response Points และ Stability
- Bot Strategy เชิงลึก
- กติกาจบแมตช์ Scenario Adventure
- ห้ามเริ่มส่วนเหล่านี้อัตโนมัติ

## 1. คำสั่งสำคัญสำหรับผู้รับช่วงงาน

ก่อนแก้ไขโปรเจกต์นี้:

1. อ่านไฟล์นี้จนจบ
2. รัน `git status` และตรวจไฟล์ที่ยังไม่ได้ Commit
3. ห้ามใช้ `git reset --hard`, `git clean` หรือคำสั่งที่อาจลบงานค้าง
4. ห้ามสร้างโปรเจกต์ใหม่หรือ Rewrite ระบบทั้งหมด
5. รักษา Auth, Lobby, Learning World, Story Mission, Final Quiz, Card Unlock และ Card Collection เดิม
6. ห้ามแก้หรือ Apply Production Database Migration โดยไม่ได้รับอนุญาตจากเจ้าของโปรเจกต์
7. Source หลักอยู่ที่รากโปรเจกต์ ส่วน `dist/` เป็นสำเนาสำหรับ Deploy ต้องอัปเดตให้ตรงกันเมื่อเปลี่ยนไฟล์ที่ใช้บนเว็บ
8. หลังแก้ไขให้รัน `node --test` และตรวจ Regression ของระบบเดิม

---

## 2. ภาพรวมโปรเจกต์

AI District เป็นเว็บเกมการเรียนรู้เรื่อง AI Literacy และ AI Ethics สำหรับนักเรียนมัธยมศึกษา ประกอบด้วยสองส่วนหลัก:

- **Learning World** — Story Mission, หลักฐาน, Simulation, Decision, Final Quiz และรางวัลการ์ด
- **AI World** — กระดาน 3D, ลูกเต๋า, Movement, Turn Manager, Bot และระบบการ์ด

เทคโนโลยีหลัก:

- Static HTML/CSS/JavaScript Modules
- React 18 ผ่าน ESM CDN
- React Three Fiber / Three.js
- Supabase Auth, Database, RPC, RLS และ Realtime
- Node built-in test runner (`node --test`)
- ไม่มี Root `package.json` และยังไม่มี Build Pipeline แบบ Bundler

Repository:

- GitHub: `https://github.com/AArtemisX/Ai-District.git`
- Branch หลัก: `main`
- Commit ที่ Push ล่าสุดก่อนเริ่ม Major Redesign: `c80db9c`
- Commit ดังกล่าวเป็นจุดย้อนกลับที่ปลอดภัยของเกม District Battle รุ่นก่อนหน้า

---

## 3. สถานะ Working Tree ปัจจุบัน

หลัง commit `c80db9c` มีงานที่ยังไม่ได้ Commit ดังนี้:

- คู่มือผู้เล่น:
  - `PLAYER_GUIDE_TH.md`
  - `คู่มือการเล่น_AI_District_2.0.txt`
- Major Gameplay Redesign — ROUND 1
- Root `README.md` ไฟล์นี้

ห้ามลบหรือเขียนทับไฟล์เหล่านี้ก่อนตรวจสอบ Diff

---

## 4. ระบบที่พัฒนาเสร็จก่อน Major Redesign

### 4.1 Authentication และบัญชี

- สมัครสมาชิกด้วย Supabase Auth
- ยืนยันอีเมล
- Login / Logout
- ลืมรหัสผ่านและตั้งรหัสผ่านใหม่
- สร้าง Profile หลังสมัคร
- Tutorial สำหรับผู้เล่นใหม่

ไฟล์สำคัญ:

- `login.html`, `login.js`
- `confirm-email.html`, `confirm-email.js`
- `reset-password.html`, `reset-password.js`
- `flow-common.js`
- `supabase-client.js`

### 4.2 Lobby, Friends และ Waiting Room

- Lobby หลัก
- ระบบเพื่อน คำขอเป็นเพื่อน สถานะออนไลน์ และแชท
- สร้าง/เข้าห้องด้วย Room Code
- เชิญเพื่อนเข้าห้อง
- Waiting Room รองรับ 2–4 ช่อง
- เพิ่ม/ลด Bot
- Ready State, Kick, Leave และ Disband
- Supabase Realtime สำหรับ Waiting Room

ข้อจำกัด: ห้องรองรับ 2–4 ช่องใน UI แต่ Gameplay กระดานเดิมยังทำงานหลักเป็นผู้เล่นหนึ่งคนพบ Bot หนึ่งตัว ไม่ใช่ Multiplayer Realtime เต็มรูปแบบ

ไฟล์สำคัญ:

- `lobby.html`, `lobby.js`
- `friends.html`, `friends.js`
- `room.html`, `room.js`
- `ai-world.html`, `ai-world.js`
- `social-presence.js`

### 4.3 Learning World

- Learning Hub แยกตาม District และระดับชั้น
- Mission Player แบบ Data-Driven
- Dialogue, Evidence, Knowledge Card, Simulation และ Decision
- บันทึกความคืบหน้าและกลับมาเรียนต่อ
- Final Quiz 10 ข้อ ผ่านที่ 8/10
- Server-verified Quiz Result
- Permanent Card Unlock และป้องกันรับรางวัลซ้ำ
- Card Inventory แสดง Locked / Unlocked / Equipped

สถานะเนื้อหา:

- `ai-ethics-m6-01` เป็น Story Mission ม.6 ฉบับใช้งานจริง
- บทเรียนรหัสอื่นส่วนใหญ่ยังเป็น Component Demo ไม่ใช่เนื้อหาหลักสูตรสมบูรณ์

ไฟล์สำคัญ:

- `learning.html`, `learning.js`
- `lesson-player.html`, `lesson-player.js`
- `lesson-components.js`
- `mission-m6-data.js`
- `mission-demo-data.js`
- `mission-player-engine.mjs`
- `quiz.html`, `quiz.js`, `quiz-engine.mjs`
- `learning-reward-engine.mjs`
- `card-inventory.html`, `card-inventory.js`

### 4.4 Legacy District Battle

ระบบเดิมยังอยู่ครบและห้ามลบ:

- กระดาน 3D Low Poly จำนวน 32 ช่อง
- Isometric Camera และ Orbit Controls
- ลูกเต๋า 3D ผล 1–6
- Player/Bot Token เดินทีละช่องพร้อม Animation
- Turn State Machine
- District 4 เขต
- EN, IP, DP
- District Construction / Ownership / Influence
- Action Cards, Items และ Bot Strategy
- Match Result 10 รอบ
- Score Breakdown และ Learning Summary
- Surrender และ Replay
- Lightweight Battle Visual Feedback

เปิด Legacy Mode ด้วย:

`map-3d.html`

หรือระบุชัดเจน:

`map-3d.html?mode=district-battle`

ไฟล์สำคัญ:

- `map-3d.js`
- `map-3d/MapScene.js`
- `map-3d/board-data.js`
- `map-3d/Dice3D.js`
- `map-3d/PlayerToken.js`, `map-3d/BotToken.js`
- `map-3d/turn-manager.js`
- `map-3d/action-engine.js`
- `map-3d/district-engine.js`
- `map-3d/result-engine.js`

---

## 5. Major Gameplay Redesign

แนวทางใหม่เปลี่ยน Gameplay หลักจาก City Strategy เป็น **Scenario-Based Card Adventure** โดยไม่ลบ Legacy District Battle

Flow เป้าหมายในอนาคต:

`เลือกแผนที่ → เลือกการ์ด 5 ใบ → เริ่มแข่งขัน → ทอยและเดิน → พบสถานการณ์ AI → ใช้ Card Response หรือ Basic Response → ดูผลลัพธ์ → จบเทิร์น → สรุปผลการแข่งขัน`

Gameplay ใหม่จะไม่มี:

- District Construction
- District Ownership
- Influence Points
- City Building Actions
- Item Actions

Learning World ยังอยู่ และผู้เล่นไม่จำเป็นต้องเรียนก่อนเข้าแข่งขัน แต่การเรียนใช้ปลดล็อกการ์ดเพิ่มเติม

---

## 6. ROUND 1 — ทำเสร็จแล้ว

ขอบเขต ROUND 1:

- PHASE 0 — Inspection และ Backup Verification
- PHASE 1 — Game Mode Separation
- PHASE 2 — Scenario Engine Foundation

### 6.1 Backup / Inspection

- ตรวจ Git Status, Branch และ Remote แล้ว
- จุดสำรองที่ปลอดภัยคือ `c80db9c` บน `github/main`
- ไม่ใช้ Git Reset หรือ Git Clean
- ไม่แก้ Supabase Production Schema
- ไม่สร้าง Migration ใหม่ใน ROUND 1

### 6.2 Game Mode Separation

เพิ่ม Game Mode:

- `district-battle` — Legacy Mode
- `scenario-adventure` — โหมดใหม่

Entry module:

- `map-3d-entry.js`

`map-3d.html` จะโหลด Entry module ก่อน แล้ว Dynamic Import เฉพาะโหมดที่เลือก

เปิด Scenario Adventure Foundation ด้วย:

`map-3d.html?mode=scenario-adventure`

Scenario Adventure Mode ไม่ Import:

- `district-engine.js`
- `DistrictPanel.js`
- `item-data.js`
- `action-engine.js`
- `result-engine.js`

จึงแยกจาก Legacy Gameplay จริง ไม่ใช่เพียงซ่อน UI

### 6.3 Scenario Engine Foundation

เพิ่มโฟลเดอร์:

`scenario-adventure/`

ไฟล์ภายใน:

- `game-mode.js` — Mode config และ capability flags
- `theme-config.js` — Default Theme และการจับ Category ตาม Tile Index
- `scenario-seed.js` — Local Mock Scenario Seed จำนวน 8 เรื่อง
- `scenario-repository.js` — Repository Interface และ Local Implementation
- `scenario-engine.js` — Scenario Selection, Shared History, No-repeat และ Fallback
- `app.js` — Foundation Preview ที่ต้อง Login
- `scenario-engine.test.mjs` — Unit Tests ของ Foundation
- `README.md` — Impact Summary ของ ROUND 1

Scenario schema ปัจจุบันรองรับ:

- `scenarioId`
- `themeId`
- `category`
- `difficulty`
- `title`
- `description`
- `availableResponses`
- `cardTags`
- `outcomes`
- `explanation`
- `status`

สถานการณ์ Local Seed ทั้งหมดมีสถานะ `MOCK` เพื่อไม่ให้เข้าใจผิดว่าเป็น Production Content

### 6.4 กติกาการเลือก Scenario

- เลือกตาม Theme
- เลือกตาม Category ของช่อง
- ผู้เล่นและ Bot ใช้ History ชุดเดียวกัน
- Scenario ID เดิมเกิดได้เพียงครั้งเดียวต่อแมตช์
- กลับมาตกช่องเดิมจะได้ Scenario ใหม่
- หาก Scenario ใน Category หมด จะใช้ Fallback ของ Category เดิม
- Fallback สร้าง Instance ID ใหม่ทุกครั้งและไม่วน ID เดิม
- Content ทั้งหมดกำหนดไว้ล่วงหน้า ไม่มีการเรียก AI API สร้างคำตอบสด

### 6.5 Repository Boundary

ROUND 1 ใช้ `LocalScenarioRepository` เท่านั้น

ยังไม่มี:

- Scenario Table ใน Supabase สำหรับโหมดใหม่
- Supabase Scenario Repository
- Production Migration
- RLS สำหรับ Scenario Content ใหม่

หากจะเพิ่ม Database ในอนาคต ต้องตรวจ Schema และ RLS จริงก่อน และต้องได้รับอนุญาตก่อน Apply Production

---

## 7. ผลการทดสอบล่าสุด

คำสั่ง:

```powershell
node --test
```

ผลล่าสุด:

- Scenario Adventure ROUND 1: 8/8 ผ่าน
- Test Suite ทั้งโปรเจกต์: 83/83 ผ่าน
- Fail: 0
- Regression Test ของระบบ Legacy, Learning, Quiz และ Rewards ผ่าน
- JavaScript syntax check ผ่านสำหรับไฟล์ใหม่
- Source และ `dist/` ของไฟล์ ROUND 1 ตรงกัน

ยังไม่ได้ทำ Visual Browser QA ของ Foundation Preview เพราะ Local HTTP Server ถูก sandbox ของ session ก่อนหน้าปฏิเสธ ไม่ใช่เพราะพบ JavaScript Test Failure

เมื่อนำไปรันบนเครื่องใหม่ ควรเปิดหน้า Preview และตรวจ Browser Console อีกครั้ง

---

## 8. วิธีรันบนเครื่องใหม่

โปรเจกต์ใช้ ES Modules จึงไม่ควรเปิด HTML ผ่าน `file://`

### วิธีที่ 1: Python HTTP Server

จากโฟลเดอร์โปรเจกต์:

```powershell
python -m http.server 4174 --bind 127.0.0.1
```

จากนั้นเปิด:

- Source: `http://127.0.0.1:4174/map-3d.html?mode=scenario-adventure`
- Deploy mirror: `http://127.0.0.1:4174/dist/map-3d.html?mode=scenario-adventure`

### วิธีที่ 2: VS Code Live Server

เปิด Root Folder แล้วใช้ Live Server กับ `map-3d.html` จากนั้นเติม Query:

`?mode=scenario-adventure`

### Supabase

- ตรวจ `supabase-client.js` ว่าชี้ Project ที่ต้องการ
- Frontend ใช้เฉพาะ Publishable/Anon Key
- ห้ามใส่ Service Role Key ใน Frontend
- หากใช้ฐานข้อมูลใหม่ ให้ Apply SQL ตามลำดับอย่างระมัดระวังและตรวจ RLS ก่อน

---

## 9. งานถัดไป — ROUND 2 เท่านั้น

รอบถัดไปต้องทำเฉพาะ:

### PHASE 3 — Card Loadout 5 Cards

- เปลี่ยน Loadout ใหม่จาก 3 เป็น 5 ใบ
- ใช้ Card Inventory และ Permanent Unlock เดิม
- ผู้เล่นใหม่ต้องมี Starter Cards อย่างน้อย 5 ใบที่ใช้ได้จริง
- ห้ามให้ผู้เล่นใช้การ์ดที่ยังล็อก
- แยก Deck Management ออกจาก Card Effects
- Deck 5 ใบ
- Starting Hand 3 ใบ
- ใช้แล้วไป Discard
- จั่วทดแทนจาก Deck
- กำหนดกติกาสับ Discard กลับ Deck เมื่อ Deck หมด

### PHASE 4 — Scenario Response UI

- แสดงชื่อ รายละเอียด ความยาก และหมวดของ Scenario
- แสดงการ์ดในมือ
- Card Response
- Basic Response
- แสดงเหตุผลเมื่อการ์ดใช้ไม่ได้
- Confirm / Cancel
- ป้องกัน Confirm ซ้ำด้วย Action ID / Idempotency
- เกมต้องดำเนินต่อได้แม้ไม่มีการ์ดที่เหมาะสม
- ยังไม่เพิ่ม VFX ใหม่

ห้ามเริ่ม ROUND 3 หรือ ROUND 4 อัตโนมัติ

---

## 10. งานที่ยังไม่ทำ

### ROUND 2

- Loadout 5 ใบ
- Deck / Hand / Discard ใหม่
- Scenario Response UI

### ROUND 3

- Outcome Engine
- Response Points (RP)
- Stability เริ่มต้น 10
- Rule-Based Bot สำหรับ Scenario
- 6 เทิร์นต่อฝ่ายผ่าน Config
- Match Result: RP ก่อน แล้วใช้ Stability ตัดสิน

### ROUND 4

- Theme Selection เต็มรูปแบบ
- Theme มีผลต่อ Scenario Pool จริง
- Full Integration Test
- Browser Visual QA

---

## 11. สิ่งที่ห้ามทำโดยไม่จำเป็น

- ห้ามลบ Legacy District Battle
- ห้ามแก้ Supabase Auth
- ห้ามแก้ Story Mission หรือ Final Quiz
- ห้ามเปลี่ยน Reward RPC หรือ Permanent Unlock
- ห้ามแจกการ์ดซ้ำ
- ห้ามสร้าง Item System ใหม่
- ห้ามนำ District/IP/City Construction เข้าสู่ Scenario Adventure
- ห้ามติดตั้ง Dependency หากระบบปัจจุบันทำได้
- ห้ามเพิ่ม Audio หรือ Particle Effects ในรอบ Foundation
- ห้าม Deploy Production อัตโนมัติ
- ห้ามใช้ Client เป็นแหล่งยืนยันสิทธิ์ปลดล็อกหรือผล Quiz

---

## 12. Deployment Mirror

โฟลเดอร์ `dist/` เป็นสำเนาไฟล์สำหรับ Deploy ไม่ใช่ Source of Truth

ไฟล์ ROUND 1 ที่มีสำเนาใน `dist/`:

- `dist/map-3d.html`
- `dist/map-3d-entry.js`
- `dist/scenario-adventure.css`
- `dist/scenario-adventure/`

เมื่อแก้ Source ในรอบถัดไป ต้องอัปเดตไฟล์ `dist/` ที่ตรงกัน และเปรียบเทียบ Hash หรือ Diff ก่อนส่งงาน

---

## 13. Definition of Done สำหรับงานถัดไป

งานหนึ่งรอบถือว่าเสร็จเมื่อ:

1. ทำเฉพาะ Scope ของรอบนั้น
2. ไม่ลบระบบเดิม
3. ไม่มี Secret Key ใหม่ใน Source
4. ไม่มี Production Migration ที่ถูก Apply โดยไม่ได้รับอนุญาต
5. `node --test` ผ่าน
6. Source และ `dist/` ตรงกัน
7. ทดสอบ Flow ที่เพิ่มจริงใน Browser เมื่อสภาพแวดล้อมอนุญาต
8. รายงานสิ่งที่ทำ สิ่งที่ยังไม่ทำ และข้อจำกัดตามจริง

