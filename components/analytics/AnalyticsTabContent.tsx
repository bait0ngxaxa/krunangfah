"use client";

import dynamic from "next/dynamic";
import {
    PhqSummaryTable,
    HospitalReferralTable,
    ActivitySummaryTable,
} from "./index";
import type { AnalyticsData } from "@/lib/actions/analytics";
import type { RiskPieChartDataItem } from "@/components/ui/RiskPieChart";
import type { Tab } from "@/components/ui/Tabs";

// Dynamic chart imports (ssr: false to prevent hydration warnings)
const RiskPieChart = dynamic(
    () =>
        import("@/components/ui/RiskPieChart").then((mod) => ({
            default: mod.RiskPieChart,
        })),
    {
        ssr: false,
        loading: () => <ChartLoadingSkeleton />,
    },
);

const RiskLevelTrendChart = dynamic(
    () =>
        import("./charts/RiskLevelTrendChart").then((mod) => ({
            default: mod.RiskLevelTrendChart,
        })),
    {
        ssr: false,
        loading: () => <ChartLoadingSkeleton />,
    },
);

const RiskLevelByGradeChart = dynamic(
    () =>
        import("./charts/RiskLevelByGradeChart").then((mod) => ({
            default: mod.RiskLevelByGradeChart,
        })),
    {
        ssr: false,
        loading: () => <ChartLoadingSkeleton />,
    },
);

function ChartLoadingSkeleton() {
    return (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-pink-100 p-8 flex items-center justify-center min-h-[400px]">
            <div className="animate-pulse text-gray-400">กำลังโหลดกราฟ...</div>
        </div>
    );
}

interface AnalyticsTabContentProps {
    data: AnalyticsData;
    pieChartData: RiskPieChartDataItem[];
    pieChartTitle: string;
    showAdminTables: boolean;
}

export function buildAnalyticsTabs({
    data,
    pieChartData,
    pieChartTitle,
    showAdminTables,
}: AnalyticsTabContentProps): Tab[] {
    return [
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
                    {showAdminTables && (
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
}
