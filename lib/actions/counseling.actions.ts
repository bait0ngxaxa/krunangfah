/**
 * Server Actions for Counseling Sessions
 * การจัดการบันทึกการให้คำปรึกษา
 */

"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";

export interface CounselingSession {
    id: string;
    sessionNumber: number;
    sessionDate: Date;
    counselorName: string;
    summary: string;
    createdAt: Date;
}

/**
 * Get all counseling sessions for a student
 */
export async function getCounselingSessions(
    studentId: string,
): Promise<CounselingSession[]> {
    try {
        await requireAuth();

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
        const session = await requireAuth();
        const userId = session.user.id;

        // Get the next session number for this student
        const lastSession = await prisma.counselingSession.findFirst({
            where: { studentId: data.studentId },
            orderBy: { sessionNumber: "desc" },
            select: { sessionNumber: true },
        });

        const sessionNumber = (lastSession?.sessionNumber || 0) + 1;

        const counselingSession = await prisma.counselingSession.create({
            data: {
                studentId: data.studentId,
                sessionNumber,
                sessionDate: data.sessionDate,
                counselorName: data.counselorName,
                summary: data.summary,
                createdById: userId,
            },
        });

        revalidatePath(`/students/${data.studentId}`);

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
        await requireAuth();

        const session = await prisma.counselingSession.update({
            where: { id },
            data,
        });

        revalidatePath(`/students/${session.studentId}`);

        return { success: true, session };
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
        await requireAuth();

        const session = await prisma.counselingSession.findUnique({
            where: { id },
            select: { studentId: true },
        });

        if (!session) {
            return { success: false, message: "ไม่พบข้อมูลที่ต้องการลบ" };
        }

        await prisma.counselingSession.delete({
            where: { id },
        });

        revalidatePath(`/students/${session.studentId}`);

        return { success: true };
    } catch (error) {
        console.error("Error deleting counseling session:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบข้อมูล" };
    }
}
