import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAnalyticsSummary } from "@/lib/actions/analytics";
import { AnalyticsContent } from "@/components/analytics/AnalyticsContent";
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

    const isSchoolAdmin = session.user.role === "school_admin";

    return (
        <div className="min-h-screen bg-linear-to-br from-pink-50 via-purple-50 to-blue-50 py-8 px-4">
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

                {/* Analytics Content */}
                <AnalyticsContent
                    initialData={analyticsData}
                    isSchoolAdmin={isSchoolAdmin}
                />

                {/* Back Button */}
                <div className="flex justify-center">
                    <a
                        href="/dashboard"
                        className="px-6 py-3 bg-linear-to-r from-pink-500 to-purple-500 text-white font-semibold rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                        ← กลับไปหน้าหลัก
                    </a>
                </div>
            </div>
        </div>
    );
}
