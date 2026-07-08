# Preserve System Center State After Actions

หลัง action ในศูนย์ดูแลระบบสำเร็จ ระบบจะคง selected entity และผลค้นหาเดิมไว้พร้อม refresh detail, badges, history และ result row ยกเว้น action ที่ทำให้เป้าหมายไม่ควรถูกจัดการต่อ เช่น ลบถาวรโรงเรียนหรือนักเรียน หรือลบผู้ใช้แบบที่ไม่ควรแสดงต่อ ซึ่งจะเคลียร์ selected entity และแจ้งว่าข้อมูลไม่อยู่ในผลลัพธ์แล้ว แนวทางนี้แก้ปัญหา UX ต้องค้นหาใหม่หลังบันทึกและทำให้ system admin ทำงานต่อเนื่องจากบริบทเดิมได้
