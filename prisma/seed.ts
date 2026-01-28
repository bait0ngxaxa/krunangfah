import { PrismaClient } from "@prisma/client";
import {
    getCurrentAcademicYear,
    generateAcademicYearData,
} from "../lib/utils/academic-year";

const prisma = new PrismaClient();

async function main() {
    console.warn("🌱 Starting seed...");

    // คำนวณปีการศึกษาปัจจุบันจากวันที่จริง
    const current = getCurrentAcademicYear();
    console.warn(
        `📅 Current academic year: ${current.semester}/${current.year}`,
    );

    // สร้างข้อมูลปีการศึกษาปัจจุบัน (ทั้ง 2 เทอม)
    const academicYearData = generateAcademicYearData(current.year);

    // Create Academic Years
    for (const yearData of academicYearData) {
        await prisma.academicYear.upsert({
            where: {
                year_semester: {
                    year: yearData.year,
                    semester: yearData.semester,
                },
            },
            update: {
                startDate: yearData.startDate,
                endDate: yearData.endDate,
                isCurrent:
                    yearData.semester === current.semester &&
                    yearData.year === current.year,
            },
            create: {
                year: yearData.year,
                semester: yearData.semester,
                startDate: yearData.startDate,
                endDate: yearData.endDate,
                isCurrent:
                    yearData.semester === current.semester &&
                    yearData.year === current.year,
            },
        });
    }

    console.warn(`✅ Created/Updated academic years for ${current.year}`);
    console.warn("✨ Seed completed!");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
