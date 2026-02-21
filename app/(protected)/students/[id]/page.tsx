import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BarChart3, Target } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { getStudentDetail } from "@/lib/actions/student";
import {
    StudentProfileCard,
    PHQHistoryTable,
    PHQTrendChart,
    ActivityProgressTable,
    CounselingLogTable,
    AcademicYearFilter,
    HospitalReferralButton,
} from "@/components/student";
import { getCounselingSessions } from "@/lib/actions/counseling.actions";
import { Tabs } from "@/components/ui/Tabs";
import type { RiskLevel } from "@/lib/utils/phq-scoring";

interface StudentDetailPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ year?: string }>;
}

export default async function StudentDetailPage({
    params,
    searchParams,
}: StudentDetailPageProps) {
    const { id } = await params;
    const { year: selectedYearId } = await searchParams;

    return (
        <div className="min-h-screen bg-linear-to-br from-emerald-50 via-white to-teal-50 py-6 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-10 right-10 w-64 h-64 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow" />
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-teal-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow delay-1000" />
                <div className="absolute top-1/3 left-1/4 w-48 h-48 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse-slow delay-500" />
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                <BackButton href="/students" label="กลับหน้านักเรียน" />

                {/* Content (streamed via Suspense) */}
                <Suspense fallback={<StudentDetailSkeleton />}>
                    <StudentDetailContent
                        studentId={id}
                        selectedYearId={selectedYearId}
                    />
                </Suspense>
            </div>
        </div>
    );
}

/* ─── Async Content (streamed via Suspense) ─── */

async function StudentDetailContent({
    studentId,
    selectedYearId,
}: {
    studentId: string;
    selectedYearId?: string;
}) {
    // Parallelize both data fetches (was sequential before)
    const [student, counselingSessions] = await Promise.all([
        getStudentDetail(studentId),
        getCounselingSessions(studentId),
    ]);

    if (!student) {
        notFound();
    }

    // Extract unique academic years from PHQ results
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

    // Filter PHQ results by selected year
    const filteredPhqResults = selectedYearId
        ? student.phqResults.filter(
              (r) => r.academicYear?.id === selectedYearId,
          )
        : student.phqResults;

    const latestResult = filteredPhqResults[0] || null;

    // Tab 1: PHQ Results (Chart + History)
    const phqResultsTab = (
        <div className="space-y-6">
            {filteredPhqResults.length > 0 && (
                <PHQTrendChart results={filteredPhqResults} />
            )}
            <PHQHistoryTable results={filteredPhqResults} />
        </div>
    );

    // Tab 2: Activities (Activity Progress + Counseling Log)
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
                />
            )}
            <CounselingLogTable
                sessions={counselingSessions}
                studentId={studentId}
            />
        </div>
    );

    const tabs = [
        {
            id: "phq-results",
            label: (
                <span className="flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" /> ผลการคัดกรอง
                </span>
            ),
            content: phqResultsTab,
        },
        {
            id: "activities",
            label: (
                <span className="flex items-center gap-1.5">
                    <Target className="w-4 h-4" /> กิจกรรมและบันทึกการพูดคุย
                </span>
            ),
            content: activitiesTab,
        },
    ];

    return (
        <div className="space-y-6">
            <StudentProfileCard student={student} latestResult={latestResult} />

            {latestResult && (
                <div className="flex justify-end">
                    <HospitalReferralButton />
                </div>
            )}

            {uniqueYears.length > 1 && (
                <AcademicYearFilter
                    academicYears={uniqueYears}
                    currentYearId={selectedYearId}
                />
            )}

            <Tabs tabs={tabs} defaultTab="phq-results" />
        </div>
    );
}

/* ─── Skeleton Fallback ─── */

function StudentDetailSkeleton() {
    return (
        <div className="space-y-6">
            {/* Profile Card Skeleton */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 p-6 border border-emerald-200 ring-1 ring-emerald-50">
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

            {/* Tabs Skeleton */}
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg shadow-emerald-100/30 p-6 border border-emerald-200 ring-1 ring-emerald-50">
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
