import type { RiskLevelSummary } from "@/lib/actions/analytics/types";
import type { RiskPieChartDataItem } from "@/components/ui/RiskPieChart";
import { RISK_CHART_LEVELS } from "@/lib/constants/risk-levels";

export function toChartData(
    summary: RiskLevelSummary[],
): RiskPieChartDataItem[] {
    return RISK_CHART_LEVELS.map((level) =>
        summary.find((item) => item.riskLevel === level),
    )
        .filter((item): item is RiskLevelSummary => item !== undefined)
        .map((item) => ({
            name: item.label,
            value: item.count,
            color: item.color,
        }));
}

export function getPieChartTitle(
    selectedClass: string,
    selectedSchoolName: string | undefined,
    userRole?: string,
): string {
    if (selectedClass !== "all") {
        return `ข้อมูลนักเรียน (ห้อง ${selectedClass})`;
    }
    if (selectedSchoolName) {
        return `ข้อมูลนักเรียน (${selectedSchoolName})`;
    }

    // Default title based on role
    switch (userRole) {
        case "system_admin":
            return "ข้อมูลนักเรียน (ทุกโรงเรียน)";
        case "school_admin":
            return "ข้อมูลนักเรียน (ทั้งโรงเรียน)";
        case "class_teacher":
            return "ข้อมูลนักเรียน (ห้องที่ปรึกษา)";
        default:
            return "ข้อมูลนักเรียน";
    }
}
