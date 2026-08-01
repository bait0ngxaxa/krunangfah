"use server";

import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";
import { getCurrentAcademicYear } from "@/lib/utils/academic-year";
import type { AcademicYear } from "@/types/teacher.types";
import { handleQueryError } from "./error-handler";
import { ensureCurrentAcademicYearLifecycle } from "@/lib/services/academic-year-lifecycle";
import {
    queryEmpty,
    querySuccess,
    type QueryResult,
} from "./query-result";

/**
 * ดึงรายการปีการศึกษาทั้งหมด พร้อม auto-create ถ้าปีปัจจุบันยังไม่มี
 */
export async function getAcademicYears(): Promise<QueryResult<AcademicYear[]>> {
    try {
        await requireAuth();

        await ensureCurrentAcademicYearLifecycle();

        const academicYears = await prisma.academicYear.findMany({
            orderBy: [{ year: "desc" }, { semester: "desc" }],
        });

        return academicYears.length === 0
            ? queryEmpty(academicYears)
            : querySuccess(academicYears);
    } catch (error) {
        return handleQueryError("Get academic years error:", error);
    }
}
/**
 * ดึงเฉพาะเทอมของปีการศึกษาปัจจุบัน สำหรับ workflow ที่ไม่ควรเลือกปีย้อนหลัง
 */
export async function getCurrentAcademicYearTerms(): Promise<
    QueryResult<AcademicYear[]>
> {
    try {
        await requireAuth();

        const current = getCurrentAcademicYear();

        await ensureCurrentAcademicYearLifecycle();

        const academicYears = await prisma.academicYear.findMany({
            where: { year: current.year },
            orderBy: [{ year: "desc" }, { semester: "desc" }],
        });
        return academicYears.length === 0
            ? queryEmpty(academicYears)
            : querySuccess(academicYears);
    } catch (error) {
        return handleQueryError("Get current academic year terms error:", error);
    }
}

/**
 * ดึงปีการศึกษาปัจจุบัน (ที่ isCurrent = true)
 */
export async function getCurrentAcademicYearRecord(): Promise<
    QueryResult<AcademicYear>
> {
    try {
        await requireAuth();

        const record = await ensureCurrentAcademicYearLifecycle();

        return querySuccess(record);
    } catch (error) {
        return handleQueryError("Get current academic year error:", error);
    }
}
