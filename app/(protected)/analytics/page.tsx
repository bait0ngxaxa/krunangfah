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
        semester?: string;
    }>;
}

function parseYearFilter(yearValue?: string): number | undefined {
    if (!yearValue) return undefined;

    const parsedYear = Number.parseInt(yearValue, 10);
    return Number.isNaN(parsedYear) ? undefined : parsedYear;
}

function parseSemesterFilter(semesterValue?: string): number | undefined {
    if (!semesterValue) return undefined;

    const parsedSemester = Number.parseInt(semesterValue, 10);
    if (Number.isNaN(parsedSemester)) return undefined;
    if (parsedSemester !== 1 && parsedSemester !== 2) return undefined;
    return parsedSemester;
}

export default async function AnalyticsPage({
    searchParams,
}: AnalyticsPageProps) {
    const session = await requireAuth();
    const params = await searchParams;
    const userRole = session.user.role;
    const isSystemAdmin = userRole === "system_admin";
    const warnings: string[] = [];

    // ── Phase 1: Parse & pre-validate params (no DB calls) ──
    const parsedYear = parseYearFilter(params.year);
    const parsedSemester = parseSemesterFilter(params.semester);

    if (params.year && parsedYear === undefined) {
        warnings.push(`ค่า year ไม่ถูกต้อง ("${params.year}") ระบบจึงใช้ "ทุกปีการศึกษา"`);
    }
    if (params.semester && parsedSemester === undefined) {
        warnings.push(
            `ค่า semester ไม่ถูกต้อง ("${params.semester}") ระบบจึงใช้ "ทุกเทอม"`,
        );
    }
    if (userRole === "class_teacher" && params.class && params.class !== "all") {
        warnings.push("ผู้ใช้บทบาทครูประจำชั้นถูกล็อกห้องอัตโนมัติ จึงไม่ใช้ค่า class จาก URL");
    }
    if (!isSystemAdmin && params.school && params.school !== "all") {
        warnings.push("ผู้ใช้ที่ไม่ใช่ system_admin ไม่สามารถกรอง school ได้ จึงไม่ใช้ค่า school จาก URL");
    }

    let selectedSchoolId = isSystemAdmin ? (params.school ?? "all") : "all";
    let selectedClass = userRole === "class_teacher" ? "all" : (params.class ?? "all");
    let selectedAcademicYear = params.year ?? "all";
    let selectedSemester = params.semester ?? "all";

    // ── Phase 2: Validate schoolId against DB before main fetch ──
    // Fetch schools first (lightweight) to validate schoolId before the heavy analytics query
    const schools = isSystemAdmin ? await getSchools() : undefined;

    if (isSystemAdmin && selectedSchoolId !== "all") {
        const schoolExists = schools?.some((school) => school.id === selectedSchoolId) ?? false;
        if (!schoolExists) {
            warnings.push(
                `ไม่พบโรงเรียนที่ระบุไว้ ("${selectedSchoolId}") ระบบจึงใช้ "ทุกโรงเรียน"`,
            );
            selectedSchoolId = "all";
        }
    }

    // ── Phase 3: Single analytics fetch with validated params ──
    const analyticsData = await getAnalyticsSummary(
        selectedClass !== "all" ? selectedClass : undefined,
        selectedSchoolId !== "all" ? selectedSchoolId : undefined,
        parsedYear,
        parsedSemester,
    );

    if (!analyticsData) {
        redirect("/dashboard");
    }

    // ── Phase 4: Post-fetch validation (reset filter labels only, no refetch needed) ──
    // When a class/year/semester doesn't exist in the result set, the query already
    // returned an empty filtered result — resetting to "all" only affects the UI label
    if (selectedClass !== "all" && !analyticsData.availableClasses.includes(selectedClass)) {
        warnings.push(`ไม่พบห้องเรียน "${selectedClass}" ในขอบเขตข้อมูล ระบบจึงใช้ "แสดงทั้งหมด"`);
        selectedClass = "all";
    }

    if (
        selectedAcademicYear !== "all" &&
        !analyticsData.availableAcademicYears.includes(Number(selectedAcademicYear))
    ) {
        warnings.push(
            `ไม่พบปีการศึกษา "${selectedAcademicYear}" ในขอบเขตข้อมูล ระบบจึงใช้ "ทุกปีการศึกษา"`,
        );
        selectedAcademicYear = "all";
    }

    if (
        selectedSemester !== "all" &&
        !analyticsData.availableSemesters.includes(Number(selectedSemester))
    ) {
        warnings.push(
            `ไม่พบเทอม "${selectedSemester}" ในขอบเขตข้อมูล ระบบจึงใช้ "ทุกเทอม"`,
        );
        selectedSemester = "all";
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
                    selectedSemester={selectedSemester}
                    filterWarnings={warnings}
                />
            </div>
        </div>
    );
}
