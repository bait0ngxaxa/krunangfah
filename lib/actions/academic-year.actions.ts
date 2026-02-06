"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import {
    getCurrentAcademicYear,
    generateAcademicYearData,
} from "@/lib/utils/academic-year";
import type { AcademicYear } from "@/types/teacher.types";

/**
 * ดึงรายการปีการศึกษาทั้งหมด พร้อม auto-create ถ้าปีปัจจุบันยังไม่มี
 */
export async function getAcademicYears(): Promise<AcademicYear[]> {
    try {
        await requireAuth();

        // 1. คำนวณปีการศึกษาปัจจุบัน
        const current = getCurrentAcademicYear();

        // 2. ตรวจสอบว่าปีปัจจุบันมีใน DB หรือยัง
        const exists = await prisma.academicYear.findUnique({
            where: {
                year_semester: {
                    year: current.year,
                    semester: current.semester,
                },
            },
        });

        // 3. ถ้าไม่มี → สร้างใหม่ (ทั้ง 2 เทอมของปีนั้น)
        if (!exists) {
            await ensureAcademicYearExists(current.year, current.semester);
        }

        // 4. อัพเดต isCurrent flag
        await updateCurrentFlag(current.year, current.semester);

        // 5. Return ทั้งหมด (เรียงจากใหม่ → เก่า)
        const academicYears = await prisma.academicYear.findMany({
            orderBy: [{ year: "desc" }, { semester: "desc" }],
        });

        return academicYears;
    } catch (error) {
        console.error("Get academic years error:", error);
        return [];
    }
}

/**
 * ดึงปีการศึกษาปัจจุบัน (ที่ isCurrent = true)
 */
export async function getCurrentAcademicYearRecord(): Promise<AcademicYear | null> {
    try {
        await requireAuth();

        const current = getCurrentAcademicYear();

        // ใช้ upsert เพื่อให้แน่ใจว่ามีอยู่
        const record = await prisma.academicYear.upsert({
            where: {
                year_semester: {
                    year: current.year,
                    semester: current.semester,
                },
            },
            update: {
                isCurrent: true,
            },
            create: {
                year: current.year,
                semester: current.semester,
                startDate: current.startDate,
                endDate: current.endDate,
                isCurrent: true,
            },
        });

        return record;
    } catch (error) {
        console.error("Get current academic year error:", error);
        return null;
    }
}

/**
 * สร้างปีการศึกษาใหม่ (ทั้ง 2 เทอม)
 */
async function ensureAcademicYearExists(
    year: number,
    currentSemester: number,
): Promise<void> {
    const yearData = generateAcademicYearData(year);

    for (const data of yearData) {
        await prisma.academicYear.upsert({
            where: {
                year_semester: {
                    year: data.year,
                    semester: data.semester,
                },
            },
            update: {},
            create: {
                year: data.year,
                semester: data.semester,
                startDate: data.startDate,
                endDate: data.endDate,
                isCurrent:
                    data.year === year && data.semester === currentSemester,
            },
        });
    }

    console.warn(`✅ Auto-created academic year ${year}`);
}

/**
 * อัพเดต isCurrent flag (ใช้ transaction ป้องกัน race condition)
 */
async function updateCurrentFlag(
    currentYear: number,
    currentSemester: number,
): Promise<void> {
    // เช็คก่อนว่า flag ถูกต้องอยู่แล้วหรือไม่
    const currentRecord = await prisma.academicYear.findUnique({
        where: {
            year_semester: {
                year: currentYear,
                semester: currentSemester,
            },
        },
        select: { isCurrent: true },
    });

    // ถ้า isCurrent = true อยู่แล้ว ไม่ต้องทำอะไร
    if (currentRecord?.isCurrent) {
        return;
    }

    // ใช้ transaction ป้องกัน race condition
    await prisma.$transaction([
        // Reset all to false
        prisma.academicYear.updateMany({
            where: { isCurrent: true },
            data: { isCurrent: false },
        }),
        // Set current one to true
        prisma.academicYear.update({
            where: {
                year_semester: {
                    year: currentYear,
                    semester: currentSemester,
                },
            },
            data: { isCurrent: true },
        }),
    ]);
}
