import { BarChart3 } from "lucide-react";
import { redirect } from "next/navigation";

import { AnalyticsContent } from "@/components/analytics/AnalyticsContent";
import { PageBanner } from "@/components/ui/PageBanner";
import {
    getAnalyticsSummary,
    getSystemAnalyticsOverview,
} from "@/lib/actions/analytics/main";
import { getSchools } from "@/lib/actions/dashboard.actions";
import { requireAuth } from "@/lib/auth/session";
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
        round?: string;
    }>;
}

const MAX_SAFE_ACADEMIC_YEAR = 9999;
const MAX_WARNING_VALUE_LENGTH = 80;

function formatWarningValue(value: string): string {
    if (value.length <= MAX_WARNING_VALUE_LENGTH) {
        return value;
    }
    return `${value.slice(0, MAX_WARNING_VALUE_LENGTH)}...`;
}

function parseYearFilter(yearValue?: string): number | undefined {
    if (!yearValue) return undefined;

    if (!/^\d{4}$/.test(yearValue)) {
        return undefined;
    }

    const parsedYear = Number.parseInt(yearValue, 10);
    if (!Number.isSafeInteger(parsedYear)) return undefined;
    if (parsedYear > MAX_SAFE_ACADEMIC_YEAR) return undefined;
    return parsedYear;
}

function parseSemesterFilter(semesterValue?: string): number | undefined {
    if (!semesterValue) return undefined;

    if (!/^[12]$/.test(semesterValue)) {
        return undefined;
    }

    const parsedSemester = Number.parseInt(semesterValue, 10);
    return parsedSemester;
}

function parseRoundFilter(roundValue?: string): number | undefined {
    if (!roundValue) return undefined;

    if (!/^[12]$/.test(roundValue)) {
        return undefined;
    }

    return Number.parseInt(roundValue, 10);
}

function buildCanonicalFilterUrl(
    params: Awaited<AnalyticsPageProps["searchParams"]>,
    invalidKeys: ReadonlySet<keyof Awaited<AnalyticsPageProps["searchParams"]>>,
): string {
    const canonicalParams = new URLSearchParams();
    const entries = Object.entries(params) as Array<[string, string | undefined]>;

    for (const [key, value] of entries) {
        if (!value || invalidKeys.has(key as keyof typeof params)) continue;
        canonicalParams.set(key, value);
    }

    const query = canonicalParams.toString();
    return query ? `/analytics?${query}` : "/analytics";
}

export default async function AnalyticsPage({
    searchParams,
}: AnalyticsPageProps) {
    const session = await requireAuth();
    const params = await searchParams;
    const userRole = session.user.role;
    const isSystemAdmin = userRole === "system_admin";
    const isPrimaryAdmin =
        userRole === "school_admin" && session.user.isPrimary === true;
    const warnings: string[] = [];

    // ── Phase 1: Parse & pre-validate params (no DB calls) ──
    const parsedYear = parseYearFilter(params.year);
    const parsedSemester = parseSemesterFilter(params.semester);
    const parsedRound = parseRoundFilter(params.round);

    const invalidKeys = new Set<keyof typeof params>();
    if (params.year && parsedYear === undefined) invalidKeys.add("year");
    if (params.semester && parsedSemester === undefined) invalidKeys.add("semester");
    if (params.round && parsedRound === undefined) invalidKeys.add("round");
    if (parsedSemester !== undefined && parsedYear === undefined) {
        invalidKeys.add("semester");
    }
    if (invalidKeys.size > 0) {
        redirect(buildCanonicalFilterUrl(params, invalidKeys));
    }

    if (userRole === "class_teacher" && params.class && params.class !== "all") {
        warnings.push("ผู้ใช้บทบาทครูประจำชั้นถูกล็อกห้องอัตโนมัติ จึงไม่ใช้ค่า class จาก URL");
    }
    if (!isSystemAdmin && params.school && params.school !== "all") {
        warnings.push("ผู้ใช้ที่ไม่ใช่ system_admin ไม่สามารถกรอง school ได้ จึงไม่ใช้ค่า school จาก URL");
    }

    let selectedSchoolId = isSystemAdmin ? (params.school ?? "") : "all";
    const selectedClass = userRole === "class_teacher" ? "all" : (params.class ?? "all");
    let selectedAcademicYear = parsedYear === undefined ? "all" : params.year ?? "all";
    let selectedSemester = parsedSemester === undefined ? "all" : params.semester ?? "all";
    const selectedRound = parsedRound === undefined ? "all" : params.round ?? "all";

    // ── Phase 2: Validate schoolId against DB before main fetch ──
    // Fetch schools first (lightweight) to validate schoolId before the heavy analytics query
    const schools = isSystemAdmin ? await getSchools() : undefined;

    if (isSystemAdmin && selectedSchoolId) {
        const schoolExists = schools?.some((school) => school.id === selectedSchoolId) ?? false;
        if (!schoolExists) {
            warnings.push(
                `ไม่พบโรงเรียนที่ระบุไว้ ("${formatWarningValue(selectedSchoolId)}") กรุณาเลือกโรงเรียนใหม่`,
            );
            selectedSchoolId = "";
        }
    }

    const shouldRequireSchoolSelection = isSystemAdmin && !selectedSchoolId;

    if (shouldRequireSchoolSelection) {
        const systemOverview = await getSystemAnalyticsOverview(
            parsedYear,
            parsedSemester,
        );

        return (
            <div className="min-h-screen bg-slate-50 relative overflow-hidden">
                <PageBanner
                    title="Analytics"
                    subtitle="สรุปผลการคัดกรอง PHQ-A ของนักเรียน"
                    icon={BarChart3}
                    imageSrc="/image/dashboard/analytics.png"
                    imageAlt="Analytics Dashboard"
                    imageContainerClassName="relative z-10 mx-auto mt-2 flex w-[220px] items-end pointer-events-none sm:w-[240px] md:absolute md:bottom-4 md:left-1/2 md:mt-0 md:w-[300px] md:-translate-x-1/2 lg:w-[360px]"
                    backUrl="/dashboard"
                />

                <div className="max-w-7xl mx-auto space-y-6 relative z-10 px-4 py-8">
                    <AnalyticsContent
                        data={null}
                        schools={schools}
                        userRole={userRole}
                        isPrimaryAdmin={isPrimaryAdmin}
                        selectedClass={selectedClass}
                        selectedSchoolId={selectedSchoolId}
                        selectedAcademicYear={selectedAcademicYear}
                        selectedSemester={selectedSemester}
                        selectedRound={selectedRound}
                        filterWarnings={warnings}
                        requireSchoolSelection={true}
                        systemOverview={systemOverview}
                    />
                </div>
            </div>
        );
    }

    // ── Phase 3: Single analytics fetch with validated params ──
    const analyticsData = await getAnalyticsSummary(
        selectedClass !== "all" ? selectedClass : undefined,
        selectedSchoolId,
        parsedYear,
        parsedSemester,
        parsedRound,
    );

    if (!analyticsData) {
        redirect("/dashboard");
    }

    if (!params.year && analyticsData.currentAcademicYear !== undefined) {
        selectedAcademicYear = analyticsData.currentAcademicYear.toString();
    }
    if (!params.semester && analyticsData.currentSemester !== undefined) {
        selectedSemester = analyticsData.currentSemester.toString();
    }

    // ── Phase 4: Post-fetch validation ──
    // Keep the queried filter visible when its scope has no data. Relabeling it as
    // "all" would make the UI disagree with the already-filtered result.
    if (selectedClass !== "all" && !analyticsData.availableClasses.includes(selectedClass)) {
        warnings.push(`ไม่พบห้องเรียน "${selectedClass}" ในขอบเขตข้อมูล`);
    }

    const selectedYearHasNoScreening =
        selectedAcademicYear !== "all" &&
        !analyticsData.availableAcademicYears.includes(Number(selectedAcademicYear));
    const selectedSemesterHasNoScreening =
        selectedSemester !== "all" &&
        !analyticsData.availableSemesters.includes(Number(selectedSemester));
    const selectedTermHasNoScreening =
        analyticsData.selectedAcademicTermExists &&
        (selectedYearHasNoScreening || selectedSemesterHasNoScreening);

    if (selectedTermHasNoScreening) {
        const semesterLabel = selectedSemester === "all"
            ? ""
            : ` เทอม ${selectedSemester}`;
        warnings.push(
            `ยังไม่มีผลคัดกรองในปีการศึกษา ${selectedAcademicYear}${semesterLabel}`,
        );
    }

    if (
        !selectedTermHasNoScreening &&
        selectedAcademicYear !== "all" &&
        selectedYearHasNoScreening
    ) {
        warnings.push(
            `ไม่พบปีการศึกษา "${selectedAcademicYear}" ในขอบเขตข้อมูล`,
        );
    }

    if (
        !selectedTermHasNoScreening &&
        selectedSemester !== "all" &&
        selectedSemesterHasNoScreening
    ) {
        warnings.push(
            `ไม่พบเทอม "${selectedSemester}" ในขอบเขตข้อมูล`,
        );
    }

    if (
        selectedRound !== "all" &&
        !analyticsData.availableRounds.includes(Number(selectedRound))
    ) {
        warnings.push(
            `ไม่พบครั้งที่ "${selectedRound}" ในขอบเขตข้อมูล`,
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">
            <PageBanner
                title="Analytics"
                subtitle="สรุปผลการคัดกรอง PHQ-A ของนักเรียน"
                icon={BarChart3}
                imageSrc="/image/dashboard/analytics.png"
                imageAlt="Analytics Dashboard"
                imageContainerClassName="relative z-10 mx-auto mt-2 flex w-[220px] items-end pointer-events-none sm:w-[240px] md:absolute md:bottom-4 md:left-1/2 md:mt-0 md:w-[300px] md:-translate-x-1/2 lg:w-[360px]"
                backUrl="/dashboard"
            />

            <div className="max-w-7xl mx-auto space-y-6 relative z-10 px-4 py-8">
                <AnalyticsContent
                    data={analyticsData}
                    schools={schools}
                    userRole={userRole}
                    isPrimaryAdmin={isPrimaryAdmin}
                    selectedClass={selectedClass}
                    selectedSchoolId={selectedSchoolId}
                    selectedAcademicYear={selectedAcademicYear}
                    selectedSemester={selectedSemester}
                    selectedRound={selectedRound}
                    filterWarnings={warnings}
                    systemOverview={null}
                />
            </div>
        </div>
    );
}
