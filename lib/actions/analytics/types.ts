// Analytics-related type definitions

export interface RiskLevelSummary {
    riskLevel: string;
    count: number;
    label: string;
    color: string;
    percentage: number;
    referralCount: number; // จำนวนที่ส่งต่อโรงพยาบาล
}

export interface TrendDataPoint {
    period: string; // "ต้นเทอม/1", "ปลายเทอม/1", etc.
    academicYear: number; // ปีการศึกษา
    semester: number; // 1 or 2
    round: number; // 1 or 2
    blue: number;
    green: number;
    yellow: number;
    orange: number;
    red: number;
}

export interface ActivityProgressByRisk {
    riskLevel: string;
    label: string;
    color: string;
    totalStudents: number;
    noActivity: number; // ยังไม่ทำกิจกรรม
    activity1: number; // กิจกรรม 1
    activity2: number; // กิจกรรม 2
    activity3: number; // กิจกรรม 3
    activity4: number; // กิจกรรม 4
    activity5: number; // กิจกรรม 5
}

export interface ActivityCompletionSummary {
    notStartedStudents: number;
    inProgressStudents: number;
    completedStudents: number;
    requiringActivityStudents: number;
    notRequiringActivityStudents: number;
}

export interface GradeRiskData {
    grade: string; // "ม.5", "ม.6", etc.
    red: number;
    orange: number;
    yellow: number;
    green: number;
    blue: number;
    total: number;
}

export interface HospitalReferralByGrade {
    grade: string; // "ม.5", "ม.6", etc.
    referralCount: number;
}

export interface AcademicTermOption {
    id: string;
    year: number;
    semester: number;
}

/** A class whose planned count is below the students screened in it. */
export interface CoverageCountMismatch {
    className: string;
    expected: number;
    assessed: number;
}

export interface AnalyticsData {
    totalStudents: number | null;
    riskLevelSummary: RiskLevelSummary[];
    studentsWithAssessment: number;
    studentsWithoutAssessment: number | null;
    screeningCoveragePercent: number | null;
    /** Single term only; sorted by `assessed - expected`, largest first. */
    coverageCountMismatches: CoverageCountMismatch[];
    /** Screened students above their class's planned count, so outside coverage. */
    coverageUncountedStudents: number;
    selectedAcademicTermExists: boolean;
    availableClasses: string[];
    availableAcademicTerms: AcademicTermOption[];
    availableRounds: number[];
    currentClass?: string;
    currentAcademicYear?: number;
    currentSemester?: number;
    currentRound?: number;
    trendData: TrendDataPoint[];
    activityAnalyticsApplicable: boolean;
    activityAnalyticsRound: 1 | null;
    activityProgressByRisk: ActivityProgressByRisk[] | null;
    activityCompletionSummary: ActivityCompletionSummary | null;
    gradeRiskData: GradeRiskData[];
    hospitalReferralsByGrade: HospitalReferralByGrade[];
    totalReferrals: number;
    /**
     * A single past term in scope has results imported before the class
     * snapshot existed, so they are reported under the current class.
     */
    legacyClassAttribution: boolean;
}

export interface SystemAnalyticsOverview {
    totalSchools: number;
    totalStudents: number;
    studentsWithAssessment: number;
    screeningCoveragePercent: number;
    academicYearLabel: string;
    availableAcademicTerms: AcademicTermOption[];
    currentAcademicYear?: number;
    currentSemester?: number;
}
