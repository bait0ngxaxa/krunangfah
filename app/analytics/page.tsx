import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAnalyticsSummary } from "@/lib/actions/analytics.actions";
import { PhqSummaryTable } from "@/components/analytics/PhqSummaryTable";
import { RiskLevelPieChart } from "@/components/analytics/RiskLevelPieChart";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "สรุปข้อมูลนักเรียน | โครงการครูนางฟ้า",
    description: "Dashboard และสรุปข้อมูลการคัดกรอง PHQ-A",
};

export default async function AnalyticsPage() {
    const session = await requireAuth();

    // Get analytics data
    const analyticsData = await getAnalyticsSummary();

    if (!analyticsData) {
        redirect("/dashboard");
    }

    const {
        totalStudents,
        riskLevelSummary,
        studentsWithAssessment,
        studentsWithoutAssessment,
    } = analyticsData;

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-pink-400">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        📊 Dashboard & Analytics
                    </h1>
                    <p className="text-gray-600">
                        สรุปข้อมูลการคัดกรองสุขภาพจิตนักเรียน (PHQ-A)
                    </p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-100 rounded-lg">
                                <svg
                                    className="w-8 h-8 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">
                                    นักเรียนทั้งหมด
                                </p>
                                <p className="text-3xl font-bold text-blue-600">
                                    {totalStudents}
                                </p>
                                <p className="text-xs text-gray-500">คน</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-green-100 rounded-lg">
                                <svg
                                    className="w-8 h-8 text-green-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">
                                    คัดกรองแล้ว
                                </p>
                                <p className="text-3xl font-bold text-green-600">
                                    {studentsWithAssessment}
                                </p>
                                <p className="text-xs text-gray-500">คน</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-orange-100 rounded-lg">
                                <svg
                                    className="w-8 h-8 text-orange-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">
                                    ยังไม่ได้คัดกรอง
                                </p>
                                <p className="text-3xl font-bold text-orange-600">
                                    {studentsWithoutAssessment}
                                </p>
                                <p className="text-xs text-gray-500">คน</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* PHQ Summary Table */}
                    <PhqSummaryTable riskLevelSummary={riskLevelSummary} />

                    {/* Risk Level Pie Chart */}
                    <RiskLevelPieChart
                        riskLevelSummary={riskLevelSummary}
                        totalStudents={studentsWithAssessment}
                    />
                </div>

                {/* Back Button */}
                <div className="flex justify-center">
                    <a
                        href="/dashboard"
                        className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        ← กลับไปหน้าหลัก
                    </a>
                </div>
            </div>
        </div>
    );
}
