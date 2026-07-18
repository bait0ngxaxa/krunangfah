"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { handleQueryError } from "./error-handler";
import { queryEmpty, querySuccess, type QueryResult } from "./query-result";
import { buildStudentVisibilityWhere } from "./student/student-scope";

/**
 * Check if the current user has any visible students.
 * Uses the same scope as the student list so navigation never points to an empty page.
 */
export async function hasStudents(): Promise<QueryResult<boolean>> {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { status: "forbidden" };
        }

        const dbUser = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                schoolId: true,
                role: true,
                teacher: { select: { advisoryClass: true } },
            },
        });
        if (!dbUser) return { status: "not_found" };
        if (!dbUser.schoolId && dbUser.role !== "system_admin") {
            return queryEmpty(false);
        }

        const where = buildStudentVisibilityWhere(
            dbUser.schoolId ?? undefined,
            dbUser.teacher?.advisoryClass ?? undefined,
            dbUser.role,
        );
        const studentCount = await prisma.student.count({ where });
        return studentCount > 0 ? querySuccess(true) : queryEmpty(false);
    } catch (error) {
        return handleQueryError("Error checking students:", error);
    }
}
