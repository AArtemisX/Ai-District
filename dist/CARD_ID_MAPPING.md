# Action Card ID Mapping — Phase 4B.2A

เอกสารนี้กำหนด Canonical Production ID สำหรับ Prototype ทั้ง 10 ใบ การ Mapping ไม่ได้ให้สิทธิ์ผู้เล่น และ Prototype จะยังเป็น `PROTOTYPE_ONLY` จนกว่า Supabase จะส่ง Production row ที่ตรงกันกลับมา

| Prototype ID | Canonical ID | Name | Prototype Type | Rarity | Artwork | Scenario Starter | Ownership หลัง Migration |
|---|---|---|---|---|---|---|---|
| prototype-privacy-shield | privacy-shield | Privacy Shield | DEFENSE | COMMON | assets/Luminous Shield for Private Data-1.png | Yes | Mode starter; ไม่สร้าง unlock row |
| prototype-firewall-guard | firewall-guard | Firewall Guard | DEFENSE | RARE | assets/Cyan Firewall Protecting a Luminous AI City-2.png | Yes | Existing global starter; ไม่สร้างซ้ำ |
| prototype-threat-shutdown | threat-shutdown | Threat Shutdown | ATTACK | COMMON | assets/Emergency Stop Powers Down AI Core-3.png | Yes | Mode starter; ไม่สร้าง unlock row |
| prototype-system-countermeasure | system-countermeasure | System Countermeasure | ATTACK | RARE | assets/Radiant Circuit Intercepts Crimson Shards-4.png | No | Locked จนมี server entitlement |
| prototype-recovery-protocol | recovery-protocol | Recovery Protocol | SUPPORT | COMMON | assets/Mint light core repair-5.png | Yes | Mode starter; ไม่สร้าง unlock row |
| prototype-human-assistance | human-assistance | Human Assistance | SUPPORT | RARE | assets/Human-AI teamwork at a holographic workstation-6.png | No | Locked จนมี server entitlement |
| prototype-data-audit | data-audit | Data Audit | STRATEGY | COMMON | assets/Spotting the Odd Data Crystal-7.png | Yes | Mode starter; ไม่สร้าง unlock row |
| prototype-explainability-insight | explainability-insight | Explainability Insight | STRATEGY | RARE | assets/Transparent AI Brain with Glowing Pathways-8.png | No | Locked จนมี server entitlement |
| prototype-ethical-override | ethical-override | Ethical Override | SPECIAL | EPIC | assets/Golden Balance Guiding a Purple AI Core-9.png | No | Locked จนมี server entitlement |
| prototype-responsible-ai-protocol | responsible-ai-protocol | Responsible AI Protocol | SPECIAL | EPIC | assets/Golden Codex of Responsible AI-10.png | No | Locked จนมี server entitlement |

หมายเหตุ:

- Production schema เดิมรองรับ `ATTACK`, `DEFENSE`, `CONTROL`, `SUPPORT`; migration draft จึงเก็บ Prototype Type ของ `STRATEGY`/`SPECIAL` ใน `education.prototypeType` และใช้ `CONTROL` เป็น compatibility type โดยไม่แก้ constraint เดิม
- `firewall-guard` เป็น ID เดิมเพียงรายการเดียว ไม่มีการเพิ่มแถวซ้ำ
- การใช้ mode starter ให้สิทธิ์เฉพาะการจัด Scenario Loadout ไม่เท่ากับ Permanent Unlock
- `user_card_unlocks` และ RPC ฝั่งเซิร์ฟเวอร์ยังเป็นแหล่งยืนยันสิทธิ์ถาวร

