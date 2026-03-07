import { BarChart3 } from "lucide-react";
import { redirect } from "next/navigation";

import { AnalyticsContent } from "@/components/analytics/AnalyticsContent";
import { PageBanner } from "@/components/ui/PageBanner";
import { getAnalyticsSummary } from "@/lib/actions/analytics/main";
import { getSchools } from "@/lib/actions/dashboard.actions";
import { requireAuth } from "@/lib/session";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "สรุปข้อมูล | โครงการครูนางฟ้า",
    description: "Dashboard and PHQ-A screening summary.",
};

interface AnalyticsPageProps {
    searchParams: Promise<{
        class?: string;
        school?: string;
        year?: string;
    }>;
}

function parseYearFilter(yearValue?: string): number | undefined {
    if (!yearValue) return undefined;

    const parsedYear = Number.parseInt(yearValue, 10);
    return Number.isNaN(parsedYear) ? undefined : parsedYear;
}

export default async function AnalyticsPage({
    searchParams,
}: AnalyticsPageProps) {
    const session = await requireAuth();
    const params = await searchParams;
    const userRole = session.user.role;
    const isSystemAdmin = userRole === "system_admin";
    const selectedSchoolId = isSystemAdmin ? (params.school ?? "all") : "all";
    const selectedClass = params.class ?? "all";
    const selectedAcademicYear = params.year ?? "all";

    const [analyticsData, schools] = await Promise.all([
        getAnalyticsSummary(
            selectedClass !== "all" ? selectedClass : undefined,
            selectedSchoolId !== "all" ? selectedSchoolId : undefined,
            parseYearFilter(params.year),
        ),
        isSystemAdmin ? getSchools() : Promise.resolve(undefined),
    ]);

    if (!analyticsData) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            <PageBanner
                title="Analytics"
                subtitle="PHQ-A screening summary for students"
                icon={BarChart3}
                imageSrc="/image/dashboard/analytics.png"
                imageAlt="Analytics Dashboard"
                imageContainerClassName="absolute bottom-4 left-1/2 -translate-x-1/2 w-[200px] sm:w-[300px] lg:w-[360px] pointer-events-none z-10 flex items-end"
                backUrl="/dashboard"
            />

            <div className="max-w-7xl mx-auto space-y-6 relative z-10 px-4 py-8">
                <AnalyticsContent
                    data={analyticsData}
                    schools={schools}
                    userRole={userRole}
                    selectedClass={selectedClass}
                    selectedSchoolId={selectedSchoolId}
                    selectedAcademicYear={selectedAcademicYear}
                />
            </div>
        </div>
    );
}
