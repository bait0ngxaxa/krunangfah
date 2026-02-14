import { BarChart3 } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { requireAuth } from "@/lib/session";
import { redirect } from "next/navigation";
import { getAnalyticsSummary } from "@/lib/actions/analytics";
import { getSchools } from "@/lib/actions/dashboard.actions";
import { AnalyticsContent } from "@/components/analytics";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "สรุปข้อมูลนักเรียน | โครงการครูนางฟ้า",
    description: "Dashboard และสรุปข้อมูลการคัดกรอง PHQ-A",
};

export default async function AnalyticsPage() {
    // Start independent promises immediately (avoid waterfall)
    const sessionPromise = requireAuth();
    const analyticsPromise = getAnalyticsSummary();

    const session = await sessionPromise;
    const userRole = session.user.role;
    const isSystemAdmin = userRole === "system_admin";

    // Parallelize analytics + schools fetch
    const [analyticsData, schools] = await Promise.all([
        analyticsPromise,
        isSystemAdmin ? getSchools() : Promise.resolve([]),
    ]);

    if (!analyticsData) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-rose-50 via-white to-pink-50 py-6 px-4 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-10 right-10 w-64 h-64 bg-rose-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40" />
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-orange-100 rounded-full mix-blend-multiply filter blur-3xl opacity-40" />
            </div>

            <div className="max-w-7xl mx-auto space-y-6 relative z-10">
                <BackButton
                    href="/dashboard"
                    label="กลับหน้าหลัก"
                    className="mb-4"
                />
                {/* Header */}
                <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(244,114,182,0.15)] p-6 sm:p-8 border border-pink-200 overflow-hidden ring-1 ring-white/80 group">
                    {/* Gradient accent bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-400 via-pink-400 to-rose-300 opacity-60" />
                    {/* Top shimmer */}
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/80 to-transparent" />
                    {/* Corner decoration */}
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-linear-to-br from-rose-200/20 to-pink-300/15 rounded-full blur-xl pointer-events-none" />

                    <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold mb-2 drop-shadow-sm flex items-center gap-3">
                                <div className="relative shrink-0">
                                    <div className="absolute inset-0 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 blur-md opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
                                    <div className="relative w-12 h-12 rounded-2xl bg-linear-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-200/50 group-hover:scale-105 group-hover:rotate-3 transition-all duration-500">
                                        <BarChart3 className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                                <span className="bg-linear-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
                                    Dashboard &amp; Analytics
                                </span>
                            </h1>
                            <p className="text-gray-500 font-medium text-sm">
                                สรุปข้อมูลการคัดกรองสุขภาพจิตนักเรียน (PHQ-A)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Analytics Content */}
                <AnalyticsContent
                    initialData={analyticsData}
                    isSchoolAdmin={userRole === "school_admin"}
                    schools={isSystemAdmin ? schools : undefined}
                    userRole={userRole}
                />
            </div>
        </div>
    );
}
