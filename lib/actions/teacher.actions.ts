"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import { getAcademicYears as getAcademicYearsAction } from "./academic-year.actions";
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

export async function createTeacherProfile(
    input: CreateTeacherInput,
): Promise<TeacherResponse> {
    try {
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

        // Find or create school
        let school = await prisma.school.findFirst({
            where: {
                name: {
                    equals: input.schoolName,
                    mode: "insensitive",
                },
            },
        });

        if (!school) {
            school = await prisma.school.create({
                data: { name: input.schoolName },
            });
        }

        // Update User with name and schoolId
        await prisma.user.update({
            where: { id: userId },
            data: {
                name: `${input.firstName} ${input.lastName}`,
                schoolId: school.id,
            },
        });

        // Create teacher profile (role ได้จาก signup แล้ว)
        const teacher = await prisma.teacher.create({
            data: {
                userId,
                firstName: input.firstName,
                lastName: input.lastName,
                age: input.age,
                advisoryClass: normalizeClassName(input.advisoryClass),
                academicYearId: input.academicYearId,
                schoolId: school.id,
                schoolRole: input.schoolRole,
                projectRole: input.projectRole,
            },
            include: {
                academicYear: true,
                school: true,
            },
        });

        // Revalidate dashboard to show updated data
        revalidatePath("/dashboard");
        revalidatePath("/");

        return {
            success: true,
            message: "Teacher profile created",
            teacher,
            newRole: "school_admin",
        };
    } catch (error) {
        console.error("Create teacher profile error:", error);
        return { success: false, message: "Failed to create teacher profile" };
    }
}
