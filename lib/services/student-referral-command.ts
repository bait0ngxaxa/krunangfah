import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { ReferralConsistencyError } from "./referral-consistency";

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
        return await prisma.$transaction(async (tx) => {
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
    return prisma.$transaction(async (tx) => {
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
