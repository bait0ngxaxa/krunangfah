# Delete Storage Files After Permanent Deletion

การลบถาวรโรงเรียนหรือนักเรียนต้องรวบรวมรายการไฟล์และสร้าง `FileDeletionOutbox` ภายใน transaction เดียวกับการลบข้อมูลอ้างอิง เมื่อ commit แล้ว process cleanup เดิมจะลบไฟล์จริงและ retry อัตโนมัติเมื่อ filesystem ล้มเหลวชั่วคราว การลบไฟล์จริงไม่อยู่ใน database transaction และสถานะที่รอ retry ไม่ถือเป็นความล้มเหลวถาวรของรายการลบถาวร
