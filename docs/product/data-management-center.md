# ศูนย์จัดการข้อมูล

ศูนย์จัดการข้อมูลเป็นหน้าหลังบ้านสำหรับ `system_admin` เพื่อจัดการโรงเรียนและนักเรียนที่เป็นข้อมูลเลิกใช้งานหรือข้อมูลทดสอบ โดยลดความเสี่ยงจากการยิง SQL เองและทำให้ทุก action มี preview, เหตุผล, confirmation และประวัติการจัดการข้อมูล

## เป้าหมาย

- ให้ `system_admin` ค้นหาโรงเรียนหรือนักเรียนที่ต้องจัดการได้จากหน้าเดียว
- รองรับการ mark/unmark ข้อมูลทดสอบ
- รองรับการปิดใช้งานและกู้คืนโรงเรียน
- รองรับการปิดใช้งานและกู้คืนนักเรียนรายคน
- รองรับการลบถาวรโรงเรียนหรือนักเรียน พร้อมลบไฟล์จริงที่เกี่ยวข้อง
- บันทึกเหตุการณ์การจัดการข้อมูลพร้อม snapshot เพื่อให้ตรวจสอบย้อนหลังได้ แม้ข้อมูลเป้าหมายถูกลบถาวรแล้ว

## ขอบเขต

ทำใน phase แรก:

- หน้า `/admin/data-management`
- ค้นหาแบบ search-first command center
- detail panel สำหรับโรงเรียนหรือนักเรียนที่เลือก
- preview ผลกระทบก่อนลบถาวร
- action: mark ข้อมูลทดสอบ, unmark ข้อมูลทดสอบ, ปิดใช้งาน, กู้คืน, ลบถาวร
- ประวัติการจัดการข้อมูลแบบดูในระบบ
- ไม่มี bulk action นักเรียน
- ไม่มี export ประวัติใน phase แรก
- ไม่มี realtime kick user แต่ต้อง block ใน request ถัดไป

## UX

หน้าหลักใช้รูปแบบ search-first command center:

- แถบค้นหาหลักค้นหาโรงเรียน, นักเรียน, รหัส และข้อมูลระบุตัวตนที่ system admin มีสิทธิ์เห็น
- ตัวกรองเร็ว: ทั้งหมด, โรงเรียน, นักเรียน, ใช้งานอยู่, ปิดใช้งาน, ข้อมูลทดสอบ
- ผลลัพธ์แยกกลุ่มเป็นโรงเรียนและนักเรียน
- เมื่อเลือกผลลัพธ์ เปิด detail panel ด้านขวา
- action สำคัญอยู่ใน detail panel ไม่กระจายในตาราง
- danger zone สำหรับลบถาวรอยู่ล่างสุดของ panel

### Detail Panel โรงเรียน

แสดง summary ที่อ่านเร็ว:

- สถานะโรงเรียน: ใช้งานอยู่หรือปิดใช้งาน
- flag ข้อมูลทดสอบ
- จำนวนผู้ใช้
- จำนวนนักเรียนทั้งหมด
- จำนวนนักเรียนที่ยัง active
- จำนวนผลคัดกรอง PHQ
- จำนวนกิจกรรมช่วยเหลือ
- จำนวนบันทึกให้คำปรึกษา
- จำนวนบันทึกเยี่ยมบ้าน
- จำนวนไฟล์ที่เกี่ยวข้อง
- คำเชิญที่ยังไม่ใช้
- ประวัติการจัดการข้อมูลล่าสุด

มีปุ่มดูรายละเอียดทั้งหมดสำหรับ drill-down แต่ preview หลักใช้ count เป็นหลัก

### Detail Panel นักเรียน

แสดง summary:

- ชื่อ นามสกุล และรหัสนักเรียน
- โรงเรียน
- สถานะชีวิตจริงของนักเรียน เช่น กำลังศึกษา ลาออก ย้ายออก เรียนจบ
- สถานะจัดการข้อมูล เช่น ปิดใช้งานหรือข้อมูลทดสอบ
- จำนวน PHQ, กิจกรรม, บันทึกให้คำปรึกษา, เยี่ยมบ้าน และไฟล์
- ประวัติการจัดการข้อมูลล่าสุด

เลขบัตรประชาชนค้นหาได้ในหน้านี้เพราะเป็น `system_admin` เท่านั้น แต่ผลลัพธ์ list ต้องแสดงแบบ mask และค่อยแสดงเต็มใน detail panel ตามสิทธิ์ที่ระบบมีอยู่

## Action Flow

### Mark หรือ Unmark ข้อมูลทดสอบ

- ทำได้เฉพาะ `system_admin`
- ต้องกรอกเหตุผลการจัดการข้อมูล
- บันทึกเหตุการณ์การจัดการข้อมูล
- การ mark โรงเรียนเป็นข้อมูลทดสอบไม่เขียน flag ลงนักเรียนทุกคน
- นักเรียนใต้โรงเรียนข้อมูลทดสอบถูกแสดงใน preview ว่าอยู่ใต้โรงเรียนข้อมูลทดสอบ

### ปิดใช้งานโรงเรียน

- ใช้ `School.disabledAt` เป็น source of truth
- ไม่แตะ `User.deletedAt`
- user ของโรงเรียนที่ถูกปิดใช้งานเข้าใช้งานไม่ได้ตั้งแต่ auth/request boundary
- โรงเรียนไม่แสดงใน workflow ปกติ ยกเว้นศูนย์จัดการข้อมูล
- นักเรียนของโรงเรียนไม่ถูกนับใน analytics และ list ปกติ
- ยกเลิกคำเชิญค้างของโรงเรียน
- การกู้คืนโรงเรียนไม่ revive คำเชิญเดิม
- ต้องกรอกเหตุผล
- บันทึกเหตุการณ์การจัดการข้อมูล

### กู้คืนโรงเรียน

- เคลียร์สถานะปิดใช้งานของโรงเรียน
- user ของโรงเรียนกลับมาเข้าใช้งานได้ตามสิทธิ์เดิม
- โรงเรียนและนักเรียนกลับเข้า workflow ปกติ
- ไม่ revive invite เดิม
- ต้องกรอกเหตุผล
- บันทึกเหตุการณ์การจัดการข้อมูล

### ปิดใช้งานนักเรียน

- ใช้ field จัดการข้อมูลแยกจาก `Student.status`
- ไม่เพิ่ม `ARCHIVED` เข้า `StudentStatus`
- นักเรียนไม่แสดงใน list, search และ analytics ปกติ
- ยังดูได้ในศูนย์จัดการข้อมูล
- ต้องกรอกเหตุผล
- บันทึกเหตุการณ์การจัดการข้อมูล

### กู้คืนนักเรียน

- เคลียร์สถานะปิดใช้งานของนักเรียน
- นักเรียนกลับเข้า list, search และ analytics ปกติ หากโรงเรียนไม่ได้ถูกปิดใช้งาน
- ต้องกรอกเหตุผล
- บันทึกเหตุการณ์การจัดการข้อมูล

### ลบถาวร

ลบถาวรไม่ต้องให้ system admin พิมพ์รหัสยืนยัน แต่ต้องผ่าน flow 3 ขั้นใน drawer/panel เดียว:

1. ผลกระทบ: แสดง count และไฟล์ที่จะลบ
2. เหตุผล: textarea required
3. ยืนยัน: summary และปุ่ม `ลบถาวร`

กฎร่วม:

- ต้องโหลด preview สำเร็จก่อนเปิดปุ่มลบถาวร
- ต้องกรอกเหตุผล
- ต้องบันทึกเหตุการณ์การจัดการข้อมูลพร้อม target snapshot และ impact snapshot
- ต้องพยายามลบไฟล์จริงที่เกี่ยวข้อง
- ถ้าลบไฟล์บางรายการไม่สำเร็จ ให้บันทึก warning ในเหตุการณ์การจัดการข้อมูล ไม่ rollback DB

## Permission

- ทุก action ในศูนย์จัดการข้อมูลทำได้เฉพาะ `system_admin`
- `school_admin` และ `class_teacher` ไม่มีสิทธิ์เข้าหน้านี้
- `system_admin` เท่านั้นที่ mark หรือ unmark ข้อมูลทดสอบได้
- ห้ามลบ `system_admin` ผ่านลบถาวรโรงเรียน

## Schema ที่ต้องเพิ่ม

### School

- `disabledAt DateTime?`
- `disabledById String?`
- `disabledReason String? @db.Text`
- `restoredAt DateTime?`
- `restoredById String?`
- `restoreReason String? @db.Text`
- `isTestData Boolean @default(false)`
- `testDataMarkedAt DateTime?`
- `testDataMarkedById String?`
- `testDataReason String? @db.Text`

### Student

เพิ่ม field ชุดเดียวกับ School สำหรับปิดใช้งาน, กู้คืน และข้อมูลทดสอบ โดยไม่เปลี่ยน `StudentStatus`

### DataManagementEvent

ตารางกลางสำหรับประวัติการจัดการข้อมูล:

- `id`
- `targetType`: `school` หรือ `student`
- `targetId`
- `action`: `MARK_TEST_DATA`, `UNMARK_TEST_DATA`, `DISABLE`, `RESTORE`, `PERMANENT_DELETE`
- `reason`
- `actorUserId`
- `actorSnapshot Json`
- `targetSnapshot Json`
- `impactSnapshot Json`
- `warnings Json?`
- `createdAt`

actor fields บน School และ Student เป็น nullable string ไม่บังคับ FK ไป User เพราะเป็น snapshot id

## Services

แนะนำให้แยก service ชั้นเดียวเป็น SSOT ของ action:

- `searchDataManagementTargets`
- `getSchoolDataManagementPreview`
- `getStudentDataManagementPreview`
- `markSchoolAsTestData`
- `unmarkSchoolTestData`
- `disableSchool`
- `restoreSchool`
- `permanentlyDeleteSchool`
- `markStudentAsTestData`
- `unmarkStudentTestData`
- `disableStudent`
- `restoreStudent`
- `permanentlyDeleteStudent`
- `listDataManagementEvents`

ทุก mutation ต้องทำตามลำดับ:

1. Rate limit
2. Input validate
3. Auth check
4. Access control ว่าเป็น `system_admin`
5. Load preview หรือ target snapshot
6. Business logic ใน transaction
7. Revalidate cache
8. Return result

## ลบถาวรโรงเรียน

ลำดับที่ service ควรทำ:

1. ตรวจว่า actor เป็น `system_admin`
2. โหลดโรงเรียนและ preview
3. ตรวจว่าโรงเรียนไม่ใช่โรงเรียนที่ผูกกับ `system_admin`
4. รวบรวมรายการไฟล์จริงของนักเรียนใต้โรงเรียน
5. เริ่ม transaction
6. ลบหรือ revoke pending invites
7. ลบนักเรียนใต้โรงเรียน เพื่อให้ข้อมูลลูก cascade
8. ลบ roster และ classes
9. preflight ว่ายังไม่มี FK ค้างที่อ้าง user ของโรงเรียนนั้น
10. ลบ users ของโรงเรียน
11. ลบโรงเรียน
12. บันทึกเหตุการณ์การจัดการข้อมูลพร้อม snapshot
13. commit
14. ลบไฟล์จริง
15. ถ้าลบไฟล์พลาด ให้ update event warnings

ห้ามปิด constraint หรือ set null เงียบ ๆ หากมี FK ค้างก่อนลบ user ให้ abort และแสดง error ที่ actionable

## Revalidation

หลัง action โรงเรียน:

- dashboard
- analytics
- students list
- admin users
- data management page
- cache tag ตาม `schoolId` ถ้ามี helper เดิม

หลัง action นักเรียน:

- students list
- student detail
- analytics ของโรงเรียน
- data management page

หลังปิดใช้งานหรือกู้คืน ให้อยู่ที่ detail panel เดิมแล้ว refresh preview หลังลบถาวร ให้กลับไปหน้าผลค้นหาและแสดง toast พร้อมลิงก์ดูประวัติ

## Edge Cases

- โรงเรียนถูกปิดใช้งานแต่มี user ที่ยังมี session อยู่: ไม่ต้อง realtime kick แต่ request ถัดไปต้อง block
- ลบถาวรแล้วไฟล์จริงลบบางรายการไม่สำเร็จ: บันทึก warning ไม่ rollback DB
- นักเรียนถูกปิดใช้งานรายคนแต่โรงเรียนยัง active: นักเรียนไม่เข้าร่วม workflow ปกติ
- โรงเรียนถูกปิดใช้งานอยู่แล้ว: นักเรียนใต้โรงเรียนไม่ต้องถูกปิดรายคนซ้ำ
- โรงเรียนถูก mark เป็นข้อมูลทดสอบ: ไม่ cascade flag ลงนักเรียนทุกคน
- unmark โรงเรียนจากข้อมูลทดสอบ: ไม่เปลี่ยนสถานะปิดใช้งาน
- กู้คืนโรงเรียน: ไม่ revive invite เดิม

## Implementation Slices

1. Schema migration สำหรับ School, Student และ DataManagementEvent
2. Query guards สำหรับโรงเรียนและนักเรียนที่ปิดใช้งาน
3. Auth guard สำหรับโรงเรียนที่ถูกปิดใช้งาน
4. Preview services และ event logging
5. Mutation services สำหรับ mark/unmark, disable/restore, permanent delete
6. File deletion utility สำหรับข้อมูลนักเรียนและโรงเรียน
7. UI search command center และ detail panel
8. Destructive action drawer
9. Tests สำหรับ permission, preview, transaction, query guard และ file warning
