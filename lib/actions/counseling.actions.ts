/**
 * Server Actions for Counseling Sessions
 * การจัดการบันทึกการให้คำปรึกษา
 *
 * Access control:
 * - school_admin: ดูได้ทุกนักเรียนในโรงเรียน
 * - class_teacher: ดูได้เฉพาะนักเรียนในห้องที่ดูแล (advisoryClass)
 */

"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
    counselingSessionSchema,
    updateCounselingSessionSchema,
    deleteCounselingSessionSchema,
} from "@/lib/validations/counseling.validation";

export interface CounselingSession {
    id: string;
    sessionNumber: number;
    sessionDate: Date;
    counselorName: string;
    summary: string;
    createdAt: Date;
}

/**
 * Verify user has access to student
 */
async function verifyStudentAccess(
    studentId: string,
    userId: string,
    userRole: string,
): Promise<{ allowed: boolean; error?: string }> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            schoolId: true,
            teacher: { select: { advisoryClass: true } },
        },
    });

    if (!user?.schoolId) {
        return { allowed: false, error: "ไม่พบข้อมูลโรงเรียน" };
    }

    const student = await prisma.student.findUnique({
        where: { id: studentId },
        select: { schoolId: true, class: true },
    });

    if (!student) {
        return { allowed: false, error: "ไม่พบข้อมูลนักเรียน" };
    }

    // Check same school
    if (student.schoolId !== user.schoolId) {
        return { allowed: false, error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" };
    }

    // Check class for class_teacher
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
 * Get all counseling sessions for a student
 */
export async function getCounselingSessions(
    studentId: string,
): Promise<CounselingSession[]> {
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

        const sessions = await prisma.counselingSession.findMany({
            where: { studentId },
            orderBy: { sessionNumber: "asc" },
            select: {
                id: true,
                sessionNumber: true,
                sessionDate: true,
                counselorName: true,
                summary: true,
                createdAt: true,
            },
        });

        return sessions;
    } catch (error) {
        console.error("Error fetching counseling sessions:", error);
        return [];
    }
}

/**
 * Create a new counseling session
 */
export async function createCounselingSession(data: {
    studentId: string;
    sessionDate: Date;
    counselorName: string;
    summary: string;
}) {
    try {
        // Validate input
        const validated = counselingSessionSchema.parse(data);

        const session = await requireAuth();
        const userId = session.user.id;

        // Verify access
        const { allowed, error } = await verifyStudentAccess(
            validated.studentId,
            userId,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, message: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        // Get the next session number for this student
        const lastSession = await prisma.counselingSession.findFirst({
            where: { studentId: validated.studentId },
            orderBy: { sessionNumber: "desc" },
            select: { sessionNumber: true },
        });

        const sessionNumber = (lastSession?.sessionNumber || 0) + 1;

        const counselingSession = await prisma.counselingSession.create({
            data: {
                studentId: validated.studentId,
                sessionNumber,
                sessionDate: validated.sessionDate,
                counselorName: validated.counselorName,
                summary: validated.summary,
                createdById: userId,
            },
        });

        revalidatePath(`/students/${validated.studentId}`);

        return { success: true, session: counselingSession };
    } catch (error) {
        console.error("Error creating counseling session:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
    }
}

/**
 * Update a counseling session
 */
export async function updateCounselingSession(
    id: string,
    data: {
        sessionDate?: Date;
        counselorName?: string;
        summary?: string;
    },
) {
    try {
        // Validate input
        const validated = updateCounselingSessionSchema.parse({
            sessionId: id,
            ...data,
        });

        const session = await requireAuth();

        // Get session to verify access
        const counselingSession = await prisma.counselingSession.findUnique({
            where: { id: validated.sessionId },
            select: { studentId: true },
        });

        if (!counselingSession) {
            return { success: false, message: "ไม่พบข้อมูลที่ต้องการแก้ไข" };
        }

        const { allowed, error } = await verifyStudentAccess(
            counselingSession.studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, message: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        const updated = await prisma.counselingSession.update({
            where: { id: validated.sessionId },
            data: {
                sessionDate: validated.sessionDate,
                counselorName: validated.counselorName,
                summary: validated.summary,
            },
        });

        revalidatePath(`/students/${updated.studentId}`);

        return { success: true, session: updated };
    } catch (error) {
        console.error("Error updating counseling session:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" };
    }
}

/**
 * Delete a counseling session
 */
export async function deleteCounselingSession(id: string) {
    try {
        // Validate input
        const validated = deleteCounselingSessionSchema.parse({ sessionId: id });

        const session = await requireAuth();

        const counselingSession = await prisma.counselingSession.findUnique({
            where: { id: validated.sessionId },
            select: { studentId: true },
        });

        if (!counselingSession) {
            return { success: false, message: "ไม่พบข้อมูลที่ต้องการลบ" };
        }

        const { allowed, error } = await verifyStudentAccess(
            counselingSession.studentId,
            session.user.id,
            session.user.role,
        );

        if (!allowed) {
            return { success: false, message: error || "ไม่มีสิทธิ์เข้าถึง" };
        }

        await prisma.counselingSession.delete({
            where: { id: validated.sessionId },
        });

        revalidatePath(`/students/${counselingSession.studentId}`);

        return { success: true };
    } catch (error) {
        console.error("Error deleting counseling session:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบข้อมูล" };
    }
}
