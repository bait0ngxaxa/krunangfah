import { Prisma } from "@prisma/client";
import { buildCurrentStudentPopulationWhere } from "@/lib/utils/student-population";

interface ClassScopeViewer {
    role: string;
    advisoryClass?: string;
}

/**
 * A class teacher may filter only by their own advisory class. Checked at the
 * action boundary so another class's URL never reaches a query.
 */
export function isClassFilterAllowedForViewer(
    classFilter: string | undefined,
    viewer: ClassScopeViewer,
): boolean {
    if (viewer.role !== "class_teacher") return true;
    if (!classFilter || classFilter === "all") return true;
    return classFilter === viewer.advisoryClass;
}

/** Keeps only the classes a viewer may see (class teacher: advisory class). */
export function filterClassesForViewer(
    classes: readonly string[],
    viewer: ClassScopeViewer,
): string[] {
    if (viewer.role !== "class_teacher") return [...classes];
    return classes.filter((name) => name === viewer.advisoryClass);
}

export function buildStudentVisibilityWhere(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
): Prisma.StudentWhereInput {
    const where: Prisma.StudentWhereInput = {
        ...(schoolId ? { schoolId } : {}),
        disabledAt: null,
        isTestData: false,
        school: { disabledAt: null, isTestData: false },
    };

    if (userRole !== "class_teacher") return where;
    if (advisoryClass) return { ...where, class: advisoryClass };
    return { ...where, id: { in: [] } };
}

export function buildCurrentStudentVisibilityWhere(
    schoolId: string | undefined,
    advisoryClass: string | undefined,
    userRole: string,
): Prisma.StudentWhereInput {
    return {
        ...buildStudentVisibilityWhere(schoolId, advisoryClass, userRole),
        ...buildCurrentStudentPopulationWhere(),
    };
}

export function buildClassTeacherScopeSql(
    advisoryClass: string | undefined,
    userRole: string,
): Prisma.Sql {
    if (userRole !== "class_teacher") return Prisma.empty;
    if (!advisoryClass) return Prisma.sql`AND 1 = 0`;
    return Prisma.sql`AND s."class" = ${advisoryClass}`;
}

export function buildReferredStudentWhere(
    userRole: string,
    userId: string | undefined,
): Prisma.StudentWhereInput {
    if (userRole !== "class_teacher") {
        return { referral: { isNot: null } };
    }
    if (!userId) return { id: { in: [] } };
    return { referral: { is: { fromTeacherUserId: userId } } };
}

export function buildReferredStudentSql(
    userRole: string,
    userId: string | undefined,
): Prisma.Sql {
    if (userRole === "class_teacher") {
        if (!userId) return Prisma.sql`AND 1 = 0`;
        return Prisma.sql`AND EXISTS (
            SELECT 1 FROM student_referrals sr
            WHERE sr."studentId" = s.id
              AND sr."fromTeacherUserId" = ${userId}
              AND sr."revokedAt" IS NULL
              AND sr."closedAt" IS NULL
        )`;
    }

    return Prisma.sql`AND EXISTS (
        SELECT 1 FROM student_referrals sr
        WHERE sr."studentId" = s.id
          AND sr."revokedAt" IS NULL
          AND sr."closedAt" IS NULL
    )`;
}
