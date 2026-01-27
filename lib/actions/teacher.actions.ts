"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
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

export async function getAcademicYears(): Promise<AcademicYear[]> {
    try {
        const academicYears = await prisma.academicYear.findMany({
            orderBy: [{ year: "desc" }, { semester: "desc" }],
        });
        return academicYears;
    } catch (error) {
        console.error("Get academic years error:", error);
        return [];
    }
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

        // Get user's schoolId
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { schoolId: true },
        });

        if (!user?.schoolId) {
            return {
                success: false,
                message: "User does not have a school assigned",
            };
        }

        // Create teacher profile (role ได้จาก signup แล้ว)
        const teacher = await prisma.teacher.create({
            data: {
                userId,
                firstName: input.firstName,
                lastName: input.lastName,
                age: input.age,
                advisoryClass: input.advisoryClass,
                academicYearId: input.academicYearId,
                schoolId: user.schoolId,
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
