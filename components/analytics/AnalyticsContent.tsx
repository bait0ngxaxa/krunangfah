"use client";

import { useState, useMemo, useTransition } from "react";
import dynamic from "next/dynamic";
import {
    ClassFilter,
    PhqSummaryTable,
    HospitalReferralTable,
    ActivitySummaryTable,
} from "./index";
import { AnalyticsSkeleton } from "./AnalyticsSkeleton";
import { getAnalyticsSummary } from "@/lib/actions/analytics";
import type { AnalyticsData, RiskLevelSummary } from "@/lib/actions/analytics";
import type { RiskPieChartDataItem } from "@/components/ui/RiskPieChart";
import { Tabs, type Tab } from "@/components/ui/Tabs";

// Dynamic imports for chart components (ssr: false to prevent hydration warnings)
const RiskPieChart = dynamic(
    () =>
        import("@/components/ui/RiskPieChart").then((mod) => ({
            default: mod.RiskPieChart,
        })),
    {
        ssr: false,
        loading: () => (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-pulse text-gray-400">
                    กำลังโหลดกราฟ...
                </div>
            </div>
        ),
    },
);

const RiskLevelTrendChart = dynamic(
    () =>
        import("./charts/RiskLevelTrendChart").then((mod) => ({
            default: mod.RiskLevelTrendChart,
        })),
    {
        ssr: false,
        loading: () => (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-pulse text-gray-400">
                    กำลังโหลดกราฟ...
                </div>
            </div>
        ),
    },
);

const RiskLevelByGradeChart = dynamic(
    () =>
        import("./charts/RiskLevelByGradeChart").then((mod) => ({
            default: mod.RiskLevelByGradeChart,
        })),
    {
        ssr: false,
        loading: () => (
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-pulse text-gray-400">
                    กำลังโหลดกราฟ...
                </div>
            </div>
        ),
    },
);

// Risk level sort order (low → high severity)
const RISK_LEVEL_ORDER: Record<string, number> = {
    blue: 0,
    green: 1,
    yellow: 2,
    orange: 3,
    red: 4,
};

function toChartData(summary: RiskLevelSummary[]): RiskPieChartDataItem[] {
    return [...summary]
        .sort(
            (a, b) =>
                (RISK_LEVEL_ORDER[a.riskLevel] ?? 5) -
                (RISK_LEVEL_ORDER[b.riskLevel] ?? 5),
        )
        .map((item) => ({
            name: item.label,
            value: item.count,
            color: item.color,
        }));
}

interface SchoolOption {
    id: string;
    name: string;
}

interface AnalyticsContentProps {
    initialData: AnalyticsData;
    isSchoolAdmin: boolean;
    schools?: SchoolOption[];
    userRole?: string;
}

export function AnalyticsContent({
    initialData,
    isSchoolAdmin,
    schools,
    userRole,
}: AnalyticsContentProps) {
    const [data, setData] = useState<AnalyticsData>(initialData);
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>("all");
    const [isPending, startTransition] = useTransition();

    const isSystemAdmin = userRole === "system_admin" && schools && schools.length > 0;
    const showClassFilter = isSchoolAdmin || isSystemAdmin;

    const handleSchoolChange = (schoolId: string): void => {
        setSelectedSchoolId(schoolId);
        setSelectedClass("all");

        const schoolFilter = schoolId === "all" ? undefined : schoolId;
        startTransition(async () => {
            const newData = await getAnalyticsSummary(undefined, schoolFilter);
            if (newData) {
                setData(newData);
            }
        });
    };

    const handleClassChange = (classValue: string) => {
        const filterValue = classValue === "all" ? undefined : classValue;
        setSelectedClass(classValue);

        const schoolFilter = isSystemAdmin && selectedSchoolId !== "all"
            ? selectedSchoolId
            : undefined;

        startTransition(async () => {
            const newData = await getAnalyticsSummary(filterValue, schoolFilter);
            if (newData) {
                setData(newData);
            }
        });
    };

    const pieChartData = useMemo(
        () => toChartData(data.riskLevelSummary),
        [data.riskLevelSummary],
    );

    const selectedSchoolName = isSystemAdmin && selectedSchoolId !== "all"
        ? schools.find((s) => s.id === selectedSchoolId)?.name
        : undefined;

    const pieChartTitle = selectedClass === "all"
        ? selectedSchoolName
            ? `ข้อมูลนักเรียน (${selectedSchoolName})`
            : "ข้อมูลนักเรียน (ทุกโรงเรียน)"
        : `ข้อมูลนักเรียน (ห้อง ${selectedClass})`;

    const tabs: Tab[] = [
        {
            id: "summary",
            label: "📊 สรุปผลรวม",
            content: (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <PhqSummaryTable
                            riskLevelSummary={data.riskLevelSummary}
                        />
                        <RiskPieChart
                            data={pieChartData}
                            title={pieChartTitle}
                            height={380}
                            outerRadius={110}
                            showPercentageInLegend
                        />
                    </div>
                    {(isSchoolAdmin || isSystemAdmin) && (
                        <HospitalReferralTable
                            hospitalReferralsByGrade={
                                data.hospitalReferralsByGrade
                            }
                        />
                    )}
                </>
            ),
        },
        {
            id: "trend",
            label: "📈 กราฟแนวโน้ม",
            content: (
                <div className="space-y-6">
                    <RiskLevelTrendChart trendData={data.trendData} />
                    <RiskLevelByGradeChart gradeRiskData={data.gradeRiskData} />
                </div>
            ),
        },
        {
            id: "progress",
            label: "🎯 กิจกรรมช่วยเหลือ",
            content: (
                <ActivitySummaryTable
                    activityProgressByRisk={data.activityProgressByRisk}
                />
            ),
        },
    ];

    return (
        <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-blue-100 p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="relative flex items-center gap-4">
                        <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 shadow-sm border border-blue-100 group-hover:bg-blue-100 transition-colors">
                            <svg
                                className="w-8 h-8"
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
                            <p className="text-sm font-medium text-gray-500 mb-1">
                                นักเรียนทั้งหมด
                                {data.currentClass && ` (${data.currentClass})`}
                            </p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-bold text-gray-800">
                                    {data.totalStudents}
                                </p>
                                <p className="text-sm text-gray-500 font-medium">
                                    คน
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-emerald-100 p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="relative flex items-center gap-4">
                        <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                            <svg
                                className="w-8 h-8"
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
                            <p className="text-sm font-medium text-gray-500 mb-1">
                                คัดกรองแล้ว
                            </p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-bold text-emerald-600">
                                    {data.studentsWithAssessment}
                                </p>
                                <p className="text-sm text-gray-500 font-medium">
                                    คน
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100 p-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110" />
                    <div className="relative flex items-center gap-4">
                        <div className="p-4 bg-orange-50 rounded-2xl text-orange-600 shadow-sm border border-orange-100 group-hover:bg-orange-100 transition-colors">
                            <svg
                                className="w-8 h-8"
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
                            <p className="text-sm font-medium text-gray-500 mb-1">
                                ยังไม่ได้คัดกรอง
                            </p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-4xl font-bold text-orange-600">
                                    {data.studentsWithoutAssessment}
                                </p>
                                <p className="text-sm text-gray-500 font-medium">
                                    คน
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* School Filter for system_admin */}
            {isSystemAdmin && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-4 flex items-center gap-4">
                    <div className="p-2 bg-pink-50 rounded-lg text-pink-500">
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                        </svg>
                    </div>
                    <div className="flex-1 flex items-center gap-3">
                        <label
                            htmlFor="school-filter"
                            className="text-sm font-bold text-gray-700 whitespace-nowrap"
                        >
                            เลือกโรงเรียน:
                        </label>
                        <select
                            id="school-filter"
                            value={selectedSchoolId}
                            onChange={(e) => handleSchoolChange(e.target.value)}
                            className="flex-1 px-4 py-2.5 border border-pink-200 rounded-xl focus:ring-4 focus:ring-pink-100 focus:border-pink-400 transition-all outline-none bg-white hover:border-pink-300 text-gray-600 font-medium cursor-pointer"
                        >
                            <option value="all">ทุกโรงเรียน</option>
                            {schools.map((school) => (
                                <option key={school.id} value={school.id}>
                                    {school.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Class Filter for school_admin / system_admin */}
            {showClassFilter && data.availableClasses.length > 0 && (
                <ClassFilter
                    availableClasses={data.availableClasses}
                    currentClass={data.currentClass}
                    onClassChange={handleClassChange}
                />
            )}

            {/* Tabs - Show skeleton when loading */}
            {isPending ? (
                <AnalyticsSkeleton />
            ) : (
                <Tabs tabs={tabs} defaultTab="summary" />
            )}
        </>
    );
}
