import type { Gender, ProjectRole, StudentStatus, UserRole } from "@prisma/client";
import type { SystemEntityKind } from "@/lib/actions/system-admin/types";
import { getRiskLabel, isRiskLevel } from "@/lib/constants/risk-levels";

export function getEntityTypeLabel(type: SystemEntityKind): string {
    switch (type) {
        case "school":
            return "โรงเรียน";
        case "staff":
            return "บุคลากร";
        case "student":
            return "นักเรียน";
    }
}

export function getRoleLabel(
    role: UserRole,
    options: { isPrimary?: boolean } = {},
): string {
    switch (role) {
        case "system_admin":
            return "ผู้ดูแลระบบ";
        case "school_admin":
            return options.isPrimary ? "ผู้ดูแลโรงเรียน" : "ครูนางฟ้า";
        case "class_teacher":
            return "ครูประจำชั้น";
    }
}

export function getProjectRoleLabel(role: ProjectRole): string {
    switch (role) {
        case "lead":
            return "ผู้นำโครงการ";
        case "care":
            return "ดูแลช่วยเหลือ";
        case "coordinate":
            return "ประสานงาน";
    }
}

export function getStudentStatusLabel(status: StudentStatus): string {
    switch (status) {
        case "ACTIVE":
            return "กำลังเรียน";
        case "RESIGNED":
            return "ลาออก";
        case "TRANSFERRED":
            return "ย้ายโรงเรียน";
        case "GRADUATED":
            return "จบการศึกษา";
    }
}

export function getActivityStatusLabel(status: string): string {
    switch (status) {
        case "locked":
            return "ยังไม่เปิด";
        case "pending":
            return "รอดำเนินการ";
        case "in_progress":
            return "กำลังดำเนินการ";
        case "completed":
            return "เสร็จแล้ว";
        case "skipped":
            return "ข้ามกิจกรรม";
        case "cancelled":
            return "ยกเลิก";
        default:
            return status;
    }
}

export function getPhqRiskLevelLabel(riskLevel: string): string {
    return isRiskLevel(riskLevel) ? getRiskLabel(riskLevel) : riskLevel;
}

export function getGenderLabel(gender: Gender | null): string {
    if (gender === "MALE") return "ชาย";
    if (gender === "FEMALE") return "หญิง";
    return "ไม่ระบุ";
}
