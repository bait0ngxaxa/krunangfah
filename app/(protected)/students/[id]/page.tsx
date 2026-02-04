import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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

    const student = await getStudentDetail(id);

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
        // Sort by year desc, then semester desc
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
    const counselingSessions = await getCounselingSessions(id);

    // Tab 1: PHQ Results (Chart + History)
    const phqResultsTab = (
        <div className="space-y-6">
            {/* Trend Chart */}
            {filteredPhqResults.length > 0 && (
                <PHQTrendChart results={filteredPhqResults} />
            )}

            {/* History Table */}
            <PHQHistoryTable results={filteredPhqResults} />
        </div>
    );

    // Tab 2: Activities (Activity Progress + Counseling Log)
    const activitiesTab = (
        <div className="space-y-6">
            {/* Activity Progress Table */}
            {latestResult && (
                <ActivityProgressTable
                    studentId={id}
                    phqResultId={latestResult.id}
                    riskLevel={latestResult.riskLevel as RiskLevel}
                />
            )}

            {/* Counseling Log Table */}
            <CounselingLogTable sessions={counselingSessions} studentId={id} />
        </div>
    );

    const tabs = [
        {
            id: "phq-results",
            label: "📊 ผลการคัดกรอง",
            content: phqResultsTab,
        },
        {
            id: "activities",
            label: "🎯 กิจกรรมและบันทึกการพูดคุย",
            content: activitiesTab,
        },
    ];

    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="max-w-6xl mx-auto relative z-10">
                {/* Back Button */}
                <div className="mb-6">
                    <Link
                        href="/students"
                        className="inline-flex items-center gap-2 text-gray-500 hover:text-pink-600 font-medium transition-all hover:bg-pink-50 px-4 py-2 rounded-full"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>กลับหน้านักเรียน</span>
                    </Link>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    {/* Profile Card */}
                    <StudentProfileCard
                        student={student}
                        latestResult={latestResult}
                    />

                    {/* Hospital Referral Button */}
                    {latestResult && (
                        <div className="flex justify-end">
                            <HospitalReferralButton
                                phqResultId={latestResult.id}
                                initialStatus={latestResult.referredToHospital}
                            />
                        </div>
                    )}

                    {/* Academic Year Filter */}
                    {uniqueYears.length > 1 && (
                        <AcademicYearFilter
                            academicYears={uniqueYears}
                            currentYearId={selectedYearId}
                        />
                    )}

                    {/* Tabs */}
                    <Tabs tabs={tabs} defaultTab="phq-results" />
                </div>
            </div>
        </div>
    );
}
