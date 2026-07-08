# Exclude Admin Invites From First System Center Consolidation

phase แรกของการรวมศูนย์ดูแลระบบจะยังไม่รวม workflow เชิญ Admin จาก `/admin/invites` เพราะคำเชิญผู้ดูแลโรงเรียนเป็นงานสร้างคำเชิญ ไม่ใช่ action หลังค้นหา entity ที่ทำให้เกิด UX ต้องค้นหาซ้ำ เป้าหมายแรกจึงจำกัดที่การแทนที่ workflow ของ `/admin/users` และ `/admin/data-management` ก่อน โดยในอนาคตอาจเพิ่ม shortcut จาก detail ของโรงเรียนเพื่อ prefill โรงเรียนใน workflow เชิญได้
