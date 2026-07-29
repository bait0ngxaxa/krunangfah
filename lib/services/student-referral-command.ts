import { Prisma } from "@prisma/client";
import { runSerializableTransaction } from "@/lib/utils/serializable-transaction";
import { ReferralConsistencyError } from "./referral-consistency";
import { buildActiveReferralStaffScope } from "./student-referral-policy";

interface CreateActiveReferralInput {
    studentId: string;
    fromTeacherUserId: string;
    toTeacherUserId: string;
}

interface RevokeActiveReferralInput {
    referralId: string;
    revokedById: string;
    revokeReason?: string;
}

function isActiveReferralConflict(error: unknown): boolean {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
    );
}

export async function createActiveStudentReferral(
    input: CreateActiveReferralInput,
): Promise<Prisma.StudentReferralGetPayload<object> | null> {
    try {
        return await runSerializableTransaction(async (tx) => {
            if (!(await hasCreateReferralAccess(tx, input))) return null;

            const referral = await tx.studentReferral.create({
                data: input,
            });
            const claim = await tx.student.updateMany({
                where: {
                    id: input.studentId,
                    activeReferralId: null,
                },
                data: { activeReferralId: referral.id },
            });
            if (claim.count !== 1) {
                throw new Prisma.PrismaClientKnownRequestError(
                    "Active referral already exists",
                    { code: "P2002", clientVersion: Prisma.prismaVersion.client },
                );
            }
            return referral;
        });
    } catch (error) {
        if (isActiveReferralConflict(error)) return null;
        throw error;
    }
}

export async function revokeActiveStudentReferral(
    input: RevokeActiveReferralInput,
): Promise<boolean> {
    return runSerializableTransaction(async (tx) => {
        if (!(await hasRevokeReferralAccess(tx, input))) return false;

        const revokedAt = new Date();
        const write = await tx.studentReferral.updateMany({
            where: {
                id: input.referralId,
                revokedAt: null,
                closedAt: null,
            },
            data: {
                revokedAt,
                revokedById: input.revokedById,
                revokeReason: input.revokeReason?.trim() || null,
            },
        });
        if (write.count === 0) return false;
        if (write.count !== 1) {
            throw new ReferralConsistencyError(
                "Referral revoke affected an unexpected number of rows",
            );
        }

        const released = await tx.student.updateMany({
            where: { activeReferralId: input.referralId },
            data: { activeReferralId: null },
        });
        if (released.count !== 1) {
            throw new ReferralConsistencyError(
                "Active referral pointer could not be released",
            );
        }
        return true;
    });
}

interface ReferralActor {
    role: string;
    schoolId: string | null;
    deletedAt: Date | null;
    school: { disabledAt: Date | null } | null;
    teacher?: { advisoryClass: string } | null;
}

async function hasCreateReferralAccess(
    tx: Prisma.TransactionClient,
    input: CreateActiveReferralInput,
): Promise<boolean> {
    const student = await tx.student.findUnique({
        where: { id: input.studentId },
        select: { schoolId: true, class: true },
    });
    if (!student) return false;

    const actor = await tx.user.findUnique({
        where: { id: input.fromTeacherUserId },
        select: {
            role: true,
            schoolId: true,
            deletedAt: true,
            school: { select: { disabledAt: true } },
            teacher: { select: { advisoryClass: true } },
        },
    });
    if (!canCreateReferral(actor, student.schoolId, student.class)) return false;

    const target = await tx.user.findFirst({
        where: buildActiveReferralStaffScope(
            student.schoolId,
            input.toTeacherUserId,
        ),
        select: { id: true },
    });
    return target !== null;
}

async function hasRevokeReferralAccess(
    tx: Prisma.TransactionClient,
    input: RevokeActiveReferralInput,
): Promise<boolean> {
    const referral = await tx.studentReferral.findUnique({
        where: { id: input.referralId },
        select: {
            fromTeacherUserId: true,
            student: { select: { schoolId: true } },
        },
    });
    if (!referral) return false;

    const actor = await tx.user.findUnique({
        where: { id: input.revokedById },
        select: {
            role: true,
            schoolId: true,
            deletedAt: true,
            school: { select: { disabledAt: true } },
        },
    });
    return canRevokeReferral(
        actor,
        input.revokedById,
        referral.fromTeacherUserId,
        referral.student.schoolId,
    );
}

function canCreateReferral(
    actor: ReferralActor | null,
    studentSchoolId: string,
    studentClass: string,
): boolean {
    if (!actor || actor.deletedAt) return false;
    if (actor.role === "system_admin") return true;
    if (
        !actor.schoolId ||
        actor.schoolId !== studentSchoolId ||
        !actor.school ||
        actor.school.disabledAt
    ) {
        return false;
    }
    if (actor.role === "class_teacher") {
        return actor.teacher?.advisoryClass === studentClass;
    }
    return actor.role === "school_admin";
}

function canRevokeReferral(
    actor: ReferralActor | null,
    actorId: string,
    fromTeacherUserId: string,
    studentSchoolId: string,
): boolean {
    if (!actor || actor.deletedAt) return false;
    if (actor.role === "system_admin") return true;
    if (
        !actor.schoolId ||
        actor.schoolId !== studentSchoolId ||
        !actor.school ||
        actor.school.disabledAt
    ) {
        return false;
    }
    if (actor.role === "class_teacher") {
        return actorId === fromTeacherUserId;
    }
    return actor.role === "school_admin";
}
