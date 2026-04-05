import { revalidateTag } from "next/cache";
import type { GetStudentsOptions } from "./types";

export const STUDENTS_TAG = "students";
export const STUDENT_DETAIL_TAG = "student-detail";

export function getStudentsSchoolTag(schoolId: string): string {
    return `students:school:${schoolId}`;
}

export function getStudentDetailItemTag(studentId: string): string {
    return `student-detail:item:${studentId}`;
}

export function getStudentsCacheTags(schoolId?: string): string[] {
    if (!schoolId) {
        return [STUDENTS_TAG];
    }

    return [STUDENTS_TAG, getStudentsSchoolTag(schoolId)];
}

export function getStudentDetailCacheTags(
    schoolId?: string,
    studentId?: string,
): string[] {
    const tags: string[] = [STUDENT_DETAIL_TAG];
    if (schoolId) {
        tags.push(getStudentsSchoolTag(schoolId));
    }
    if (studentId) {
        tags.push(getStudentDetailItemTag(studentId));
    }
    return tags;
}

export function buildStudentsListCacheKey(input: {
    schoolId?: string;
    advisoryClass?: string;
    userRole: string;
    userId: string;
    options: GetStudentsOptions;
}): string[] {
    return [
        "students-list",
        `role:${input.userRole}`,
        `school:${input.schoolId ?? "none"}`,
        `advisory:${input.advisoryClass ?? "none"}`,
        `user:${input.userId}`,
        `page:${input.options.page ?? 1}`,
        `limit:${input.options.limit ?? 100}`,
        `class:${input.options.classFilter ?? "all"}`,
    ];
}

export function buildStudentsDashboardCacheKey(input: {
    scopeSchoolId?: string;
    advisoryClass?: string;
    userRole: string;
    userId: string;
}): string[] {
    return [
        "students-dashboard",
        `role:${input.userRole}`,
        `school:${input.scopeSchoolId ?? "none"}`,
        `advisory:${input.advisoryClass ?? "none"}`,
        `user:${input.userId}`,
    ];
}

export function buildStudentDetailCacheKey(input: {
    schoolId?: string;
    advisoryClass?: string;
    userRole: string;
    userId: string;
    studentId: string;
}): string[] {
    return [
        "student-detail",
        `role:${input.userRole}`,
        `school:${input.schoolId ?? "none"}`,
        `advisory:${input.advisoryClass ?? "none"}`,
        `user:${input.userId}`,
        `student:${input.studentId}`,
    ];
}

export function revalidateStudentsCache(
    schoolId?: string,
    studentId?: string,
): void {
    revalidateTag(STUDENTS_TAG, "default");
    revalidateTag(STUDENT_DETAIL_TAG, "default");

    if (schoolId) {
        revalidateTag(getStudentsSchoolTag(schoolId), "default");
    }
    if (studentId) {
        revalidateTag(getStudentDetailItemTag(studentId), "default");
    }
}
