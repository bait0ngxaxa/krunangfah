/**
 * Server Actions for Home Visits
 * การจัดการบันทึกการเยี่ยมบ้านนักเรียน
 *
 * Access control:
 * - system_admin: ดูได้ทุกนักเรียน (readonly)
 * - school_admin: ดูได้ทุกนักเรียนในโรงเรียน
 * - class_teacher: ดูได้เฉพาะนักเรียนในห้องที่ดูแล
 */

"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
    createHomeVisitSchema,
    deleteHomeVisitSchema,
} from "@/lib/validations/home-visit.validation";
import { existsSync } from "fs";
import { join } from "path";

export interface HomeVisitPhotoData {
    id: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
}

export interface HomeVisitData {
    id: string;
    visitNumber: number;
    visitDate: Date;
    description: string;
    nextScheduledDate: Date | null;
    teacherName: string;
    teacherRole: string;
    photos: HomeVisitPhotoData[];
    createdAt: Date;
}

/**
 * Verify user has access to student (same pattern as counseling.actions.ts)
 */
async function verifyStudentAccess(
    studentId: string,
    userId: string,
    userRole: string,
): Promise<{ allowed: boolean; error?: string }> {
    if (userRole === "system_admin") {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true },
        });
        if (!student) {
            return { allowed: false, error: "ไม่พบข้อมูลนักเรียน" };
        }
        return { allowed: true };
    }

    const [user, student] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                schoolId: true,
                teacher: { select: { advisoryClass: true } },
            },
        }),
        prisma.student.findUnique({
            where: { id: studentId },
            select: { schoolId: true, class: true },
        }),
    ]);

    if (!user?.schoolId) {
        return { allowed: false, error: "ไม่พบข้อมูลโรงเรียน" };
    }

    if (!student) {
        return { allowed: false, error: "ไม่พบข้อมูลนักเรียน" };
    }

    if (student.schoolId !== user.schoolId) {
        return { allowed: false, error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" };
    }

    if (userRole === "class_teacher") {
        const advisoryClass = user.teacher?.advisoryClass;
        if (!advisoryClass || student.class !== advisoryClass) {
            return {
                allowed: false,
                error: "คุณสามารถเข้าถึงข้อมูลได้เฉพาะนักเรียนในห้องที่คุณดูแลเท่านั้น",
            };
        }
    }

    return { allowed: true };
}

/**
 * Get all home visits for a student
 */
export async function getHomeVisits(
    studentId: string,
): Promise<HomeVisitData[]> {
    try {
        const session = await requireAuth();
        const { allowed, error } = await verifyStudentAccess(
            studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            console.error("Access denied:", error);
            return [];
        }

        const visits = await prisma.homeVisit.findMany({
            where: { studentId },
            orderBy: { visitNumber: "desc" },
            select: {
                id: true,
                visitNumber: true,
                visitDate: true,
                description: true,
                nextScheduledDate: true,
                teacherName: true,
                teacherRole: true,
                createdAt: true,
                photos: {
                    select: {
                        id: true,
                        fileName: true,
                        fileUrl: true,
                        fileType: true,
                        fileSize: true,
                    },
                    orderBy: { uploadedAt: "asc" },
                },
            },
        });

        return visits;
    } catch (error) {
        console.error("Error fetching home visits:", error);
        return [];
    }
}

/**
 * Create a new home visit record
 */
export async function createHomeVisit(data: {
    studentId: string;
    visitDate: Date;
    description: string;
    nextScheduledDate?: Date;
}): Promise<{ success: boolean; message?: string; visitId?: string }> {
    try {
        const validated = createHomeVisitSchema.parse(data);
        const session = await requireAuth();

        if (session.user.role === "system_admin") {
            return { success: false, message: "system_admin ไม่มีสิทธิ์แก้ไขข้อมูล" };
        }

        const userId = session.user.id;

        const { allowed, error } = await verifyStudentAccess(
            validated.studentId,
            userId,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, message: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        // Get teacher info for snapshot
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                role: true,
                teacher: {
                    select: { firstName: true, lastName: true, advisoryClass: true },
                },
            },
        });

        const teacherName = user?.teacher
            ? `${user.teacher.firstName} ${user.teacher.lastName}`
            : "ไม่ระบุ";

        let teacherRole = "ไม่ระบุ";
        if (user?.role === "school_admin") {
            teacherRole = "ครูนางฟ้า";
        } else if (user?.role === "class_teacher" && user.teacher?.advisoryClass) {
            teacherRole = `ครูประจำชั้น ห้อง ${user.teacher.advisoryClass}`;
        }

        // Use transaction to prevent race condition on visitNumber
        const visit = await prisma.$transaction(async (tx) => {
            const lastVisit = await tx.homeVisit.findFirst({
                where: { studentId: validated.studentId },
                orderBy: { visitNumber: "desc" },
                select: { visitNumber: true },
            });

            const visitNumber = (lastVisit?.visitNumber || 0) + 1;

            return tx.homeVisit.create({
                data: {
                    studentId: validated.studentId,
                    visitNumber,
                    visitDate: validated.visitDate,
                    description: validated.description,
                    nextScheduledDate: validated.nextScheduledDate,
                    teacherName,
                    teacherRole,
                    createdById: userId,
                },
            });
        });

        revalidatePath(`/students/${validated.studentId}`);

        return { success: true, visitId: visit.id };
    } catch (error) {
        console.error("Error creating home visit:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
    }
}

/**
 * Delete a home visit and its photos from disk
 */
export async function deleteHomeVisit(
    visitId: string,
): Promise<{ success: boolean; message?: string }> {
    try {
        const validated = deleteHomeVisitSchema.parse({ visitId });
        const session = await requireAuth();

        if (session.user.role === "system_admin") {
            return { success: false, message: "system_admin ไม่มีสิทธิ์แก้ไขข้อมูล" };
        }

        const visit = await prisma.homeVisit.findUnique({
            where: { id: validated.visitId },
            select: {
                studentId: true,
                photos: { select: { fileUrl: true } },
            },
        });

        if (!visit) {
            return { success: false, message: "ไม่พบข้อมูลที่ต้องการลบ" };
        }

        const { allowed, error } = await verifyStudentAccess(
            visit.studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, message: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        // Delete photo files from disk
        const { unlink } = await import("fs/promises");
        for (const photo of visit.photos) {
            const fileName = photo.fileUrl.replace("/api/uploads/home-visits/", "");
            const filePath = join(
                process.cwd(),
                ".data",
                "uploads",
                "home-visits",
                fileName,
            );
            // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath built from DB fileUrl, not user input
            if (existsSync(filePath)) {
                await unlink(filePath).catch(() => {});
            }
        }

        // Cascade delete will remove photos from DB
        await prisma.homeVisit.delete({
            where: { id: validated.visitId },
        });

        revalidatePath(`/students/${visit.studentId}`);

        return { success: true };
    } catch (error) {
        console.error("Error deleting home visit:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบข้อมูล" };
    }
}
