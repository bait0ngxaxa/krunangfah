"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import {
    getCurrentAcademicYear,
    type AcademicYearInfo,
} from "@/lib/utils/academic-year";
import type { AcademicYear } from "@/types/teacher.types";
import { handleActionError } from "./error-handler";

/**
 * ดึงรายการปีการศึกษาทั้งหมด พร้อม auto-create ถ้าปีปัจจุบันยังไม่มี
 */
export async function getAcademicYears(): Promise<AcademicYear[]> {
    try {
        await requireAuth();

        const current = getCurrentAcademicYear();

        await activateCurrentAcademicYear(current);

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
 * ดึงปีการศึกษาปัจจุบัน (ที่ isCurrent = true)
 */
export async function getCurrentAcademicYearRecord(): Promise<AcademicYear | null> {
    try {
        await requireAuth();

        const current = getCurrentAcademicYear();
        const record = await activateCurrentAcademicYear(current);

        return record;
    } catch (error) {
        return handleActionError({
            context: "Get current academic year error:",
            error,
            fallback: null,
        });
    }
}

/**
 * เปิดใช้ปีการศึกษา/เทอมปัจจุบันเท่านั้น ไม่สร้างเทอมล่วงหน้า
 */
async function activateCurrentAcademicYear(
    current: AcademicYearInfo,
): Promise<AcademicYear> {
    const [_, record] = await prisma.$transaction([
        prisma.academicYear.updateMany({
            where: {
                isCurrent: true,
                NOT: {
                    year: current.year,
                    semester: current.semester,
                },
            },
            data: { isCurrent: false },
        }),
        prisma.academicYear.upsert({
            where: {
                year_semester: {
                    year: current.year,
                    semester: current.semester,
                },
            },
            update: { isCurrent: true },
            create: {
                year: current.year,
                semester: current.semester,
                startDate: current.startDate,
                endDate: current.endDate,
                isCurrent: true,
            },
        }),
    ]);

    return record;
}
