import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { LATEST_PHQ_ORDER_BY } from "@/lib/utils/phq-result-selection";

export const LATEST_CARE_RECORD_ONLY_MESSAGE =
    "แก้ไขข้อมูลได้เฉพาะผลคัดกรองล่าสุดของนักเรียน";

type PhqResultReadClient = Pick<Prisma.TransactionClient, "phqResult">;

export function isLatestPhqResult(
    latestPhqId: string | undefined,
    selectedPhqId: string,
): boolean {
    return latestPhqId === selectedPhqId;
}

export async function canMutatePhqContext(
    studentId: string,
    phqResultId: string,
    client: PhqResultReadClient = prisma,
): Promise<boolean> {
    const latest = await client.phqResult.findFirst({
        where: { studentId },
        select: { id: true },
        orderBy: LATEST_PHQ_ORDER_BY,
    });
    return isLatestPhqResult(latest?.id, phqResultId);
}

export async function canMutateAcademicYearContext(
    studentId: string,
    academicYearId: string | null,
    client: PhqResultReadClient = prisma,
): Promise<boolean> {
    if (!academicYearId) return false;

    const latest = await client.phqResult.findFirst({
        where: { studentId },
        select: { academicYearId: true },
        orderBy: LATEST_PHQ_ORDER_BY,
    });
    return latest?.academicYearId === academicYearId;
}
