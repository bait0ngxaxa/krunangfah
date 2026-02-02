// Analytics actions - Re-exports for backward compatibility

// Re-export types
export type {
    RiskLevelSummary,
    TrendDataPoint,
    ActivityProgressByRisk,
    GradeRiskData,
    HospitalReferralByGrade,
    AnalyticsData,
} from "./types";

// Re-export constants
export { RISK_LEVEL_CONFIG } from "./constants";

// Re-export main functions
export { getAnalyticsSummary, getRiskLevelConfig } from "./main";
