import type { Gender } from "@prisma/client";
import { INPUT_LIMITS } from "@/lib/constants/input-limits";

export function isImportStudentGender(value: unknown): value is Gender {
    return value === "MALE" || value === "FEMALE";
}

export function isImportStudentAge(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) &&
        value >= 1 && value <= INPUT_LIMITS.student.age;
}
