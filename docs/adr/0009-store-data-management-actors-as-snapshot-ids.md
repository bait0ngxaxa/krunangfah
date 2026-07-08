# Store Data Management Actors As Snapshot IDs

field actor ของสถานะจัดการข้อมูลบน School และ Student จะเก็บเป็น nullable string แทนการบังคับ FK ไป User เพราะข้อมูลเหล่านี้เป็น snapshot ของผู้ทำรายการในเวลานั้น ไม่ควรทำให้การลบหรือเปลี่ยนผู้ใช้ในอนาคตติด constraint โดยไม่จำเป็น รายละเอียดตรวจสอบย้อนหลังจะอยู่ในเหตุการณ์การจัดการข้อมูลซึ่งเก็บ actor และ snapshot เพิ่มเติม
