import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsData, SystemAnalyticsOverview } from "@/lib/actions/analytics/types";
import {
    createAnalyticsRedisKeyParts,
    createSystemOverviewRedisKeyParts,
    getRedisCachedAnalyticsData,
    getRedisCachedSystemOverview,
    readRedisCachedAnalyticsData,
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
    incr: vi.fn(),
}));

vi.mock("@/lib/cache/redis", () => ({
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
        screeningCoveragePercent: 80,
        coverageCountMismatches: [{ className: "ม.1/2", expected: 3, assessed: 4 }],
        coverageUncountedStudents: 1,
        selectedAcademicTermExists: true,
        availableClasses: ["ม.1/1"],
        availableAcademicTerms: [{ id: "term-2569-1", year: 2569, semester: 1 }],
        selectableAcademicTerms: [{ id: "term-2569-1", year: 2569, semester: 1 }],
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
        activityAnalyticsApplicable: true,
        activityAnalyticsRound: 1,
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
            requiringActivityStudents: 4,
            notRequiringActivityStudents: 4,
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
        legacyClassAttribution: false,
    };
}

function createOverview(): SystemAnalyticsOverview {
    return {
        totalSchools: 2,
        totalStudents: 100,
        studentsWithAssessment: 80,
        screeningCoveragePercent: 80,
        schoolsWithCountMismatch: 1,
        academicYearLabel: "ปีการศึกษา 2569 เทอม 1",
        availableAcademicTerms: [{ id: "term-2569-1", year: 2569, semester: 1 }],
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
            incr: mocks.incr,
        });
        mocks.get.mockResolvedValue("0");
        mocks.setEx.mockResolvedValue("OK");
        mocks.sAdd.mockResolvedValue(1);
        mocks.expire.mockResolvedValue(1);
        mocks.sMembers.mockResolvedValue([]);
        mocks.del.mockResolvedValue(1);
        mocks.incr.mockResolvedValue(1);
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
        mocks.get
            .mockResolvedValueOnce("0")
            .mockResolvedValueOnce(JSON.stringify(data));

        const cached = await getRedisCachedAnalyticsData(keyParts);

        expect(cached).toEqual(data);
        expect(mocks.get).toHaveBeenCalledWith(expect.stringMatching(/^analytics:cache:/));
    });

    it("rejects cached analytics data from the pre-round-scoped contract", async () => {
        const legacyPayload = { ...createAnalyticsData() } as Record<
            string,
            unknown
        >;
        delete legacyPayload.activityAnalyticsApplicable;
        delete legacyPayload.activityAnalyticsRound;

        const keyParts = createAnalyticsRedisKeyParts({
            role: "school_admin",
            schoolId: "school-1",
            targetClass: "ม.1/1",
            academicYearStr: "2569",
            semesterStr: "1",
            roundStr: "1",
        });
        mocks.get
            .mockResolvedValueOnce("0")
            .mockResolvedValueOnce(JSON.stringify(legacyPayload));

        await expect(readRedisCachedAnalyticsData(keyParts)).resolves.toMatchObject({
            data: null,
        });
    });

    it("rejects cached analytics data from before class attribution and versions the key", async () => {
        const preAttributionPayload = { ...createAnalyticsData() } as Record<string, unknown>;
        delete preAttributionPayload.legacyClassAttribution;
        const keyParts = createAnalyticsRedisKeyParts({
            role: "school_admin",
            schoolId: "school-1",
            targetClass: "ม.1/1",
            academicYearStr: "2568",
            semesterStr: "2",
            roundStr: "",
        });
        mocks.get
            .mockResolvedValueOnce("0")
            .mockResolvedValueOnce(JSON.stringify(preAttributionPayload));

        expect(keyParts).toContain("class-attribution:assessment-v1");
        await expect(readRedisCachedAnalyticsData(keyParts)).resolves.toMatchObject({
            data: null,
        });
    });

    it("rejects cached analytics data from before per-class coverage and versions the key", async () => {
        const preCoveragePayload = { ...createAnalyticsData() } as Record<string, unknown>;
        delete preCoveragePayload.coverageCountMismatches;
        delete preCoveragePayload.coverageUncountedStudents;
        const keyParts = createAnalyticsRedisKeyParts({
            role: "school_admin",
            schoolId: "school-1",
            targetClass: "",
            academicYearStr: "2569",
            semesterStr: "1",
            roundStr: "",
        });
        mocks.get
            .mockResolvedValueOnce("0")
            .mockResolvedValueOnce(JSON.stringify(preCoveragePayload));

        expect(keyParts).toContain("coverage:per-class-v1");
        await expect(readRedisCachedAnalyticsData(keyParts)).resolves.toMatchObject({
            data: null,
        });
    });

    it("rejects cached analytics data without selectable terms and versions the key", async () => {
        const { selectableAcademicTerms, ...oldPayload } = createAnalyticsData();
        expect(selectableAcademicTerms).toHaveLength(1);
        const keyParts = createAnalyticsRedisKeyParts({
            role: "school_admin",
            schoolId: "school-1",
            targetClass: "",
            academicYearStr: "2569",
            semesterStr: "1",
            roundStr: "",
        });
        mocks.get
            .mockResolvedValueOnce("0")
            .mockResolvedValueOnce(JSON.stringify(oldPayload));

        expect(keyParts).toContain("term-options:selectable-v1");
        await expect(readRedisCachedAnalyticsData(keyParts)).resolves.toMatchObject({
            data: null,
        });
    });

    it("rejects a cached count mismatch without numeric counts", async () => {
        const payload = {
            ...createAnalyticsData(),
            coverageCountMismatches: [{ className: "ม.1/2", expected: "3", assessed: 4 }],
        };
        mocks.get
            .mockResolvedValueOnce("0")
            .mockResolvedValueOnce(JSON.stringify(payload));

        await expect(getRedisCachedAnalyticsData(["analytics-data"])).resolves.toBeNull();
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
        mocks.get
            .mockResolvedValueOnce("0")
            .mockResolvedValueOnce("0")
            .mockResolvedValueOnce(JSON.stringify(overview));

        const cached = await getRedisCachedSystemOverview([
            "analytics-system-overview",
            "year:2569",
            "semester:1",
        ]);

        expect(cached).toEqual(overview);
    });

    it("rejects a cached system overview from before per-class coverage", async () => {
        const preCoverageOverview = { ...createOverview() } as Record<string, unknown>;
        delete preCoverageOverview.schoolsWithCountMismatch;
        const keyParts = createSystemOverviewRedisKeyParts({ academicYear: 2569, semester: 1 });
        mocks.get
            .mockResolvedValueOnce("0")
            .mockResolvedValueOnce("0")
            .mockResolvedValueOnce(JSON.stringify(preCoverageOverview));

        expect(keyParts).toContain("coverage:per-class-v1");
        await expect(getRedisCachedSystemOverview(keyParts)).resolves.toBeNull();
    });

    it("accepts a cached system overview without a computable coverage", async () => {
        const overview = { ...createOverview(), screeningCoveragePercent: null };
        mocks.get
            .mockResolvedValueOnce("0")
            .mockResolvedValueOnce("0")
            .mockResolvedValueOnce(JSON.stringify(overview));

        await expect(
            getRedisCachedSystemOverview(["analytics-system-overview"]),
        ).resolves.toEqual(overview);
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

    it("writes back using the generation observed during the cache miss", async () => {
        const data = createAnalyticsData();
        const keyParts = createAnalyticsRedisKeyParts({
            role: "school_admin",
            schoolId: "school-1",
            targetClass: "ม.1/1",
            academicYearStr: "2569",
            semesterStr: "1",
            roundStr: "1",
        });
        mocks.get
            .mockResolvedValueOnce("4")
            .mockResolvedValueOnce("7")
            .mockResolvedValueOnce(null);

        const lookup = await readRedisCachedAnalyticsData(keyParts, "school-1");
        mocks.get.mockClear();

        await setRedisCachedAnalyticsData(
            keyParts,
            data,
            "school-1",
            lookup.versionedKeyParts,
        );

        expect(lookup.data).toBeNull();
        expect(lookup.versionedKeyParts).toContain(
            "version:analytics:tag:global:4",
        );
        expect(lookup.versionedKeyParts).toContain(
            "version:analytics:tag:school:school-1:7",
        );
        expect(mocks.get).not.toHaveBeenCalled();
        expect(mocks.setEx).toHaveBeenCalledWith(
            expect.stringMatching(/^analytics:cache:/),
            300,
            JSON.stringify(data),
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
        expect(mocks.incr).toHaveBeenCalledWith(
            "analytics:tag-version:analytics:tag:global",
        );
        expect(mocks.incr).toHaveBeenCalledWith(
            "analytics:tag-version:analytics:tag:overview",
        );
        expect(mocks.incr).toHaveBeenCalledWith(
            "analytics:tag-version:analytics:tag:school:school-1",
        );
        expect(mocks.del).toHaveBeenCalledWith(["analytics:cache:global-key"]);
        expect(mocks.del).toHaveBeenCalledWith("analytics:tag:global");
        expect(mocks.del).toHaveBeenCalledWith(["analytics:cache:overview-key"]);
        expect(mocks.del).toHaveBeenCalledWith("analytics:tag:overview");
        expect(mocks.del).toHaveBeenCalledWith(["analytics:cache:school-key"]);
        expect(mocks.del).toHaveBeenCalledWith("analytics:tag:school:school-1");
    });
});
