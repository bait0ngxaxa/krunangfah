import { prisma } from "@/lib/database/prisma";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";
import { getStudentActionBlockedMessage } from "@/lib/constants/student-status";

type ActivityAccessMode = "read" | "manage";

interface ActivityAccessResult {
    allowed: boolean;
    error?: string;
}

/**
 * Read access follows school/class scope.
 * Manage access adds the business rule that class_teacher cannot continue
 * activity work after the student has been referred onward.
 */
export async function verifyStudentActivityAccess(
    studentId: string,
    userId: string,
    userRole: string,
    mode: ActivityAccessMode = "read",
): Promise<ActivityAccessResult> {
    if (userRole === "system_admin") {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true, status: true },
        });

        if (!student) {
            return { allowed: false, error: "ไม่พบข้อมูลนักเรียน" };
        }

        const statusError =
            mode === "manage"
                ? getStudentActionBlockedMessage(student.status)
                : null;

        return statusError
            ? { allowed: false, error: statusError }
            : { allowed: true };
    }

    const [user, student] = await Promise.all([
        prisma.user.findUnique({
            where: { id: userId },
            select: {
                schoolId: true,
                teacher: {
                    select: {
                        advisoryClass: true,
                    },
                },
            },
        }),
        prisma.student.findUnique({
            where: { id: studentId },
            select: {
                schoolId: true,
                class: true,
                status: true,
                referral: {
                    select: {
                        id: true,
                    },
                },
            },
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

    if (userRole !== "class_teacher") {
        const statusError =
            mode === "manage"
                ? getStudentActionBlockedMessage(student.status)
                : null;

        return statusError
            ? { allowed: false, error: statusError }
            : { allowed: true };
    }

    const advisoryClass = user.teacher?.advisoryClass;
    if (!advisoryClass || student.class !== advisoryClass) {
        return {
            allowed: false,
            error: "คุณสามารถเข้าถึงข้อมูลได้เฉพาะนักเรียนในห้องที่คุณดูแลเท่านั้น",
        };
    }

    const statusError =
        mode === "manage"
            ? getStudentActionBlockedMessage(student.status)
            : null;
    if (statusError) {
        return { allowed: false, error: statusError };
    }

    if (mode === "manage" && student.referral) {
        return {
            allowed: false,
            error: ERROR_MESSAGES.activity.classTeacherReferredLocked,
        };
    }

    return { allowed: true };
}
