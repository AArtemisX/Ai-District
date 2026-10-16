# Deploy AI District: หน้าเว็บบน Vercel + ห้องออนไลน์บน Render

> อัปเดต: 16 ตุลาคม 2026 · เขียนให้เจ้าของทำเองทีละขั้น

## ภาพรวม

```
ผู้เล่น ──► https://<โดเมน Vercel>/...        หน้าเว็บ (Vercel เสิร์ฟจาก dist/ เหมือนเดิม)
        └─► https://<โดเมน Vercel>/api/...    Vercel ส่งต่อ (rewrite) ──► https://<service>.onrender.com/api/...
                                               room server (Node) บน Render เก็บห้องและเดิน Bot
```

- **Vercel** ทำหน้าที่เดิม คือเสิร์ฟหน้าเว็บ ไม่ต้องเปลี่ยนโปรเจกต์หรือโดเมน
- **Render** รัน `scenario-online-server.mjs` ค้างไว้ตลอด เพราะห้องเก็บในหน่วยความจำและ Bot ต้องมี server เดินเทิร์นให้ ซึ่ง Vercel (serverless) ทำไม่ได้
- `vercel.json` บอก Vercel ให้ส่ง `/api/*` ต่อไปที่ Render Browser จึงเห็นทุกอย่างเป็นโดเมน Vercel เดียว ไม่ต้องตั้ง CORS เพิ่ม

**ทำไมก่อนหน้านี้ใช้ไม่ได้:** รอบแรกหน้าเว็บยิงไปที่ `127.0.0.1:4180` (เครื่อง Mac) จึงขึ้น `Load failed` พอแก้ให้เรียก `/api` ในโดเมนตัวเอง Vercel ก็ส่งหน้า 404 (HTML) กลับมา Safari อ่านเป็น JSON ไม่ได้ จึงขึ้น `The string did not match the expected pattern` ตอนนี้ถ้า server ยังไม่พร้อม จะขึ้นข้อความไทยที่อ่านเข้าใจแทน

## ขั้นที่ 0 — push โค้ดขึ้น GitHub

remote ของ repo นี้ชื่อ `github`

```bash
git -C /Users/tanapolauyporn/Documents/Ai-District push github main
```

## ขั้นที่ 1 — สร้าง room server บน Render

**วิธี Blueprint (แนะนำ ใช้ `render.yaml`):**

1. Render Dashboard → **New +** → **Blueprint**
2. เชื่อม GitHub แล้วเลือก repo `AArtemisX/Ai-District` (branch `main`) → **Apply**
3. รอจนสถานะเป็น **Live**

**หรือสร้าง Web Service เอง:**

| ช่อง | ค่า |
|---|---|
| Root Directory | `dist` |
| Runtime | Node |
| Build Command | `echo "no build"` |
| Start Command | `node scenario-online-server.mjs` |
| Health Check Path | `/api/health` |
| Environment | `NODE_VERSION` = `22`, `AI_DISTRICT_TRUST_PROXY` = `1` |
| Instances | **1 เท่านั้น** (ห้ามเพิ่ม scale) |

4. คัดลอก URL ของ service จากหน้า Render เช่น `https://ai-district.onrender.com` (ถ้าชื่อซ้ำกับคนอื่น Render จะเติมตัวอักษรต่อท้าย)
5. ทดสอบ: เปิด `https://<service>.onrender.com/api/health` ต้องเห็น `{"ok":true,...}`

## ขั้นที่ 2 — ชี้ Vercel ไปที่ Render

1. เปิดไฟล์ `vercel.json` แล้วเปลี่ยน `ai-district.onrender.com` เป็นโดเมน Render จริงของคุณ (ถ้าตรงกันอยู่แล้วไม่ต้องแก้)

   ```json
   { "source": "/api/:path*", "destination": "https://<service>.onrender.com/api/:path*" }
   ```

2. มี `vercel.json` อยู่ 2 ที่และต้องเหมือนกัน คือรากของ repo และ `dist/vercel.json` Vercel จะใช้ไฟล์ที่อยู่ใน **Root Directory** ของโปรเจกต์ (ดูได้ที่ Vercel → Settings → Build and Deployment) ถ้าแก้ ให้แก้ทั้งสองไฟล์
3. commit แล้ว push:

   ```bash
   git -C /Users/tanapolauyporn/Documents/Ai-District commit -am "Point Vercel /api rewrite to Render"
   ```

   ```bash
   git -C /Users/tanapolauyporn/Documents/Ai-District push github main
   ```

4. Deploy บน Vercel ตามปกติ (ถ้า Vercel ผูกกับ GitHub จะ Deploy เองหลัง push)

## ขั้นที่ 3 — ตรวจหลัง Deploy

1. เปิด `https://<โดเมน Vercel>/api/health` ต้องเห็น `{"ok":true,...}` ซึ่งแปลว่า Vercel ส่งต่อถึง Render แล้ว
   - ถ้าเห็นหน้า 404 ของ Vercel: `vercel.json` ไม่ได้อยู่ใน Root Directory ของโปรเจกต์ หรือยังไม่ได้ Deploy ใหม่
2. เปิดเว็บที่โดเมน Vercel → ล็อกอิน → hard refresh 1 ครั้ง
3. **Ai Word → สร้างห้องใหม่** → เพิ่ม Bot → พร้อม → เริ่มผจญภัย → เล่นจนถึงหน้าผลลัพธ์
4. บนกระดานต้องเห็นช่องโบนัสสีเขียว ⏩ ★ ♥ ☕

## ข้อจำกัดที่ควรรู้

- **Render แพ็กเกจ Free จะหลับ** เมื่อไม่มีคำขอประมาณ 15 นาที คำขอแรกหลังหลับใช้เวลาราว 30–60 วินาที ช่วงนั้นหน้าเว็บอาจขึ้น "ยังติดต่อ server ห้องออนไลน์ไม่ได้" ให้รอแล้วลองใหม่ ก่อนสาธิตให้เปิด `https://<โดเมน Vercel>/api/health` ปลุกไว้ก่อน หรือใช้แพ็กเกจที่ไม่หลับ (เงื่อนไขแพ็กเกจให้ตรวจในหน้า Render อีกครั้ง)
- **ห้องอยู่ในหน่วยความจำ:** Deploy ใหม่ รีสตาร์ท หรือหลับ จะทำให้ห้องที่เปิดอยู่หายหมด ส่วนบัญชี การ์ด และความคืบหน้าบน Supabase ไม่หาย
- **instance เดียวเท่านั้น** ทั้งบน Render และห้ามมี room server ซ้ำ
- **Deploy Render ทุกครั้งที่ไฟล์เกมฝั่ง server เปลี่ยน** (`scenario-adventure/*.js`, `online-rooms.mjs`, `scenario-online-server.mjs` ฯลฯ) ไม่อย่างนั้นหน้าเว็บบน Vercel กับกติกาบน Render จะเป็นคนละเวอร์ชัน (`render.yaml` ปิด Auto Deploy ไว้ ต้องกด **Manual Deploy → Deploy latest commit**)

## แก้ปัญหาเบื้องต้น

| อาการ | สาเหตุและวิธีแก้ |
|---|---|
| `The string did not match the expected pattern` หรือ `ROOM_SERVER_UNAVAILABLE` | Vercel ยังไม่ส่งต่อ `/api` → ดูขั้นที่ 3 ข้อ 1 หรือ Render กำลังตื่น → รอแล้วลองใหม่ |
| `Load failed` | เปิดหน้าเว็บเวอร์ชันเก่าที่ยังยิงไป `127.0.0.1` → hard refresh หรือ Deploy Vercel ใหม่ |
| `ORIGIN_NOT_ALLOWED` | Render ไม่เห็นว่าคำขอมาจากโดเมนของคุณ → ตั้ง env บน Render `AI_DISTRICT_ORIGINS=https://<โดเมน Vercel>` (ถ้ามีหลายโดเมนให้คั่นด้วย `,`) แล้ว Deploy Render ใหม่ |
| `AUTH_OR_INVENTORY_UNAVAILABLE` | session หมดอายุหรือ Render ติดต่อ Supabase ไม่ได้ → ล็อกอินใหม่ แล้วดู Logs บน Render |
| `RATE_LIMIT` | ตรวจว่า Render ตั้ง `AI_DISTRICT_TRUST_PROXY=1` แล้ว |

## การพัฒนาในเครื่อง (เหมือนเดิม)

- static ที่ `http://127.0.0.1:4174` และ `node scenario-online-server.mjs` ที่ 4180 หน้าเว็บบน localhost จะเรียก `:4180` ให้อัตโนมัติ
- หรือเปิด `http://127.0.0.1:4180/` ตรงๆ ก็ได้ เพราะ server เสิร์ฟหน้าเว็บด้วย
