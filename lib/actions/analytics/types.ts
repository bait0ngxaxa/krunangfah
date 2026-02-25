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

export interface AnalyticsData {
    totalStudents: number;
    riskLevelSummary: RiskLevelSummary[];
    studentsWithAssessment: number;
    studentsWithoutAssessment: number;
    availableClasses: string[];
    availableAcademicYears: number[];
    currentClass?: string;
    currentAcademicYear?: number;
    trendData: TrendDataPoint[];
    activityProgressByRisk: ActivityProgressByRisk[];
    gradeRiskData: GradeRiskData[];
    hospitalReferralsByGrade: HospitalReferralByGrade[];
    totalReferrals: number;
}
