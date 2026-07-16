import type { StaffAssignmentCommand } from "./staff-assignment-command";

export function getSuccessMessage(input: StaffAssignmentCommand): string {
    if (input.togglePrimary) return "เปลี่ยน Primary Admin สำเร็จ";
    return input.advisoryClass === undefined
        ? "เปลี่ยนบทบาทสำเร็จ"
        : "แก้ไขห้องที่ปรึกษาสำเร็จ";
}

export function getDefaultReason(input: StaffAssignmentCommand): string {
    if (input.togglePrimary) return "เปลี่ยนสิทธิ์ Primary Admin ของบุคลากร";
    return input.advisoryClass === undefined
        ? "เปลี่ยนบทบาทและสิทธิ์บุคลากร"
        : "แก้ไขห้องที่ปรึกษาและบทบาทอัตโนมัติของบุคลากร";
}

export function getNoChangeMessage(input: StaffAssignmentCommand): string {
    if (input.togglePrimary) return "Primary Admin ไม่เปลี่ยนแปลง";
    return input.advisoryClass === undefined
        ? "บทบาทไม่เปลี่ยนแปลง"
        : "ห้องที่ปรึกษาไม่เปลี่ยนแปลง";
}
