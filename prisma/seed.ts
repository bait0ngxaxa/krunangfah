import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { getCurrentAcademicYear } from "../lib/utils/academic-year";

const prisma = new PrismaClient();

/**
 * Seed system_admin คนแรกจาก ADMIN_EMAIL + ADMIN_PASSWORD ใน .env
 * Idempotent — รันซ้ำได้ไม่พัง
 */
async function seedSystemAdmin(): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
        console.warn(
            "⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not set — skipping system admin seed",
        );
        return;
    }

    const normalizedEmail = adminEmail.toLowerCase().trim();
    const hashedPassword = await hash(adminPassword, 12);

    // Upsert User — สร้างใหม่ถ้ายังไม่มี, อัปเดต role ถ้ามีแล้ว
    await prisma.user.upsert({
        where: { email: normalizedEmail },
        update: {
            role: "system_admin",
            password: hashedPassword,
        },
        create: {
            email: normalizedEmail,
            password: hashedPassword,
            role: "system_admin",
            isPrimary: false,
        },
    });

    // Upsert SystemAdminWhitelist
    await prisma.systemAdminWhitelist.upsert({
        where: { email: normalizedEmail },
        update: { isActive: true },
        create: { email: normalizedEmail },
    });

    console.warn(`✅ System admin seeded: ${normalizedEmail}`);
}

async function main(): Promise<void> {
    console.warn("🌱 Starting seed...");

    // Seed system admin
    await seedSystemAdmin();

    // คำนวณปีการศึกษาปัจจุบันจากวันที่จริง
    const current = getCurrentAcademicYear();
    console.warn(
        `📅 Current academic year: ${current.semester}/${current.year}`,
    );

    // สร้างเฉพาะปีการศึกษา/เทอมปัจจุบัน ไม่สร้างเทอมถัดไปล่วงหน้า
    await prisma.academicYear.updateMany({
        where: {
            isCurrent: true,
            NOT: {
                year: current.year,
                semester: current.semester,
            },
        },
        data: { isCurrent: false },
    });

    await prisma.academicYear.upsert({
        where: {
            year_semester: {
                year: current.year,
                semester: current.semester,
            },
        },
        update: {
            startDate: current.startDate,
            endDate: current.endDate,
            isCurrent: true,
        },
        create: {
            year: current.year,
            semester: current.semester,
            startDate: current.startDate,
            endDate: current.endDate,
            isCurrent: true,
        },
    });

    console.warn(
        `✅ Created/Updated current academic year: ${current.semester}/${current.year}`,
    );
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
