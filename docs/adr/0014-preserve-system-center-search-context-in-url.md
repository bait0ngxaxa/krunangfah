# Preserve System Center Search Context In URL

ศูนย์ดูแลระบบจะเก็บบริบทการใช้งานหลักไว้ใน URL อย่างน้อย `tab`, `q`, และตัวกรองสำคัญของงานนั้น เช่น `dataState` เพื่อให้การ redirect จากหน้า legacy, refresh, bookmark และ back/forward ไม่ทำให้ system admin ต้องค้นหาใหม่ การเลือก entity รายตัวไม่ใช่ requirement แรก เว้นแต่มี ID ชัดเจนจาก URL เพราะ selected state จากผลการค้นหาเพิ่มความซับซ้อนโดยยังไม่จำเป็นต่อการแก้ UX ซ้ำซ้อนหลัก
