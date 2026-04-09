import { Suspense } from "react";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { BarChart3, Target, Home } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { getStudentDetail } from "@/lib/actions/student/main";
import { StudentProfileCard } from "@/components/student/profile/StudentProfileCard";
import { PHQHistoryTable } from "@/components/student/phq/PHQHistoryTable";
import { ActivityProgressTable } from "@/components/student/activity/ActivityProgressTable";
import { CounselingLogTable } from "@/components/student/counseling/CounselingLogTable";
import { AcademicYearFilter } from "@/components/student/profile/AcademicYearFilter";
import { ReferralButton } from "@/components/student/referral/ReferralButton";
import { HomeVisitTab } from "@/components/student/home-visit/HomeVisitTab";

// Lazy-load chart library to keep initial bundle for detail page smaller.
const PHQTrendChart = dynamic(
    () =>
        import("@/components/student/phq/PHQTrendChart").then(
            (mod) => mod.PHQTrendChart,
        ),
    {
        loading: () => (
            <div className="h-[300px] bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center text-gray-400">
                กำลังโหลดกราฟ…
            </div>
        ),
    },
);
import { getCounselingSessions } from "@/lib/actions/counseling.actions";
import { getHomeVisits } from "@/lib/actions/home-visit.actions";
import { requireAuth } from "@/lib/session";
import { Tabs } from "@/components/ui/Tabs";
import type { RiskLevel } from "@/lib/utils/phq-scoring";
import type { OffsetPagination } from "@/types/pagination.types";

const PHQ_HISTORY_PAGE_SIZE = 10;
const COUNSELING_PAGE_SIZE = 10;
const HOME_VISITS_PAGE_SIZE = 5;

function parsePositiveInt(value: string | undefined): number {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
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
        phqPage,
        counselingPage,
        homeVisitPage,
    } = await searchParams;

    return (
        <div className="relative min-h-screen overflow-hidden bg-linear-to-br from-slate-50 via-white to-emerald-50/40 py-6 px-4">
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
                <div className="absolute -top-16 -right-12 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
                <div className="absolute bottom-8 -left-16 h-72 w-72 rounded-full bg-cyan-100/45 blur-3xl" />
                <div className="absolute top-1/3 left-1/4 h-52 w-52 rounded-full bg-teal-100/40 blur-3xl" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl">
                <BackButton href="/students" label="กลับหน้านักเรียน" />

                <Suspense fallback={<StudentDetailSkeleton />}>
                    <StudentDetailContent
                        studentId={id}
                        selectedYearId={selectedYearId}
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
    phqPage,
    counselingPage,
    homeVisitPage,
}: {
    studentId: string;
    selectedYearId?: string;
    phqPage: number;
    counselingPage: number;
    homeVisitPage: number;
}) {
    // Fetch independent datasets in parallel.
    const [session, student, counselingSessionData, homeVisitData] =
        await Promise.all([
            requireAuth(),
            getStudentDetail(studentId),
            getCounselingSessions(studentId, {
                page: counselingPage,
                pageSize: COUNSELING_PAGE_SIZE,
            }),
            getHomeVisits(studentId, {
                page: homeVisitPage,
                pageSize: HOME_VISITS_PAGE_SIZE,
            }),
        ]);
    const currentUserId = session.user.id;
    const isSystemAdmin = session.user.role === "system_admin";

    if (!student) {
        notFound();
    }

    // Build unique academic year list for filter options.
    const uniqueYears = Array.from(
        new Map(
            student.phqResults
                .filter((r) => r.academicYear)
                .map((r) => [r.academicYear.id, r.academicYear]),
        ).values(),
    ).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.semester - a.semester;
    });

    // Apply year filter (year-only or specific semester id).
    const filteredPhqResults = (() => {
        if (!selectedYearId) return student.phqResults;

        if (selectedYearId.startsWith("year:")) {
            const yearNum = parseInt(selectedYearId.replace("year:", ""), 10);
            if (isNaN(yearNum)) return student.phqResults;
            return student.phqResults.filter(
                (r) => r.academicYear?.year === yearNum,
            );
        }

        return student.phqResults.filter(
            (r) => r.academicYear?.id === selectedYearId,
        );
    })();

    const latestResult = filteredPhqResults[0] || null;
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
                    readOnly={isSystemAdmin}
                />
            )}
            <CounselingLogTable
                sessions={counselingSessionData.sessions}
                pagination={counselingSessionData.pagination}
                studentId={studentId}
                readOnly={isSystemAdmin}
            />
        </div>
    );

    const homeVisitsTab = (
        <HomeVisitTab
            visits={homeVisitData.visits}
            pagination={homeVisitData.pagination}
            studentId={studentId}
            readOnly={isSystemAdmin}
        />
    );

    const tabs = [
        {
            id: "phq-results",
            label: (
                <span className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm">
                        <BarChart3 className="w-3.5 h-3.5" />
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
                        <Target className="w-3.5 h-3.5" />
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
                        <Home className="w-3.5 h-3.5" />
                    </span>
                    เยี่ยมบ้าน
                </span>
            ),
            content: homeVisitsTab,
        },
    ];

    return (
        <div className="space-y-7">
            <StudentProfileCard student={student} latestResult={latestResult} />

            {latestResult && !isSystemAdmin && (
                <div className="flex justify-end">
                    <ReferralButton
                        studentId={studentId}
                        studentName={`${student.firstName} ${student.lastName}`}
                        referral={student.referral}
                        currentUserId={currentUserId}
                        currentUserRole={session.user.role}
                    />
                </div>
            )}

            {uniqueYears.length > 1 && (
                <AcademicYearFilter
                    academicYears={uniqueYears}
                    currentYearId={selectedYearId}
                />
            )}

            <Tabs tabs={tabs} defaultTab="phq-results" syncWithUrl />
        </div>
    );
}

function StudentDetailSkeleton() {
    return (
        <div className="space-y-7">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-gray-200 rounded-2xl animate-pulse" />
                    <div className="flex-1">
                        <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-4 w-56 bg-gray-200 rounded animate-pulse" />
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="h-16 bg-gray-100 rounded-xl animate-pulse"
                        />
                    ))}
                </div>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex gap-4 mb-6">
                    <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
                    <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse" />
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="h-16 bg-gray-100 rounded-xl animate-pulse"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
