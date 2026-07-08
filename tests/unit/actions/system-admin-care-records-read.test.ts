import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
    studentFindUnique: vi.fn(),
    phqResultFindMany: vi.fn(),
    activityProgressFindMany: vi.fn(),
    studentReferralFindUnique: vi.fn(),
    teacherFindMany: vi.fn(),
    counselingSessionFindMany: vi.fn(),
    homeVisitFindMany: vi.fn(),
}));

vi.mock("@/lib/database/prisma", () => ({
    prisma: {
        student: { findUnique: prismaMocks.studentFindUnique },
        phqResult: { findMany: prismaMocks.phqResultFindMany },
        activityProgress: { findMany: prismaMocks.activityProgressFindMany },
        studentReferral: { findUnique: prismaMocks.studentReferralFindUnique },
        teacher: { findMany: prismaMocks.teacherFindMany },
        counselingSession: { findMany: prismaMocks.counselingSessionFindMany },
        homeVisit: { findMany: prismaMocks.homeVisitFindMany },
    },
}));

import { getStudentCareRecords } from "@/lib/actions/system-admin/care-records-read";

const studentId = "cmstudent000000000000000001";
const latestPhqId = "cmphqlatest000000000000001";
const oldPhqId = "cmphqold00000000000000001";

describe("getStudentCareRecords", () => {
    beforeEach(() => {
        vi.resetAllMocks();
        prismaMocks.studentFindUnique.mockResolvedValue({
            id: studentId,
            schoolId: "school-1",
        });
        prismaMocks.phqResultFindMany.mockResolvedValue([
            createPhqRow(latestPhqId, 2, new Date("2026-07-07T00:00:00.000Z")),
            createPhqRow(oldPhqId, 1, new Date("2026-06-07T00:00:00.000Z")),
        ]);
        prismaMocks.studentReferralFindUnique.mockResolvedValue(null);
        prismaMocks.activityProgressFindMany.mockResolvedValue([]);
        prismaMocks.teacherFindMany.mockResolvedValue([]);
        prismaMocks.counselingSessionFindMany.mockResolvedValue([]);
        prismaMocks.homeVisitFindMany.mockResolvedValue([]);
    });

    it("keeps activity progress from every PHQ result with year and round context", async () => {
        prismaMocks.activityProgressFindMany.mockResolvedValue([
            createActivityRow("latest-activity", latestPhqId, 2),
            createActivityRow("old-activity", oldPhqId, 1),
        ]);

        const result = await getStudentCareRecords(studentId);

        expect(result?.activityProgress).toHaveLength(2);
        expect(result?.activityProgress[0]?.id).toBe("latest-activity");
        expect(result?.activityProgress[0]?.academicYearLabel).toBe("2569/2");
        expect(result?.activityProgress[0]?.assessmentRound).toBe(2);
        expect(result?.activityProgress[1]?.id).toBe("old-activity");
        expect(result?.activityProgress[1]?.academicYearLabel).toBe("2569/1");
        expect(result?.activityProgress[1]?.assessmentRound).toBe(1);
    });

    it("marks only PHQ results from the latest term as editable", async () => {
        const result = await getStudentCareRecords(studentId);

        expect(result?.phqResults).toEqual([
            expect.objectContaining({ id: latestPhqId, isLatestTerm: true }),
            expect.objectContaining({ id: oldPhqId, isLatestTerm: false }),
        ]);
    });
});

function createPhqRow(id: string, round: number, createdAt: Date) {
    return {
        id,
        assessmentRound: round,
        q1: 0,
        q2: 0,
        q3: 0,
        q4: 0,
        q5: 0,
        q6: 0,
        q7: 0,
        q8: 0,
        q9: 0,
        q9a: false,
        q9b: false,
        totalScore: 0,
        riskLevel: "blue",
        referredToHospital: false,
        hospitalName: null,
        createdAt,
        academicYear: { year: 2569, semester: round },
    };
}

function createActivityRow(id: string, phqResultId: string, round: number) {
    return {
        id,
        phqResultId,
        activityNumber: 1,
        status: "completed",
        scheduledDate: null,
        completedAt: new Date("2026-07-07T00:00:00.000Z"),
        teacherId: null,
        teacherNotes: null,
        internalProblems: null,
        externalProblems: null,
        problemType: null,
        teacher: null,
        phqResult: {
            assessmentRound: round,
            createdAt: new Date(`2026-0${round + 4}-07T00:00:00.000Z`),
            academicYear: { year: 2569, semester: round },
        },
    };
}
