"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requirePrimaryAdmin } from "@/lib/session";
import { revalidatePath, revalidateTag } from "next/cache";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import type {
    SchoolClassItem,
    SchoolContextData,
    SchoolSetupResponse,
    ClassActionResponse,
    TeacherOption,
} from "@/types/school-setup.types";

const CLASSES_PATH = "/school/classes";

/**
 * Re-reads schoolId from DB when JWT is stale (e.g. right after createSchoolAndLink).
 * Falls back to the value in session if present.
 */
async function resolveSchoolId(
    userId: string,
    sessionSchoolId: string | null | undefined,
): Promise<string | null> {
    if (sessionSchoolId) return sessionSchoolId;
    const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { schoolId: true },
    });
    return dbUser?.schoolId ?? null;
}

const schoolSetupSchema = z.object({
    name: z.string().min(1, "กรุณากรอกชื่อโรงเรียน"),
    province: z.string().optional(),
});

const classNameSchema = z
    .string()
    .min(1, "กรุณากรอกชื่อห้องเรียน")
    .max(50, "ชื่อห้องเรียนยาวเกินไป");

/**
 * สร้างโรงเรียนและผูก schoolId เข้ากับ user ปัจจุบัน (school_admin only)
 */
export async function createSchoolAndLink(input: {
    name: string;
    province?: string;
}): Promise<SchoolSetupResponse> {
    try {
        const session = await requireAuth();

        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: "system_admin ไม่ต้องตั้งค่าโรงเรียน",
            };
        }

        const parsed = schoolSetupSchema.safeParse(input);
        if (!parsed.success) {
            return { success: false, message: parsed.error.issues[0].message };
        }

        // Transaction prevents race condition (double-click creating duplicate schools)
        const school = await prisma.$transaction(async (tx) => {
            // Re-check inside transaction to prevent concurrent double-create
            const user = await tx.user.findUnique({
                where: { id: session.user.id },
                select: { schoolId: true },
            });

            if (user?.schoolId) {
                return null; // Already has a school
            }

            const newSchool = await tx.school.create({
                data: {
                    name: parsed.data.name.trim(),
                    province: parsed.data.province?.trim() || null,
                },
            });

            await tx.user.update({
                where: { id: session.user.id },
                data: { schoolId: newSchool.id },
            });

            return newSchool;
        });

        if (!school) {
            return { success: false, message: "คุณมีโรงเรียนอยู่แล้ว" };
        }

        revalidateTag("dashboard", "default");

        return {
            success: true,
            message: "สร้างโรงเรียนสำเร็จ",
            data: { schoolId: school.id },
        };
    } catch (error) {
        console.error("createSchoolAndLink error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการสร้างโรงเรียน" };
    }
}

/**
 * เพิ่มห้องเรียนเข้าโรงเรียน (school_admin only)
 */
export async function addSchoolClass(
    name: string,
): Promise<ClassActionResponse> {
    try {
        const session = await requirePrimaryAdmin();
        const schoolId = await resolveSchoolId(
            session.user.id,
            session.user.schoolId,
        );

        if (!schoolId) {
            return { success: false, message: "กรุณาตั้งค่าโรงเรียนก่อน" };
        }

        const parsedName = classNameSchema.safeParse(name.trim());
        if (!parsedName.success) {
            return {
                success: false,
                message: parsedName.error.issues[0].message,
            };
        }

        // Normalize ชื่อห้องเรียนให้เป็นรูปแบบมาตรฐาน เช่น "ม1/2" → "ม.1/2"
        const normalizedName = normalizeClassName(parsedName.data);

        const existing = await prisma.schoolClass.findUnique({
            where: { schoolId_name: { schoolId, name: normalizedName } },
        });

        if (existing) {
            return {
                success: false,
                message: `ห้อง "${normalizedName}" มีอยู่แล้ว`,
            };
        }

        const schoolClass = await prisma.schoolClass.create({
            data: { schoolId, name: normalizedName },
        });

        revalidatePath(CLASSES_PATH);

        return {
            success: true,
            message: "เพิ่มห้องเรียนสำเร็จ",
            data: { id: schoolClass.id, name: schoolClass.name },
        };
    } catch (error) {
        console.error("addSchoolClass error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการเพิ่มห้องเรียน" };
    }
}

/**
 * ลบห้องเรียน (school_admin only)
 */
export async function removeSchoolClass(
    id: string,
): Promise<ClassActionResponse> {
    try {
        const session = await requirePrimaryAdmin();
        const schoolId = await resolveSchoolId(
            session.user.id,
            session.user.schoolId,
        );

        if (!schoolId) {
            return { success: false, message: "ไม่พบโรงเรียนของคุณ" };
        }

        const schoolClass = await prisma.schoolClass.findUnique({
            where: { id },
        });

        if (!schoolClass || schoolClass.schoolId !== schoolId) {
            return { success: false, message: "ไม่พบห้องเรียนที่ต้องการลบ" };
        }

        await prisma.schoolClass.delete({ where: { id } });

        revalidatePath(CLASSES_PATH);

        return { success: true, message: "ลบห้องเรียนสำเร็จ" };
    } catch (error) {
        console.error("removeSchoolClass error:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบห้องเรียน" };
    }
}

/**
 * ดึงรายการห้องเรียนของโรงเรียนตัวเอง
 */
export async function getSchoolClasses(): Promise<SchoolClassItem[]> {
    const session = await requireAuth();
    const schoolId = await resolveSchoolId(
        session.user.id,
        session.user.schoolId,
    );

    if (!schoolId) return [];

    const classes = await prisma.schoolClass.findMany({
        where: { schoolId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
    });

    return classes;
}

/**
 * ดึง context ของโรงเรียน (classes + teachers) ใช้สำหรับ populate dropdowns
 */
export async function getSchoolContext(): Promise<SchoolContextData> {
    const session = await requireAuth();
    const schoolId = await resolveSchoolId(
        session.user.id,
        session.user.schoolId,
    );

    if (!schoolId) return { classes: [], teachers: [] };

    const [classes, teacherRows] = await Promise.all([
        prisma.schoolClass.findMany({
            where: { schoolId },
            orderBy: { name: "asc" },
            select: { id: true, name: true },
        }),
        prisma.teacher.findMany({
            where: { user: { schoolId } },
            select: {
                id: true,
                userId: true,
                firstName: true,
                lastName: true,
                advisoryClass: true,
            },
            orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        }),
    ]);

    const teachers: TeacherOption[] = teacherRows.map((t) => ({
        id: t.id,
        userId: t.userId,
        name: `${t.firstName} ${t.lastName}`,
        advisoryClass: t.advisoryClass,
    }));

    return { classes, teachers };
}
