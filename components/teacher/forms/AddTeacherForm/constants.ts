/**
 * Constants for AddTeacherForm
 */

export const PROJECT_ROLES = [
    { value: "lead", label: "ทีมนำ" },
    { value: "care", label: "ทีมดูแล" },
    { value: "coordinate", label: "ทีมประสาน" },
] as const;

export const USER_ROLES = [
    { value: "school_admin", label: "ครูนางฟ้า" },
    { value: "class_teacher", label: "ครูประจำชั้น" },
] as const;

export const ADMIN_ADVISORY_CLASS = "ทุกห้อง";
