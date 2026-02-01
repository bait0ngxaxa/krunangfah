import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getStudentDetail } from "@/lib/actions/student.actions";
import { StudentProfileCard } from "@/components/student/StudentProfileCard";
import { PHQHistoryTable } from "@/components/student/PHQHistoryTable";
import { PHQTrendChart } from "@/components/student/PHQTrendChart";
import { ActivityProgressTable } from "@/components/student/ActivityProgressTable";
import { CounselingLogTable } from "@/components/student/CounselingLogTable";
import { getCounselingSessions } from "@/lib/actions/counseling.actions";
import { Tabs } from "@/components/ui/Tabs";
import type { RiskLevel } from "@/lib/utils/phq-scoring";

interface StudentDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({
    params,
}: StudentDetailPageProps) {
    const { id } = await params;
    const student = await getStudentDetail(id);

    if (!student) {
        notFound();
    }

    const latestResult = student.phqResults[0] || null;
    const counselingSessions = await getCounselingSessions(id);

    // Tab 1: PHQ Results (Chart + History)
    const phqResultsTab = (
        <div className="space-y-6">
            {/* Trend Chart */}
            {student.phqResults.length > 0 && (
                <PHQTrendChart results={student.phqResults} />
            )}

            {/* History Table */}
            <PHQHistoryTable results={student.phqResults} />
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

                    {/* Tabs */}
                    <Tabs tabs={tabs} defaultTab="phq-results" />
                </div>
            </div>
        </div>
    );
}
