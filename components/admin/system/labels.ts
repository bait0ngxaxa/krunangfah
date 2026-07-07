import type { Gender, ProjectRole, StudentStatus, UserRole } from "@prisma/client";
import type { SystemEntityKind } from "@/lib/actions/system-admin/types";

export function getEntityTypeLabel(type: SystemEntityKind): string {
    switch (type) {
        case "school":
            return "โรงเรียน";
        case "user":
            return "ผู้ใช้งาน";
        case "teacher":
            return "ครู";
        case "student":
            return "นักเรียน";
    }
}

export function getRoleLabel(role: UserRole): string {
    switch (role) {
        case "system_admin":
            return "System Admin";
        case "school_admin":
            return "ผู้ดูแลโรงเรียน";
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

export function getGenderLabel(gender: Gender | null): string {
    if (gender === "MALE") return "ชาย";
    if (gender === "FEMALE") return "หญิง";
    return "ไม่ระบุ";
}
