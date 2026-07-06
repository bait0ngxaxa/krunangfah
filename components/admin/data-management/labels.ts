import type { DataManagementEventItem, ManagedActionKey } from "./types";

export function getActionLabel(action: ManagedActionKey): string {
    switch (action) {
        case "mark-test":
            return "ตั้งเป็นข้อมูลทดสอบ";
        case "unmark-test":
            return "ยกเลิกข้อมูลทดสอบ";
        case "disable":
            return "ปิดใช้งาน";
        case "restore":
            return "กู้คืน";
        case "permanent-delete":
            return "ลบถาวร";
    }
}

export function toUiAction(
    action: DataManagementEventItem["action"],
): ManagedActionKey {
    switch (action) {
        case "MARK_TEST_DATA":
            return "mark-test";
        case "UNMARK_TEST_DATA":
            return "unmark-test";
        case "DISABLE":
            return "disable";
        case "RESTORE":
            return "restore";
        case "PERMANENT_DELETE":
            return "permanent-delete";
    }
}
