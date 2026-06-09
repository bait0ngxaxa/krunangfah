import type {
    GradeRiskData,
    RiskLevelSummary,
    TrendDataPoint,
} from "@/lib/actions/analytics/types";
import type { RiskPieChartDataItem } from "@/components/ui/RiskPieChart";
import { RISK_CHART_LEVELS } from "@/lib/constants/risk-levels";

export function toSafeCount(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }
    return Math.floor(value);
}

function toSafeAcademicYear(value: number): number {
    if (!Number.isSafeInteger(value) || value < 0 || value > 9999) {
        return 0;
    }
    return value;
}

function toSafeTermPart(value: number, fallback: number): number {
    if (!Number.isSafeInteger(value) || value < 1) {
        return fallback;
    }
    return value;
}

export function toChartData(
    summary: RiskLevelSummary[],
): RiskPieChartDataItem[] {
    return RISK_CHART_LEVELS.map((level) =>
        summary.find((item) => item.riskLevel === level),
    )
        .filter((item): item is RiskLevelSummary => item !== undefined)
        .map((item) => ({
            name: item.label,
            value: toSafeCount(item.count),
            color: item.color,
        }));
}

export function normalizeTrendData(
    trendData: TrendDataPoint[],
): TrendDataPoint[] {
    return trendData.map((item) => ({
        period: item.period,
        academicYear: toSafeAcademicYear(item.academicYear),
        semester: toSafeTermPart(item.semester, 1),
        round: toSafeTermPart(item.round, 1),
        blue: toSafeCount(item.blue),
        green: toSafeCount(item.green),
        yellow: toSafeCount(item.yellow),
        orange: toSafeCount(item.orange),
        red: toSafeCount(item.red),
    }));
}

export function normalizeGradeRiskData(
    gradeRiskData: GradeRiskData[],
): GradeRiskData[] {
    return gradeRiskData.map((item) => {
        const red = toSafeCount(item.red);
        const orange = toSafeCount(item.orange);
        const yellow = toSafeCount(item.yellow);
        const green = toSafeCount(item.green);
        const blue = toSafeCount(item.blue);

        return {
            grade: item.grade,
            red,
            orange,
            yellow,
            green,
            blue,
            total: red + orange + yellow + green + blue,
        };
    });
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
