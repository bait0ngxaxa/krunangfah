import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";

export type SchoolClassRemovalResult =
    | { kind: "not_found" }
    | { kind: "blocked"; message: string }
    | { kind: "deleted"; name: string }
    | { kind: "archived"; name: string };

/**
 * advisoryClass is a plain string on Teacher, roster and invite rows (no FK),
 * so removing a class they name would leave class teachers pointing at
 * nothing and their analytics empty.
 */
async function countAdvisoryReferences(
    tx: Prisma.TransactionClient,
    schoolId: string,
    className: string,
): Promise<{ teachers: number; roster: number; invites: number }> {
    const [teachers, roster, invites] = await Promise.all([
        tx.teacher.count({
            where: {
                advisoryClass: className,
                user: { schoolId, deletedAt: null },
            },
        }),
        tx.schoolTeacherRoster.count({
            where: { schoolId, advisoryClass: className },
        }),
        tx.teacherInvite.count({
            where: {
                schoolId,
                advisoryClass: className,
                acceptedAt: null,
                expiresAt: { gt: new Date() },
            },
        }),
    ]);
    return { teachers, roster, invites };
}

function describeAdvisoryReferences(counts: {
    teachers: number;
    roster: number;
    invites: number;
}): string[] {
    return [
        counts.teachers > 0 ? `ครูที่ปรึกษา ${counts.teachers} คน` : null,
        counts.roster > 0 ? `รายชื่อครูใน roster ${counts.roster} รายการ` : null,
        counts.invites > 0
            ? `คำเชิญครูที่ยังไม่หมดอายุ ${counts.invites} รายการ`
            : null,
    ].filter((part): part is string => part !== null);
}

async function findRemovalBlocker(
    tx: Prisma.TransactionClient,
    schoolId: string,
    className: string,
): Promise<string | null> {
    const studentCount = await tx.student.count({
        where: { schoolId, class: className },
    });
    if (studentCount > 0) {
        return `ไม่สามารถลบห้อง "${className}" ได้ เพราะมีนักเรียนอยู่ ${studentCount} คน `;
    }

    const references = describeAdvisoryReferences(
        await countAdvisoryReferences(tx, schoolId, className),
    );
    if (references.length > 0) {
        return `ไม่สามารถลบห้อง "${className}" ได้ เพราะยังมี${references.join(" และ ")} กรุณาเปลี่ยนห้องที่ปรึกษาก่อน`;
    }
    return null;
}

/**
 * Removes a class. A class with rows in a non-current term is archived
 * instead: those rows are the denominators of past coverage, and deleting
 * the class would cascade them away and silently raise past coverage.
 */
export async function removeOrArchiveSchoolClass(
    schoolId: string,
    classId: string,
): Promise<SchoolClassRemovalResult> {
    return prisma.$transaction(async (tx) => {
        const schoolClass = await tx.schoolClass.findFirst({
            where: { id: classId, schoolId, archivedAt: null },
            select: { id: true, name: true },
        });
        if (!schoolClass) return { kind: "not_found" };

        // Row lock: class-count adjustments from imports serialize behind this.
        await tx.schoolClass.update({
            where: { id: schoolClass.id },
            data: { expectedStudentCount: { increment: 0 } },
            select: { id: true },
        });

        const blocker = await findRemovalBlocker(tx, schoolId, schoolClass.name);
        if (blocker) return { kind: "blocked", message: blocker };

        const currentTerm = await tx.academicYear.findFirst({
            where: { isCurrent: true },
            orderBy: [{ year: "desc" }, { semester: "desc" }],
            select: { id: true },
        });
        const historyRowCount = await tx.schoolClassTerm.count({
            where: {
                schoolClassId: schoolClass.id,
                ...(currentTerm
                    ? { academicYearId: { not: currentTerm.id } }
                    : {}),
            },
        });

        if (historyRowCount === 0) {
            await tx.schoolClass.delete({ where: { id: schoolClass.id } });
            return { kind: "deleted", name: schoolClass.name };
        }

        await tx.schoolClass.update({
            where: { id: schoolClass.id },
            data: { archivedAt: new Date() },
            select: { id: true },
        });
        if (currentTerm) {
            await tx.schoolClassTerm.deleteMany({
                where: {
                    schoolClassId: schoolClass.id,
                    academicYearId: currentTerm.id,
                },
            });
        }
        return { kind: "archived", name: schoolClass.name };
    });
}
