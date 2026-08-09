import { Prisma } from "@prisma/client";
import { STUDENT_COUNT_EXCLUDED_STATUSES } from "@/lib/constants/student-status";

export function buildCurrentStudentPopulationWhere(): Prisma.StudentWhereInput {
    return {
        status: { notIn: [...STUDENT_COUNT_EXCLUDED_STATUSES] },
    };
}

/** Raw SQL callers using this fragment must alias students as `s`. */
export function buildCurrentStudentPopulationSql(): Prisma.Sql {
    return Prisma.sql`
        AND s."status"::text NOT IN (${Prisma.join(STUDENT_COUNT_EXCLUDED_STATUSES)})
    `;
}
