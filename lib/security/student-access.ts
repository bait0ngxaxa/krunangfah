import type { UserRole } from "@/types/auth.types";

interface AccessActor {
    role: UserRole;
    schoolId?: string | null;
    advisoryClass?: string | null;
}

interface AccessTarget {
    schoolId?: string | null;
    className?: string | null;
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

