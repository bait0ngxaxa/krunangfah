import { Suspense } from "react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { BarChart3, Target, Home } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { getStudentDetailResult } from "@/lib/actions/student/main";
import { QueryErrorState } from "@/components/ui/QueryErrorState";
import { StudentProfileSection } from "@/components/student/profile/StudentProfileSection";
import { StudentStatusProvider } from "@/components/student/profile/StudentStatusContext";
import { StudentDetailScrollTop } from "@/components/student/profile/StudentDetailScrollTop";
import { PHQHistoryTable } from "@/components/student/phq/PHQHistoryTable";
import { ActivityProgressTable } from "@/components/student/activity/ActivityProgressTable";
import { CounselingLogTable } from "@/components/student/counseling/CounselingLogTable";
import { AcademicYearFilter } from "@/components/student/profile/AcademicYearFilter";
import { AssessmentRoundFilter } from "@/components/student/profile/AssessmentRoundFilter";
import { HomeVisitTab } from "@/components/student/home-visit/HomeVisitTab";
import { Skeleton } from "@/components/ui/Skeleton";

// Lazy-load chart library to keep initial bundle for detail page smaller.
const PHQTrendChart = dynamic(
    () =>
        import("@/components/student/phq/PHQTrendChart").then(
            (mod) => mod.PHQTrendChart,
        ),
    {
        loading: () => (
            <div
                className="flex h-[300px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-6"
                role="status"
                aria-label="กำลังโหลดกราฟ"
            >
                <Skeleton className="h-full w-full rounded-xl" />
            </div>
        ),
    },
);
import { getCounselingSessions } from "@/lib/actions/counseling.actions";
import { getHomeVisits } from "@/lib/actions/home-visit.actions";
import { requireAuth } from "@/lib/auth/session";
import { Tabs } from "@/components/ui/Tabs";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import type { OffsetPagination } from "@/types/pagination.types";
import {
    filterByAcademicYearSelection,
    filterByAssessmentRoundSelection,
    getUniqueAcademicYears,
    resolveAcademicYearDateRange,
} from "@/lib/utils/student-detail-filters";
import { getLatestPhqResult } from "@/lib/utils/phq-result-selection";
import { ERROR_MESSAGES } from "@/lib/constants/error-messages";
import { getStudentActionBlockedMessage } from "@/lib/constants/student-status";

const PHQ_HISTORY_PAGE_SIZE = 10;
const COUNSELING_PAGE_SIZE = 10;
const HOME_VISITS_PAGE_SIZE = 5;
const MAX_SAFE_PAGE_PARAM = 1_000_000;

function parsePositiveInt(value: string | undefined): number {
    const parsed = Number.parseInt(value ?? "", 10);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return 1;
    return Math.min(parsed, MAX_SAFE_PAGE_PARAM);
}

function buildOffsetPagination(
    page: number,
    pageSize: number,
    total: number,
): OffsetPagination {
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
    return {
        page: safePage,
        pageSize,
        total,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
    };
}

interface StudentDetailPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{
        year?: string;
        round?: string;
        phqPage?: string;
        counselingPage?: string;
        homeVisitPage?: string;
    }>;
}

export default async function StudentDetailPage({
    params,
    searchParams,
}: StudentDetailPageProps) {
    const { id } = await params;
    const {
        year: selectedYearId,
        round,
        phqPage,
        counselingPage,
        homeVisitPage,
    } = await searchParams;
    const selectedRound = round === "1" || round === "2" ? round : undefined;

    return (
        <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-slate-50 via-white to-emerald-50/40 py-6 px-4">
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute -top-16 -right-12 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
                <div className="absolute bottom-8 -left-16 h-72 w-72 rounded-full bg-cyan-100/45 blur-3xl" />
                <div className="absolute top-1/3 left-1/4 h-52 w-52 rounded-full bg-teal-100/40 blur-3xl" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl">
                <BackButton href="/students" label="กลับหน้านักเรียน" />
                <StudentDetailScrollTop key={id} />

                <Suspense fallback={<StudentDetailSkeleton />}>
                    <StudentDetailContent
                        studentId={id}
                        selectedYearId={selectedYearId}
                        selectedRound={selectedRound}
                        phqPage={parsePositiveInt(phqPage)}
                        counselingPage={parsePositiveInt(counselingPage)}
                        homeVisitPage={parsePositiveInt(homeVisitPage)}
                    />
                </Suspense>
            </div>
        </div>
    );
}

async function StudentDetailContent({
    studentId,
    selectedYearId,
    selectedRound,
    phqPage,
    counselingPage,
    homeVisitPage,
}: {
    studentId: string;
    selectedYearId?: string;
    selectedRound?: string;
    phqPage: number;
    counselingPage: number;
    homeVisitPage: number;
}) {
    const [session, studentResult] = await Promise.all([
        requireAuth(),
        getStudentDetailResult(studentId),
    ]);
    const currentUserId = session.user.id;
    const isSystemAdmin = session.user.role === "system_admin";
    const canManageStudentStatus =
        session.user.role === "school_admin" ||
        session.user.role === "class_teacher";

    if (studentResult.status === "transient_error") {
        return <QueryErrorState requestId={studentResult.requestId} />;
    }
    if (studentResult.status === "not_found") {
        notFound();
    }
    if (studentResult.status === "forbidden") {
        return <p className="py-10 text-center text-slate-700">ไม่มีสิทธิ์เข้าถึงข้อมูลนักเรียนนี้</p>;
    }
    const student = studentResult.data;

    const uniqueYears = getUniqueAcademicYears(
        student.phqResults.flatMap((result) =>
            result.academicYear ? [result.academicYear] : [],
        ),
    );
    const selectedDateRange = resolveAcademicYearDateRange(
        uniqueYears,
        selectedYearId,
    );
    const academicYearFilteredPhqResults = filterByAcademicYearSelection(
        student.phqResults,
        selectedYearId,
    );
    const availableRounds = Array.from(
        new Set(
            academicYearFilteredPhqResults.map(
                (result) => result.assessmentRound,
            ),
        ),
    ).sort((a, b) => a - b);
    const filteredPhqResults = filterByAssessmentRoundSelection(
        academicYearFilteredPhqResults,
        selectedRound,
    );
    const latestResult = filteredPhqResults[0] || null;
    const recordAcademicYearId = latestResult?.academicYear?.id;
    const [counselingResult, homeVisitResult] = await Promise.all([
        getCounselingSessions(studentId, {
            page: counselingPage,
            pageSize: COUNSELING_PAGE_SIZE,
            academicYearId: recordAcademicYearId,
            dateRange: selectedDateRange ?? undefined,
        }),
        getHomeVisits(studentId, {
            page: homeVisitPage,
            pageSize: HOME_VISITS_PAGE_SIZE,
            academicYearId: recordAcademicYearId,
            dateRange: selectedDateRange ?? undefined,
        }),
    ]);
    if (counselingResult.status === "transient_error") {
        return <QueryErrorState requestId={counselingResult.requestId} />;
    }
    if (homeVisitResult.status === "transient_error") {
        return <QueryErrorState requestId={homeVisitResult.requestId} />;
    }
    if (
        counselingResult.status === "forbidden" ||
        homeVisitResult.status === "forbidden"
    ) {
        return <p className="py-10 text-center text-slate-700">ไม่มีสิทธิ์เข้าถึงบันทึกการดูแลนี้</p>;
    }
    if (
        counselingResult.status === "not_found" ||
        homeVisitResult.status === "not_found"
    ) {
        notFound();
    }
    const counselingSessionData = counselingResult.data;
    const homeVisitData = homeVisitResult.data;

    const activePhqResult = getLatestPhqResult(student.phqResults);
    const visibleStudent = student;
    const isViewingLatestImportedResult =
        latestResult?.id !== undefined &&
        activePhqResult?.id !== undefined &&
        latestResult.id === activePhqResult.id;
    const canEditStudentProfile =
        canManageStudentStatus && isViewingLatestImportedResult;
    const isReferralLockedForClassTeacher =
        session.user.role === "class_teacher" && Boolean(student.referral);
    const studentStatusLockedMessage = getStudentActionBlockedMessage(
        student.status,
    );
    const canManageLatestCareRecordsIgnoringStatus =
        isViewingLatestImportedResult;
    const canManageActivitiesIgnoringStatus =
        latestResult?.id !== undefined &&
        activePhqResult?.id !== undefined &&
        latestResult.id === activePhqResult.id &&
        !isReferralLockedForClassTeacher;
    const activityActionLockedMessage =
        studentStatusLockedMessage ??
        (isReferralLockedForClassTeacher
            ? ERROR_MESSAGES.activity.classTeacherReferredLocked
            : !canManageActivitiesIgnoringStatus && latestResult
            ? "กำลังดูข้อมูลย้อนหลัง จึงทำกิจกรรมได้เฉพาะผลคัดกรองล่าสุดของนักเรียน"
            : undefined);
    const phqPagination = buildOffsetPagination(
        phqPage,
        PHQ_HISTORY_PAGE_SIZE,
        filteredPhqResults.length,
    );
    const phqStart = (phqPagination.page - 1) * phqPagination.pageSize;
    const paginatedPhqResults = filteredPhqResults.slice(
        phqStart,
        phqStart + phqPagination.pageSize,
    );

    const phqResultsTab = (
        <div className="space-y-6">
            {filteredPhqResults.length > 0 && (
                <PHQTrendChart results={filteredPhqResults} />
            )}
            <PHQHistoryTable
                results={paginatedPhqResults}
                pagination={phqPagination}
            />
        </div>
    );

    const activitiesTab = (
        <div className="space-y-6">
            {latestResult && latestResult.academicYear && (
                <ActivityProgressTable
                    studentId={studentId}
                    phqResultId={latestResult.id}
                    riskLevel={latestResult.riskLevel as RiskLevel}
                    assessmentPeriod={{
                        academicYear: latestResult.academicYear.year,
                        semester: latestResult.academicYear.semester,
                        assessmentRound: latestResult.assessmentRound,
                    }}
                    readOnly={
                        isSystemAdmin || !canManageActivitiesIgnoringStatus
                    }
                    actionLockedMessage={activityActionLockedMessage}
                />
            )}
            <CounselingLogTable
                sessions={counselingSessionData.sessions}
                pagination={counselingSessionData.pagination}
                studentId={studentId}
                academicYearId={recordAcademicYearId}
                readOnly={
                    isSystemAdmin ||
                    !canManageLatestCareRecordsIgnoringStatus
                }
                isFilteredByAcademicYear={Boolean(selectedYearId)}
            />
        </div>
    );

    const homeVisitsTab = (
        <HomeVisitTab
            visits={homeVisitData.visits}
            pagination={homeVisitData.pagination}
            studentId={studentId}
            academicYearId={recordAcademicYearId}
            readOnly={
                isSystemAdmin || !canManageLatestCareRecordsIgnoringStatus
            }
            isFilteredByAcademicYear={Boolean(selectedYearId)}
        />
    );

    const tabs = [
        {
            id: "phq-results",
            label: (
                <span className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm">
                        <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    ผลการคัดกรอง
                </span>
            ),
            content: phqResultsTab,
        },
        {
            id: "activities",
            label: (
                <span className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm">
                        <Target className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    กิจกรรมและบันทึกการพูดคุย
                </span>
            ),
            content: activitiesTab,
        },
        {
            id: "home-visits",
            label: (
                <span className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm">
                        <Home className="w-3.5 h-3.5" aria-hidden="true" />
                    </span>
                    เยี่ยมบ้าน
                </span>
            ),
            content: homeVisitsTab,
        },
    ];

    return (
        <StudentStatusProvider initialStatus={visibleStudent.status}>
            <div className="space-y-7">
                <StudentProfileSection
                    key={`${visibleStudent.id}:${visibleStudent.status}`}
                    student={visibleStudent}
                    latestResult={latestResult}
                    activePhqResultId={activePhqResult?.id}
                    canViewNationalId={isSystemAdmin}
                    canEditProfile={canEditStudentProfile}
                    canManageLatestCareRecords={isViewingLatestImportedResult}
                    currentUserId={currentUserId}
                    currentUserRole={session.user.role}
                    referral={student.referral}
                />

                {uniqueYears.length > 1 && (
                    <AcademicYearFilter
                        academicYears={uniqueYears}
                        currentYearId={selectedYearId}
                    />
                )}

                <AssessmentRoundFilter
                    availableRounds={availableRounds}
                    currentRound={selectedRound}
                />

                <Tabs tabs={tabs} defaultTab="phq-results" syncWithUrl />
            </div>
        </StudentStatusProvider>
    );
}

function StudentDetailSkeleton() {
    return (
        <div
            className="space-y-7"
            role="status"
            aria-label="กำลังโหลดข้อมูลนักเรียน"
        >
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                    <Skeleton className="h-16 w-16 rounded-2xl" />
                    <div className="flex-1">
                        <Skeleton className="mb-2 h-6 w-40 rounded" />
                        <Skeleton className="h-4 w-56 rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton
                            key={i}
                            className="h-16 rounded-xl"
                        />
                    ))}
                </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex gap-4 mb-6">
                    <Skeleton className="h-10 w-32 rounded-lg" />
                    <Skeleton className="h-10 w-40 rounded-lg" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton
                            key={i}
                            className="h-16 rounded-xl"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
