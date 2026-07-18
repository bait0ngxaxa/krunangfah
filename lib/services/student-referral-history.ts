import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { getReferralStatus, type ReferralHistoryRecord } from "@/types/referral.types";

const REFERRAL_HISTORY_SELECT = {
    id: true,
    studentId: true,
    fromTeacherUserId: true,
    toTeacherUserId: true,
    createdAt: true,
    updatedAt: true,
    revokedAt: true,
    revokedById: true,
    revokeReason: true,
    closedAt: true,
    fromTeacher: { select: { teacher: { select: { firstName: true, lastName: true } } } },
    toTeacher: { select: { teacher: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.StudentReferralSelect;

type ReferralHistoryRow = Prisma.StudentReferralGetPayload<{
    select: typeof REFERRAL_HISTORY_SELECT;
}>;

type Revoker = {
    id: string;
    name: string | null;
    email: string;
    teacher: { firstName: string; lastName: string } | null;
};

/**
 * Loads immutable referral history after rechecking the caller's student scope.
 */
export async function getStudentReferralHistory(
    studentId: string,
    studentScope: Prisma.StudentWhereInput,
): Promise<ReferralHistoryRecord[]> {
    const rows = await prisma.studentReferral.findMany({
        where: {
            studentId,
            student: studentScope,
        },
        select: REFERRAL_HISTORY_SELECT,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    if (rows.length === 0) return [];

    const revokerIds = Array.from(
        new Set(
            rows.flatMap((row) =>
                row.revokedById ? [row.revokedById] : [],
            ),
        ),
    );
    const revokers = revokerIds.length
        ? await prisma.user.findMany({
              where: { id: { in: revokerIds } },
              select: {
                  id: true,
                  name: true,
                  email: true,
                  teacher: { select: { firstName: true, lastName: true } },
              },
          })
        : [];
    const revokerById = new Map(revokers.map((user) => [user.id, user]));

    return rows.map((row) => toReferralHistoryRecord(row, revokerById));
}

function toReferralHistoryRecord(
    row: ReferralHistoryRow,
    revokerById: Map<string, Revoker>,
): ReferralHistoryRecord {
    const revoker = row.revokedById
        ? revokerById.get(row.revokedById)
        : undefined;
    return {
        id: row.id,
        studentId: row.studentId,
        fromTeacherUserId: row.fromTeacherUserId,
        toTeacherUserId: row.toTeacherUserId,
        fromTeacherName: formatTeacherName(row.fromTeacher.teacher),
        toTeacherName: formatTeacherName(row.toTeacher.teacher),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        revokedAt: row.revokedAt,
        revokedById: row.revokedById,
        revokedByName: formatRevokerName(revoker),
        revokeReason: row.revokeReason,
        closedAt: row.closedAt,
        status: getReferralStatus(row),
    };
}

function formatTeacherName(
    teacher: { firstName: string; lastName: string } | null,
): string | null {
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : null;
}

function formatRevokerName(revoker: Revoker | undefined): string | null {
    if (!revoker) return null;
    if (revoker.teacher) return formatTeacherName(revoker.teacher);
    return revoker.name ?? revoker.email;
}
