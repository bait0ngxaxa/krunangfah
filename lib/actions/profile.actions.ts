/**
 * Server Actions for User Profile Settings
 * Functions for fetching and updating teacher profile data
 */

"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { profileUpdateSchema } from "@/lib/validations/profile.validation";
import { normalizeClassName } from "@/lib/utils/class-normalizer";
import type {
    ProfileUpdateInput,
    ProfileUpdateResponse,
    UserProfileData,
} from "@/types/profile.types";

/**
 * Get current user profile data
 * @returns User profile data or null if not found
 */
export async function getCurrentUserProfile(): Promise<UserProfileData | null> {
    try {
        const session = await requireAuth();

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                teacher: {
                    select: {
                        firstName: true,
                        lastName: true,
                        age: true,
                        advisoryClass: true,
                        academicYearId: true,
                        schoolRole: true,
                        projectRole: true,
                    },
                },
                school: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!user || !user.teacher) {
            return null;
        }

        return {
            userId: user.id,
            email: user.email,
            name: user.name,
            teacher: user.teacher,
            school: user.school,
        };
    } catch (error) {
        console.error("Get user profile error:", error);
        return null;
    }
}

/**
 * Update teacher profile data
 * Updates both Teacher and User models atomically
 * @param input - Profile update data
 * @returns Response with success status and message
 */
export async function updateTeacherProfile(
    input: ProfileUpdateInput,
): Promise<ProfileUpdateResponse> {
    try {
        // Validate input
        const validated = profileUpdateSchema.parse(input);

        // Require authentication
        const session = await requireAuth();
        const userId = session.user.id;

        // Get existing teacher profile
        const existingTeacher = await prisma.teacher.findUnique({
            where: { userId },
        });

        if (!existingTeacher) {
            return {
                success: false,
                message: "ไม่พบข้อมูลครู",
            };
        }

        // CRITICAL: Update both Teacher and User atomically
        // Note: School is NOT updated to prevent data integrity issues
        await prisma.$transaction([
            prisma.teacher.update({
                where: { userId },
                data: {
                    firstName: validated.firstName,
                    lastName: validated.lastName,
                    age: validated.age,
                    advisoryClass: normalizeClassName(validated.advisoryClass),
                    academicYearId: validated.academicYearId,
                    schoolRole: validated.schoolRole,
                    projectRole: validated.projectRole,
                },
            }),
            prisma.user.update({
                where: { id: userId },
                data: {
                    name: `${validated.firstName} ${validated.lastName}`,
                    // schoolId is NOT updated
                },
            }),
        ]);

        // Revalidate pages to reflect updated data
        revalidatePath("/settings");
        revalidatePath("/dashboard");

        return {
            success: true,
            message: "บันทึกข้อมูลสำเร็จ",
        };
    } catch (error) {
        console.error("Update profile error:", error);
        return {
            success: false,
            message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        };
    }
}
