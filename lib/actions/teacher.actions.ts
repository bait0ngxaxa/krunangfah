"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import { getAcademicYears as getAcademicYearsAction } from "./academic-year.actions";
import { teacherProfileSchema } from "@/lib/validations/teacher.validation";
import type {
    CreateTeacherInput,
    TeacherResponse,
    TeacherProfile,
    AcademicYear,
} from "@/types/teacher.types";

export async function getTeacherProfile(
    userId: string,
): Promise<TeacherProfile | null> {
    try {
        const session = await requireAuth();

        // Only allow viewing own profile, or system_admin can view any
        if (
            session.user.role !== "system_admin" &&
            session.user.id !== userId
        ) {
            return null;
        }

        const teacher = await prisma.teacher.findUnique({
            where: { userId },
            include: {
                academicYear: true,
            },
        });
        return teacher;
    } catch (error) {
        console.error("Get teacher profile error:", error);
        return null;
    }
}

/**
 * ดึงรายการปีการศึกษา พร้อม auto-create ถ้าปีปัจจุบันยังไม่มี
 */
export async function getAcademicYears(): Promise<AcademicYear[]> {
    return getAcademicYearsAction();
}

/**
 * Get current teacher's profile with role (for client components)
 * Replaces /api/teacher/profile
 */
export async function getCurrentTeacherProfile() {
    try {
        const session = await requireAuth();
        const userId = session.user.id;

        const teacher = await prisma.teacher.findUnique({
            where: { userId },
            select: {
                advisoryClass: true,
                user: {
                    select: {
                        role: true,
                    },
                },
            },
        });

        if (!teacher) {
            return null;
        }

        return {
            advisoryClass: teacher.advisoryClass,
            user: {
                role: teacher.user.role,
            },
        };
    } catch (error) {
        console.error("Get current teacher profile error:", error);
        return null;
    }
}

export async function createTeacherProfile(
    input: CreateTeacherInput,
): Promise<TeacherResponse> {
    try {
        // Validate input
        const validated = teacherProfileSchema.parse(input);

        const session = await requireAuth();
        const userId = session.user.id;

        // Check if already has teacher profile
        const existing = await prisma.teacher.findUnique({
            where: { userId },
        });

        if (existing) {
            return {
                success: false,
                message: "Teacher profile already exists",
            };
        }

        // Find or create school, update user, create teacher — all in one transaction
        const teacher = await prisma.$transaction(async (tx) => {
            // 1. Find or create school
            let school = await tx.school.findFirst({
                where: {
                    name: {
                        equals: validated.schoolName,
                        mode: "insensitive",
                    },
                },
            });

            if (!school) {
                school = await tx.school.create({
                    data: { name: validated.schoolName },
                });
            }

            // 2. Update User with name and schoolId
            await tx.user.update({
                where: { id: userId },
                data: {
                    name: `${validated.firstName} ${validated.lastName}`,
                    schoolId: school.id,
                },
            });

            // 3. Create teacher profile
            return tx.teacher.create({
                data: {
                    userId,
                    firstName: validated.firstName,
                    lastName: validated.lastName,
                    age: validated.age,
                    advisoryClass: normalizeClassName(validated.advisoryClass),
                    academicYearId: validated.academicYearId,
                    schoolRole: validated.schoolRole,
                    projectRole: validated.projectRole,
                },
                include: {
                    academicYear: true,
                    user: {
                        include: { school: true },
                    },
                },
            });
        });

        // Revalidate dashboard to show updated data
        revalidatePath("/dashboard");
        revalidatePath("/");

        return {
            success: true,
            message: "Teacher profile created",
            teacher: {
                ...teacher,
                school: teacher.user.school ?? undefined,
            },
            newRole: "school_admin",
        };
    } catch (error) {
        console.error("Create teacher profile error:", error);
        return { success: false, message: "Failed to create teacher profile" };
    }
}
