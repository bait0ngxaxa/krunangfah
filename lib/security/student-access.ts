import type { UserRole } from "@/types/auth.types";
import { prisma } from "@/lib/prisma";

interface AccessActor {
    role: UserRole;
    schoolId?: string | null;
    advisoryClass?: string | null;
}

interface AccessTarget {
    schoolId?: string | null;
    className?: string | null;
}

interface VerifyStudentAccessParams {
    studentId: string;
    userId: string;
    userRole: UserRole;
}

interface StudentAccessResult {
    allowed: boolean;
    error?: string;
}

/**
 * Authorization policy for student-scoped resources.
 * - system_admin: all students
 * - school_admin: own school
 * - class_teacher: own advisory class in own school
 */
export function canAccessStudentByRole(
    actor: AccessActor,
    target: AccessTarget,
): boolean {
    if (actor.role === "system_admin") {
        return true;
    }

    if (
        !actor.schoolId ||
        !target.schoolId ||
        actor.schoolId !== target.schoolId
    ) {
        return false;
    }

    if (actor.role === "class_teacher") {
        return (
            !!actor.advisoryClass && actor.advisoryClass === target.className
        );
    }

    return true;
}

export async function verifyStudentAccessForUser({
    studentId,
    userId,
    userRole,
}: VerifyStudentAccessParams): Promise<StudentAccessResult> {
    if (userRole === "system_admin") {
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: { id: true },
        });

        return student
            ? { allowed: true }
            : { allowed: false, error: "ไม่พบข้อมูลนักเรียน" };
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

    const allowed = canAccessStudentByRole(
        {
            role: userRole,
            schoolId: user.schoolId,
            advisoryClass: user.teacher?.advisoryClass,
        },
        { schoolId: student.schoolId, className: student.class },
    );

    if (allowed) {
        return { allowed: true };
    }

    if (userRole === "class_teacher") {
        return {
            allowed: false,
            error: "คุณสามารถเข้าถึงข้อมูลได้เฉพาะนักเรียนในห้องที่คุณดูแลเท่านั้น",
        };
    }

    return { allowed: false, error: "ไม่มีสิทธิ์เข้าถึงข้อมูลนี้" };
}

