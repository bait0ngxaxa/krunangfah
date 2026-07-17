export const LATEST_CARE_RECORD_ONLY_MESSAGE =
    "แก้ไขข้อมูลได้เฉพาะผลคัดกรองล่าสุดของนักเรียน";

export function isLatestPhqResult(
    latestPhqId: string | undefined,
    selectedPhqId: string,
): boolean {
    return latestPhqId === selectedPhqId;
}

export async function canMutatePhqContext(
    studentId: string,
    phqResultId: string,
): Promise<boolean> {
    const latest = await prisma.phqResult.findFirst({
        where: { studentId },
        select: { id: true },
        orderBy: [
            { academicYear: { year: "desc" } },
            { academicYear: { semester: "desc" } },
            { assessmentRound: "desc" },
            { createdAt: "desc" },
        ],
    });
    return isLatestPhqResult(latest?.id, phqResultId);
}

export async function canMutateAcademicYearContext(
    studentId: string,
    academicYearId: string | null,
): Promise<boolean> {
    if (!academicYearId) return false;
    const latest = await prisma.phqResult.findFirst({
        where: { studentId },
        select: { academicYearId: true },
        orderBy: [
            { academicYear: { year: "desc" } },
            { academicYear: { semester: "desc" } },
            { assessmentRound: "desc" },
            { createdAt: "desc" },
        ],
    });
    return latest?.academicYearId === academicYearId;
}
import { prisma } from "@/lib/database/prisma";
