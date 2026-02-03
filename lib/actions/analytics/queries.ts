import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Raw SQL queries for analytics aggregation
 * Using database-level aggregation for performance
 *
 * IMPORTANT: Column names match Prisma schema (camelCase)
 * - studentId, schoolId, createdAt, riskLevel, referredToHospital, etc.
 */

// Type definitions for raw query results
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

/**
 * Get risk level counts and referrals using database aggregation
 * Replaces: findMany + forEach loops (L169-231 in main.ts)
 */
export async function getRiskLevelCounts(
    schoolId: string,
    classFilter?: string,
): Promise<RiskLevelCountResult[]> {
    const classCondition = classFilter
        ? Prisma.sql`AND s.class = ${classFilter}`
        : Prisma.empty;

    return prisma.$queryRaw<RiskLevelCountResult[]>`
        WITH latest_phq AS (
            SELECT DISTINCT ON (pr."studentId") 
                pr."riskLevel" as risk_level,
                pr."referredToHospital"
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            WHERE s."schoolId" = ${schoolId}
              ${classCondition}
            ORDER BY pr."studentId", pr."createdAt" DESC
        )
        SELECT 
            risk_level,
            COUNT(*)::bigint as count,
            SUM(CASE WHEN "referredToHospital" THEN 1 ELSE 0 END)::bigint as referral_count
        FROM latest_phq
        GROUP BY risk_level
    `;
}

/**
 * Get trend data grouped by academic year, semester, and round
 * Replaces: forEach loop + Map (L256-328 in main.ts)
 */
export async function getTrendData(
    schoolId: string,
    classFilter?: string,
): Promise<TrendDataResult[]> {
    const classCondition = classFilter
        ? Prisma.sql`AND s.class = ${classFilter}`
        : Prisma.empty;

    return prisma.$queryRaw<TrendDataResult[]>`
        WITH latest_per_period AS (
            SELECT DISTINCT ON (pr."studentId", pr."academicYearId", pr."assessmentRound")
                pr."riskLevel" as risk_level,
                ay.year as academic_year,
                ay.semester,
                pr."assessmentRound" as assessment_round
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            JOIN academic_years ay ON pr."academicYearId" = ay.id
            WHERE s."schoolId" = ${schoolId}
              ${classCondition}
            ORDER BY pr."studentId", pr."academicYearId", pr."assessmentRound", pr."createdAt" DESC
        )
        SELECT 
            academic_year,
            semester,
            assessment_round,
            risk_level,
            COUNT(*)::bigint as count
        FROM latest_per_period
        GROUP BY academic_year, semester, assessment_round, risk_level
        ORDER BY academic_year, semester, assessment_round
    `;
}

/**
 * Get risk level distribution by grade
 * Replaces: forEach loop + Map (L409-469 in main.ts)
 */
export async function getGradeRiskData(
    schoolId: string,
    classFilter?: string,
): Promise<GradeRiskResult[]> {
    const classCondition = classFilter
        ? Prisma.sql`AND s.class = ${classFilter}`
        : Prisma.empty;

    return prisma.$queryRaw<GradeRiskResult[]>`
        WITH latest_phq AS (
            SELECT DISTINCT ON (pr."studentId")
                pr."riskLevel" as risk_level,
                SUBSTRING(s.class FROM '^(ม\\.\\d+)') as grade
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            WHERE s."schoolId" = ${schoolId}
              ${classCondition}
            ORDER BY pr."studentId", pr."createdAt" DESC
        )
        SELECT 
            grade,
            risk_level,
            COUNT(*)::bigint as count
        FROM latest_phq
        WHERE grade IS NOT NULL
        GROUP BY grade, risk_level
        ORDER BY grade
    `;
}

/**
 * Get activity progress counts by risk level
 * Replaces: findMany + forEach loop (L335-406 in main.ts)
 */
export async function getActivityProgressByRisk(
    schoolId: string,
    classFilter?: string,
): Promise<ActivityProgressResult[]> {
    const classCondition = classFilter
        ? Prisma.sql`AND s.class = ${classFilter}`
        : Prisma.empty;

    return prisma.$queryRaw<ActivityProgressResult[]>`
        WITH latest_phq AS (
            SELECT DISTINCT ON (pr."studentId")
                pr.id as phq_id,
                pr."studentId",
                pr."riskLevel" as risk_level
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            WHERE s."schoolId" = ${schoolId}
              ${classCondition}
            ORDER BY pr."studentId", pr."createdAt" DESC
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

/**
 * Get hospital referral counts by grade
 * Replaces: forEach loop + Map (L472-504 in main.ts)
 */
export async function getHospitalReferralsByGrade(
    schoolId: string,
    classFilter?: string,
): Promise<HospitalReferralResult[]> {
    const classCondition = classFilter
        ? Prisma.sql`AND s.class = ${classFilter}`
        : Prisma.empty;

    return prisma.$queryRaw<HospitalReferralResult[]>`
        WITH latest_phq AS (
            SELECT DISTINCT ON (pr."studentId")
                pr."referredToHospital",
                SUBSTRING(s.class FROM '^(ม\\.\\d+)') as grade
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            WHERE s."schoolId" = ${schoolId}
              ${classCondition}
            ORDER BY pr."studentId", pr."createdAt" DESC
        )
        SELECT 
            grade,
            COUNT(*)::bigint as referral_count
        FROM latest_phq
        WHERE "referredToHospital" = true AND grade IS NOT NULL
        GROUP BY grade
        ORDER BY grade
    `;
}
