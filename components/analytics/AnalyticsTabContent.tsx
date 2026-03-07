import { BarChart3, TrendingUp, Target } from "lucide-react";

import { RiskPieChart } from "@/components/ui/RiskPieChart";
import type { RiskPieChartDataItem } from "@/components/ui/RiskPieChart";
import type { Tab } from "@/components/ui/Tabs";
import type { AnalyticsData } from "@/lib/actions/analytics/types";
import { RiskLevelByGradeChart } from "./charts/RiskLevelByGradeChart";
import { RiskLevelTrendChart } from "./charts/RiskLevelTrendChart";
import { ActivitySummaryTable } from "./tables/ActivitySummaryTable";
import { HospitalReferralTable } from "./tables/HospitalReferralTable";
import { PhqSummaryTable } from "./tables/PhqSummaryTable";

interface AnalyticsTabContentProps {
    data: AnalyticsData;
    pieChartData: RiskPieChartDataItem[];
    pieChartTitle: string;
    showAdminTables: boolean;
    userRole?: string;
}

export function buildAnalyticsTabs({
    data,
    pieChartData,
    pieChartTitle,
    showAdminTables,
    userRole,
}: AnalyticsTabContentProps): Tab[] {
    const isClassTeacher = userRole === "class_teacher";

    return [
        {
            id: "summary",
            label: (
                <span className="flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4" /> ภาพรวม
                </span>
            ),
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
                    {showAdminTables ? (
                        <HospitalReferralTable
                            hospitalReferralsByGrade={
                                data.hospitalReferralsByGrade
                            }
                        />
                    ) : null}
                </>
            ),
        },
        {
            id: "trend",
            label: (
                <span className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> กราฟแนวโน้ม
                </span>
            ),
            content: (
                <div className="space-y-6">
                    <RiskLevelTrendChart trendData={data.trendData} />
                    {!isClassTeacher ? (
                        <RiskLevelByGradeChart
                            gradeRiskData={data.gradeRiskData}
                        />
                    ) : null}
                </div>
            ),
        },
        {
            id: "progress",
            label: (
                <span className="flex items-center gap-1.5">
                    <Target className="w-4 h-4" /> การทำกิจกรรม
                </span>
            ),
            content: (
                <ActivitySummaryTable
                    activityProgressByRisk={data.activityProgressByRisk}
                />
            ),
        },
    ];
}
