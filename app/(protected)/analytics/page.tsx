import { Suspense } from "react";
import { BarChart3 } from "lucide-react";
import { PageBanner } from "@/components/ui/PageBanner";
import { requireAuth } from "@/lib/session";
import { redirect } from "next/navigation";
import { getAnalyticsSummary } from "@/lib/actions/analytics";
import { getSchools } from "@/lib/actions/dashboard.actions";
import { AnalyticsContent } from "@/components/analytics";
import { AnalyticsSkeleton } from "@/components/analytics/AnalyticsSkeleton";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "สรุปข้อมูลนักเรียน | โครงการครูนางฟ้า",
    description: "Dashboard และสรุปข้อมูลการคัดกรอง PHQ-A",
};

export default async function AnalyticsPage() {
    const session = await requireAuth();

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            <PageBanner
                title="Analytics"
                subtitle="สรุปข้อมูลการคัดกรองสุขภาพจิตนักเรียน (PHQ-A)"
                icon={BarChart3}
                imageSrc="/image/dashboard/analytics.png"
                imageAlt="Analytics Dashboard"
                backUrl="/dashboard"
            />

            <div className="max-w-7xl mx-auto space-y-6 relative z-10 px-4 py-8">
                {/* Analytics Content (streamed via Suspense) */}
                <Suspense fallback={<AnalyticsSkeleton />}>
                    <AnalyticsData session={session} />
                </Suspense>
            </div>
        </div>
    );
}

/* ─── Async Content (streamed via Suspense) ─── */

async function AnalyticsData({
    session,
}: {
    session: Awaited<ReturnType<typeof requireAuth>>;
}) {
    const userRole = session.user.role;
    const isSystemAdmin = userRole === "system_admin";

    const [analyticsData, schools] = await Promise.all([
        getAnalyticsSummary(),
        isSystemAdmin ? getSchools() : Promise.resolve([]),
    ]);

    if (!analyticsData) {
        redirect("/dashboard");
    }

    return (
        <AnalyticsContent
            initialData={analyticsData}
            isSchoolAdmin={userRole === "school_admin"}
            schools={isSystemAdmin ? schools : undefined}
            userRole={userRole}
        />
    );
}
