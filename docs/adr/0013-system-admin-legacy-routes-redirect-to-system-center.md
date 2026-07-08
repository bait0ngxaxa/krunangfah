# System Admin Legacy Routes Redirect To System Center

หน้า `/admin/users` และ `/admin/data-management` จะไม่เป็น workflow หลักถาวร หลังจากย้าย action สำคัญเข้าศูนย์ดูแลระบบครบแล้ว route เดิมจะ redirect เข้า `/admin/system` พร้อม query ที่บอกบริบทเดิม เช่น `tab=users` หรือ `tab=data` เพื่อให้ system admin เริ่มจากศูนย์ดูแลระบบและไม่ต้องค้นหาข้อมูลซ้ำในหลายหน้า การตัดสินใจนี้ลดการดูแล UX/search/action สองชุด แต่ยังเปิดทางให้เก็บหน้าเดิมเป็น fallback ชั่วคราวระหว่าง migration
