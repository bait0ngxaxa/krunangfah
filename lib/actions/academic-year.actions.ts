"use server";

import { prisma } from "@/lib/database/prisma";
import { requireAuth } from "@/lib/auth/session";
import { getCurrentAcademicYear } from "@/lib/utils/academic-year";
import type { AcademicYear } from "@/types/teacher.types";
import { handleActionError } from "./error-handler";
import { ensureCurrentAcademicYearLifecycle } from "@/lib/services/academic-year-lifecycle";

/**
 * ดึงรายการปีการศึกษาทั้งหมด พร้อม auto-create ถ้าปีปัจจุบันยังไม่มี
 */
export async function getAcademicYears(): Promise<AcademicYear[]> {
    try {
        await requireAuth();

        await ensureCurrentAcademicYearLifecycle();

        const academicYears = await prisma.academicYear.findMany({
            orderBy: [{ year: "desc" }, { semester: "desc" }],
        });

        return academicYears;
    } catch (error) {
        return handleActionError({
            context: "Get academic years error:",
            error,
            fallback: [],
        });
    }
}
/**
 * ดึงเฉพาะเทอมของปีการศึกษาปัจจุบัน สำหรับ workflow ที่ไม่ควรเลือกปีย้อนหลัง
 */
export async function getCurrentAcademicYearTerms(): Promise<AcademicYear[]> {
    try {
        await requireAuth();

        const current = getCurrentAcademicYear();

        await ensureCurrentAcademicYearLifecycle();

        return prisma.academicYear.findMany({
            where: { year: current.year },
            orderBy: [{ year: "desc" }, { semester: "desc" }],
        });
    } catch (error) {
        return handleActionError({
            context: "Get current academic year terms error:",
            error,
            fallback: [],
        });
    }
}

/**
 * ดึงปีการศึกษาปัจจุบัน (ที่ isCurrent = true)
 */
export async function getCurrentAcademicYearRecord(): Promise<AcademicYear | null> {
    try {
        await requireAuth();

        const record = await ensureCurrentAcademicYearLifecycle();

        return record;
    } catch (error) {
        return handleActionError({
            context: "Get current academic year error:",
            error,
            fallback: null,
        });
    }
}
