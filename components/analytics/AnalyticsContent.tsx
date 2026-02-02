"use client";

import { useState, useTransition } from "react";
import { ClassFilter } from "./ClassFilter";
import { PhqSummaryTable } from "./PhqSummaryTable";
import { RiskLevelPieChart } from "./RiskLevelPieChart";
import { RiskLevelTrendChart } from "./RiskLevelTrendChart";
import { RiskLevelByGradeChart } from "./RiskLevelByGradeChart";
import { HospitalReferralTable } from "./HospitalReferralTable";
import { ActivityProgressTable } from "./ActivityProgressTable";
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
    const [isPending, startTransition] = useTransition();

    const handleClassChange = (classValue: string) => {
        const filterValue = classValue === "all" ? undefined : classValue;

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
                <ActivityProgressTable
                    activityProgressByRisk={data.activityProgressByRisk}
                />
            ),
        },
    ];

    return (
        <>
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
                                {data.currentClass && ` (${data.currentClass})`}
                            </p>
                            <p className="text-3xl font-bold text-blue-600">
                                {data.totalStudents}
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
                            <p className="text-sm text-gray-600">คัดกรองแล้ว</p>
                            <p className="text-3xl font-bold text-green-600">
                                {data.studentsWithAssessment}
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
                                {data.studentsWithoutAssessment}
                            </p>
                            <p className="text-xs text-gray-500">คน</p>
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

            {/* Loading overlay */}
            {isPending && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600" />
                            <p className="text-gray-700 font-medium">
                                กำลังโหลดข้อมูล...
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <Tabs tabs={tabs} defaultTab="summary" />
        </>
    );
}
