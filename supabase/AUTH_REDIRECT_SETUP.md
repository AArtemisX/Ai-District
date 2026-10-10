# Supabase Auth Redirects — Ai District

ตั้งค่าที่ **Supabase Dashboard → Authentication → URL Configuration**

## Site URL

```text
https://neon-nexus-login-lobby.teanamaster.chatgpt.site
```

## Redirect URLs

เพิ่ม URL ต่อไปนี้แบบตรงตัว:

```text
https://neon-nexus-login-lobby.teanamaster.chatgpt.site/confirm-email.html
https://neon-nexus-login-lobby.teanamaster.chatgpt.site/reset-password.html
http://localhost:4173/confirm-email.html
http://localhost:4173/reset-password.html
```

ค่า production ต้องไม่มี `localhost:3000` มิฉะนั้นลิงก์จากอีเมลจะพาไปหน้าที่เปิดไม่ได้

## Email Templates

ใน **Authentication → Email Templates** ให้ลิงก์ของ Confirm signup และ Reset password ใช้ตัวแปรนี้:

```html
<a href="{{ .ConfirmationURL }}">เปิดลิงก์</a>
```

`ConfirmationURL` จะรวม `redirect_to` ที่ส่งมาจากหน้าเว็บให้อัตโนมัติ

## ไฟล์หน้าเว็บ

- `confirm-email.html` + `confirm-email.js` — แสดงผลการยืนยันอีเมล
- `reset-password.html` + `reset-password.js` — ตั้งรหัสผ่านใหม่
- `auth-pages.css` — รูปแบบหน้าทั้งสอง

