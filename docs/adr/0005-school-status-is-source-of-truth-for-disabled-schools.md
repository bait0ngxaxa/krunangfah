# School Status Is Source Of Truth For Disabled Schools

สถานะปิดใช้งานโรงเรียนจะอยู่ที่ School เป็นแหล่งอ้างอิงหลัก ไม่ใช้ `User.deletedAt` เพื่อแทนสถานะโรงเรียน เพราะการลบหรือปิด user เป็นคนละความหมายกับการปิดใช้งานโรงเรียน Auth และ query ที่เกี่ยวข้องต้องตรวจสถานะโรงเรียนเพื่อ block ผู้ใช้และซ่อนข้อมูลจาก workflow ปกติ
