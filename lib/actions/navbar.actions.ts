"use server";

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { handleQueryError } from "./error-handler";
import { queryEmpty, querySuccess, type QueryResult } from "./query-result";

/**
 * Check if the current user has any students
 * class_teacher: checks students in their advisoryClass
 * school_admin/system_admin: checks students in their school
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

        if (dbUser.role === "class_teacher") {
            const advisoryClass = dbUser.teacher?.advisoryClass;
            if (!advisoryClass) return queryEmpty(false);

            const count = await prisma.student.count({
                where: {
                    ...(dbUser.schoolId ? { schoolId: dbUser.schoolId } : {}),
                    class: advisoryClass,
                },
            });

            return count > 0 ? querySuccess(true) : queryEmpty(false);
        }

        // school_admin / system_admin
        const where: { schoolId?: string } = {};
        if (dbUser.schoolId) {
            where.schoolId = dbUser.schoolId;
        }

        const studentCount = await prisma.student.count({ where });
        return studentCount > 0 ? querySuccess(true) : queryEmpty(false);
    } catch (error) {
        return handleQueryError("Error checking students:", error);
    }
}
