# AI District 2.0 — Gameplay Balance Contract v1.0 PROPOSAL

> สถานะ: **ข้อเสนอเพื่อขออนุมัติเท่านั้น — NOT IMPLEMENTED**  
> วันที่ตรวจ: 15 ตุลาคม 2026  
> Source of truth: root runtime files; `dist/` ไม่ถูกใช้เป็นต้นทาง  
> ห้ามนำค่าคอลัมน์ Proposed ไปใช้จริงก่อนเจ้าของอนุมัติ

## 1. Current mechanics matrix และข้อเสนอ

| Event | Current production rule | Proposed v1.0 / gate |
|---|---|---|
| ACTION | Effective `+3 RP / 0 Stability`; Partial `+1/-1`; Ineffective `0/-2`; Basic `+1/-1`. การ์ดต้องอยู่ในมือ เป็นของผู้เล่น และตรง context | **คงค่าปัจจุบัน.** Bot/ผู้เล่นเชิงเหตุผลควรใช้ Effective; ใช้ Basic แทน Partial เมื่อผลเท่ากันเพื่อเก็บการ์ด; หลีกเลี่ยง Ineffective |
| MOVEMENT | Forward `+2 ช่อง / +0 RP / 0 Stability`; Review `-2 ช่อง / +1 RP / 0 Stability`; ไม่เปิด Event ปลายทางและไม่ chain | **ยังไม่อนุมัติการเปลี่ยนค่า.** Candidate ที่ทดสอบ: Forward `+2 / +1/-1`, Backward `-2 / 0/+1`. Candidate สร้างทางเลือกระหว่างรางวัลกับความปลอดภัย แต่ทำให้ reward policy เด่นขึ้นภายใต้ RP-first จึง **ห้าม ship เดี่ยว ๆ** |
| SUPPORT | Report `+1 RP / 0`; Restore `0 RP / +1 Stability` สูงสุด 10 | **คงค่าปัจจุบัน.** UI/Bot ต้องไม่เลือก Restore เมื่อ Stability 10; Bot ควรพิจารณา Restore เมื่อ Stability ต่ำและ RP gap/เทิร์นที่เหลือเอื้อ |
| RISK | Accept `+1 RP / -1 Stability`; การ์ดใช้ ACTION scoring ตาม context จริง | **คงค่าปัจจุบัน.** Effective card ดีกว่า Accept; Partial card ให้ผลเท่า Accept แต่เสียการ์ด จึงให้ Bot เลือก Accept แทน Partial; Ineffective ห้ามเลือกเชิงกลยุทธ์ |
| DECISION | Pilot `+2 RP / -1 Stability`; Review `+1 RP / 0 Stability` | **คงค่าปัจจุบัน.** Bot เลือก Review เมื่อ Stability ต่ำ/นำคะแนนช่วงท้าย; เลือก Pilot เมื่อ Stability ยังปลอดภัยและต้องไล่ RP |

## 2. Simulation scope

- Development-only deterministic sampler: `gameplay-balance-sim.mjs`
- ใช้ production `openBoardEvent`, `resolveBoardEvent`, deck, scenario selection, tile mapping, score bounds และ winner resolver จริง
- 1,000 แมตช์ต่อ policy ต่อจำนวนผู้เล่น 2/3/4 ฝ่าย สำหรับ `SAFE`, `REWARD`, `RANDOM`; เพิ่ม 1,000 แมตช์ต่อจำนวนผู้เล่นสำหรับ `BOT_CURRENT`
- รวม current homogeneous 12,000 แมตช์, Movement candidate 9,000 แมตช์ และ head-to-head แบบหมุนตำแหน่งอีก 6,000 แมตช์ = **27,000 แมตช์ / 648,000 resolved events**
- ทุกฝ่ายเริ่มช่อง 0 เล่น 6 Event; ใช้ Starter-only loadout ที่ไม่สมมติสิทธิ์การ์ดล็อก: `patch-update`, `firewall-guard`, `energy-boost`, `patch-update`, `firewall-guard`
- Environment RNG แยกจาก policy RNG และ seed คงที่; การรันซ้ำได้ผลเดิม
- Candidate เปลี่ยนเฉพาะผล MOVEMENT ในตัวจำลอง ไม่แก้ runtime

## 3. Numerical evidence

### Event exposure ของ Bot ปัจจุบัน ต่อผู้เล่นต่อแมตช์

- 2 ฝ่าย: ACTION `2.035±1.154`, MOVEMENT `1.171±1.003`, SUPPORT `1.056±0.919`, RISK `0.986±0.898`, DECISION `0.752±0.723`
- 3 ฝ่าย: ACTION `2.057±1.139`, MOVEMENT `1.166±0.992`, SUPPORT `1.025±0.909`, RISK `0.988±0.885`, DECISION `0.764±0.726`
- 4 ฝ่าย: ACTION `2.028±1.162`, MOVEMENT `1.160±0.992`, SUPPORT `1.035±0.918`, RISK `1.004±0.910`, DECISION `0.773±0.736`
- ACTION ต่อคนมีช่วงจริง `0–6`; ความต่างจาก mapping 37.5% เกิดจากการเดินด้วยลูกเต๋าและ bonus movement ไม่ใช่การสุ่ม Event ใหม่

### Score / card / luck

- Bot ปัจจุบัน: RP เฉลี่ย `7.389 / 7.506 / 7.701`, Stability `7.673 / 7.708 / 7.819` ในเกม 2/3/4 ฝ่าย
- Card use `31.96–32.57%` ของ Event ทั้งหมด; Basic `8.40–8.72%`. ตัวเลข Card สูงเพราะ Bot ใช้ Partial ด้วย ไม่ได้หมายความว่าทุกการ์ดให้กำไรเหนือ Basic
- Effective card ให้ผลเหนือ Basic `+2 RP` และ `+1 Stability`; Partial เท่ากับ Basic แต่บริโภคการ์ด; Ineffective แย่กว่า Basic
- Dice-total ต่อ RP correlation ต่ำแต่ไม่เป็นศูนย์: Bot current `0.077 / 0.087 / 0.086`; homogeneous policies ทั้งหมดอยู่ประมาณ `0.05–0.16`
- ACTION-count ต่อ RP correlation ของ Bot current `0.130 / 0.188 / 0.226`; Event mix จึงมีผลชัดขึ้นเมื่อมีผู้เล่นมากขึ้น
- Homogeneous Bot seat win share: 2 ฝ่าย `51.2/48.8%`; 3 ฝ่าย `33.4/29.6/37.0%`; 4 ฝ่าย `23.8/26.2/24.6/25.5%`. ไม่พบ seat-order bias ระดับ demo-blocker

### Stability relevance และ policy head-to-head

- ใน mixed-policy match Stability ถูกใช้ตัดสิน top-RP tie `9.2% / 13.6% / 19.1%` สำหรับ 2/3/4 ฝ่าย; Draw `1.8% / 3.2% / 4.6%`
- Stability จึง **ไม่ใช่ศูนย์ความหมาย** แต่เป็น secondary stat อย่างชัดเจน
- Current reward policy ชนะ `69.8%` ต่อ safe ใน 2 ฝ่าย; ใน 3 ฝ่าย reward `63.9%`, safe `33.0%`, random `3.1%`; ใน 4 ฝ่าย reward `46.9%`, Bot current `29.3%`, safe `22.6%`, random `1.4%`
- Candidate MOVEMENT ทำให้ reward policy ชนะเพิ่มเป็น `80.3% / 76.3% / 59.9%` ใน 2/3/4 ฝ่าย และลด tiebreak rate เป็น `7.7% / 10.7% / 14.0%`; จึงไม่ผ่าน balance gate เมื่อใช้เดี่ยว ๆ
- Random policy เลือก Restore ตอน Stability เต็มเสียเปล่าประมาณ `15–16%` ของ SUPPORT encounters; rational policy และ Bot ปัจจุบันไม่เสียเปล่าเพราะ Bot เลือก Report ตายตัว

## 4. Main balance findings

- **P0:** ไม่พบ demo-blocker จาก scoring, seat order, event count หรือ winner resolver
- **P1 — MOVEMENT dominated choice:** Current Review ได้ `+1 RP` โดยไม่มีต้นทุน ขณะที่ Forward ไม่มีผลคะแนนและปลายทางไม่เปิด Event ทันที จึงไม่มีเหตุผลเชิงคะแนนที่ชัดให้เลือก Forward
- **P1 — RP-first strategy pressure:** Stability มีผลเฉพาะ top-RP tie; reward policy ชนะ safe อย่างมีนัยสำคัญ. Candidate Movement ตามโจทย์ยิ่งเพิ่มแรงกดไปทาง RP
- **P1 — Bot ไม่อ่านสถานะเกม:** `chooseEventIntent()` เลือก MOVEMENT Review, SUPPORT Report และ DECISION Review แบบคงที่ ไม่ดู RP, Stability, เทิร์นที่เหลือ หรือคะแนนคู่แข่ง; Local และ Server ใช้ helper เดียวกันจึงสอดคล้องกันแต่ยังไม่ adaptive
- **P1 — Partial card waste:** ACTION Partial เท่ากับ Basic และ RISK Partial เท่ากับ Accept แต่ Bot ยังใช้การ์ด Partial เมื่อไม่มี Effective
- **P2 — SUPPORT edge cases:** Restore ถูกครอบงำโดย Report ที่ Stability 10; ที่ Stability ต่ำ Restore มีค่าเฉพาะ tiebreak เพราะ Stability 0 ไม่แพ้ทันที
- **P2 — Six-turn variance:** ผู้เล่นอาจเจอ ACTION ตั้งแต่ 0–6 ครั้งในแมตช์เดียว แม้ค่าเฉลี่ยราว 2 ครั้ง; ยังไม่ใช่ P1 เพราะ dice-to-RP correlation ต่ำและทุกฝ่ายมี 6 Event เท่ากัน

## 5. Proposed Bot policy (NOT IMPLEMENTED)

1. ACTION: Effective card > Basic; ไม่ใช้ Partial/Ineffective เว้นแต่มี effect เพิ่มในอนาคตที่ resolver ยืนยันจริง
2. RISK: Effective card > Accept; ไม่ใช้ Partial เพราะผลคะแนนเท่ากันแต่เสียการ์ด
3. SUPPORT: Restore เมื่อ Stability `<=7`; ที่ Stability `8–9` Restore เฉพาะเมื่อนำ RP หรือเหลือไม่เกิน 2 เทิร์น; Stability 10 เลือก Report
4. DECISION: Review เมื่อ Stability `<=3`; เมื่อเหลือไม่เกิน 2 เทิร์นและนำ RP ให้ Review; กรณีอื่น Pilot
5. MOVEMENT: ใช้ current Review จนกว่าจะอนุมัติ rule ใหม่. หากอนุมัติ candidate ให้ Forward เมื่อ Stability `>=6` และต้องไล่ RP; มิฉะนั้น Backward
6. ต้องใช้ helper เดียวใน Local/Server, ตรวจเฉพาะข้อมูล server-authoritative และไม่แตะ ownership/idempotency

## 6. Freeze invariants

- 32 ช่องและ mapping `12/6/5/5/4`; START เปิด Event ปกติ
- 2–4 ฝ่าย, 6 resolved Events ต่อฝ่าย, หนึ่ง Event ต่อเทิร์น
- Movement Rule A, ไม่มี destination Event/START bonus/chaining
- RP `>=0`, Stability `0–10`, Stability 0 ไม่แพ้อัตโนมัติ
- RP primary, Stability tiebreak, co-winner/draw ตาม runtime จนกว่าจะอนุมัติเป็นลายลักษณ์อักษร
- Strict ACTION identity no-repeat; Non-ACTION ไม่ใช้ Scenario history
- Server authoritative; Local ใช้ resolver ร่วมแต่ไม่เป็น authority
- Deck/catalog/ownership, Room/Host/Surrender/Replay, Story/Quiz/Reward/Auth และ source/dist contract ต้องคงเดิม

## 7. Smallest implementation plan after approval

1. **Low risk:** ปรับ `chooseEventIntent()` ใน `scenario-adventure/board-events.js` ให้รับ score/turn context และแก้ caller Local/Server; เพิ่ม focused bot-policy tests
2. **Medium risk:** หากอนุมัติ MOVEMENT values ให้แก้เฉพาะ `EVENT_CONFIG`/catalog labels และ tests ของ resolver/Rule A; รัน simulation gate ซ้ำ. ไม่แนะนำ candidate ปัจจุบันโดยลำพัง
3. **Medium–high risk:** หากต้องการให้ Stability มีผลมากกว่าปัจจุบัน ต้องตกลง winner contract แยกต่างหากก่อน; ห้ามพ่วงเข้า bot patch
4. รัน focused tests, primary regression หนึ่งรอบ, Browser QA จบหนึ่งแมตช์, sync เฉพาะ shipped source/dist และอัปเดต README

## STOP

**ยังไม่มีการเปลี่ยน production scoring, winner logic, tile mapping หรือ Bot strategy. รอเจ้าของเลือกและอนุมัติข้อเสนอที่จะนำไปใช้ก่อนเริ่ม implementation**
