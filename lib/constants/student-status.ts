export const STUDENT_STATUS = {
    ACTIVE: "ACTIVE",
    RESIGNED: "RESIGNED",
    TRANSFERRED: "TRANSFERRED",
    GRADUATED: "GRADUATED",
} as const;

export const STUDENT_STATUS_VALUES = [
    STUDENT_STATUS.ACTIVE,
    STUDENT_STATUS.RESIGNED,
    STUDENT_STATUS.TRANSFERRED,
    STUDENT_STATUS.GRADUATED,
] as const;

export type StudentStatusValue = (typeof STUDENT_STATUS_VALUES)[number];

export const STUDENT_STATUS_OPTIONS: readonly {
    value: StudentStatusValue;
    label: string;
}[] = [
    { value: STUDENT_STATUS.ACTIVE, label: "กำลังศึกษา" },
    { value: STUDENT_STATUS.RESIGNED, label: "ลาออก" },
    { value: STUDENT_STATUS.TRANSFERRED, label: "ย้ายออก" },
    { value: STUDENT_STATUS.GRADUATED, label: "เรียนจบ" },
];

const STUDENT_STATUS_SET: ReadonlySet<string> = new Set(STUDENT_STATUS_VALUES);

const COUNT_EXCLUDED_STUDENT_STATUSES: ReadonlySet<StudentStatusValue> = new Set([
    STUDENT_STATUS.RESIGNED,
    STUDENT_STATUS.TRANSFERRED,
]);

const ACTION_BLOCKED_STUDENT_STATUSES: ReadonlySet<StudentStatusValue> = new Set([
    STUDENT_STATUS.RESIGNED,
    STUDENT_STATUS.TRANSFERRED,
    STUDENT_STATUS.GRADUATED,
]);

export function isStudentStatusValue(
    value: unknown,
): value is StudentStatusValue {
    return typeof value === "string" && STUDENT_STATUS_SET.has(value);
}

export function parseStudentStatusValue(
    value: unknown,
): StudentStatusValue | null {
    return isStudentStatusValue(value) ? value : null;
}

export function getStudentStatusLabel(status: string): string {
    switch (status) {
        case STUDENT_STATUS.ACTIVE:
            return "กำลังศึกษา";
        case STUDENT_STATUS.RESIGNED:
            return "ลาออก";
        case STUDENT_STATUS.TRANSFERRED:
            return "ย้ายออก";
        case STUDENT_STATUS.GRADUATED:
            return "เรียนจบ";
        default:
            return status;
    }
}

export function isStudentCountExcludedStatus(
    status: StudentStatusValue,
): boolean {
    return COUNT_EXCLUDED_STUDENT_STATUSES.has(status);
}

export function canStudentPerformActions(status: StudentStatusValue): boolean {
    return !ACTION_BLOCKED_STUDENT_STATUSES.has(status);
}

export function getStudentActionBlockedMessage(
    status: StudentStatusValue,
): string | null {
    if (canStudentPerformActions(status)) return null;

    return (
        `นักเรียนสถานะ${getStudentStatusLabel(status)} ` +
        "ไม่สามารถทำกิจกรรมหรือบันทึกการช่วยเหลือต่อได้"
    );
}
