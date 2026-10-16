# AI District 2.0 — Project Handoff README

> เอกสารนี้จัดทำเพื่อส่งต่อโปรเจกต์ไปพัฒนาบนเครื่องอื่น หรือให้ AI/Coding Agent ตัวใหม่อ่านก่อนเริ่มแก้โค้ด  
> อัปเดตล่าสุด: 16 ตุลาคม 2026 (Asia/Bangkok) — Deploy: หน้าเว็บบน Vercel + ห้องออนไลน์บน Render ผ่าน rewrite `/api` (ดู `DEPLOY_VERCEL_RENDER.md`) / ต่อจาก Board Rules v2

> กติกาการทำงานถาวร: ทุกครั้งที่มีการแก้หรือเพิ่มระบบ ต้องอัปเดตไฟล์ `README.md` นี้ในรอบเดียวกัน โดยระบุสถานะล่าสุด ไฟล์ที่แก้ ผลทดสอบ ข้อจำกัด และงานถัดไปตามจริง

## CURRENT DEMO — Deploy: Vercel (หน้าเว็บ) + Render (ห้องออนไลน์) (16 ตุลาคม 2026)

### สถานะ: **READY TO DEPLOY** — เจ้าของจะ Deploy เองตาม `DEPLOY_VERCEL_RENDER.md` (ใช้แทน `DEPLOY_RENDER.md` ที่ลบไปแล้ว)

- **ที่มา:** เจ้าของใช้ Vercel เป็นที่ Deploy หลัง Deploy ครั้งล่าสุด การสร้างห้องขึ้น `The string did not match the expected pattern` เพราะ Vercel ไม่มี `/api` จึงส่งหน้า 404 (HTML) กลับมา และ Vercel แบบ serverless รัน room server ที่เก็บห้องในหน่วยความจำและเดิน Bot ไม่ได้
- **แก้แล้ว:**
  - ใหม่ `vercel.json` (ที่รากของ repo และ `dist/` เนื้อหาเหมือนกัน): rewrite `/api/:path*` ไปที่ `https://ai-district.onrender.com/api/:path*` **ต้องเปลี่ยนเป็นโดเมน Render จริงหลังสร้าง service**
  - `scenario-online-server.mjs`: เมื่ออยู่หลัง proxy ที่เชื่อถือได้ จะยอมรับคำขอที่ `Origin` ตรงกับ `X-Forwarded-Host` (คำขอจากโดเมนแปลกหน้ายัง 403)
  - `online-client.js`: ถ้าได้คำตอบที่ไม่ใช่ JSON จะขึ้น `ROOM_SERVER_UNAVAILABLE` พร้อมข้อความไทยที่อ่านเข้าใจ แทนข้อความ error ของ Safari
- **ทดสอบ:**
  - `node --test` ผ่าน **495/495**
  - `scenario-online-deploy.test.mjs` เพิ่มอีก 2 เทสต์ ได้แก่ คำขอผ่าน Vercel rewrite และรูปแบบของ `vercel.json`
  - Browser pane: จำลอง Vercel ในเครื่อง (proxy ที่ 4175 เสิร์ฟ `dist/` และส่งต่อ `/api` ไป server แบบ Render ที่ 4183 โดยเปลี่ยน Host เหมือน external rewrite) สร้างห้องคน + Bot แล้วเล่นจบ **ถึงหน้าผลลัพธ์ 12/12 ไม่มี error** และเมื่อปิด server ข้อความ error เป็นภาษาไทยตามที่ตั้งไว้
- **ยังไม่ได้ทดสอบ:** บน Vercel และ Render จริง (ต้อง push และ Deploy ก่อน)
- **ข้อจำกัด:** Render Free หลับเมื่อว่างประมาณ 15 นาที (คำขอแรกช้า 30–60 วินาที), ห้องหายเมื่อ redeploy/รีสตาร์ท/หลับ, ต้องมี instance เดียว และต้อง Deploy Render ทุกครั้งที่ไฟล์เกมฝั่ง server เปลี่ยน

## CURRENT DEMO — Deploy บน Render: หน้าเว็บ + ห้องออนไลน์ใน server เดียว (16 ตุลาคม 2026)

### สถานะ: **READY TO DEPLOY** — เจ้าของจะ Deploy เองตาม `DEPLOY_RENDER.md`

- **ปัญหา:** เมื่อ Deploy แบบ static (`dist/` ผ่าน `.openai/hosting.json`) การสร้างห้องขึ้น `เชื่อมต่อไม่สำเร็จ: Load failed` เพราะหน้าเว็บยิงไปที่ `http://127.0.0.1:4180` และบน hosting ไม่มี room server
- **แก้แล้ว:**
  - ใหม่ `scenario-adventure/online-server-url.js`: ถ้าเปิดจาก localhost ที่ไม่ใช่พอร์ต 4180 จะเรียก `:4180` แบบเดิม นอกนั้นเรียก origin เดียวกับหน้าเว็บ (`online-client.js` ใช้ตัวนี้ และยังตั้งที่อยู่ server เองผ่าน sessionStorage ได้เหมือนเดิม)
  - `scenario-online-server.mjs`:
    - ใช้ `PORT` ของ hosting และเปิดฟังที่ `0.0.0.0`
    - รับคำขอจากหน้าเว็บ origin เดียวกันเสมอ (ส่วน origin แปลกหน้ายัง 403)
    - จำกัดคำขอตาม `X-Forwarded-For` เมื่ออยู่หลัง proxy (`AI_DISTRICT_TRUST_PROXY=1` หรือบน Render)
    - รูปภาพใช้ cache 1 วัน ส่วน html/js/css ยังเป็น `no-store`
  - ใหม่ `package.json` (`"type": "module"`, `npm start`), `render.yaml` (Blueprint, rootDir `dist`, health `/api/health`) และคู่มือ `DEPLOY_RENDER.md` (ภายหลังแทนด้วย `DEPLOY_VERCEL_RENDER.md`)
- **ทดสอบ:**
  - `node --test` ผ่าน **491/491**
  - ใหม่ `scenario-online-deploy.test.mjs` (5 เทสต์): URL แบบ same-origin, health, สร้างห้องจาก origin เดียวกันได้และ origin แปลกหน้าถูกปฏิเสธ, เสิร์ฟหน้าเว็บแต่ไม่เสิร์ฟ dotfile/README, rate limit แยกต่อผู้เล่นหลัง proxy
  - smoke ที่ `dist/` ด้วย `PORT=4183 RENDER=true`: หน้าเว็บหลักและ `/api/health` ได้ 200
- **ยังไม่ได้ทดสอบ:** การเล่นในเบราว์เซอร์บนโดเมน Render จริง (ต้อง push และ Deploy ก่อน) ดูรายการตรวจหลัง Deploy ใน `DEPLOY_RENDER.md`
- **ข้อจำกัด:** ห้องอยู่ในหน่วยความจำ จึงหายเมื่อ redeploy, รีสตาร์ท หรือ Free plan หลับ และต้องมี instance เดียว ลิงก์ในอีเมลของ Supabase ต้องเพิ่ม URL ของ Render ใน Auth → URL Configuration

## CURRENT DEMO — Board Rules v2: ช่องโบนัส (16 ตุลาคม 2026)

### สถานะ: **READY WITH LIMITATIONS** — รอเจ้าของเซ็นรับ Gameplay v2

สัญญากติกาใหม่อยู่ที่ **`GAMEPLAY_FREEZE_HANDOFF_v2.md`** (v1 เก็บไว้เป็นประวัติ) ซึ่งเปลี่ยน v1 เฉพาะเรื่องต่อไปนี้:

- **ช่อง 8 จาก 32 ช่องเป็นช่องโบนัสทันที** (ไม่มีป๊อปอัพให้เลือก) มี 4 แบบ แบบละ 2 ช่อง: ⏩ เดินหน้า 2 ช่อง (ช่อง 3, 19) · ★ RP +1 (ช่อง 7, 23) · ♥ Stability +1 สูงสุด 10 (ช่อง 11, 27) · ☕ พักเติมพลัง ไม่มีผล (ช่อง 15, 31) — เลขช่องนับแบบที่เห็นบนกระดาน (index + 1)
- ช่อง MOVEMENT แบบเลือก (เดินหน้า 2 / ถอย 2 +1 RP) ถูกยุบรวมเป็นช่องโบนัส สัดส่วนใหม่คือ **ACTION 12 / BONUS 8 / SUPPORT 4 / RISK 4 / DECISION 4**
- **Rule A':** เดินหน้า 2 แล้วถ้าช่องปลายทางเป็นช่องสถานการณ์ จะเปิดเหตุการณ์นั้น 1 ครั้งในเทิร์นเดียวกัน (และนับเป็นเหตุการณ์ของเทิร์นนั้น) ถ้าปลายทางเป็นช่องโบนัสอีกช่อง จะไม่ต่อโบนัส ผ่าน START ไม่ได้อะไรเพิ่ม
- ช่องโบนัสนับเป็นเทิร์นของผู้เล่น ยังเล่นคนละ 6 เทิร์นเหมือนเดิม

### สิ่งที่เปลี่ยน

- `scenario-adventure/board-events.js`: mapping v2 (`TILE_EVENT_TYPES`, `TILE_BONUS_KINDS`, `BONUS_CONFIG`) และ `landOnTile()` ฟังก์ชันเดียวที่ใช้ทั้ง Online และ Local ส่วน `chooseEventIntent()` คืนค่า `null` สำหรับ BONUS
- `scenario-adventure/online-rooms.mjs`: `roll` ทำ ทอย → เดิน → โบนัส/เหตุการณ์ปลายทาง ใน commit และ revision เดียว เพิ่ม `room.bonus` และ `movement.bonusPath` ส่วน guard เดิมทุกตัวยังอยู่
- `scenario-adventure/app.js` (Local Practice): ใช้ `landOnTile` ช่องโบนัสไปที่ผลลัพธ์ทันที
- ภาพ: `event-visuals.js` (BONUS + สัญลักษณ์ ⏩ ★ ♥ ☕), `ScenarioAdventureScene.js`, `map-3d/BoardTile.js` (วาดสัญลักษณ์จาก visual อย่างเดียว), `BoardEventPanel.js`
- Online UI `online-app.js`: แสดง toast "ช่องโบนัส: เดินหน้า 2 ช่อง" ฯลฯ หลังเดินจบ (ถ้าเป็นเทิร์นคนอื่นจะมีชื่อนำหน้า) การ +2 ใช้ glide ของ `CharacterToken.js` เดิม แล้วค่อยเปิด popup หรือโต๊ะไพ่ของเหตุการณ์ปลายทาง CSS อยู่ใน `scenario-adventure.css` และ `online-room.html` เปลี่ยนเลข cache เป็น `?v=board-v2`
- เทสต์: ใหม่ `board-rules-v2.test.mjs` (15 เทสต์) และอัปเดตเทสต์ที่ยืนยัน mapping v1 ให้เป็น v2 โดยตั้งใจ ได้แก่ `board-events.test.mjs`, `neo-district-visual.test.mjs`, `bot-decision-policy.test.mjs`, `scenario-online-http.test.mjs`

### ผลทดสอบ

- `node --test` ทั้งโปรเจกต์: **457/457 ผ่าน**
- ชุด dist (`board-events`, `bot-decision-policy`, `neo-district-visual`, `scenario-online-http`, `board-rules-v2`, `scenario-online`, `turn-popup`): **52/52 ผ่าน**
- dist mirror: 18 ไฟล์ที่เปลี่ยน SHA-256 ตรงกันทั้งหมด (รวม `CardTable.js`/`ai-world.css`/`online-app.js` ของ Round 5H ที่อยู่ในไฟล์เดียวกัน)
- **Browser QA** (Browser pane, static worktree ที่ `127.0.0.1:4175` + room server ที่ `4181` เพราะ 4174/4180 ถูก session อื่นใช้อยู่): ห้อง "Board v2 QA 20261016" มี 2 ที่นั่ง คือคน + Bot เล่นจบ **3 แมตช์ติดกันจนถึงหน้าผลลัพธ์** (เล่นอีกครั้ง 2 ครั้ง) 12/12 events ทุกแมตช์ ไม่มี turn ค้าง และ room server ไม่มี error
  - เห็นจริง: Bot ได้ ★ RP +1 (+1 RP), ผู้เล่นได้ ☕ พัก (ไม่มีผล นับเทิร์น), ★ RP +1 และ ♥ Stability +1; Bot ได้ ⏩ จากช่อง 19 ไปช่อง 21 แล้วเปิด DECISION 1 ครั้ง (`viaBonus: FORWARD_2`) พร้อม toast "เปิดเหตุการณ์ช่อง 21"
  - Replay reset: ตำแหน่ง 0, 0 RP / 10 Stability, 0/6 เทิร์น, history/actionIds ว่าง, `bonus: null`

### ข้อจำกัด / งานถัดไป

- ในเลย์เอาต์จริง ⏩ จะไม่มีวันไปตกช่องโบนัสอีกช่อง กรณีไม่ต่อโบนัสจึงทดสอบด้วยเทสต์อัตโนมัติเท่านั้น
- ถ้าเทิร์นสุดท้ายตกช่องโบนัส แมตช์จะจบทันทีตอนทอย และไม่เห็น toast สุดท้าย
- ข้อความแถบเทิร์นของคนอื่นยังใช้คำว่า "เลือก:" กับผลโบนัส (เช่น "เลือก: RP +1")
- `gameplay-balance-sim.mjs` ยังเป็นสคริปต์ของ v1 (ยังมี MOVEMENT) ยังไม่ได้อัปเดต
- ยังไม่ commit งานรอบนี้ และไม่มี SQL, Supabase หรือ Deploy

## CURRENT DEMO — Round 5H: โต๊ะไพ่กลางจอสำหรับเทิร์น ACTION (16 ตุลาคม 2026)

### สถานะ: **READY WITH LIMITATIONS**

- เจ้าของขอให้การ์ด Action แสดงกลางจอเหมือนเกมไพ่ ซึ่งเป็น presentation เท่านั้น: เลือกการ์ดด้วย `setSelected` เดิม และยืนยันด้วย `action('respond', …)` เดิม payload เหมือนเดิมทุกตัว (resolver, คะแนน, deck/hand, server ไม่เปลี่ยน)
- เจ้าของขอเปลี่ยนกติกาให้มีช่องโบนัสด้วย แต่เลือกให้ทำ **หลังเดโม่** เพราะกระทบ Gameplay Freeze v1 กติกาที่เลือกไว้:
  - ช่องโบนัสผสม 4 แบบ: เดินหน้า 2 / RP +1 / Stability +1 / ช่องพัก
  - ใช้ 8 ช่องจาก 32 ช่อง
  - เดินโบนัสแล้วให้เปิดสถานการณ์ปลายทางได้ 1 ครั้ง โดยไม่ต่อโบนัสซ้ำ (เปลี่ยน Rule A)
  - รอบนี้ **ยังไม่ได้แตะ** `board-events.js` หรือกติกาใดๆ

### สิ่งที่เปลี่ยน

- **ใหม่ `scenario-adventure/CardTable.js`:** overlay เต็มจอตอนเทิร์นเราใน ACTION (`RESPONSE_SELECTION` + `room.scenario` + ยังไม่มี `room.result`)
  - ด้านบนเป็นการ์ดสถานการณ์ (หมวด, ชื่อ, เนื้อเรื่อง)
  - ตรงกลางเป็นไพ่ในมือกางเป็นพัด และไพ่ใบสุดท้ายคือ "ตอบแบบพื้นฐาน"
  - ด้านล่างมีคำใบ้ความเข้ากัน (ข้อความเดิมจาก `evaluateCardCompatibility`), จำนวน มือ/จั่ว/ทิ้ง และปุ่มยืนยัน
  - หน้าไพ่ใช้ artwork ถ้ามีการ map กับ Prototype (ตอนนี้มี Firewall Guard) ใบอื่นเป็นภาพประกอบตามประเภท (⚡ ATTACK / 🛡️ DEFENSE / 🧭 CONTROL / ✚ SUPPORT) และมีเหรียญ EN มุมซ้ายบน
  - ปุ่ม "ดูกระดาน ▾" ซ่อนโต๊ะไพ่ และกด "เปิดหน้าต่างเทิร์นของฉัน" เพื่อกลับมา
- **`scenario-adventure/online-app.js`** (markup และเงื่อนไขแสดงผลเท่านั้น): เพิ่ม `cardTurn` ซึ่ง `GamePopup` จะไม่เปิดระหว่าง `cardTurn` และ render `CardTable` แทน ส่วนเทิร์นของผู้เล่นอื่น, Event ชนิดอื่น และผลลัพธ์ยังใช้ popup เดิม
- **`ai-world.css`:**
  - ไพ่กางเป็นพัดด้วย `rotate`/`translate` แยก property; ไพ่ที่เลือกยกขึ้น ตั้งตรง ขยาย 1.08 และมีขอบทอง
  - แจกไพ่ทีละใบตอนเปิด
  - ขนาดไพ่คำนวณตามความกว้างจอและจำนวนไพ่ (เผื่อระยะการหมุน) และบนมือถือซ้อนแน่นขึ้น ไพ่ใหญ่ขึ้น อยู่กลางจอ
  - รองรับ reduced motion
- `online-room.html`: cache `?v=card-table-1`

### Tests / Parity / QA

- `node --test` ทั้งชุดผ่าน **449/449**
- `dist/` ที่ HEAD ตรงกับ source ก่อนแก้ และหลัง mirror ตรงกัน **4/4 ไฟล์**
- Browser pane (หน้าทดสอบแยกที่ใช้ `CardTable.js` + `ai-world.css` ตัวจริงกับข้อมูลสมมติ):
  - 602px: ไพ่ 4 ใบอยู่ในจอทั้งหมด, เลือก Firewall Guard แล้วไพ่ยกขึ้นและปุ่มยืนยันเปิดใช้
  - 390×844: ไพ่กว้างประมาณ 115px อยู่กลางจอ และไม่มี scroll แนวนอน
- **ยังไม่ได้ตรวจ:** เทิร์น ACTION จริงในห้อง Online (ทอย → เดิน → โต๊ะไพ่ → ยืนยัน → ผลลัพธ์) และ Safari

### STOP

- ไม่ Deploy, ไม่แก้ SQL และไม่แตะ Gameplay ส่วนกติกาช่องโบนัส v2 รออนุมัติให้เริ่มหลังเดโม่

## CURRENT DEMO — Crystal Palace Phase 4: Polish (16 ตุลาคม 2026)

### สถานะ: **READY WITH LIMITATIONS** — หยุดหลัง Phase 4 ตามแผน

- งานภาพ/UX เท่านั้น: **ไม่แตะข้อมูล, SQL, Gameplay, rooms, Auth**; ไม่ Deploy, ไม่ commit (git ให้ session หลักจัดการ)
- ยังคงอัตลักษณ์ Crystal Palace ไฮด์ปาร์ก 1851: หลังคาโค้งกลางหลังเดียว, หลังคาลดหลั่น, ridge-and-furrow

### สิ่งที่เปลี่ยน

- **แสงและวัสดุ**
  - ใหม่ `crystal-palace/scene/Atmosphere.js`: `SoftEnvironment` สร้าง environment map แบบ procedural ครั้งเดียว (โดมท้องฟ้าอุ่น + พื้นหญ้า + จุดแดด ผ่าน `PMREMGenerator` ไม่โหลด HDR) ให้กระจก/เหล็กมีเงาสะท้อนนุ่มๆ **โดยไม่ใช้ transmission**; `LightShafts` ลำแสงอุ่นใต้หลังคาโค้ง (instanced 1 draw call, additive, หายใจช้าๆ)
  - แสงอุ่นขึ้น (hemisphere/ambient/sun สีครีมทอง, เงานุ่มขึ้น `shadow-radius`) ยังเป็นไฟเงาดวงเดียว 1024
  - กระจกผนัง/สันหลังคา/หลังคาโค้ง: roughness ต่ำ + metalness เล็กน้อยเพื่อ sheen; เสาเหล็กมีเงาวาวเล็กน้อย
  - พื้นไม้ปาร์เก้จาก canvas pattern เดียว (ใช้ซ้ำทุกแผ่นพื้น), พรมแยกสีตามโซน (instanced 1 draw call), วงแหวนสีฟ้ารอบน้ำพุ
- **การนำทาง**
  - ลูกศรบนพื้น (chevron, instanced 1 draw call): ทางเข้า → โถงกลาง แล้วออกไปแต่ละปีกตามสีโซน; ข้อมูลอยู่ใน `config/palace-layout.js` (`FLOOR_PATHS`)
  - ใหม่ `scene/Signpost.js`: ป้ายไม้ชี้ทางที่โถงกลาง (`SIGNPOSTS` ใน config) 4 แผ่น อ่านได้ทั้งสองด้าน — หน้าป้ายทั้งหมดรวมเป็น geometry เดียว + texture atlas เดียว; เป็นสิ่งกีดขวางใน collision
  - ใหม่ `systems/minimap.js` (pure) + `ui/Minimap.js`: แผนที่ย่อมุมขวาบน (มือถือ: มุมขวาล่าง) แสดงโซนจาก config, เส้นพื้นที่เดินได้, จุดนิทรรศการ (สีทอง = จบแล้ว), ลูกศรผู้เล่น + เข็มทิศ N; **แตะแผนที่เพื่อเดินไป**; ลูกศรผู้เล่นอัปเดตตรงที่ DOM ทุกเฟรม (ไม่ re-render React); ซ่อนเมื่อเปิดแผงนิทรรศการ
- **แอนิเมชัน** (ทั้งหมดปิดเมื่อ `prefers-reduced-motion`)
  - ตัวละคร: เด้งตอนเดิน + เอนตัวไปข้างหน้าแบบนุ่ม (`rotation.order = "YXZ"`) + หันตามทิศเดิน
  - น้ำพุ: ละอองน้ำ 28 หยด (instanced) และวงคลื่นสองวงบนอ่าง
  - ต้นเอล์มและต้นไม้รอบสวนโยกเบาๆ ผ่าน instance matrix (ไม่เพิ่ม draw call)
  - คริสตัลของบทเรียนที่ยัง "เรียนได้" เต้นเป็นจังหวะ
- **มือถือ**
  - `systems/movement.js`: `smoothDirection` (ease เข้า/ออก ไม่ขึ้นกับ frame rate), จอยสติ๊กมี dead zone + power curve, `arrivalSpeedFactor` ให้การแตะเดินชะลอก่อนถึงเป้าหมายโดยไม่เลยเป้า
  - ปุ่ม HUD/ปิดแผงสูง 44px, จอยสติ๊ก 132px, แผนที่ย่อไม่ทับจอยสติ๊ก/prompt; ไม่มี horizontal overflow
- แก้ไฟล์อื่น: `scene/PalaceScene.js`, `PalaceStructure.js`, `TranseptVault.js`, `AtriumLandmarks.js`, `ExhibitStand.js`, `PlayerAvatar.js`, `instancing.js` (`materialProps`), `systems/collision.js` (signpost), `app.js`, `crystal-palace.css`; bump cache `crystal-palace.html` → `?v=cp-4`
- เทสต์ใหม่ `crystal-palace-polish.test.mjs` (8 เทสต์)

### Performance (Browser pane, วัดแบบเดียวกันก่อน/หลัง: แตะพื้นให้เดิน แล้วนับ rAF 3 วินาที + นับ draw call ผ่าน WebGL2 รวม shadow pass)

| ขนาด | ก่อน | หลัง |
|---|---|---|
| 1280×720 | 60.2 fps · ~50 draw calls/เฟรม · p95 17.6 ms | 60.1 fps · ~61 draw calls/เฟรม · p95 17.6 ms |
| 390×844 | 40.5 fps · ~57 draw calls/เฟรม · p95 17.7 ms | 40.2 fps · ~68 draw calls/เฟรม · p95 17.6 ms |

- Draw call เพิ่ม ~11 ต่อเฟรม (ลำแสง, พรม, ลูกศร, ป้ายชี้ทาง, ละอองน้ำ/วงคลื่น); frame time p95 เท่าเดิม
- ตัวเลข fps ที่ 390×844 ต่ำกว่า 60 ทั้งก่อนและหลังเพราะ Browser pane หยุด rAF เป็นช่วงๆ เมื่อไม่มี input จริง (ไม่ใช่ค่าบนมือถือจริง)

### Tests / Parity / QA

- `crystal-palace-polish.test.mjs`: minimap fit/aspect/round-trip/ทิศ, shapes จาก config, transform ลูกศรผู้เล่นตาม heading, จอยสติ๊ก dead zone + curve, `smoothDirection` (ease + ไม่ขึ้นกับ fps + หยุดสนิท), แตะเดินชะลอและไม่เลยเป้า, signpost เป็นของแข็งและไม่ขวางทาง/นิทรรศการ, กฎ budget (ไม่มี transmission, ไฟเงาดวงเดียว 1024, dpr ≤ 1.5, มี reduced-motion guard)
- เทสต์ collision เดิม (reachability ทุกนิทรรศการจาก spawn) ยังผ่านหลังเพิ่ม signpost
- `node --test` ทั้งชุดผ่าน **449/449** (441 เดิม + 8 ใหม่)
- `dist/` mirror **17 ไฟล์ที่เปลี่ยน/ใหม่** SHA-256 ตรงกัน และทั้ง tree `crystal-palace/` + `crystal-palace.html` ตรงกับ dist ทุกไฟล์
- Browser pane (static 4174 ของ session หลัก, ล็อกอินแล้ว): 1280×720, 1024×768, 390×844 — ป้าย/ลูกศร/พรม/วงแหวน/ละอองน้ำ/ลำแสง/แผนที่ย่อแสดงผล, แตะแผนที่ย่อแล้วเดินไปได้, จอยสติ๊กทำงาน, แผนที่ย่อซ่อนตอนเปิดแผง, ไม่มี console error, ไม่มี horizontal overflow

### ข้อจำกัด

- ยังไม่ได้ทดสอบ reduced motion ในเบราว์เซอร์ (pane จำลองไม่ได้) — โค้ดมี guard ทุกจุดและมีเทสต์ static
- แตะพื้น/แตะแผนที่ย่อยังเดินเส้นตรง (ไม่มี pathfinding) จะหยุดที่น้ำพุ/แท่น
- ตัวเลข fps เป็นของ Browser pane เท่านั้น; ยังไม่ได้วัดบน Safari/มือถือจริง/GPU รุ่นต่ำ
- ไม่ได้ start/stop server ในรอบนี้ (ใช้ static 4174 และ room 4180 ที่ session หลักเปิดไว้)

### STOP

- ไม่ Deploy, ไม่แก้ SQL, ไม่แตะ Gameplay, ไม่ commit/push

## PREVIOUS DEMO — Crystal Palace Phase 3: Connected Demo (16 ตุลาคม 2026)

### สถานะ: **READY WITH LIMITATIONS** — หยุดหลัง Phase 3 ตามแผน

- Crystal Palace อ่านความก้าวหน้าจริงของผู้เล่นจาก Supabase แบบ **อ่านอย่างเดียว** (SELECT เท่านั้น): `learning_lessons`, `player_learning_progress`, `lesson_rewards`, `user_card_unlocks`, `action_cards`
- **ไม่ปลดล็อก ไม่ประทับตรา ไม่ให้รางวัลจากฝั่ง client**; ไม่มี SQL, ไม่มี Token, ไม่ Deploy, ไม่แตะ Gameplay / rooms / Auth / schema
- เพิ่มทางกลับ (option A): `return=crystal-palace` แบบ allowlist ค่าเดียวใน `lesson-player.js` และ `quiz.js`

### สิ่งที่เปลี่ยน

- ใหม่ `crystal-palace/data/palace-data-client.js`: query 4 ตารางพร้อมกัน แล้วตามด้วย `action_cards` เฉพาะ id ที่เกี่ยวข้อง
- ใหม่ `crystal-palace/data/palace-state.js` (pure):
  - `deriveExhibitStates`: แท่นบทเรียนทั้ง 12 → **locked** (ไม่มีแถว `learning_lessons` ที่ active สำหรับ code นั้น) / **available** (มี `inProgress` แยกเป็น "กำลังเรียน") / **completed** (`status = completed`) พร้อมการ์ดรางวัลจริงจาก `lesson_rewards` + สถานะได้รับแล้วจาก `user_card_unlocks`
  - `derivePassportStamps`: ตราประทับจากแถว completed ใน `player_learning_progress` ของ 12 บทเรียนเท่านั้น
  - `deriveArchiveCards`: การ์ดรางวัล (ไม่ซ้ำ) + การ์ดที่ปลดล็อกแล้ว; ได้แล้ว → ภาพจาก `assets/thumbs/` (`action_cards.education.artwork` → prototype mapping → ภาพประเภทการ์ด); ยังไม่ได้ → เงาปริศนา + คำใบ้ "ผ่าน Quiz บทเรียน X (≥ คะแนน)" จาก `lesson_rewards`
- ใหม่ `crystal-palace/data/visit-session.js`: ก่อนออกไปบทเรียน บันทึกตำแหน่ง/ทิศ/แท่นลง `sessionStorage` (`aiDistrict.crystalPalace.visit.v1`); ตอนกลับอ่านครั้งเดียว ตรวจขอบเขต อายุ ≤ 6 ชม. และ id แท่น
- ใหม่ `crystal-palace/return-param.js`: `exitDestination`, `carryPalaceReturn`, `palaceLessonHref` — ยอมรับเฉพาะ `return=crystal-palace` → `crystal-palace.html`; ค่าอื่นใช้ปลายทางเดิม
- ใหม่ `crystal-palace/scene/CardGallery.js`: กรอบการ์ดแขวนในหอจดหมายเหตุ (ผนังปลายก่อน แล้วผนังข้าง)
- แก้ `crystal-palace/app.js`: สถานะโหลด/พร้อม/ผิดพลาด + ลองใหม่, refetch ตอน `pageshow` จาก bfcache, คืนตำแหน่งและเปิดแท่นเดิมเมื่อกลับมา; ฉากเดินได้เสมอแม้โหลดข้อมูลไม่สำเร็จ
- แก้ `crystal-palace/ui/ExhibitPanel.js` (สถานะบทเรียน, การ์ดรางวัล, ปุ่ม เริ่ม/เรียนต่อ/ทบทวน, ผนังการ์ด, พาสปอร์ต), `HUD.js` (ชิป 🛂 n/12 / กำลังโหลด / ⚠ ลองใหม่), `FallbackList.js` (ป้าย ✓ ○ 🔒), `scene/ExhibitStand.js` (คริสตัลสีทอง = จบ, เทา = ยังไม่เปิด), `scene/PalaceScene.js`, `config/exhibits.js` (ข้อความพาสปอร์ต/ตู้การ์ด + ฟิลด์ `panel`), `config/validate-config.js`, `crystal-palace.css`; bump cache ใน `crystal-palace.html` เป็น `?v=cp-3`
- แก้ `lesson-player.js` (diff 4 บรรทัด, รักษา CRLF เดิม): import helper; ปุ่มออก/จบบทเรียนใช้ `exitDestination(location.search)` (ค่าเริ่มต้นยังเป็น `learning.html`); ไป Quiz พก `return=crystal-palace` ต่อ; `return=quiz` เดิมไม่เปลี่ยน
- แก้ `quiz.js` (diff 3 บรรทัด): ลิงก์ "กลับ Learning World" → "กลับ Crystal Palace" เมื่อมี param; ปิดหน้ารางวัลแล้วไปปลายทางเดียวกัน; **ไม่แตะตรรกะ quiz / `claim_lesson_reward`**
- เทสต์ใหม่ `crystal-palace-data.test.mjs` (8 เทสต์)

### Tests / Parity / QA

- `crystal-palace-data.test.mjs`: สถานะแท่น locked/available/in-progress/completed + การ์ดรางวัล, ข้อมูลว่างไม่ throw, ตราประทับเฉพาะ completed ตามลำดับ, ผนังการ์ด (ภาพเฉพาะการ์ดที่ได้, เงา + คำใบ้จริง, fallback ภาพ), allowlist `return` (ปฏิเสธ `quiz`, ตัวพิมพ์ใหญ่, URL ภายนอก, `//evil`, `.html`, null byte), ตรวจ diff ของ lesson-player/quiz, visit session (one-shot, ข้อมูลเสีย/เก่า/นอกขอบเขต), ชั้นข้อมูลเป็น SELECT-only
- `node --test` ทั้งชุดผ่าน **441/441** (433 เดิม + 8 ใหม่)
- `dist/` mirror **31/31 ไฟล์** SHA-256 ตรงกัน (`crystal-palace.html`, `lobby.html`, `lobby-game.css`, `lesson-player.js`, `quiz.js` และทุก `.js`/`.css` ใน `crystal-palace/`); เทสต์ไม่ได้คัดลอกไป dist
- Browser pane (static 4174, บัญชีจริงที่ล็อกอิน):
  - ข้อมูลจริง: 12/12 บทเรียนมีในระบบ (ไม่มี locked), `ethics_safety` จบแล้ว (คริสตัลทอง, ✓), `ethics_transparency` กำลังเรียน, ที่เหลือเรียนได้; พาสปอร์ต **1/12**; ฐานข้อมูลมีการ์ดรางวัล 1 ใบ (Access Denied ← `ai-ethics-m6-01`, ≥ 8) และบัญชียังไม่มีการ์ด → ผนังแสดงเงาปริศนา 1 ใบพร้อมคำใบ้ทั้งในแผงและบนผนัง 3D
  - ทางกลับ: แท่น Transparency → "เรียนต่อ" → `lesson-player.html?lesson=ethics_transparency&return=crystal-palace` (บันทึก visit แล้ว) → "ออกจากบทเรียน" → กลับ `crystal-palace.html` ที่ตำแหน่งเดิม แผงเดิมเปิดอยู่ ข้อมูลโหลดใหม่ และ visit ถูกลบแล้ว
  - Error state: จำลองให้ client ล้มในหน้า → ชิป "⚠ โหลดความก้าวหน้าไม่ได้ · ลองใหม่" + แผงแจ้ง "แสดงข้อมูลล่าสุดที่โหลดได้", ยังเดินได้; กดลองใหม่แล้วกลับเป็น 🛂 1/12
  - 1280×720 / 1024×768 / 390×844 ไม่มี horizontal overflow, หน้า palace ไม่มี console error และไม่มี request ล้มเหลว
  - หยุด static server 4174 แล้ว; room server 4180 ที่รันอยู่ไม่ได้เริ่มโดยรอบนี้ จึงไม่ได้หยุด

### ข้อจำกัด

- "locked" ใน palace = ไม่มีบทเรียน active สำหรับ code นั้น (ระบบไม่มีการล็อกบทเรียนตามลำดับ เหมือน `learning.js`)
- ยังไม่ได้ตรวจหน้า Quiz กลับ palace ในเบราว์เซอร์ (ต้องส่งคำตอบจริงซึ่งจะเขียน `quiz_attempts`) — ตรวจด้วยเทสต์ static แทน
- ลิงก์ทบทวนจากผล Quiz (`return=quiz`) ไม่พก `return=crystal-palace` ต่อ: ทบทวนแล้วกลับ Quiz ได้ แต่ปุ่มออกจากบทเรียนในรอบทบทวนจะไป `learning.html`
- ยังไม่ได้ทดสอบภาพการ์ดแบบ "ได้รับแล้ว" กับข้อมูลจริง (บัญชีนี้ยังไม่มีการ์ด) — ครอบคลุมด้วยเทสต์ pure
- `lesson-player.html` / `quiz.html` ยังใช้ cache version เดิม: ถ้าเบราว์เซอร์มี JS เก่าใน cache จะกลับ `learning.html` ตามเดิม (ไม่พัง)
- ระหว่าง QA การเปิดบทเรียนแล้วออกใช้ flow ปกติของ `lesson-player` ที่บันทึก `scene_index`/`active_seconds` ของบัญชีนั้นตามปกติ
- ยังไม่ได้ตรวจ Safari / มือถือจริง

### STOP

- ไม่ Deploy, ไม่แก้ SQL, ไม่ทำ Token, ไม่ commit

## PREVIOUS DEMO — Crystal Palace Phase 1–2: โหมดสำรวจอาคารกระจก (16 ตุลาคม 2026)

### สถานะ: **READY WITH LIMITATIONS** — หยุดหลัง Phase 2 ตามแผน

- หน้าใหม่ `crystal-palace.html` เป็นโหมดเดินสำรวจนิทรรศการ AI ในอาคารที่อิง **Crystal Palace ของ Paxton ที่ไฮด์ปาร์ก ปี 1851** (ไม่ใช่อาคารซิเดนแฮม 1854): โครงเหล็กโมดูลาร์, หลังคาแบนลดหลั่น 3 ชั้น (nave → inner aisle → outer aisle), หลังคากระจกแบบสันและร่อง (ridge-and-furrow), หลังคาโค้งทรงกระบอก **หลังเดียว** คลุม transept กลาง (N–S) พร้อมหน้าต่างพัดครึ่งวงกลมที่ปลาย, ต้นเอล์มในโถงกลาง และน้ำพุแก้ว
- ต้องล็อกอิน (`requirePlayer()` จาก `flow-common.js`) ใช้ import map เดียวกับ `online-room.html` (React 18.3.1, @react-three/fiber 8.17.10, drei 9.117.3, three 0.170.0)
- **ไม่ได้แตะ** บอร์ดเกม, rooms, Auth, Supabase schema และไฟล์ที่ Gameplay Freeze v1 ห้ามแก้; ไม่มี SQL, ไม่ Deploy
- หน้านี้ **อ่านอย่างเดียว**: ไม่มีการเขียน Supabase, ไม่ปลดล็อก ไม่ประทับตรา ไม่ให้รางวัลใดๆ

### ผัง (config เป็นข้อมูล)

- โถงกลาง (Central Atrium, จุดตัด) — ต้นเอล์ม 4 ต้น + น้ำพุคริสตัล
- ปีกตะวันตก: หอจริยธรรม AI — `ethics_safety`, `ethics_reliability`, `ethics_privacy`, `ethics_transparency`, `ethics_accountability`, `ethics_fairness`, `ai-ethics-m6-01`
- ปีกตะวันออก: ศาลาผลกระทบของ AI — `impact_individual`, `impact_society`, `impact_environment`, `impact_analysis`, `impact_guidance`
- transept เหนือ: หอจดหมายเหตุคอลเลกชัน (ตู้การ์ด → ลิงก์ `card-inventory.html`, หอภาพตัวละคร → `character-selection.html`, พิมพ์เขียว 1851)
- transept ใต้: ประตูใหญ่ + มุมพาสปอร์ต (จุดเกิด) — พาสปอร์ตเป็นข้อความอธิบายเท่านั้น ยังไม่มีตราประทับ
- ปลาย nave ทั้งสองข้าง (|x| > 32) เป็น Future Expansion ที่ปิดด้วยแผงไม้ เดินเข้าไม่ได้

### ไฟล์ใหม่ / ที่แก้

- ใหม่ `crystal-palace.html`, `crystal-palace/app.js`, `crystal-palace/crystal-palace.css`
- ใหม่ `crystal-palace/config/`: `palace-layout.js` (bay grid, roof tiers, vault, walkable rects, เสา, zones), `exhibits.js` (นิทรรศการเป็นข้อมูล), `validate-config.js`
- ใหม่ `crystal-palace/systems/`: `collision.js` (walkable rects + วงกลมกีดขวาง, เลื่อนแยกแกน, sub-step กันทะลุ), `movement.js` (WASD/ลูกศร, จอยสติ๊ก, แตะพื้นเพื่อเดิน), `camera-rig.js` (FOLLOW → FOCUS → RETURN, มุม 50°, reduced-motion = ตัดภาพทันที), `interaction.js` (นิทรรศการที่ใกล้สุดในรัศมี + ปุ่ม E/Enter)
- ใหม่ `crystal-palace/scene/`: `PalaceStructure.js` (InstancedMesh เสา/คาน/กรอบกระจก/สันหลังคา + พื้น/สนามหญ้า/แผงปิด), `TranseptVault.js`, `AtriumLandmarks.js` (เอล์ม, น้ำพุ, ต้นไม้รอบสวน), `ExhibitStand.js`, `ZoneSign.js` (ป้าย canvas sprite), `PlayerAvatar.js` (token + ภาพ portrait ตัวละครที่เลือก), `PalaceScene.js`, `instancing.js`
- ใหม่ `crystal-palace/ui/`: `HUD.js` (โซนปัจจุบัน, กลับทางเข้า, ออกสู่ Lobby, prompt สำรวจ), `ExhibitPanel.js` (แผงด้านขวา / bottom sheet บนมือถือ), `Joystick.js`, `FallbackList.js` (รายการ 2D เมื่อไม่มี WebGL หรือ `?view=list`)
- แก้ `lobby.html`: เพิ่มทางลัด Crystal Palace เป็นลิงก์ที่ 5 ใน `.lg-shortcuts` (ลิงก์เดิมครบ) และ bump CSS เป็น `?v=lobby-game-4`
- แก้ `lobby-game.css`: `.lg-shortcuts` เป็น 5 คอลัมน์, ไอคอนสี `gold`, ≤1180px ลด padding/ตัวอักษรให้ป้ายไม่ล้น, มือถือให้ลิงก์ที่ 5 กว้างเต็มแถว
- เทสต์ใหม่ (root): `crystal-palace-collision.test.mjs`, `crystal-palace-camera.test.mjs`, `crystal-palace-config.test.mjs`

### Rendering / Performance

- ส่วนซ้ำทั้งหมดเป็น InstancedMesh (draw call โครงสร้างหลักราว 10), กระจกโปร่งใสแบบ `opacity` ไม่มี transmission, ไฟเงาดวงเดียว 1024 ที่เลื่อนตามผู้เล่น, `dpr` ≤ 1.5, ไม่โหลดฟอนต์ใน WebGL (ป้ายวาดด้วย canvas)
- **Cutaway แบบ diorama:** โครงเหล็ก/กระจก/ต้นเอล์ม/ป้ายที่อยู่ระหว่างกล้องกับผู้เล่นถูก clip ด้วย plane ตามทิศกล้อง จึงไม่บังตัวละครหรือนิทรรศการ
- ตอน FOCUS: กล้องเบี่ยงออกจากแนวผู้เล่น, ซ่อนตัวละคร, และเลื่อนจุดมองให้นิทรรศการไม่โดนแผง (ขวาบนเดสก์ท็อป / ด้านบนของ bottom sheet บนมือถือ); จอแนวตั้งใช้ FOV กว้างขึ้น
- WebGL ใช้ไม่ได้, scene error หรือ context lost → แสดงรายการนิทรรศการแบบ 2D

### Tests / Parity / QA

- `crystal-palace-*.test.mjs` 18 เทสต์: ชนกำแพงไม่ทะลุแม้ delta ใหญ่มาก, random walk 20,000 ก้าวไม่หลุดพื้น, ไถลตามกำแพง, เสา/เอล์ม/น้ำพุ/แท่นเป็นของแข็ง, flood-fill จาก spawn ไปถึง **ทุกนิทรรศการ** และเข้าได้ทุกโซนที่เปิด / เข้าไม่ได้ทุกโซนที่ปิด, input คีย์/จอย/แตะ, state machine กล้อง FOLLOW→FOCUS→RETURN→FOLLOW + reduced motion, validator ของ config (lesson ครบ 12 ไม่ซ้ำ, ห้ามมี reward/stamp/unlock, ลิงก์ภายในเท่านั้น), หน้า auth-gated + import map + ไม่มีการเขียน Supabase
- `node --test` ทั้งชุดผ่าน **433/433** (เดิม 415 + ใหม่ 18)
- `dist/` mirror **24/24 ไฟล์** SHA-256 ตรงกัน (`crystal-palace.html`, `lobby.html`, `lobby-game.css` และทุกไฟล์ `.js`/`.css` ใน `crystal-palace/`); เทสต์ใหม่ไม่ได้คัดลอกไป dist
- Browser pane (ล็อกอินแล้ว):
  - 1280×720: เดินจากทางเข้า → โถงกลาง → หอจริยธรรม (ถึงแผงปิด Future Expansion) → หอจดหมายเหตุ → ศาลาผลกระทบ; E เปิดน้ำพุ (FOCUS) แล้ว Esc กลับ (RETURN); แตะแท่น M6 แล้วเดินไปเปิดเอง; "กลับทางเข้า" วาร์ปกลับ; "ออกสู่ Lobby" ไป `lobby.html` และเห็นทางลัดใหม่
  - 1024×768: หน้า palace ปกติ; Lobby ทางลัด 5 อันไม่ล้นหลังปรับ CSS
  - 390×844: จอยสติ๊ก + แตะพื้นเดินได้, แตะ prompt เปิด bottom sheet และน้ำพุอยู่เหนือแผง, `?view=list` แสดงรายการ 2D 18 รายการ
  - ไม่มี horizontal overflow ทั้ง 3 ขนาด, หน้า palace ไม่มี console error และไม่มี request ล้มเหลว (404 ที่เห็นใน Lobby มาจากตาราง Supabase เดิม `scenario_adventure_loadouts` / `scenario_card_eligibility` ไม่เกี่ยวกับรอบนี้)

### ข้อจำกัด

- แตะพื้นเพื่อเดินเป็นเส้นตรง ไม่มี pathfinding: ถ้าแตะข้ามน้ำพุ/แท่น ตัวละครจะหยุดที่สิ่งกีดขวาง (คีย์บอร์ด/จอยไถลรอบได้)
- ตัวละครเป็น token + ภาพ portrait (ยังไม่มีโมเดล 3D)
- เนื้อหานิทรรศการเป็นข้อความใน config เท่านั้น; ยังไม่ลิงก์ไปบทเรียน (รอ Phase 3 พร้อมพารามิเตอร์ `return` แบบ allowlist) และพาสปอร์ต/ตราประทับยังไม่ทำ (Tokens เลื่อนไป, ไม่มี SQL)
- ใน Browser pane, render loop จะเริ่มหลังมี input จริงครั้งแรก (pane หยุด rAF เมื่อไม่โฟกัส) — เป็นพฤติกรรมของ pane ไม่ใช่ของหน้า
- ยังไม่ได้ตรวจ Safari, มือถือจริง และ GPU รุ่นต่ำ (draw call/FPS ยังไม่ได้วัดบนเครื่องจริง)

### งานถัดไป (Phase 3, ยังไม่เริ่ม)

- ลิงก์นิทรรศการไป `lesson-player.html` / `quiz` พร้อม `return=crystal-palace` (allowlist) และกลับมาที่แท่นเดิม
- ตราประทับพาสปอร์ตแบบอ่านอย่างเดียวจาก `player_learning_progress`

### STOP

- ไม่ Deploy, ไม่แก้ SQL, ไม่แตะ Gameplay / rooms / Auth

## PREVIOUS DEMO — Round 5G: สมุดภาพการ์ด แทน Action Card Preview (16 ตุลาคม 2026)

### สถานะ: **READY WITH LIMITATIONS**

- เจ้าของขอให้หน้า `action-card-preview.html` เป็นแค่ที่ดูข้อมูลการ์ดแบบสมุดภาพ และออกแบบใหม่
- ตัดส่วน Component States และการเลือกชุดทดลอง 5 ใบออก **หน้านี้ไม่มีการเลือกหรือบันทึกใดๆ แล้ว** ไม่แตะ inventory, loadout, Supabase หรือ Gameplay

### สิ่งที่เปลี่ยน

- **`action-cards/app.js`** (เขียนใหม่): อ่าน `ACTION_CARD_PROTOTYPES` เดิม (ยังตรวจ `validateActionCardDefinition` ก่อนแสดง)
  - หัวหน้า "สมุดภาพการ์ด" พร้อมลิงก์กลับ Lobby และคลังการ์ดของฉัน (`card-inventory.html`)
  - แถบ "Prototype Sandbox · ไม่บันทึกสิทธิ์หรือ Loadout ของบัญชี" ยังอยู่ตามที่ test กำหนด
  - แท็บกรองประเภทพร้อมจำนวน: ทั้งหมด / ป้องกัน / โจมตี / สนับสนุน / กลยุทธ์ / พิเศษ
  - ชั้นวางการ์ดสะสม: ภาพ (thumbnail จาก `assets/thumbs/` → ภาพต้นฉบับ → ภาพประกอบตามประเภท), ป้ายประเภทสี, ชื่อ และดาวความหายาก 1–3 (Epic มีแสงวิ่ง)
  - กดการ์ดแล้วเปิดเป็น **สมุดสองหน้า** (`<dialog>`): หน้าซ้ายเป็นภาพเต็มในกรอบเอียง, หน้าขวาเป็นกระดาษมีเส้น แสดงประเภท ชื่อ ดาว คำอธิบาย สถานการณ์ที่ใช้ เงื่อนไข จังหวะใช้ จำกัดการใช้ ความหายาก และหมายเหตุ effect
  - ปุ่ม ‹ ก่อนหน้า / ถัดไป › และปุ่ม ← → บนคีย์บอร์ดพลิกการ์ดในหมวดที่กรองอยู่ (วนรอบ); Esc, คลิกพื้นหลัง หรือ × เพื่อปิด
- **ใหม่ `card-album.css`:** ธีม cozy (ครีม / เขียว / ไม้ / ทอง), ชั้นวาง auto-fill, สมุดพร้อมสันกลางและอนิเมชันพลิกหน้า; มือถือเป็นการ์ด 2 คอลัมน์ และสมุดเรียงแนวตั้ง; รองรับ reduced motion
- **`action-card-preview.html`:** เปลี่ยน stylesheet เป็น `card-album.css`, title เป็น "สมุดภาพการ์ด" และ bump cache เป็น `?v=album-1`
- ไม่ได้แก้หรือลบ `action-cards/ActionCard.js`, `CardCollection.js`, `collection-engine.js` และ `action-card-preview.css` (ไม่ได้ใช้ในหน้านี้แล้ว แต่ยังอยู่ให้ test และโค้ดเดิม)

### Tests / Parity / QA

- `node --test` ทั้งชุดผ่าน **415/415** (รวม `action-cards/main-web-integration.test.mjs` ที่ตรวจข้อความ Sandbox และลิงก์คลังถาวร)
- `dist/` ก่อนแก้ตรงกับ source และหลัง mirror ตรงกัน **3/3 ไฟล์** (`action-cards/app.js`, `action-card-preview.html`, `card-album.css`)
- Browser pane:
  - 1024×768: ชั้นวาง 10 ใบแสดงภาพครบ, เปิด Firewall Guard เป็นสมุดสองหน้า, กด → ไป Threat Shutdown (3/10) และ Esc ปิดได้
  - 390×844: การ์ด 2 คอลัมน์, สมุดเรียงแนวตั้ง และไม่มี scroll แนวนอน
- **ยังไม่ได้ตรวจ:** Safari และมือถือจริง

### STOP

- ไม่ Deploy, ไม่แก้ SQL และไม่แตะ Gameplay

## CURRENT DEMO — Round 5F: หน้าจัดตัวละครและเด๊ก แสดงภาพการ์ด + ธีม Cozy (16 ตุลาคม 2026)

### สถานะ: **READY WITH LIMITATIONS**

- เจ้าของแจ้งว่าหน้า "จัดตัวละครและเด๊กของฉัน" (`map-3d.html?mode=scenario-adventure` → `LoadoutScreen` ใน `scenario-adventure/app.js`) ยังไม่เป็นธีมใหม่ และอยากให้แสดงภาพการ์ด ไม่ใช่แค่ข้อความ
- เป็น presentation เท่านั้น: state, `addCard`, การนำออก, กติกาซ้ำ 2 ใบ, การบันทึกหรือเรียกชุด, สิทธิ์และ Gameplay ไม่เปลี่ยน

### สิ่งที่เปลี่ยน

- **`scenario-adventure/app.js`:**
  - เพิ่ม component `CardArt` ใช้ `card.artwork.src` หรือ `prototypeMetadata.artwork.src` โดยโหลด thumbnail จาก `assets/thumbs/` ก่อน แล้ว fallback ไปภาพต้นฉบับ
  - ถ้าการ์ดไม่มี artwork (การ์ดเก่าใน DB เช่น Patch Update, Energy Boost) จะแสดงภาพประกอบพื้นสีตามประเภท + ไอคอน (ATTACK ⚡, DEFENSE 🛡️, SUPPORT ✚, STRATEGY 🧭) ไม่ได้สร้าง mapping ภาพใหม่ให้การ์ดเก่า
  - ใส่ `CardArt` ในช่อง 5 ช่อง (ช่องว่างเป็นกรอบประ ＋) และในการ์ดทุกใบของคลัง เพิ่มแค่ `data-type` สำหรับสี
- **`cozy-theme.css`** (scope `.adventure-loadout` และ `.loadout-card-art`):
  - พื้นหลังฟ้าไล่เขียว, header และการ์ดหลักเป็นครีมมีเงาไม้, หัวเรื่องขาวขอบเขียว, ตัวนับ 5/5 สีทอง
  - ปุ่มบันทึกสีเขียว, ปุ่มหลักสีทอง
  - ช่องการ์ดมีเลขลำดับเป็นวงทอง; การ์ดในคลังเป็นก้อนขาวมีเงา, LOCKED จางลง และ Prototype เป็นขอบประม่วง
- `map-3d.html` เพิ่ม `cozy-theme.css` และ bump cache ของทุกหน้าที่ใช้ธีมเป็น `?v=cozy-2`

### Tests / Parity / QA

- `node --test` ทั้งชุดผ่าน **415/415**
- `dist/` ก่อนแก้ตรงกับ source (`app.js`, `map-3d.html`) และหลัง mirror ตรงกัน **10/10 ไฟล์**
- Browser pane:
  - เลือก Alexander ที่หน้าเลือกตัวละคร (เก็บใน session ของ pane) แล้วเปิดหน้าจัด Deck
  - ช่อง 5 ช่องแสดงภาพ: Firewall Guard เป็น artwork จริง ส่วน Patch Update / Energy Boost เป็นภาพประกอบตามประเภท
  - การ์ดในคลัง 12 ใบที่มี artwork โหลด thumbnail ได้ครบ (ไม่มีภาพเสีย) และอีก 10 ใบแสดงไอคอนตามประเภท
  - ไม่ได้กดบันทึกชุด
- 404 ใน console ของหน้านี้ไม่ได้มาจากไฟล์ของเกม (resource ทุกตัวได้ 200) ตรงกับข้อความเดิมที่ว่าตาราง Scenario Loadout บน Supabase ยังไม่เปิดใช้
- **ยังไม่ได้ตรวจ:** มือถือ และ Safari

### STOP

- ไม่ Deploy, ไม่แก้ SQL และไม่แตะ Gameplay

## CURRENT DEMO — Round 5E: หน้าหลักแสดง "ทีมของฉัน" + ธีม Cozy ทั้งเกม (16 ตุลาคม 2026)

### สถานะ: **READY WITH LIMITATIONS**

- ตาม feedback ของเจ้าของ:
  - เอาการ์ดโหมด Ai World ออก (มีปุ่มเริ่มเกมแล้ว) และเอา dock เมนูด้านล่างออก
  - หน้าหลักแสดงตัวละครกับการ์ด 5 ใบที่เลือกไว้
  - ย้ายปุ่มเริ่มเกมไปขวาล่าง และจัดระเบียบส่วนอื่น
  - ปรับ UI หน้าอื่นในเกมให้เป็นธีมเดียวกัน
- เป็น presentation เท่านั้น: ไม่ได้แก้ `lobby.js`, `ai-world.js`, Supabase, Auth, ห้อง หรือ Gameplay

### หน้าหลัก (`lobby.html`, `lobby-game.css`, ใหม่ `lobby-deck.js`)

- **แผง "ทีมของฉัน"** (`#lobby-squad`):
  - `lobby-deck.js` อ่านชุดที่ active ด้วย `readSavedLoadouts` + `validateSavedLoadout` และ `loadAdventureInventory` ตัวเดียวกับที่ Ai World ใช้ (อ่านอย่างเดียว ไม่เขียน loadout หรือ ownership)
  - แสดงภาพตัวละคร, ชื่อชุด และการ์ด 5 ใบ (ภาพ, ชื่อ, ประเภทแยกสี) เรียงเอียงแบบไพ่ในมือ
  - ถ้าไม่มีชุดที่ใช้ได้จะแสดงช่องว่าง 5 ช่องกับปุ่ม "เปลี่ยนตัวละคร / จัด Deck"
  - ชุดเก็บใน localStorage ต่อเบราว์เซอร์ (ตาม `saved-loadouts.mjs` เดิม) จึงเห็นเฉพาะในเบราว์เซอร์ที่เคยบันทึกชุดไว้
- **ปุ่ม "▶ เริ่มเกม"** ลอยอยู่ขวาล่าง ไป `ai-world.html` (บนมือถือเต็มความกว้างด้านล่าง)
- ทางลัด 4 อัน: บทเรียน, คลังการ์ด, Gallery, เพื่อน ส่วนด้านขวาเป็นบอร์ดภารกิจ / ความก้าวหน้า / เพื่อน เหมือนเดิม
- ตัดออก: การ์ดโหมด 3 ใบ (รวม Ai World), แถว Card Hub เดิม และ dock ล่าง
- ลิงก์ที่ test ตรวจยังอยู่ครบ: `class="lg-squad-edit portal-card world-portal" href="character-selection.html"`, `card-inventory.html`, `action-card-preview.html` และ `ai-world.html` (ปุ่มเริ่มเกม)
- **ใหม่ `assets/thumbs/`** 19 ไฟล์ (การ์ด 10 + ตัวละคร 9): ย่อด้วย `sips` ให้กว้าง 380px รวมประมาณ 3.4 MB ถ้าโหลด thumb ไม่ได้จะกลับไปใช้ภาพต้นฉบับ ภาพต้นฉบับไม่ถูกแก้
- ลบ `assets/lobby/*` ของรอบ 5D แล้ว เพราะไม่ได้ใช้

### ธีม Cozy ทั้งเกม (ใหม่ `cozy-theme.css`)

- **`ai-world.html` และ `online-room.html`** (ห้องรอ + Result):
  - พื้นหลังฟ้าไล่เขียว, panel และที่นั่งเป็นครีมมีเงาไม้, หัวเรื่องขาวขอบเขียว
  - ปุ่มเขียว/ทอง/ขาวแบบก้อนที่กดยุบ, input/dialog โทนครีม
  - ที่นั่งของเราเป็นกรอบเขียว, banner ห้องโทนเขียว และตาราง Result เป็นแถวการ์ด
- **`character-selection.html`:** re-tone ตัวแปรสีของ `character-selection.css` และพื้นผิวหลัก (topbar, roster, การ์ดที่เลือก, แถบยืนยัน, dialog)
- **`learning.html`, `card-inventory.html`, `friends.html`, `results.html`:** ปรับเบาๆ เฉพาะพื้นหลังและพื้นผิว panel หลัก + หัวเรื่องแบบเกม ไม่แตะ layout
- เพิ่มเฉพาะ `<link rel="stylesheet" href="cozy-theme.css?v=cozy-1">` ต่อท้าย stylesheet เดิมในแต่ละหน้า

### Tests / Parity / QA

- `node --test` ทั้งชุดผ่าน **415/415**
- `dist/` ก่อนแก้ตรงกับ source ทุกหน้า HTML ที่แตะ และหลัง mirror ตรงกัน **11/11 ไฟล์** + thumbs **19/19**
- Browser pane (Login แล้ว):
  - Lobby 1024×768 และ 390×844 ไม่มี scroll แนวนอน; สถานะว่างจริงแสดงถูกต้อง (pane ไม่มีชุดที่บันทึกไว้) และ layout ตอนมีชุดตรวจด้วยการเติม DOM ชั่วคราวในหน้า (ไม่บันทึกข้อมูล)
  - Ai World, เลือกตัวละคร, บทเรียน, คลังการ์ด และเพื่อน โหลดได้ เปลี่ยนเป็นธีมใหม่ และ layout ไม่เพี้ยน
- **ยังไม่ได้ตรวจ:** แผงทีมกับข้อมูลชุดจริง (ต้องดูใน Safari ที่มีชุดบันทึกไว้), ห้องรอกับ Result ในธีมใหม่แบบสด, หน้า lesson-player / quiz / tutorial / action-card-preview (ยังไม่ได้ใส่ธีม) และ Safari / มือถือจริง

### STOP

- ไม่ Deploy, ไม่แก้ SQL และไม่แตะ Gameplay

## CURRENT DEMO — Round 5D: หน้าหลัก (Lobby) แบบเมนูเกม (15 ตุลาคม 2026)

### สถานะ: **READY WITH LIMITATIONS**

- เจ้าของบอกว่าหน้าหลักยัง "ดูเหมือนเว็บ" จึงออกแบบ `lobby.html` ใหม่เป็นเมนูหลักแบบเกมมือถือ ใช้โทน cozy valley เดียวกับแมพ (ครีม / เขียวใบไม้ / ไม้ / ทอง)
- **ไม่ได้แก้ `lobby.js`** id และ selector ที่สคริปต์ใช้ยังอยู่ครบ (`#avatar-letter`, `#nav-player-name`, `#welcome-name`, `#player-xp`, `#item-count`, `#character-count`, `.players-online strong`, `#lesson-count`, `#learning-progress-bar`, `#mission-*`, `#lobby-friend-*`, `#logout-button`, `#toast`) และไม่แตะ Supabase หรือ Auth

### สิ่งที่เปลี่ยน

- **`lobby.html`** (เขียนใหม่):
  - ฉากหลังเป็นฟ้า เมฆลอย และเนินหญ้า low-poly 3 ชั้น
  - แถบ HUD ด้านบน: โลโก้, ป้ายผู้เล่น (avatar วงกลม + ออนไลน์), pill ทรัพยากร XP / ไอเทม / ตัวละคร / ผู้เล่นออนไลน์, ปุ่มกลมเพื่อน และออกจากระบบ
  - หัวเรื่องตัวหนังสือขาวขอบเขียวแบบเกม "พร้อมลุยไหม, ชื่อ?" และปุ่มใหญ่ **▶ เล่นเลย!** ไป `ai-world.html`
  - การ์ดโหมด 3 ใบมีภาพและริบบิ้น: บทเรียน / ตัวละครและเด๊ก / Ai Word ส่วนแถว Action Card Hub มี คลังการ์ด / Prototype Gallery / จัด Deck
  - ด้านขวาเป็นบอร์ดภารกิจแบบป้ายไม้: ภารกิจวันนี้, บทเรียนที่ผ่าน (แถบ XP), เพื่อน
  - Dock เมนูลอยด้านล่าง: ล็อบบี้ / บทเรียน / Ai Word (ปุ่มกลางยกสูง) / ตัวละคร / เพื่อน
- ลิงก์ที่ test ตรวจยังอยู่ครบ: `ai-world.html`, `character-selection.html`, `card-inventory.html`, `action-card-preview.html` และการ์ดตัวละครยังมี `class="... portal-card world-portal" href="character-selection.html"`
  - style เก่าของ `.portal-card` / `.world-portal` (padding, พื้นม่วง, emoji 🤖) ถูก reset เฉพาะบนการ์ดใหม่
- **ใหม่ `lobby-game.css`** (scope `body.lobby-game`): ปุ่มก้อนมีเงาล่าง, hover/กด, focus ring สีทอง; ≤1020px เป็นคอลัมน์เดียว, ≤760px สำหรับมือถือ (pill แถวเดียว, การ์ดโหมด 3 ใบเล็ก, dock เต็มกว้าง); ปิด animation เมื่อ reduced motion
- **ใหม่ `assets/lobby/learning.png`, `characters.png`, `world.png`:** สำเนาย่อด้วย `sips` จากภาพเดิม (รวมประมาณ 1.5 MB แทนประมาณ 6.7 MB) ไฟล์ต้นฉบับไม่ถูกแก้

### Tests / Parity / Browser QA

- Test ที่ตรวจ lobby และลิงก์: `ai-world`, `saved-loadouts` (source + dist), `action-cards/main-web-integration`, `characters/character-roster`, `friday-demo-hotfix01` (source + dist) ผ่าน **59/59**
- `dist/` ตรงกัน **5/5 ไฟล์** (`lobby.html`, `lobby-game.css`, `assets/lobby/*.png`) ส่วน `lobby.js` ไม่เปลี่ยน
- Browser pane (Login แล้ว):
  - ข้อมูลจริงโหลดเข้า HUD ได้ (ชื่อ, บทเรียน 1/11, ไอเทม, ตัวละคร, ออนไลน์, ภารกิจวันนี้, เพื่อน) และไม่มี console error
  - 1024×768: ไม่มี scroll แนวนอน
  - 390×844: pill 4 อันอยู่แถวเดียว, ไม่มี scroll แนวนอน และ dock อยู่ล่างจอ
- **ยังไม่ได้ตรวจ:** Safari / มือถือจริง และหน้าอื่น (Ai World, ห้องรอ, บทเรียน, ตัวละคร, Result) ยังเป็นธีมเดิม

### STOP

- ไม่ Deploy, ไม่แก้ SQL และไม่แตะ Gameplay

## CURRENT DEMO — Round 5C: Cozy HUD + ปุ่มทอยกลางจอ + ลูกเต๋าฟิสิกส์ + การ์ดผู้เล่นตามมุม (15 ตุลาคม 2026)

### สถานะ: **READY WITH LIMITATIONS**

- ตามคำขอของเจ้าของ: ปรับ UI หน้าเล่นเกม (`online-room.html`) ให้เข้ากับแมพ cozy low-poly, ตอนรอทอยไม่ขึ้นหน้าต่าง แต่ใช้ปุ่มทอยกลมกลางจอเหมือนภาพอ้างอิง, ลูกเต๋าพุ่งเข้ามาจากข้างจอแล้วตกพื้นตามฟิสิกส์, การ์ดผู้เล่น "ฉัน" อยู่ขวาล่างเสมอ และคนอื่นกระจายไปตามมุม
- เป็น presentation เท่านั้น: ค่าลูกเต๋ายังมาจาก server, ปุ่มทอยส่งคำสั่ง `action('roll')` ตัวเดิม และ resolver, คะแนน, ลำดับเทิร์น, Rule A, Bot และห้องไม่เปลี่ยน

### สิ่งที่เปลี่ยน

- **`scenario-adventure/online-app.js`** (แก้เฉพาะ markup และเงื่อนไขการแสดงผล):
  - `GamePopup` ไม่เปิดตอน `room.phase==='WAITING'` แล้ว ทั้งเทิร์นเราและเทิร์นคนอื่น ส่วน turn notice ด้านบนยังบอกว่าตาใคร popup ยังเปิดตามเดิมเมื่อมี Event หรือผลลัพธ์
  - เพิ่มปุ่ม `.aw-roll-fab` (วงกลมพร้อมหน้าลูกเต๋า + ป้าย "ทอยลูกเต๋า") แสดงเมื่อเป็นเทิร์นเราและ phase `WAITING` เรียก `action('roll')` เดิม และ disabled ขณะ `busy` หรือกำลังเล่น animation
  - ปุ่ม "เปิดหน้าต่างเทิร์นของฉัน" ซ่อนตอน `WAITING` เพราะไม่มี popup ให้เปิด
  - การ์ดผู้เล่นได้ class `corner-br` สำหรับตัวเรา ส่วนคนอื่นเรียง `corner-tl` → `corner-tr` → `corner-bl` ตามลำดับสมาชิก (เล่น 2 คน คู่แข่งอยู่ซ้ายบน)
  - เพิ่มแถบ Stability `.aw-stab-bar` ที่อ่านค่าจาก `room.match.scores` เดิม
- **`map-3d/Dice3D.js`:**
  - ลูกเต๋าพักอยู่บนถนนหน้า AI Core (`LANDING [0,1.03,5.3]`) แทนการลอยหมุนเหนือเมือง
  - ตอนทอย ลูกเต๋าเริ่มจากขอบขวาของมุมกล้องปัจจุบัน (camera right vector) บินโค้งตามแรงโน้มถ่วง 30 แล้วเด้ง (restitution .42, friction .18)
  - เล็งจุดตกให้สั้นกว่าจุดหยุดตามระยะไถลที่คำนวณไว้ ลูกเต๋าจึงไถลเข้ามาหยุดตรงจุดโดยไม่ถูกดึงย้อนกลับ
  - หลังเด้งครั้งแรกจะ slerp เข้าหน้าตามค่าที่ได้ (เพิ่มการหมุนรอบแกนตั้งเพื่อความเป็นธรรมชาติ หน้าบนไม่เปลี่ยน) และเรียก `onRollComplete(value)` ครั้งเดียวที่ 1.35 วินาที (เดิม 1.15)
  - ถ้าเปิด reduced motion จะวางลงที่จุดทันทีและ complete ที่ 0.3 วินาที
  - ไม่มีการชนกับวัตถุจริง (เป็นการจำลองแบบง่าย) ถ้าหมุนกล้องไปบางมุม ลูกเต๋าอาจบินผ่านตึกได้
- **`ai-world.css`** (scope `.aw-popup-arena` / `.aw-roll-fab`): ธีมครีม + เขียวใบไม้ + ไม้
  - การ์ดผู้เล่น: เงาก้อนสีครีม, ป้าย "ฉัน", กรอบทองเมื่อถึงตา และเขียวเมื่อเป็นตาเรา
  - turn notice เป็นป้ายไม้แขวน; popup, ปุ่ม, การ์ดในมือ, กรอบกระดาน และพื้นหลังหน้าปรับเป็นโทนเดียวกัน
  - ปุ่มทอยมี bob, hover, กด และ focus ring; บนมือถือปุ่มเล็กลงและยกขึ้นเหนือการ์ดล่าง; ปิด animation เมื่อเปิด reduced motion
- `online-room.html`: cache query `?v=cozy-hud-20261015`

### Tests / Parity / QA

- Focused tests ชุดเดิม (source + dist) ผ่าน **90/90** และ `node --check` ผ่าน
- `dist/` ตรงกับ source **16/16 ไฟล์**: `dist/map-3d/Dice3D.js` เดิมเป็นเวอร์ชันบีบบรรทัดที่ logic เหมือน source ก่อนแก้ (ตรวจ diff จาก checkpoint แล้ว) จึงถูกแทนด้วย source ใหม่
- **ลูกเต๋า:** ทดสอบในหน้าแยกที่ใช้ `Dice3D.js` ตัวจริง (scratchpad, port 4176 ปิดแล้ว): ทอยค่า 4 และ 6 → `onRollComplete` ถูกเรียก**ครั้งเดียว**ด้วยค่าที่ถูกต้องที่ 1343 / 1336 ms, ลูกเต๋าพุ่งเข้าจากขอบขวา ตกบนถนน และหน้าบนตรงกับค่า
- **ห้อง `60968910`** (ดูอย่างเดียว):
  - 1024×768: Bot ซ้ายบน, ตัวเราขวาล่างพร้อมป้าย "ฉัน" และแถบ Stability, ปุ่มทอยกลางล่าง และไม่มี popup ตอนรอทอย
  - 390×844: การ์ดอยู่ถูกมุม, ไม่มี scroll แนวนอน และลูกเต๋าวางบนพื้น
  - ระหว่างตรวจ เจ้าของทอยใน Safari เอง จึงออกจากห้องใน pane ทันทีโดยไม่กดอะไร
- **ยังไม่ได้ตรวจ:** การทอยจริงผ่าน server ในเบราว์เซอร์ (ปุ่มลอย → ลูกเต๋าบิน → เดิน → popup Event), เทิร์น Bot แบบสด, ห้อง 3–4 คน (มุม tr/bl) และ Safari

### STOP

- ไม่ Deploy, ไม่แก้ SQL และไม่แตะ Gameplay หน้าอื่น (Ai World, ห้องรอ, Result) ยังไม่ได้ปรับธีม

## CURRENT DEMO — Round 5B: Map Restyle ตามภาพอ้างอิง Cozy Low-Poly (15 ตุลาคม 2026)

### สถานะ: **READY WITH LIMITATIONS**

- เจ้าของส่งภาพอ้างอิงแมพสไตล์ cozy low-poly (พื้นหญ้าเป็นขั้น, ทางเดินสีครีม, ช่องขอบมนสีสด, ป่าสน, บ่อน้ำ, ดอกไม้, เห็ด, แสงแดดอุ่น) และสั่งให้ปรับเฉพาะแมพ ส่วนหน้า UI ไว้รอบหลัง
- แนวที่ทำ: **Neo District ในหุบเขาเขียว** ใจกลางยังเป็นเมือง AI (AI Core + 4 เขต) แต่รอบนอกเป็นธรรมชาติตามภาพอ้างอิง ทุกอย่างเป็น presentation เท่านั้น ไม่แตะตำแหน่ง/จำนวน tile, mapping, การเดิน, คะแนน หรือห้อง

### สิ่งที่เปลี่ยน

- **ใหม่ `map-3d/NatureDecor.js`:**
  - ป่าสน 38 ต้น + ต้นไม้กลม 22 ต้น + พุ่มไม้ 34 + ดอกไม้ 120 + เห็ด 14 + หิน 16 + กอหญ้า 70 ใช้ `InstancedMesh` ทั้งหมด (~10 draw call) ไม่มี particle หรือ shader เพิ่ม และทุกชิ้นไม่รับ raycast
  - วาง deterministic ด้วย seeded RNG อยู่นอกเขตกระดาน `|x|,|z| < 11.2` ทั้งหมด และต้นไม้ที่อยู่ใกล้กระดานจะเตี้ยลงเพื่อไม่บังช่องขอบตอนกล้องต่ำ
  - มีบ่อน้ำพร้อมใบบัว ต้นกก และขอบทราย ขอนไม้ 3 จุด
- **`map-3d/CityFoundation.js`:** พื้นเป็นหญ้า 3 ระดับ (`#6fb84e` / `#86c95f` / `#9fd877`), ทางใต้กระดานเป็นสีครีม `#f3e9d2`, ถนนกากบาทกลางเป็นสีทราย และขอบ plaza เป็นสีครีม
- **`map-3d/BoardTile.js`:** ช่องเดินเปลี่ยนเป็น `RoundedBox` ขอบมนอ้วน (drei ที่มีใน import map อยู่แล้ว ไม่ได้ติดตั้งเพิ่ม) วางบนฐานขอบมนสีครีม ส่วน onClick/hover/selected, texture, ไอคอน และ beacon ยังเหมือนเดิม
- **`map-3d/CityProps.js`:** ใบของ `LowPolyTree` เปลี่ยนจากสีมินต์เป็นเขียวใบไม้ (ต้นสีชมพูคงเดิม)
- **`map-3d/SkyDecor.js`:** ตัดตึก skyline ฝั่งใกล้กล้องออก 6 หลัง เหลือฝั่งไกล 6 หลัง เพื่อให้ฝั่งหน้าเป็นป่า
- **`scenario-adventure/ScenarioAdventureScene.js`** (render เท่านั้น):
  - import และวาง `<NatureDecor />`
  - ฟ้า `#9fdcf2`, fog สีเขียวอ่อน 38–66, แสงแดดอุ่น 2.25 และ hemisphere ground สีเขียว
  - ขยาย shadow camera เป็น ±20 ให้ครอบป่า (shadow map ยัง 1024)

### Tests / Parity

- Focused source+dist (Bot, Board Events, Online, Neo District visual, Turn popup) + `map-3d/movement.test.mjs` + `friday-demo-hotfix01.test.mjs` + `characters/character-roster.test.mjs` ผ่าน **90/90**
- `dist/` ก่อนแก้ตรงกับ source และหลัง mirror SHA-256 ตรงกัน **15/15 ไฟล์** (รวม `dist/map-3d/NatureDecor.js` ใหม่)

### Browser QA (Browser pane, ห้อง `60968910` ดูอย่างเดียว ไม่ได้ทอยหรือส่งคำสั่ง ห้องยัง 5/6)

- 1024×768 และ 390×844: ฉากโหลดได้, `NatureDecor.js` ได้ 200, กระดานครบ 32 ช่อง, ช่องขอบมนอ่านไอคอน/ป้ายได้, beacon ยังเห็นตัวหมาก, ป่า/บ่อน้ำ/ดอกไม้ไม่บังเส้นทาง และไม่มี scroll แนวนอน
- Frame rate ใน Browser pane วัดด้วย rAF 3 วินาทีได้ **60 fps**
- หลังรีโหลดไม่มี console error ใหม่ ส่วน 404/400 ที่ค้างใน buffer ของแท็บเกิดก่อนรอบนี้ และไม่ได้มาจากไฟล์ของเกม (resource ทุกตัวของเกมได้ 200)
- **ยังไม่ได้ตรวจ:** performance บน Safari/มือถือจริง, การเดินของตัวหมากบนแมพใหม่ระหว่างเล่น และมุมกล้องต่ำสุดที่หมุนรอบด้าน (ต้นไม้ใกล้กระดานถูกจำกัดความสูงไว้แล้ว แต่ยังไม่ได้ลองทุกมุม)
- ถ้า Safari ช้า ให้ลดจำนวนใน `NatureDecor.js` (`count` ของ scatter) หรือปิด `castShadow` ของต้นไม้ก่อน ถ้าจะย้อนทั้งหมด ให้ลบ `<NatureDecor />` ออกจาก scene และคืนไฟล์ `CityFoundation`/`BoardTile`/`CityProps`/`SkyDecor` จาก checkpoint

### STOP

- หน้า UI (Ai World, ห้องรอ, Result ฯลฯ) ยังไม่ได้ปรับตามที่เจ้าของสั่ง ไม่ Deploy, ไม่แก้ SQL และไม่แตะ Gameplay

## CURRENT DEMO — Round 5: Neo District Visual & UX Upgrade (15 ตุลาคม 2026)

### สถานะ: **READY WITH LIMITATIONS**

- Automated tests และ source/dist parity ผ่าน ส่วน Browser QA ทำได้บางส่วน (ดูหัวข้อ Browser QA ด้านล่าง): ภาพกระดาน/HUD/popup และ responsive ผ่าน แต่ยังไม่ได้เห็น Event popup, Action Card, เทิร์น Bot และ Result ระหว่างเล่นจริง
- Gameplay Freeze v1 ไม่เปลี่ยน: ไม่ได้แก้ `board-events.js`, `response-engine.js`, `scenario-engine.js`, `online-rooms.mjs`, `board-data.js`, server, Auth/Supabase, SQL หรือ Deploy และไม่ได้ติดตั้ง dependency

### P0 — Popup / HUD / Card feedback (`ai-world.css`, `scenario-adventure/online-app.js` เฉพาะ markup)

- Popup เทิร์นเปิดด้วย animation ขยายตัว 0.24 วินาที backdrop จางลงและไม่ blur ทำให้ยังเห็นกระดานด้านหลัง ความสูงสูงสุด `min(82dvh,760px)` (ถ้าจอ ≤600px ใช้ `86dvh`) และเลื่อนเนื้อหายาวได้ภายใน popup โดยหัว popup ยัง sticky
- การ์ดคะแนนเพิ่ม class `is-bot`/`is-me` และป้าย `เทิร์นคุณ` / `Bot กำลังเล่น` / `กำลังเล่น` บนผู้เล่นที่ถึงตา (ค่ามาจาก `room.match.currentTurn` เดิม) เทิร์นคุณใช้กรอบสีฟ้า เทิร์นคนอื่นใช้สีส้ม ส่วน turn notice เพิ่ม `is-mine`/`is-other`
- การ์ดในมือยกขึ้นเมื่อ hover และเมื่อถูกเลือกมีเงากับวงสีฟ้า
- ผลลัพธ์ (ต่อจาก v1 ที่ใช้ `data-effect` จาก `room.result.compatibility` ซึ่งมีหลัง server resolve แล้วเท่านั้น):
  - **Effective:** โล่ + เรืองแสง + sweep
  - **Partial:** วงสัญลักษณ์ `~` + scan + แถบพลังงานชาร์จ 55%
  - **Ineffective:** วงเตือน `!` สีแดงหม่น ไม่มี glow
  - **Basic:** แสดงแบบปกติ
  - คำอธิบายด้าน AI Ethics (`result.explanation`) ยังแสดงทุกกรณี
- Event popup ชนิดอื่น (จาก v1): ไอคอนชนิด → หัวข้อ → เนื้อเรื่อง → ทางเลือก → คำอธิบาย → ยืนยัน → ผลลัพธ์ RP/Stability

### P1 — Neo District / Animation

- `ScenarioAdventureScene.js` (แก้เฉพาะแสง): hemisphere light โทนฟ้าอมเขียว, เพิ่ม rim light สีม่วงอ่อนแบบไม่มีเงา, ลดแสงหลักจาก 2.3 เป็น 2.05 และใช้โทนอุ่น shadow map ยัง 1024 เท่าเดิม
- `AICore.js`: วงแหวนเรืองแสงที่ฐาน และ halo additive รอบ orb ที่หายใจตาม orb (หยุดเมื่อเปิด reduced motion)
- `NeoDistrict.js`: แถบไฟหน้าต่างด้านข้างของ Tower และไฟ data-link 16 จุดบนถนนกากบาทกลาง (อยู่นอกฐาน AI Core และไม่ทับช่องเดิน) ใช้ `meshBasicMaterial` ที่ไม่มี shader หรือ particle เพิ่ม
- `BoardTile.js` (จาก v1): ไอคอน/ป้าย/กรอบของ tile และวงแสงกับลำแสงของช่องผู้เล่นปัจจุบัน
- **Movement ±2** (`map-3d/CharacterToken.js`): ถ้าตำแหน่งของตัวหมากเปลี่ยน 1–2 ช่องโดยไม่มี `moveRequest` (กรณีโบนัสที่ server/resolver ตั้งตำแหน่งแล้ว) ตัวหมากจะเลื่อนตามเส้นทางจริง (รองรับการ wrap ข้ามช่อง 32/1)
  - เป็นภาพเท่านั้น: **ไม่เรียก `onMoveComplete`** จึงไม่เปิด Event ที่ปลายทาง ไม่เพิ่มคะแนน และไม่มี callback ซ้ำ (Rule A คงเดิม)
  - glide ยกเลิกได้เมื่อมีตำแหน่งใหม่เข้ามา และจะจำตำแหน่งที่แสดงเฉพาะเมื่อเดินจบ จึงไม่เลื่อนล่วงหน้าตอนทอยลูกเต๋าได้ 1–2 ใน Online
  - ถ้าห่างเกิน 2 ช่อง (เช่น Replay reset) จะ snap แบบเดิม และถ้าเปิด reduced motion จะ snap เสมอ
- รองรับ `prefers-reduced-motion`: popup, chip, effect ของผลลัพธ์, hover ของการ์ด, beacon ของ tile, AI Core และ glide ของตัวหมาก

### Files Changed (Round 5 + Visual Polish v1)

- `map-3d/BoardTile.js`, `map-3d/AICore.js`, `map-3d/NeoDistrict.js`, `map-3d/CharacterToken.js`
- `scenario-adventure/event-visuals.js`, `scenario-adventure/BoardEventPanel.js`, `scenario-adventure/ScenarioAdventureScene.js` (แสงเท่านั้น), `scenario-adventure/online-app.js` (class/attribute/ป้ายแสดงผลเท่านั้น)
- `ai-world.css`, `scenario-adventure.css`, `online-room.html` (cache query)
- ก่อน copy ได้ตรวจแล้วว่า `dist/` เดิมตรงกับ source ก่อนแก้ทุกไฟล์ หลัง mirror แล้ว SHA-256 ตรงกัน **11/11 คู่**

### Automated Tests

- `node --test bot-decision-policy… board-events… scenario-online… neo-district-visual… turn-popup…` (source + dist) + `map-3d/movement.test.mjs` ผ่าน **75/75**
- `node --check` ผ่านทุก JS ที่แก้ ส่วน path ของ glide ตรวจด้วยสคริปต์: `5→7 = 6>7`, `31→1 = 0>1`, `1→31 = 0>31`, `5→9 = snap`, `20→0 = snap`
- ใช้ Node 24 จาก Codex runtime (`~/.cache/codex-runtimes/.../node/bin/node`) เพราะเครื่องนี้ไม่มี `node` ใน PATH

### Browser QA (15 ต.ค. — Browser pane ของแอป Claude, Login บัญชีเดิม)

- **วิธีทดสอบ:** ใน pane ยังไม่มี Saved Deck (เก็บแยกตามเบราว์เซอร์) จึงสร้างห้องใหม่ไม่ได้ เลยเปิดห้องที่เจ้าของกำลังเล่นใน Safari (`60968910`, ผู้เล่น + Bot, เทิร์น 5/6) แบบ**ดูอย่างเดียว** ไม่ทอยลูกเต๋า ไม่ส่งคำสั่งใดๆ ไปที่ห้อง (กดเฉพาะปิด/เปิด popup ซึ่งเป็น state ในเครื่อง) หลังตรวจเสร็จเทิร์นยังเป็น 5/6 เท่าเดิม
- **โหลดไฟล์:** ไฟล์ที่แก้ทุกไฟล์โหลดได้ 200 รวมถึง CSS/JS ที่ใช้ `?v=visual-polish-20261015` ฉาก WebGL render ได้
- **Console:** ไม่มี JS error มีแค่ 404 สองรายการที่ไม่ใช่ไฟล์ของเกม (resource ของเกมทุกตัวได้ 200 คาดว่าเป็น favicon)
- **1280×720:**
  - กระดาน 32 ช่องแสดงครบ แต่ละชนิดมีสีกับไอคอนและป้ายชื่อของตัวเอง
  - ช่องปัจจุบันมีวงแสงทองกับลำแสง ตัวหมากยังเห็นชัด
  - AI Core มี halo และวงแหวนทองชัดเจน
  - การ์ดคะแนนแสดงป้าย `เทิร์นคุณ` และกรอบสีฟ้า avatar ของ Bot มีเส้นประ turn notice มี class `is-mine`
  - Popup เทิร์น backdrop จาง ยังเห็นกระดาน ไม่มี scroll แนวนอน
- **1024×768:** ไม่มี scroll แนวนอน อ่านป้ายบน tile ได้ ลำแสงไม่บังตัวหมากหรือลูกเต๋า HUD อยู่ครบ
- **390×844:** ไม่มี scroll แนวนอน การ์ดคะแนน 2 ใบกับ turn notice อ่านได้ popup พอดีจอ ปุ่ม "เปิดหน้าต่างเทิร์นของฉัน" อยู่ในจอ
  - Limitation เดิมที่ไม่ได้เกิดจากรอบนี้: กล้องบนมือถือซูมเข้ากลางเมือง ช่องที่ตัวหมากของผู้เล่นยืนอยู่อาจหลุดนอกกรอบ (ผู้เล่นลากหมุนหรือซูมเองได้) ไม่ได้แก้ เพราะต้องแตะการตั้งค่ากล้องใน scene

### ยังไม่ได้ตรวจใน Browser (Limitation)

- Event popup ระหว่างตอบ, ผลของ Action Card (Effective/Partial/Ineffective/Basic), glide ±2 ของ MOVEMENT, เทิร์น Bot สด, Result/Replay และ performance บน Safari เพราะต้องเล่นต่อในห้องของเจ้าของ ซึ่งไม่ได้แตะ
- เจ้าของโปรเจกต์กำลังทดสอบส่วนนี้เองใน Safari ถ้าพบ regression ให้ย้อนเฉพาะไฟล์ที่แก้จาก `~/Documents/Ai-District-checkpoints/pre-visual-polish-20261015.tgz` (glide อยู่ใน `CharacterToken.js` ไฟล์เดียว)

### STOP

- ไม่ Deploy, ไม่แก้ SQL, ไม่เพิ่มเสียง และไม่พัฒนา Gameplay ต่อ

## CURRENT DEMO — Claude Visual Polish v1 หลัง Gameplay Freeze (15 ตุลาคม 2026)

### ขอบเขต

- ทำตาม `AI_District_Claude_Visual_Handoff_Freeze_Addendum.txt` และ `GAMEPLAY_FREEZE_HANDOFF_v1.md` เปลี่ยนเฉพาะภาพ ความอ่านง่าย และ micro-animation **ไม่ได้แก้** คะแนน, 32 tiles/`TILE_POSITIONS`, mapping ใน `board-events.js`, Rule A, Bot policy, resolver, การ์ด/inventory, room/Auth/Supabase, result/replay, SQL หรือ Deploy
- ก่อนแก้ได้เก็บ checkpoint ทั้งโปรเจกต์ไว้ที่ `~/Documents/Ai-District-checkpoints/pre-visual-polish-20261015.tgz` (ไม่มี commit/reset/clean)

### สิ่งที่เปลี่ยน (presentation only)

- **Tile 5 ชนิด** (`map-3d/BoardTile.js`, `scenario-adventure/event-visuals.js`): texture มีกรอบสีเข้มกับขอบด้านใน, ไอคอนมีเงาให้อ่านออกบนสีส้ม/เขียว และมีป้าย `ACTION/MOVE/SUPPORT/RISK/DECISION` ใต้ไอคอน ชนิดของ tile ยังมาจาก `eventTypeForTile()` เท่านั้น ส่วน `event-visuals.js` เพิ่มแค่ `iconPath` (SVG 24×24) ตาม key เดิม
- **ไฮไลต์ช่องของผู้เล่นปัจจุบัน**: วงแสงสีทองอยู่บนพื้นนอกขอบ tile (ไม่ทับช่องข้างเคียง) และลำแสง additive จางๆ ที่ไม่บังตัวหมากหรือลูกเต๋า ทั้งสองไม่รับ raycast และหยุด animate เมื่อเปิด `prefers-reduced-motion`
- **Event popup** (`scenario-adventure/BoardEventPanel.js`): ลำดับเป็น badge+ไอคอน → หัวข้อ → เนื้อเรื่อง → "เลือกทางตอบสนอง" → คำอธิบายของตัวเลือก → ปุ่มยืนยัน/สถานะรอ → "ผลลัพธ์" แสดง RP/Stability เป็น pill จาก `result` ที่ resolve แล้ว (ไม่คำนวณใหม่) ถ้า Stability ลดจะแสดงโทนเตือน ส่วน state, intent และ callback ยังเหมือนเดิม
- **ผลการ์ด ACTION** (`scenario-adventure/online-app.js`): เพิ่มเฉพาะ `data-effect=${room.result.compatibility}`, `role="status"` และ span ตกแต่งที่มี `aria-hidden` ใน CSS `EFFECTIVE` เป็นเขียวเรืองแสงพร้อมโล่และ sweep ครั้งเดียว, `PARTIAL` เป็นแถบ scan สีเหลืองอำพัน, `INEFFECTIVE` เป็นแดงหม่นไม่มี glow (ก่อนหน้านี้ทุกผลเป็นสีเขียวแบบ "สำเร็จ"), `BASIC` เป็นสีฟ้าเรียบ
- **CSS** (`ai-world.css`, `scenario-adventure.css`): เพิ่มสไตล์ของข้อข้างต้น, `:focus-visible` ให้ปุ่ม Event/การ์ด, ปรับขนาดสำหรับ ≤600px และปิด animation เมื่อ reduced motion
- `online-room.html`: bump cache query เป็น `?v=visual-polish-20261015`

### Movement bonus animation — ไม่ได้ทำ (ตั้งใจ)

- ใน Online ตำแหน่ง bonus ±2 มาจาก server snapshot โดยตรง ถ้าจะทำ animation ต้องเพิ่ม state/effect ใน `online-app.js` หรือ token ซึ่งเสี่ยงให้ภาพกับตำแหน่ง authoritative ไม่ตรงกัน ตามข้อกำหนดจึงข้ามไปและบันทึกเป็นข้อจำกัด ตัวหมากยังกระโดดไปช่องปลายทางทันทีเหมือนเดิม (Rule A ไม่เปลี่ยน)

### Tests / Parity

- `node --test bot-decision-policy… board-events… scenario-online… neo-district-visual… turn-popup…` (source + dist) ผ่าน **70/70**
- `node --check` ผ่านทุก JS ที่แก้; ไฟล์ dist ก่อนแก้ตรงกับ source ทุกไฟล์ และหลัง mirror แล้ว SHA-256 ตรงกัน **7/7 คู่**: `map-3d/BoardTile.js`, `scenario-adventure/event-visuals.js`, `scenario-adventure/BoardEventPanel.js`, `scenario-adventure/online-app.js`, `ai-world.css`, `scenario-adventure.css`, `online-room.html`
- เครื่องนี้ไม่มี `node` ใน PATH จึงรันด้วย Node 24 ของ Codex runtime ที่ `~/.cache/codex-runtimes/.../node/bin/node` (ไม่ได้ติดตั้งอะไรเพิ่ม)

### ข้อจำกัด — ยังไม่ได้ตรวจใน Browser

- **ยังไม่ได้ทำ Browser smoke**: เปิด static 4174 กับ room server 4180 ใน Browser pane ได้ แต่ทุกหน้าต้อง Login และแท็บนั้นไม่มี session เจ้าของโปรเจกต์จึงสั่งให้ข้ามไปก่อน ดังนั้นยังไม่ได้เห็นด้วยตา: texture/ไฮไลต์ tile ใน WebGL, popup Event, effect ของการ์ด, เทิร์น Bot, Result และ responsive 1280×720 / 1024×768 / 390×844
- รอบนี้ไม่ได้อ้างว่า gameplay ทำงานเกินกว่าที่ automated tests ยืนยัน
- ไฟล์ `.claude/launch.json` (config ของ preview server) ถูกเพิ่มเข้ามาในโปรเจกต์เพื่อใช้กับเครื่องมือ Browser เท่านั้น ไม่ใช่ runtime

### Next Step / STOP

- Login แล้วรัน smoke: สร้างห้อง Bot → ทอย → ACTION (ดู Effective/Partial/Ineffective) → Event ชนิดอื่น → เทิร์น Bot → Result จากนั้นตรวจ responsive ทั้ง 3 ขนาดและ reduced motion ถ้าลำแสงบังหมากที่บางมุมกล้อง ให้ลด opacity/รัศมีใน `ActiveTileBeacon`
- หากพบปัญหา ให้ย้อนเฉพาะไฟล์ที่ระบุข้างบนจาก checkpoint archive **STOP:** ไม่เริ่มงาน visual เพิ่ม, SQL หรือ Deploy โดยอัตโนมัติ

## CURRENT DEMO — Round 4B: Final Gameplay Acceptance + Gameplay Freeze v1 (15 ตุลาคม 2026)

### Freeze Status

- **CONFIRMED**: เล่นแมตช์ Online จริงผ่าน Browser ครบ 6 เทิร์นต่อฝ่ายจนถึง Result และกด Replay สำเร็จ
- สร้างเอกสารส่งต่อ [GAMEPLAY_FREEZE_HANDOFF_v1.md](GAMEPLAY_FREEZE_HANDOFF_v1.md) ระบุ Frozen Contract, ตารางคะแนน, Movement Rule A, Bot boundaries, ไฟล์ที่ห้ามแตะ, พื้นที่ Visual ที่แก้ได้, QA matrix, limitations และวิธี checkpoint/restore แบบไม่ทำลายงาน
- รอบนี้เป็น Acceptance + Documentation เท่านั้น: **ไม่มีการแก้ gameplay, balance, source runtime, Supabase, SQL, Auth หรือ Deploy**

### Browser Acceptance

- Preflight ใช้ localhost frontend `127.0.0.1:4174`, room server `127.0.0.1:4180`, session ที่ Login อยู่แล้ว และ Saved Deck 5 ใบของ Alexander
- ห้องแยก `Round 4B QA 20261015` รหัส `86167681`: ผู้เล่น 1 คน + Bot 1 ตัว, 2 ที่นั่ง
- จบครบ `12/12 Events` และ `6/6` เทิร์นต่อฝ่ายโดยไม่ค้าง; Bot ชนะด้วย `6 RP / 4 Stability`, ผู้เล่นจบที่ `5 RP / 6 Stability`
- Event ที่เกิดจริง: `ACTION 7 / MOVEMENT 1 / SUPPORT 0 / RISK 2 / DECISION 2`, เนื้อหาไม่ซ้ำ 7 รายการ
- MOVEMENT ที่เห็นจริงเลือกถอย `-2` ได้ `+1 RP` และไม่เปิด Event ช่องปลายทาง ยืนยัน Rule A ใน Browser
- Replay reset ผ่าน: ทั้งสองฝ่ายกลับเป็น `0 RP / 10 Stability / 0/6` และหน้าต่างทอยลูกเต๋าเทิร์นแรกเปิดใช้งาน
- Console ของหน้า localhost ไม่มี error/warning; ข้อความ Statsig/Cloudflare ที่เครื่องมือ Browser แสดงเป็น telemetry ของ Codex Browser ไม่ใช่ log จากแอป localhost
- SUPPORT ไม่ได้สุ่มเจอตามธรรมชาติในแมตช์เดียวนี้; behavior ยืนยันด้วย automated tests เท่านั้น

### Tests / Parity / Files

- Focused source + dist acceptance ผ่าน **70/70**: Bot policy, Board Events, 2/3/4-seat Online, Replay/Surrender, Neo District mapping และ Turn Popup
- SHA-256 ของ runtime source/dist ที่ตรวจตรงกัน **11/11 คู่**: board events, response/scenario engines, online rooms/apps, shared scene, board data/tile/foundation และ Neo District
- เพิ่ม `GAMEPLAY_FREEZE_HANDOFF_v1.md` และ `dist/GAMEPLAY_FREEZE_HANDOFF_v1.md`; อัปเดต root/dist README เท่านั้น
- Workspace มี dirty/untracked work จากรอบก่อนจำนวนมากและถูกเก็บไว้ทั้งหมด; ไม่มี reset/clean/restore/commit/deploy

### Freeze Gate / Next Step

- Visual handoff ทำต่อได้เฉพาะขอบเขตที่เอกสาร Freeze อนุญาต และต้องรักษา source/dist parity
- หากจะแก้คะแนน, 32-tile mapping, Movement, Bot policy, card eligibility/ownership, room/state/result/replay ต้องได้รับอนุมัติและเปิด gameplay acceptance version ใหม่
- **STOP:** ไม่เริ่ม Claude visual work, SQL, Supabase Production, Audio, Chapter ใหม่ หรือ Deploy โดยอัตโนมัติ

## CURRENT DEMO — Round 4A: Context-aware Bot Decision Policy (15 ตุลาคม 2026)

### Implemented

- ปรับเฉพาะ `chooseEventIntent()` ที่ Local Practice และ Online Rooms ใช้ร่วมกัน ให้รับ score/turn context ของ Bot โดยไม่เปลี่ยน resolver, คะแนน, Event catalog หรือ UI
- ACTION เปรียบเทียบ Basic กับการ์ดที่อยู่ในมือและผ่าน `allowedIds`/compatibility จริง: ใช้ Effective เมื่อคุ้มกว่า และไม่ทิ้ง Partial/Ineffective เมื่อ Basic ให้ผลเท่ากันหรือดีกว่า
- RISK ใช้การ์ดเฉพาะ Effective ที่เป็น instance ของ Bot จริง หลังหัก opportunity cost; มิฉะนั้นเลือก Accept
- SUPPORT ฟื้น Stability เมื่อ `<=7`; ที่ `8–9` ฟื้นเมื่อกำลังนำ RP หรือเหลือไม่เกิน 2 เทิร์น; ที่ cap 10 เลือก RP เพื่อไม่เสียการฟื้นฟรี
- DECISION เลือกทางปลอดภัยเมื่อ Stability `<=3` หรือช่วงท้ายที่กำลังนำ; กรณีอื่นเลือก RP. MOVEMENT ยังใช้ผลตอบแทน runtime ปัจจุบันและ Rule A เดิม โดยไม่อ่านลูกเต๋า/Event ในอนาคต
- tie-break ใช้ utility → ไม่เสียการ์ด → key/instance ID ตามลำดับ จึง deterministic. Online ยังคงเป็น server-authoritative และทุก intent ผ่าน validation เดิม
- **ไม่เปลี่ยน** 32 tiles, ค่า RP/Stability, Movement rewards/Rule A, winner, 6 เทิร์น, card eligibility/ownership, Room/Auth/Supabase, Story/Quiz/Reward, Neo District หรือ Deploy

### Files Changed

- Runtime: `scenario-adventure/board-events.js`, `scenario-adventure/app.js`, `scenario-adventure/online-rooms.mjs`
- Tests: ใหม่ `bot-decision-policy.test.mjs`
- Development-only simulation: `gameplay-balance-sim.mjs` เพิ่ม baseline `BOT_CURRENT` แบบ snapshot และ `BOT_REFINED`; ไม่ถูก import โดย runtime และไม่ mirror เข้า `dist/`
- คู่ runtime/test ข้างต้น mirror เข้า `dist/` แล้ว; SHA-256 ตรงกัน 4/4 คู่. README root และ `dist/README.md` ซิงก์ตรงกัน

### Deterministic Before / After Simulation

- เปรียบเทียบ `BOT_CURRENT` กับ `BOT_REFINED` ด้วย event rules เดิม, loadout เดิม, seed เดียวกัน จำนวน 1,000 แมตช์ต่อ policy ต่อขนาด 2/3/4 ฝ่าย รวม **6,000 แมตช์**
- 2 ฝ่าย: mean RP `7.389 → 7.613`, mean Stability `7.673 → 7.330`, card-use rate `31.96% → 11.10%`, Partial-card rate `20.38% → 0%`, draw `8.8% → 2.8%`, seat win share `51.2/48.8 → 47.0/53.0%`
- 3 ฝ่าย: mean RP `7.506 → 7.761`, mean Stability `7.708 → 7.358`, card-use `32.57% → 11.92%`, Partial `20.02% → 0%`, draw `11.2% → 4.2%`, seat win share `33.43/29.58/36.98 → 28.58/33.48/37.93%`
- 4 ฝ่าย: mean RP `7.701 → 8.014`, mean Stability `7.819 → 7.412`, card-use `32.53% → 13.74%`, Partial `18.36% → 0%`, draw `13.8% → 6.4%`, seat win share `23.78/26.19/24.56/25.48 → 24.28/24.93/26.17/24.62%`
- Ineffective-card use เป็น `0%` ทั้งก่อนและหลังใน sample นี้. Refined Bot ฟื้น SUPPORT และเลือก DECISION แบบบริบทจริงแทน fixed choice; ไม่ได้แก้ reward ใด ๆ

### Tests / Browser QA

- Focused source + dist: `node --test bot-decision-policy.test.mjs dist/bot-decision-policy.test.mjs board-events.test.mjs dist/board-events.test.mjs scenario-online.test.mjs dist/scenario-online.test.mjs` ผ่าน **56/56**
- ครอบคลุม legal hand/ownership, low/high Stability, RP/remaining-turn tradeoff, Basic vs Partial/Ineffective/Effective, RISK compatibility, no future knowledge, deterministic tie-break, Local/Online shared helper, duplicate consumption, score/turn guard, Online 2/3/4 ที่นั่งกับ Bot ครบ 6 เทิร์นต่อฝ่าย และ Replay reset
- Primary regression `node --test`: ผ่าน **400/402** ใน sandbox; 2 HTTP integration cases ล้มเหลวเฉพาะ `connect EACCES` จาก sandbox. รันสองเคสเดิมนอก sandboxแล้วผ่าน **2/2** จึงไม่พบ regression
- Browser smoke จริง: Local Practice เลือก Alexander/Deck เดิม → สร้างห้อง Bot → ทอยและตอบ ACTION → Bot ทอย/ตอบ/จบเทิร์นอัตโนมัติ → กลับมาที่ผู้เล่นสำเร็จ ไม่มี state ค้าง

### Limitations / Stop Gate

- Browser QA รอบนี้ตรวจหนึ่ง cycle ผู้เล่น+Bot ไม่ได้เล่นจนจบ 12 Events; full-match/replay ตรวจด้วย automated engine/server tests
- Simulation เป็น homogeneous policy comparison เพื่อวัด policy ก่อน/หลัง ไม่ใช่การรับรอง balance สุดท้าย และยังไม่ควรใช้เป็นเหตุแก้คะแนน
- พร้อมเข้า Gameplay Freeze / Visual handoff ในขอบเขต Bot policy นี้แล้ว. **STOP:** ห้ามเริ่ม Movement Balance, scoring change, UI polish, SQL หรือ Deploy โดยอัตโนมัติ

## CURRENT AUDIT — Gameplay Balance Review / Design Freeze Gate (15 ตุลาคม 2026)

**สถานะ: วิเคราะห์และเสนอ Contract เท่านั้น — NOT IMPLEMENTED. ไม่มีการแก้ scoring, winner, tile mapping, deck/ownership, Bot strategy หรือ runtime gameplay**

- อ่าน source จริงเฉพาะ `board-events.js`, `response-engine.js`, `online-rooms.mjs`, Local bot integration, scenario/card context และ board path ตามขอบเขต
- เพิ่ม `gameplay-balance-sim.mjs` แบบ development-only ซึ่ง import engine จริงและใช้ deterministic seed; ไม่ถูก import โดยหน้าเว็บและไม่ต้อง mirror เข้า `dist/`
- รัน 27,000 แมตช์ / 648,000 resolved events: current และ Movement candidate, 1,000 แมตช์ต่อ policy ต่อขนาด 2/3/4 ฝ่าย รวม head-to-head ที่หมุนตำแหน่งผู้เล่น
- Bot ปัจจุบันพบ ACTION เฉลี่ยประมาณ `2.03` ครั้งต่อฝ่ายต่อแมตช์; ช่วงจริง `0–6`. Dice-to-RP correlation ต่ำประมาณ `0.08`, ไม่พบ seat-order bias ระดับ demo-blocker
- Stability ตัดสิน top-RP tie ใน mixed-policy match `9.2% / 13.6% / 19.1%` สำหรับ 2/3/4 ฝ่าย จึงยังมีผลแต่เป็น secondary stat
- P1: MOVEMENT ปัจจุบันมีทางเลือกถูกครอบงำ (`ถอย -2` ได้ `+1 RP` โดยไม่มีต้นทุน); Bot เลือก Non-ACTION แบบตายตัวและใช้ Partial card ทั้งที่ผลเท่า Basic/Accept
- Candidate `เดินหน้า +1RP/-1 Stability` กับ `ถอย 0RP/+1 Stability` **ยังไม่แนะนำให้ใช้เดี่ยว ๆ**: reward-policy win share เพิ่มจาก `69.8→80.3%`, `63.9→76.3%`, `46.9→59.9%` ในเกม 2/3/4 ฝ่าย
- รายงานเต็มและ Gameplay Balance Contract v1.0 PROPOSAL: `GAMEPLAY_BALANCE_CONTRACT_v1_PROPOSAL.md`
- Changed files รอบ audit: `gameplay-balance-sim.mjs`, `GAMEPLAY_BALANCE_CONTRACT_v1_PROPOSAL.md`, root `README.md` เท่านั้น. ไม่มี source runtime/dist/SQL/Deploy เปลี่ยน
- Validation: ตัวจำลองรันครบ 1,000 samples ต่อชุดและรันซ้ำได้ผล deterministic เดิม; รอบนี้ไม่รัน full regression หรือ Browser match เพราะไม่มี shipped gameplay change
- **STOP:** รอเจ้าของอนุมัติว่าจะทำเฉพาะ Bot policy, ทดลอง Movement rule ใหม่พร้อมเงื่อนไขเพิ่ม หรือคงค่าปัจจุบัน ก่อนแก้ production

## CURRENT DEMO — Round 3B: Neo District Visual Upgrade (15 ตุลาคม 2026)

### Implemented

- เปลี่ยนฉากกระดานเป็นเมือง `Neo District` บนฐานพื้นดินแบบ Low Poly โดยใช้ primitives เดิมและโมดูลใหม่ที่ประหยัด polygon
- เพิ่ม AI Core กลางเมืองและเขตภาพประกอบ 4 เขต: Education Hub, Data Core, Transit Network และ Civic Center; เขตเหล่านี้เป็นภาพประกอบเท่านั้น ไม่มีผลต่อคะแนนหรือกติกา
- ช่องเดินทั้ง 32 ช่องดึงประเภทจาก `scenario-adventure/board-events.js` ซึ่งเป็น runtime mapping จริง: ACTION 12 / MOVEMENT 6 / SUPPORT 5 / RISK 5 / DECISION 4
- เพิ่มสีและไอคอนที่แยกความหมายได้โดยไม่พึ่งสีอย่างเดียว: ACTION น้ำเงิน/การ์ด, MOVEMENT เขียว/ลูกศร, SUPPORT ส้ม/บวก, RISK แดง/เตือน, DECISION ม่วง/ทางแยก
- เลขช่องสร้างจาก `tile.index + 1` ระหว่างรัน ไม่ฝังเลขไว้ใน texture สำเร็จรูป; เพิ่ม current/hover/selected highlight โดยไม่บัง token
- Popup Event ที่ไม่ใช่ ACTION แสดงประเภท Event จาก state จริง; Local ACTION แสดง badge ประเภท Event เพิ่มเติม
- ไม่เปลี่ยน `TILE_POSITIONS`, `BOARD_TILES`, Dice, Token, Movement callback, Rule A, RP/Stability, Turn, Bot, Result/Replay, Room/Auth/Supabase หรือระบบการเรียนรู้

### Files Changed

- ใหม่: `map-3d/NeoDistrict.js`, `scenario-adventure/event-visuals.js`, `neo-district-visual.test.mjs`
- แก้: `map-3d/CityFoundation.js`, `map-3d/BoardTile.js`, `scenario-adventure/ScenarioAdventureScene.js`, `scenario-adventure/BoardEventPanel.js`, `scenario-adventure/app.js`, `scenario-adventure/online-app.js`, `scenario-adventure.css`, `map-3d-entry.js`, `map-3d.html`, `online-room.html`
- ไฟล์ runtime/test ข้างต้นซิงก์คู่ `dist/` แล้วและตรวจ SHA-256 ตรงกัน 13/13 คู่

### Tests / Browser QA

- Focused source+dist tests: `node --test neo-district-visual.test.mjs dist/neo-district-visual.test.mjs board-events.test.mjs dist/board-events.test.mjs map-3d/movement.test.mjs dist/map-3d/movement.test.mjs scenario-online.test.mjs dist/scenario-online.test.mjs turn-popup.test.mjs dist/turn-popup.test.mjs` ผ่าน **49/49**
- Primary regression: `node --test` ผ่าน **387/389** ภายใน sandbox; 2 เคส HTTP ล้มเหลวเฉพาะเพราะ sandbox ปฏิเสธพอร์ตชั่วคราว (`EACCES`). รันสองเคสเดิมนอก sandbox แล้วผ่าน **2/2** จึงไม่พบ regression ของโค้ด
- Syntax checks ผ่านสำหรับ Visual Mapping, NeoDistrict, BoardTile, Shared Scene, Event Panel และ Local/Online app
- Browser QA จริง: เปิดบริการ `4174/4180`, Login → Ai World → สร้างห้อง 2 ที่นั่ง → เพิ่ม Bot → พร้อม → เริ่มเกม → ทอยเต๋า → เดิน → เปิด ACTION Event ได้สำเร็จ
- ตรวจด้วยภาพจริงแล้ว: กระดาน 32 ช่องแสดง 5 สี/ไอคอนชัด, token และลูกเต๋ายังเห็น, landmark ไม่บังเส้นทาง, HUD/Popup ใช้งานได้ และ Bot เดิน/ตอบ/ส่งเทิร์นต่อได้; Console ไม่มี error/warning ใหม่
- Mobile Browser QA ที่ viewport 390×844 ผ่าน: ไม่มี horizontal overflow (`scrollWidth === innerWidth`), HUD/ตัวหมาก/ช่องสำคัญยังเห็น และปุ่มเปิดเทิร์นไม่หลุดจอ; คืน viewport เป็นค่าเดิมแล้ว

### Limitations / Next Step

- รอบนี้ยังไม่ได้เล่น Browser QA จนครบ 6 เทิร์นต่อฝ่าย; engine regression ใช้ automated tests ครอบคลุมกติกาเดิม
- ป้ายชื่อเขตเป็น CanvasTexture ภาษาอังกฤษเพื่อความคมและประหยัด asset; ยังไม่มี GLB หรือ texture ภายนอก
- ขั้นถัดไปที่แนะนำ: Browser QA viewport tablet และเล่นครบหนึ่งแมตช์เท่านั้น; ห้ามเริ่ม Chapter01, Audio, SQL, Deploy หรือเปลี่ยน gameplay โดยอัตโนมัติ

## CURRENT DEMO — Host Crown / Player Menu / Ownership Transfer (15 ตุลาคม 2026)

**ส่งต่อเครื่องอื่น: อ่านหัวข้อนี้ก่อน แล้วไล่อ่าน CURRENT DEMO ด้านล่างตามลำดับ. สถานะล่าสุดใช้ Scenario Adventure + Action Cards; ไม่มี Legacy Battle และไม่มี Production Deploy**

### ทำแล้วในรอบล่าสุด

- หน้ารอเล่น: หัวห้องมีมงกุฎทอง ♛ หลังชื่อตัวละคร อ้างอิง `members[].isOwner` จาก Server ไม่ผูกหัวห้องกับที่นั่งแรกอีกต่อไป
- กดรูป/ชื่อผู้เล่นเปิดเมนู. หัวห้องกดผู้เล่นอื่นเห็น ดูโปรไฟล์ / ให้หัวห้อง / เตะออกจากห้อง. ผู้เล่นทั่วไปหรือกดตัวเองเห็นเฉพาะดูโปรไฟล์. Bot มีเมนูเหมือนกันแต่ปิดปุ่มมอบหัวห้อง
- มอบหัวห้องมีหน้ายืนยัน; คำสั่ง `transfer-owner` ตรวจสมาชิก/เจ้าของ/phase/revision/เป้าหมายบน Server. อนุญาตเฉพาะผู้เล่นจริงคนอื่นในห้องระหว่าง WAITING หรือ FINISHED. มอบแล้วสิทธิ์ปรับที่นั่ง/เพิ่ม Bot/เตะ/เริ่มเกมย้ายไปคนใหม่ทันที คนเดิมหมดสิทธิ์จัดห้อง; ล้างพร้อมของผู้เล่นจริงทั้งหมด; ไม่เปลี่ยนลำดับที่นั่ง/actor roles
- เตะผู้เล่นใช้หน้ารอยืนยันเดิม; ลบ Bot ใช้ remove-bot เดิม. ปิดคำสั่งจัดห้องระหว่างกำลังเล่นตามกติกาเดิม
- ดูโปรไฟล์รอบนี้แสดงรูป/ชื่อตัวละคร ประเภทผู้เล่น สถานะพร้อม และหัวห้องภายในห้องเท่านั้น; **ยังไม่ใช่หน้าโปรไฟล์บัญชีหรือสถิติจาก Supabase**

### รวม UX ที่ทำไว้ก่อนหน้านี้

- Ai Word: ตัวละคร/Deck ที่บันทึกไว้แยกจากเมนูเล่น; แสดงการ์ดเต็มใบ; รายชื่อห้องเต็มกรอบแดง, ห้องว่างกรอบเขียว, กำลังเล่นขาวดำพร้อมป้ายรอจบเกม; สมาชิกเดิม reconnect ได้
- กรอบเกมเต็มพื้นที่ ผู้เล่นอยู่สี่มุม; ทอย/ตอบผ่าน popup เทิร์นตัวเอง; ปิด popup คนอื่นได้; ตั้งค่าด้วยเฟืองและยอมแพ้แบบ Server ตัดสิน. แจ้งเตือนอีกฝ่ายเป็นป้ายห้อยขนาดย่อมภายในแมพ ไม่ทำให้แมพหด/ขยายตามข้อความ
- Gameplay เดิมยังใช้ 6 เทิร์นต่อฝ่าย, RP/Stability, Result/Replay, mixed Board Events และ Dice/Movement/Token เดิม. รายละเอียดการพัฒนาก่อนหน้ารวม Chapter01 อยู่ในประวัติด้านล่าง ไม่ใช่งานเพิ่มของรอบนี้

### Files / Validation / Run status

- Changed files รอบหัวห้อง: `scenario-adventure/online-rooms.mjs`, `scenario-adventure/online-app.js`, `scenario-adventure/online-client.js`, `ai-world.css`, `online-room.html`, `host-transfer.test.mjs` และคู่ `dist/` ครบ; Root README นี้. Cache หน้าห้อง `host-menu-20261015`
- Syntax: online-app.js / online-rooms.mjs / online-client.js ผ่าน. Focused + related regression `node --test host-transfer.test.mjs ai-word-ux.test.mjs ai-world.test.mjs turn-popup.test.mjs`: **18/18 ผ่าน** รวมมอบสิทธิ์จริง/ถอนสิทธิ์เดิม/ป้องกัน guest+outsider+Bot+ตัวเอง+stale/ห้ามมอบระหว่างแข่ง/พร้อมใหม่/เริ่มโดยหัวใหม่/เตะ/2–4คนเล่นจบ+Replay. ไม่รันชุดใหญ่ทั้งโปรเจกต์ซ้ำ
- Browser QA จริง: สร้าง Host Menu QA 46731360 → เห็นมงกุฎทอง → เพิ่ม Bot → กดเมนูเห็น 3 รายการและปุ่มให้หัวห้อง Bot ถูกปิด → เปิดโปรไฟล์ได้ → ออกจากห้องปิด QA แล้ว. **ยังไม่ได้ทดสอบมอบหัวห้องด้วยบัญชีคนจริง 2 บัญชีใน Browser**; ตรวจผ่าน Server tests แล้ว
- โหลดเซิร์ฟเวอร์เดโม 4180 ใหม่เพื่อเปิดคำสั่งมอบหัวห้องแล้ว. ห้องเก่าถูกล้างเพราะเก็บใน memory; static frontend 4174 ใช้เดิม. หากย้ายเครื่องให้เปิดทั้งสองบริการตามคู่มือเดิม; ห้ามคาดหวังย้ายห้องที่กำลังเล่นข้ามเครื่องได้
- Remaining: โปรไฟล์บัญชีเต็มและ Browser QA สองบัญชียังเหลือ; FINISHED ยังไม่รับสมาชิกใหม่ตาม gate เดิม; ไม่มีแก้ Supabase/Auth/Story/Quiz/Rewards/Gameplay Core หรือ Deploy

## CURRENT DEMO — Room List Availability (15 ตุลาคม 2026)

- รายชื่อห้อง Ai Word: PLAYING เป็นขาวดำพร้อม ◷ กำลังเล่น/รอจบเกม (สำคัญกว่าสถานะเต็ม); ห้องเต็มกรอบแดงพร้อม ⊘; WAITING ที่มีที่ว่างกรอบเขียวพร้อม ✓ หรือ 🔒 เมื่อมีรหัสผ่าน. ปุ่มผู้เล่นใหม่ปิดตาม gate เดิมของ Server; สมาชิกเดิมกลับเข้าห้องได้เพื่อ reconnect
- FINISHED ยังคงรับเฉพาะสมาชิกเดิมตามระบบเดิม: ถ้าเต็มเป็นกรอบแดง; ถ้ามีที่ว่างใช้ป้ายรอเจ้าของจัดห้อง ไม่แสดงว่าเข้าร่วมได้ทั้งที่ Server ปฏิเสธ. รอบนี้ไม่ได้เพิ่มการรับผู้เล่นใหม่หลังจบเกม
- Changed: `ai-world.js`, `ai-world.css`, `ai-world.html`, `scenario-adventure/room-list-state.mjs`, `room-list-state.test.mjs` และคู่ dist. Root README. Cache `room-status-20261015`
- Tests: syntax ผ่าน; `node --test room-list-state.test.mjs ai-world.test.mjs` **13/13 ผ่าน** รวมสี/ป้าย/สิทธิ์เข้า, เล่น 2–4 คนจนจบและ replay. Source/dist 5 คู่ตรงกัน
- Browser QA: โหลด Ai Word จริงและรีเฟรชแล้ว ห้องจริง 2 ห้องเป็น FINISHED เต็ม แสดงกรอบแดง/ห้องเต็ม/ปุ่มกลับสำหรับสมาชิกเดิมถูกต้อง. สถานะ PLAYING และว่างตรวจด้วย focused tests; ไม่สร้างหรือเริ่มแมตช์ของผู้ใช้เพื่อจับภาพ. ไม่แก้ Server/Supabase หรือ Deploy

## CURRENT DEMO — Hanging Turn Notice (15 ตุลาคม 2026)

- ปรับเพิ่มเติม: ลดความกว้างสูงสุดป้าย 760 → 640px, ลด padding/ช่องไฟ/ตัวอักษร และจำกัดความสูง desktop 160px / mobile 140px เพื่อบังแมพน้อยลง. แก้เฉพาะ `ai-world.css`, cache version ใน `online-room.html` และคู่ dist; ตรวจ source/dist ตรงกัน. ไม่เปลี่ยน gameplay. ผล Browser QA ด้านล่างเป็นของก่อนลดขนาดครั้งนี้.

- ย้ายแจ้งเตือนเทิร์น/คำถาม/คำตอบของอีกฝ่ายเข้าเป็นป้ายห้อยด้านบนภายในกรอบเกมออนไลน์ โดย overlay แยกจากการคำนวณขนาดแมพ; ข้อความยาวและการกางรายละเอียดไม่ดันกรอบเกม
- Desktop ป้ายอยู่กลางระหว่างผู้เล่นด้านบน; จอแคบเลื่อนป้ายลงใต้แถบผู้เล่น และจำกัดความสูงพร้อมเลื่อนอ่านภายในป้าย
- Changed files: `scenario-adventure/online-app.js`, `ai-world.css`, `online-room.html` และคู่ใน `dist/`; Root README นี้. อัปเดต cache version เป็น `hanging-notice-20261015`
- Validation รอบนี้: `node --check scenario-adventure/online-app.js` ผ่าน; source/dist ทั้ง 3 คู่ตรงกัน. Browser QA ห้องจริง 38219339: 1280×720 กาง/ยุบรายละเอียดแล้วแมพสูงคงที่ 633.203125px; 390×844 แมพสูงคงที่ 732.625px; ไม่มีหน้าเลื่อนแนวตั้งทั้งสองขนาด. ไม่กดทอย/ตอบ/ยอมแพ้ และไม่รันแมตช์หรือชุด regression ใหญ่ซ้ำสำหรับ layout patch นี้
- ขอบเขต: เปลี่ยนเฉพาะตำแหน่ง/รูปแบบแจ้งเตือน ไม่เปลี่ยน gameplay, Dice, Movement หรือ server; ข้อความยาวเกินขอบเขตป้ายต้องเลื่อนอ่านภายในป้าย. ไม่มี Deploy

## ประวัติ — Board Event Round3A: scoped inspection / NOT IMPLEMENTED (15 ตุลาคม 2026)

**สถานะ:** อ่านคำสั่ง Board Event Engine Round3A ล่าสุดจากไฟล์แนบแล้ว ตรวจเฉพาะตัวควบคุมเทิร์น/ตัวตอบสนอง/กระดาน/Local Practice. ยังไม่ได้เพิ่ม mixed events และไม่ได้เปลี่ยนกติกาเกม. หยุดก่อนเริ่ม B–F ตามเงื่อนไขข้อ12 ที่ให้หยุดเมื่อการเชื่อมทั้ง online/local เกิน Minimal Patch; นี่เป็นข้อจำกัดขอบเขตงาน ไม่ใช่หลักฐานว่าเกมเดิมเล่นไม่ได้

### Findings จาก source จริง

- กระดาน `map-3d/board-data.js`: BOARD_TILES/TILE_POSITIONS มี **32 ช่องจริง**. `buildTilePath()` เดินไปข้างหน้าตามจำนวนขั้นและ normalize modulo; ไม่รองรับค่าติดลบเพราะ clamp steps>=0. การถอยหลังจาก Event ต้องแยก path helper ที่ใช้พิกัดเดิม ห้ามเปลี่ยน base dice movement
- Online: `scenario-adventure/online-rooms.mjs` → `OnlineRooms.play()` สุ่มทอย/สร้าง path/เปิด Scenario/บันทึก history ในคำสั่ง roll; respond ใช้ `resolveMatchResponse()` เพิ่มคะแนนและนับเทิร์น; continue เปลี่ยน currentTurn/เตรียม Deck. `tickBots()` มีคำสั่ง roll/respond/continue ตาม phase; `view()` ยังส่ง scenario/result ไม่ได้มี event contract
- Local Practice ยังเป็นเส้นทางจริง: `scenario-adventure/app.js` → `Game`, `startRoll`, `onRollComplete`, `onMoveComplete`, `openScenario`, `resolveForActor`, `finishTurn`; เริ่มด้วย `?practice=1` และอ่าน session จาก `practice-room.mjs`. Local รอ callback เดินจบก่อนเปิด Scenario และ Bot ใช้ React timers
- Shared scoring: `response-engine.js` → `resolveMatchResponse()` ผูก actionId/dedup/responseHistory กับ scenario ID โดยตรง; คำนวณ turn count และ Match End ที่นี่. Non-ACTION ไม่ควรปลอม scenario เพื่อแอบใช้ scoring เดิม
- UI: online `online-app.js` และ local `app.js` แสดงการ์ด/Basic จาก scenario และ Result นับ scenario history. ต้องเปลี่ยนทั้งคู่ให้แยก event history, ACTION identity count และ event-specific choices ตามจริง

### เหตุผลที่หยุด / ขอบเขตที่ต้องวางก่อน implementation

- การเปลี่ยน online อย่างเดียวจะปล่อย Local Practice ใช้ทุกช่องเป็น Scenario; ไม่ตรงข้อ12
- หากทำต่อทั้งคู่ ต้องมี contract กลางสำหรับ event opening/resolution/idempotency/turn accounting, แล้วเชื่อม controller/Bot/UI/Replay สองชุด. MOVEMENT ต้องแยก bonus movement callback ออกจาก landing callback ปกติ ไม่เช่นนั้น local เปิด Event ซ้ำปลายทางได้; online ต้องกัน retry เคลื่อนที่ซ้ำด้วย
- จึงประเมินว่าเกินการแก้เฉพาะ resolver จุดเล็ก ๆ ในรอบ Minimal Patch นี้. **ยังไม่ได้พิสูจน์ว่าจำเป็นต้อง rewrite engine** และไม่ควรเริ่ม rewrite; ให้ตกลงขอบเขตการเชื่อม shared helper ก่อนดำเนินงาน
- ไม่สร้าง event engine ครึ่งชุด ไม่เปลี่ยน networking/room setup/Auth/Supabase/Story/Quiz/Rewards/Card ownership และไม่ Deploy/คืน Legacy

### Proposed implementation map (ยังไม่ใช่ระบบที่ทำแล้ว)

1. Shared event catalog/mapping/open/resolve helpers + generic score/turn commit helper ที่แยกออกจาก scenario scoring โดยรักษาผลเดิม; ACTION เรียก resolver เดิม
2. Mapping 32 ช่องเป้าหมาย: ACTION12 / MOVEMENT6 / SUPPORT5 / RISK5 / DECISION4 = 37.5/18.75/15.625/15.625/12.5%; กระจายและกำหนด START landing ด้วย (ตัวเลขนี้เป็นข้อเสนอ ยังไม่มี mapping data ที่รันจริง)
3. ต่อ online และ local ด้วย helpers เดียวกัน; bonus movement Rule A ไม่เปิดปลายทางซ้ำ, bots ใช้ resolver เดียวกับคน, event-level idempotency, replay ล้าง event state
4. UI ทั้งสองโหมดและ Result counts; focused tests ครบชนิด/START/wrap/duplicates/forged intents/2–4ฝ่าย/Bots/Local; Primaryหนึ่งรอบและ Browserอย่างมากหนึ่งแมตช์
5. Sync source/dist และรายงานตามจริง; ไม่เริ่ม Round3B visual หรือ Chapter01 Round2 อัตโนมัติ

**Changed files รอบนี้:** Root `README.md` เท่านั้น. ไม่แก้ source/dist จึงไม่มีไฟล์ runtime ที่ต้อง sync. ไม่รัน tests หรือ Browser match ซ้ำ (ไม่มี gameplay changes). ผล 337/337 และ QA ด้านล่างเป็นผลก่อนหน้า ไม่ใช่ mixed-event acceptance. Chapter01 และ viewport-fit ล่าสุดยังคงเดิม

## CURRENT DEMO — Full Board / Turn Popups / Surrender (15 ตุลาคม 2026)

- เฉพาะ Ai Word Online Gameplay: เอาแถบทอย/คำถามด้านล่างออกจาก layout; แมพใช้พื้นที่ที่เหลือทั้งจอและ HUD มุมเดิม. ทอย/คำถาม/ผลย้ายเข้า native dialog เฉพาะเทิร์นเราโดยค่าเริ่มต้น; ปิดด้วย X/Esc และเปิดกลับด้วย «เปิดหน้าต่างเทิร์นของฉัน» ได้ ไม่ข้ามเทิร์นหรือเปลี่ยนผล
- เทิร์นคนอื่นไม่มี dialog โดย default. แถบบนแสดงผู้เล่น Event/คำถาม และคำตอบ/คะแนนจาก Server. เพิ่มรายการ «ล่าสุด» จาก eventHistory/responseHistory เพื่อไม่ให้ผล Bot หายเร็วเกินอ่าน; กดขยายอ่านคำถามได้โดยไม่เปิด modal
- ฟันเฟืองแทนปุ่มออก มี checkbox «ปิดป๊อปอัพผู้เล่นอื่น» เริ่มต้น checked; ถ้าผู้ใช้ยกเลิกเองสามารถเปิด spectator dialog แบบอ่านอย่างเดียว ไม่มีสิทธิ์ตอบแทน. Preference อยู่ใน state หน้านี้ รีโหลดกลับค่าเริ่มต้น
- ออกจากแมตช์ผ่านเมนูต้องยืนยัน «ยอมแพ้และออก»; ปุ่มกลับ Hub ระหว่างเล่นเปิด confirmation แทนลัดออก. ยกเลิกได้โดยไม่มีคำสั่งส่ง Server
- เพิ่ม authoritative command `surrender`: ผู้เป็นสมาชิกยอมแพ้ได้แม้ไม่ใช่เทิร์นตน, บันทึก surrenderedBy/endReason=SURRENDER และจบแมตช์; ผู้ที่เหลือชนะร่วมกัน (ห้อง2คนมีผู้ชนะ1, ห้อง4คนเหลือผู้ชนะร่วม3). **เป็นกติกาจบทั้งแมตช์ ไม่ใช่เล่นต่อแบบตัดที่นั่งผู้ยอมแพ้**. ไม่ปลอมคะแนน/จำนวนเทิร์นหรือปลดล็อกการ์ด; รายชื่อเก็บในผลเพื่อระบุผู้เล่น. Replay ล้างสถานะ surrender
- Existing low-level `leave`/การ disconnect ยังใช้ behavior เดิม ไม่ใช่ auto-forfeit ทุกกรณีของการปิด Browser/เครือข่ายขาด. เมนูเกมใหม่ใช้ surrender โดยตรง. ไม่อ้าง timeout/ranked penalty หรือ persistence ข้ามเครื่อง
- Changed + synced source/dist: `scenario-adventure/online-app.js`, `scenario-adventure/online-rooms.mjs`, `ai-world.css`, `online-room.html`, `turn-popup.test.mjs`; Root README รอบเดียวกัน. ไม่แก้ Local Practice UI, Chapter01, Story/Quiz/Rewards, Supabase, Dice/Movement/Token
- Focused popup/surrender+mixed events/room controls **17/17 ผ่าน**; Primary source+dist **365/365 ผ่าน**. หลัง Primary เพิ่มข้อความผลล่าสุด/CSSขนาดป๊อปอัพ/ข้อความยอมแพ้เท่านั้น ตรวจ syntax และ Browser เพิ่ม ไม่รัน Primary ซ้ำ
- Browser จริง: สร้างห้อง2ฝ่าย+Bot; เริ่มแล้ว own roll dialog เปิด, Xปิด/เปิดกลับได้, ระหว่าง animation dialogปิด, คำถาม DECISION เปิดในเทิร์นเราและยืนยันได้; ส่งให้Botแล้ว openDialogs=0, เมื่อBotจบ own roll dialogเปิดอีกครั้ง. แถบล่าสุดแสดง Bot ได้ «ขยายระบบหรือทบทวนก่อน» และเลือก «ทบทวนก่อน · RP+1 / Stabilityไม่ลด»
- Browser Settings: checkboxเริ่มchecked, ยกเลิกconfirmationแล้วเล่นต่อได้, ยืนยันยอมแพ้จริงแล้วกลับ Ai Word. desktop pageHeight=720 เท่าจอ, boardHeight≈585; mobile390×844ไม่มีhorizontal/page overflow, dialogwidth366px. Screenshot `full-map-popup-ui.png`, `surrender-confirmation.png` ใน artifacts แชต
- Restart Server4180เพื่อนำ surrender มาใช้แล้ว ห้องเก่าถูกล้างตาม memory lifecycle; ต้องสร้างใหม่. ไม่ได้ deploy หรือเปิด Internet. ไม่ทำ Round3B/Chapter01 Round2 ต่ออัตโนมัติ

## CURRENT DEMO — Board Event Engine ROUND 3A IMPLEMENTED (15 ตุลาคม 2026)

ผู้ใช้สั่งให้ทำต่อครบหลัง scoped inspection. สถานะ NOT IMPLEMENTED ด้านล่างเป็นประวัติ ไม่ใช่สถานะล่าสุด. ไม่เริ่ม Round3B หรือ Chapter01 Round2

### ระบบที่เพิ่ม

- Event mapping จริงบน TILE_POSITIONS **32 ช่อง**: ACTION12 (37.5%), MOVEMENT6 (18.75%), SUPPORT5 (15.625%), RISK5 (15.625%), DECISION4 (12.5%). ACTION อยู่ช่อง 0,3,6,9,12,15,18,21,24,26,28,30 กระจายไม่ติดกันแม้ข้ามขอบกระดาน
- `board-events.js` รวม mapping/catalog/DEMO CONFIG/open/resolve/bot intent/summary เป็นกติกากลาง Online + Local. ประเภทช่องคงที่ ไม่แก้ geometry/path/token/dice. Catalog ใหม่ชนิดละ 2 เรื่องรวม 8 DEMO_DRAFT พร้อมเหตุผล ยังไม่ใช่เนื้อหาที่อนุมัติ
- ทุก dice landing เปิดหนึ่ง Event รวม START; ไม่มี Event ตอนตั้งตัวเริ่มเกม. ACTION เท่านั้นใช้คลัง 24 เรื่องและ shared no-repeat เดิม. Non-action ไม่กิน Scenario History และเลือก catalog ต่างจากเรื่องล่าสุดเมื่อมีทางเลือก
- ACTION ใช้ scoring/eligibility/hand/discard เดิม. MOVEMENT +2/0RP หรือ -2/+1RP; SUPPORT +1RP หรือ Stability+1 cap10; RISK รับ +1RP/-1Stability หรือใช้การ์ดที่มี explicit context/สิทธิ์จริง; DECISION +2RP/-1Stability หรือ +1RP/0Stability. ไม่มี card effect ใน MOVEMENT/SUPPORT/DECISION และไม่มีการแจกการ์ดใหม่
- แยก `commitMatchResult()` ออกจาก resolver เดิมเพื่อใช้ score bounds/turn count/winner ร่วมกัน: 1 resolution=1 turn, คนละ6, RP>=0, Stability0..10 และ0ไม่แพ้ทันที. Result/Replay เหมือนเดิมพร้อมนับ Event แต่ละประเภทและ ACTION unique count จริง
- Online `OnlineRooms.play()` เป็นผู้เลือก Event/ตรวจ choice/card/score/position/commit; API ยังใช้ respond intent เดิมพร้อม choiceId. ไม่เปลี่ยน networking/Auth/room password/seats/ready. ปฏิเสธ intent ที่ส่งคะแนน/ตำแหน่งเอง, wrong actor/stale/duplicate; ไม่ให้กินการ์ดหรือเดินซ้ำ
- Local `Game.openScenario/resolveForActor` เรียก helper เดียวกัน; Bot local ใช้ chooseEventIntent ชุดเดียวกับ Server Bot. Local ยังเป็นเกมฝึกที่ตัดสินใน Browserตามเดิม ไม่อ้างว่า offline practice กลายเป็น authoritative Node match
- Movement Rule A: update ตำแหน่งโบนัสแบบ sync ครั้งเดียวผ่าน modulo พิกัดเดิม ไม่มี callback เปิด Event ปลายทางหรือโบนัสผ่าน START. **ข้อจำกัด visual:** การเดินโบนัส ±2 ไม่มี animation เพิ่ม ใช้ position update; การทอย/เดินหลักยังใช้ animation เดิม ผลคะแนน/นับเทิร์นยืนยันทันที แล้วกดส่งต่อแบบเกมเดิม
- Local Practice compatibility: เมื่อไม่มี practice session ลองอ่าน active/eligible saved preset และตรวจสิทธิ์ก่อน prepare Session. ไม่ให้สิทธิ์จาก saved IDs; ไม่มีชุดที่ใช้ได้หรือบันทึก Sessionไม่ได้ให้ข้อความกู้คืน ไม่ปลดล็อกหรือแก้ preset

### Changed files / Source-dist

- New: `scenario-adventure/board-events.js`, `scenario-adventure/BoardEventPanel.js`, `board-events.test.mjs`
- Runtime: `scenario-adventure/online-rooms.mjs`, `response-engine.js`, `scenario-engine.js`, `online-app.js`, `online-client.js`, `app.js`, `practice-room.mjs`; root `practice-room.js`, `practice-room.html`, `map-3d-entry.js`, `map-3d.html`, `online-room.html`, `ai-world.css`, `scenario-adventure.css`
- Tests adapted: `scenario-online.test.mjs`, `ai-world.test.mjs`, `scenario-online-http.test.mjs`, `practice-room.test.mjs`. Existing room/scenario-only fixtures inject ACTION mapping internally to retain old scoring/no-repeat coverage; new mixed tests use production default mapping. No client/API override for mapping
- ทุก runtime/test source ที่แก้ sync dist ตรงกัน; Root README อัปเดตรอบเดียวกัน. ไม่แก้ Chapter01/Story/Quiz/Rewards/Supabase/ownership catalog และไม่ Deploy/เพิ่ม dependency/คืน Legacy

### Tests / Browser QA ตามที่รันจริง

- Focused board events + room/score tests **36/36 ผ่าน**; ครบ32landings/5types/START, +/-2 wrap/nochain, choice/forgery/card ownership/bounds, local shared resolver12turns, online2/3/4seats, serverBots24events, stale/duplicate และ Replay
- Primary source+dist **357/357 ผ่าน** หนึ่งรอบ. หลัง Browser พบ null Scenario UI error แก้ guard ไม่ให้ Non-ACTION render Basic section; syntax ผ่านและเล่นแมตช์เดิมต่อจนจบได้ ไม่ซ่อนข้อผิดพลาดแรก
- หลังเพิ่ม compatibility จาก saved preset รัน targeted Practice source/dist **14/14**, และ final Board+Practice **17/17** ผ่าน. มี test เพิ่ม1×source/dist ภายหลัง Primary จึงไม่อ้างว่า Primary ใหม่เป็น359/359 และไม่รันทั้งโปรเจกต์ซ้ำโดยไม่จำเป็น
- Live Browser **หนึ่งแมตช์** 1Player+1Bot จบ12/12 Events: ACTION6 / MOVEMENT1 / SUPPORT2 / RISK0 / DECISION3. ACTION6 identities ไม่ซ้ำ; ทั้งสอง6/6เทิร์น; ผู้เล่น RP6/Stability6, Bot RP8/Stability9 ชนะ. ทดลอง DECISION +2/-1 และ SUPPORT ฟื้น+1 จริง
- Live Replay ผ่าน: history UI0, ทั้งสองRP0/Stability10/turn0/6. ไม่เล่นแมตช์ที่สองต่อ; ออกจากห้อง QA แล้ว. Screenshot `round3a-result.png` และ `round3a-local-movement.png` ใน artifacts แชต
- RISK และการ์ด Risk ผ่าน focused tests แต่แมตช์สุ่ม Browser นี้ไม่ตก RISK; ไม่อ้างว่าทดสอบทุก Event ผ่าน Browser. Local shared logic/setup ผ่าน tests; Browser Local อ่านชุด Milo เดิม → สร้าง/เริ่มห้อง → ทอย1 ลง MOVEMENT → เลือกถอย2 สำเร็จ จาก index1ไป31 (UIช่อง2ไป32), RP+1/Stabilityไม่เปลี่ยน/Turn1 ไม่เปิด Scenario ปลายทาง และส่งต่อให้ Bot เล่นจนกลับเทิร์นผู้เล่นได้; Local console warn/error ว่าง. ไม่อ้าง local full-match Browser ผ่าน
- Server4180รีสตาร์ตใช้ mixed events แล้ว ห้องเก่าถูกล้างตาม memory lifecycle; static4174คงเดิม. localhost ไม่ใช่ Internet multiplayer หรือ Cloud save. Demo content รอตรวจทานต่อ

**งานถัดไปเมื่อผู้ใช้สั่ง:** Round3B visual-only; อย่าเริ่ม Chapter01 Round2/3 หรือ Apply SQL อัตโนมัติ

## CURRENT DEMO — Chapter01 หน้าจอเดียว (15 ตุลาคม 2026)

- ปรับเฉพาะ Chapter01 ให้ shell สูง 100dvh ภาพ/เนื้อหายืดตามพื้นที่ที่เหลือ และปุ่มย้อนกลับ/ไปต่ออยู่ในจอตลอด ไม่ต้องเลื่อนทั้งหน้า
- แยกปุ่มสลับ «บทสนทนา / สำรวจ / เลือกคำตอบ» ไม่แสดงทุกส่วนกองยาว; เงื่อนไขการอ่าน/สำรวจ/เลือกคำตอบเดิมยังบังคับ. ไม่มีการเปิดฉากหรือให้รางวัลเพิ่ม
- Changed/synced source + dist: `chapter01.css`, `chapter01-player.js`, `lesson-player.html` (cache). ไม่แก้ Story เดิม/Server/เกม/Inventory
- Focused Chapter01 + Story regression 21/21 ผ่าน; syntax ผ่าน. ไม่รัน Primary ทั้งชุดซ้ำสำหรับ layout นี้; 337/337 ด้านล่างเป็นผลรอบก่อน
- Browser บัญชีจริง: สลับส่วนบทสนทนา/คำตอบได้ ปุ่มจบฉากยังเปิดตามความคืบหน้าเดิม; desktop pageHeight=720 เท่าจอ และ footerBottom=710; mobile pageHeight=844 เท่าจอ, footerBottom=836 ไม่มีแนวนอนล้น. หน้าจอเล็ก/ข้อความยาวมากยังมี overflow:auto เฉพาะช่องเนื้อหาเพื่อไม่ตัดข้อความหรือปุ่ม; ไม่อ้างว่าไม่ต้องเลื่อนทุกกรณีที่ขยายตัวอักษร
- ยังคง local save แยกบัญชี ยังไม่ใช่ server completion; รอบพัฒนายังหยุดที่ Round1 เหมือนเดิม

## CURRENT DEMO — สรุปส่งต่อไปเครื่องอื่น (15 ตุลาคม 2026)

**อ่านหัวข้อนี้ก่อนเริ่มงาน:** สถานะนี้เป็นข้อสรุปล่าสุด ส่วนด้านล่างเป็นรายละเอียด/ประวัติย้อนหลัง โดยเฉพาะ Layout รุ่นเก่าไม่ใช่คำสั่งให้ย้อนกลับไปใช้

### ทำอะไรไปแล้ว

| ส่วน | สถานะล่าสุด |
| --- | --- |
| ระบบเกมหลัก | Scenario Adventure + Action Cards; Legacy District Battle ถูกนำออกแล้ว ห้ามนำกลับมา |
| ตัวละครและ Deck | แยกเมนูจัดชุดจากเมนูเล่น; เลือกตัวละครก่อนเกมครั้งเดียวและบันทึกชุด 5 ใบใน Browser แยกบัญชี; Free: Alexander/MAMASan/Milo อีก 6 ตัวยัง Locked |
| Ai Word | เลือกชุดที่บันทึกไว้, รายชื่อห้อง, สร้าง/เข้าด้วยเลข 8 หลัก, รหัสผ่านห้องตรวจฝั่ง Server |
| ห้องเล่น | 2–4 ที่นั่ง ผสมมนุษย์/Bot; เพิ่ม Bot เฉพาะ Waiting Room; เจ้าของเพิ่ม/ลบ Bot นำมนุษย์อื่นออก เปิด/ปิดที่นั่งว่างได้ ทุกคนต้องพร้อมก่อนเริ่ม |
| Gameplay | 6 เทิร์นต่อฝ่าย; การ์ด Effective/Partial/Ineffective และ Basic มีผล RP/Stability จริง; จบแมตช์ ตัดสิน RP→Stability→Draw, Result และ Replay |
| Scenario | 24 เรื่อง (8 MOCK + 16 DEMO_DRAFT รอตรวจทาน); ทุกฝ่ายใช้ประวัติร่วมกัน กัน ID/Content Identity/ข้อความซ้ำ; หมวดหมดเปลี่ยนหมวดในธีมเดิม ไม่มี generic fallback ซ้ำ |
| UX ล่าสุด | Hub เห็นการ์ดตัวละครเต็มใบ; แมพกลางและแถบผู้เล่นด้านใน 4 มุม; ใช้ความสูงพื้นที่จอที่เหลือจริงให้เห็นปุ่มทอยโดยไม่เลื่อนหน้า; คำตอบยาวเลื่อนภายในแถบได้ |
| Story เดิม | เรื่อง M6 เดิมและ Nancy Preview ยังอยู่ ไม่เขียนทับ Quiz/Reward/Inventory เดิม |
| Chapter 01 ใหม่ | `ai-district-ch01` ชื่อ «เสียงกระซิบจากเมืองที่ไร้คำตอบ» ทำเฉพาะ Round 1 / Scene01–02 แล้ว: บทสนทนา จุดสำรวจ ตัวเลือก feedback/ลองใหม่ Next/Back และ local save แยกบัญชี |

### งานล่าสุด: Chapter 01 Round 1

- เข้า Learning World → «เริ่มหรือเล่นบทที่ 1 ต่อ» หรือ `lesson-player.html?chapter=ai-district-ch01`
- ฉาก 01 อ่านบทสนทนา 9 ช่วง สำรวจแผงข้อมูล 1 จุด เลือกคำตอบได้ทั้ง 3 แบบแล้วไปต่อ
- ฉาก 02 อ่าน 5 ช่วง สำรวจหลักฐาน 2 จุด ตอบผิดลองใหม่ได้ เลือกแนวทางให้มนุษย์ทบทวนและอ่านบทส่งท้ายก่อนจบฉาก
- ใช้หน้า `lesson-player.html`, `CharacterDialogue`, `SceneVisual` และภาพ/Portrait เดิม; controller ใหม่แยกเฉพาะบท ไม่เปลี่ยนระบบเกม
- **หยุดที่ Round 1 ตามสเปก**. ยังไม่ทำฉาก 03–05, Fact Check trial, Final Quiz ใหม่ หรือ reward claim ของบทนี้
- **บันทึกในเครื่องเท่านั้น** ไม่ใช่ Cloud progress ไม่ใช่ server-verified completion และไม่มีการให้รางวัล/ปลดล็อกจาก client state

### ไฟล์หลักที่เครื่องใหม่ควรรู้

- Hub / ห้อง: `ai-world.html`, `ai-world.js`, `ai-world.css`, `online-room.html`, `scenario-adventure/online-app.js`, `online-client.js`, `online-rooms.mjs`, `scenario-online-server.mjs`
- เกม / เนื้อหา: `scenario-adventure/scenario-engine.js`, `response-engine.js`, `scenario-seed.js`, `card-response-config.js`, `ScenarioAdventureScene.js`
- Chapter01 ใหม่: `chapter01-data.js`, `chapter01-engine.mjs`, `chapter01-player.js`, `chapter01.css`, `chapter01.test.mjs`
- จุดเชื่อม Story ที่แก้: `learning.html`, `lesson-player.html`, `lesson-player.js`
- Story/Quiz/รางวัลเดิม: `mission-m6-data.js`, `mission-story-02-data.js`, `mission-player-engine.mjs`, `lesson-components.js`, `quiz.js`, `learning-reward-engine.mjs`, `supabase/learning_*.sql`
- ทุกไฟล์ source ที่แก้ซิงก์ไป `dist/` แล้ว. Root README เป็นเอกสารหลัก ไม่ใช้ nested `Ai-District-main/` เป็น source of truth

### ผลทดสอบล่าสุดที่ยืนยันแล้ว

- Chapter01 + Story เดิม focused: **21/21 ผ่าน**
- Primary Regression ล่าสุด หลังเพิ่ม Chapter01: **337/337 ผ่าน** (source + dist ไม่รวม nested transfer copy); ไม่ใช่ 337 tests ที่แตกต่างกันทั้งหมด เพราะมีสำเนา dist
- JS syntax ผ่าน. ไม่มี Root package.json/bundler จึงไม่มีคำสั่ง npm build; ไม่มี dependency ใหม่
- Browser Chapter01: เล่นฉาก 1→2, Enter เลือกคำตอบ, Reload กลับฉากเดิม, สำรวจครบ, ตอบผิดแล้วแก้ถูก, อ่านบทส่งท้าย, กลับ Learning World และเปิดต่อจากเมนูจริงได้
- Browser layout เกม: desktop 1280×720 และ mobile 390×844 มี pageHeight เท่าความสูงจอและปุ่มทอยอยู่ในจอ; ตรวจ phase รอทอย ไม่อ้างว่าทดสอบทุก phase/ทุกอุปกรณ์
- ประวัติก่อนหน้า: live Browser 1 Player+3 Bots จบ 24 Responses ไม่ซ้ำ และ Replay ผ่าน. ไม่ได้เล่นแมตช์เต็มซ้ำหลังทุกครั้งที่เปลี่ยน CSS
- ภาพ QA อยู่ใน artifacts ของแชตเครื่องเดิม ไม่รวมอยู่ในโฟลเดอร์โปรเจกต์โดยอัตโนมัติ

### สิ่งที่ยังไม่เสร็จ / ข้อจำกัดที่ต้องส่งต่อ

1. Chapter01 ยังไม่มี mapping ของบทเรียน/รางวัลและ server objective validation ที่ยืนยันได้ ห้ามใช้ local save เป็นสิทธิ์รับรางวัลหรือยืม progress ของบท M6 เดิมมาอ้างว่าผ่าน
2. ต้องวางเส้นทาง persistence + sequential objective validation บน Server ให้ตรง schema จริงก่อน Round3. RPC เดิมมี `submit_lesson_quiz` และ `claim_lesson_reward`; `access-denied` เป็น reward ของบทเดิม ไม่ได้ยืนยันว่าเป็น reward บทใหม่
3. Deck/preset/Chapter01 local save อยู่ใน Browser profile เครื่องนั้น การคัดลอก source ไม่ย้าย save/login ไปเครื่องใหม่
4. ห้องออนไลน์อยู่ใน Node memory; restart/เปลี่ยนเครื่องห้องเดิมหาย. localhost ยังเล่นข้ามเครื่อง/Internet อัตโนมัติไม่ได้ ทุกคนต้องเข้าถึง endpoint เดียวกันพร้อม origin/network ที่ถูกต้อง
5. Live Browser เคยมี transient Failed to fetch; retry แล้วเล่นต่อได้ ไม่ถือว่าเครือข่ายสมบูรณ์ทุกครั้ง
6. เนื้อหาใหม่ DEMO_DRAFT ยังรอคนตรวจทาน. ไม่มี Deployment หรือ SQL Apply ในรอบเหล่านี้

### เปิดบนเครื่องใหม่

คัดลอก **โฟลเดอร์โปรเจกต์ทั้งชุดพร้อม assets และ dist** ไม่ใช่เฉพาะ README. ตำแหน่งไดรฟ์เปลี่ยนได้ ให้รันจาก root ของโฟลเดอร์ที่คัดลอก

- ต้องมี Node.js (เครื่องเดิมใช้ Node 24) และ Python 3 หากแยก static server แบบเดิม
- เทอร์มินัลที่ 1: `python -m http.server 4174 --bind 127.0.0.1`
- เทอร์มินัลที่ 2: `node scenario-online-server.mjs` (ค่าเริ่มต้น localhost:4180)
- เปิด `http://127.0.0.1:4174/login.html` แล้วเข้าสู่ระบบใหม่; จัด/บันทึก Deck บนเครื่องใหม่ก่อนสร้างห้อง
- Story entry: `http://127.0.0.1:4174/learning.html`; Ai Word: `http://127.0.0.1:4174/ai-world.html`
- Node และ Browser ต้องเชื่อม Supabase Auth/Inventory ได้ ใช้ configuration เดิมใน `supabase-client.js`; ห้ามใส่ service-role key ใน frontend
- หากรัน tests ให้เลือก root + dist ตามผลล่าสุดและตัด nested copy ออก; ไม่จำเป็นต้อง audit/ทดสอบทั้งโปรเจกต์ซ้ำเพื่ออ่านสถานะ

### คำสั่งส่งต่อสำหรับงานถัดไป

> อ่าน CURRENT DEMO ด้านบนและรายละเอียด Chapter01 Round1 ก่อน. สถานะปัจจุบันหยุดที่ Round1 แล้ว อย่าเริ่ม Round2/3 จนผู้ใช้สั่ง. เมื่อสั่ง Round2 ให้เพิ่ม Scene03–05 และ trial เฉพาะในเรื่องตามสเปกต้นฉบับ ใช้ระบบเดิม ไม่เพิ่ม trial เข้า Inventory/Loadout. ขอ/อ่านสคริปต์ต้นฉบับที่ผู้ใช้ส่งหากเครื่องใหม่ยังไม่มี ห้ามแต่งทดแทนเอง. Round3 ต้องยืนยัน server progression, quiz key/คะแนน และ existing reward mapping ก่อนให้สิทธิ์จริง. รักษา Login/Lobby/Board/Card Engine/Story เดิม ห้ามคืน Legacy, Deploy หรือ Apply SQL โดยพลการ. แก้แบบ incremental, focused tests, sync source/dist และอัปเดต README ในรอบเดียวกัน

---

## ประวัติและรายละเอียด — Chapter 01 / ROUND 1 ONLY (15 October 2026)

**Scope:** เพิ่มบท `ai-district-ch01` «เสียงกระซิบจากเมืองที่ไร้คำตอบ» เฉพาะ Scene 01 สถานีกลาง และ Scene 02 ศูนย์บริการประชาชน ตามสคริปต์ที่ผู้ใช้ส่ง. หยุดหลัง Round 1 ไม่ทำ Scene 03–05 / Trial / Quiz / Reward รอบนี้

### Existing integration map / findings

- Root ไม่มี package.json หรือ bundler/build command: เป็น static HTML + ES modules; validate syntax/test และ sync source/dist ตามโครงสร้างเดิม
- Learning World: `learning.html` / `learning.js`; Story route `lesson-player.html` / `lesson-player.js`; ใช้ `CharacterDialogue` และ `SceneVisual` จาก `lesson-components.js` / portraits เดิม. เส้นทางใหม่ `lesson-player.html?chapter=ai-district-ch01` มี controller แยกเฉพาะบท แต่ยังใช้หน้า/ส่วนแสดงผลเดิม ไม่เปลี่ยน mission เดิมหรือสร้าง quiz ซ้ำ
- Story เดิม `mission-m6-data.js` สำหรับ `ai-ethics-m6-01`; Nancy preview `mission-story-02-data.js` + `mission-preview-progress.mjs` ยังอยู่ครบ
- Existing SQL/client contract: `learning_lessons`, `player_learning_progress` (scene_index/scene_state), `lesson_quizzes`, `quiz_questions`, `quiz_attempts`; Quiz เดิม `quiz.js` ใช้ RPC `submit_lesson_quiz`; รางวัลใช้ `claim_lesson_reward`, `lesson_rewards`, `action_cards`, `user_card_unlocks`. ตรวจจากไฟล์ SQL ที่มีอยู่ ไม่อ้างว่าได้ตรวจ live deployed schema ทั้งหมด
- Catalog จริงมี `access-denied` เป็น reward ของบท M6 เดิม ไม่ใช่ mapping ของ Chapter 01 ใหม่ จึงไม่ยืม lesson code หรือสร้าง dummy card ID. `supabase/learning_player_foundation.sql`, `learning_quiz_stage4*.sql`, `learning_rewards_stage5*.sql` เป็นหลักฐาน contract ที่อ่าน ไม่แก้หรือ Apply

### Implemented / verification

- Scene01: บทสนทนา 9 ช่วง, สำรวจแผงข้อมูล 1 จุด, เปิดตัวเลือกทั้ง 3 แบบทุกแบบไปต่อได้
- Scene02: บทสนทนา 5 ช่วง, สำรวจข้อมูลลงทะเบียนและบันทึกประเมิน, เลือกคำตอบไม่เหมาะสมมี feedback/ลองใหม่, คำตอบเหมาะสมอ่านบทส่งท้าย Alexander/AURA ก่อนจบฉาก
- Next/Back, ปุ่มสำรวจทั้งบนภาพและรายการ, speaker labels, keyboard focus, native buttons; ไม่ข้ามบทสนทนาที่ยังไม่อ่าน. ใช้ภาพเมืองเดิมเป็นภาพประกอบพร้อมข้อความกำกับแทนภาพฉากใหม่; ไม่มี asset AURA จึงใช้ชื่อ/ข้อความ ไม่สร้างรูปปลอม
- บันทึก localStorage แยก user ID/version/chapter; reload คืน scene/dialogue/evidence/choice. ไม่เขียนทับ story progress เดิม. Storage read fail ไม่เขียนทับข้อมูลเสีย, write fail เก็บ state ในหน้าและแสดง Retry; ไม่อนุญาต Next จนบันทึกได้. ไม่ใช้ local progress ปลดล็อกสิทธิ์หรือให้รางวัล
- Focused chapter + existing Story **21/21**, Primary source/dist **337/337**, JS syntax ผ่าน; ไม่มี dependency ใหม่. ไม่รัน build ที่ไม่มีอยู่
- Browser บัญชีจริง: เล่น Scene01→02, ใช้ Enter เลือกคำตอบ, reload อยู่ Scene02, สำรวจ 2 จุด, เลือกผิดยังจบไม่ได้, เปลี่ยนถูกและอ่านบทส่งท้ายแล้วปุ่มจบเปิด; viewport 390 scrollWidth=clientWidth=375. CSS reduced-motion rule มีและตัวบทแสดงทันที ไม่มี typewriter. ไม่ได้จำลอง OS reduced-motion toggle หรือ Storage failure ใน Browser (storage errors มี unit tests)
- Screenshot `chapter01-round1.png` ใน artifacts แชต. ไม่มีการแก้ Login/Lobby/Board/Inventory/Loadout/สิทธิ์การ์ด/Supabase และไม่ Deploy

### BLOCKERS / next round

- **Server persistence + sequential objective validation ยังไม่เชื่อมสำหรับ chapter ID ใหม่นี้**: ไม่พบ existing lesson/reward mapping ที่ยืนยันได้ จึงใช้ local save พร้อมป้ายชัดเจนเท่านั้น; ไม่อ้างว่า cloud saved หรือผ่านเงื่อนไข server แล้ว
- ต้องกำหนด mapping/progression server ที่แยกจากบทเดิมก่อนรางวัล; client scene_state เดิมไม่ใช่หลักฐาน server validation ของ objective ใหม่. Final Quiz 10 ข้อ/เกณฑ์ 8/10 และ idempotent reward จะทำ Round 3 โดย reuse RPC เดิมหลังยืนยัน mapping/guards. ไม่ส่ง quiz answer key ใหม่ให้ Browser ใน Round 1
- Round2 เมื่อสั่ง: ต่อ Scene03–05 ด้วย controller/components ที่ทำไว้ + trial เฉพาะเรื่อง. ไม่ให้รางวัลจาก local flag และไม่คืน Legacy

**Changed + synced dist:** `chapter01-data.js`, `chapter01-engine.mjs`, `chapter01-player.js`, `chapter01.css`, `chapter01.test.mjs`, `lesson-player.js`, `lesson-player.html`, `learning.html`; Root README updated. ผลทดสอบรอบเก่าด้านล่างเป็นประวัติ

## ประวัติและรายละเอียด — Viewport-fit Gameplay (15 October 2026)

- แก้ canvas ขั้นต่ำ 520px ที่ดันแถบทอยออกนอกจอ: หน้า PLAYING ใช้ flex สูง 100dvh และแบ่งพื้นที่ที่เหลือด้วย minmax(0,1fr) หลังส่วนหัว/แจ้งเตือน/แถบคำสั่ง. แมพไม่มี minimum height ตายตัวอีกต่อไป
- HUD อยู่ใน grid cell เดียวกับแมพและยึดขอบกรอบจริง; แถบทอยอยู่ครบในจอ. แถบคำตอบ/ผลที่ยาวให้เลื่อนเฉพาะภายในแถบ (สูงไม่เกิน 45dvh) แทนเลื่อนทั้งหน้า. ไม่ตัดการเลื่อนของ Hub/Waiting/Result
- Browser QA ห้องจริง phase WAITING โดยไม่เปลี่ยนเกม: desktop 1280×720 ได้ pageHeight=720, dockBottom=710; mobile 390×844 ได้ pageHeight=844, dockBottom=834; ไม่มี overflow แนวนอนทั้งคู่. Screenshot `ai-word-fit-screen.png` ใน artifacts แชต. ไม่อ้าง Browser QA phase ตอบการ์ดรอบนี้
- Changed/source-dist sync: `ai-world.css`, `online-room.html`, `ai-world.html` (cache version); Root README อัปเดตแล้ว. CSS-only ไม่รันทดสอบ logic ซ้ำ ไม่แก้ Server/Engine/Dice/Movement และไม่รีสตาร์ตห้อง

## ประวัติและรายละเอียด — Larger Board / In-frame Corner HUD (15 October 2026)

- ขยาย canvas สูง 520–920px ตามพื้นที่หน้าจอ (มือถือ 520px) และย้ายแถบผู้เล่นเข้า 4 มุมด้านในกรอบเกมตามคำขอล่าสุด
- HUD grid ยึดขนาดเดียวกับกรอบแมพ ไม่ยึด offset จากส่วนหัว; เว้นขอบและ caption ด้านล่าง. pointer-events:none ให้ลาก/ซูมแมพได้ผ่าน HUD; แถบคำตอบ/ทอยยังเป็นแถวแยกใต้กรอบ ไม่ทับแมพหรือคะแนน
- เปลี่ยน CSS + cache version เท่านั้น: `ai-world.css`, `online-room.html`, `ai-world.html`; source/dist ตรงกัน. ไม่แก้ logic/Server/Scene/Dice/Movement/Token และไม่รีสตาร์ตห้อง
- Browser QA: ตรวจห้องจริง 4 ฝ่ายโดยไม่เปลี่ยนสถานะ เห็นกรอบใหญ่และคะแนนครบ 4 มุมด้านใน; screenshot `ai-word-inframe-corners.png` ใน artifacts แชต. รอบนี้ไม่รัน regression logic ซ้ำเพราะแก้เฉพาะ CSS; 17/17 ด้านล่างเป็นผลรอบก่อน ไม่ใช่ผลใหม่

## ประวัติและรายละเอียด — Non-overlapping Table Grid (15 October 2026)

- แก้ root cause: เลิก absolute offsets/negative margins ของคะแนนผู้เล่นที่อ้างอิงความสูงหน้าจอ. เปลี่ยนเป็น CSS Grid จัดพื้นที่จริงให้ผู้เล่นคู่บน → แมพ → ผู้เล่นคู่ล่าง; แถบทอยอยู่ระหว่างคู่ล่างบนจอใหญ่ และมีแถวของตัวเองบนจอเล็ก
- ข้อความแจ้งเตือนอยู่ก่อนตารางตาม normal flow จึงดันทั้งตารางลงแทนการซ้อนคะแนน. แถบสถานการณ์/คำตอบ/ผลมีแถวของตัวเอง ขยายและเลื่อนทั้งหน้าได้ ไม่ใช้ overlay หรือ scroll panel สูงตายตัว
- ปรับกรอบ สีประจำมุม และระยะห่าง โดยเก็บการ์ดเต็มใบหน้า Hub และระบบเกมเดิมทั้งหมด; ไม่รีสตาร์ต Server หรือแก้สถานะห้องผู้ใช้
- Changed/synced source + dist: `ai-world.css`, `scenario-adventure/online-app.js`, `ai-world.html`, `online-room.html` (cache version); Root README รอบเดียวกัน
- Validation: syntax ผ่าน; focused regression **17/17 ผ่าน**. Live Browser ห้อง 4 ฝ่าย phase WAITING: วัด bounding boxes ของ 4 คะแนน/แมพ/แถบควบคุมที่ width 1280 และ 390 พบ **0 intersections**, scrollWidth เท่ากับ clientWidth ทั้งสองขนาด. ตรวจภาพ desktop แล้ว บันทึก `ai-word-layout-fixed.png` ใน artifacts แชต
- ไม่อ้างว่ารอบนี้เล่นแมตช์ใหม่จนจบหรือทดสอบทุก phase ใน Browser; การตอบการ์ด/ผลใช้ logic เดิม เปลี่ยนเฉพาะ container layout. ข้อจำกัด localhost/เครือข่ายเดิมยังคงอยู่

## ประวัติและรายละเอียด — Center Map Layout / Full Character Card (15 October 2026)

- Ai Word แสดง artwork ตัวละครเต็มใบด้วย natural aspect ratio ไม่ crop ภาพ; ป้ายอยู่ใต้ภาพ
- เฉพาะหน้า PLAYING: แมพ 3D อยู่กลางเต็มความกว้าง, คะแนน/ตัวละครทั้ง 4 ฝ่ายแยกตามมุมซ้ายบน/ขวาบน/ซ้ายล่าง/ขวาล่าง; แถบทอยแบบยาวอยู่ใต้แมพตรงกลาง
- แถบคำตอบ/ผลใช้พื้นที่ล่างเดียวกัน ขยายตามขั้นตอน จอเล็กยังเลื่อนอ่านและกดปุ่มได้. ไม่แก้ Scene/Dice/Movement/Token/Server/กติกาเกม และไม่รีสตาร์ตห้องเดิม
- Changed + source/dist sync: `ai-world.css`, `scenario-adventure/online-app.js`, `ai-world.html`, `online-room.html` (cache version). Root README อัปเดตรอบเดียวกัน
- Validation: JS syntax ผ่าน; focused room/game regression **17/17 ผ่าน**. Browser บัญชีจริงแสดงการ์ดเต็มใบ และเปิดห้อง 4 ฝ่ายที่กำลังเล่นเพื่อตรวจ layout โดยไม่สั่งเปลี่ยน State; เห็นแมพกลาง/คะแนน 4 มุม/แถบทอยด้านล่าง. ตรวจ width 390: scrollWidth=clientWidth=390 และมุมทั้ง 4 อยู่ภายในหน้าจอ. Screenshot `ai-word-center-map.png`, `full-character-card.png` ใน artifacts แชต
- รอบนี้ไม่เล่นแมตช์เต็มซ้ำและไม่อ้างผล Primary 325 ว่ารันใหม่; แก้เฉพาะ presentation. ข้อจำกัดเครือข่าย transient Failed to fetch และ localhost เดิมยังมี

## ประวัติและรายละเอียด — Ai Word UX / Room Controls (15 October 2026)

- ปรับ Hub, native Create/Password dialogs, Waiting Room, Gameplay และ Result ให้ใช้ภาพเมืองเดิม โทนฟ้า/ม่วง ปุ่มข้อความชัดเจน และรองรับหน้าจอเล็ก/การเลื่อน
- Create Room ไม่มีตัวเลือก Bot และส่ง botCount=0; เพิ่ม/ลบ Bot เฉพาะหน้ารอ ทุกคนยังต้องพร้อมก่อนเริ่ม
- แสดง 4 ที่นั่งพร้อมสถานะ ผู้เล่น/Bot/คุณ/เจ้าของห้อง. Host เปิด 2/3/4 ที่นั่ง หรือปิดช่องว่างท้ายห้องได้; ปิดทับสมาชิกไม่ได้ การเปลี่ยนทีมล้าง Ready
- Host นำมนุษย์อื่นออกได้ผ่าน dialog ยืนยันและ Server guard; ห้ามนำตัวเองออกด้วย kick ห้าม guest ใช้ และห้ามเปลี่ยนทีมระหว่าง PLAYING. ผู้ถูกนำออกเห็น KICKED_FROM_ROOM และปุ่มกลับ Hub. ไม่ใช่ permanent ban: กลับเข้าด้วยเลขห้อง/รหัสที่ถูกต้องได้เมื่อมีที่ว่าง
- Gameplay แสดงเทิร์น คะแนน RP/Stability ขั้นตอน 1 ทอย → 2 เลือกคำตอบ → 3 ส่งต่อ; การ์ดใช้คำอธิบายตอบ Scenario และเหตุผล Effective/Partial/Ineffective ไม่แสดงคำอธิบาย IP จากระบบเก่า. มี Basic และ Result/Replay เดิม
- ไม่แก้ Dice/Movement/Token/Engine/เนื้อหา/สิทธิ์การ์ด/Supabase/Story Mission และไม่คืน Legacy หรือ Deploy

**Changed / synced to dist:** `ai-world.html`, `ai-world.js`, `ai-world.css`, `online-room.html`, `scenario-adventure/online-app.js`, `scenario-adventure/online-client.js`, `scenario-adventure/online-rooms.mjs`, `ai-word-ux.test.mjs`, `scenario-online-http.test.mjs`; Root README เป็นเอกสารหลัก

**Validation:** focused 17/17; Primary Regression Source + dist 325/325 ผ่าน. เพิ่ม HTTP kick/removed access/rejoin/password assertions แล้ว targeted HTTP Source + dist 2/2 ผ่าน. ไม่มี dependency ใหม่

**Browser QA จริง:** บัญชี/Deck เดิมสร้างห้องใหม่โดยไม่มี Bot; ปิด 4→3 และเปิดกลับ 4 ได้; เปลี่ยนเป็น 2 แล้วเพิ่ม Bot จาก Waiting Room; Ready → Start → Scene เดิมแสดงได้; เลือก Firewall Guard เห็นเหตุผล Ineffective และยืนยันแล้ว RP 0 / Stability 8 / เทิร์น 1/6 ตามกติกา; ส่งต่อแล้ว Bot เล่นได้ RP 3 / Stability 10 / เทิร์น 1/6 และกลับเทิร์นผู้เล่น. ตรวจ responsive width 390: document clientWidth/scrollWidth เท่ากัน 375px และเลื่อนแนวตั้งได้. บันทึกภาพ waiting/gameplay ในโฟลเดอร์ artifacts ของแชต. ไม่อ้าง Browser สองบัญชีทดสอบ kick หรือแมตช์เต็มรอบนี้: server state/HTTP tests ตรวจสิทธิ์และแมตช์จบแทน

**Limitations:** live Browser พบ transient Failed to fetch; ลองใหม่แล้วอ่าน State และใช้การ์ดสำเร็จ ไม่อ้างว่าเครือข่ายไม่มีปัญหา. การตั้งค่า responsive มีแล้ว แต่ไม่ได้ทดสอบเครื่องมือถือจริง. Server localhost/ห้องใน memory เหมือนเดิม; รีสตาร์ต Server 4180 เพื่อนำ kick guard ใหม่มาใช้แล้ว ห้องเก่าถูกล้าง ต้องสร้างใหม่. ไม่เปิด Internet/LAN อัตโนมัติ

## ประวัติและรายละเอียด — Ai Word Rooms + Separate Saved Decks (15 October 2026)

นโยบายล่าสุด: **เมนูจัดตัวละคร/Deck แยกจากเมนูเล่น**. Ai Word เป็นทางเข้าสร้าง/ค้นหา/เข้าห้อง 2–4 ที่นั่ง ผสมมนุษย์และ Bot ได้. หัวข้อสองคนและ Local Practice ด้านล่างเป็นประวัติ; ไม่คืน Legacy District Battle

### User Flow ที่เปลี่ยนแล้ว

- Lobby มี portal แยก **ตัวละครและเด๊กของฉัน** กับ **Ai Word**
- จัดตัวละครและ Deck → ตั้งชื่อ → **บันทึกตัวละครและ Deck**. บันทึกสำเร็จแล้วยังอยู่หน้าจัดชุด ไม่สร้าง Room/ไม่พาเข้าออนไลน์อัตโนมัติ. ชุดเดิมยังเก็บ localStorage แยกตามบัญชี
- เข้า Ai Word ได้จาก Lobby โดยไม่ต้องผ่าน Character Selection ใหม่; เลือกจากชุดที่บันทึกไว้และตรวจสิทธิ์ล่าสุด หากไม่มีชุดที่ใช้ได้จะแสดงลิงก์ไปจัดชุด โดยยังดูห้องได้
- Ai Word มีรายชื่อห้อง ชื่อ/เลขห้อง/จำนวนที่นั่ง/Bot/สถานะ/ป้ายล็อก พร้อมปุ่มเข้าร่วม หรือกรอกเลขห้อง 8 หลัก. สมาชิกเดิมกลับเข้าห้องได้
- **สร้างห้อง** เปิด native dialog: ชื่อ, ด่าน, 2/3/4 ที่นั่ง, เปิด/ปิดรหัสผ่าน; เพิ่ม Bot ในหน้ารอเท่านั้น. เลขห้องเป็นตัวเลข 8 หลักสร้างฝั่ง Server
- ห้องมีรหัสต้องกรอกทั้งเข้าจากรายชื่อและเข้าด้วยเลขห้อง. Server ตรวจรหัส ไม่อาศัยป้ายล็อกฝั่ง Client; เก็บ salted scrypt hash ไม่ส่งรหัส/hash/salt ใน list/snapshot. ปิด dialog แล้วล้างช่องรหัสผ่าน
- Waiting Room แสดงเลขห้อง สมาชิก และ Ready; เจ้าของปรับจำนวนที่นั่งและเพิ่ม/ลบ Bot ได้ การเปลี่ยนสมาชิกหรือที่นั่งล้าง Ready ของมนุษย์ ต้องกดพร้อมใหม่
- **ครบที่นั่งที่ตั้งไว้ และมนุษย์ทุกคนพร้อม** เจ้าของจึงเริ่มได้. Bot พร้อมอัตโนมัติ; เล่นคนเดียวกับ Bot ได้โดยสร้าง 2–4 ที่นั่งแล้วเติม Bot ให้ครบ

### Gameplay ที่คงไว้และขยายเฉพาะที่จำเป็น

- Server เป็นตัวตัดสินเกมเหมือนเดิม ใช้ turn order 2–4 ฝ่าย แต่ละฝ่าย 6 Responses; รวม 12/18/24 Responses ตามจำนวนที่นั่ง
- ขยาย `createScenarioAdventureMatch()` และ resolver ให้คำนวณตาม actorOrder แทน hardcode สองฝ่าย. คะแนนเดิม Effective +3/0, Partial +1/-1, Ineffective 0/-2, Basic +1/-1; RP/Stability bounds, hand/draw/discard และ action guards เดิม
- RP → Stability ตัดสินผู้ชนะ. ถ้าอันดับสูงสุดเท่ากันมี co-winners; UI แสดง Draw เฉพาะผู้ที่เสมออันดับสูงสุด คนที่ต่ำกว่ายัง Defeat
- Bot ทำงานบน Server จึงเล่นต่อได้โดยไม่พึ่ง Client Bot timer; ใช้ `chooseBotResponse()` เดิม. หน่วงให้แสดง Dice/Movement/ผลตอบสนองก่อนเปลี่ยนเทิร์น
- Scene ใช้ PlayerToken/BotToken/CharacterToken และ Dice/Movement เดิม เพิ่ม instance ของโมเดลเดิมสำหรับที่นั่ง 3/4; ไม่สร้างตัวเดินหรือ Environment ใหม่. Character เป็น UI Identity เท่านั้น
- คลัง 20 → **24 สถานการณ์** เพื่อให้ 4 ฝ่าย × 6 เทิร์นไม่ซ้ำ. เพิ่ม DEMO_DRAFT 4 เรื่อง: model version drift, feedback poisoning, adversarial visual marker และ sensitive inference. รวม 8 MOCK เดิม + 16 DEMO_DRAFT รอตรวจทาน ไม่อ้างว่าอนุมัติแล้ว
- ทุกฝ่ายใช้ history เดียว: กัน Scenario ID, Content Identity และ normalized description ซ้ำ; ใช้หมวดอื่นในธีมเดิมเมื่อหมวดหมด ไม่มี Generic Fallback. ใช้ Basic ได้ทุกเรื่อง
- Server ตรวจสิทธิ์การ์ดก่อนใช้จริง; ถ้าสิทธิ์ถูกถอนระหว่างแมตช์ ปฏิเสธ Card Response นั้น แต่ยังใช้ Basic ต่อได้. Prototype และตัวละคร Locked ไม่ถูกเปิดสิทธิ์
- Replay ต้องพร้อมใหม่ครบทุกมนุษย์ แล้วเจ้าของเริ่มใหม่; reset actor order/scores/turns/history/decks/positions ครบ 2–4 ฝ่าย
- แยก connection error กับ action error เพื่อไม่ให้การ poll ห้องกลบข้อความกดยืนยันไม่สำเร็จ

### Changed Files / Sync

- Hub/เมนู: `ai-world.html`, `ai-world.js`, `ai-world.css`, `lobby.html`, `room.html`, `friends.js`
- Saved setup UI: `character-selection.html`, `scenario-adventure/app.js`; `map-3d-entry.js`/`map-3d.html` เปลี่ยน cache version เพื่อไม่โหลด App รุ่นเดิม
- Room/API/UI: `scenario-adventure/online-rooms.mjs`, `online-client.js`, `online-app.js`, `scenario-online-server.mjs`, `online-room.html`
- Match/content: `scenario-adventure/scenario-engine.js`, `response-engine.js`, `scenario-seed.js`, `card-response-config.js`, `ScenarioAdventureScene.js`
- Tests: `ai-world.test.mjs`, `scenario-online-http.test.mjs`, `friday-demo-round2a.test.mjs`, `friday-demo-hotfix01.test.mjs`, `saved-loadouts.test.mjs`, `practice-room.test.mjs`, `scenario-adventure/scenario-engine.test.mjs`
- `README.md` และ source/dist ของไฟล์ที่แก้ตรงกัน. Nested transfer copy ไม่ใช่ source of truth
- ไม่แก้ Supabase/Migration/Story Mission/Quiz/Reward และไม่ Deploy Production

### Tests และ Browser QA

- Focused state/engine: **42/42 ผ่าน**; HTTP integration ผ่าน 4 บัญชี/24 Responses พร้อม list/password/ownership/revision/ready checks
- New tests ครอบคลุมห้อง 2/3/4 มนุษย์เล่นครบ, 1 มนุษย์ + 3 Bot จบ, 24 identities ไม่ซ้ำ, การลบ Bot ไม่ทิ้ง phantom actor, resize/ready reset, host-only controls, private join, top-score ties, Replay และ Basic หลังถอนสิทธิ์ Card
- Primary Regression ครั้งแรกมี assertion เก่า 4 failures (Source/dist) ที่ยังคาดว่า Save ต้องเริ่มห้องและ Ai World ต้อง redirect. แก้ให้ตรวจ saved Character/Card IDs จริงและไม่เรียก start callback; targeted Hotfix tests **18/18 ผ่าน**
- หลังปรับ assertion และเพิ่มกรณีถอนสิทธิ์ Card ตรวจ Regression Source + dist ใหม่: **317/317 ผ่าน** (ไม่รวม nested transfer copy). ไม่ใช่ซ่อน/skip failures
- Browser Auth/Inventory fixtures: ยืนยัน Save แล้วอยู่หน้า Deck, เข้า Ai Word จาก portal, อ่านชุดเดิม, dialog 4 ที่นั่ง + 2 Bot, ห้องปรากฏในอีกบัญชี, รหัสผิดเข้าไม่ได้, manual code ยังขอรหัส, ลบ/เพิ่ม Bot และ start disabled จนพร้อมทุกคน แล้วเข้า Scene 4 ฝ่ายได้
- Browser QA fixtures สองแท็บสะดุดระหว่างยืนยัน response: `Failed to fetch` และ Browser tool reset/ERR_ABORTED. จึง **ไม่อ้างว่าแมตช์สองบัญชี fixture เล่นจบใน Browser**; HTTP integration สี่บัญชีเล่นครบ 24 Responses ผ่าน และตรวจเพิ่มกับบัญชีจริงตามด้านล่าง
- Mock Lobby มี console errors จาก fixture ที่ไม่ได้จำลอง presence/count เต็ม ไม่ใช้เป็นหลักฐานว่า Production Lobby มี error; ไม่แก้ระบบเพื่อน/Presence เพื่อกลบข้อจำกัด fixture
- **Live Supabase Browser Match ผ่าน**: ใช้ชุด Milo ที่บัญชีจริงบันทึกไว้โดยไม่แก้ preset สร้างห้อง 4 ที่นั่ง + 3 Bot แล้วเล่นครบ **24/24 Responses, 24 Content Identities ไม่ซ้ำ**. ทั้งสี่ฝ่าย 6/6 เทิร์น; ผู้เล่น **RP 6 / Stability 4**, Bot2 **12/7**, Bot3 **10/6**, Bot4 **12/7**. ผู้เล่น Defeat; Bot2/Bot4 เป็น co-winners ตาม RP และ Stability
- Live Replay ผ่าน: ทุกฝ่าย RP 0/Stability 10/Turn 0/6, history 0, มือผู้เล่น 3/กองจั่ว 2/กองทิ้ง 0. Console warn/error ของ live game เป็น []
- Live Browser มี transient `Failed to fetch` ตอนทอยเทิร์น 6; State ยังอยู่ WAITING ไม่เสียเทิร์น กดใหม่แล้วเล่นต่อจนจบได้ ไม่มีคะแนน/สถานการณ์ซ้ำ. ไม่อ้างว่าเครือข่ายไม่เคยสะดุด; action errors ถูกเก็บให้เห็นและลองใหม่ได้
- หลังเพิ่มตัวเลือกด่านเดิมและ Server guard ของ theme ตรวจ targeted room tests Source/dist **16/16 ผ่าน**, HTTP tests **2/2 ผ่าน**; ด่านที่ไม่อยู่ใน catalog ถูกปฏิเสธ ไม่เปิดแผนที่ปลอม

### ข้อจำกัดที่ยังมี / Server

- เปิดเกมที่ 4174 และ Node Server ที่ 4180. รัน Server ด้วย `node scenario-online-server.mjs` ต้องให้ Node อ่าน Supabase Auth/Inventory ได้; ใน Sandbox ที่บล็อก network ต้องใช้สิทธิ์รันนอก Sandbox ตามที่อนุมัติไว้
- ตัวเลือกด่านมี **นครลอยฟ้า AI District** ที่ใช้งานอยู่เพียงด่านเดียว; ยังไม่มีด่าน/Environment ใหม่
- ห้องเป็น Server memory; restart ล้างห้อง. เก็บผลแมตช์/Deck ข้ามเครื่องยังไม่ทำ ไม่มี matchmaking/ranked rewards/timeout forfeit. ผู้เล่นกด Back ไป Hub ไม่ได้ออกจากห้องจนกด Leave
- ยัง bind localhost ไม่ได้เปิดให้เพื่อนต่างเครื่องผ่าน Internet/LAN โดยอัตโนมัติ. ทุกคนต้องเข้าถึง Server เดียวกัน; หากเปิดภายนอกต้องมี endpoint/HTTPS และ frontend origins ที่กำหนดไว้ ไม่ใช่เปลี่ยนคำว่า online แล้ว localhost ใช้ข้ามเครื่องได้
- Content Identity ต้องคงเดิมเมื่อเขียนเนื้อหาเดิมใหม่; ไม่เรียก AI API ตรวจ semantic ระหว่างแมตช์. เนื้อหาใหม่ทั้งหมด DEMO_DRAFT ยังต้องทบทวน
- Full Card Special Effects และ Round 2B Visual Upgrade ยังไม่เริ่ม

## ประวัติและรายละเอียด — Scenario Adventure Online (14 October 2026)

นโยบายล่าสุดจากเจ้าของ: **ต้องมีทั้งเล่นกับ Bot และเล่นกับคนอื่น**. ขอบเขต Local Practice ในประวัติด้านล่างไม่ใช่การยกเลิก Multiplayer อีกต่อไป. ไม่คืน Legacy District Battle

สถานะ: **เพิ่มห้องออนไลน์ 2 มนุษย์ / Authoritative Node Server / สร้างและเข้าด้วยรหัส / Match 6 เทิร์นต่อฝ่าย / No-Repeat 12 เนื้อหา / Result และ Replay / คงห้องฝึกเดิม**. เปิด Server ในเครื่องที่ `http://127.0.0.1:4180` แล้ว และ Server เดโมเดิม 4174 ยังใช้ได้. ยังไม่ได้เปิด Server สู่อินเทอร์เน็ตหรือ Deploy Production

### วิธีใช้

1. Character Selection → Deck 5 ใบ → **บันทึก Deck และเลือกห้องเล่น**
2. เลือก **สร้างห้องออนไลน์** หรือกรอกรหัส 8 ตัวแล้ว **เข้าห้องออนไลน์**; ใช้ Character/Deck เดิม. หรือเลือก **ห้องฝึกกับ Bot** เหมือนเดิม
3. ห้องออนไลน์ต้องใช้สองบัญชี ผู้เล่นทั้งคู่กด **พร้อมเล่น** แล้วเจ้าของกด **เริ่มเกมออนไลน์**
4. เล่นสลับเทิร์น จนครบฝ่ายละ 6 Responses; RP → Stability → Draw. Replay ต้องพร้อมทั้งคู่และเจ้าของเริ่มแมตช์ใหม่
5. Server URL ของผู้เล่นทั้งสองต้องชี้ไป Server ตัวเดียวกัน. `127.0.0.1` หมายถึงเครื่องของผู้เล่นแต่ละคน จึงใช้เล่นข้ามเครื่องไม่ได้ด้วยที่อยู่นี้

### Server / การเชื่อมต่อจริง

- รันด้วย Node ที่ติดตั้งอยู่แล้ว: `node scenario-online-server.mjs` (จาก root). ใช้ built-in HTTP/fetch/crypto ไม่มี dependency เพิ่ม
- Default bind **127.0.0.1:4180**. Server ให้บริการ Static หน้าเกมและ API ด้วย; เปิด Login ได้ที่ `http://127.0.0.1:4180/login.html` หรือใช้หน้าเดโม 4174 แล้ว Server URL 4180
- รองรับการตั้ง `AI_DISTRICT_HOST`, `AI_DISTRICT_PORT`, `AI_DISTRICT_ORIGINS` (comma-separated exact frontend origins). หากต้องเล่นจาก LAN/Internet ให้จัด endpoint ที่เพื่อนเข้าถึงได้และ HTTPS สำหรับส่ง Auth token แล้วใช้ Server URL เดียวกันทั้งคู่. ยังไม่มีการตั้ง public hosting, TLS endpoint หรือ Firewall ในรอบนี้ รอเจ้าของระบุ LAN หรือ Internet
- ไม่ควรใช้บัญชีเดียวกันสอง Browser เพื่อทดสอบสองผู้เล่น; Server ถือว่าเป็นสมาชิกคนเดียวกัน. ใช้บัญชีแยกกัน
- Server ตรวจ bearer token กับ Supabase Auth และอ่าน action_cards/user_card_unlocks/scenario_card_eligibility ด้วย publishable key เดิม. Identity cache 10 วินาที; กรอง unlock ด้วย user_id และตรวจ Deck ใหม่ตอน Ready/Start/Respond
- ไม่เก็บ token ใน Room State ไม่ส่ง token/ID บัญชี/มือคู่แข่งออกใน snapshot; ไม่มี Supabase writes, Migration, Schema/RPC/RLS changes หรือ result persistence
- ตอนทดสอบจริง Sandbox บล็อก outbound Node ด้วย EACCES. จึงรัน Server นอก Sandboxผ่าน approval ที่ได้รับแล้ว ทำให้ Auth/Inventory reads จริงและ Create Room ผ่าน. หากเริ่มใหม่ใน Sandbox ที่ยังบล็อกเครือข่าย จะตรวจ Auth ไม่ได้

### Gameplay และ Synchronization

- `OnlineRooms` เป็นตัวตัดสิน Server: random dice, movement path จาก board เดิม, scenario selection/history ร่วม, hand/draw/discard, RP/Stability, turns, end/winner/draw และ replay. Client ส่ง intent ไม่ส่ง score/position/result ที่ Server เชื่อถือ
- ใช้ response/deck/scenario engines เดิม ไม่ rewrite Local Practice/Game Engine. Internal token slots player/bot คงชื่อเดิมสำหรับ Scene แต่ **ทั้งสองฝ่ายเป็นมนุษย์** ไม่มี Bot timer/automatic response ในโหมดออนไลน์
- Snapshot polling ทุก 1.5 วินาที; serial command queue ต่อห้องและ revision guard ป้องกัน stale/duplicate score หรือ consume. Ready ใช้ explicit desired boolean เพื่อให้ทั้งคู่กดพร้อมพร้อมกันได้โดยไม่ toggle ซ้ำ
- สมาชิกห้องเท่านั้นอ่านและสั่งห้องได้; เจ้าของเริ่มเมื่อครบสองคนพร้อม; เฉพาะเจ้าของเทิร์นทอย/ตอบ/จบเทิร์น. การ์ดต้องเป็น instance ของมือเจ้าของและมีสิทธิ์จริง Prototype ยังล็อก
- Reconnect/refresh อ่าน State ล่าสุดจาก Server ได้ตราบที่ Server ยังเปิด; ถ้าออกจาก Match จะ ABANDONED ไม่สร้างผู้ชนะปลอม. กลับเลือกห้องไม่ถือ Leave จนกดออกจากห้องชัดเจน

### Changed Files (source + dist)

- `scenario-online-server.mjs`: authenticated HTTP/static server, live Supabase read gateway, origin/member/size/rate guards
- `scenario-adventure/online-rooms.mjs`: room/match authority and command queue
- `scenario-adventure/online-client.js`, `scenario-adventure/online-app.js`, `online-room.html`: API client, waiting/game/result/replay UI, reuse Scene/Dice/Movement/Tokens
- `practice-room.html`, `practice-room.js`: โหมด Online และ Bot อยู่ร่วมกัน; ปุ่ม Online disabled จนตรวจ setup/ติดตั้ง handlers พร้อม
- `scenario-adventure/app.js`: เปลี่ยนข้อความปุ่ม Deck ให้เลือกห้องเล่น
- `scenario-online.test.mjs`, `scenario-online-http.test.mjs`: state/HTTP tests; `README.md`: สถานะและข้อจำกัดตามจริง
- Sync เฉพาะไฟล์เปลี่ยนไป dist; ไม่แก้ Supabase, Story Mission/Quiz/Reward, 3D Environment หรือคืน Legacy

### Verification

- Initial focused online + Round 1/Round 2A/Practice: **26/26 ผ่าน**; เพิ่ม regression พร้อมพร้อมกันแล้ว Online state/HTTP **6/6 ผ่าน**
- Primary Regression Source + dist: **301/301 ผ่าน หนึ่งรอบ** (ไม่รวม nested transfer copy). Syntax และ source/dist byte checks ผ่าน
- HTTP integration สอง independent accounts ผ่าน 12 responses, same final state, no repeat; anonymous/invalid token, wrong Origin, non-member, locked deck, wrong turn, forged hand/opponent instance และ stale/duplicate action ถูกปฏิเสธ. Test Auth/Inventory fixtures ไม่ใช่ production accounts
- Browser QA สองแท็บ/สอง mock authenticated accounts ใช้ **actual HTTP Server + actual online UI + gameplay/3D engines**: Milo/MAMASan สร้าง/เข้ารหัส, ready/start, สลับมนุษย์เล่นครบ 6/6; **Draw ทั้งคู่ RP 6 Stability 4/10**, 12 Content Identities ไม่ซ้ำ; Replay history 0/scores 0/Stability 10/deck 3+2+0. ไม่มี console warning/error
- พบ Ready revision race ใน Browser และแก้ด้วย explicit desired ready state; focused test simultaneous ready intents ผ่าน. ไม่เริ่ม Browser full match รอบสองเพื่อประหยัด credits
- **Live Supabase smoke check ผ่าน**: บัญชีจริงที่ล็อกอินอยู่ใช้ preset เดิม สร้างห้องผ่าน Auth/Inventory จริงได้. ยังไม่ได้เล่นครบกับสองบัญชี Supabase จริง และยังไม่ได้ทดสอบข้ามเครื่อง
- Temporary QA servers/fixtures ถอดหลังตรวจ; Server จริง 4180 เปิดไว้สำหรับเจ้าของใช้งาน

### Remaining Limitations

- Online prototype สำหรับ **2 ผู้เล่น** เท่านั้น ยังไม่มี matchmaking, friend invitation, 3–4 player room, ranked rewards หรือ durable persistence
- ห้องอยู่ใน memory; Server restart จะล้างห้อง, inactivity 24 ชั่วโมงหมดอายุ. คนที่หลุดเทิร์นยังต้องกลับมาเล่นหรือผู้เล่นกด Leave; ไม่มี timed forfeit/auto reconnect UI
- Internet/LAN endpoint ยังไม่ได้เปิด เพราะยังต้องกำหนดสถานที่ที่เพื่อนจะเข้าถึง และคงคำสั่งห้าม Deploy Production. ห้ามอ้างว่าลิงก์ localhost เปิดให้เพื่อนต่างเครื่องได้แล้ว
- 12 Scenario ใหม่ยัง DEMO_DRAFT; compatibility เป็น demo scoring เดิม ไม่เปิด Full Card Special Effects
- Round 2B Visual Upgrade ยังไม่เริ่ม

## ประวัติและรายละเอียด — FRIDAY DEMO ROUND 2A: Scenario Content Expansion + Strict No-Repeat

สถานะล่าสุด: **20 เนื้อหาต่างกัน / 12 Responses ไม่ซ้ำร่วมกันทั้ง Player และ Bot / คะแนนและจบแมตช์ Round 1 เดิม / Result และ Replay ผ่าน Browser หนึ่งแมตช์ / ไม่มี Generic Fallback / Legacy Removed**. หัวข้อ Round 1 และ Audit ด้านล่างเป็นประวัติการพัฒนา; ข้อจำกัด 8 เรื่อง/Fallback ถูกแก้ใน Round 2A แล้ว

### Content และนโยบาย

- คลังเดิม 8 → **20 เรื่อง**: คง 8 MOCK เดิม เพิ่ม 12 **DEMO_DRAFT** รอตรวจทาน ไม่อ้างว่าอนุมัติแล้ว. ไม่พบ `AI_District_Scenario_Content_Design_v1.txt` ใน repository จึงใช้ 8 เรื่องเดิมเป็นฐานและเพิ่มเฉพาะบริบทที่จำเป็น
- เรื่องใหม่: บรรณานุกรมปลอม, เสียงปลอมขอโอนเงิน, Prompt Injection ในเอกสาร, ความยินยอมฝึกโมเดล, อายุข้อมูล/การลบสำเนา, ข้อมูลพื้นที่ไม่ครอบคลุม, การประเมินเสียงที่ไม่เข้าถึงทุกคน, เหตุผล/อุทธรณ์ผล AI, ความไม่แน่นอนของการคาดการณ์, อำนาจหยุดระบบของมนุษย์, ผู้รับผิดชอบเหตุผิดพลาดจาก Vendor และการจัดซื้อ/กำกับ AI
- ครอบคลุม AI Literacy, Privacy, Security, Safety, Fairness, Data Bias, Transparency, Explainability, Human Oversight, Accountability, Governance และ Misinformation ใน 6 หมวดของธีมเดิม. ใช้ข้อมูลสถานการณ์สมมติ ไม่มีข้อมูลส่วนบุคคลจริง
- ทุกเรื่องมี Stable ID, Content Identity, Theme/Category, ชื่อ/คำอธิบาย, ความยาก, Card/Basic options, explicit context rules พร้อมเหตุผล, Feedback และ Learning Explanation
- การประเมิน Effective/Partial/Ineffective ใช้ explicit rules ตามความเสี่ยง ไม่ใช้ Tag ตรงกันอย่างเดียว; Basic ใช้ได้ทุกเรื่อง. ไม่เปิดสิทธิ์ Prototype หรือ Full Card Special Effects

### Strict No-Repeat

- `selectAdventureScenario()` เลือกเรื่องใหม่ใน Category ของช่องก่อน; ถ้าหมวดหมดเลือกเรื่องใหม่จากหมวดอื่นใน Theme เดียวกัน และแสดงเหตุผลที่เปลี่ยนหมวดใน UI
- Player/Bot ใช้ `match.scenarioHistory` ร่วมกัน; `recordScenarioUse()` ปฏิเสธ ID เดิม, Content Identity เดิม และคำอธิบายเดิมหลัง normalize whitespace/case แม้เปลี่ยน ID/ชื่อเรื่อง
- ไม่มี Generic Fallback หรือ ID สังเคราะห์. หาก Theme ไม่มีเรื่องใหม่ ส่ง `SCENARIO_POOL_EXHAUSTED` แสดงข้อความกู้คืนได้พร้อมทางกลับ Practice Room; ไม่ Resolve/เสียเทิร์นหรือสร้างเรื่องซ้ำ
- Content Identity เป็น editorial identity: ถ้าเปลี่ยนเฉพาะชื่อบุคคล/สถานที่หรือเขียนเรื่องเดิมใหม่ **ต้องคง Content Identity เดิม**. Runtime ไม่ใช่ semantic AI detector; การเติมเนื้อหาในอนาคตต้องทบทวนอัตลักษณ์เนื้อหา
- Replay remount Match ใหม่ ล้าง history/IDs/signatures, scores/turns และใช้ Character/Deck เดิมตามการตรวจสิทธิ์ Round 1

### Changed Files / Source และ dist

- `scenario-adventure/scenario-seed.js`: คลัง 20 เรื่อง, Content Identity, DEMO_DRAFT, context rules; เอา fallback template ออก
- `scenario-adventure/scenario-engine.js`: shared ID/content/text guards, same-theme category rollover, explicit exhaustion error
- `scenario-adventure/scenario-repository.js`: schema validation ของ identity/context; เอา fallback API ออก
- `scenario-adventure/card-response-config.js`: explicit compatibility ของ 12 เรื่องใหม่; เอา generic context ออก
- `scenario-adventure/response-engine.js`: อ่าน context rules ของ Scenario และแนบ Content Identity ในผล; กติกาคะแนนเดิม
- `scenario-adventure/app.js`: draft/rollover label, exhaustion recovery message, Result แสดงจำนวนเนื้อหาไม่ซ้ำและรายชื่อสถานการณ์
- `scenario-adventure/scenario-engine.test.mjs`, `friday-demo-round2a.test.mjs`: focused coverage ของนโยบายใหม่
- `map-3d-entry.js`, `map-3d.html`: cache version Round 2A เท่านั้น; `README.md`: บันทึกสถานะรอบนี้
- ซิงก์เฉพาะไฟล์ที่เปลี่ยนไป `dist/`; nested transfer copy ไม่ใช่ source of truth. ไม่แก้ Dice/Movement/Token/Scene, Supabase, Mission Story/Quiz/Reward หรือ Deploy

### Tests

- Focused ก่อน Regression: **37/37 ผ่าน** (Round 2A + scenario-engine + affected Round 2 + Round 1)
- Round 2A ใหม่ 7 tests: schema/20 distinct identities/text/topic coverage, 4 category sequences (Privacy x12, Safety x12, mixed, Fairness/Transparency), shared Player/Bot history, 12 unique IDs/identities/signatures, Basic scoring/6 turns/end/draw, fresh Replay, reject same-content new IDs, no generic fallback, explicit compatibility และ unknown prototype ไม่ usable
- Affected engine tests: category rollover ใน Theme เดิมและ exhaustion error; Round 1 tests คงคะแนน/ขอบเขต Stability/ownership/duplicate actions/Bot/winner/draw
- **Primary Regression Source + dist: 289/289 ผ่าน หนึ่งรอบ** ไม่รวม nested transfer copy; ไม่รัน full-project audit ซ้ำ
- Syntax checks และ byte-identical source/dist checks ของไฟล์ที่เปลี่ยนผ่าน

### Browser QA — หนึ่งแมตช์เต็ม

- QA HTTP server ชั่วคราวใช้ Auth/Card Inventory จำลองเท่านั้น; Character → Deck → Practice Room → 3D/Dice/Movement → Match/Result/Replay ใช้ Source จริง. ไม่มี Supabase writes; ถอด QA server หลังตรวจ
- Milo/Starter Deck เดิม; Player ใช้ Basic ทุกเทิร์น, Bot ตอบอัตโนมัติ. ครบ 6/6 ต่อฝ่ายและ 12/12 Responses
- Result **Defeat**: Player **RP 6 / Stability 4/10**, Bot **RP 12 / Stability 7/10**; DOM แสดง **12 Scenario IDs และ 12 Content Identities ไม่ซ้ำ**, 12 ชื่อเรื่องต่างกัน
- Replay: History 0, RP 0, Stability 10/10, Turn 0/6, Hand 3/Draw 2/Discard 0, Milo เดิม. ไม่มี Console warning/error ใน Flow ที่ตรวจ
- ตรวจ one complete match ตามงบ; ไม่ฉีด repository exhaustion ใน Browser (unit test ครอบคลุม). QA ไม่ใช่ E2E กับบัญชี Supabase จริง

### Remaining Limitations / Next

- 12 เรื่องใหม่ DEMO_DRAFT ต้องตรวจเนื้อหาและเหตุผล compatibility ก่อนถือว่าอนุมัติ
- การตรวจ semantic duplicate ที่เปลี่ยนชื่อ/สถานที่หรือ paraphrase อาศัย Content Identity ที่ผู้เขียนคงไว้; runtime guard เพิ่มตรวจ exact normalized description แต่ไม่เรียก AI API
- Local Practice ยังต้องอ่าน Auth/Inventory และโหลด CDN runtime; ไม่ใช่ Offline เต็มรูปแบบ. คงเฉพาะ Demo response scoring ไม่เปิด Full Card Effects
- รอบถัดไป **Round 2B — Neo District Map Visual Upgrade** ยังไม่เริ่ม. หยุดรอคำสั่งเจ้าของ; ไม่สร้าง Mission/3D Environment และไม่ Deploy

## FRIDAY DEMO ROUND 1 — Minimum Playable Match

สถานะล่าสุด: **เล่นครบ 1 แมตช์ใน Browser ด้วย Mock Auth/Inventory ได้แล้ว / RP และ Stability ทำงาน / Result และ Replay ผ่าน / Content ยังมี Fallback ซ้ำ / ไม่ Apply Supabase / ไม่ Deploy**

ใช้คำสั่ง Friday Demo Round 1 ที่เจ้าของแนบมา โดยยึดนโยบาย Legacy Removed และ Local Practice 1 Player + 1 Bot. Audit ด้านล่างเป็นสถานะก่อนพัฒนารอบนี้ ไม่ใช่สถานะ runtime ปัจจุบัน

### Implemented

- `DEMO_MATCH_CONFIG` ใน `scenario-adventure/response-engine.js`: 6 เทิร์นต่อฝ่าย, RP เริ่ม 0, Stability เริ่ม 10/สูงสุด 10; Effective +3/0, Partial +1/-1, Ineffective 0/-2, Basic +1/-1; RP >=0, Stability 0–10 และ 0 ไม่แพ้ทันที
- Explicit compatibility rules เฉพาะ 8 Scenario เดิมและ generic Fallback ใน `card-response-config.js`; ใช้บริบทความเสี่ยงและแนวทางของการ์ดพร้อมเหตุผล ไม่ใช้ Rarity หรือ Tag overlap อย่างเดียว. Card ที่ไม่มี context/metadata รองรับยังใช้ไม่ได้ และ Basic ใช้ได้เสมอ
- Player/Bot ใช้ `resolveMatchResponse()` เดียวกัน ตรวจ actor/current turn, card ownership eligibility และ instance ในมือ ก่อนคำนวณคะแนนและ Consume/Discard/Draw
- Match State เก็บ currentTurn, maxTurnsPerActor, scores, turns, responseHistory, usedActionIds, status PLAYING/FINISHED และ winner; Stable Action ID ต่อ actor/turn/scenario และ history guard ป้องกัน response ซ้ำ
- App เปลี่ยน phaseRef แบบ synchronous ก่อน Resolve; คำนวณ score และ deck ใหม่ก่อน commit; Confirm ซ้ำไม่เพิ่มคะแนน/ใช้การ์ดซ้ำ
- HUD แสดง RP/Stability/เทิร์น; Response แสดง Effective/Partial/Ineffective/Basic, RP delta, applied Stability delta และเหตุผล; ไม่มี Energy State หรือหัก EN
- ครบฝ่ายละ 6 เทิร์น: status FINISHED, หยุด Bot timers/actions, ถอดหน้าทอย/ใช้การ์ด และแสดง Victory/Defeat/Draw, scores, turns, วิธีตัดสิน RP→Stability→Draw, Replay และกลับ Practice Room
- Replay ตรวจ account/current Character/Card eligibility ใหม่ผ่านระบบอ่าน Inventory เดิม แล้ว remount Game ด้วย Character/Deck เดิม; reset scores/turns/history/action IDs/decks/positions. ไม่บันทึกผล Match ลง Supabase
- Scenario repository error มีข้อความ/Retry ไม่เสียเทิร์น; synchronous opening guard ป้องกันเปิด Scenario ซ้ำ; turn timer ถูก cleanup เมื่อออก/Replay
- ไม่เปลี่ยน Auth, Character Unlock, Card ownership, Presets, Practice Room creation, Mission/Quiz/Reward, Board layout, Dice/Movement/Tokens, Multiplayer หรือ Visual Environment
- `action-cards/mechanics-contract.js` คง design-only contract เดิมและเพิ่ม comment ชี้ runtime Demo config; ไม่ถือ enabled=false ใน historical contract ว่าปิด numeric resolver ปัจจุบัน

### Changed Files

- `scenario-adventure/app.js`, `response-engine.js`, `card-response-config.js`, `scenario-engine.js`, `scenario-seed.js`, `round2.test.mjs`
- `action-cards/mechanics-contract.js` (clarifying comments)
- `friday-demo-round1.test.mjs`
- `map-3d-entry.js`, `map-3d.html` (cache version only), `README.md`
- ซิงก์ Source/`dist` ของไฟล์ข้างต้น; nested transfer copy ไม่ใช่ source of truth สำหรับ Round 1

### Tests

- Focused Round 1 + affected Round 2 tests ก่อน Regression: 23/23 ผ่าน
- New Round 1 tests: 9 tests ครอบคลุม Effective/Partial/Ineffective/Basic, lower Stability bound/zero not loss, duplicate score/consume, unauthorized/absent hand instance, shared Bot resolver, exactly 12 responses, stop after finished, winner/draw และ fresh Replay state
- Primary Regression (Source + `dist`, ไม่รวม transfer copy): **277/277 ผ่าน** รัน 1 รอบตาม cost control; ไม่รัน full nested regression ซ้ำ
- Syntax checks ของ runtime ที่แก้ผ่าน และ Source/`dist` hashes ตรงกัน

### Browser QA — one complete Local Practice Match

- ใช้ Mock Auth/Card Inventory เท่านั้น; room/game/score/deck/3D/timers ใช้ Source จริง ไม่มี Server writes
- เริ่มด้วย Milo/Deck เดิม ผ่าน Practice Room; เทิร์นแรก Player ใช้ Card แบบ Ineffective: RP +0, Stability -2 และ Discard เพิ่ม 1; เทิร์นที่เหลือใช้ Basic Response
- Player/Bot เล่นครบ 6/6 รวม 12/12 Responses; Result เป็น **Defeat**: Player RP **5**, Stability **3/10**; Bot RP **10**, Stability **6/10** ตรงกติกาตัดสิน
- หลัง FINISHED ไม่มีปุ่มทอย/ใช้การ์ด และ Bot ไม่เล่นต่อ; Replay กลับ Milo, RP 0, Stability 10/10, เทิร์น 0/6, Scenario History 0, Hand 3/Draw 2/Discard 0
- ไม่มี Console warning/error ใน Flow ที่ตรวจ. Browser locator wait ครั้งแรกสั้นกว่า Animation ของลูกเต๋า 6/Movement จึง timeout; ตรวจ DOM ต่อพบ Scenario เปิดปกติ ไม่มี game error และแมตช์เดิมเล่นต่อจนจบ ไม่เริ่มแมตช์ใหม่ซ้ำ
- QA เป็น Mock authenticated session ไม่ใช่ E2E กับบัญชี Supabase Production จริง; unit tests ครอบคลุม Victory/Draw เพิ่มเติม แต่ Browser ตรวจผล Defeat หนึ่งแมตช์เท่านั้น

### Known Blockers / Limitations

- ยังมี Scenario หลักเพียง 8 เรื่องและ generic Fallback; เกมเล่นครบ 12 Responses ได้ แต่ **ไม่รับประกัน 12 เนื้อหาไม่ซ้ำ** โดยเฉพาะ Category ที่มี 1 เรื่อง. แสดงป้าย Fallback และข้อจำกัดใน Result ไม่เปลี่ยน ID เพื่ออ้างว่าเป็น content ใหม่
- Full Content Expansion เป็น Round 2; ยังไม่ได้เปิด Full Card Effects, Special bonuses, Map Redesign หรือ Mission ใหม่
- Replay เริ่ม Match ใหม่ ไม่ใช่ Resume Match; Local Practice ยังต้องใช้ Auth/Inventory reads และ CDN runtime จึงไม่ใช่ Offline demo เต็มรูปแบบ
- Repository recovery มีโค้ด Retry/guard แต่ไม่ได้ฉีด repository failure ใน Browser รอบนี้
- No Production deployment, no Schema/RPC/RLS change, no result persistence, no Legacy reintroduction

หลังเสร็จ: **หยุดรอคำสั่งเจ้าของ** ไม่เริ่ม Round 2, Character Unlock, Mission 03 หรือ Map Redesign อัตโนมัติ

## FRIDAY DEMO GAMEPLAY AUDIT — 14 October 2026

เป้าหมาย: ต้นแบบ Scenario Adventure + Action Cards ที่เล่นจบและสาธิตได้วันศุกร์ **16 ตุลาคม 2026 (Asia/Bangkok)**

ข้อสรุป: **เข้าเกมและเล่นสลับเทิร์น Player/Bot ได้ แต่ยังเล่นจนจบและรู้ผู้ชนะไม่ได้**. ยึด CURRENT DEMO และนโยบายล่าสุดด้านล่าง: Local Practice Room 1 Player + 1 Bot; Legacy ถูกนำออกแล้ว ห้ามนำกลับมา

ขอบเขตการตรวจ: อ่านโค้ดจริงและรันตัวอย่างในหน่วยความจำเพียง 3 ครั้งเพื่อยืนยัน Fallback ซ้ำ ไม่แก้ Source, ไม่รัน Regression ชุดใหญ่, ไม่สร้าง Migration/Mission, ไม่ตรวจหรือแก้ Supabase และไม่ Deploy. การอัปเดตเอกสารนี้เป็นคำสั่งเพิ่มเติมหลังจบ Audit

### WORKING

- Character/Saved Preset → Deck → ตั้งชื่อห้องฝึก → เริ่มเกม ใช้ชุดเดิม: `practice-room.js`, `scenario-adventure/practice-room.mjs` — `preparePracticeSetup()`, `createPracticeRoom()`, `startPracticeRoom()`
- ทอย → เดิน → เปิด Scenario → ตอบ → จบเทิร์น: `scenario-adventure/app.js` — `startRoll()`, `onMoveComplete()`, `finishTurn()`
- Deck 5 ใบ, มือ 3 ใบ, Consume/Discard/Draw/Reshuffle ทำงาน: `scenario-adventure/deck-engine.js` — `consumeSelectedCard()`, `prepareDeckForTurn()`
- Visual/Environment แยกจาก Dice/Movement ได้: `scenario-adventure/ScenarioAdventureScene.js` — `Scene()`, `ScenarioAdventureScene()`; เปลี่ยนสี แสง หมอก เงา ฉากตกแต่ง/กล้องได้ โดยรักษา `TILE_POSITIONS`, Token/Dice props, paths และ completion callbacks

### PARTIAL

- Action Card มีผลจริงต่อมือ/กองการ์ด แต่ผลต่อ Scenario ยังเป็นข้อความ ไม่มีผลต่อคะแนน/ทรัพยากร: `response-engine.js` — `resolveScenarioResponse()`; `app.js` — `resolveForActor()`
- Compatibility เช็ก Tag ตรงอย่างน้อยหนึ่งตัวเป็น usable ยังไม่แยก Effective/Partial/Ineffective: `response-engine.js` — `evaluateCardCompatibility()`
- Bot ทอย/เดิน/เลือกการ์ด usable ใบแรก หรือ Basic แล้วจบเทิร์นอัตโนมัติได้ แต่ไม่มี Match End ให้เล่นจนจบ: `chooseBotResponse()` และ Bot effects ใน `app.js`
- Scenario ID ไม่ซ้ำร่วมกันทั้งสองฝ่าย แต่เนื้อหาซ้ำได้: `scenario-engine.js` — `selectAdventureScenario()`, `createFallbackScenario()`
- มี Scenario หลัก **8 เรื่อง**: AI_LITERACY 2, FAIRNESS 2, TRANSPARENCY 1, PRIVACY 1, ACCOUNTABILITY 1, SAFETY 1; มี generic Fallback template อีก 1 เรื่อง
- ตัวอย่าง Privacy 3 ครั้ง: เรื่องเฉพาะ 1 ครั้ง ตามด้วย Fallback ชื่อ/ข้อความเดิม 2 ครั้ง แม้ Instance IDs ต่างกัน; Category หมดแล้วเกิด Fallback ได้ก่อนใช้เรื่องอื่นครบ
- IDs ของ Prototype cards ใหม่หลายใบยังไม่มี Response Metadata; หากเปิดใช้งานภายหลังจะยังใช้ตอบ Scenario ไม่ได้: `card-response-config.js` — `CARD_RESPONSE_METADATA`, `cardResponseMetadata()`

### MISSING

- RP/Stability มีเพียงค่าร่างใน `scenario-seed.js` — `configuredOutcomes()`; Resolver ยังไม่อ่าน และ `createScenarioAdventureMatch()` ยังไม่เก็บคะแนนรายฝ่าย
- `action-cards/mechanics-contract.js` ระบุ `DESIGN_CONTRACT_ONLY`, `responsePoints.enabled=false`, `stability.enabled=false`; Stability เริ่มต้น 10 เป็น contract เท่านั้น ยังไม่ใช่ runtime state
- ไม่มีจำนวนเทิร์นสูงสุด, Match End, การตัดสินผู้ชนะ/เสมอ, Result Screen หรือ Replay
- EN บนการ์ดเป็นข้อมูลแสดงผล ไม่มี Energy State/การหักค่าใช้ใน Scenario game

### CRITICAL BLOCKERS

1. **ยืนยัน:** `app.js` — `finishTurn()` วนกลับ WAITING ตลอด ไม่มีเงื่อนไขจบแมตช์
2. **ยืนยัน:** `resolveForActor()` ไม่สะสม RP/Stability จึงยังตัดสินผู้ชนะไม่ได้
3. **ยืนยันด้านเนื้อหา:** ถ้าเลือก 6 เทิร์นต่อฝ่าย ต้องมี 12 เหตุการณ์ แต่ 8 เรื่อง + generic Fallback ไม่พอสำหรับ 12 เนื้อหาไม่ซ้ำ; กติกา 6 เทิร์นยังเป็นข้อเสนอ ไม่ใช่สิ่งที่เปิดใช้งานหรืออนุมัติใน Audit นี้
4. **ความเสี่ยงจาก Static Review ยังไม่ reproduce:** `onMoveComplete()` ไม่มี error recovery หลังเปลี่ยน phase เป็น SCENARIO หาก repository ล้มเหลวอาจค้าง
5. **ความเสี่ยงจาก Static Review ยังไม่ reproduce:** phaseRef อัปเดตผ่าน useEffect และ Confirm สร้าง Action ID ใหม่ทุกครั้ง จึงมีช่องเสี่ยงจากการกดเร็วซ้ำ; ต้องปิดช่องนี้ก่อนสะสมคะแนน
6. ห้องฝึก local ยังต้องใช้ Auth/Server Card Inventory และ external runtime modules; ไม่ใช่ Offline demo เต็มรูปแบบ. Audit ไม่ได้ยืนยันความพร้อมของบัญชี/เครือข่ายจริงสำหรับวันสาธิต

### LOW-RISK FIXES

- Synchronous resolve guard และ Action ID คงที่ต่อ Scenario/ฝ่าย
- Error/Retry เมื่อเปิด Scenario ไม่สำเร็จ
- แสดง RP/Stability delta และเหตุผลหลังตอบ เมื่อ numeric resolver พร้อม
- เอาข้อความ EN/พลังเดิมที่ไม่ทำงานออกจาก UI เดโม หรือระบุสถานะให้ชัด
- ปรับ Visual เฉพาะ Environment/Lighting โดยไม่แตะตำแหน่งช่องและ Dice/Movement callbacks

### RECOMMENDED IMPLEMENTATION ORDER

1. อนุมัติกติกาเดโม: จำนวนเทิร์น, RP, Stability เริ่มต้น/ขอบเขต และกติกาเสมอ
2. Outcome Resolver + Match State จาก `scenario.outcomes` พร้อมกัน Resolve ซ้ำ
3. Match End + Winner + Result/Replay ให้จบแมตช์ได้ก่อนเพิ่ม card effects ซับซ้อน
4. Bot ใช้ resolver เดียวกันและหยุดเมื่อ Match จบ
5. Content Pool ให้พอกับจำนวนเหตุการณ์และกันเนื้อหาซ้ำตามหมวดจริง (ไม่สร้าง Story Mission ใหม่)
6. Focused tests และ Browser QA หนึ่งแมตช์เต็ม: Card/Basic, double confirm, deck exhaustion, Bot, winner/draw และ Replay
7. Visual polish เป็นขั้นสุดท้าย

สถานะหลัง Audit: **ยังไม่ได้ implement รายการข้างต้น**. ผล Regression/Browser QA ใน CURRENT DEMO เป็นผลจากรอบพัฒนาก่อนหน้า ไม่ใช่การยืนยันว่ามีคะแนนหรือเล่นจบแล้ว หยุดรอคำสั่งเจ้าของก่อนพัฒนาต่อ

## ประวัติและรายละเอียด — Deck → Create Practice Room → Bot Game

สถานะ: **แก้ Scroll/Exit แล้ว / จัด Deck แล้วไปหน้าสร้างห้องฝึก / 1 ผู้เล่น + 1 Bot ในเครื่องนี้ / Legacy Battle ถูกนำออก / ไม่ Apply Supabase / ไม่ Deploy**

นโยบายล่าสุดจากเจ้าของ: **ไม่เก็บ Legacy Battle** และเลือกให้ห้องเป็น **ห้องฝึกกับ Bot สำหรับเดโมในเครื่องนี้**. นโยบายนี้แทนที่คำสั่งรักษา Legacy ในประวัติด้านล่างทั้งหมด ห้ามนำ Legacy กลับมาเปิดใช้เอง

Flow ที่ใช้งาน:

`Character Selection / Saved Preset → Deck Builder → บันทึก Deck และไปสร้างห้องฝึก → ตั้งชื่อ → สร้างห้องฝึก → เริ่มเกมกับ Bot`

สิ่งที่แก้:

- สาเหตุ Scroll คือ CSS เดิมล็อก `html/body/#map-root` สูง 100% และ overflow hidden; nested loadout overflow ทำให้ sticky header ไม่ตาม viewport
- เปลี่ยน shared map CSS เป็น base สำหรับ Scenario และให้ root/loadout ไหลตาม document; `overflow-x:clip` ป้องกัน horizontal overflow โดยไม่สร้าง scroll container ที่ขัด sticky header
- แถบกลับ Lobby/คลังการ์ดอยู่ด้านบนแบบ sticky จึงออกได้แม้เลื่อนถึงท้าย Deck
- ปุ่มยืนยัน Deck บันทึก preset local และเตรียม Session สำหรับห้อง ก่อนเปลี่ยนไป `practice-room.html`; ไม่เริ่มเกมทันทีและไม่เรียก Save/Room RPC เดิม
- ห้องฝึกตั้งชื่อได้ แสดง Character และลำดับการ์ดเดิม ผู้เล่น/Bot พร้อมแล้วจึงเริ่ม; ไม่มี room code หรือการเชิญเพื่อนที่แสร้งเป็นออนไลน์
- `practice-room.mjs` แยก account, Free-only Character, current card eligibility/policy และ PREPARED→WAITING→STARTED; URL practice flag เพียงอย่างเดียวไม่ให้ข้ามชุดที่ตรวจแล้ว
- Card eligibility ยังอ่าน Starter/Ownership จาก Server ก่อนใช้; Session/localStorage preferences ไม่ใช่สิทธิ์ unlock
- กลับจากเกมไปห้องฝึกได้ และออกห้องไป Lobby โดยล้างเฉพาะ Room Session; preset ที่บันทึกยังอยู่
- Refresh เกมเริ่ม local practice match ใหม่ ไม่ใช่ระบบ save match progress และไม่ใช่ Multiplayer sync

Legacy retirement:

- ลบ `map-3d.js`, `ai-world.js`, `room.js` และโค้ดเฉพาะ Legacy อีก 22 ชื่อไฟล์ รวม MapScene/District/Building/Action Inventory/Result panels, District/IP/Action/Item/Battle/Result engines, Legacy scenario resolver และ tests/docs ของส่วนที่ถูกนำออก
- ลบไฟล์ชื่อเหล่านี้จาก Source, `dist` และ nested transfer copies ด้วย exact paths ไม่มีการลบ directory ทั้งชุด
- Game mode default และ URL mode เก่าทั้งหมดเข้าฝั่ง Scenario; entry ไม่ import Legacy อีก
- `ai-world.html` และ `room.html` เหลือ compatibility redirect ไปหน้าห้องฝึก ไม่มี Legacy Character/Item/Room UI
- คลังการ์ดถาวรนำตัวจัดชุด Battle 3 ใบ/Save RPC/อ่าน player_card_loadouts ออก เหลือดูสิทธิ์และทางลัด Deck Scenario 5 ใบ
- นำลิงก์ Legacy ออกจาก Lobby; Friends profile เปิดห้องฝึกแทน และคำเชิญห้องระบบเก่าไม่มีปุ่ม join/decline หรือ RPC ตอบรับห้อง Legacy อีก
- เก็บ Scene/BoardTile/PlayerToken/BotToken/CharacterToken/Dice3D/turn-core/CityFoundation/CityProps/SkyDecor/TransitDecor และ seed/card metadata ที่ Scenario ยังใช้จริง ไม่สร้างตัวเดินใหม่
- `turn-manager.js` เหลือ re-export ของ shared turn-core; tests Dice/Movement/Turn order คงอยู่ ส่วน test Legacy tile events ถูกถอด
- ไม่ลบหรือแก้ Production tables, migrations, Auth, ownership, Quiz/Reward หรือ Story Mission; historical SQL files ไม่ใช่ Legacy game runtime ที่เปิดใช้งาน

ไฟล์เพิ่ม/แก้ (Source/`dist` ตรงกัน):

- `practice-room.html`, `practice-room.css`, `practice-room.js`, `practice-room.test.mjs`
- `scenario-adventure/practice-room.mjs`, `scenario-adventure/app.js`, `scenario-adventure/game-mode.js`, `scenario-adventure.css`
- `map-3d-entry.js`, `map-3d.html`, `map-3d.css`, `map-3d/README.md`, `map-3d/turn-manager.js`, `map-3d/turn-manager.test.mjs`
- `lobby.html`, `ai-world.html`, `room.html`, `friends.js`, `card-inventory.html`, `card-inventory.js`
- `friday-demo-hotfix01.test.mjs`, `saved-loadouts.test.mjs`, `README.md`
- Nested transfer runtime mirrors ถูกอัปเดตเพื่อไม่ให้เหลือ entry ที่ชี้ runtime Legacy ที่ลบแล้ว แต่รากยังเป็น source of truth

ผลตรวจ:

- Focused practice-room tests Source/`dist`: 12/12 ผ่าน
- Primary regression Source + `dist`: 259/259 ผ่าน; full `node --test` รวม transfer copy: 442/442 ผ่าน
- จำนวน tests ลดลงเพราะนำ suites ของ Legacy ที่ลบแล้วออก ไม่ใช่ข้าม test ที่ล้มเหลว; shared Dice/Movement/Turn และ Mission/Quiz/Reward regressions ผ่าน
- Runtime syntax checks ผ่าน และ hashes ของ Source/`dist` สำหรับรอบนี้ตรงกัน
- Browser QA ใช้ Mock Auth/Card Inventory กับ frontend/3D จริง: เลื่อน Deck จน `scrollTop=1104`, ถึงท้ายหน้าได้ (`scrollHeight=2052`, viewport 948), exit link ยังอยู่ที่ top=14
- Deck → หน้า Create Room → ตั้งชื่อ “ห้องฝึก MAMA วันศุกร์” → Waiting → เริ่ม Scene 3D ด้วย MAMASan/Deck เดิม → ทอย/เดินจนเปิด Scenario → กลับห้อง → ออกไป Lobby ผ่าน
- ฟอร์มสร้างห้องซ่อนหลังสร้างแล้ว, console warn/error ของ Flow ที่ตรวจไม่มี; ไม่มี Server Room RPC หรือ Supabase writes ใน QA
- Authenticated E2E กับบัญชีจริง: ไม่ได้ตรวจในรอบนี้; Browser QA ไม่ใช่การยืนยันระบบห้องออนไลน์
- โฟลเดอร์นี้ไม่มี `.git`; ไม่อ้าง git diff/status ผ่าน; QA server/harness ถูกหยุดและลบหลังตรวจ เซิร์ฟเวอร์จริงพอร์ต 4174 ยังเปิด

งานถัดไป: หยุดรอคำสั่งเจ้าของ ไม่เปิด Multiplayer, Migration หรือ Deploy อัตโนมัติ

## SAVED CHARACTER + DECK PRESETS — Local Demo

สถานะ: **บันทึกชุด S+ Character + Deck 5 ใบใน Browser ได้ / แยกตามบัญชี / Free 3 เท่านั้น / ไม่ใช่ Cloud Save / ไม่แก้ Supabase / ไม่ Deploy**

สาเหตุที่ยังพบหน้าเลือกซ้ำจากภาพผู้ใช้: ปุ่มหลักใน Lobby “เข้าสู่ AI World” ยังชี้ `ai-world.html` ซึ่งเป็น Legacy Preparation ของ NOVA/MIRA/ARIA/KAI แม้ Scenario back/exit links ถูกแก้ใน Hotfix 01 แล้ว ตัวละคร Legacy และ S+ เป็นคนละ catalog และไม่มี Server mapping ที่อนุมัติ จึงไม่แปลง ID หรือแก้ room RPC

สิ่งที่เปลี่ยน:

- Main Lobby portal เปลี่ยนเป็น “ตัวละครและเด๊กของฉัน” → S+ Character Selection; เพิ่มลิงก์ Legacy ที่ระบุ Agent/Item/Room ชัดเจน
- หน้า `ai-world.html` ระบุว่าเป็น Legacy District Battle และมีปุ่มเปิดชุด S+ เดิม; Legacy character/item/room logic ยังใช้เดิม
- Deck Builder มีช่องชื่อชุด, บันทึกชุดในเครื่อง, รายการชุดที่บันทึก และเรียกใช้ชุดได้ สูงสุด 8 ชุด; ใช้ชื่อเดิมเพื่ออัปเดตชุดเดิม
- เก็บ Character ID และลำดับ Card IDs 5 ใบที่ผู้เล่นจัดเอง ไม่แก้ ownership หรือแจกการ์ด; key ของ localStorage แยกตาม authenticated account ID
- คืนชุด active ล่าสุดเมื่อกลับ Deck Builder ด้วย Character เดียวกัน และมีปุ่ม “ใช้ชุดที่บันทึก” ใน Character Selection เพื่อคืนตัวละคร/Deck หลัง Session หายโดยไม่ต้องเลือกใหม่
- Start game บันทึกชุด local ด้วย; RPC save deck เดิมยังคงใช้เฉพาะเมื่อ Backend persistence พร้อม ไม่มีการ Apply schema หรือ RPC ใหม่
- ก่อนเรียกใช้ต้องตรวจ Free-only Character และ Card IDs ตาม `inventory.allowedIds` ที่อ่านจาก Server/Starter policy ปัจจุบัน รวมกติกาซ้ำ/จำนวนใบ; saved flags ไม่ใช่สิทธิ์
- หาก saved deck ใช้ไม่ได้ตามสิทธิ์/กติกาใหม่ จะไม่ restore โดยพลการและแจ้งให้จัดชุดใหม่; storage ล้มเหลวแจ้งว่าไม่ได้บันทึก
- ชุด local ไม่ sync ข้ามเครื่อง/Browser/origin และหายได้หากล้าง site data; การบันทึกนี้เป็น preferences ไม่ใช่หลักฐาน ownership

วิธีใช้:

1. เปิด `character-selection.html` ผ่านเซิร์ฟเวอร์และ Login
2. เลือก Alexander/MAMASan/Milo หรือกด “ใช้ชุดที่บันทึก”
3. จัดการ์ด 5 ใบ ตั้งชื่อ แล้วกด “บันทึกชุดในเครื่อง” (บันทึกโดยไม่ต้องเริ่มเกม)
4. ครั้งถัดไปกด “ใช้ชุดที่บันทึก” หรือเลือกชื่อใน Deck Builder → “เรียกใช้ชุดนี้”; เริ่มเกมใช้ UI Identity เดิมและ Token 3D เดิม

ไฟล์ที่เปลี่ยน/ซิงก์ Source + `dist`:

- `scenario-adventure/saved-loadouts.mjs`, `saved-loadouts.test.mjs`
- `scenario-adventure/app.js`, `scenario-adventure.css`
- `character-selection.js`, `character-selection.html`
- `lobby.html`, `ai-world.html`
- `map-3d-entry.js`, `map-3d.html` (cache versions)
- `friday-demo-hotfix01.test.mjs`, `phase5c.test.mjs` (เพิ่ม saved-preference dependencies ให้ UI harness เดิม)
- `README.md`

ผลตรวจ:

- Saved-loadout focused tests: Source 8/8, Source + `dist` 16/16 ผ่าน; exact order, named updates, account isolation, locked characters, current ownership/policy, corrupt/denied storage และ preset limit
- Primary full regression: 294/294 ผ่าน; full `node --test` รวม nested copy เดิม: 524/524 ผ่าน
- Runtime/Test JavaScript syntax checks: ผ่าน; Source/`dist` SHA-256 ของไฟล์รอบนี้ตรงกัน
- Browser QA แบบ Mock Auth/Card Inventory กับ Source/3D Scene จริง: เลือก MAMASan, เปลี่ยนช่องที่ 5 จาก Firewall Guard เป็น Energy Boost, ตั้งชื่อ “เด๊ก MAMA ของฉัน”, Save → Refresh แล้วยังคงชื่อ/Character/Deck order ที่แก้ไว้
- Browser QA: ล้างเฉพาะ Session ผ่าน QA fixture → เปิด Character Selection → “ใช้ชุดที่บันทึก” → คืน MAMASan พร้อม Deck เดิมและเริ่ม Scene 3D ได้ ไม่มีตัวเลือกซ้ำและไม่มี console warn/error
- ไม่ได้ตรวจ authenticated E2E กับบัญชี Supabase จริงในรอบนี้; ไม่แก้ Auth/Database/Card reward/Story Mission/Dice/Movement/Turn/Token logic
- Legacy เปลี่ยนข้อความ/ทางลัดหน้าเตรียมเท่านั้น; `ai-world.js` และ room/Legacy game logic ไม่ได้เปลี่ยน
- โฟลเดอร์นี้ไม่มี `.git`; ไม่อ้างว่า git diff/status ผ่าน
- QA server และ temporary harness ถูกหยุด/ลบหลังตรวจ; เซิร์ฟเวอร์จริงพอร์ต 4174 ยังคงใช้งาน

งานถัดไป: รอคำสั่งเจ้าของ; Cloud Save ข้ามเครื่องต้องเป็นงานแยกที่ตรวจ schema/RLS และขออนุมัติฐานข้อมูลก่อน

## FRIDAY DEMO HOTFIX 01 — Remove Duplicate Character Selection

สถานะ: **Hotfix Local เสร็จ / เลือก S+ Character ครั้งเดียวก่อน Deck Builder / Free 3 เท่านั้น / ไม่เปลี่ยน Token 3D / ไม่แก้ Supabase / ไม่ Deploy / หยุดรอคำสั่งถัดไป**

Root cause ที่ตรวจจาก Source:

- Flow ตรง `character-selection.html` → `map-3d.html?mode=scenario-adventure` เดิมอ่าน Session และไม่มี Character Selection Modal ภายใน Scenario app อยู่แล้ว
- แต่ลิงก์กลับจาก Deck Builder และลิงก์ออกจาก Scenario Game ชี้ไป `ai-world.html` ซึ่งเป็น Legacy Preparation และมี Character Selection อีกชุด (`#character-grid`, profile/room character code). เมื่อเดินผ่านลิงก์เหล่านี้จะพบหน้าเลือกซ้ำ; เป็น navigation ข้ามโหมด ไม่ใช่ความจำเป็นของ Scenario gameplay
- App เดิมอ่าน Character Session ตอน import เพียงครั้งเดียวและ fallback เป็น `S+ AGENT` หากว่าง; entry guard ไม่ครอบคลุม Session ที่ถูกล้างระหว่าง Auth/Inventory loading หรือก่อนเริ่มเกม

สิ่งที่แก้:

- เปลี่ยนเฉพาะ Scenario back/exit links ไป Lobby เพื่อไม่พาผู้เล่นกลับเข้า Legacy Character Preparation
- Scenario app อ่าน canonical Character จาก Session หลัง Auth, หลังโหลด Inventory และก่อน/หลัง Save Loadout; Session ไม่ถูกต้อง redirect กลับ Character Selection ด้วย `location.replace` โดยไม่ mount/start game
- แสดงชื่อ Character ที่ตรวจแล้วเป็น UI Identity ใน Deck Builder และ Game Header; ไม่ใช้ fallback แทน ID ที่หาย
- Session helper คืน `null`/`false` หาก Browser storage ใช้ไม่ได้; คง validator Free-only เดิม และไม่เชื่อ displayName/ownership/unlocked flags จาก Client
- เพิ่ม cache version สำหรับ Map Entry/Scenario app ให้โหลด Hotfix ใหม่
- ไม่เพิ่มหน้าหรือ Modal เลือกตัวละคร ไม่เปลี่ยน Deck rules, Dice, Movement, Turn logic, Player/Bot Token หรือ Legacy preparation

ไฟล์ที่เปลี่ยน (รวม Source/`dist` mirror):

- `characters/character-session.js`
- `scenario-adventure/app.js`
- `map-3d-entry.js`, `map-3d.html`
- `friday-demo-hotfix01.test.mjs`
- Root `README.md` และ `dist/README.md`

ผลทดสอบ:

- Focused Hotfix tests: Source 9/9, Source + `dist` 18/18 ผ่าน; ครอบคลุม Free 3, Locked 6/client flags, malformed/missing/unknown Session, storage errors, Scenario/Legacy entry isolation, Auth/Inventory revalidation และ Session หายระหว่าง Save/Start
- Primary full regression (Source + `dist`, ไม่รวม nested copy): 278/278 ผ่าน
- Full `node --test` รวม nested สำเนาเก่า: 508/508 ผ่าน; nested ไม่ถูกใช้เป็น source of truth
- JavaScript syntax checks ของไฟล์ runtime/test ที่เปลี่ยน: ผ่าน
- Source/`dist` SHA-256 สำหรับไฟล์รอบนี้: ตรงกัน
- โฟลเดอร์นี้ไม่มี `.git`; จึงไม่รายงานว่า git status/diff check ผ่าน

Browser QA ที่ตรวจจริง:

- ใช้ Temporary Local QA Server ที่ mock เฉพาะ Auth/Card Inventory และปิด RPC writes; frontend, Deck engine, Scene 3D, Dice, Movement และ Turn flow ใช้ Source จริง ไม่ต่อ Supabase Production
- เลือก Milo ใน Character Selection ครั้งเดียว → Deck 5 ใบ → เข้า Scene 3D ได้ทันที; Game Header แสดง Milo โดยไม่มี selection page/modal คั่น
- ทอยได้ เดินถึงช่อง เปิด Scenario, ใช้ Basic Response, จบเทิร์น → Bot ทำเทิร์น → กลับ Player สำเร็จ และ UI Identity ยังคง Milo
- เลือก Alexander → Deck Builder → Refresh ยังแสดง Alexander, ไม่มี Dialog และไม่มีลิงก์ไป Legacy `ai-world.html`
- Missing Session, malformed JSON และ forged Nancy/unlocked flag ผ่าน Map entry แล้ว redirect กลับ Character Selection; Nancy ไม่มีปุ่มเลือกเข้าเกม
- Console warn/error ของ Flow Milo: ไม่มี
- Authenticated E2E ด้วย Supabase จริง และ Legacy Browser Match: **ไม่ได้ตรวจในรอบนี้**; Legacy entry/engine regression ตรวจด้วย Automated Tests และไม่มีการแก้ Legacy Source
- หยุด QA server/ลบ temporary harness หลังตรวจ; ไม่มีการ Apply Migration, เปลี่ยน Supabase, แก้ Story Mission หรือ Deploy

งานถัดไป: **หยุดรอคำสั่งเจ้าของโปรเจกต์**; ไม่เริ่ม Phase 5C Staging/Final Quiz หรือ Hotfix รอบอื่นอัตโนมัติ

## MACHINE TRANSFER CHECKPOINT — อ่านส่วนนี้ก่อนทำงานต่อ

สถานะส่งต่อ: **Phase 5B เสร็จ / Phase 5C Local Foundation + SQL Draft พร้อม / PostgreSQL Integration ยังไม่ Verified / Nancy ยังเลือกเข้าเกมไม่ได้ / ไม่ Apply Supabase / ไม่ Deploy**

จุดที่ต้องทำต่อคือ **Staging Verification และ Mission 02 Content/Final Assessment Approval** ตาม `CHARACTER_UNLOCK_MIGRATION_PLAN.md`; ห้ามเปิด Nancy mapping จนข้อมูลจริงและเกณฑ์ผ่านได้รับอนุมัติ ไม่ย้อนกลับไปทำ Phase 5A–5B ใหม่

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

### งานถัดไปหลัง Phase 5C Local Foundation

1. อนุมัติ Mission 02 เนื้อหา, Production Lesson/Quiz ID จริง, passing score และ Nancy mapping
2. ตรวจ schema/RPC/grants จริงใน Staging โดยเฉพาะ provenance ของ server-created `quiz_attempts`; ห้ามยืนยันจาก static tests เพียงอย่างเดียว
3. Apply Draft ใน Staging ที่ได้รับอนุมัติ แล้วทดสอบ RLS, account isolation, eligibility, retry/concurrent claim และ regression Mission 01 ตาม Migration Plan
4. ตรวจ advisory ของ `private.quiz_answer_keys` แยกก่อน Production
5. เมื่อผ่านจึงทำ rollout Claim UI และ character session/game entry ที่อ่านสิทธิ์ Server ใหม่; รอบนี้ยัง Free-only และไม่มี Claim UI
6. Production Apply, Nancy seed และ Deploy ต้องอนุมัติแยก; อัปเดต README และ `dist/` ทุกครั้ง

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

## PHASE 5C — Secure Character Unlock Local Foundation

สถานะ: **Local code + SQL Draft พร้อม / ไม่มี Reward seed / Nancy ยังเล่นไม่ได้ / ไม่ Apply Supabase / ไม่ Deploy**

สิ่งที่ทำเสร็จ:

- สร้าง `CHARACTER_UNLOCK_MIGRATION_PLAN.md` พร้อม prerequisites, schema assumptions, staging verification matrix และ rollback checklist
- เพิ่ม `supabase/character_unlock_phase5c.DRAFT.sql`: canonical catalog 9 IDs, server-only lesson/quiz/character mapping, own-row ownership RLS และ explicit grants/revokes
- RPC Draft `claim_character_reward(text)` รับเพียง lesson code; ตรวจ Auth, active/approved mapping และ quiz policy, server attempts/score/max score/cutoff; ใช้ transaction locks และ primary key กันรับซ้ำ
- Draft abort/Claim refuse เมื่อ browser roles มีสิทธิ์เขียน quiz attempts โดยตรง รวม column grants; ต้องตรวจ RPC อื่นและ provenance จริงใน Staging เพิ่มเติม
- ไม่มี Mission 02 Production ID ที่สร้างเองและไม่มี seed Nancy mapping; Quiz/Card reward เดิมไม่ถูกแก้
- เพิ่ม read-only `characters/character-ownership.mjs`: Auth ก่อน/หลัง request, account/ID/audit validation, timeout/abort และไม่มี cache/storage unlock
- Character Selection แสดง FREE/LOCKED/UNLOCKED/LOADING/ERROR, retry และล้าง snapshot เมื่อบัญชีเปลี่ยน; Free 3 ตัวยังใช้ได้หาก ownership read ล้มเหลว
- UNLOCKED แสดงเฉพาะ server ownership snapshot; การเลือก/session/gameplay ยัง Free-only จน rollout ได้รับอนุมัติ ไม่มี Client Claim UI/call

ไฟล์ที่เพิ่ม/แก้:

- `characters/character-ownership.mjs`
- `character-selection.js`, `character-selection.html`, `character-selection.css`
- `supabase/character_unlock_phase5c.DRAFT.sql`, `phase5c.test.mjs`
- `CHARACTER_UNLOCK_MIGRATION_PLAN.md`, `CHARACTER_UNLOCK_CONTRACT.md`, `README.md`
- Source/`dist` mirror ของไฟล์ข้างต้น

ผลตรวจเครื่องนี้และการทดสอบ:

- โฟลเดอร์รากไม่มี `.git`; ตรวจ commit/diff ไม่ได้ จึงไม่อ้างว่า git diff check ผ่าน
- พบสำเนา nested `Ai-District-main/` จึงใช้ราก + `dist/` เป็น primary และคงสำเนา nested เดิม; ไม่รันหรือ Deploy จากสำเนานั้น
- Baseline `node --test`: 460/460 ผ่าน เพราะรวม nested สำเนาเก่า; primary baseline ตาม Phase 5B คือ 230 tests
- Focused Phase 5C ทั้ง Source/`dist`: 30/30 ผ่าน (Mock behavioral/UI harness + Static SQL assertions)
- Primary regression (Source + `dist`, ไม่รวม nested): 260/260 ผ่าน
- Full `node --test` รวม nested สำเนาเก่า: 490/490 ผ่าน; จำนวนเพิ่มจากสำเนาไม่ใช่ test coverage ใหม่
- JavaScript syntax checks ของ Ownership, Selection และ Tests: ผ่าน
- SHA-256 ของ Source/`dist` สำหรับไฟล์รอบนี้: ตรงกัน
- Browser QA แบบ Mock Auth/Ownership: Desktop + Tablet 1024×768 ผ่าน; ตรวจ LOADING→LOCKED, Free selection, Nancy detail/no select, Error/Retry, ไม่มี broken source image/scroll แนวนอน และไม่มี console warning/error
- QA ใช้ temporary loopback server ที่ mock เฉพาะ Auth/Ownership โดยไม่ต่อ Supabase; หยุด server และลบ harness หลังตรวจ ไม่ใช่ authenticated E2E กับ Production
- PostgreSQL/Staging migration/integration: **NOT RUN / NOT VERIFIED**; เครื่องนี้ไม่มี `psql` ใน PATH และยังไม่ได้รับอนุมัติ Apply
- Live Supabase schema/advisor ไม่ได้ตรวจใหม่; ใช้ pre-flight เดิมและ SQL ในโปรเจกต์สำหรับ Draft พร้อมระบุสิ่งที่ต้องตรวจจริงใน Migration Plan

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

