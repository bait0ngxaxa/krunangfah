import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ========================================
// Type Definitions
// ========================================

interface RiskLevelCountResult {
    risk_level: string;
    count: bigint;
    referral_count: bigint;
}

interface TrendDataResult {
    academic_year: number;
    semester: number;
    assessment_round: number;
    risk_level: string;
    count: bigint;
}

interface GradeRiskResult {
    grade: string;
    risk_level: string;
    count: bigint;
}

interface ActivityProgressResult {
    risk_level: string;
    total_students: bigint;
    activity1: bigint;
    activity2: bigint;
    activity3: bigint;
    activity4: bigint;
    activity5: bigint;
}

interface HospitalReferralResult {
    grade: string;
    referral_count: bigint;
}

/** Combined result from single optimized query */
export interface CombinedAnalyticsResult {
    riskLevelCounts: RiskLevelCountResult[];
    gradeRiskData: GradeRiskResult[];
    hospitalReferrals: HospitalReferralResult[];
}

// ========================================
// Optimized Combined Query (Single Scan)
// ========================================

/**
 * Get risk counts, grade distribution, and hospital referrals in ONE query
 * Uses ROW_NUMBER() instead of DISTINCT ON for better performance
 *
 * Replaces: getRiskLevelCounts + getGradeRiskData + getHospitalReferralsByGrade
 */
export async function getCombinedAnalytics(
    schoolId: string | undefined,
    classFilter?: string,
    academicYear?: number,
): Promise<CombinedAnalyticsResult> {
    const schoolCondition = schoolId
        ? Prisma.sql`WHERE s."schoolId" = ${schoolId}`
        : Prisma.sql`WHERE 1=1`;

    const classCondition = classFilter
        ? Prisma.sql`AND s.class = ${classFilter}`
        : Prisma.empty;

    const yearJoin = academicYear
        ? Prisma.sql`JOIN academic_years ay ON pr."academicYearId" = ay.id`
        : Prisma.empty;

    const yearCondition = academicYear
        ? Prisma.sql`AND ay.year = ${academicYear}`
        : Prisma.empty;

    // Single query that computes everything from one table scan
    const result = await prisma.$queryRaw<
        Array<{
            risk_level: string;
            grade: string | null;
            referred_to_hospital: boolean;
            student_count: bigint;
        }>
    >`
        WITH ranked_phq AS (
            SELECT
                pr."studentId",
                pr."riskLevel",
                pr."referredToHospital",
                SPLIT_PART(s.class, '/', 1) as grade,
                ROW_NUMBER() OVER (
                    PARTITION BY pr."studentId"
                    ORDER BY pr."createdAt" DESC
                ) as rn
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            ${yearJoin}
            ${schoolCondition}
              ${classCondition}
              ${yearCondition}
        ),
        latest_phq AS (
            SELECT "studentId", "riskLevel", "referredToHospital", grade
            FROM ranked_phq
            WHERE rn = 1
        )
        SELECT
            "riskLevel"::text as risk_level,
            grade,
            "referredToHospital" as referred_to_hospital,
            COUNT(*)::bigint as student_count
        FROM latest_phq
        GROUP BY "riskLevel", grade, "referredToHospital"
    `;

    // Transform single result into 3 aggregations (in JS, very fast)
    const riskMap = new Map<string, { count: number; referralCount: number }>();
    const gradeRiskMap = new Map<string, Map<string, number>>();
    const hospitalMap = new Map<string, number>();

    for (const row of result) {
        const count = Number(row.student_count);
        const riskLevel = row.risk_level;
        const grade = row.grade;
        const referred = row.referred_to_hospital;

        // Risk level counts
        const existing = riskMap.get(riskLevel) || {
            count: 0,
            referralCount: 0,
        };
        existing.count += count;
        if (referred) existing.referralCount += count;
        riskMap.set(riskLevel, existing);

        // Grade risk data
        if (grade) {
            if (!gradeRiskMap.has(grade)) gradeRiskMap.set(grade, new Map());
            const gradeData =
                gradeRiskMap.get(grade) || new Map<string, number>();
            gradeData.set(riskLevel, (gradeData.get(riskLevel) || 0) + count);
        }

        // Hospital referrals by grade
        if (referred && grade) {
            hospitalMap.set(grade, (hospitalMap.get(grade) || 0) + count);
        }
    }

    // Convert to expected formats
    const riskLevelCounts: RiskLevelCountResult[] = Array.from(
        riskMap.entries(),
    ).map(([risk_level, data]) => ({
        risk_level,
        count: BigInt(data.count),
        referral_count: BigInt(data.referralCount),
    }));

    const gradeRiskData: GradeRiskResult[] = [];
    for (const [grade, riskData] of gradeRiskMap.entries()) {
        for (const [risk_level, count] of riskData.entries()) {
            gradeRiskData.push({ grade, risk_level, count: BigInt(count) });
        }
    }
    gradeRiskData.sort((a, b) => a.grade.localeCompare(b.grade));

    const hospitalReferrals: HospitalReferralResult[] = Array.from(
        hospitalMap.entries(),
    )
        .map(([grade, count]) => ({ grade, referral_count: BigInt(count) }))
        .sort((a, b) => a.grade.localeCompare(b.grade));

    return { riskLevelCounts, gradeRiskData, hospitalReferrals };
}

// ========================================
// Trend Data (Separate - Different Pattern)
// ========================================

/**
 * Get trend data grouped by academic year, semester, and round
 * Uses ROW_NUMBER for better performance
 */
export async function getTrendData(
    schoolId: string | undefined,
    classFilter?: string,
    academicYear?: number,
): Promise<TrendDataResult[]> {
    const schoolCondition = schoolId
        ? Prisma.sql`WHERE s."schoolId" = ${schoolId}`
        : Prisma.sql`WHERE 1=1`;

    const classCondition = classFilter
        ? Prisma.sql`AND s.class = ${classFilter}`
        : Prisma.empty;

    const yearCondition = academicYear
        ? Prisma.sql`AND ay.year = ${academicYear}`
        : Prisma.empty;

    return prisma.$queryRaw<TrendDataResult[]>`
        WITH ranked_per_period AS (
            SELECT
                pr."riskLevel" as risk_level,
                ay.year as academic_year,
                ay.semester,
                pr."assessmentRound" as assessment_round,
                ROW_NUMBER() OVER (
                    PARTITION BY pr."studentId", pr."academicYearId", pr."assessmentRound"
                    ORDER BY pr."createdAt" DESC
                ) as rn
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            JOIN academic_years ay ON pr."academicYearId" = ay.id
            ${schoolCondition}
              ${classCondition}
              ${yearCondition}
        )
        SELECT
            academic_year,
            semester,
            assessment_round,
            risk_level,
            COUNT(*)::bigint as count
        FROM ranked_per_period
        WHERE rn = 1
        GROUP BY academic_year, semester, assessment_round, risk_level
        ORDER BY academic_year, semester, assessment_round
    `;
}

// ========================================
// Activity Progress (Separate - Joins activity_progress)
// ========================================

/**
 * Get activity progress counts by risk level
 * Uses ROW_NUMBER for better performance
 */
export async function getActivityProgressByRisk(
    schoolId: string | undefined,
    classFilter?: string,
    academicYear?: number,
): Promise<ActivityProgressResult[]> {
    const schoolCondition = schoolId
        ? Prisma.sql`WHERE s."schoolId" = ${schoolId}`
        : Prisma.sql`WHERE 1=1`;

    const classCondition = classFilter
        ? Prisma.sql`AND s.class = ${classFilter}`
        : Prisma.empty;

    const yearJoin = academicYear
        ? Prisma.sql`JOIN academic_years ay ON pr."academicYearId" = ay.id`
        : Prisma.empty;

    const yearCondition = academicYear
        ? Prisma.sql`AND ay.year = ${academicYear}`
        : Prisma.empty;

    return prisma.$queryRaw<ActivityProgressResult[]>`
        WITH ranked_phq AS (
            SELECT
                pr.id as phq_id,
                pr."studentId",
                pr."riskLevel" as risk_level,
                ROW_NUMBER() OVER (
                    PARTITION BY pr."studentId"
                    ORDER BY pr."createdAt" DESC
                ) as rn
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            ${yearJoin}
            ${schoolCondition}
              ${classCondition}
              ${yearCondition}
        ),
        latest_phq AS (
            SELECT phq_id, "studentId", risk_level
            FROM ranked_phq
            WHERE rn = 1
        ),
        activity_counts AS (
            SELECT
                lp.risk_level,
                ap."activityNumber",
                COUNT(DISTINCT ap."studentId")::bigint as completed_count
            FROM latest_phq lp
            JOIN activity_progress ap ON ap."phqResultId" = lp.phq_id
            WHERE ap.status = 'completed'
            GROUP BY lp.risk_level, ap."activityNumber"
        )
        SELECT
            lp.risk_level,
            COUNT(DISTINCT lp."studentId")::bigint as total_students,
            COALESCE(MAX(CASE WHEN ac."activityNumber" = 1 THEN ac.completed_count END), 0)::bigint as activity1,
            COALESCE(MAX(CASE WHEN ac."activityNumber" = 2 THEN ac.completed_count END), 0)::bigint as activity2,
            COALESCE(MAX(CASE WHEN ac."activityNumber" = 3 THEN ac.completed_count END), 0)::bigint as activity3,
            COALESCE(MAX(CASE WHEN ac."activityNumber" = 4 THEN ac.completed_count END), 0)::bigint as activity4,
            COALESCE(MAX(CASE WHEN ac."activityNumber" = 5 THEN ac.completed_count END), 0)::bigint as activity5
        FROM latest_phq lp
        LEFT JOIN activity_counts ac ON ac.risk_level = lp.risk_level
        GROUP BY lp.risk_level
    `;
}
