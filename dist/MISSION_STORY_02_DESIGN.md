# AI District — Mission Story 02 Design

ชื่อชั่วคราว: **คะแนนที่มองไม่เห็น**  
สถานะ: **Draft / Preview เท่านั้น**  
ตัวละครหลัก: Nancy (S+ Original, `assets/Nancy.png`)  
Draft Key: `mission-story-02-nancy-draft`  
Production Mission ID: **ยังไม่กำหนด**

## Narrative Direction

Smart Academy ทดลองใช้ AI ช่วยประเมินผลงานของผู้เรียน แต่ครูและนักเรียนพบว่าคะแนนบางกลุ่มต่างจากความคาดหมาย ภารกิจเน้นการประเมินผลงาน เกณฑ์ที่เกี่ยวข้อง คำอธิบายผล และสิทธิ์ในการทบทวน ไม่ใช้เหตุการณ์คัดเลือกทุนของ Mission 01

Nancy ทำหน้าที่รับฟังและสื่อสารกับผู้ที่ระบบมองไม่เห็นตาม Character Bible; Milo ช่วยตรวจหลักฐาน และ Alexander ประสานขั้นตอนทบทวน ไม่มีตัวละครใดเฉลยคำตอบทั้งหมด ผู้เรียนต้องสำรวจ เปรียบเทียบ และให้เหตุผลเอง

## Story Structure

ข้อกำหนดระบุ “6 ช่วง” แต่แจกแจง Opening และ Scene 1–6 รวม 7 ช่วง ข้อมูล Draft จึงรักษารายการที่แจกแจงครบทั้ง 7 ช่วง:

1. **Opening — Assessment Alert:** รับแจ้งความต่างของผลและเลือกจุดเริ่มตรวจสอบ
2. **Scene 1 — Meet Nancy:** ฟังผลกระทบและแยกประสบการณ์ออกจากข้อสรุปสาเหตุ
3. **Scene 2 — Assessment Evidence:** ตรวจเกณฑ์ น้ำหนัก คำอธิบาย และช่องทางทบทวน
4. **Scene 3 — Evaluation Simulation:** เปลี่ยนค่าจำลองเพื่อสังเกตความไวของผล พร้อมระบุสิ่งที่ยังไม่รู้
5. **Scene 4 — Fairness Decision:** เลือกมาตรการหลายด้านและอ่าน Trade-off
6. **Scene 5 — Reflection:** ออกแบบสิทธิ์อุทธรณ์ที่เข้าถึงและใช้งานได้จริง
7. **Scene 6 — Final Assessment Placeholder:** แจ้งชัดว่ายังไม่มี Quiz, Reward Claim หรือ Character Unlock

Data Configuration อยู่ใน `mission-story-02-data.js` และใช้ชนิด Component เดิม: Dialogue, Evidence, Simulation, Decision และ Reflection โดย Phase 5B เพิ่มเส้นทาง Preview แยกจาก Production navigation แล้ว

## Key Interaction Design

- Opening และ Meet Nancy ให้เลือกมุมเริ่มต้นหลายทางโดยไม่จัดว่ามีทางเดียวที่ถูก
- Evidence บังคับตรวจอย่างน้อย 2 ชิ้น พร้อมเขียนคำถามที่ยังต้องตรวจ
- Simulation ใช้ข้อมูลสมมติเท่านั้น ต้องทดลองอย่างน้อย 2 รอบ และสะท้อนข้อจำกัด
- Decision รองรับหลายมาตรการที่เหมาะสม พร้อม Remaining Risk ของแต่ละทาง
- Reflection ให้ผู้เรียนออกแบบกระบวนการอุทธรณ์ ไม่ใช่คัดลอกคำตอบจากบทสนทนา
- Final Assessment ยังเป็น Placeholder และไม่มีปุ่ม Claim

## Learning Alignment

| Learning Objective | Story Scene | Student Interaction | Expected Understanding | Assessment Evidence |
| --- | --- | --- | --- | --- |
| วิเคราะห์ความเกี่ยวข้องและความเป็นธรรมของเกณฑ์ | Opening, Scene 2 | เลือกจุดเริ่ม ตรวจเกณฑ์/น้ำหนัก และตั้งคำถามเพิ่ม | ตัวแปรที่ดูเป็นกลางอาจไม่วัดผลงานที่ตั้งใจและกระทบผู้เรียนต่างบริบท | หลักฐานที่ตรวจ + คำถามที่ผู้เรียนเขียน + Knowledge Check |
| อธิบายความต่างระหว่างผลกระทบกับข้อสรุปสาเหตุ | Scene 1, Scene 2 | ฟัง Nancy แล้วเทียบกับข้อมูลระบบ | ประสบการณ์ผู้ได้รับผลกระทบสำคัญ แต่ต้องใช้ร่วมกับหลักฐานเพื่อระบุสาเหตุ | ทางเลือกการรับฟังและเหตุผลจาก Evidence |
| วิเคราะห์ความไวและข้อจำกัดของผลประเมิน | Scene 3 | ปรับ Slider/ผู้ทบทวน เปรียบเทียบ 2 รอบ และระบุสิ่งที่ยังไม่รู้ | แบบจำลองช่วยตั้งคำถาม แต่ไม่พิสูจน์ Fairness โดยตัวมันเอง | Simulation history, Reflection และ Knowledge Check |
| เสนอระบบ Explainability และ Appeal ที่ใช้ได้จริง | Scene 4 | เลือกมาตรการหลายทางและพิจารณา Trade-off | คำอธิบายต้องช่วยตรวจข้อผิดพลาด และการอุทธรณ์ต้องนำไปสู่การแก้ผลได้ | Decision selection, impact/remaining risk และ Knowledge Check |
| อธิบาย Accountability และ Human Oversight | Scene 4, Scene 5 | ระบุผู้รับผิดชอบ ขั้นตอน เวลา และร่องรอย | การมีมนุษย์ไม่เพียงพอ หากไม่มีอำนาจ ข้อมูล และกระบวนการตรวจสอบ | Reflection เรื่องกระบวนการอุทธรณ์ |
| สังเคราะห์ Responsible AI สำหรับการศึกษา | Scene 5 | เขียนแนวทางที่รวมเกณฑ์ คำอธิบาย การทบทวน และการติดตาม | Responsible AI เป็นวงจรต่อเนื่อง ไม่ใช่การแก้ตัวแปรครั้งเดียว | คำตอบ Reflection; Final Assessment รอออกแบบใน Phase ถัดไป |

## Educational Safety

- ใช้ข้อมูลและคะแนนสมมติเพื่อการเรียนรู้เท่านั้น
- ไม่แสดงข้อมูลนักเรียนจริงหรือกล่าวหาบุคคล/กลุ่ม
- ไม่เหมารวมว่า AI หรือมนุษย์ถูก/ผิดเสมอ
- ไม่ให้บทสนทนาเฉลยทุกขั้น ผู้เรียนต้องสร้างเหตุผลจากหลักฐาน
- เปิดพื้นที่ให้หลายแนวทางเหมาะสม โดยต้องอธิบายข้อจำกัด

## Preview and Reward Boundary

- `missionId`, `lessonId`, Quiz threshold และ Reward mapping ยังเป็น `null`/ปิด
- `published`, `navigationEnabled`, `rewardClaimEnabled` และ `characterUnlockEnabled` เป็น `false`
- Nancy ยังคง Locked และ `isSelectableCharacter("nancy")` ต้องคืน `false`
- Character Selection แสดงเพียงข้อความ “ปลดล็อกผ่าน Story Mission: คะแนนที่มองไม่เห็น (เร็วๆ นี้)”
- ไม่มี Claim button, LocalStorage unlock หรือ Supabase write

## Phase 5B — Playable Prototype

- เปิดเล่นจาก Learning Hub ผ่าน `lesson-player.html?preview=mission-story-02-nancy-draft`
- ใช้ Mission Player และ Component เดิมครบทั้ง Dialogue, Evidence, Simulation, Decision, Reflection และ Summary
- เก็บความคืบหน้า Preview ใน `sessionStorage` ด้วย `mission-preview-progress.mjs` เท่านั้น จึงกลับมาเล่นต่อในแท็บเดิมได้โดยไม่ปะปนกับ Production lesson progress
- หน้า Summary ระบุชัดว่า Final Assessment ยังไม่พร้อม ไม่มี Reward Claim และ Nancy ยัง Locked
- ไม่มีการเขียน Supabase, ไม่มี LocalStorage unlock และไม่มีการแก้ Mission 01 Quiz/Reward
- Learning Hub แสดง Entry แบบ Preview แยกจากรายการบทเรียน Production
- Browser QA แบบ Login จริงเล่นครบทุก Interaction จนถึง Summary และกลับ Learning Hub ได้ โดยไม่มี Console error/warning หรือ Scroll แนวนอน

## Phase 5C Readiness

ก่อนเปิด Mission 02 จริงต้องได้รับการอนุมัติเนื้อหา, Production Mission ID, Final Assessment, passing score และ Backend reward verification จากนั้นจึงเชื่อม Production navigation, durable progress และ Character Ownership ตาม `CHARACTER_UNLOCK_CONTRACT.md`

