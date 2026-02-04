"use client";

import { useState, useTransition } from "react";
import {
    ClassFilter,
    PhqSummaryTable,
    RiskLevelPieChart,
    RiskLevelTrendChart,
    RiskLevelByGradeChart,
    HospitalReferralTable,
    ActivitySummaryTable,
} from "./index";
import { AnalyticsSkeleton } from "./AnalyticsSkeleton";
import { getAnalyticsSummary } from "@/lib/actions/analytics";
import type { AnalyticsData } from "@/lib/actions/analytics";
import { Tabs, type Tab } from "@/components/ui/Tabs";

interface AnalyticsContentProps {
    initialData: AnalyticsData;
    isSchoolAdmin: boolean;
}

export function AnalyticsContent({
    initialData,
    isSchoolAdmin,
}: AnalyticsContentProps) {
    const [data, setData] = useState<AnalyticsData>(initialData);
    const [selectedClass, setSelectedClass] = useState<string>("all");
    const [isPending, startTransition] = useTransition();

    const handleClassChange = (classValue: string) => {
        const filterValue = classValue === "all" ? undefined : classValue;
        setSelectedClass(classValue);

        startTransition(async () => {
            const newData = await getAnalyticsSummary(filterValue);
            if (newData) {
                setData(newData);
            }
        });
    };

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
                        <RiskLevelPieChart
                            riskLevelSummary={data.riskLevelSummary}
                            totalStudents={data.studentsWithAssessment}
                            selectedClass={
                                selectedClass === "all"
                                    ? undefined
                                    : selectedClass
                            }
                        />
                    </div>
                    <HospitalReferralTable
                        hospitalReferralsByGrade={data.hospitalReferralsByGrade}
                    />
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

            {/* Class Filter for school_admin */}
            {isSchoolAdmin && data.availableClasses.length > 0 && (
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
