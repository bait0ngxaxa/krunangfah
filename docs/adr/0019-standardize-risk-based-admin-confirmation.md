# Standardize Risk Based Admin Confirmation

action สำคัญในศูนย์ดูแลระบบจะใช้ pattern กลางคือ preview ผลกระทบ เหตุผลการจัดการข้อมูลหรือเหตุผลการแก้ไข confirmation audit event และ refresh detail/search หลังสำเร็จ โดย action เสี่ยงสูงมาก เช่น ลบถาวรโรงเรียนหรือนักเรียน และลบผู้ใช้ ต้องใช้การยืนยันระดับสูงที่ให้พิมพ์คำยืนยันหรือชื่อเป้าหมาย ส่วน action เสี่ยงกลาง เช่น เปลี่ยน role หรือแก้ห้องที่ปรึกษา ใช้ preview พร้อมเหตุผลและ confirm ได้ การทำ pattern เดียวกันลดความสับสนและลดความเสี่ยงจาก section ต่างๆ ออกแบบ confirmation ไม่เท่ากัน
