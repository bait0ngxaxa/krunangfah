import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsData, SystemAnalyticsOverview } from "@/lib/actions/analytics/types";
import {
    createAnalyticsRedisKeyParts,
    getRedisCachedAnalyticsData,
    getRedisCachedSystemOverview,
    revalidateRedisAnalyticsCache,
    setRedisCachedAnalyticsData,
    setRedisCachedSystemOverview,
} from "@/lib/actions/analytics/redis-cache";

const mocks = vi.hoisted(() => ({
    getRedisClient: vi.fn(),
    get: vi.fn(),
    setEx: vi.fn(),
    sAdd: vi.fn(),
    expire: vi.fn(),
    sMembers: vi.fn(),
    del: vi.fn(),
}));

vi.mock("@/lib/redis", () => ({
    getRedisClient: mocks.getRedisClient,
}));

function createAnalyticsData(): AnalyticsData {
    return {
        totalStudents: 10,
        riskLevelSummary: [
            {
                riskLevel: "green",
                count: 4,
                label: "เขียว",
                color: "#00DB87",
                percentage: 40,
                referralCount: 0,
            },
        ],
        studentsWithAssessment: 8,
        studentsWithoutAssessment: 2,
        availableClasses: ["ม.1/1"],
        availableAcademicYears: [2569],
        availableSemesters: [1],
        availableRounds: [1],
        currentClass: "ม.1/1",
        currentAcademicYear: 2569,
        currentSemester: 1,
        currentRound: 1,
        trendData: [
            {
                period: "ต้นเทอม/1",
                academicYear: 2569,
                semester: 1,
                round: 1,
                blue: 1,
                green: 4,
                yellow: 2,
                orange: 1,
                red: 0,
            },
        ],
        activityProgressByRisk: [
            {
                riskLevel: "green",
                label: "เขียว",
                color: "#00DB87",
                totalStudents: 4,
                noActivity: 1,
                activity1: 3,
                activity2: 0,
                activity3: 0,
                activity4: 0,
                activity5: 0,
            },
        ],
        activityCompletionSummary: {
            notStartedStudents: 1,
            inProgressStudents: 2,
            completedStudents: 1,
        },
        gradeRiskData: [
            {
                grade: "ม.1",
                red: 0,
                orange: 1,
                yellow: 2,
                green: 4,
                blue: 1,
                total: 8,
            },
        ],
        hospitalReferralsByGrade: [
            {
                grade: "ม.1",
                referralCount: 1,
            },
        ],
        totalReferrals: 1,
    };
}

function createOverview(): SystemAnalyticsOverview {
    return {
        totalSchools: 2,
        totalStudents: 100,
        studentsWithAssessment: 80,
        screeningCoveragePercent: 80,
        academicYearLabel: "ปีการศึกษา 2569 เทอม 1",
        availableAcademicYears: [2569],
        availableSemesters: [1],
        currentAcademicYear: 2569,
        currentSemester: 1,
    };
}

describe("analytics Redis cache", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getRedisClient.mockResolvedValue({
            get: mocks.get,
            setEx: mocks.setEx,
            sAdd: mocks.sAdd,
            expire: mocks.expire,
            sMembers: mocks.sMembers,
            del: mocks.del,
        });
        mocks.get.mockResolvedValue(null);
        mocks.setEx.mockResolvedValue("OK");
        mocks.sAdd.mockResolvedValue(1);
        mocks.expire.mockResolvedValue(1);
        mocks.sMembers.mockResolvedValue([]);
        mocks.del.mockResolvedValue(1);
    });

    it("returns cached analytics data when the stored payload is valid", async () => {
        const data = createAnalyticsData();
        const keyParts = createAnalyticsRedisKeyParts({
            role: "school_admin",
            schoolId: "school-1",
            targetClass: "ม.1/1",
            academicYearStr: "2569",
            semesterStr: "1",
            roundStr: "1",
        });
        mocks.get.mockResolvedValue(JSON.stringify(data));

        const cached = await getRedisCachedAnalyticsData(keyParts);

        expect(cached).toEqual(data);
        expect(mocks.get).toHaveBeenCalledWith(expect.stringMatching(/^analytics:cache:/));
    });

    it("stores analytics data and tracks global plus school tags", async () => {
        const data = createAnalyticsData();
        const keyParts = createAnalyticsRedisKeyParts({
            role: "school_admin",
            schoolId: "school-1",
            targetClass: "ม.1/1",
            academicYearStr: "2569",
            semesterStr: "1",
            roundStr: "1",
        });

        await setRedisCachedAnalyticsData(keyParts, data, "school-1");

        expect(mocks.setEx).toHaveBeenCalledWith(
            expect.stringMatching(/^analytics:cache:/),
            300,
            JSON.stringify(data),
        );
        expect(mocks.sAdd).toHaveBeenCalledWith(
            "analytics:tag:global",
            expect.stringMatching(/^analytics:cache:/),
        );
        expect(mocks.sAdd).toHaveBeenCalledWith(
            "analytics:tag:school:school-1",
            expect.stringMatching(/^analytics:cache:/),
        );
    });

    it("returns cached system overview when the stored payload is valid", async () => {
        const overview = createOverview();
        mocks.get.mockResolvedValue(JSON.stringify(overview));

        const cached = await getRedisCachedSystemOverview([
            "analytics-system-overview",
            "year:2569",
            "semester:1",
        ]);

        expect(cached).toEqual(overview);
    });

    it("tracks overview cache entries for overview invalidation", async () => {
        const overview = createOverview();

        await setRedisCachedSystemOverview(
            ["analytics-system-overview", "year:2569", "semester:1"],
            overview,
        );

        expect(mocks.sAdd).toHaveBeenCalledWith(
            "analytics:tag:overview",
            expect.stringMatching(/^analytics:cache:/),
        );
    });

    it("invalidates tracked analytics cache keys without scanning Redis", async () => {
        mocks.sMembers
            .mockResolvedValueOnce(["analytics:cache:global-key"])
            .mockResolvedValueOnce(["analytics:cache:overview-key"])
            .mockResolvedValueOnce(["analytics:cache:school-key"]);

        await revalidateRedisAnalyticsCache("school-1");

        expect(mocks.sMembers).toHaveBeenCalledWith("analytics:tag:global");
        expect(mocks.sMembers).toHaveBeenCalledWith("analytics:tag:overview");
        expect(mocks.sMembers).toHaveBeenCalledWith("analytics:tag:school:school-1");
        expect(mocks.del).toHaveBeenCalledWith(["analytics:cache:global-key"]);
        expect(mocks.del).toHaveBeenCalledWith("analytics:tag:global");
        expect(mocks.del).toHaveBeenCalledWith(["analytics:cache:overview-key"]);
        expect(mocks.del).toHaveBeenCalledWith("analytics:tag:overview");
        expect(mocks.del).toHaveBeenCalledWith(["analytics:cache:school-key"]);
        expect(mocks.del).toHaveBeenCalledWith("analytics:tag:school:school-1");
    });
});
