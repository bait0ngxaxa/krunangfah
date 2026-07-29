import type { Prisma } from "@prisma/client";

export function buildActiveReferralStaffScope(
    schoolId: string,
    userId?: string,
): Prisma.UserWhereInput {
    return {
        ...(userId ? { id: userId } : {}),
        schoolId,
        deletedAt: null,
        role: "school_admin",
        teacher: { isNot: null },
        school: { is: { disabledAt: null } },
    };
}

export function buildReferralStudentScope(
    schoolId: string,
    advisoryClass?: string,
): Prisma.StudentWhereInput {
    return {
        schoolId,
        disabledAt: null,
        isTestData: false,
        school: { disabledAt: null, isTestData: false },
        ...(advisoryClass ? { class: advisoryClass } : {}),
    };
}
