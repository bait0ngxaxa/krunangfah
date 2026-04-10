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
    },
} as const;

