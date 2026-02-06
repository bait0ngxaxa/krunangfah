/**
 * Performance Test Script for Analytics Queries
 *
 * ใช้ทดสอบ performance ของ analytics queries กับข้อมูลจำนวนมาก
 *
 * Usage:
 *   npx ts-node scripts/test-analytics-performance.ts
 *
 * Options:
 *   --seed      : Seed test data first (100k PHQ results)
 *   --cleanup   : Remove test data after testing
 *   --rows=N    : Number of rows to seed (default: 100000)
 */

import { PrismaClient, type RiskLevel } from "@prisma/client";

const prisma = new PrismaClient();

// Configuration
const TEST_SCHOOL_ID = "perf_test_school";
const DEFAULT_ROWS = 100_000;

// Parse command line arguments
const args = process.argv.slice(2);
const shouldSeed = args.includes("--seed");
const shouldCleanup = args.includes("--cleanup");
const rowsArg = args.find((a) => a.startsWith("--rows="));
const targetRows = rowsArg ? parseInt(rowsArg.split("=")[1]) : DEFAULT_ROWS;

// Helper functions
function randomRiskLevel(): RiskLevel {
    const levels: RiskLevel[] = ["blue", "green", "yellow", "orange", "red"];
    // Weighted distribution: more blue/green, less red
    const weights = [0.4, 0.3, 0.15, 0.1, 0.05];
    const rand = Math.random();
    let cumulative = 0;
    for (let i = 0; i < levels.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) return levels[i];
    }
    return "blue";
}

function randomClass(): string {
    const grades = [1, 2, 3, 4, 5, 6];
    const sections = [1, 2, 3, 4, 5];
    const grade = grades[Math.floor(Math.random() * grades.length)];
    const section = sections[Math.floor(Math.random() * sections.length)];
    return `ม.${grade}/${section}`;
}

function randomScore(): number {
    return Math.floor(Math.random() * 4); // 0-3
}

async function seedTestData(numRows: number) {
    console.log(`\n🌱 Seeding ${numRows.toLocaleString()} test records...`);
    const startTime = Date.now();

    // Create test school
    const school = await prisma.school.upsert({
        where: { id: TEST_SCHOOL_ID },
        update: {},
        create: {
            id: TEST_SCHOOL_ID,
            name: "Performance Test School",
            province: "Bangkok",
        },
    });

    // Create or find academic years (global, not per-school)
    const academicYears = await Promise.all([
        prisma.academicYear.upsert({
            where: { year_semester: { year: 2567, semester: 1 } },
            update: {},
            create: {
                year: 2567,
                semester: 1,
                startDate: new Date("2024-05-01"),
                endDate: new Date("2024-09-30"),
                isCurrent: false,
            },
        }),
        prisma.academicYear.upsert({
            where: { year_semester: { year: 2567, semester: 2 } },
            update: {},
            create: {
                year: 2567,
                semester: 2,
                startDate: new Date("2024-10-01"),
                endDate: new Date("2025-03-31"),
                isCurrent: true,
            },
        }),
    ]);

    // Create test user (teacher)
    const teacher = await prisma.user.upsert({
        where: { email: "perf_test_teacher@test.com" },
        update: {},
        create: {
            email: "perf_test_teacher@test.com",
            name: "Performance Test Teacher",
            role: "class_teacher",
            schoolId: school.id,
        },
    });

    // Calculate how many students we need
    // Each student will have ~2 PHQ results on average
    const numStudents = Math.ceil(numRows / 2);
    console.log(`   Creating ${numStudents.toLocaleString()} test students...`);

    // Batch insert students
    const batchSize = 1000;
    const studentIds: string[] = [];

    for (let i = 0; i < numStudents; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, numStudents); j++) {
            const studentId = `perf_test_student_${j}`;
            studentIds.push(studentId);
            batch.push({
                id: studentId,
                studentId: `S${j.toString().padStart(6, "0")}`,
                firstName: `TestFirst${j}`,
                lastName: `TestLast${j}`,
                class: randomClass(),
                schoolId: school.id,
            });
        }
        await prisma.student.createMany({
            data: batch,
            skipDuplicates: true,
        });

        if ((i + batchSize) % 10000 === 0) {
            console.log(
                `   ... ${Math.min(i + batchSize, numStudents).toLocaleString()} students created`,
            );
        }
    }

    console.log(`   Creating ${numRows.toLocaleString()} PHQ results...`);

    // Batch insert PHQ results
    let phqCount = 0;
    for (let i = 0; i < numRows; i += batchSize) {
        const batch = [];
        for (let j = i; j < Math.min(i + batchSize, numRows); j++) {
            const studentIndex = j % numStudents;
            const academicYear = academicYears[j % 2 === 0 ? 0 : 1];
            const round = (Math.floor(j / numStudents) % 2) + 1;

            const q1 = randomScore();
            const q2 = randomScore();
            const q3 = randomScore();
            const q4 = randomScore();
            const q5 = randomScore();
            const q6 = randomScore();
            const q7 = randomScore();
            const q8 = randomScore();
            const q9 = randomScore();
            const totalScore = q1 + q2 + q3 + q4 + q5 + q6 + q7 + q8 + q9;

            batch.push({
                id: `perf_test_phq_${j}`,
                studentId: studentIds[studentIndex],
                academicYearId: academicYear.id,
                importedById: teacher.id,
                assessmentRound: round,
                q1,
                q2,
                q3,
                q4,
                q5,
                q6,
                q7,
                q8,
                q9,
                q9a: Math.random() < 0.05,
                q9b: Math.random() < 0.02,
                totalScore,
                riskLevel: randomRiskLevel(),
                referredToHospital: Math.random() < 0.03,
                createdAt: new Date(
                    Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000,
                ),
            });
        }

        try {
            await prisma.phqResult.createMany({
                data: batch,
                skipDuplicates: true,
            });
            phqCount += batch.length;
        } catch {
            // Handle unique constraint violations by inserting one by one
            for (const item of batch) {
                try {
                    await prisma.phqResult.create({ data: item });
                    phqCount++;
                } catch {
                    // Skip duplicates
                }
            }
        }

        if ((i + batchSize) % 10000 === 0) {
            console.log(
                `   ... ${Math.min(i + batchSize, numRows).toLocaleString()} PHQ results created`,
            );
        }
    }

    const seedTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Seeding completed in ${seedTime.toFixed(2)}s`);
    console.log(`   - Students: ${numStudents.toLocaleString()}`);
    console.log(`   - PHQ Results: ${phqCount.toLocaleString()}`);

    return { numStudents, numPhqResults: phqCount };
}

async function cleanupTestData() {
    console.log("\n🧹 Cleaning up test data...");
    const startTime = Date.now();

    // Delete in order to respect foreign key constraints
    await prisma.activityProgress.deleteMany({
        where: { student: { schoolId: TEST_SCHOOL_ID } },
    });
    await prisma.phqResult.deleteMany({
        where: { student: { schoolId: TEST_SCHOOL_ID } },
    });
    await prisma.student.deleteMany({
        where: { schoolId: TEST_SCHOOL_ID },
    });
    await prisma.user.deleteMany({
        where: { email: "perf_test_teacher@test.com" },
    });
    await prisma.school.deleteMany({
        where: { id: TEST_SCHOOL_ID },
    });

    const cleanupTime = (Date.now() - startTime) / 1000;
    console.log(`✅ Cleanup completed in ${cleanupTime.toFixed(2)}s`);
}

async function runPerformanceTests() {
    console.log("\n⚡ Running Performance Tests...\n");

    // Count existing data
    const phqCount = await prisma.phqResult.count({
        where: { student: { schoolId: TEST_SCHOOL_ID } },
    });

    if (phqCount === 0) {
        console.log("❌ No test data found. Run with --seed first.");
        return;
    }

    console.log(`📊 Testing with ${phqCount.toLocaleString()} PHQ results\n`);

    const results: { name: string; time: number; rows: number }[] = [];

    // Test 1: Combined Analytics (NEW - replaces 3 queries)
    console.log("1️⃣  Testing getCombinedAnalytics (risk + grade + hospital)...");
    let start = Date.now();
    const combinedResult = await prisma.$queryRaw<
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
                SUBSTRING(s.class FROM '^(ม\\.\\d+)') as grade,
                ROW_NUMBER() OVER (
                    PARTITION BY pr."studentId"
                    ORDER BY pr."createdAt" DESC
                ) as rn
            FROM phq_results pr
            JOIN students s ON pr."studentId" = s.id
            WHERE s."schoolId" = ${TEST_SCHOOL_ID}
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
    results.push({
        name: "getCombinedAnalytics",
        time: Date.now() - start,
        rows: combinedResult.length,
    });

    // Test 2: Trend Data (uses ROW_NUMBER)
    console.log("2️⃣  Testing getTrendData...");
    start = Date.now();
    const trendData = await prisma.$queryRaw`
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
            WHERE s."schoolId" = ${TEST_SCHOOL_ID}
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
    results.push({
        name: "getTrendData",
        time: Date.now() - start,
        rows: (trendData as unknown[]).length,
    });

    // Test 3: Activity Progress (uses ROW_NUMBER)
    console.log("3️⃣  Testing getActivityProgressByRisk...");
    start = Date.now();
    const activityProgress = await prisma.$queryRaw`
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
            WHERE s."schoolId" = ${TEST_SCHOOL_ID}
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
    results.push({
        name: "getActivityProgressByRisk",
        time: Date.now() - start,
        rows: (activityProgress as unknown[]).length,
    });

    // Print results
    console.log("\n" + "=".repeat(60));
    console.log("📈 PERFORMANCE RESULTS (Optimized Queries)");
    console.log("=".repeat(60));
    console.log(`\nDataset: ${phqCount.toLocaleString()} PHQ results`);
    console.log("Strategy: ROW_NUMBER() + Combined Query\n");
    console.log(
        "Query".padEnd(35) + "Time (ms)".padStart(12) + "Rows".padStart(10),
    );
    console.log("-".repeat(57));

    let totalTime = 0;
    for (const r of results) {
        console.log(
            r.name.padEnd(35) +
                r.time.toString().padStart(12) +
                r.rows.toString().padStart(10),
        );
        totalTime += r.time;
    }

    console.log("-".repeat(57));
    console.log("TOTAL".padEnd(35) + totalTime.toString().padStart(12) + "ms");
    console.log("=".repeat(60));

    // Performance grade
    console.log("\n📊 Performance Grade:");
    if (totalTime < 500) {
        console.log("   ⭐⭐⭐⭐⭐ EXCELLENT! (< 500ms)");
    } else if (totalTime < 1000) {
        console.log("   ⭐⭐⭐⭐ GREAT! (< 1s)");
    } else if (totalTime < 3000) {
        console.log("   ⭐⭐⭐ GOOD (< 3s)");
    } else if (totalTime < 5000) {
        console.log("   ⭐⭐ ACCEPTABLE (< 5s)");
    } else {
        console.log("   ⭐ NEEDS OPTIMIZATION (> 5s)");
    }
}

async function main() {
    console.log(
        "╔════════════════════════════════════════════════════════════╗",
    );
    console.log(
        "║     Analytics Performance Test                              ║",
    );
    console.log(
        "╚════════════════════════════════════════════════════════════╝",
    );

    try {
        if (shouldSeed) {
            await seedTestData(targetRows);
        }

        await runPerformanceTests();

        if (shouldCleanup) {
            await cleanupTestData();
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
