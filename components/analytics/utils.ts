import type { RiskLevelSummary } from "@/lib/actions/analytics";
import type { RiskPieChartDataItem } from "@/components/ui/RiskPieChart";

const RISK_LEVEL_ORDER: Record<string, number> = {
    blue: 0,
    green: 1,
    yellow: 2,
    orange: 3,
    red: 4,
};

export function toChartData(
    summary: RiskLevelSummary[],
): RiskPieChartDataItem[] {
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

export function getPieChartTitle(
    selectedClass: string,
    selectedSchoolName: string | undefined,
): string {
    if (selectedClass !== "all") {
        return `ข้อมูลนักเรียน (ห้อง ${selectedClass})`;
    }
    if (selectedSchoolName) {
        return `ข้อมูลนักเรียน (${selectedSchoolName})`;
    }
    return "ข้อมูลนักเรียน (ทุกโรงเรียน)";
}
