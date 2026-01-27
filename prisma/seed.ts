import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Starting seed...");

    // Create Academic Years
    const academicYears = await prisma.academicYear.createMany({
        data: [
            {
                year: 2569,
                semester: 1,
                startDate: new Date("2026-05-15"),
                endDate: new Date("2026-10-15"),
                isCurrent: true, // เทอมปัจจุบัน
            },
            {
                year: 2569,
                semester: 2,
                startDate: new Date("2026-11-01"),
                endDate: new Date("2027-03-31"),
                isCurrent: false,
            },
        ],
        skipDuplicates: true,
    });

    console.log(`✅ Created ${academicYears.count} academic years`);
    console.log("✨ Seed completed!");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
