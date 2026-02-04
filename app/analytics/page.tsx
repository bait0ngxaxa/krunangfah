import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAnalyticsSummary } from "@/lib/actions/analytics";
import { AnalyticsContent } from "@/components/analytics";
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
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-8 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-10 right-10 w-64 h-64 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow" />
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-slow delay-1000" />
            </div>

            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl shadow-pink-100/50 p-8 border border-white/60 relative overflow-hidden ring-1 ring-pink-50">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-rose-300 via-pink-300 to-orange-300" />
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent mb-2 drop-shadow-sm flex items-center gap-3">
                                <span className="text-3xl">📊</span> Dashboard &
                                Analytics
                            </h1>
                            <p className="text-gray-600 font-medium">
                                สรุปข้อมูลการคัดกรองสุขภาพจิตนักเรียน (PHQ-A)
                            </p>
                        </div>
                        <a
                            href="/dashboard"
                            className="px-6 py-2.5 bg-white text-gray-600 font-semibold rounded-xl hover:bg-pink-50 hover:text-pink-600 border border-gray-200 hover:border-pink-200 transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
                        >
                            <span>←</span> กลับหน้าหลัก
                        </a>
                    </div>
                </div>

                {/* Analytics Content */}
                <AnalyticsContent
                    initialData={analyticsData}
                    isSchoolAdmin={isSchoolAdmin}
                />
            </div>
        </div>
    );
}
