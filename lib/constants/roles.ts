/**
 * Shared role labels and options — SSOT for user roles and project roles.
 * Import from here instead of defining inline.
 */

// ──── User Role (ประเภทครู) ────

export const USER_ROLE_LABELS: Record<string, string> = {
    system_admin: "ผู้ดูแลระบบ",
    school_admin: "ครูนางฟ้า",
    class_teacher: "ครูประจำชั้น",
};

export const USER_ROLE_OPTIONS = [
    { value: "school_admin", label: "ครูนางฟ้า" },
    { value: "class_teacher", label: "ครูประจำชั้น" },
] as const;

// ──── Project Role (บทบาทในโครงการ) ────

export const PROJECT_ROLE_LABELS: Record<string, string> = {
    lead: "ทีมนำ",
    care: "ทีมดูแล",
    coordinate: "ทีมประสาน",
};

/** Extended labels with English names (for display cards) */
export const PROJECT_ROLE_LABELS_EXT: Record<string, string> = {
    lead: "ทีมนำ (Lead)",
    care: "ทีมดูแล (Care)",
    coordinate: "ทีมประสานงาน (Coordinate)",
};

export const PROJECT_ROLE_OPTIONS = [
    { value: "lead", label: "ทีมนำ" },
    { value: "care", label: "ทีมดูแล" },
    { value: "coordinate", label: "ทีมประสาน" },
] as const;
