export const ERROR_MESSAGES = {
    role: {
        systemAdminReadonly: (action: string): string =>
            `system_admin ไม่มีสิทธิ์${action}`,
        systemAdminReadonlyActivity: "system_admin ไม่มีสิทธิ์แก้ไขข้อมูลกิจกรรม",
        systemAdminUploadWorksheet: "system_admin ไม่มีสิทธิ์อัปโหลดใบงาน",
        systemAdminDeleteWorksheet: "system_admin ไม่มีสิทธิ์ลบใบงาน",
    },
    activity: {
        latestOnly: "ทำกิจกรรมได้เฉพาะผลคัดกรองล่าสุดของนักเรียน",
        roundOneOnly: "กิจกรรมช่วยเหลือมีได้เฉพาะผลคัดกรองครั้งที่ 1",
        classTeacherReferredLocked:
            "นักเรียนคนนี้ถูกส่งต่อแล้ว ครูประจำชั้นไม่สามารถทำกิจกรรมต่อได้",
        notOpen: "กิจกรรมนี้ยังไม่เปิดให้ทำ กรุณารีเฟรชหน้าแล้วลองใหม่",
        alreadySubmitted: "กิจกรรมนี้ส่งใบงานครบแล้ว กรุณารีเฟรชหน้าแล้วลองใหม่",
        worksheetLimitReached: (requiredCount: number): string =>
            `อัปโหลดใบงานครบ ${requiredCount} ไฟล์แล้ว หากต้องการเปลี่ยนไฟล์ให้ลบไฟล์เดิมก่อน`,
    },
} as const;

