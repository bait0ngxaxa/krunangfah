# Use Entity Centered Detail In System Center

ศูนย์ดูแลระบบจะจัด UX แบบค้นหาทางซ้ายและ detail ตามเป้าหมายทางขวา โดย action section จะแสดงตาม entity ที่เลือก เช่น จัดการผู้ใช้งานสำหรับ user/teacher จัดการข้อมูลสำหรับ school/student ประวัติสำหรับทุกประเภท และประวัติการดูแลสำหรับ student แม้ URL จะรับ `tab` จาก legacy route ได้ แต่ UI หลักไม่ควรแยกเป็น tab ใหญ่แบบหน้าเดิม เพราะจะทำให้ผู้ใช้กลับไปคิดเป็น workflow คนละหน้าและเสี่ยงต้องค้นหาซ้ำ
