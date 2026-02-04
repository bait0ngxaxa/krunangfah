/**
 * Hospital Referral Actions
 * Toggle referredToHospital status for PHQ results
 */

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth";

export async function toggleHospitalReferral(phqResultId: string) {
    const session = await getServerSession();

    if (!session?.user) {
        return { success: false, error: "Unauthorized" };
    }

    try {
        // Get current status
        const phqResult = await prisma.phqResult.findUnique({
            where: { id: phqResultId },
            select: { referredToHospital: true, studentId: true },
        });

        if (!phqResult) {
            return { success: false, error: "PHQ result not found" };
        }

        // Toggle status
        await prisma.phqResult.update({
            where: { id: phqResultId },
            data: {
                referredToHospital: !phqResult.referredToHospital,
            },
        });

        revalidatePath(`/students/${phqResult.studentId}`);

        return {
            success: true,
            newStatus: !phqResult.referredToHospital,
        };
    } catch (error) {
        console.error("Error toggling hospital referral:", error);
        return { success: false, error: "Failed to update status" };
    }
}
