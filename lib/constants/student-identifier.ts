export const STUDENT_IDENTIFIER_EDIT_REASON_OPTIONS = [
    { value: "ISSUED", label: "ได้รับเลขประจำตัวอย่างเป็นทางการ" },
    { value: "CORRECTION", label: "แก้ไขตามทะเบียนนักเรียน" },
] as const;

export const STUDENT_IDENTIFIER_CLEAR_REASON_OPTION = {
    value: "VERIFIED_REMOVAL",
    label: "ยืนยันกับทะเบียนแล้วว่าต้องล้างเลขเดิม",
} as const;

export const STUDENT_IDENTIFIER_REASONS = [
    ...STUDENT_IDENTIFIER_EDIT_REASON_OPTIONS.map(({ value }) => value),
    STUDENT_IDENTIFIER_CLEAR_REASON_OPTION.value,
] as const;
