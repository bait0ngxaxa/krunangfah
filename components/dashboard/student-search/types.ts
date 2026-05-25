import type { RiskLevel } from "@/lib/constants/risk-levels";

export type Student = {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    nationalId?: string | null;
    class: string;
    phqResults: Array<{
        totalScore: number;
        riskLevel: string;
    }>;
};

export type RiskConfig = {
    label: string;
    emoji: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
};

export type RiskConfigMap = Record<RiskLevel, RiskConfig>;
