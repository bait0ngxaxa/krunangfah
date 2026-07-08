# Migrate Post Search Actions Into System Center First

phase แรกของการรวมศูนย์ดูแลระบบจะย้าย action หลังค้นหาที่ทำให้เกิด UX ซ้ำซ้อนเข้ามาก่อน ไม่ใช่ clone หน้า `/admin/users` และ `/admin/data-management` ทั้งหมดแบบหนึ่งต่อหนึ่ง ขอบเขตแรกคือ action ของผู้ใช้และครู เช่น เปลี่ยนบทบาท แก้ข้อมูลครูที่จำเป็น และลบบัญชีตาม workflow เดิม รวมถึง action ของโรงเรียนและนักเรียน เช่น ปิดใช้งาน กู้คืน mark/unmark ข้อมูลทดสอบ preview ลบถาวร และลบถาวร พร้อมแสดง audit/history ใน detail เดียวกัน
