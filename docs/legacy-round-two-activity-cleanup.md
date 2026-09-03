# Legacy Round 2 Activity Audit and Cleanup

เอกสารนี้เป็น runbook สำหรับตรวจสอบและล้าง `ActivityProgress` ที่ผูกกับ PHQ ซึ่งมี `assessmentRound != 1` ตามกติกาใหม่ กิจกรรมรอบ 2 ที่มีข้อมูลการใช้งานต้องเก็บไว้เป็นประวัติ ห้ามใช้คำสั่งนี้เพื่อลบข้อมูลดังกล่าว

## หลักเกณฑ์การจัดประเภท

ระบบจะรายงานทุกแถวที่ PHQ มี `assessmentRound != 1` และแบ่งเป็นสองกลุ่ม:

- `cleanup_candidate`: worksheet เป็นศูนย์, field ข้อมูลผู้ใช้ทุกตัวเป็นค่าว่าง, student ของกิจกรรมตรงกับ PHQ และสถานะตรงกับ initial sequence ที่สร้างจาก risk ปัจจุบัน (`in_progress` พร้อม `unlockedAt` สำหรับกิจกรรมแรก หรือ `locked` โดยไม่มี `unlockedAt` สำหรับกิจกรรมถัดไป)
- `preserve`: มีหลักฐานการใช้งานหรือข้อมูลที่ไม่ชัดเจน เช่น worksheet, teacher assignment/snapshot, teacher notes, scheduled date, completion/assessment fields, system-admin event ที่อ้างถึง activity, สถานะหรือการปลดล็อกที่ไม่ใช่ initial state, activity ที่ไม่อยู่ใน sequence ของ risk ปัจจุบัน หรือ student mismatch

`createdAt`, `updatedAt` และสถานะ initial ที่ระบบสร้างอัตโนมัติไม่ถูกนับเป็นข้อมูลผู้ใช้เพียงลำพัง การพบข้อมูลที่ไม่ตรงเงื่อนไขใด ๆ จะเลือกเก็บไว้ (false negative ปลอดภัยกว่าการลบผิดแถว)

## ขั้นตอนปฏิบัติ

1. รัน dry-run audit ก่อนเสมอ:

   ```bash
   npm run audit:legacy-round-two-activities
   ```

   คำสั่งนี้อ่านและจัดประเภทเท่านั้น ไม่ลบข้อมูล ค่าเริ่มต้นเป็น dry-run โดยตั้งใจ

2. ตรวจ `totalLegacyRows`, `roundTwoRows`, `cleanupCandidates` และ `preservedRows` รวมถึง identifiers และ `reasons` ของแต่ละแถว

3. ยืนยันว่า candidate ไม่มี meaningful user data และตรวจรายการที่ถูกจัดเป็น `preserve` ว่ามีเหตุผลสอดคล้องกับข้อมูลจริง

4. สำรอง PostgreSQL และ `.data/uploads` ตาม operational practice ที่มีอยู่ในหัวข้อ Backup ของ [`docs/deployment.md`](deployment.md) ก่อนทำลายข้อมูล และหยุดหรือควบคุม mutation ตาม maintenance window ของระบบ

5. เมื่อยืนยันแล้วจึงรัน cleanup แบบ explicit:

   ```bash
   npm run audit:legacy-round-two-activities -- --cleanup
   ```

   คำสั่งนี้ประมวลผลเป็น bounded batches ขนาด 50 แถว โดยแต่ละ batch เปิด
   Serializable transaction แยกกัน, re-fetch เฉพาะ IDs ของ batch, อ่าน
   `SystemAdminEvent` ใหม่, จัดประเภทจาก state ปัจจุบัน แล้วจึงลบเฉพาะแถวที่
   ผ่าน conditional predicate ซ้ำอีกครั้ง แต่ละ batch commit แยกกัน จึงไม่มี
   interactive transaction เดียวยาวครอบคลุมทั้ง dataset และไม่ลบ worksheet หรือไฟล์จริง

   `cleanupCandidates`, `preservedRows`, `records` และ `reasons` ในผล cleanup
   หมายถึงผลจาก initial discovery audit ทั้งหมด ส่วน `deletedIds` คือแถวที่ลบสำเร็จจริง และ
   `recheckRejectedIds` คือ initial candidates ที่ไม่ผ่านการตรวจซ้ำใน transaction
   ของ batch หรือ conditional delete ไม่ match แล้ว `batchesProcessed` ระบุจำนวน
   batch ที่ commit สำเร็จ

6. รัน audit ซ้ำหลัง cleanup เพื่อตรวจว่า removable legacy rows เหลือศูนย์:

   ```bash
   npm run audit:legacy-round-two-activities
   ```

7. ตรวจยืนยันว่า legacy rows ที่มี worksheet หรือข้อมูลผู้ใช้ยังคงอยู่ โดยดูจาก `preservedRows`, `reasons` และ identifiers ในผล audit

## Safety notes

- ไม่มี migration, startup hook, seed hook หรือ deployment hook ที่เรียก cleanup อัตโนมัติ
- `--cleanup` เป็น opt-in ที่ทำลายข้อมูลโดยตั้งใจเท่านั้น ค่าเริ่มต้นไม่ลบ
- dry-run ไม่มี destructive transaction และอ่าน/จัดประเภท/รายงานเท่านั้น
- cleanup ใช้ keyset pagination ด้วย `ActivityProgress.id` และจับ upper-bound ตอนเริ่มงาน
  cursor จะเดินต่อจาก ID สุดท้ายของ discovery page ไม่ได้เดินตามผลการลบ ดังนั้น
  แถวที่ preserve จึงไม่ทำให้เลือก page เดิมซ้ำหรือทำให้ loop ไม่จบ แถวใหม่ที่มี ID
  นอกขอบเขตจะไม่ถูกเพิ่มเข้า maintenance run นี้ และตรวจได้ด้วยการ audit/cleanup รอบถัดไป
- แต่ละ batch commit เป็นอิสระ หาก batch ถัดไปล้มเหลว batch ก่อนหน้ายังคง commit แล้ว
  และสามารถ rerun คำสั่งได้อย่างปลอดภัย/idempotent สำหรับ candidates ที่ลบไปแล้ว
- SQL/Prisma delete predicate ระบุ `phqResult.assessmentRound != 1` โดยตรง จึงไม่สามารถเลือก Round 1 ได้จากเงื่อนไขนี้ แม้ classification ก่อนหน้า stale หรือ malformed
- ก่อนลบแต่ละแถวจะตรวจซ้ำทุก field ที่มีความหมาย, ความไม่มี worksheet, `SystemAdminEvent`
  และ PHQ round/risk context จาก state ปัจจุบันภายใน transaction หากไม่ตรงจะไม่ลบและ
  รายงานใน `recheckRejectedIds`; conditional `deleteMany` predicate ยังคงเป็น TOCTOU guard สุดท้าย
- schema ปัจจุบันมี cascade จาก `WorksheetUpload` ไป `ActivityProgress` แต่ candidate ต้องมี worksheet เป็นศูนย์ และ cleanup ไม่เรียก physical-file deletion ดังนั้นข้อมูลที่มี worksheet จะไม่เข้า delete predicate
- audit ตรวจ `SystemAdminEvent` ที่อ้าง `targetType=activityProgress` เพิ่มเติม แม้ schema จะไม่มี relation ตรง หากพบ event จะ preserve แถวนั้นเพื่อไม่ตัดประวัติที่เกี่ยวข้อง
- repository ไม่มี `SystemAdminEvent` target สำหรับ maintenance batch และ CLI ไม่มี actor ของ System Admin จึงใช้ deterministic JSON report/log แทนการสร้าง per-row business audit event

## ประเด็นติดตามนอกขอบเขต

- `resetSystemPhqResult` ยังมี implementation และ export ภายใน แต่ไม่พบการเรียกจาก public System Admin action หรือ UI ปัจจุบัน จึงยังไม่ได้เปลี่ยน rollback model; หากเปิดใช้งานภายหลังต้องเพิ่ม guard ไม่ให้ลบ Round 1 ขณะที่ Round 2 ในเทอมเดียวกันยังอยู่
- System Admin แก้ไขความเสี่ยงของ PHQ ล่าสุดได้ แต่ยังไม่มีการ reconcile ชุดกิจกรรม Round 1 ที่สร้างไปแล้วเมื่อ risk เปลี่ยน ประเด็นนี้เป็น follow-up แยกต่างหากและ Phase 3 ไม่ลบหรือสร้างประวัติกิจกรรมใหม่อัตโนมัติ
