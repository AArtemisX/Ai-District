# Deploy AI District บน Render (Node server ตัวเดียว: หน้าเว็บ + ห้องออนไลน์)

> อัปเดต: 16 ตุลาคม 2026 · เอกสารนี้เขียนให้เจ้าของทำเองทีละขั้น

## ทำไมของเดิมสร้างห้องไม่ได้

ที่ผ่านมาเว็บถูก Deploy แบบ **static** จากโฟลเดอร์ `dist/` (ดู `.openai/hosting.json`) ซึ่งมีแค่ไฟล์หน้าเว็บ ส่วนระบบห้องออนไลน์ต้องมี **Node server** (`scenario-online-server.mjs`) คอยรันอยู่ หน้าเว็บที่ Deploy แล้วจึงยิงไปหา `http://127.0.0.1:4180` ซึ่งมีอยู่แค่ในเครื่อง Mac เท่านั้น ผลคือขึ้น `เชื่อมต่อไม่สำเร็จ: Load failed`

**วิธีแก้ (ทำในโค้ดแล้ว):** ให้ Node server ตัวเดียวเสิร์ฟทั้งหน้าเว็บและ `/api/*` บนโดเมนเดียวกัน หน้าเว็บจะเรียก API ที่ origin ของตัวเองโดยอัตโนมัติ

## สิ่งที่ต้องมี

- บัญชี GitHub ที่เข้าถึง repo `AArtemisX/Ai-District` ได้
- บัญชี [Render](https://render.com) (สมัครด้วย GitHub ได้)
- **push branch `main` ล่าสุดขึ้น GitHub ก่อน** (commit ในเครื่องยังไม่ได้ push)

```bash
git -C /Users/tanapolauyporn/Documents/Ai-District push github main
```

## วิธีที่ 1 — Blueprint (แนะนำ ใช้ `render.yaml` ที่เตรียมไว้)

1. เข้า Render Dashboard → **New +** → **Blueprint**
2. เชื่อม GitHub แล้วเลือก repo `AArtemisX/Ai-District` (branch `main`)
3. Render จะอ่าน `render.yaml` และแสดง service ชื่อ `ai-district` → กด **Apply** / **Deploy Blueprint**
4. รอจนสถานะเป็น **Live** (ครั้งแรกประมาณ 1–3 นาที)

ค่าที่ `render.yaml` ตั้งให้:

| ค่า | ตั้งเป็น |
|---|---|
| Runtime | Node (เวอร์ชัน 22 ผ่าน `NODE_VERSION`) |
| Root Directory | `dist` (โฟลเดอร์เดียวกับที่เคย Deploy แบบ static) |
| Build Command | ไม่มี build จริง (แค่ `echo`) |
| Start Command | `node scenario-online-server.mjs` |
| Health Check | `/api/health` |
| Env `AI_DISTRICT_TRUST_PROXY` | `1` เพื่อให้จำกัดคำขอแยกตามผู้เล่น ไม่ใช้ IP ของ proxy ร่วมกันทุกคน |
| Auto Deploy | ปิดไว้ ต้องกด Deploy เอง |

## วิธีที่ 2 — สร้าง Web Service เอง (ถ้าไม่ใช้ Blueprint)

New + → **Web Service** → เลือก repo แล้วกรอกตามนี้

- **Root Directory:** `dist`
- **Runtime:** Node
- **Build Command:** `echo "no build"`
- **Start Command:** `node scenario-online-server.mjs`
- **Instance Type:** Free (หรือแบบเสียเงินถ้าไม่อยากให้หลับ ดูหัวข้อข้อจำกัดด้านล่าง)
- **Advanced → Health Check Path:** `/api/health`
- **Environment Variables:** `NODE_VERSION` = `22` และ `AI_DISTRICT_TRUST_PROXY` = `1`

ไม่ต้องตั้ง `PORT` เพราะ Render ใส่ให้เอง และ server จะเปิดฟังที่ `0.0.0.0` เองเมื่อเห็น `PORT`

## หลัง Deploy — ตรวจตามลำดับ

1. เปิด `https://<ชื่อ-service>.onrender.com/api/health` ต้องเห็น `{"ok":true,"mode":"scenario-online","persistence":"memory"}`
2. เปิด `https://<ชื่อ-service>.onrender.com/` จะเจอหน้าเข้าสู่ระบบ → ล็อกอินด้วยบัญชีเดิม
3. ไปที่ **ตัวละครและเด๊กของฉัน** → เลือกตัวละคร → **บันทึกชุดในเครื่อง** (เด็คเก็บใน Browser แยกตามโดเมน โดเมนใหม่จึงต้องบันทึกใหม่ 1 ครั้ง)
4. ไป **Ai Word** → **สร้างห้องใหม่** → เพิ่ม Bot → พร้อม → เริ่มผจญภัย → เล่นให้จบถึงหน้าผลลัพธ์
5. บนกระดานต้องเห็นช่องโบนัสสีเขียว ⏩ ★ ♥ ☕ (ถ้ายังไม่เห็นให้ hard refresh)

### ตั้งค่า Supabase (ทำครั้งเดียว)

การล็อกอินด้วยอีเมลและรหัสผ่านใช้ได้ทันทีบนโดเมนใหม่ แต่ **ลิงก์ในอีเมล** (ยืนยันอีเมล, รีเซ็ตรหัสผ่าน) จะพาไปที่โดเมนที่ Supabase รู้จักเท่านั้น

Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL:** `https://<ชื่อ-service>.onrender.com`
- **Redirect URLs:** เพิ่ม `https://<ชื่อ-service>.onrender.com/**`

## อัปเดตเวอร์ชันครั้งถัดไป

1. แก้โค้ดในเครื่อง แล้ว mirror ไฟล์ที่เปลี่ยนไปที่ `dist/` (Render deploy จาก `dist/`)
2. `node --test` ต้องผ่าน
3. commit แล้ว `git push github main`
4. Render → service `ai-district` → **Manual Deploy → Deploy latest commit**

## ข้อจำกัดที่ควรรู้

- **ห้องเก็บในหน่วยความจำ:** ทุกครั้งที่ Deploy ใหม่หรือ service รีสตาร์ท ห้องที่เปิดอยู่จะหายหมด ผู้เล่นต้องสร้างห้องใหม่ ส่วนข้อมูลบัญชี การ์ด และความคืบหน้าที่อยู่บน Supabase ไม่หาย
- **แพ็กเกจ Free ของ Render** จะหลับเมื่อไม่มีคนใช้ประมาณ 15 นาที คนแรกที่เข้าจะรอประมาณ 30–60 วินาที และห้องที่ค้างไว้จะหายตอนหลับ ถ้าจะใช้สาธิตจริงควรเปิดเว็บทิ้งไว้ก่อนเริ่ม หรือใช้แพ็กเกจเสียเงินที่ไม่หลับ (เงื่อนไขแพ็กเกจให้ตรวจในหน้า Render อีกครั้ง)
- **ต้องมี instance เดียว** ห้ามตั้ง scale มากกว่า 1 เพราะห้องอยู่ในหน่วยความจำของแต่ละเครื่อง
- โฮสต์ static เดิม (`.openai/hosting.json`) ยังเปิดหน้าเว็บได้ แต่โหมดออนไลน์จะใช้ไม่ได้ ให้แจก URL ของ Render แทน

## แก้ปัญหาเบื้องต้น

| อาการ | สาเหตุและวิธีแก้ |
|---|---|
| `Load failed` / เชื่อมต่อไม่สำเร็จ | ยังเปิดจากโดเมน static เดิม → ใช้ URL `onrender.com` หรือ service กำลังตื่นจากหลับ → รอแล้วลองใหม่ |
| `ORIGIN_NOT_ALLOWED` | หน้าเว็บกับ server อยู่คนละโดเมน → เปิดจาก URL ของ Render โดยตรง (ถ้าจำเป็นจริงๆ ตั้ง env `AI_DISTRICT_ORIGINS=https://โดเมนหน้าเว็บ` และตั้งที่อยู่ server ในหน้า Ai Word → ตั้งค่าการเชื่อมต่อ) |
| `AUTH_OR_INVENTORY_UNAVAILABLE` | server ติดต่อ Supabase ไม่ได้ หรือ session หมดอายุ → ล็อกอินใหม่ แล้วดู Logs ใน Render |
| `RATE_LIMIT` | เกิน 300 คำขอต่อนาทีต่อผู้เล่น → ตรวจว่าตั้ง `AI_DISTRICT_TRUST_PROXY=1` แล้ว |
| Deploy fail ที่ health check | ดู Logs ต้องมีบรรทัด `Scenario Online server: http://0.0.0.0:<port>` และตรวจว่า Root Directory เป็น `dist` |

## การพัฒนาในเครื่อง (เหมือนเดิม)

- หน้าเว็บ static ที่ `http://127.0.0.1:4174` และ room server ที่ `node scenario-online-server.mjs` (พอร์ต 4180) หน้าเว็บบน localhost จะเรียก `:4180` ให้อัตโนมัติ
- หรือเปิด `http://127.0.0.1:4180/` ตรงๆ ก็ได้ เพราะ server เสิร์ฟหน้าเว็บด้วย
