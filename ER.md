📊 Database Schema - โครงการครูนางฟ้า
🗂️ ภาพรวม Tables (10 tables)

1. Core Tables (ข้อมูลหลัก)
   School - โรงเรียน
   User

- ผู้ใช้งาน (ครู)
  AcademicYear
- ปีการศึกษา/เทอม
  Teacher
- ข้อมูลครู
  Student
- นักเรียน

2. Feature Tables (ฟีเจอร์หลัก)
   PhqResult - ผลคัดกรองสุขภาพจิต PHQ-A
   ActivityProgress

- ความคืบหน้ากิจกรรมช่วยเหลือ
  WorksheetUpload
- ใบงานที่อัปโหลด
  CounselingSession
- บันทึกการให้คำปรึกษา

3. System Tables
   TeacherInvite

- คำเชิญครูผู้ดูแล
  🔗 Entity Relationship Diagram
  has
  has
  has
  has
  in
  for
  in
  is
  creates
  imports
  teaches
  uploads
  creates
  has
  has
  receives
  triggers
  contains
  School
  User
  Teacher
  Student
  TeacherInvite
  AcademicYear
  PhqResult
  ActivityProgress
  WorksheetUpload
  CounselingSession
  📋 ความสัมพันธ์ตามฟีเจอร์
  🏫 1. School Management
  School (1) ──→ (N) User
  School (1) ──→ (N) Teacher  
  School (1) ──→ (N) Student
  School (1) ──→ (N) TeacherInvite
  โรงเรียนหนึ่งมีได้หลายครู หลายนักเรียน
  👥 2. User & Teacher System
  User (1) ──→ (0..1) Teacher
  AcademicYear (1) ──→ (N) Teacher
  User 1 คน = Teacher profile 1 คน (optional)
  Teacher ทุกคนต้องอยู่ในปีการศึกษาใดปีการศึกษาหนึ่ง
  📨 3. Teacher Invitation
  User (1) ──→ (N) TeacherInvite [invitedBy]
  School (1) ──→ (N) TeacherInvite
  AcademicYear (1) ──→ (N) TeacherInvite
  ครู school_admin สามารถเชิญครูคนอื่นเข้าระบบ
  เก็บข้อมูล: email, role, advisory class, expiry
  📝 4. PHQ-A Assessment (คัดกรองสุขภาพจิต)
  Student (1) ──→ (N) PhqResult
  User (1) ──→ (N) PhqResult [importedBy]
  AcademicYear (1) ──→ (N) PhqResult
  นักเรียน 1 คนมีได้หลายผลคัดกรอง (ครั้งที่ 1, 2)
  แต่ละผลต้องไม่ซ้ำ: [studentId, academicYearId, assessmentRound]
  เก็บ: คะแนน q1-q9, totalScore, riskLevel (blue/green/yellow/orange/red)
  🎯 5. Activity Progress (กิจกรรมช่วยเหลือ)
  Student (1) ──→ (N) ActivityProgress
  PhqResult (1) ──→ (N) ActivityProgress
  User (1) ──→ (N) ActivityProgress [teacher]
  Trigger: เมื่อนักเรียนได้ risk level = orange/yellow/green
  สร้าง 5 activities (activityNumber: 1-5)
  Status flow: locked → in_progress → pending_assessment → completed
  แต่ละ activity ไม่ซ้ำ: [studentId, phqResultId, activityNumber]
  📄 6. Worksheet Upload (ใบงาน)
  ActivityProgress (1) ──→ (N) WorksheetUpload
  User (1) ──→ (N) WorksheetUpload [uploadedBy]
  แต่ละ activity สามารถอัปโหลดใบงานได้หลายไฟล์
  เก็บ: fileName, fileUrl, fileType, fileSize
  💬 7. Counseling Session (ให้คำปรึกษา)
  Student (1) ──→ (N) CounselingSession
  User (1) ──→ (N) CounselingSession [createdBy]
  บันทึกการให้คำปรึกษารายบุคคล
  เก็บ: sessionNumber, sessionDate, counselorName, summary
  🔑 Key Constraints
  Unique Constraints
  Table Fields Purpose
  Student
  [firstName, lastName, class, schoolId] ป้องกันนักเรียนซ้ำในห้องเดียวกัน
  PhqResult [studentId, academicYearId, assessmentRound] ป้องกันประเมินซ้ำในเทอมเดียวกัน
  ActivityProgress
  [studentId, phqResultId, activityNumber] ป้องกัน activity ซ้ำ
  AcademicYear
  [year, semester] ป้องกันปี+เทอมซ้ำ
  Cascade Deletes
  ลบ
  Student
  → ลบ PhqResult,
  ActivityProgress
  ,
  CounselingSession
  ลบ
  User
  → ลบ
  Teacher
  ลบ
  ActivityProgress
  → ลบ
  WorksheetUpload
  📊 Data Flow ตามฟีเจอร์
  🔄 Flow 1: Import Students & PHQ Results

1. Teacher imports Excel → creates Student records
2. Calculate risk levels → creates PhqResult records
3. If risk = orange/yellow/green → auto-create 5 ActivityProgress (locked)
   🔄 Flow 2: Activity Workflow
4. Teacher unlocks activity → status = in_progress
5. Teacher uploads worksheets → creates WorksheetUpload
6. Teacher submits assessment → status = pending_assessment
7. System evaluates → status = completed (or unlock next activity)
   🔄 Flow 3: Counseling
8. Teacher selects student
9. Creates CounselingSession record
10. Records: date, counselor, summary
    🎨 Role-Based Access
    Role Permissions
    school_admin ทุกอย่างในโรงเรียน, เชิญครู, ดู analytics
    class_teacher เห็นเฉพาะนักเรียนที่ตัวเอง import, ทำกิจกรรม
    📈 Analytics Queries
    Risk Level Summary
    SELECT riskLevel, COUNT(_)
    FROM PhqResult
    WHERE academicYearId = ?
    GROUP BY riskLevel
    Activity Completion Rate
    SELECT
    COUNT(CASE WHEN status = 'completed' THEN 1 END) _ 100.0 / COUNT(\*) as completion_rate
    FROM ActivityProgress
    WHERE activityNumber = ?
