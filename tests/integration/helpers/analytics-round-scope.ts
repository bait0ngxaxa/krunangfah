import { expect } from "vitest";
import {
    getActivityCompletionSummary,
    getActivityProgressByRisk,
} from "@/lib/actions/analytics/queries";
import { createMockUsers } from "./auth-mock";
import {
    createTestAcademicYear,
    createTestActivityProgress,
    createTestPhqResult,
    createTestSchool,
    createTestStudent,
    createTestUser,
} from "./seed";

const USERS = createMockUsers("analytics-activity-completion");
const FOCUSED_CLASS = "ม.1/1";

type ActivitySummaryResult = Awaited<
    ReturnType<typeof getActivityCompletionSummary>
>;
type ActivityProgressRows = Awaited<ReturnType<typeof getActivityProgressByRisk>>;
type TestPhqResult = Awaited<ReturnType<typeof createTestPhqResult>>;

interface ActivityAnalyticsResult {
    summary: ActivitySummaryResult;
    progress: ActivityProgressRows;
}

export interface RoundScopeScenario {
    schoolId: string;
    academicYearId: string;
    academicYear: number;
    semester: number;
    focusedClass: string;
}

interface RoundScopeBase {
    schoolId: string;
    academicYearId: string;
    academicYear: number;
    semester: number;
    userId: string;
}

interface RoundScopeStudents {
    roundChangedStudentId: string;
    otherClassStudentId: string;
}

interface RoundScopePhqs {
    oldRoundPhqId: string;
    otherClassPhqId: string;
}

async function createRoundScopedPhq(input: {
    studentId: string;
    academicYearId: string;
    userId: string;
    assessmentRound: number;
    createdAt: string;
    riskLevel: string;
}): Promise<TestPhqResult> {
    return createTestPhqResult(input.studentId, input.academicYearId, input.userId, {
        assessmentRound: input.assessmentRound,
        createdAt: new Date(input.createdAt),
        riskLevel: input.riskLevel,
    });
}

async function createRoundScopeBase(): Promise<RoundScopeBase> {
    const school = await createTestSchool({
        name: "Analytics Activity Round Scope School",
    });
    const academicYear = await createTestAcademicYear({
        year: 8300 + Number(String(Date.now()).slice(-3)),
        semester: 1,
    });
    const user = await createTestUser(USERS.schoolAdmin, school.id);
    return {
        schoolId: school.id,
        academicYearId: academicYear.id,
        academicYear: academicYear.year,
        semester: academicYear.semester,
        userId: user.id,
    };
}

async function createRoundScopeStudents(
    schoolId: string,
): Promise<RoundScopeStudents> {
    const [roundChangedStudent, otherClassStudent] = await Promise.all([
        createTestStudent(schoolId, {
            studentId: `AN-ROUND-${Date.now()}`,
            class: FOCUSED_CLASS,
        }),
        createTestStudent(schoolId, {
            studentId: `AN-OTHER-${Date.now()}`,
            class: "ม.1/2",
        }),
    ]);
    return {
        roundChangedStudentId: roundChangedStudent.id,
        otherClassStudentId: otherClassStudent.id,
    };
}

async function createRoundScopePhqs(
    base: RoundScopeBase,
    students: RoundScopeStudents,
): Promise<RoundScopePhqs> {
    const [oldRoundPhq, , otherClassPhq] = await Promise.all([
        createRoundScopedPhq({
            studentId: students.roundChangedStudentId,
            academicYearId: base.academicYearId,
            userId: base.userId,
            assessmentRound: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            riskLevel: "yellow",
        }),
        createRoundScopedPhq({
            studentId: students.roundChangedStudentId,
            academicYearId: base.academicYearId,
            userId: base.userId,
            assessmentRound: 2,
            createdAt: "2026-02-01T00:00:00.000Z",
            riskLevel: "green",
        }),
        createRoundScopedPhq({
            studentId: students.otherClassStudentId,
            academicYearId: base.academicYearId,
            userId: base.userId,
            assessmentRound: 1,
            createdAt: "2026-01-01T00:00:00.000Z",
            riskLevel: "yellow",
        }),
    ]);
    return {
        oldRoundPhqId: oldRoundPhq.id,
        otherClassPhqId: otherClassPhq.id,
    };
}

async function createRoundScopeProgress(
    students: RoundScopeStudents,
    phqs: RoundScopePhqs,
): Promise<void> {
    await Promise.all([
        createTestActivityProgress(
            students.roundChangedStudentId,
            phqs.oldRoundPhqId,
            1,
            { status: "completed" },
        ),
        createTestActivityProgress(
            students.otherClassStudentId,
            phqs.otherClassPhqId,
            1,
            { status: "completed" },
        ),
    ]);
}

export async function createRoundScopeScenario(): Promise<RoundScopeScenario> {
    const base = await createRoundScopeBase();
    const students = await createRoundScopeStudents(base.schoolId);
    const phqs = await createRoundScopePhqs(base, students);
    await createRoundScopeProgress(students, phqs);
    return {
        schoolId: base.schoolId,
        academicYearId: base.academicYearId,
        academicYear: base.academicYear,
        semester: base.semester,
        focusedClass: FOCUSED_CLASS,
    };
}

export async function readActivityAnalytics(
    scenario: RoundScopeScenario,
    classFilter?: string,
): Promise<ActivityAnalyticsResult> {
    const [summary, progress] = await Promise.all([
        getActivityCompletionSummary(
            scenario.schoolId,
            classFilter,
            [scenario.academicYearId],
        ),
        getActivityProgressByRisk(
            scenario.schoolId,
            classFilter,
            [scenario.academicYearId],
        ),
    ]);
    return { summary, progress };
}

function expectSummary(
    summary: ActivitySummaryResult,
    notStarted: number,
    inProgress: number,
    completed: number,
): void {
    expect(Number(summary.not_started_students)).toBe(notStarted);
    expect(Number(summary.in_progress_students)).toBe(inProgress);
    expect(Number(summary.completed_students)).toBe(completed);
}

function findProgressRow(
    progress: ActivityProgressRows,
    riskLevel: string,
): ActivityProgressRows[number] | undefined {
    return progress.find((row) => row.risk_level === riskLevel);
}

function expectActivityOne(
    progress: ActivityProgressRows,
    riskLevel: string,
    totalStudents: number,
    activityCount: number,
): void {
    const row = findProgressRow(progress, riskLevel);
    expect(Number(row?.total_students ?? 0)).toBe(totalStudents);
    expect(Number(row?.activity1 ?? 0)).toBe(activityCount);
}

export function expectAllRoomScope(analytics: ActivityAnalyticsResult): void {
    expectSummary(analytics.summary, 1, 1, 0);
    expectActivityOne(analytics.progress, "green", 1, 0);
    expectActivityOne(analytics.progress, "yellow", 1, 1);
}

export function expectSingleRoomScope(analytics: ActivityAnalyticsResult): void {
    expectSummary(analytics.summary, 1, 0, 0);
    expectActivityOne(analytics.progress, "green", 1, 0);
}
