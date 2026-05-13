# TODO: แก้ไขข้อมูลส่วนตัวนักเรียน (Edit Student Profile)

> เพิ่มฟีเจอร์แก้ไขข้อมูลส่วนตัวนักเรียน โดย **ไม่ให้แก้ไข** ผลคะแนน PHQ-A

---

## Editable Fields

| Field | DB Column | Required | หมายเหตุ |
|---|---|---|---|
| ชื่อ | `firstName` | ✅ | max 100 |
| นามสกุล | `lastName` | ✅ | max 100 |
| เพศ | `gender` | ❌ | MALE / FEMALE |
| อายุ | `age` | ❌ | 1–99 |
| รหัสนักเรียน | `studentId` | ✅ | unique ต่อโรงเรียน |
| เลขบัตรประชาชน | `nationalId` | ❌ | 13 หลัก, unique globally |
| ห้อง | `class` | ✅ | max 50 |

**PHQ-A scores จะไม่สามารถแก้ไขได้ทั้งหมด** (`totalScore`, `riskLevel`, `q1`–`q9`, etc.)

---

## 1. Validation & Constants

- [ ] เพิ่ม `student` section ใน `lib/constants/input-limits.ts`
  - `firstName: 100`, `lastName: 100`, `studentId: 50`, `nationalId: 13`, `class: 50`
- [ ] สร้างไฟล์ `lib/validations/student-profile.validation.ts`
  - Zod schema สำหรับ fields ข้างบน
  - Export type `StudentProfileUpdateFormData`
  - ห้ามมี field ที่เกี่ยวกับ PHQ-A

---

## 2. Server Action

- [ ] เพิ่ม `updateStudentProfile` ใน `lib/actions/student/mutations.ts`
  - **ลำดับการทำงาน:**
    1. Rate Limit
    2. Input Validate ด้วย Zod schema
    3. Auth Check (`requireAuth`)
    4. Access Control
       - `system_admin` → ❌ ไม่อนุญาต (read-only)
       - `school_admin` → ✅ นักเรียนทุกคนในโรงเรียน
       - `class_teacher` → ✅ เฉพาะนักเรียนในห้องตัวเอง
    5. Business Logic
       - ตรวจ unique `studentId` ภายในโรงเรียน
       - ตรวจ unique `nationalId` globally (ถ้ามี)
       - `prisma.student.update()` เฉพาะ fields ส่วนตัว
    6. Cache Revalidate (`revalidateStudentsCache`)
    7. Return `{ success, message }`

---

## 3. UI — Modal Component

- [ ] สร้าง `components/student/profile/EditStudentProfileModal.tsx`
  - Portal-based modal (ตาม pattern `AddCounselingModal`)
  - Body scroll lock
  - Form fields:
    - ชื่อ — text input, required
    - นามสกุล — text input, required
    - เพศ — radio (ชาย/หญิง/ไม่ระบุ)
    - อายุ — number input, optional
    - รหัสนักเรียน — text input, required
    - เลขบัตรประชาชน — text input 13 หลัก, optional
    - ห้อง — text input, required
  - Pre-fill ข้อมูลปัจจุบันจาก props
  - Error handling + toast notification
  - ไม่แสดง PHQ-A fields ใดๆ

---

## 4. UI — Integration

- [ ] แก้ไข `StudentProfileCard.tsx`
  - เพิ่ม props: `readOnly`, `studentId`
  - แสดงปุ่ม "แก้ไข" (Pencil icon) มุมขวาบน เมื่อ `readOnly = false`
  - คลิกเปิด `EditStudentProfileModal`
  - บันทึกสำเร็จ → `router.refresh()`
- [ ] แก้ไข `app/(protected)/students/[id]/page.tsx`
  - ส่ง `readOnly={isSystemAdmin}` ให้ `StudentProfileCard`
  - ส่ง `studentId` ให้ `StudentProfileCard`

---

## 5. Testing

- [ ] Unit test สำหรับ Zod schema
  - Accept valid personal data
  - Reject missing required fields
  - Reject `nationalId` ไม่ใช่ 13 หลัก
  - Schema ไม่รับ PHQ fields
- [ ] Manual test
  - แก้ไขชื่อ → ข้อมูลอัปเดตทันที
  - PHQ tab ไม่เปลี่ยนแปลง
  - `class_teacher` แก้ไขห้องอื่นไม่ได้
  - `system_admin` ไม่เห็นปุ่มแก้ไข
  - ใช้รหัส/เลขบัตรซ้ำ → แสดง error

---

## Open Questions

- [ ] สิทธิ์: ให้ `class_teacher` แก้ไขนักเรียนห้องตัวเองได้ด้วยไหม?
- [ ] ห้อง: ใช้ free-text หรือ dropdown จาก `SchoolClass`?
- [ ] ตำแหน่งปุ่ม: วางปุ่มแก้ไขที่มุมขวาบนของ profile card?
