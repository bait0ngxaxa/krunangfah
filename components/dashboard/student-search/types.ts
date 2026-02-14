import type { RiskLevel } from "@/lib/utils/phq-scoring";

export type Student = {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
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
