/**
 * Server Actions for Counseling Sessions
 * การจัดการบันทึกการให้คำปรึกษา
 *
 * Access control:
 * - school_admin: ดูได้ทุกนักเรียนในโรงเรียน
 * - class_teacher: ดูได้เฉพาะนักเรียนในห้องที่ดูแล (advisoryClass)
 */

"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { logError } from "@/lib/utils/logging";
import {
    counselingSessionSchema,
    updateCounselingSessionSchema,
    deleteCounselingSessionSchema,
} from "@/lib/validations/counseling.validation";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";

export interface CounselingSession {
    id: string;
    sessionNumber: number;
    sessionDate: Date;
    counselorName: string;
    summary: string;
    createdAt: Date;
}

const MAX_SESSION_NUMBER_RETRIES = 3;

/**
 * Verify user has access to student
 */
async function verifyStudentAccess(
    studentId: string,
    userId: string,
    userRole: string,
): Promise<{ allowed: boolean; error?: string }> {
    // system_admin can access all students
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

    // Fetch user and student in parallel (independent queries)
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
            logError("Access denied:", error);
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
        logError("Error fetching counseling sessions:", error);
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

        // system_admin เป็น readonly — ไม่สามารถเพิ่มบันทึกได้
        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: ERROR_MESSAGES.role.systemAdminReadonlyActivity,
            };
        }

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

        let counselingSession:
            | {
                  id: string;
                  studentId: string;
                  sessionNumber: number;
                  sessionDate: Date;
                  counselorName: string;
                  summary: string;
                  createdById: string;
                  createdAt: Date;
                  updatedAt: Date;
              }
            | undefined;

        for (let attempt = 0; attempt < MAX_SESSION_NUMBER_RETRIES; attempt++) {
            try {
                counselingSession = await prisma.$transaction(
                    async (tx) => {
                        const lastSession = await tx.counselingSession.findFirst({
                            where: { studentId: validated.studentId },
                            orderBy: { sessionNumber: "desc" },
                            select: { sessionNumber: true },
                        });

                        const sessionNumber = (lastSession?.sessionNumber || 0) + 1;

                        return tx.counselingSession.create({
                            data: {
                                studentId: validated.studentId,
                                sessionNumber,
                                sessionDate: validated.sessionDate,
                                counselorName: validated.counselorName,
                                summary: validated.summary,
                                createdById: userId,
                            },
                        });
                    },
                    {
                        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
                    },
                );
                break;
            } catch (txError) {
                if (
                    txError instanceof Prisma.PrismaClientKnownRequestError &&
                    (txError.code === "P2002" || txError.code === "P2034") &&
                    attempt < MAX_SESSION_NUMBER_RETRIES - 1
                ) {
                    continue;
                }
                throw txError;
            }
        }

        if (!counselingSession) {
            return { success: false, message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
        }

        revalidatePath(`/students/${validated.studentId}`);

        return { success: true, session: counselingSession };
    } catch (error) {
        logError("Error creating counseling session:", error);
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

        // system_admin เป็น readonly — ไม่สามารถแก้ไขบันทึกได้
        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: ERROR_MESSAGES.role.systemAdminReadonlyActivity,
            };
        }

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
        logError("Error updating counseling session:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการแก้ไขข้อมูล" };
    }
}

/**
 * Delete a counseling session
 */
export async function deleteCounselingSession(id: string) {
    try {
        // Validate input
        const validated = deleteCounselingSessionSchema.parse({
            sessionId: id,
        });

        const session = await requireAuth();

        // system_admin เป็น readonly — ไม่สามารถลบบันทึกได้
        if (session.user.role === "system_admin") {
            return {
                success: false,
                message: ERROR_MESSAGES.role.systemAdminReadonlyActivity,
            };
        }

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
        logError("Error deleting counseling session:", error);
        return { success: false, message: "เกิดข้อผิดพลาดในการลบข้อมูล" };
    }
}
